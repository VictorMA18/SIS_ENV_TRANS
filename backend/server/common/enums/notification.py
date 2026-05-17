from django.db import models


class NotificationStatus(models.TextChoices):

  PENDING = "PENDIENTE", "Pendiente"

  SENT = "ENVIADO", "Enviado"

  FAILED = "FALLIDO", "Fallido"


class NotificationChannel(models.TextChoices):

  SYSTEM = "SISTEMA", "Sistema"

  EMAIL = "EMAIL", "Email"

  SMS = "SMS", "SMS"
