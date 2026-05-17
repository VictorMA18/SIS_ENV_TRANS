from django.db import models


class UserRole(models.TextChoices):
  CLIENT = 'CLIENT',      'Cliente'
  TRANSPORTER = 'TRANSPORTER', 'Transportista'
  ADMIN = 'ADMIN',       'Administrador'


class SocialProvider(models.TextChoices):
  GOOGLE = 'GOOGLE', 'Google'
