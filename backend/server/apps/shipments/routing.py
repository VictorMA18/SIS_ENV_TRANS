"""
Routing WebSocket para la app shipments.
"""

from django.urls import re_path

from apps.shipments.consumers import AvailableTransportersConsumer

websocket_urlpatterns = [
    re_path(
        r"ws/shipments/available-transporters/$",
        AvailableTransportersConsumer.as_asgi(),
    ),
]
