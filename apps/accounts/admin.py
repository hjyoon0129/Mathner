from django.contrib import admin, messages
from django.db.models import F

from .models import Profile


@admin.action(description="선택한 유저 별 0으로 리셋")
def reset_stars(modeladmin, request, queryset):
    updated = queryset.update(stars=0)
    messages.success(request, f"{updated}명의 별을 0으로 리셋했습니다.")


@admin.action(description="선택한 유저 별 +10")
def add_10_stars(modeladmin, request, queryset):
    updated = queryset.update(stars=F("stars") + 10)
    messages.success(request, f"{updated}명에게 별 10개를 추가했습니다.")


@admin.action(description="선택한 유저 별 -10")
def subtract_10_stars(modeladmin, request, queryset):
    updated = 0
    for profile in queryset:
        profile.stars = max(0, profile.stars - 10)
        profile.save(update_fields=["stars"])
        updated += 1
    messages.success(request, f"{updated}명의 별 10개를 차감했습니다.")


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "nickname", "stars", "created_at")
    list_editable = ("stars",)
    search_fields = ("user__username", "user__email", "nickname")
    list_filter = ("created_at",)
    ordering = ("id",)
    readonly_fields = ("created_at",)
    actions = (reset_stars, add_10_stars, subtract_10_stars)