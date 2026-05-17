import uuid

from django.db import models

from common.enums.user import SocialProvider
from apps.users.models.user import User


class UserSocialAccount(models.Model):
  """
  Almacena la vinculación entre un User y su cuenta de Google.

  Relación N:1 con User (un usuario puede tener varias cuentas sociales
  si en el futuro se agregan más proveedores como GitHub o Facebook).

  provider_uid   → ID único que entrega Google para ese usuario.
  access_token   → token de acceso de corta duración.
  refresh_token  → token para renovar el access_token sin pedir login.
  token_expires_at → cuándo vence el access_token actual.
  """

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  user = models.ForeignKey(
      User,
      on_delete=models.CASCADE,
      related_name='social_accounts'
  )
  provider = models.CharField(
      max_length=20,
      choices=SocialProvider.choices,
      default=SocialProvider.GOOGLE
  )
  provider_uid = models.CharField(max_length=255)
  access_token = models.TextField(blank=True, null=True)
  refresh_token = models.TextField(blank=True, null=True)
  token_expires_at = models.DateTimeField(blank=True, null=True)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    db_table = 'user_social_accounts'
    unique_together = [('provider', 'provider_uid')]
    ordering = ['-created_at']

  def __str__(self):
    return f'{self.provider} — {self.user.email}'

  @property
  def is_token_expired(self) -> bool:
    """Indica si el access_token ya venció y necesita renovarse."""
    from django.utils import timezone
    if not self.token_expires_at:
      return False
    return timezone.now() >= self.token_expires_at
