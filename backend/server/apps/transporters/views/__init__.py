from rest_framework import permissions
from rest_framework.decorators import action
from rest_framework.permissions import BasePermission, IsAdminUser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.transporters.models import Transporter, TransporterZone
from apps.transporters.serializers import TransporterSerializer, TransporterProfileSerializer, TransporterZoneSerializer

class IsAdminOrTransporterSelf(BasePermission):
    def has_permission(self, request: Request, view: APIView) -> bool:  # type: ignore
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_admin:
            return True
        return request.user.is_transporter

    def has_object_permission(self, request, view, obj):
        if request.user.is_admin:
            return True
        return request.user.is_transporter and obj.user_id == request.user.id


class IsAdminOrZoneOwner(BasePermission):
    def has_permission(self, request: Request, view: APIView) -> bool:  # type: ignore
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_admin or request.user.is_transporter

    def has_object_permission(self, request, view, obj):
        if request.user.is_admin:
            return True
        return request.user.is_transporter and obj.transporter_id == request.user.id


class TransporterViewSet(ModelViewSet):
    queryset = Transporter.objects.select_related("user")
    serializer_class = TransporterSerializer
    http_method_names = ["get", "patch", "put", "head", "options"]

    def get_permissions(self):
        if self.action == "list":
            return [IsAdminUser()]
        if self.action == "available":
            return [permissions.IsAuthenticated()]
        return [IsAdminOrTransporterSelf()]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # Validación de seguridad por si el usuario es anónimo
        if not user or not user.is_authenticated:
            return queryset.none()

        if user.is_admin:
            return queryset
        return queryset.filter(user_id=user.id)

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def available(self, request):
        """Retorna los transportistas activos y disponibles para los clientes."""
        queryset = Transporter.objects.select_related("user").filter(
            is_active=True, is_available=True,
        )
        serializer = TransporterProfileSerializer(queryset, many=True)
        return Response(serializer.data)


class TransporterZoneViewSet(ModelViewSet):
    serializer_class = TransporterZoneSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrZoneOwner]

    def get_queryset(self):
        return TransporterZone.objects.filter(
            transporter=self.request.user.transporter_profile
        )

    def perform_create(self, serializer):
        serializer.save(
            transporter=self.request.user.transporter_profile
        )
