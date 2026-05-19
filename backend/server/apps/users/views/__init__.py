from django.conf import settings
from django.contrib.auth import authenticate
from django.db import IntegrityError, transaction
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clients.models import Client
from apps.clients.serializers import ClientRegisterSerializer
from apps.transporters.models import Transporter
from apps.transporters.serializers import TransporterRegisterSerializer
from apps.users.models import User, UserSocialAccount
from apps.users.serializers import GoogleLoginSerializer, LoginSerializer
from apps.users.services import build_auth_response
from common.enums.user import SocialProvider, UserRole


class ClientRegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        serializer = ClientRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        client = serializer.save()
        assert isinstance(client, Client)
        return Response(build_auth_response(client.user), status=status.HTTP_201_CREATED)


class TransporterRegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        serializer = TransporterRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        transporter = serializer.save()
        assert isinstance(transporter, Transporter)
        return Response(build_auth_response(transporter.user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = str(serializer.validated_data.get("email", "")).lower()  # type: ignore
        password = serializer.validated_data.get("password")# type: ignore

        user = authenticate(request, email=email, password=password)
        if not user:
            return Response(
                {"detail": "Credenciales invalidas."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not user.is_active:
            return Response(
                {"detail": "Usuario inactivo."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(build_auth_response(user), status=status.HTTP_200_OK)


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        serializer = GoogleLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not settings.GOOGLE_OAUTH_CLIENT_ID:
            return Response(
                {"detail": "Google OAuth no esta configurado."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        token_value = serializer.validated_data.get("id_token") # type: ignore
        requested_role = serializer.validated_data.get("role") # type: ignore

        try:
            payload = google_id_token.verify_oauth2_token(
                token_value,
                google_requests.Request(),
                settings.GOOGLE_OAUTH_CLIENT_ID,
            )
        except ValueError:
            return Response(
                {"detail": "Token de Google invalido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = payload.get("email")
        email_verified = payload.get("email_verified")
        provider_uid = payload.get("sub")
        avatar_url = payload.get("picture")

        if not email:
            return Response(
                {"detail": "No se pudo obtener el email de Google."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        email = email.lower()
        full_name = payload.get("name") or email
        if email_verified is False:
            return Response(
                {"detail": "El email de Google no esta verificado."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not provider_uid:
            return Response(
                {"detail": "No se pudo obtener el ID del proveedor."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email__iexact=email).first()
        if user:
            if user.role != requested_role:
                return Response(
                    {"detail": "El rol solicitado no coincide con el usuario."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not user.is_active:
                return Response(
                    {"detail": "Usuario inactivo."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            update_fields = []
            if not user.is_verified:
                user.is_verified = True
                update_fields.append("is_verified")
            if avatar_url and not user.avatar_url:
                user.avatar_url = avatar_url
                update_fields.append("avatar_url")
            if update_fields:
                user.save(update_fields=update_fields)

            if user.role == UserRole.CLIENT:
                Client.objects.get_or_create(user=user)
            elif user.role == UserRole.TRANSPORTER:
                Transporter.objects.get_or_create(user=user)
        else:
            try:
                with transaction.atomic():
                    user = User.objects.create_oauth_user(
                        email=email,
                        full_name=full_name,
                        role=requested_role,
                        avatar_url=avatar_url,
                    )
                    if requested_role == UserRole.CLIENT:
                        Client.objects.create(user=user)
                    elif requested_role == UserRole.TRANSPORTER:
                        Transporter.objects.create(user=user)
            except IntegrityError:
                return Response(
                    {"detail": "No se pudo crear el usuario con Google."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        existing_account = UserSocialAccount.objects.filter(
            provider=SocialProvider.GOOGLE,
            provider_uid=provider_uid,
        ).first()
        if existing_account and getattr(existing_account, "user_id") != user.id:
            return Response(
                {"detail": "La cuenta de Google ya esta vinculada a otro usuario."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        UserSocialAccount.objects.update_or_create(
            user=user,
            provider=SocialProvider.GOOGLE,
            defaults={"provider_uid": provider_uid},
        )

        return Response(build_auth_response(user), status=status.HTTP_200_OK)
