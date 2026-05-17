from django.db import models

class ShipmentStatus(models.TextChoices):

  REGISTERED = "REGISTRADO", "Registrado"

  SELECTED = "SELECCIONADO", "Seleccionado"

  ACCEPTED = "ACEPTADO", "Aceptado"

  IN_TRANSIT = "EN_TRANSITO", "En tránsito"

  DELIVERED = "ENTREGADO", "Entregado"

  CANCELLED = "CANCELADO", "Cancelado"


class SelectionStatus(models.TextChoices):

  PENDING = "PENDIENTE", "Pendiente"

  ACCEPTED = "ACEPTADO", "Aceptado"

  CANCELLED = "CANCELADO", "Cancelado"

  REJECTED = "RECHAZADO", "Rechazado"
