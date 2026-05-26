import uuid

from django.db import models

from common.enums.shipment import SelectionStatus
from django.db.models import Q
from apps.shipments.models.shipment import Shipment
from apps.transporters.models.transporter import Transporter


class ShipmentSelection(models.Model):
  """
  Tabla intermedia que vincula un envío con un transportista seleccionado.

  Un cliente selecciona un transportista para su envío; el transportista
  puede aceptar o rechazar. Solo puede haber un transportista ACEPTADO
  por envío (garantizado por índice único parcial en la BD).

  responded_at  → momento en que el transportista respondió.
  rejection_reason → motivo de rechazo (solo si status = RECHAZADO).
  """

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  shipment = models.ForeignKey(
      Shipment,
      on_delete=models.CASCADE,
      related_name='selections',
  )
  shipment_id: uuid.UUID
  transporter = models.ForeignKey(
      Transporter,
      on_delete=models.RESTRICT,
      related_name='selections',
  )
  transporter_id: uuid.UUID
  status = models.CharField(
      max_length=20,
      choices=SelectionStatus.choices,
      default=SelectionStatus.PENDING,
  )
  responded_at = models.DateTimeField(blank=True, null=True)
  rejection_reason = models.TextField(blank=True, null=True)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    db_table = 'shipment_selections'
    unique_together = [('shipment', 'transporter')]
    ordering = ['-created_at']
    constraints = [
      models.UniqueConstraint(
          fields=['shipment'],
          condition=Q(status='ACEPTADO'),
          name='uniq_one_accepted_transporter'
      )
    ]

  def __str__(self):
    return f'Selection<{self.shipment_id} → {self.transporter_id}> [{self.status}]'
