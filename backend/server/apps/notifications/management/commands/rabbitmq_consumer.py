"""
Django Management Command: rabbitmq_consumer

Background Worker que consume eventos del exchange 'shipment_events'
de RabbitMQ y crea las Notifications correspondientes en la base de datos.

Uso:
    python manage.py rabbitmq_consumer

Arquitectura:
    1. Se conecta a RabbitMQ usando las credenciales de settings.RABBITMQ.
    2. Declara el exchange 'shipment_events' (topic, durable).
    3. Declara la cola 'notification_queue' (durable) bindeada con '#' (todos los eventos).
    4. Al recibir un mensaje:
       a. Parsea el JSON del evento.
       b. Resuelve el destinatario según el tipo de evento.
       c. Crea la Notification con FK al SystemEvent original.
       d. ACK el mensaje.

El consumer es idempotente: si el SystemEvent ya tiene una Notification
para el mismo destinatario, no crea duplicados.
"""

import json
import logging
import signal
import sys

import pika
from django.conf import settings
from django.core.management.base import BaseCommand

from apps.events.models.system_event import SystemEvent
from apps.notifications.models.notification import Notification
from common.enums.event import EventType
from common.enums.notification import NotificationStatus

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Mapeo: Tipo de Evento → (destinatario_tipo, generador de título/mensaje/metadata)
# ---------------------------------------------------------------------------

