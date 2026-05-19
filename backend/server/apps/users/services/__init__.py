from rest_framework_simplejwt.tokens import RefreshToken

from apps.clients.serializers import ClientProfileSerializer
from apps.transporters.serializers import TransporterProfileSerializer
from apps.users.serializers import UserSerializer
from common.enums.user import UserRole


def build_auth_response(user):
    tokens = RefreshToken.for_user(user)
    profile_data = None

    if user.role == UserRole.CLIENT:
        profile = getattr(user, "client_profile", None)
        if profile:
            profile_data = ClientProfileSerializer(profile).data
    elif user.role == UserRole.TRANSPORTER:
        profile = getattr(user, "transporter_profile", None)
        if profile:
            profile_data = TransporterProfileSerializer(profile).data

    return {
        "tokens": {
            "refresh": str(tokens),
            "access": str(tokens.access_token), # type: ignore
        },
        "user": UserSerializer(user).data,
        "profile": profile_data,
    }
