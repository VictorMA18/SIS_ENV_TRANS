from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.users.models import User
from common.enums.user import UserRole


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "full_name",
            "avatar_url",
            "phone",
            "role",
            "is_active",
            "is_verified",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class GoogleLoginSerializer(serializers.Serializer):
    id_token = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=UserRole.choices)


def validate_password_value(value: str) -> None:
    try:
        validate_password(value)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(exc.messages) from exc
