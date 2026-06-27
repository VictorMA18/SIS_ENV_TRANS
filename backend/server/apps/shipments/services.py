"""
Capa de servicios para el módulo de envíos.

Contiene toda la lógica de negocio transaccional del ciclo de vida:
  - Creación de envío con selección
  - Aceptar / Rechazar selección (Transportista)
  - Iniciar tránsito / Confirmar entrega (Transportista)
  - Cancelar envío (Cliente)

ARQUITECTURA ESTRICTA:
  1. Todas las operaciones se envuelven en transaction.atomic().
  2. Todo hito registra un ShipmentTracking (append-only).
  3. Todo hito crea un SystemEvent inmutable.
  4. Después del commit, el evento se publica en RabbitMQ.
  5. NUNCA se crea un Notification directamente aquí.
     Las notificaciones las genera el consumer de RabbitMQ.
"""

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.events.models.system_event import SystemEvent
from apps.shipments.models.shipment import Shipment
from apps.shipments.models.shipment_selection import ShipmentSelection
from apps.shipments.models.shipment_tracking import ShipmentTracking
from apps.transporters.models.transporter import Transporter
from common.enums.event import EventType
from common.enums.shipment import ShipmentStatus, SelectionStatus
from common.messaging.rabbitmq_publisher import publish_event

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helper: publicar evento después del commit
# ---------------------------------------------------------------------------


def _publish_after_commit(event):
    """
    Programa la publicación del evento en RabbitMQ después del commit.
    Si no estamos dentro de un bloque atómico, publica inmediatamente.
    """
    def _do_publish():
        try:
            publish_event(event)
        except Exception:
            logger.exception(
                "Error publicando evento %s [%s] en RabbitMQ (post-commit).",
                event.event_type, event.id,
            )

    if transaction.get_connection().in_atomic_block:
        transaction.on_commit(_do_publish)
    else:
        _do_publish()


# ---------------------------------------------------------------------------
# Creación
# ---------------------------------------------------------------------------


def create_shipment_with_selection(*, client, shipment_data, transporter_id):
    """
    Crea un envío con su selección de transportista y registros de
    tracking dentro de una transacción atómica.

    Secuencia (7 pasos):
        1. INSERT Shipment → estado REGISTRADO
        2. INSERT ShipmentTracking → estado REGISTRADO
        3. INSERT SystemEvent → SHIPMENT_CREATED
        4. UPDATE Shipment → estado SELECCIONADO
        5. INSERT ShipmentSelection → estado PENDIENTE
        6. INSERT ShipmentTracking → estado SELECCIONADO
        7. INSERT SystemEvent → TRANSPORTER_SELECTED
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

    # --- Transacción atómica de creación (7 pasos) ---
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

        # 3. SystemEvent → SHIPMENT_CREATED
        event_created = SystemEvent.objects.create(
            event_type=EventType.SHIPMENT_CREATED,
            shipment=shipment,
            client=client,
            transporter=transporter,
            payload={
                "origin_address": shipment.origin_address,
                "destination_address": shipment.destination_address,
                "client_name": client.user.full_name,
            },
        )

        # 4. Cambiar estado del Shipment a SELECCIONADO
        shipment.status = ShipmentStatus.SELECTED
        shipment.save(update_fields=["status", "updated_at"])

        # 5. Crear ShipmentSelection vinculada al transportista → PENDIENTE
        ShipmentSelection.objects.create(
            shipment=shipment,
            transporter=transporter,
            status=SelectionStatus.PENDING,
        )

        # 6. Segundo registro de tracking → SELECCIONADO
        ShipmentTracking.objects.create(
            shipment=shipment,
            status=ShipmentStatus.SELECTED,
        )

        # 7. SystemEvent → TRANSPORTER_SELECTED
        event_selected = SystemEvent.objects.create(
            event_type=EventType.TRANSPORTER_SELECTED,
            shipment=shipment,
            client=client,
            transporter=transporter,
            payload={
                "origin_address": shipment.origin_address,
                "destination_address": shipment.destination_address,
                "transporter_name": transporter.user.full_name,
                "client_name": client.user.full_name,
            },
        )

    # --- Post-commit: publicar en RabbitMQ ---
    _publish_after_commit(event_created)
    _publish_after_commit(event_selected)

    # --- Notificación push WebSocket al transportista ---
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"transporter_{transporter.user_id}",
            {
                "type": "new_shipment",
                "shipment_id": str(shipment.id),
                "message": "Tienes una nueva solicitud de envío",
            },
        )
    except Exception:
        # No fallar el flujo principal si el WebSocket no está disponible
        pass

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

        # 4. SystemEvent → SHIPMENT_ACCEPTED
        event = SystemEvent.objects.create(
            event_type=EventType.SHIPMENT_ACCEPTED,
            shipment=shipment,
            client=shipment.client,
            transporter=selection.transporter,
            payload={
                "transporter_name": selection.transporter.user.full_name,
            },
        )

    _publish_after_commit(event)
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

        # 4. SystemEvent → SHIPMENT_REJECTED
        event = SystemEvent.objects.create(
            event_type=EventType.SHIPMENT_REJECTED,
            shipment=shipment,
            client=shipment.client,
            transporter=selection.transporter,
            payload={
                "rejection_reason": rejection_reason or "No especificada",
                "transporter_name": selection.transporter.user.full_name,
            },
        )

    _publish_after_commit(event)
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

        # 3. SystemEvent → SHIPMENT_IN_TRANSIT
        event = SystemEvent.objects.create(
            event_type=EventType.SHIPMENT_IN_TRANSIT,
            shipment=shipment,
            client=shipment.client,
            transporter=selection.transporter,
            payload={
                "transporter_name": selection.transporter.user.full_name,
                "location": location_data.get("location", ""),
            },
        )

    _publish_after_commit(event)
    return selection


# ---------------------------------------------------------------------------
# Confirmar entrega (Transportista)
# ---------------------------------------------------------------------------


def confirm_delivery(*, user, selection_id, location_data=None, notes=""):
    """
    Transportista confirma la entrega del envío.

    Transición:
        Shipment: EN_TRANSITO → ENTREGADO

    NOTA: La notificación al cliente para calificar se crea
    asincrónicamente por el consumer de RabbitMQ, NO aquí.
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

        # 3. SystemEvent → SHIPMENT_DELIVERED
        event = SystemEvent.objects.create(
            event_type=EventType.SHIPMENT_DELIVERED,
            shipment=shipment,
            client=shipment.client,
            transporter=selection.transporter,
            payload={
                "transporter_name": selection.transporter.user.full_name,
                "origin_address": shipment.origin_address,
                "destination_address": shipment.destination_address,
            },
        )

    _publish_after_commit(event)
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

    # Obtener el transportista de la selección activa (si existe)
    active_selection = ShipmentSelection.objects.filter(
        shipment=shipment,
        status__in=[SelectionStatus.PENDING, SelectionStatus.ACCEPTED],
    ).select_related("transporter", "transporter__user").first()

    transporter = active_selection.transporter if active_selection else None

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

        # 4. SystemEvent → SHIPMENT_CANCELLED
        event = SystemEvent.objects.create(
            event_type=EventType.SHIPMENT_CANCELLED,
            shipment=shipment,
            client=shipment.client,
            transporter=transporter,
            payload={
                "cancellation_reason": cancellation_reason or "No especificada",
                "cancelled_by": "CLIENT",
            },
        )

    _publish_after_commit(event)
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