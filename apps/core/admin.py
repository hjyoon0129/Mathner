from datetime import timedelta

from django.contrib import admin, messages
from django.db.models import F, Count, Q
from django.utils import timezone

from .models import (
    UserGameProfile,
    DEFAULT_DAILY_KEYS,
    VisitorLog,
    PageViewLog,
    GameEventLog,
)

from .traffic_utils import (
    rate,
    get_country_name,
    traffic_type,
    traffic_label,
    build_type_rows,
    build_country_rows,
    build_page_type_rows,
    build_bot_suspicious_q,
)


@admin.action(description="어제 이전 Bot/Suspicious PageView 전체 삭제")
def delete_old_bot_suspicious_pageviews(modeladmin, request, queryset):
    today = timezone.localdate()

    target_qs = (
        PageViewLog.objects
        .filter(visit_date__lt=today)
        .filter(build_bot_suspicious_q())
    )

    count = target_qs.count()
    target_qs.delete()

    messages.success(
        request,
        f"어제 이전 Bot/Suspicious PageViewLog {count}개를 삭제했습니다."
    )


@admin.action(description="선택한 PageViewLog 삭제")
def delete_selected_pageviews(modeladmin, request, queryset):
    count = queryset.count()
    queryset.delete()
    messages.success(request, f"선택한 PageViewLog {count}개를 삭제했습니다.")


@admin.action(description="어제 이전 Bot/Suspicious VisitorLog 전체 삭제")
def delete_old_bot_suspicious_visitors(modeladmin, request, queryset):
    today = timezone.localdate()

    target_qs = (
        VisitorLog.objects
        .filter(visit_date__lt=today)
        .filter(build_bot_suspicious_q())
    )

    count = target_qs.count()
    target_qs.delete()

    messages.success(
        request,
        f"어제 이전 Bot/Suspicious VisitorLog {count}개를 삭제했습니다."
    )


@admin.action(description="선택한 VisitorLog 삭제")
def delete_selected_visitors(modeladmin, request, queryset):
    count = queryset.count()
    queryset.delete()
    messages.success(request, f"선택한 VisitorLog {count}개를 삭제했습니다.")


@admin.register(VisitorLog)
class VisitorLogAdmin(admin.ModelAdmin):
    list_display = (
        "visit_date",
        "ip_address",
        "country_display",
        "traffic_type_display",
        "created_at",
    )
    list_filter = ("visit_date",)
    search_fields = ("ip_address", "user_agent")
    ordering = ("-visit_date", "-created_at")
    change_list_template = "admin/core/visitorlog/change_list.html"
    actions = (
        delete_old_bot_suspicious_visitors,
        delete_selected_visitors,
    )

    def country_display(self, obj):
        return get_country_name(obj.ip_address)

    country_display.short_description = "Country"

    def traffic_type_display(self, obj):
        return traffic_label(traffic_type(obj.path or "", obj.user_agent))

    traffic_type_display.short_description = "Type"

    def changelist_view(self, request, extra_context=None):
        today = timezone.localdate()
        week_start = today - timedelta(days=6)

        queryset = VisitorLog.objects.all()

        daily_count = queryset.filter(visit_date=today).count()
        weekly_count = queryset.filter(
            visit_date__gte=week_start,
            visit_date__lte=today,
        ).count()
        monthly_count = queryset.filter(
            visit_date__year=today.year,
            visit_date__month=today.month,
        ).count()
        total_count = queryset.count()

        daily_rows = (
            queryset
            .values("visit_date")
            .annotate(count=Count("id"))
            .order_by("-visit_date")[:90]
        )

        today_logs = list(
            queryset
            .filter(visit_date=today)
            .order_by("-created_at")[:500]
        )

        type_rows = build_type_rows(today_logs, path_field=True)
        country_rows = build_country_rows(today_logs)

        maybe_human_count = next(
            (row["count"] for row in type_rows if row["type"] == "Maybe Human"),
            0,
        )
        bot_count = next(
            (row["count"] for row in type_rows if row["type"] == "Bot"),
            0,
        )
        suspicious_count = next(
            (row["count"] for row in type_rows if row["type"] == "Suspicious"),
            0,
        )

        extra_context = extra_context or {}
        extra_context.update({
            "daily_count": daily_count,
            "weekly_count": weekly_count,
            "monthly_count": monthly_count,
            "total_count": total_count,
            "daily_rows": daily_rows,
            "country_rows": country_rows,
            "type_rows": type_rows,
            "maybe_human_count": maybe_human_count,
            "bot_count": bot_count,
            "suspicious_count": suspicious_count,
        })

        return super().changelist_view(request, extra_context=extra_context)


