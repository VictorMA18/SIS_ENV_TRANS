"""
RabbitMQ Publisher — Publica eventos del sistema en el exchange de RabbitMQ.

Uso:
    from common.messaging.rabbitmq_publisher import publish_event
    publish_event(system_event)

El publisher:
  1. Abre una conexión con pika.BlockingConnection.
  2. Declara el exchange 'shipment_events' (topic, durable).
  3. Publica el payload JSON con delivery_mode=2 (persistente).
  4. Marca el SystemEvent como published=True.
"""

import json
import logging

import pika
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def _get_connection_params():
    """Construye los parámetros de conexión desde settings.RABBITMQ."""
    rmq = settings.RABBITMQ
    credentials = pika.PlainCredentials(rmq["USER"], rmq["PASS"])
    return pika.ConnectionParameters(
        host=rmq["HOST"],
        port=rmq["PORT"],
        credentials=credentials,
        heartbeat=300,
        blocked_connection_timeout=60,
    )


def publish_event(system_event):
    """
    Publica un SystemEvent en el exchange de RabbitMQ.

    Args:
        system_event: Instancia de apps.events.models.SystemEvent ya persistida.

    El routing_key es el event_type en minúsculas (ej: 'shipment_delivered').
    El mensaje incluye toda la información necesaria para que el consumer
    cree la Notification sin consultas adicionales a la base de datos.
    """
    rmq = settings.RABBITMQ
    exchange_name = rmq["EXCHANGE"]

    message = {
        "event_id": str(system_event.id),
        "event_type": system_event.event_type,
        "shipment_id": str(system_event.shipment_id) if system_event.shipment_id else None,
        "client_id": str(system_event.client_id) if system_event.client_id else None,
        "transporter_id": str(system_event.transporter_id) if system_event.transporter_id else None,
        "payload": system_event.payload or {},
        "created_at": system_event.created_at.isoformat(),
    }

    routing_key = system_event.event_type.lower()

    try:
        params = _get_connection_params()
        connection = pika.BlockingConnection(params)
        channel = connection.channel()

        # Declarar exchange idempotentemente
        channel.exchange_declare(
            exchange=exchange_name,
            exchange_type="topic",
            durable=True,
        )

        # Publicar mensaje persistente
        channel.basic_publish(
            exchange=exchange_name,
            routing_key=routing_key,
            body=json.dumps(message, ensure_ascii=False),
            properties=pika.BasicProperties(
                delivery_mode=2,  # Persistente
                content_type="application/json",
            ),
        )

        connection.close()

        # Marcar el evento como publicado
        system_event.published = True
        system_event.published_at = timezone.now()
        system_event.save(update_fields=["published", "published_at"])

        logger.info(
            "Evento publicado en RabbitMQ: %s [%s]",
            system_event.event_type,
            system_event.id,
        )

    except pika.exceptions.AMQPConnectionError:
        logger.error(
            "No se pudo conectar a RabbitMQ para publicar evento %s [%s]. "
            "El evento queda persistido pero no publicado.",
            system_event.event_type,
            system_event.id,
        )
    except Exception:
        logger.exception(
            "Error inesperado al publicar evento %s [%s] en RabbitMQ.",
            system_event.event_type,
            system_event.id,
        )
