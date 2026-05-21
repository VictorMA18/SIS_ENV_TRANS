import uuid

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.shipments.models.shipment import Shipment
from apps.clients.models.client import Client
from apps.transporters.models.transporter import Transporter


class Rating(models.Model):
  """
  Calificación que un cliente otorga a un transportista tras la entrega.

  Cada envío solo puede tener una calificación (unique en shipment).
  La puntuación va de 1 a 5.

  is_active permite ocultar una calificación sin eliminarla.
  updated_at permite corregir una calificación ingresada por error.
  """

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  shipment = models.OneToOneField(
      Shipment,
      on_delete=models.CASCADE,
      related_name='rating',
  )
  client = models.ForeignKey(
      Client,
      on_delete=models.RESTRICT,
      related_name='ratings_given',
  )
  transporter = models.ForeignKey(
      Transporter,
      on_delete=models.RESTRICT,
      related_name='ratings_received',
  )
  score = models.SmallIntegerField(
      validators=[MinValueValidator(1), MaxValueValidator(5)],
  )
  comment = models.TextField(blank=True, null=True)
  is_active = models.BooleanField(default=True)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    db_table = 'ratings'
    ordering = ['-created_at']
    constraints = [
        models.CheckConstraint(
            condition=models.Q(score__gte=1) & models.Q(score__lte=5),
            name='ratings_score_between_1_5',
        ),
    ]

  def __str__(self):
    return f'Rating<{self.shipment_id}> {self.score}★'