def _build_notification_data(event_type, payload, shipment_id, client_id, transporter_id):
    """
    Genera los datos de la notificación según el tipo de evento.

    Returns:
        list[dict]: Lista de notificaciones a crear (puede ser 1 o 2).
                    Cada dict tiene: recipient_type, recipient_id, title, message, metadata.
    """
    notifications = []

    transporter_name = payload.get("transporter_name", "el transportista")
    client_name = payload.get("client_name", "el cliente")
    origin = payload.get("origin_address", "origen")
    destination = payload.get("destination_address", "destino")

    if event_type == EventType.SHIPMENT_CREATED:
        # Notificar al transportista: nueva solicitud de envío
        if transporter_id:
            notifications.append({
                "recipient_type": "TRANSPORTER",
                "recipient_id": transporter_id,
                "title": "📦 Nueva solicitud de envío",
                "message": (
                    f"{client_name} ha registrado un envío de {origin} "
                    f"a {destination}. Revisa los detalles."
                ),
                "metadata": {
                    "type": "SHIPMENT_CREATED",
                    "shipment_id": shipment_id,
                    "action_url": f"/shipments/{shipment_id}",
                },
            })

    elif event_type == EventType.TRANSPORTER_SELECTED:
        # Notificar al transportista: fue seleccionado
        if transporter_id:
            notifications.append({
                "recipient_type": "TRANSPORTER",
                "recipient_id": transporter_id,
                "title": "🚚 Has sido seleccionado para un envío",
                "message": (
                    f"{client_name} te ha seleccionado para el envío de "
                    f"{origin} a {destination}. Acepta o rechaza la solicitud."
                ),
                "metadata": {
                    "type": "TRANSPORTER_SELECTED",
                    "shipment_id": shipment_id,
                    "action_url": f"/transporter/shipments/{shipment_id}",
                },
            })

    elif event_type == EventType.SHIPMENT_ACCEPTED:
        # Notificar al cliente: el transportista aceptó
        if client_id:
            notifications.append({
                "recipient_type": "CLIENT",
                "recipient_id": client_id,
                "title": "✅ Tu envío fue aceptado",
                "message": (
                    f"{transporter_name} ha aceptado tu solicitud de envío. "
                    f"Pronto iniciará el tránsito."
                ),
                "metadata": {
                    "type": "SHIPMENT_ACCEPTED",
                    "shipment_id": shipment_id,
                    "action_url": f"/shipments/{shipment_id}",
                },
            })

    elif event_type == EventType.SHIPMENT_REJECTED:
        # Notificar al cliente: el transportista rechazó
        rejection_reason = payload.get("rejection_reason", "No especificada")
        if client_id:
            notifications.append({
                "recipient_type": "CLIENT",
                "recipient_id": client_id,
                "title": "❌ Tu solicitud de envío fue rechazada",
                "message": (
                    f"{transporter_name} ha rechazado tu solicitud. "
                    f"Razón: {rejection_reason}. Puedes seleccionar otro transportista."
                ),
                "metadata": {
                    "type": "SHIPMENT_REJECTED",
                    "shipment_id": shipment_id,
                    "action_url": f"/shipments/{shipment_id}",
                },
            })

    elif event_type == EventType.SHIPMENT_IN_TRANSIT:
        # Notificar al cliente: envío en tránsito
        if client_id:
            notifications.append({
                "recipient_type": "CLIENT",
                "recipient_id": client_id,
                "title": "🚛 Tu envío está en camino",
                "message": (
                    f"{transporter_name} ha iniciado el tránsito de tu envío. "
                    f"Puedes seguir el progreso en tiempo real."
                ),
                "metadata": {
                    "type": "SHIPMENT_IN_TRANSIT",
                    "shipment_id": shipment_id,
                    "action_url": f"/shipments/{shipment_id}/tracking",
                },
            })

    elif event_type == EventType.SHIPMENT_DELIVERED:
        # Notificar al cliente: envío entregado + solicitud de calificación
        if client_id:
            notifications.append({
                "recipient_type": "CLIENT",
                "recipient_id": client_id,
                "title": "🎉 ¡Tu envío fue entregado! ⭐ Califica el servicio",
                "message": (
                    f"Tu envío de {origin} a {destination} ha sido entregado "
                    f"por {transporter_name}. ¡Cuéntanos cómo fue tu experiencia!"
                ),
                "metadata": {
                    "type": "RATING_REQUEST",
                    "shipment_id": shipment_id,
                    "transporter_id": transporter_id,
                    "action_url": f"/shipments/{shipment_id}/rate",
                },
            })
        # Notificar al transportista: entrega confirmada
        if transporter_id:
            notifications.append({
                "recipient_type": "TRANSPORTER",
                "recipient_id": transporter_id,
                "title": "📋 Entrega confirmada exitosamente",
                "message": (
                    f"Has completado la entrega del envío de {origin} a "
                    f"{destination}. ¡Buen trabajo!"
                ),
                "metadata": {
                    "type": "DELIVERY_CONFIRMED",
                    "shipment_id": shipment_id,
                    "action_url": f"/transporter/shipments/{shipment_id}",
                },
            })

    elif event_type == EventType.SHIPMENT_CANCELLED:
        cancelled_by = payload.get("cancelled_by", "CLIENT")
        cancellation_reason = payload.get("cancellation_reason", "No especificada")

        if cancelled_by == "CLIENT" and transporter_id:
            # Notificar al transportista: el cliente canceló
            notifications.append({
                "recipient_type": "TRANSPORTER",
                "recipient_id": transporter_id,
                "title": "🚫 Envío cancelado por el cliente",
                "message": (
                    f"{client_name} ha cancelado el envío. "
                    f"Razón: {cancellation_reason}"
                ),
                "metadata": {
                    "type": "SHIPMENT_CANCELLED",
                    "shipment_id": shipment_id,
                    "action_url": f"/transporter/shipments/{shipment_id}",
                },
            })

    return notifications


# ---------------------------------------------------------------------------
# Callback del consumer
# ---------------------------------------------------------------------------

