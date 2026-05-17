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