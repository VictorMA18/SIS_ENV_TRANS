from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.ratings.views import RatingViewSet

router = DefaultRouter()
router.register(r"ratings", RatingViewSet, basename="ratings")

urlpatterns = [
    path("", include(router.urls)),
]
