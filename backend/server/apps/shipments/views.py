import time

import cloudinary.utils
from django.conf import settings
from django.db.models import Case, Value, When, IntegerField
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import BasePermission, IsAdminUser, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, GenericViewSet
from rest_framework.views import APIView
from rest_framework.mixins import ListModelMixin, RetrieveModelMixin

from apps.clients.models import Client
from apps.shipments.models.shipment import Shipment
from apps.shipments.models.shipment_selection import ShipmentSelection
from apps.shipments.serializers import (
    CancelSerializer,
    ConfirmDeliverySerializer,
    RejectSerializer,
    ShipmentCreateSerializer,
    ShipmentDetailSerializer,
    ShipmentUpdateSerializer,
    StartTransitSerializer,
    TransporterShipmentListSerializer,
)
from apps.shipments.services import (
    accept_selection,
    cancel_shipment,
    confirm_delivery,
    create_shipment_with_selection,
    reject_selection,
    start_transit,
)
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


class IsTransporterOnly(BasePermission):
    """Solo permite el acceso a usuarios con rol TRANSPORTER."""

    def has_permission(self, request: Request, view: APIView) -> bool:  # type: ignore
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.is_transporter


class IsAdminOrTransporter(BasePermission):
    """Permite el acceso a usuarios ADMIN o TRANSPORTER."""

    def has_permission(self, request: Request, view: APIView) -> bool:  # type: ignore
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return user.is_admin or user.is_transporter


# ---------------------------------------------------------------------------
# Estados editables — el envío solo se puede modificar en estos estados
# ---------------------------------------------------------------------------

EDITABLE_STATUSES = {ShipmentStatus.REGISTERED, ShipmentStatus.SELECTED}


# ---------------------------------------------------------------------------
# ViewSet principal (Client / Admin)
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
        if self.action == "cancel":
            return [IsClientOnly()]
        if self.action == "cloudinary_signature":
            return [IsClientOnly()]
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
    # POST /api/shipments/{id}/cancel/  →  Cancelar envío (Cliente)
    # ------------------------------------------------------------------

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        """
        Permite al cliente cancelar su envío.

        Estados permitidos: REGISTRADO, SELECCIONADO, ACEPTADO.
        """
        serializer = CancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        shipment = cancel_shipment(
            user=request.user,
            shipment_id=pk,
            cancellation_reason=serializer.validated_data.get("cancellation_reason", ""),
        )

        shipment.refresh_from_db()
        response_serializer = ShipmentDetailSerializer(
            shipment,
            context=self.get_serializer_context(),
        )
        return Response(response_serializer.data)

    # ------------------------------------------------------------------
    # POST /api/shipments/cloudinary-signature/  →  Firma para upload
    # ------------------------------------------------------------------

    @action(detail=False, methods=["post"], url_path="cloudinary-signature")
    def cloudinary_signature(self, request):
        """
        Genera una firma digital temporizada para subida segura
        de imágenes a Cloudinary (signed upload).

        El frontend usa esta firma + api_key + timestamp para subir
        directamente a Cloudinary sin exponer el API_SECRET.
        """
        cloudinary_config = getattr(settings, "CLOUDINARY_CONFIG", {})

        api_secret = cloudinary_config.get("API_SECRET", "")
        api_key = cloudinary_config.get("API_KEY", "")
        cloud_name = cloudinary_config.get("CLOUD_NAME", "")

        if not api_secret or not api_key or not cloud_name:
            raise ValidationError({
                "detail": (
                    "Cloudinary no está configurado correctamente en el servidor. "
                    "Faltan CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET."
                )
            })

        timestamp = int(time.time())

        # Parámetros a firmar — se pueden personalizar
        params_to_sign = {
            "timestamp": timestamp,
            "folder": "shipments",
        }

        signature = cloudinary.utils.api_sign_request(
            params_to_sign,
            api_secret,
        )

        return Response({
            "signature": signature,
            "timestamp": timestamp,
            "api_key": api_key,
            "cloud_name": cloud_name,
            "folder": "shipments",
        })


