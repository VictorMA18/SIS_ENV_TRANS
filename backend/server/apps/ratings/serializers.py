"""
Serializers para el módulo de ratings.
"""

from rest_framework import serializers

from apps.ratings.models.rating import Rating


class RatingCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear una calificación nueva."""

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

    class Meta:
        model = Rating
        fields = [
            "id",
            "shipment_id",
            "score",
            "comment",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
