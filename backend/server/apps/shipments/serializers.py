from django.utils import timezone
from rest_framework import serializers

from apps.shipments.models.shipment import Shipment
from apps.shipments.models.shipment_selection import ShipmentSelection
from apps.shipments.models.shipment_tracking import ShipmentTracking
from apps.transporters.models.transporter import Transporter
from apps.users.models.user import User


# ---------------------------------------------------------------------------
# Nested read-only serializers (for the response payload)
# ---------------------------------------------------------------------------


class _UserMiniSerializer(serializers.ModelSerializer):
    """Datos mínimos del usuario asociado a un client/transporter."""

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "avatar_url")
        read_only_fields = fields


class ClientNestedSerializer(serializers.Serializer):
    """Representación anidada del cliente dentro de un Shipment."""

    id = serializers.UUIDField(source="pk")
    email = serializers.EmailField(source="user.email")
    full_name = serializers.CharField(source="user.full_name")
    avatar_url = serializers.URLField(source="user.avatar_url", allow_null=True)


class TransporterMiniSerializer(serializers.ModelSerializer):
    """Datos básicos del transportista dentro de una selección."""

    id = serializers.UUIDField(source="pk", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    avatar_url = serializers.URLField(source="user.avatar_url", read_only=True)

    class Meta:
        model = Transporter
        fields = (
            "id",
            "email",
            "full_name",
            "avatar_url",
            "license_number",
            "is_available",
            "is_active",
            "average_rating",
        )
        read_only_fields = fields


class ShipmentSelectionSerializer(serializers.ModelSerializer):
    transporter = TransporterMiniSerializer(read_only=True)

    class Meta:
        model = ShipmentSelection
        fields = (
            "id",
            "transporter",
            "status",
            "responded_at",
            "rejection_reason",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class ShipmentTrackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShipmentTracking
        fields = (
            "id",
            "status",
            "location",
            "latitude",
            "longitude",
            "notes",
            "created_at",
        )
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Detail / List serializer  (read-only, nested response)
# ---------------------------------------------------------------------------


class ShipmentDetailSerializer(serializers.ModelSerializer):
    client = ClientNestedSerializer(read_only=True)
    selections = ShipmentSelectionSerializer(many=True, read_only=True)
    tracking_entries = ShipmentTrackingSerializer(many=True, read_only=True)

    class Meta:
        model = Shipment
        fields = (
            "id",
            "client",
            "origin_address",
            "destination_address",
            "description",
            "weight_kg",
            "volume_m3",
            "status",
            "notes",
            "is_active",
            "scheduled_delivery_at",
            "created_at",
            "updated_at",
            "selections",
            "tracking_entries",
        )
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Create serializer  (flat write payload → nested read response)
# ---------------------------------------------------------------------------


class ShipmentCreateSerializer(serializers.ModelSerializer):
    transporter_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Shipment
        fields = (
            "origin_address",
            "destination_address",
            "description",
            "weight_kg",
            "volume_m3",
            "notes",
            "scheduled_delivery_at",
            "transporter_id",
        )

    # -- Validaciones de campo --

    def validate_scheduled_delivery_at(self, value):
        if value and value < timezone.now():
            raise serializers.ValidationError(
                "La fecha de entrega no puede ser en el pasado."
            )
        return value

    def validate_transporter_id(self, value):
        """
        Valida que el transporter_id:
        1. Exista en la base de datos.
        2. Esté activo (is_active=True).
        3. Esté disponible (is_available=True).
        """
        try:
            transporter = Transporter.objects.get(pk=value)
        except Transporter.DoesNotExist:
            raise serializers.ValidationError(
                "Transportista no encontrado."
            )

        if not transporter.is_active:
            raise serializers.ValidationError(
                "El transportista seleccionado no está activo."
            )

        if not transporter.is_available:
            raise serializers.ValidationError(
                "El transportista seleccionado no está disponible."
            )

        return value


# ---------------------------------------------------------------------------
# Update serializer  (parcial, solo en estados tempranos)
# ---------------------------------------------------------------------------


class ShipmentUpdateSerializer(serializers.ModelSerializer):
    """
    Permite editar solo campos operativos del envío.
    La vista se encarga de bloquear la edición si el estado
    ya superó SELECCIONADO.
    """

    class Meta:
        model = Shipment
        fields = (
            "origin_address",
            "destination_address",
            "description",
            "weight_kg",
            "volume_m3",
            "notes",
        )
