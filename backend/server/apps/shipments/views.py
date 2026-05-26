from django.db.models import Case, Value, When, IntegerField
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import BasePermission, IsAdminUser, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView

from apps.clients.models import Client
from apps.shipments.models.shipment import Shipment
from apps.shipments.serializers import (
    ShipmentCreateSerializer,
    ShipmentDetailSerializer,
    ShipmentUpdateSerializer,
)
from apps.shipments.services import create_shipment_with_selection
from apps.transporters.models.transporter import Transporter
from apps.transporters.models.transporter_zone import TransporterZone
from apps.transporters.serializers import TransporterProfileSerializer
from common.enums.shipment import ShipmentStatus


# ---------------------------------------------------------------------------
# Permisos personalizados
# ---------------------------------------------------------------------------


class IsClientOnly(BasePermission):
    """Solo permite el acceso a usuarios con rol CLIENT."""

    def has_permission(self, request: Request, view: APIView) -> bool:  # type: ignore
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.is_client


class IsAdminOrClient(BasePermission):
    """Permite el acceso a usuarios ADMIN o CLIENT."""

    def has_permission(self, request: Request, view: APIView) -> bool:  # type: ignore
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.is_admin or user.is_client


# ---------------------------------------------------------------------------
# Estados editables — el envío solo se puede modificar en estos estados
# ---------------------------------------------------------------------------

EDITABLE_STATUSES = {ShipmentStatus.REGISTERED, ShipmentStatus.SELECTED}


# ---------------------------------------------------------------------------
# ViewSet principal
# ---------------------------------------------------------------------------


class ShipmentViewSet(ModelViewSet):
    queryset = Shipment.objects.select_related(
        "client", "client__user"
    ).prefetch_related(
        "selections",
        "selections__transporter",
        "selections__transporter__user",
        "tracking_entries",
    )
    serializer_class = ShipmentDetailSerializer
    http_method_names = ["get", "post", "put", "patch", "head", "options"]

    # -- Permisos dinámicos por acción --

    def get_permissions(self):
        if self.action == "create":
            return [IsClientOnly()]
        if self.action in ("list", "retrieve"):
            return [IsAdminOrClient()]
        if self.action in ("update", "partial_update"):
            return [IsClientOnly()]
        if self.action == "available_transporters":
            return [IsAuthenticated()]
        return [IsAdminUser()]

    # -- Filtrado de queryset por rol --

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if not user or not user.is_authenticated:
            return queryset.none()

        # Los ADMIN ven todo
        if user.is_admin:
            return queryset

        # Los CLIENT solo ven sus propios envíos
        return queryset.filter(client__user_id=user.id)

    # -- Serializer dinámico por acción --

    def get_serializer_class(self):
        if self.action == "create":
            return ShipmentCreateSerializer
        if self.action in ("update", "partial_update"):
            return ShipmentUpdateSerializer
        return ShipmentDetailSerializer

    # ------------------------------------------------------------------
    # POST /api/shipments/  →  Crear envío con selección
    # ------------------------------------------------------------------

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Extraer client_id del JWT (nunca del payload)
        try:
            client = Client.objects.get(user_id=request.user.id)
        except Client.DoesNotExist as exc:
            raise PermissionDenied("Perfil de cliente no encontrado.") from exc

        payload = serializer.validated_data
        transporter_id = payload.pop("transporter_id")

        shipment = create_shipment_with_selection(
            client=client,
            shipment_data=payload,
            transporter_id=transporter_id,
        )

        # Refrescar relaciones para la respuesta anidada
        shipment.refresh_from_db()

        response_serializer = ShipmentDetailSerializer(
            shipment,
            context=self.get_serializer_context(),
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    # ------------------------------------------------------------------
    # PUT/PATCH /api/shipments/{id}/  →  Editar envío (estados tempranos)
    # ------------------------------------------------------------------

    def update(self, request, *args, **kwargs):
        instance = self.get_object()

        # Bloquear edición si el envío ya superó SELECCIONADO
        if instance.status not in EDITABLE_STATUSES:
            raise ValidationError(
                {
                    "status": (
                        f"No se puede editar un envío en estado '{instance.get_status_display()}'. "
                        f"Solo se permite la edición en estados: REGISTRADO o SELECCIONADO."
                    )
                }
            )

        partial = kwargs.pop("partial", False)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Devolver respuesta anidada completa
        response_serializer = ShipmentDetailSerializer(
            instance,
            context=self.get_serializer_context(),
        )
        return Response(response_serializer.data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    # ------------------------------------------------------------------
    # GET /api/shipments/available-transporters/
    # ------------------------------------------------------------------

    @action(detail=False, methods=["get"], url_path="available-transporters")
    def available_transporters(self, request):
        """
        Devuelve transportistas activos y disponibles, priorizando los que
        coincidan con los distritos de origen/destino proporcionados.

        Query params:
            - origin_district (str, opcional)
            - destination_district (str, opcional)
        """
        origin_district = request.query_params.get("origin_district", "").strip()
        destination_district = request.query_params.get("destination_district", "").strip()

        # Base: transportistas activos y disponibles
        qs = Transporter.objects.filter(
            is_active=True,
            is_available=True,
        ).select_related("user")

        # Ordenamiento condicional: priorizar los que cubren los distritos
        districts = [d for d in (origin_district, destination_district) if d]

        if districts:
            qs = qs.annotate(
                priority=Case(
                    When(zones__district__in=districts, then=Value(0)),
                    default=Value(1),
                    output_field=IntegerField(),
                ),
            ).distinct().order_by("priority", "-average_rating")
        else:
            qs = qs.order_by("-average_rating")

        serializer = TransporterProfileSerializer(qs, many=True)
        return Response(serializer.data)
