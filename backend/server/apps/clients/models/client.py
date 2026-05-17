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
  address = models.TextField(blank=True, null=True)
  is_active = models.BooleanField(default=True)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    db_table = 'clients'
    ordering = ['-created_at']

  def __str__(self):
    return f'Client<{self.user.email}>'
