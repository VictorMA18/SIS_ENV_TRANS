import uuid

from django.db import models

from common.enums.shipment import ShipmentStatus
from apps.clients.models.client import Client


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

  class Meta:
    db_table = 'shipments'
    ordering = ['-created_at']

  def __str__(self):
    return f'Shipment<{self.id}> [{self.status}]'
