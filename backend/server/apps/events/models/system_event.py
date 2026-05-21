import uuid

from django.db import models

from common.enums.event import EventType
from apps.shipments.models.shipment import Shipment
from apps.clients.models.client import Client
from apps.transporters.models.transporter import Transporter


class SystemEvent(models.Model):
  """
  Evento del sistema para integración con RabbitMQ.

  Cada acción relevante (creación de envío, aceptación, entrega, etc.)
  genera un evento que luego se publica en la cola de mensajes.

  published      → indica si ya fue enviado a RabbitMQ.
  published_at   → momento exacto de la publicación.
  payload        → datos adicionales en formato JSON libre.
  is_active      → para marcar eventos inválidos o duplicados.
  """

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  event_type = models.CharField(
      max_length=30,
      choices=EventType.choices,
  )
  shipment = models.ForeignKey(
      Shipment,
      on_delete=models.SET_NULL,
      blank=True,
      null=True,
      related_name='events',
  )
  client = models.ForeignKey(
      Client,
      on_delete=models.SET_NULL,
      blank=True,
      null=True,
      related_name='events',
  )
  transporter = models.ForeignKey(
      Transporter,
      on_delete=models.SET_NULL,
      blank=True,
      null=True,
      related_name='events',
  )
  payload = models.JSONField(blank=True, null=True)
  published = models.BooleanField(default=False)
  published_at = models.DateTimeField(blank=True, null=True)
  is_active = models.BooleanField(default=True)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    db_table = 'system_events'
    ordering = ['-created_at']

  def __str__(self):
    return f'Event<{self.event_type}> [{self.id}]'
