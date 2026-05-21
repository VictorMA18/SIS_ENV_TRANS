from django.contrib import admin
from apps.ratings.models.rating import Rating

# Register your models here.

@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
  list_display = ("id", "shipment", "client", "transporter", "score", "comment", "is_active", "created_at", "updated_at")
  list_filter = ("is_active",)
  search_fields = ( "id", "shipment", "client", "transporter", "score")
    

