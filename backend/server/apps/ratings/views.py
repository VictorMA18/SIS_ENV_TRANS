"""
Views para el módulo de calificaciones.

POST /api/ratings/   → El cliente califica un envío entregado.
GET  /api/ratings/   → Lista las calificaciones del cliente.
"""

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
from common.enums.shipment import ShipmentStatus


class RatingViewSet(CreateModelMixin, ListModelMixin, GenericViewSet):
    """
    Endpoints de calificaciones del cliente.

    POST /api/ratings/  — Crear calificación para un envío entregado.
    GET  /api/ratings/  — Listar mis calificaciones.
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
        try:
            client = Client.objects.get(user_id=user.id)
        except Client.DoesNotExist:
            return Rating.objects.none()
        return Rating.objects.filter(client=client, is_active=True)

    def create(self, request, *args, **kwargs):
        """
        Crea una calificación.

        Reglas:
          1. El usuario debe ser el cliente dueño del envío.
          2. El envío debe estar en estado ENTREGADO.
          3. El envío no puede tener ya una calificación.
        """
        serializer = RatingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Obtener el perfil cliente del usuario autenticado
        try:
            client = Client.objects.get(user_id=request.user.id)
        except Client.DoesNotExist:
            return Response(
                {"detail": "Perfil de cliente no encontrado."},
                status=status.HTTP_403_FORBIDDEN,
            )

        shipment_id = serializer.validated_data["shipment_id"]

        # Verificar que el envío existe y pertenece al cliente
        try:
            shipment = Shipment.objects.get(pk=shipment_id, client=client)
        except Shipment.DoesNotExist:
            return Response(
                {"detail": "Envío no encontrado o no te pertenece."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Verificar que el envío fue entregado
        if shipment.status != ShipmentStatus.DELIVERED:
            return Response(
                {"detail": "Solo puedes calificar envíos en estado ENTREGADO."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verificar que no exista ya una calificación
        if Rating.objects.filter(shipment=shipment).exists():
            return Response(
                {"detail": "Este envío ya tiene una calificación registrada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Obtener el transportista a partir de la selección aceptada
        selection = (
            ShipmentSelection.objects.select_related("transporter")
            .filter(shipment=shipment, status="ACEPTADO")
            .first()
        )
        if not selection:
            return Response(
                {"detail": "No se encontró la selección activa del transportista."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Crear la calificación
        rating = Rating.objects.create(
            shipment=shipment,
            client=client,
            transporter=selection.transporter,
            score=serializer.validated_data["score"],
            comment=serializer.validated_data.get("comment", ""),
        )

        # Marcar como leída la notificación de rating asociada (si existe)
        Notification.objects.filter(
            recipient_type="CLIENT",
            recipient_id=client.user_id,
            metadata__type="RATING_REQUEST",
            metadata__shipment_id=str(shipment.id),
            is_read=False,
        ).update(is_read=True)

        response_serializer = RatingDetailSerializer(rating)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
