import uuid

from django.db import models

from apps.transporters.models.transporter import Transporter


class TransporterZone(models.Model):
  """
  Zona de cobertura de un transportista.

  Define en qué distritos opera el transportista.
  Un transportista puede tener múltiples zonas, pero no
  puede repetir el mismo distrito.
  """

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  transporter = models.ForeignKey(
      Transporter,
      on_delete=models.CASCADE,
      related_name='zones',
  )
  district = models.CharField(max_length=100)
  is_active = models.BooleanField(default=True)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    db_table = 'transporter_zones'
    unique_together = [('transporter', 'district')]
    ordering = ['district']

  def __str__(self):
    return f'{self.district} — {self.transporter}'
