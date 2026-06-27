from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.users.models.user import User


class Client(models.Model):
  """
  Perfil de cliente que extiende a User usando la misma PK (UUID).
  """

  user = models.OneToOneField(
      User,
      on_delete=models.CASCADE,
      primary_key=True,
      db_column='id',
      related_name='client_profile',
  )
  dni = models.CharField(
      max_length=15,
      unique=True,
      blank=True,
      null=True,
      verbose_name="DNI / Documento de Identidad"
  )
  address = models.TextField(blank=True, null=True)
  average_rating = models.DecimalField(
      max_digits=3,
      decimal_places=2,
      default=5.00,
      validators=[MinValueValidator(0), MaxValueValidator(5)],
  )
  is_active = models.BooleanField(default=True)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    db_table = 'clients'
    ordering = ['-created_at']
    constraints = [
        models.CheckConstraint(
            condition=models.Q(average_rating__gte=0) & models.Q(average_rating__lte=5),
            name='clients_average_rating_between_0_5',
        ),
    ]

  def __str__(self):
    return f'Client<{self.user.email}>'
