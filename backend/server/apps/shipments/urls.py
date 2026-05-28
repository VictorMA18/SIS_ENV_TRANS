from rest_framework.routers import DefaultRouter
from apps.shipments.views import ShipmentViewSet, TransporterShipmentViewSet

# Usamos routers independientes y los concatenamos en un orden específico.
# Esto evita que la ruta genérica 'shipments/<pk>/' intercepte a 'shipments/transporter/'.
router_transporter = DefaultRouter()
router_transporter.register(
    "shipments/transporter",
    TransporterShipmentViewSet,
    basename="transporter-shipments",
)

router_shipments = DefaultRouter()
router_shipments.register("shipments", ShipmentViewSet, basename="shipments")

urlpatterns = router_transporter.urls + router_shipments.urls

