import re
from typing import Optional

from django.db import IntegrityError, transaction
from rest_framework import serializers

from apps.transporters.models import Transporter
from apps.users.models import User
from apps.users.serializers import UserSerializer, validate_password_value
from common.enums.user import UserRole

RUC_REGEX = re.compile(r"^(10|20)\d{9}$")
PHONE_REGEX = re.compile(r"^\d{9}$")
LICENSE_REGEX = re.compile(r"^[A-Za-z]\d{9}$")


class TransporterProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = Transporter
        fields = (
            "user",
            "license_number",
            "ruc",
            "vehicle_description",
            "is_available",
            "is_active",
            "completed_shipments",
            "average_rating",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class TransporterSerializer(serializers.ModelSerializer):
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
        model = Transporter
        fields = (
            "id",
            "email",
            "full_name",
            "phone",
            "avatar_url",
            "license_number",
            "ruc",
            "vehicle_description",
            "is_available",
            "is_active",
            "completed_shipments",
            "average_rating",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "email",
            "is_active",
            "completed_shipments",
            "average_rating",
            "created_at",
            "updated_at",
        )

    def validate_phone(self, value: Optional[str]) -> Optional[str]:
        if value in (None, ""):
            return value
        if not PHONE_REGEX.match(value):
            raise serializers.ValidationError("El telefono debe tener 9 digitos.")
        return value

    def validate_license_number(self, value: Optional[str]) -> Optional[str]:
        if value in (None, ""):
            return value
        value = value.strip().upper()
        if not LICENSE_REGEX.match(value):
            raise serializers.ValidationError(
                "El brevete debe tener 1 letra seguida de 9 digitos."
            )
        return value

    def validate_ruc(self, value: Optional[str]) -> Optional[str]:
        if value in (None, ""):
            return value
        value = value.strip()
        if not RUC_REGEX.match(value):
            raise serializers.ValidationError(
                "El RUC debe tener 11 digitos y empezar con 10 o 20."
            )
        return value

    def validate(self, attrs):
        instance = self.instance
        is_available = attrs.get(
            "is_available",
            instance.is_available if instance else False,
        )
        license_number = attrs.get(
            "license_number",
            instance.license_number if instance else None,
        )
        if is_available and not license_number:
            raise serializers.ValidationError(
                {"is_available": "Se requiere license_number para estar disponible."}
            )
        return attrs

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        if user_data:
            for field, value in user_data.items():
                setattr(instance.user, field, value)
            instance.user.save(update_fields=list(user_data.keys()))
        return super().update(instance, validated_data)


class TransporterRegisterSerializer(serializers.Serializer):
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
    license_number = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=50,
    )
    ruc = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=15,
    )
    vehicle_description = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    is_available = serializers.BooleanField(required=False, default=False)

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

    def validate_license_number(self, value: Optional[str]) -> Optional[str]:
        if value in (None, ""):
            return value
        value = value.strip().upper()
        if not LICENSE_REGEX.match(value):
            raise serializers.ValidationError(
                "El brevete debe tener 1 letra seguida de 9 digitos."
            )
        return value

    def validate_ruc(self, value: Optional[str]) -> Optional[str]:
        if value in (None, ""):
            return value
        value = value.strip()
        if not RUC_REGEX.match(value):
            raise serializers.ValidationError(
                "El RUC debe tener 11 digitos y empezar con 10 o 20."
            )
        return value

    def validate(self, attrs):
        password = attrs.get("password")
        confirm_password = attrs.get("confirm_password")
        if password != confirm_password:
            raise serializers.ValidationError({
                "confirm_password": "Las contrasenas no coinciden."
            })
        validate_password_value(password)

        is_available = attrs.get("is_available", False)
        license_number = attrs.get("license_number")
        if is_available and not license_number:
            raise serializers.ValidationError(
                {"is_available": "Se requiere license_number para estar disponible."}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password", None)
        password = validated_data.pop("password")

        phone = validated_data.pop("phone", None) or None
        avatar_url = validated_data.pop("avatar_url", None) or None
        license_number = validated_data.pop("license_number", None) or None
        ruc = validated_data.pop("ruc", None) or None
        vehicle_description = validated_data.pop("vehicle_description", None) or None
        is_available = validated_data.pop("is_available", False)

        try:
            with transaction.atomic():
                user = User.objects.create_user( 
                    email=validated_data["email"],
                    full_name=validated_data["full_name"],
                    role=UserRole.TRANSPORTER,
                    password=password,
                    phone=phone,
                    avatar_url=avatar_url,
                )
                transporter = Transporter.objects.create(
                    user=user,
                    license_number=license_number,
                    ruc=ruc,
                    vehicle_description=vehicle_description,
                    is_available=is_available,
                )
                return transporter
        except IntegrityError as exc:
            raise serializers.ValidationError(
                "No se pudo crear el transportista. Verifica email, RUC o brevete."
            ) from exc
