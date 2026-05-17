from django.contrib import admin
from apps.users.models.user import User
from apps.users.models.social_account import UserSocialAccount

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    # Columnas que se verán en la lista del panel
    list_display = ('email', 'full_name', 'role', 'is_active', 'is_verified', 'created_at')
    # Filtros laterales para buscar rápido
    list_filter = ('role', 'is_active', 'is_verified')
    # Barra de búsqueda por texto
    search_fields = ('email', 'full_name')
    # Orden por defecto
    ordering = ('-created_at',)

@admin.register(UserSocialAccount)
class UserSocialAccountAdmin(admin.ModelAdmin):
    list_display = ('user', 'provider', 'provider_uid', 'created_at')
    list_filter = ('provider',)
    search_fields = ('user__email', 'provider_uid')