def _on_message(ch, method, properties, body):
    """
    Callback invocado por pika al recibir un mensaje de la cola.
    Parsea el evento, resuelve destinatarios y crea las Notifications.
    """
    try:
        data = json.loads(body)
        event_id = data.get("event_id")
        event_type = data.get("event_type")
        shipment_id = data.get("shipment_id")
        client_id = data.get("client_id")
        transporter_id = data.get("transporter_id")
        payload = data.get("payload", {})

        logger.info(
            "Mensaje recibido: event_type=%s, event_id=%s",
            event_type, event_id,
        )

        # Obtener el SystemEvent original
        try:
            system_event = SystemEvent.objects.get(pk=event_id)
        except SystemEvent.DoesNotExist:
            logger.error("SystemEvent %s no encontrado. Descartando mensaje.", event_id)
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        # Generar datos de notificación
        notification_list = _build_notification_data(
            event_type, payload, shipment_id, client_id, transporter_id,
        )

        for notif_data in notification_list:
            # Idempotencia: no crear duplicados
            exists = Notification.objects.filter(
                event=system_event,
                recipient_type=notif_data["recipient_type"],
                recipient_id=notif_data["recipient_id"],
            ).exists()

            if exists:
                logger.info(
                    "Notification ya existe para event=%s, recipient=%s:%s. Saltando.",
                    event_id, notif_data["recipient_type"], notif_data["recipient_id"],
                )
                continue

            Notification.objects.create(
                event=system_event,
                recipient_type=notif_data["recipient_type"],
                recipient_id=notif_data["recipient_id"],
                title=notif_data["title"],
                message=notif_data["message"],
                metadata=notif_data["metadata"],
                status=NotificationStatus.SENT,
            )

            logger.info(
                "Notification creada: %s → %s:%s",
                notif_data["title"],
                notif_data["recipient_type"],
                notif_data["recipient_id"],
            )

        ch.basic_ack(delivery_tag=method.delivery_tag)

    except json.JSONDecodeError:
        logger.error("Mensaje con JSON inválido. Descartando: %s", body[:200])
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception:
        logger.exception("Error procesando mensaje. Rechazando con requeue.")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)


# ---------------------------------------------------------------------------
# Management Command
# ---------------------------------------------------------------------------

class Command(BaseCommand):
    help = (
        "Inicia el consumer de RabbitMQ que escucha eventos del sistema "
        "y crea notificaciones en la base de datos."
    )

    def handle(self, *args, **options):
        rmq = settings.RABBITMQ
        exchange_name = rmq["EXCHANGE"]
        queue_name = rmq["QUEUE"]

        self.stdout.write(self.style.NOTICE(
            f"Conectando a RabbitMQ en {rmq['HOST']}:{rmq['PORT']}..."
        ))

        credentials = pika.PlainCredentials(rmq["USER"], rmq["PASS"])
        params = pika.ConnectionParameters(
            host=rmq["HOST"],
            port=rmq["PORT"],
            credentials=credentials,
            heartbeat=600,
            blocked_connection_timeout=300,
        )

        connection = pika.BlockingConnection(params)
        channel = connection.channel()

        # Declarar exchange y cola
        channel.exchange_declare(
            exchange=exchange_name,
            exchange_type="topic",
            durable=True,
        )
        channel.queue_declare(queue=queue_name, durable=True)
        channel.queue_bind(
            exchange=exchange_name,
            queue=queue_name,
            routing_key="#",  # Escuchar todos los eventos
        )

        # Prefetch = 1 para procesamiento justo
        channel.basic_qos(prefetch_count=1)

        # Manejar SIGINT/SIGTERM para shutdown limpio
        def _shutdown(signum, frame):
            self.stdout.write(self.style.WARNING("\nCerrando consumer..."))
            channel.stop_consuming()
            connection.close()
            sys.exit(0)

        signal.signal(signal.SIGINT, _shutdown)
        signal.signal(signal.SIGTERM, _shutdown)

        channel.basic_consume(
            queue=queue_name,
            on_message_callback=_on_message,
            auto_ack=False,
        )

        self.stdout.write(self.style.SUCCESS(
            f"✅ Consumer iniciado. Escuchando en cola '{queue_name}' "
            f"(exchange: '{exchange_name}'). Ctrl+C para detener."
        ))

        channel.start_consuming()
