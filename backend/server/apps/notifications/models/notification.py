import uuid

from django.db import models

from common.enums.notification import NotificationChannel, NotificationStatus
from apps.events.models.system_event import SystemEvent


class Notification(models.Model):
  """
  Notificación enviada a un usuario (cliente o transportista).

  Se genera EXCLUSIVAMENTE a partir de un SystemEvent. La FK es
  obligatoria (null=False) para garantizar trazabilidad completa.

  recipient_type → 'CLIENT' o 'TRANSPORTER' (validado con CHECK).
  recipient_id   → UUID del destinatario (no es FK porque puede
                   apuntar a clients o transporters).
  status         → PENDIENTE → ENVIADO / FALLIDO.
  is_read        → marca si el destinatario ya leyó/atendió la notificación.
  metadata       → datos de navegación en JSON para el frontend
                   (p.ej. {"shipment_id": "...", "type": "RATING_REQUEST"}).
                   Nunca debe ser None en la respuesta API — default dict vacío.
  is_active      → para archivar sin eliminar.
  """

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  event = models.ForeignKey(
      SystemEvent,
      on_delete=models.PROTECT,
      related_name='notifications',
  )
  recipient_type = models.CharField(
      max_length=20,
      choices=[('CLIENT', 'Cliente'), ('TRANSPORTER', 'Transportista')],
  )
  recipient_id = models.UUIDField()
  channel = models.CharField(
      max_length=20,
      choices=NotificationChannel.choices,
      default=NotificationChannel.SYSTEM,
  )
  title = models.CharField(max_length=200)
  message = models.TextField()
  status = models.CharField(
      max_length=20,
      choices=NotificationStatus.choices,
      default=NotificationStatus.PENDING,
  )
  # Datos de navegación para el frontend (nunca None en la API)
  metadata = models.JSONField(blank=True, default=dict)
  # True cuando el destinatario ya atendió la notificación
  is_read = models.BooleanField(default=False)
  sent_at = models.DateTimeField(blank=True, null=True)
  is_active = models.BooleanField(default=True)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    db_table = 'notifications'
    ordering = ['-created_at']
    constraints = [
        models.CheckConstraint(
            condition=models.Q(recipient_type__in=['CLIENT', 'TRANSPORTER']),
            name='notifications_valid_recipient_type',
        ),
    ]

  def __str__(self):
    return f'Notification<{self.title}> → {self.recipient_type}:{self.recipient_id}'
