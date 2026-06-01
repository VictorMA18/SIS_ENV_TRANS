"""
Capa de servicios para el módulo de envíos.

Contiene toda la lógica de negocio transaccional del ciclo de vida:
  - Creación de envío con selección
  - Aceptar / Rechazar selección (Transportista)
  - Iniciar tránsito / Confirmar entrega (Transportista)
  - Cancelar envío (Cliente)

Todas las operaciones se envuelven en transaction.atomic() y registran
hitos inmutables en shipment_tracking (append-only).
"""

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.shipments.models.shipment import Shipment
from apps.shipments.models.shipment_selection import ShipmentSelection
from apps.shipments.models.shipment_tracking import ShipmentTracking
from apps.transporters.models.transporter import Transporter
from apps.notifications.models.notification import Notification
from common.enums.shipment import ShipmentStatus, SelectionStatus


# ---------------------------------------------------------------------------
# Creación
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Aceptar selección (Transportista)
# ---------------------------------------------------------------------------


def accept_selection(*, user, selection_id):
    """
    Transportista acepta la selección.

    Transición:
        Selection: PENDIENTE → ACEPTADO
        Shipment:  SELECCIONADO → ACEPTADO
    """
    selection = _get_own_selection(user=user, selection_id=selection_id)

    if selection.status != SelectionStatus.PENDING:
        raise serializers.ValidationError({
            "status": (
                f"No se puede aceptar una selección en estado "
                f"'{selection.status}'. Solo se permite en estado PENDIENTE."
            )
        })

    shipment = selection.shipment

    if shipment.status != ShipmentStatus.SELECTED:
        raise serializers.ValidationError({
            "status": (
                f"No se puede aceptar — el envío está en estado "
                f"'{shipment.status}', se requiere SELECCIONADO."
            )
        })

    with transaction.atomic():
        now = timezone.now()

        # 1. Actualizar selección → ACEPTADO
        selection.status = SelectionStatus.ACCEPTED
        selection.responded_at = now
        selection.save(update_fields=["status", "responded_at", "updated_at"])

        # 2. Actualizar shipment → ACEPTADO
        shipment.status = ShipmentStatus.ACCEPTED
        shipment.save(update_fields=["status", "updated_at"])

        # 3. Registrar hito de tracking
        ShipmentTracking.objects.create(
            shipment=shipment,
            status=ShipmentStatus.ACCEPTED,
            notes="Transportista aceptó el envío.",
        )

    return selection


# ---------------------------------------------------------------------------
# Rechazar selección (Transportista)
# ---------------------------------------------------------------------------


def reject_selection(*, user, selection_id, rejection_reason=""):
    """
    Transportista rechaza la selección.

    Transición:
        Selection: PENDIENTE → RECHAZADO
        Shipment:  SELECCIONADO → CANCELADO
    """
    selection = _get_own_selection(user=user, selection_id=selection_id)

    if selection.status != SelectionStatus.PENDING:
        raise serializers.ValidationError({
            "status": (
                f"No se puede rechazar una selección en estado "
                f"'{selection.status}'. Solo se permite en estado PENDIENTE."
            )
        })

    shipment = selection.shipment

    with transaction.atomic():
        now = timezone.now()

        # 1. Actualizar selección → RECHAZADO
        selection.status = SelectionStatus.REJECTED
        selection.responded_at = now
        selection.rejection_reason = rejection_reason or None
        selection.save(update_fields=[
            "status", "responded_at", "rejection_reason", "updated_at"
        ])

        # 2. Cancelar shipment
        shipment.status = ShipmentStatus.CANCELLED
        shipment.save(update_fields=["status", "updated_at"])

        # 3. Registrar hito de tracking
        ShipmentTracking.objects.create(
            shipment=shipment,
            status=ShipmentStatus.CANCELLED,
            notes=f"Transportista rechazó el envío. Razón: {rejection_reason or 'No especificada'}",
        )

    return selection


# ---------------------------------------------------------------------------
# Iniciar tránsito (Transportista)
# ---------------------------------------------------------------------------


def start_transit(*, user, selection_id, location_data=None):
    """
    Transportista inicia el tránsito del envío.

    Transición:
        Shipment: ACEPTADO → EN_TRANSITO
    """
    selection = _get_own_selection(user=user, selection_id=selection_id)
    shipment = selection.shipment

    if shipment.status != ShipmentStatus.ACCEPTED:
        raise serializers.ValidationError({
            "status": (
                f"No se puede iniciar tránsito — el envío está en estado "
                f"'{shipment.status}', se requiere ACEPTADO."
            )
        })

    location_data = location_data or {}

    with transaction.atomic():
        # 1. Actualizar shipment → EN_TRANSITO
        shipment.status = ShipmentStatus.IN_TRANSIT
        shipment.save(update_fields=["status", "updated_at"])

        # 2. Registrar hito de tracking con GPS
        ShipmentTracking.objects.create(
            shipment=shipment,
            status=ShipmentStatus.IN_TRANSIT,
            location=location_data.get("location", ""),
            latitude=location_data.get("latitude"),
            longitude=location_data.get("longitude"),
            notes="Transportista inició el tránsito.",
        )

    return selection