# ---------------------------------------------------------------------------
# ViewSet del Transportista — envíos asignados + acciones de ciclo de vida
# ---------------------------------------------------------------------------


class TransporterShipmentViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    """
    Endpoints para que el transportista gestione los envíos asignados.

    Lectura:
        GET  /api/shipments/transporter/                    → Lista de selecciones
        GET  /api/shipments/transporter/{id}/               → Detalle de selección

    Acciones de ciclo de vida:
        POST /api/shipments/transporter/{id}/accept/        → Aceptar selección
        POST /api/shipments/transporter/{id}/reject/        → Rechazar selección
        POST /api/shipments/transporter/{id}/start-transit/ → Iniciar tránsito
        POST /api/shipments/transporter/{id}/confirm-delivery/ → Confirmar entrega

    Query params opcionales:
        - status: filtra por estado de la selección (PENDIENTE, ACEPTADO, etc.)
    """

    serializer_class = TransporterShipmentListSerializer
    permission_classes = [IsAdminOrTransporter]

    def get_queryset(self):
        user = self.request.user

        if not user or not user.is_authenticated:
            return ShipmentSelection.objects.none()

        qs = ShipmentSelection.objects.select_related(
            "shipment",
            "shipment__client",
            "shipment__client__user",
            "transporter",
            "transporter__user",
        ).prefetch_related(
            "shipment__tracking_entries",
        )

        # Admin ve todas las selecciones
        if user.is_admin:
            pass
        else:
            # Transportista solo ve sus propias selecciones
            qs = qs.filter(transporter__user_id=user.id)

        # Filtro opcional por status de la selección
        selection_status = self.request.query_params.get("status", "").strip().upper()
        if selection_status:
            qs = qs.filter(status=selection_status)

        return qs.order_by("-created_at")

    # ------------------------------------------------------------------
    # POST /api/shipments/transporter/{id}/accept/
    # ------------------------------------------------------------------

    @action(detail=True, methods=["post"], url_path="accept")
    def accept(self, request, pk=None):
        """Transportista acepta la selección."""
        selection = accept_selection(
            user=request.user,
            selection_id=pk,
        )

        selection.refresh_from_db()
        response_serializer = TransporterShipmentListSerializer(selection)
        return Response(response_serializer.data)

    # ------------------------------------------------------------------
    # POST /api/shipments/transporter/{id}/reject/
    # ------------------------------------------------------------------

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        """Transportista rechaza la selección."""
        serializer = RejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        selection = reject_selection(
            user=request.user,
            selection_id=pk,
            rejection_reason=serializer.validated_data.get("rejection_reason", ""),
        )

        selection.refresh_from_db()
        response_serializer = TransporterShipmentListSerializer(selection)
        return Response(response_serializer.data)

    # ------------------------------------------------------------------
    # POST /api/shipments/transporter/{id}/start-transit/
    # ------------------------------------------------------------------

    @action(detail=True, methods=["post"], url_path="start-transit")
    def start_transit(self, request, pk=None):
        """Transportista inicia el tránsito del envío."""
        serializer = StartTransitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        selection = start_transit(
            user=request.user,
            selection_id=pk,
            location_data=serializer.validated_data,
        )

        selection.refresh_from_db()
        response_serializer = TransporterShipmentListSerializer(selection)
        return Response(response_serializer.data)

    # ------------------------------------------------------------------
    # POST /api/shipments/transporter/{id}/confirm-delivery/
    # ------------------------------------------------------------------

    @action(detail=True, methods=["post"], url_path="confirm-delivery")
    def confirm_delivery(self, request, pk=None):
        """Transportista confirma la entrega del envío."""
        serializer = ConfirmDeliverySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        selection = confirm_delivery(
            user=request.user,
            selection_id=pk,
            location_data={
                "location": serializer.validated_data.get("location", ""),
                "latitude": serializer.validated_data.get("latitude"),
                "longitude": serializer.validated_data.get("longitude"),
            },
            notes=serializer.validated_data.get("notes", ""),
        )

        selection.refresh_from_db()
        response_serializer = TransporterShipmentListSerializer(selection)
        return Response(response_serializer.data)
