"""
Routing WebSocket para la app shipments.

Rutas disponibles:
    ws/shipments/available-transporters/  →  AvailableTransportersConsumer
    ws/notifications/                     →  NotificationConsumer (universal)
"""

from django.urls import re_path

from apps.shipments.consumers import (
    AvailableTransportersConsumer,
    NotificationConsumer,
)

websocket_urlpatterns = [
    re_path(
        r"ws/shipments/available-transporters/$",
        AvailableTransportersConsumer.as_asgi(),
    ),
    re_path(
        r"ws/notifications/$",
        NotificationConsumer.as_asgi(),
    ),
]
