import uuid

from django.db import models

from django.utils import timezone
from common.enums.shipment import ShipmentStatus
from apps.clients.models.client import Client
from django.core.exceptions import ValidationError

class Shipment(models.Model):
  """
  Envío de carga registrado por un cliente.

  Ciclo de vida: REGISTRADO → SELECCIONADO → ACEPTADO → EN_TRANSITO → ENTREGADO.
  En cualquier momento puede pasar a CANCELADO.
  """

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  client = models.ForeignKey(
      Client,
      on_delete=models.RESTRICT,
      related_name='shipments',
  )
  origin_address = models.TextField()
  destination_address = models.TextField()
  description = models.TextField(blank=True, null=True)
  weight_kg = models.DecimalField(
      max_digits=10,
      decimal_places=2,
      blank=True,
      null=True,
  )
  volume_m3 = models.DecimalField(
      max_digits=10,
      decimal_places=3,
      blank=True,
      null=True,
  )
  status = models.CharField(
      max_length=20,
      choices=ShipmentStatus.choices,
      default=ShipmentStatus.REGISTERED,
  )
  notes = models.TextField(blank=True, null=True)
  is_active = models.BooleanField(default=True)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)
  scheduled_delivery_at = models.DateTimeField(
      verbose_name="Fecha y hora de entrega programada",
      null=True, 
      blank=True
  )


  class Meta:
    db_table = 'shipments'
    ordering = ['-created_at']

  def clean(self):
    super().clean()
    if self.scheduled_delivery_at and self.scheduled_delivery_at < timezone.now():
      raise ValidationError({
          'scheduled_delivery_at': "La fecha de entrega no puede ser en el pasado."
      })

  def __str__(self):
    return f'Shipment<{self.id}> [{self.status}]'
