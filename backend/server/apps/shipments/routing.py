"""
Routing WebSocket para la app shipments.

Rutas disponibles:
    ws/shipments/available-transporters/  →  AvailableTransportersConsumer
    ws/shipments/notifications/           →  TransporterNotificationsConsumer
"""

from django.urls import re_path

from apps.shipments.consumers import (
    AvailableTransportersConsumer,
    TransporterNotificationsConsumer,
)

websocket_urlpatterns = [
    re_path(
        r"ws/shipments/available-transporters/$",
        AvailableTransportersConsumer.as_asgi(),
    ),
    re_path(
        r"ws/shipments/notifications/$",
        TransporterNotificationsConsumer.as_asgi(),
    ),
]
