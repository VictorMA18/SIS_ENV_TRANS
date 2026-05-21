from django.contrib import admin
from apps.notifications.models.notification import Notification

# Register your models here.

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
  list_display = ("id", "event", "recipient_type", "recipient_id", 
                  "channel", "title", "message", "status", "sent_at", "is_active", "created_at", "updated_at")   
  list_filter = ("is_active",)
  search_fields = ("id", "event", "recipient_type", "channel", "title", "message")