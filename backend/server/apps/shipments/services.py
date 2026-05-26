from django.db import transaction
from rest_framework import serializers

from apps.shipments.models.shipment import Shipment
from apps.shipments.models.shipment_selection import ShipmentSelection
from apps.shipments.models.shipment_tracking import ShipmentTracking
from apps.transporters.models.transporter import Transporter
from common.enums.shipment import ShipmentStatus, SelectionStatus


def create_shipment_with_selection(*, client, shipment_data, transporter_id):
    """
    Crea un envío con su selección de transportista y registros de
    tracking dentro de una transacción atómica.

    Secuencia (5 pasos):
        1. INSERT Shipment → estado REGISTRADO
        2. INSERT ShipmentTracking → estado REGISTRADO
        3. UPDATE Shipment → estado SELECCIONADO
        4. INSERT ShipmentSelection → estado PENDIENTE
        5. INSERT ShipmentTracking → estado SELECCIONADO
    """
    # --- Validación defensiva del transportista ---
    try:
        transporter = Transporter.objects.get(pk=transporter_id)
    except Transporter.DoesNotExist as exc:
        raise serializers.ValidationError(
            {"transporter_id": "Transportista no encontrado."}
        ) from exc

    if not transporter.is_active:
        raise serializers.ValidationError(
            {"transporter_id": "El transportista seleccionado no está activo."}
        )

    if not transporter.is_available:
        raise serializers.ValidationError(
            {"transporter_id": "El transportista seleccionado no está disponible."}
        )

    # --- Transacción atómica de creación (5 pasos) ---
    with transaction.atomic():
        # 1. Crear Shipment en estado REGISTRADO
        shipment = Shipment.objects.create(
            client=client,
            status=ShipmentStatus.REGISTERED,
            **shipment_data,
        )

        # 2. Primer registro de tracking → REGISTRADO
        ShipmentTracking.objects.create(
            shipment=shipment,
            status=ShipmentStatus.REGISTERED,
        )

        # 3. Cambiar estado del Shipment a SELECCIONADO
        shipment.status = ShipmentStatus.SELECTED
        shipment.save(update_fields=["status", "updated_at"])

        # 4. Crear ShipmentSelection vinculada al transportista → PENDIENTE
        ShipmentSelection.objects.create(
            shipment=shipment,
            transporter=transporter,
            status=SelectionStatus.PENDING,
        )

        # 5. Segundo registro de tracking → SELECCIONADO
        ShipmentTracking.objects.create(
            shipment=shipment,
            status=ShipmentStatus.SELECTED,
        )

    return shipment
