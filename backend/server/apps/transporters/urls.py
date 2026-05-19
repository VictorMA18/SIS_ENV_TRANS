from rest_framework.routers import DefaultRouter

from apps.transporters.views import TransporterViewSet

router = DefaultRouter()
router.register(r"transporters", TransporterViewSet, basename="transporter")

urlpatterns = router.urls
