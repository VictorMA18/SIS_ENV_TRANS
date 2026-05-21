from django.contrib import admin
from apps.events.models.system_event import SystemEvent

# Register your models here.

@admin.register(SystemEvent)
class SistemEventAdmin(admin.ModelAdmin):
  list_display = ("id", "event_type", "shipment", "client", "transporter", "payload", "is_active", "created_at")
  list_filter = ("is_active",)
  search_fields = ("id", "event_type", "shipment", "client", "transporter")