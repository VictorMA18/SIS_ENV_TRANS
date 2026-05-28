import re
from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from apps.shipments.models.shipment import Shipment
from apps.shipments.models.shipment_selection import ShipmentSelection
from apps.shipments.models.shipment_tracking import ShipmentTracking
from apps.transporters.models.transporter import Transporter
from apps.users.models.user import User


# ---------------------------------------------------------------------------
# Constantes de validación para url_images
# ---------------------------------------------------------------------------

MAX_IMAGES = 3
CLOUDINARY_URL_REGEX = re.compile(
    r"^https://res\.cloudinary\.com/.+\.(jpg|jpeg|png|webp)$",
    re.IGNORECASE,
)


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
            "price",
            "url_images",
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
            "price",
            "url_images",
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

    def validate_price(self, value):
        """El precio debe ser estrictamente mayor a cero."""
        if value is None:
            raise serializers.ValidationError(
                "El precio es obligatorio."
            )
        if value <= Decimal("0"):
            raise serializers.ValidationError(
                "El precio debe ser estrictamente mayor a cero."
            )
        return value

    def validate_url_images(self, value):
        """
        Valida que url_images sea una lista de máximo 3 URLs,
        cada una apuntando a Cloudinary con extensiones seguras.
        """
        if not isinstance(value, list):
            raise serializers.ValidationError(
                "url_images debe ser una lista de URLs."
            )

        if len(value) > MAX_IMAGES:
            raise serializers.ValidationError(
                f"Se permiten un máximo de {MAX_IMAGES} imágenes por envío."
            )

        for idx, url in enumerate(value):
            if not isinstance(url, str):
                raise serializers.ValidationError(
                    f"El elemento en la posición {idx} no es una URL válida."
                )
            if not CLOUDINARY_URL_REGEX.match(url):
                raise serializers.ValidationError(
                    f"La URL en la posición {idx} no es válida. "
                    f"Debe comenzar con 'https://res.cloudinary.com/' y "
                    f"terminar en .jpg, .jpeg, .png o .webp."
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
            "price",
            "url_images",
            "notes",
        )

    def validate_price(self, value):
        """El precio debe ser estrictamente mayor a cero."""
        if value is not None and value <= Decimal("0"):
            raise serializers.ValidationError(
                "El precio debe ser estrictamente mayor a cero."
            )
        return value

    def validate_url_images(self, value):
        """Mismas reglas que en creación."""
        if not isinstance(value, list):
            raise serializers.ValidationError(
                "url_images debe ser una lista de URLs."
            )

        if len(value) > MAX_IMAGES:
            raise serializers.ValidationError(
                f"Se permiten un máximo de {MAX_IMAGES} imágenes por envío."
            )

        for idx, url in enumerate(value):
            if not isinstance(url, str):
                raise serializers.ValidationError(
                    f"El elemento en la posición {idx} no es una URL válida."
                )
            if not CLOUDINARY_URL_REGEX.match(url):
                raise serializers.ValidationError(
                    f"La URL en la posición {idx} no es válida. "
                    f"Debe comenzar con 'https://res.cloudinary.com/' y "
                    f"terminar en .jpg, .jpeg, .png o .webp."
                )

        return value


# ---------------------------------------------------------------------------
# Transporter dashboard serializer (envíos asignados al transportista)
# ---------------------------------------------------------------------------


class TransporterShipmentDetailSerializer(serializers.ModelSerializer):
    """
    Serializer para la vista del transportista — muestra el envío completo
    con datos del cliente anidados.
    """

    client = ClientNestedSerializer(read_only=True)
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
            "price",
            "url_images",
            "status",
            "notes",
            "is_active",
            "scheduled_delivery_at",
            "created_at",
            "updated_at",
            "tracking_entries",
        )
        read_only_fields = fields


class TransporterShipmentListSerializer(serializers.ModelSerializer):
    """
    Serializer para listar las selecciones del transportista con
    el detalle completo del envío anidado.
    """

    shipment = TransporterShipmentDetailSerializer(read_only=True)

    class Meta:
        model = ShipmentSelection
        fields = (
            "id",
            "shipment",
            "status",
            "responded_at",
            "rejection_reason",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Serializers para acciones de ciclo de vida
# ---------------------------------------------------------------------------


class RejectSerializer(serializers.Serializer):
    """Payload para rechazar una selección (Transportista)."""

    rejection_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        help_text="Motivo del rechazo (opcional).",
    )


class CancelSerializer(serializers.Serializer):
    """Payload para cancelar un envío (Cliente)."""

    cancellation_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        help_text="Motivo de la cancelación (opcional).",
    )


class StartTransitSerializer(serializers.Serializer):
    """Payload para iniciar el tránsito — acepta coordenadas GPS opcionales."""

    location = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        help_text="Descripción textual de la ubicación de inicio.",
    )
    latitude = serializers.DecimalField(
        max_digits=10,
        decimal_places=7,
        required=False,
        allow_null=True,
        default=None,
        help_text="Latitud GPS del punto de inicio.",
    )
    longitude = serializers.DecimalField(
        max_digits=10,
        decimal_places=7,
        required=False,
        allow_null=True,
        default=None,
        help_text="Longitud GPS del punto de inicio.",
    )


class ConfirmDeliverySerializer(serializers.Serializer):
    """Payload para confirmar la entrega — acepta coordenadas GPS y notas."""

    location = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        help_text="Descripción textual de la ubicación de entrega.",
    )
    latitude = serializers.DecimalField(
        max_digits=10,
        decimal_places=7,
        required=False,
        allow_null=True,
        default=None,
        help_text="Latitud GPS del punto de entrega.",
    )
    longitude = serializers.DecimalField(
        max_digits=10,
        decimal_places=7,
        required=False,
        allow_null=True,
        default=None,
        help_text="Longitud GPS del punto de entrega.",
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        help_text="Notas adicionales sobre la entrega.",
    )