# ---------------------------------------------------------------------------
# Confirmar entrega (Transportista)
# ---------------------------------------------------------------------------


def confirm_delivery(*, user, selection_id, location_data=None, notes=""):
    """
    Transportista confirma la entrega del envío.

    Transición:
        Shipment: EN_TRANSITO → ENTREGADO
    """
    selection = _get_own_selection(user=user, selection_id=selection_id)
    shipment = selection.shipment

    if shipment.status != ShipmentStatus.IN_TRANSIT:
        raise serializers.ValidationError({
            "status": (
                f"No se puede confirmar entrega — el envío está en estado "
                f"'{shipment.status}', se requiere EN_TRANSITO."
            )
        })

    location_data = location_data or {}

    with transaction.atomic():
        # 1. Actualizar shipment → ENTREGADO
        shipment.status = ShipmentStatus.DELIVERED
        shipment.save(update_fields=["status", "updated_at"])

        # 2. Registrar hito final de tracking con GPS
        ShipmentTracking.objects.create(
            shipment=shipment,
            status=ShipmentStatus.DELIVERED,
            location=location_data.get("location", ""),
            latitude=location_data.get("latitude"),
            longitude=location_data.get("longitude"),
            notes=notes or "Transportista confirmó la entrega.",
        )

        # 3. Crear notificación al cliente para que califique el servicio
        client = shipment.client
        Notification.objects.create(
            recipient_type="CLIENT",
            recipient_id=client.user_id,
            title="¡Tu envío fue entregado! ⭐ Califica el servicio",
            message=(
                f"Tu envío de {shipment.origin_address} a {shipment.destination_address} "
                f"ha sido entregado. ¡Cuéntanos cómo fue tu experiencia con el transportista!"
            ),
            metadata={
                "type": "RATING_REQUEST",
                "shipment_id": str(shipment.id),
                "transporter_id": str(selection.transporter.user_id),
                "transporter_name": selection.transporter.user.full_name,
            },
            status="PENDIENTE",
            is_read=False,
        )

    return selection


# ---------------------------------------------------------------------------
# Cancelar envío (Cliente)
# ---------------------------------------------------------------------------

# Estados desde los cuales el cliente puede cancelar
CANCELLABLE_STATUSES = {
    ShipmentStatus.REGISTERED,
    ShipmentStatus.SELECTED,
    ShipmentStatus.ACCEPTED,
}


def cancel_shipment(*, user, shipment_id, cancellation_reason=""):
    """
    El cliente cancela su envío.

    Transición:
        Shipment: (REGISTRADO | SELECCIONADO | ACEPTADO) → CANCELADO
        Selection activa: → CANCELADO
    """
    try:
        shipment = Shipment.objects.select_related("client", "client__user").get(
            pk=shipment_id,
        )
    except Shipment.DoesNotExist as exc:
        raise serializers.ValidationError(
            {"shipment_id": "Envío no encontrado."}
        ) from exc

    # Verificar propiedad
    if shipment.client.user_id != user.id and not user.is_admin:
        raise serializers.ValidationError(
            {"detail": "No tienes permiso para cancelar este envío."}
        )

    if shipment.status not in CANCELLABLE_STATUSES:
        raise serializers.ValidationError({
            "status": (
                f"No se puede cancelar un envío en estado '{shipment.status}'. "
                f"Solo se permite en estados: REGISTRADO, SELECCIONADO o ACEPTADO."
            )
        })

    with transaction.atomic():
        # 1. Cancelar el shipment
        shipment.status = ShipmentStatus.CANCELLED
        shipment.save(update_fields=["status", "updated_at"])

        # 2. Cancelar todas las selecciones activas (PENDIENTE o ACEPTADO)
        active_selections = ShipmentSelection.objects.filter(
            shipment=shipment,
            status__in=[SelectionStatus.PENDING, SelectionStatus.ACCEPTED],
        )
        now = timezone.now()
        for sel in active_selections:
            sel.status = SelectionStatus.CANCELLED
            sel.responded_at = sel.responded_at or now
            sel.rejection_reason = cancellation_reason or "Cancelado por el cliente."
            sel.save(update_fields=[
                "status", "responded_at", "rejection_reason", "updated_at"
            ])

        # 3. Registrar hito de tracking
        ShipmentTracking.objects.create(
            shipment=shipment,
            status=ShipmentStatus.CANCELLED,
            notes=f"Envío cancelado por el cliente. Razón: {cancellation_reason or 'No especificada'}",
        )

    return shipment


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------


def _get_own_selection(*, user, selection_id):
    """
    Obtiene una selección verificando que el transportista autenticado
    sea el dueño de la misma.
    """
    try:
        selection = ShipmentSelection.objects.select_related(
            "shipment",
            "shipment__client",
            "shipment__client__user",
            "transporter",
            "transporter__user",
        ).get(pk=selection_id)
    except ShipmentSelection.DoesNotExist as exc:
        raise serializers.ValidationError(
            {"selection_id": "Selección no encontrada."}
        ) from exc

    # Verificar identidad del transportista
    if not user.is_admin and selection.transporter.user_id != user.id:
        raise serializers.ValidationError(
            {"detail": "No tienes permiso para esta acción. La selección pertenece a otro transportista."}
        )

    return selection