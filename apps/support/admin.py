from django.contrib import admin
from .models import Inquiry


@admin.register(Inquiry)
class InquiryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "author_display",
        "email_snapshot",
        "status",
        "is_private",
        "created_at",
    )
    list_filter = ("status", "is_private", "created_at")
    search_fields = ("title", "content", "author_display", "email_snapshot")
    readonly_fields = (
        "author",
        "author_display",
        "email_snapshot",
        "created_at",
        "updated_at",
    )
    ordering = ("-created_at",)
    fieldsets = (
        ("Inquiry", {
            "fields": (
                "author",
                "author_display",
                "email_snapshot",
                "title",
                "content",
                "is_private",
                "status",
                "admin_memo",
            )
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at")
        }),
    )