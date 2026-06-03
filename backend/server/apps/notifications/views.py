"""
Views para el módulo de notificaciones.

GET   /api/notifications/              → Lista las notificaciones del usuario autenticado.
GET   /api/notifications/{id}/         → Detalle de una notificación.
PATCH /api/notifications/{id}/read/    → Marca una notificación como leída.
PATCH /api/notifications/read-all/     → Marca TODAS las notificaciones como leídas.
GET   /api/notifications/unread-count/ → Contador de notificaciones no leídas (para badge).
"""

from rest_framework import serializers as drf_serializers, status
from rest_framework.decorators import action
from rest_framework.mixins import ListModelMixin, RetrieveModelMixin
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from apps.notifications.models.notification import Notification


# ---------------------------------------------------------------------------
# Serializer
# ---------------------------------------------------------------------------


class NotificationSerializer(drf_serializers.ModelSerializer):
    # Seguridad defensiva: metadata nunca es None en la respuesta
    metadata = drf_serializers.SerializerMethodField()

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

    def get_metadata(self, obj):
        """Garantiza que metadata siempre sea un dict, nunca None."""
        return obj.metadata if obj.metadata else {}


# ---------------------------------------------------------------------------
# ViewSet
# ---------------------------------------------------------------------------


class NotificationViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    """
    Endpoints de notificaciones para el usuario autenticado.
    Soporta tanto clientes como transportistas.
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Notification.objects.none()

        # Determinar tipo de destinatario según el rol del usuario
        if user.is_client:
            recipient_type = "CLIENT"
        elif user.is_transporter:
            recipient_type = "TRANSPORTER"
        elif user.is_admin:
            # Admin puede ver todas las notificaciones
            return Notification.objects.filter(is_active=True)
        else:
            return Notification.objects.none()

        return Notification.objects.filter(
            recipient_type=recipient_type,
            recipient_id=user.id,
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

    # ------------------------------------------------------------------
    # PATCH /api/notifications/read-all/  → marcar todas como leídas
    # ------------------------------------------------------------------

    @action(detail=False, methods=["patch"], url_path="read-all")
    def mark_all_read(self, request):
        """Marca todas las notificaciones no leídas del usuario como leídas."""
        qs = self.get_queryset().filter(is_read=False)
        updated = qs.update(is_read=True)
        return Response(
            {"detail": f"{updated} notificaciones marcadas como leídas."},
            status=status.HTTP_200_OK,
        )

    # ------------------------------------------------------------------
    # GET /api/notifications/unread-count/  → contador para badge
    # ------------------------------------------------------------------

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        """Devuelve el número de notificaciones no leídas."""
        count = self.get_queryset().filter(is_read=False).count()
        return Response(
            {"unread_count": count},
            status=status.HTTP_200_OK,
        )
