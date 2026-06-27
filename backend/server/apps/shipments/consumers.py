"""
Consumers WebSocket para la app shipments.

AvailableTransportersConsumer:
    Transmite en tiempo real la lista de transportistas disponibles.
    URL: ws/shipments/available-transporters/?token=<JWT>

NotificationConsumer:
    Consumer universal y simétrico de notificaciones en tiempo real.
    Acepta conexiones de cualquier usuario autenticado (Cliente o Transportista).
    URL: ws/notifications/?token=<JWT>
    Cuando el worker de RabbitMQ crea una Notification en BD, despacha
    el payload serializado al grupo 'user_<user_id>' y éste lo
    reenvía al cliente WebSocket al instante.
"""

import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth.models import AnonymousUser
from django.db.models import Case, IntegerField, Value, When

from apps.transporters.models.transporter import Transporter
from apps.transporters.serializers import TransporterProfileSerializer


class AvailableTransportersConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket: ws/shipments/available-transporters/?token=<JWT>

    Comportamiento:
        - Al conectar: envía la lista completa de transportistas disponibles.
        - Mensajes entrantes: acepta filtros de distrito para re-priorizar.
            { "origin_district": "...", "destination_district": "..." }
        - Grupo 'available_transporters': broadcast cuando cambia la
          disponibilidad de un transportista.
    """

    GROUP_NAME = "available_transporters"

    async def connect(self):
        """Acepta la conexión solo si el usuario está autenticado."""
        user = self.scope.get("user", AnonymousUser())

        if isinstance(user, AnonymousUser) or not user.is_authenticated:
            await self.close(code=4001)
            return

        # Inicializar filtros vacíos
        self.origin_district = ""
        self.destination_district = ""

        # Unirse al grupo de broadcast
        await self.channel_layer.group_add(
            self.GROUP_NAME,
            self.channel_name,
        )
        await self.accept()

        # Enviar lista inicial sin filtros
        data = await self._get_available_transporters()
        await self.send_json({
            "type": "transporters_list",
            "data": data,
        })

    async def disconnect(self, close_code):
        """Salir del grupo al desconectar."""
        await self.channel_layer.group_discard(
            self.GROUP_NAME,
            self.channel_name,
        )

    async def receive_json(self, content, **kwargs):
        """
        Recibe filtros del cliente y retorna la lista priorizada.

        Payload esperado:
            {
                "origin_district": "Miraflores",
                "destination_district": "San Isidro"
            }
        """
        self.origin_district = content.get("origin_district", "")
        self.destination_district = content.get("destination_district", "")

        data = await self._get_available_transporters(
            origin_district=self.origin_district,
            destination_district=self.destination_district,
        )
        await self.send_json({
            "type": "transporters_list",
            "data": data,
        })

    async def transporters_update(self, event):
        """
        Handler para mensajes de broadcast del grupo.
        Se dispara cuando se envía un mensaje al grupo 'available_transporters'
        con type='transporters.update'.
        """
        # Utilizar los filtros previamente guardados para este cliente específico
        data = await self._get_available_transporters(
            origin_district=getattr(self, "origin_district", ""),
            destination_district=getattr(self, "destination_district", ""),
        )
        await self.send_json({
            "type": "transporters_list",
            "data": data,
        })

    @database_sync_to_async
    def _get_available_transporters(
        self,
        origin_district="",
        destination_district="",
    ):
        """
        Misma lógica de prioridad que el endpoint REST original:
        1. Filtrar is_active=True, is_available=True
        2. Si hay distritos, anotar prioridad por match en TransporterZone
        3. Ordenar por prioridad → rating descendente
        """
        origin_district = (origin_district or "").strip()
        destination_district = (destination_district or "").strip()

        qs = Transporter.objects.filter(
            is_active=True,
            is_available=True,
        ).select_related("user")

        districts = [d for d in (origin_district, destination_district) if d]

        if districts:
            qs = qs.annotate(
                priority=Case(
                    When(zones__district__in=districts, then=Value(0)),
                    default=Value(1),
                    output_field=IntegerField(),
                ),
            ).distinct().order_by("priority", "-average_rating")
        else:
            qs = qs.order_by("-average_rating")

        serializer = TransporterProfileSerializer(qs, many=True)
        return serializer.data


# ---------------------------------------------------------------------------
# Consumer universal de notificaciones (Clientes + Transportistas)
# ---------------------------------------------------------------------------


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket: ws/notifications/?token=<JWT>

    Consumer unificado y simétrico para notificaciones en tiempo real.
    Acepta conexiones de cualquier usuario autenticado (Cliente o Transportista)
    y lo une a un grupo exclusivo basado en su ID de usuario.

    Comportamiento:
        - Al conectar: valida el token JWT del scope.
          · Si es AnonymousUser → cierra la conexión (código 4001).
          · Si es un usuario válido → se une al grupo 'user_<user_id>'.
        - Al desconectar: abandona el grupo personal.
        - Recibe mensajes del grupo (emitidos desde rabbitmq_consumer) y los
          reenvía directamente al WebSocket del cliente.
        - Acepta pings del cliente para keep-alive.

    Payload enviado al cliente (desde el handler send_notification):
        {
            "type": "new_notification",
            "notification": { ... }   ← datos serializados de la Notification
        }
    """

    def _group_name(self):
        """Nombre del grupo personal del usuario (universal)."""
        return f"user_{self.scope['user'].id}"

    async def connect(self):
        """Acepta usuarios autenticados (cualquier rol) y los une a su grupo personal."""
        user = self.scope.get("user", AnonymousUser())

        if isinstance(user, AnonymousUser) or not user.is_authenticated:
            await self.close(code=4001)
            return

        await self.channel_layer.group_add(
            self._group_name(),
            self.channel_name,
        )
        await self.accept()

    async def disconnect(self, close_code):
        """Abandona el grupo personal al desconectar."""
        user = self.scope.get("user", AnonymousUser())
        if not isinstance(user, AnonymousUser) and user.is_authenticated:
            await self.channel_layer.group_discard(
                self._group_name(),
                self.channel_name,
            )

    async def receive_json(self, content, **kwargs):
        """
        El cliente puede enviar un ping para mantener la conexión viva.
        { "type": "ping" }  →  { "type": "pong" }
        """
        if content.get("type") == "ping":
            await self.send_json({"type": "pong"})

    # ------------------------------------------------------------------
    # Handler de Channels (llamado por channel_layer.group_send)
    # ------------------------------------------------------------------

    async def send_notification(self, event):
        """
        Recibe el payload de notificación procesado por el worker de RabbitMQ
        y lo envía al WebSocket del usuario al instante.

        Payload al cliente:
            {
                "type": "new_notification",
                "notification": {
                    "id": "<uuid>",
                    "title": "...",
                    "message": "...",
                    "status": "ENVIADO",
                    "metadata": { ... },
                    "is_read": false,
                    "created_at": "2026-..."
                }
            }
        """
        await self.send_json({
            "type": "new_notification",
            "notification": event["notification"],
        })
