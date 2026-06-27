"""
Serializers para el módulo de ratings (calificaciones bidireccionales).

Soporta dos flujos:
  1. Cliente → Transportista  (reviewer_role='CLIENT')
  2. Transportista → Cliente  (reviewer_role='TRANSPORTER')
"""

from rest_framework import serializers

from apps.ratings.models.rating import Rating


class RatingCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear una calificación nueva.

    El campo 'reviewer_role' se infiere automáticamente del usuario
    autenticado en la vista, NO se envía desde el frontend.
    """

    shipment_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Rating
        fields = ["shipment_id", "score", "comment"]

    def validate_score(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("La calificación debe ser entre 1 y 5.")
        return value


class RatingDetailSerializer(serializers.ModelSerializer):
    """Serializer para mostrar una calificación (respuesta)."""

    client_name = serializers.SerializerMethodField()
    transporter_name = serializers.SerializerMethodField()

    class Meta:
        model = Rating
        fields = [
            "id",
            "shipment_id",
            "reviewer_role",
            "score",
            "comment",
            "client_name",
            "transporter_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_client_name(self, obj):
        try:
            return obj.client.user.full_name
        except Exception:
            return None

    def get_transporter_name(self, obj):
        try:
            return obj.transporter.user.full_name
        except Exception:
            return None
