"""
Views para el módulo de calificaciones bidireccionales.

POST /api/ratings/   → Calificar un envío entregado (cliente o transportista).
GET  /api/ratings/   → Lista las calificaciones del usuario autenticado.

Flujos soportados:
  1. Cliente califica Transportista → recalcula transporter.average_rating.
  2. Transportista califica Cliente → recalcula client.average_rating.
"""

from django.db import transaction
from django.db.models import Avg
from rest_framework import status
from rest_framework.mixins import CreateModelMixin, ListModelMixin
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from apps.clients.models import Client
from apps.notifications.models.notification import Notification
from apps.ratings.models.rating import Rating
from apps.ratings.serializers import RatingCreateSerializer, RatingDetailSerializer
from apps.shipments.models.shipment import Shipment
from apps.shipments.models.shipment_selection import ShipmentSelection
from apps.transporters.models.transporter import Transporter
from common.enums.shipment import ShipmentStatus


class RatingViewSet(CreateModelMixin, ListModelMixin, GenericViewSet):
    """
    Endpoints de calificaciones bidireccionales.

    POST /api/ratings/  — Crear calificación para un envío entregado.
    GET  /api/ratings/  — Listar mis calificaciones emitidas.
    """

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return RatingCreateSerializer
        return RatingDetailSerializer

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Rating.objects.none()

        # Mostrar calificaciones emitidas por el usuario según su rol
        if user.is_client:
            try:
                client = Client.objects.get(user_id=user.id)
            except Client.DoesNotExist:
                return Rating.objects.none()
            return Rating.objects.filter(
                client=client, reviewer_role="CLIENT", is_active=True,
            ).select_related("client__user", "transporter__user")

        elif user.is_transporter:
            try:
                transporter = Transporter.objects.get(user_id=user.id)
            except Transporter.DoesNotExist:
                return Rating.objects.none()
            return Rating.objects.filter(
                transporter=transporter, reviewer_role="TRANSPORTER", is_active=True,
            ).select_related("client__user", "transporter__user")

        return Rating.objects.none()

    def create(self, request, *args, **kwargs):
        """
        Crea una calificación bidireccional.

        Reglas comunes:
          1. El envío debe existir.
          2. El envío debe estar en estado ENTREGADO.
          3. El envío no puede tener ya una calificación del mismo reviewer_role.

        Flujo según rol:
          - Cliente: califica al transportista → recalcula transporter.average_rating.
          - Transportista: califica al cliente → recalcula client.average_rating.
        """
        serializer = RatingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        shipment_id = serializer.validated_data["shipment_id"]

        # --- Determinar rol del calificador ---
        if user.is_client:
            reviewer_role = "CLIENT"
        elif user.is_transporter:
            reviewer_role = "TRANSPORTER"
        else:
            return Response(
                {"detail": "Solo clientes y transportistas pueden calificar."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # --- Obtener perfiles ---
        client = None
        transporter = None

        try:
            client = Client.objects.get(user_id=user.id) if user.is_client else None
        except Client.DoesNotExist:
            pass

        try:
            transporter = Transporter.objects.get(user_id=user.id) if user.is_transporter else None
        except Transporter.DoesNotExist:
            pass

        # --- Verificar el envío ---
        try:
            shipment = Shipment.objects.select_related("client").get(pk=shipment_id)
        except Shipment.DoesNotExist:
            return Response(
                {"detail": "Envío no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Verificar que el envío fue entregado
        if shipment.status != ShipmentStatus.DELIVERED:
            return Response(
                {"detail": "Solo puedes calificar envíos en estado ENTREGADO."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- Obtener la selección aceptada ---
        selection = (
            ShipmentSelection.objects.select_related("transporter", "transporter__user")
            .filter(shipment=shipment, status="ACEPTADO")
            .first()
        )
        if not selection:
            return Response(
                {"detail": "No se encontró la selección activa del transportista."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- Validaciones por rol ---
        if reviewer_role == "CLIENT":
            # El cliente debe ser dueño del envío
            if not client or shipment.client_id != client.user_id:
                return Response(
                    {"detail": "No tienes permiso para calificar este envío."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            target_transporter = selection.transporter
            target_client = client
        else:
            # El transportista debe ser el de la selección
            if not transporter or selection.transporter_id != transporter.user_id:
                return Response(
                    {"detail": "No tienes permiso para calificar este envío."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            target_transporter = transporter
            target_client = shipment.client

        # --- Verificar duplicado ---
        if Rating.objects.filter(shipment=shipment, reviewer_role=reviewer_role).exists():
            return Response(
                {"detail": f"Ya existe una calificación de tipo '{reviewer_role}' para este envío."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- Crear calificación y recalcular average_rating atómicamente ---
        with transaction.atomic():
            rating = Rating.objects.create(
                shipment=shipment,
                client=target_client,
                transporter=target_transporter,
                reviewer_role=reviewer_role,
                score=serializer.validated_data["score"],
                comment=serializer.validated_data.get("comment", ""),
            )

            if reviewer_role == "CLIENT":
                # Recalcular average_rating del transportista
                avg = Rating.objects.filter(
                    transporter=target_transporter,
                    reviewer_role="CLIENT",
                    is_active=True,
                ).aggregate(avg_score=Avg("score"))["avg_score"]

                Transporter.objects.filter(
                    pk=target_transporter.pk,
                ).update(average_rating=round(avg, 2) if avg else 5.00)

                # Marcar como leída la notificación de rating request
                Notification.objects.filter(
                    recipient_type="CLIENT",
                    recipient_id=target_client.user_id,
                    metadata__type="RATING_REQUEST",
                    metadata__shipment_id=str(shipment.id),
                    is_read=False,
                ).update(is_read=True)

            else:
                # Recalcular average_rating del cliente
                avg = Rating.objects.filter(
                    client=target_client,
                    reviewer_role="TRANSPORTER",
                    is_active=True,
                ).aggregate(avg_score=Avg("score"))["avg_score"]

                Client.objects.filter(
                    pk=target_client.pk,
                ).update(average_rating=round(avg, 2) if avg else 5.00)

        response_serializer = RatingDetailSerializer(rating)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
