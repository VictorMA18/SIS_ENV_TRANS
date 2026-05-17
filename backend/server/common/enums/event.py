from django.db import models


class EventType(models.TextChoices):

  SHIPMENT_CREATED = "SHIPMENT_CREATED", "Shipment Created"

  TRANSPORTER_SELECTED = "TRANSPORTER_SELECTED", "Transporter Selected"

  SHIPMENT_ACCEPTED = "SHIPMENT_ACCEPTED", "Shipment Accepted"

  SHIPMENT_REJECTED = "SHIPMENT_REJECTED", "Shipment Rejected"

  SHIPMENT_IN_TRANSIT = "SHIPMENT_IN_TRANSIT", "Shipment In Transit"

  SHIPMENT_DELIVERED = "SHIPMENT_DELIVERED", "Shipment Delivered"

  SHIPMENT_CANCELLED = "SHIPMENT_CANCELLED", "Shipment Cancelled"
