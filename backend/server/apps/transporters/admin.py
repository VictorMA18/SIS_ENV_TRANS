from django.contrib import admin
from apps.transporters.models.transporter import Transporter

@admin.register(Transporter)
class TransporterAdmin(admin.ModelAdmin):
    list_display = ('user', 'license_number', 'is_available', 'is_active', 'average_rating', 'completed_shipments')
    list_filter = ('is_available', 'is_active')
    search_fields = ('user__email', 'license_number', "ruc")