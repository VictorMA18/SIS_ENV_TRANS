from .base import *

import dj_database_url
from decouple import config


DEBUG = False


DATABASES = {
    "default": dj_database_url.parse(
        str(config("DATABASE_URL"))
    )
}


SECURE_SSL_REDIRECT = True

SESSION_COOKIE_SECURE = True

CSRF_COOKIE_SECURE = True