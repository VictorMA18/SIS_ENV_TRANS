import re
from typing import Optional

from django.db import IntegrityError, transaction
from rest_framework import serializers

from apps.clients.models import Client
from apps.users.models import User
from apps.users.serializers import UserSerializer, validate_password_value
from common.enums.user import UserRole

DNI_REGEX = re.compile(r"^\d{8}$")
PHONE_REGEX = re.compile(r"^\d{9}$")


class ClientProfileSerializer(serializers.ModelSerializer):
    
    user = UserSerializer(read_only=True)
    class Meta:
        model = Client
        fields = (
            "user",
            "dni",
            "address",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class ClientSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    full_name = serializers.CharField(source="user.full_name", max_length=150)
    phone = serializers.CharField(
        source="user.phone",
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=20,
    )
    avatar_url = serializers.URLField(
        source="user.avatar_url",
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    class Meta:
        model = Client
        fields = (
            "id",
            "email",
            "full_name",
            "phone",
            "avatar_url",
            "dni",
            "address",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "email",
            "is_active",
            "created_at",
            "updated_at",
        )

    def validate_phone(self, value: Optional[str]) -> Optional[str]:
        if value in (None, ""):
            return value
        if not PHONE_REGEX.match(value):
            raise serializers.ValidationError("El telefono debe tener 9 digitos.")
        return value

    def validate_dni(self, value: Optional[str]) -> Optional[str]:
        if value in (None, ""):
            return value
        value = value.strip()
        if not DNI_REGEX.match(value):
            raise serializers.ValidationError("El DNI debe tener 8 digitos numericos.")
        return value

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        if user_data:
            for field, value in user_data.items():
                setattr(instance.user, field, value)
            instance.user.save(update_fields=list(user_data.keys()))
        return super().update(instance, validated_data)


class ClientRegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    phone = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=20,
    )
    avatar_url = serializers.URLField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    dni = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=15,
    )
    address = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("El email ya esta registrado.")
        return value

    def validate_phone(self, value: Optional[str]) -> Optional[str]:
        if value in (None, ""):
            return value
        if not PHONE_REGEX.match(value):
            raise serializers.ValidationError("El telefono debe tener 9 digitos.")
        return value

    def validate_dni(self, value: Optional[str]) -> Optional[str]:
        if value in (None, ""):
            return value
        value = value.strip()
        if not DNI_REGEX.match(value):
            raise serializers.ValidationError("El DNI debe tener 8 digitos numericos.")
        return value

    def validate(self, attrs):
        password = attrs.get("password")
        confirm_password = attrs.get("confirm_password")
        if password != confirm_password:
            raise serializers.ValidationError({
                "confirm_password": "Las contrasenas no coinciden."
            })
        validate_password_value(password)
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password", None)
        password = validated_data.pop("password")

        phone = validated_data.pop("phone", None) or None
        avatar_url = validated_data.pop("avatar_url", None) or None
        dni = validated_data.pop("dni", None) or None
        address = validated_data.pop("address", None) or None

        try:
            with transaction.atomic():
                user = User.objects.create_user( # type: ignore
                    email=validated_data["email"],
                    full_name=validated_data["full_name"],
                    role=UserRole.CLIENT,
                    password=password,
                    phone=phone,
                    avatar_url=avatar_url,
                )
                client = Client.objects.create(user=user, dni=dni, address=address)
                return client
        except IntegrityError as exc:
            raise serializers.ValidationError(
                "No se pudo crear el cliente. Verifica email y DNI."
            ) from exc
