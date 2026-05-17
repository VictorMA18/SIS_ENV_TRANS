from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.users.models.user import User


class Transporter(models.Model):
  """
  Perfil de transportista que extiende a User usando la misma PK (UUID).
  """

  user = models.OneToOneField(
      User,
      on_delete=models.CASCADE,
      primary_key=True,
      db_column='id',
      related_name='transporter_profile',
  )
  license_number = models.CharField(
      max_length=50,
      unique=True,
      blank=True,
      null=True,
  )
  vehicle_description = models.TextField(blank=True, null=True)
  is_available = models.BooleanField(default=True)
  is_active = models.BooleanField(default=True)
  completed_shipments = models.IntegerField(default=0)
  average_rating = models.DecimalField(
      max_digits=3,
      decimal_places=2,
      blank=True,
      null=True,
      validators=[MinValueValidator(0), MaxValueValidator(5)],
  )
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    db_table = 'transporters'
    ordering = ['-created_at']
    constraints = [
        models.CheckConstraint(
            condition=models.Q(average_rating__gte=0) & models.Q(
                average_rating__lte=5),
            name='transporters_average_rating_between_0_5',
        ),
    ]

  def __str__(self):
    return f'Transporter<{self.user.email}>'
