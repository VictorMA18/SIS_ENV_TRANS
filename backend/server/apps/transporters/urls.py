from rest_framework.routers import DefaultRouter

from apps.transporters.views import TransporterViewSet, TransporterZoneViewSet

router = DefaultRouter()
router.register(r"transporters", TransporterViewSet, basename="transporter")
router.register(r"transporter-zones", TransporterZoneViewSet, basename="transporter-zone")

urlpatterns = router.urls
