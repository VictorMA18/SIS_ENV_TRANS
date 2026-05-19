from .base import *

import dj_database_url
from decouple import config

DATABASE_URL = (
    f"postgresql://"
    f"{config('DB_USER')}:"
    f"{config('DB_PASSWORD')}@"
    f"{config('DB_HOST')}:"
    f"{config('DB_PORT')}/"
    f"{config('DB_NAME')}"
)


DATABASES = {
    "default": dj_database_url.parse(DATABASE_URL)
}


CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]