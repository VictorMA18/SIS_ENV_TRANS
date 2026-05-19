from rest_framework.permissions import BasePermission, IsAdminUser
from rest_framework.viewsets import ModelViewSet
from rest_framework.request import Request
from rest_framework.views import APIView

from apps.clients.models import Client
from apps.clients.serializers import ClientSerializer


class IsAdminOrClientSelf(BasePermission):
    def has_permission(self, request: Request, view: APIView) -> bool:  # type: ignore
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_admin:
            return True
        return request.user.is_client

    def has_object_permission(self, request, view, obj):
        if request.user.is_admin:
            return True
        return request.user.is_client and obj.user_id == request.user.id


class ClientViewSet(ModelViewSet):
    queryset = Client.objects.select_related("user")
    serializer_class = ClientSerializer
    http_method_names = ["get", "patch", "put", "head", "options"]

    def get_permissions(self):
        if self.action == "list":
            return [IsAdminUser()]
        return [IsAdminOrClientSelf()]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.is_admin:
            return queryset
        return queryset.filter(user_id=user.id)
