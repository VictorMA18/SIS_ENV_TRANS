from django.contrib import admin
from apps.clients.models.client import Client

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("user", 'address', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('user__email', 'address', "dni") # Busca usando el email del usuario vinculado