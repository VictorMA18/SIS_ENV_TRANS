import uuid

from django.db import models

from common.enums.shipment import ShipmentStatus
from apps.shipments.models.shipment import Shipment

class ShipmentTracking(models.Model):
  """
  Registro inmutable de seguimiento / historial de estados de un envío.

  Cada cambio de estado genera una nueva fila; nunca se edita.
  Por eso solo tiene created_at (sin updated_at).

  location, latitude y longitude permiten registrar la
  posición geográfica donde ocurrió el cambio de estado.
  """

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  shipment = models.ForeignKey(
      Shipment,
      on_delete=models.CASCADE,
      related_name='tracking_entries',
  )
  status = models.CharField(
      max_length=20,
      choices=ShipmentStatus.choices,
  )
  location = models.TextField(blank=True, null=True)
  latitude = models.DecimalField(
      max_digits=10,
      decimal_places=7,
      blank=True,
      null=True,
  )
  longitude = models.DecimalField(
      max_digits=10,
      decimal_places=7,
      blank=True,
      null=True,
  )
  notes = models.TextField(blank=True, null=True)
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    db_table = 'shipment_tracking'
    ordering = ['-created_at']

  def __str__(self):
    return f'Tracking<{self.shipment_id}> [{self.status}] @ {self.created_at}'
