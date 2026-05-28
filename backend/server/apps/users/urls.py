from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from apps.users.views import (
    ClientRegisterView,
    GoogleLoginView,
    LoginView,
    TransporterRegisterView,
)

urlpatterns = [
    path("auth/register/client/", ClientRegisterView.as_view(), name="auth-register-client"),
    path(
        "auth/register/transporter/",
        TransporterRegisterView.as_view(),
        name="auth-register-transporter",
    ),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/callback/google/", GoogleLoginView.as_view(), name="auth-google"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
]
