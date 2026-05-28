from django.contrib import admin
from apps.shipments.models.shipment import Shipment
from apps.shipments.models.shipment_selection import ShipmentSelection
from apps.shipments.models.shipment_tracking import ShipmentTracking

# Register your models here.

@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
  list_display = ("id", "client", "origin_address", "destination_address", "description", "weight_kg", "volume_m3", "price", "status", "notes", "is_active", "created_at", "updated_at")
  list_filter = ("is_active", "status")
  search_fields = ("id", "client", "origin_address", "destination_address", "description", "weight_kg", "volume_m3", "price")

@admin.register(ShipmentTracking)
class ShipmentTrackingAdmin(admin.ModelAdmin):
  list_display = ("id", "shipment", "status", "location", "latitude", "longitude", "notes", "created_at")
  list_filter = ("created_at",)
  search_fields = ("id", "shipment", "status", "location", "latitude", "longitude")

@admin.register(ShipmentSelection)
class ShipmentSelectionAdmin(admin.ModelAdmin):
  list_display = ("id", "shipment", "transporter", "status", "responded_at", "rejection_reason", "created_at", "updated_at")
  list_filter = ("created_at", "status")
  search_fields = ("id", "shipment", "transporter", "status", "responded_at", "rejection_reason")  
