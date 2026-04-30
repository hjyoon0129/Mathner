from datetime import timedelta

from django.contrib import admin, messages
from django.db.models import F, Count, Q
from django.utils import timezone

from .models import UserGameProfile, DEFAULT_DAILY_KEYS, VisitorLog, PageViewLog


@admin.register(VisitorLog)
class VisitorLogAdmin(admin.ModelAdmin):
    list_display = ("visit_date", "ip_address", "created_at")
    list_filter = ("visit_date",)
    search_fields = ("ip_address", "user_agent")
    ordering = ("-visit_date", "-created_at")
    change_list_template = "admin/core/visitorlog/change_list.html"

    def changelist_view(self, request, extra_context=None):
        today = timezone.localdate()
        week_start = today - timedelta(days=6)

        daily_count = VisitorLog.objects.filter(visit_date=today).count()
        weekly_count = VisitorLog.objects.filter(
            visit_date__gte=week_start,
            visit_date__lte=today,
        ).count()
        monthly_count = VisitorLog.objects.filter(
            visit_date__year=today.year,
            visit_date__month=today.month,
        ).count()
        total_count = VisitorLog.objects.count()

        daily_rows = (
            VisitorLog.objects
            .values("visit_date")
            .annotate(count=Count("id"))
            .order_by("-visit_date")[:90]
        )

        extra_context = extra_context or {}
        extra_context.update({
            "daily_count": daily_count,
            "weekly_count": weekly_count,
            "monthly_count": monthly_count,
            "total_count": total_count,
            "daily_rows": daily_rows,
        })

        return super().changelist_view(request, extra_context=extra_context)


@admin.register(PageViewLog)
class PageViewLogAdmin(admin.ModelAdmin):
    list_display = ("path", "ip_address", "visit_date", "created_at")
    list_filter = ("visit_date", "path")
    search_fields = ("path", "ip_address", "user_agent")
    ordering = ("-created_at",)
    change_list_template = "admin/core/pageviewlog/change_list.html"

    def changelist_view(self, request, extra_context=None):
        today = timezone.localdate()
        week_start = today - timedelta(days=6)

        page_rows = (
            PageViewLog.objects
            .values("path")
            .annotate(
                today_count=Count("id", filter=Q(visit_date=today)),
                weekly_count=Count(
                    "id",
                    filter=Q(
                        visit_date__gte=week_start,
                        visit_date__lte=today,
                    ),
                ),
                monthly_count=Count(
                    "id",
                    filter=Q(
                        visit_date__year=today.year,
                        visit_date__month=today.month,
                    ),
                ),
                total_count=Count("id"),
            )
            .order_by("-total_count", "path")[:100]
        )

        daily_total = PageViewLog.objects.filter(visit_date=today).count()
        weekly_total = PageViewLog.objects.filter(
            visit_date__gte=week_start,
            visit_date__lte=today,
        ).count()
        monthly_total = PageViewLog.objects.filter(
            visit_date__year=today.year,
            visit_date__month=today.month,
        ).count()
        total_count = PageViewLog.objects.count()

        extra_context = extra_context or {}
        extra_context.update({
            "daily_total": daily_total,
            "weekly_total": weekly_total,
            "monthly_total": monthly_total,
            "total_count": total_count,
            "page_rows": page_rows,
        })

        return super().changelist_view(request, extra_context=extra_context)


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