"""
Views para el módulo de notificaciones.

GET  /api/notifications/          → Lista las notificaciones del usuario autenticado.
PATCH /api/notifications/{id}/read/ → Marca una notificación como leída.
"""

from rest_framework import serializers as drf_serializers, status
from rest_framework.decorators import action
from rest_framework.mixins import ListModelMixin, RetrieveModelMixin
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from apps.clients.models import Client
from apps.notifications.models.notification import Notification


# ---------------------------------------------------------------------------
# Serializer inline
# ---------------------------------------------------------------------------


class NotificationSerializer(drf_serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "message",
            "status",
            "metadata",
            "is_read",
            "created_at",
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# ViewSet
# ---------------------------------------------------------------------------


class NotificationViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    """
    Endpoints de notificaciones para el cliente autenticado.
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Notification.objects.none()

        # Solo clientes pueden consultar notificaciones por ahora
        try:
            client = Client.objects.get(user_id=user.id)
        except Client.DoesNotExist:
            return Notification.objects.none()

        return Notification.objects.filter(
            recipient_type="CLIENT",
            recipient_id=client.user_id,
            is_active=True,
        )

    # ------------------------------------------------------------------
    # PATCH /api/notifications/{id}/read/  → marcar como leída
    # ------------------------------------------------------------------

    @action(detail=True, methods=["patch"], url_path="read")
    def mark_read(self, request, pk=None):
        """Marca la notificación como leída (is_read=True)."""
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read", "updated_at"])
        return Response(NotificationSerializer(notification).data)
