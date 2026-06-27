from django.contrib import admin
from apps.notifications.models.notification import Notification

# Register your models here.

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
  list_display = ("id", "event", "recipient_type", "recipient_id", 
                  "channel", "title", "status", "is_read", "is_active", "created_at")
  list_filter = ("is_active", "is_read", "recipient_type", "status")
  search_fields = ("id", "recipient_type", "channel", "title", "message")