@admin.register(PageViewLog)
class PageViewLogAdmin(admin.ModelAdmin):
    list_display = (
        "path",
        "ip_address",
        "country_display",
        "traffic_type_display",
        "visit_date",
        "created_at",
    )
    list_filter = ("visit_date", "path")
    search_fields = ("path", "ip_address", "user_agent")
    ordering = ("-created_at",)
    change_list_template = "admin/core/pageviewlog/change_list.html"
    actions = (
        delete_old_bot_suspicious_pageviews,
        delete_selected_pageviews,
    )

    def country_display(self, obj):
        return get_country_name(obj.ip_address)

    country_display.short_description = "Country"

    def traffic_type_display(self, obj):
        return traffic_label(traffic_type(obj.path, obj.user_agent))

    traffic_type_display.short_description = "Type"

    def changelist_view(self, request, extra_context=None):
        today = timezone.localdate()
        week_start = today - timedelta(days=6)

        queryset = PageViewLog.objects.all()
        human_queryset = queryset.exclude(build_bot_suspicious_q())

        page_rows = (
            queryset
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

        daily_total = queryset.filter(visit_date=today).count()
        weekly_total = queryset.filter(
            visit_date__gte=week_start,
            visit_date__lte=today,
        ).count()
        monthly_total = queryset.filter(
            visit_date__year=today.year,
            visit_date__month=today.month,
        ).count()
        total_count = queryset.count()

        human_daily_total = human_queryset.filter(visit_date=today).count()
        human_weekly_total = human_queryset.filter(
            visit_date__gte=week_start,
            visit_date__lte=today,
        ).count()

        today_logs = list(
            queryset
            .filter(visit_date=today)
            .order_by("-created_at")[:500]
        )

        type_rows = build_type_rows(today_logs, path_field=True)
        country_rows = build_country_rows(today_logs)
        page_type_rows = build_page_type_rows(today_logs)

        maybe_human_today = next(
            (row["count"] for row in type_rows if row["type"] == "Maybe Human"),
            0,
        )
        bot_today = next(
            (row["count"] for row in type_rows if row["type"] == "Bot"),
            0,
        )
        suspicious_today = next(
            (row["count"] for row in type_rows if row["type"] == "Suspicious"),
            0,
        )

        extra_context = extra_context or {}
        extra_context.update({
            "daily_total": daily_total,
            "weekly_total": weekly_total,
            "monthly_total": monthly_total,
            "total_count": total_count,
            "human_daily_total": human_daily_total,
            "human_weekly_total": human_weekly_total,
            "page_rows": page_rows,
            "country_rows": country_rows,
            "type_rows": type_rows,
            "page_type_rows": page_type_rows,
            "maybe_human_today": maybe_human_today,
            "bot_today": bot_today,
            "suspicious_today": suspicious_today,
        })

        return super().changelist_view(request, extra_context=extra_context)


@admin.register(GameEventLog)
class GameEventLogAdmin(admin.ModelAdmin):
    list_display = (
        "event_date",
        "event_type",
        "game_name",
        "user",
        "ip_address",
        "score",
        "correct",
        "gained_stars",
        "reason",
        "created_at",
    )
    list_filter = ("event_date", "event_type", "game_name")
    search_fields = (
        "user__username",
        "user__email",
        "ip_address",
        "session_key",
        "reason",
        "game_name",
        "event_type",
    )
    ordering = ("-created_at",)
    readonly_fields = (
        "user",
        "event_type",
        "game_name",
        "ip_address",
        "user_agent",
        "path",
        "session_key",
        "score",
        "correct",
        "gained_stars",
        "reason",
        "meta",
        "event_date",
        "created_at",
    )
    change_list_template = "admin/core/gameeventlog/change_list.html"

    def has_add_permission(self, request):
        return False

    def changelist_view(self, request, extra_context=None):
        today = timezone.localdate()
        week_start = today - timedelta(days=6)

        today_events = GameEventLog.objects.filter(event_date=today)
        weekly_events = GameEventLog.objects.filter(
            event_date__gte=week_start,
            event_date__lte=today,
        )

        today_page_views = (
            PageViewLog.objects
            .filter(visit_date=today)
            .exclude(build_bot_suspicious_q())
            .count()
        )

        today_game_start = today_events.filter(
            event_type=GameEventLog.EVENT_GAME_START
        ).count()
        today_game_finish = today_events.filter(
            event_type=GameEventLog.EVENT_GAME_FINISH
        ).count()
        today_login_click = today_events.filter(
            event_type=GameEventLog.EVENT_LOGIN_CLICK
        ).count()

        weekly_game_start = weekly_events.filter(
            event_type=GameEventLog.EVENT_GAME_START
        ).count()
        weekly_game_finish = weekly_events.filter(
            event_type=GameEventLog.EVENT_GAME_FINISH
        ).count()
        weekly_login_click = weekly_events.filter(
            event_type=GameEventLog.EVENT_LOGIN_CLICK
        ).count()

        start_rate = rate(today_game_start, today_page_views)
        finish_rate = rate(today_game_finish, today_game_start)
        login_rate = rate(today_login_click, today_game_finish)

        raw_game_rows = (
            today_events
            .values("game_name")
            .annotate(
                start_count=Count(
                    "id",
                    filter=Q(event_type=GameEventLog.EVENT_GAME_START),
                ),
                finish_count=Count(
                    "id",
                    filter=Q(event_type=GameEventLog.EVENT_GAME_FINISH),
                ),
                login_count=Count(
                    "id",
                    filter=Q(event_type=GameEventLog.EVENT_LOGIN_CLICK),
                ),
            )
            .order_by("game_name")
        )

        game_rows = []
        for row in raw_game_rows:
            start_count = row["start_count"] or 0
            finish_count = row["finish_count"] or 0
            login_count = row["login_count"] or 0

            game_rows.append({
                "game_name": row["game_name"] or "unknown",
                "start_count": start_count,
                "finish_count": finish_count,
                "login_count": login_count,
                "finish_rate": rate(finish_count, start_count),
            })

        event_rows = (
            today_events
            .values("event_type")
            .annotate(count=Count("id"))
            .order_by("-count", "event_type")
        )

        extra_context = extra_context or {}
        extra_context.update({
            "today_page_views": today_page_views,
            "today_game_start": today_game_start,
            "today_game_finish": today_game_finish,
            "today_login_click": today_login_click,
            "weekly_game_start": weekly_game_start,
            "weekly_game_finish": weekly_game_finish,
            "weekly_login_click": weekly_login_click,
            "start_rate": start_rate,
            "finish_rate": finish_rate,
            "login_rate": login_rate,
            "game_rows": game_rows,
            "event_rows": event_rows,
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