"""
Middleware de autenticación JWT para WebSocket (Django Channels).

Extrae el token del query string (?token=xxx) y lo valida usando
SimpleJWT. Si el token es válido, asigna el usuario autenticado al scope.
"""

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken

from apps.users.models.user import User


@database_sync_to_async
def get_user_from_token(token_str):
    """Decodifica el JWT y retorna el User o AnonymousUser."""
    try:
        access_token = AccessToken(token_str)
        user_id = access_token["user_id"]
        return User.objects.get(pk=user_id)
    except Exception:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Middleware ASGI que autentica conexiones WebSocket vía JWT.

    Uso desde el cliente:
        ws://host/ws/shipments/available-transporters/?token=<JWT_ACCESS_TOKEN>
    """

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode("utf-8")
        params = parse_qs(query_string)
        token_list = params.get("token", [])

        if token_list:
            scope["user"] = await get_user_from_token(token_list[0])
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)
