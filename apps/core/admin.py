from django.contrib import admin, messages
from django.db.models import F
from django.utils import timezone

from .models import UserGameProfile, DEFAULT_DAILY_KEYS


@admin.action(description="선택한 유저 별 0으로 리셋")
def reset_stars(modeladmin, request, queryset):
    updated = queryset.update(total_stars=0)
    messages.success(request, f"{updated}명의 별을 0으로 리셋했습니다.")


@admin.action(description="선택한 유저 별 +10")
def add_10_stars(modeladmin, request, queryset):
    updated = queryset.update(total_stars=F("total_stars") + 10)
    messages.success(request, f"{updated}명에게 별 10개를 추가했습니다.")


@admin.action(description="선택한 유저 별 -10")
def subtract_10_stars(modeladmin, request, queryset):
    updated = 0
    for profile in queryset:
        profile.total_stars = max(0, int(profile.total_stars or 0) - 10)
        profile.save(update_fields=["total_stars", "updated_at"])
        updated += 1
    messages.success(request, f"{updated}명의 별 10개를 차감했습니다.")


@admin.action(description="선택한 유저 키 3개로 리셋")
def reset_keys_to_default(modeladmin, request, queryset):
    today = timezone.localdate()
    updated = queryset.update(
        remaining_keys=DEFAULT_DAILY_KEYS,
        keys_updated_at=today,
    )
    messages.success(request, f"{updated}명의 키를 3개로 리셋했습니다.")


@admin.action(description="선택한 유저 키 +1")
def add_1_key(modeladmin, request, queryset):
    updated = queryset.update(remaining_keys=F("remaining_keys") + 1)
    messages.success(request, f"{updated}명에게 키 1개를 추가했습니다.")


@admin.action(description="선택한 유저 키 -1")
def subtract_1_key(modeladmin, request, queryset):
    updated = 0
    for profile in queryset:
        profile.remaining_keys = max(0, int(profile.remaining_keys or 0) - 1)
        profile.save(update_fields=["remaining_keys", "updated_at"])
        updated += 1
    messages.success(request, f"{updated}명의 키 1개를 차감했습니다.")


@admin.action(description="선택한 유저 닉네임 변경 제한 초기화")
def reset_nickname_cooldown(modeladmin, request, queryset):
    updated = queryset.update(nickname_changed_at=None)
    messages.success(request, f"{updated}명의 닉네임 변경 제한을 초기화했습니다.")


@admin.register(UserGameProfile)
class UserGameProfileAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "nickname",
        "total_stars",
        "remaining_keys",
        "best_score",
        "total_correct",
        "nickname_changed_at",
        "keys_updated_at",
        "created_at",
    )
    list_editable = (
        "nickname",
        "total_stars",
        "remaining_keys",
        "best_score",
        "total_correct",
    )
    search_fields = ("user__username", "user__email", "nickname")
    list_filter = ("nickname_changed_at", "keys_updated_at", "created_at")
    ordering = ("id",)
    readonly_fields = ("created_at", "updated_at")
    fields = (
        "user",
        "nickname",
        "nickname_changed_at",
        "total_stars",
        "remaining_keys",
        "best_score",
        "total_correct",
        "keys_updated_at",
        "created_at",
        "updated_at",
    )
    actions = (
        reset_stars,
        add_10_stars,
        subtract_10_stars,
        reset_keys_to_default,
        add_1_key,
        subtract_1_key,
        reset_nickname_cooldown,
    )