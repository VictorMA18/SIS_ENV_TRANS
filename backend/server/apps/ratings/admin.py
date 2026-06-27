from django.contrib import admin
from apps.ratings.models.rating import Rating

# Register your models here.

@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
  list_display = ("id", "shipment", "client", "transporter", "reviewer_role", "score", "comment", "is_active", "created_at")
  list_filter = ("is_active", "reviewer_role")
  search_fields = ("id", "shipment__id", "reviewer_role", "score")
