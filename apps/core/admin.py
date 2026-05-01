from datetime import timedelta
import ipaddress

from django.contrib import admin, messages
from django.db.models import F, Count, Q
from django.utils import timezone

try:
    from django.contrib.gis.geoip2 import GeoIP2
except Exception:
    GeoIP2 = None

from .models import (
    UserGameProfile,
    DEFAULT_DAILY_KEYS,
    VisitorLog,
    PageViewLog,
    GameEventLog,
)


BOT_KEYWORDS = [
    "bot",
    "crawl",
    "spider",
    "slurp",
    "bingpreview",
    "facebookexternalhit",
    "googlebot",
    "google-inspectiontool",
    "adsbot-google",
    "mediapartners-google",
    "yandex",
    "baidu",
    "duckduck",
    "semrush",
    "ahrefs",
    "mj12bot",
    "dotbot",
    "petalbot",
    "bytespider",
    "python-requests",
    "curl",
    "wget",
    "httpclient",
    "go-http-client",
]

BOT_PATH_KEYWORDS = [
    "robots.txt",
    "sitemap.xml",
    "apple-app-site-association",
    ".well-known/security.txt",
]

SUSPICIOUS_PATH_KEYWORDS = [
    ".env",
    ".git",
    "wp-admin",
    "wp-login",
    "wordpress",
    "xmlrpc.php",
    "phpmyadmin",
    "owa/auth",
    "developmentserver",
    "metadata",
    "server-status",
    "actuator",
    "config",
    "backup",
    ".php",
    "php",
]


def _rate(part, total):
    if not total:
        return 0
    return round((part / total) * 100, 1)


def is_private_or_local_ip(ip):
    try:
        parsed_ip = ipaddress.ip_address(ip)
        return (
            parsed_ip.is_private
            or parsed_ip.is_loopback
            or parsed_ip.is_reserved
            or parsed_ip.is_multicast
        )
    except Exception:
        return False


def get_country_name(ip):
    if not ip:
        return "Unknown"

    if is_private_or_local_ip(ip):
        return "Local/Private"

    if GeoIP2 is None:
        return "Unknown"

    try:
        geo = GeoIP2()
        data = geo.country(ip)
        return data.get("country_name") or "Unknown"
    except Exception:
        return "Unknown"


def is_bot_user_agent(user_agent):
    ua = (user_agent or "").lower()
    return any(keyword in ua for keyword in BOT_KEYWORDS)


def is_bot_path(path):
    path_lower = (path or "").lower()
    return any(keyword in path_lower for keyword in BOT_PATH_KEYWORDS)


def is_suspicious_path(path):
    path_lower = (path or "").lower()
    return any(keyword in path_lower for keyword in SUSPICIOUS_PATH_KEYWORDS)


def traffic_type(path="", user_agent=""):
    if is_suspicious_path(path):
        return "Suspicious"
    if is_bot_path(path):
        return "Bot"
    if is_bot_user_agent(user_agent):
        return "Bot"
    return "Maybe Human"


def traffic_label(value):
    if value == "Maybe Human":
        return "🟢 Maybe Human"
    if value == "Bot":
        return "🟡 Bot"
    if value == "Suspicious":
        return "🔴 Suspicious"
    return value


def build_type_rows(logs, path_field=True):
    type_dict = {
        "Maybe Human": 0,
        "Bot": 0,
        "Suspicious": 0,
    }

    for log in logs:
        path = getattr(log, "path", "") if path_field else ""
        t_type = traffic_type(path, getattr(log, "user_agent", ""))
        type_dict[t_type] = type_dict.get(t_type, 0) + 1

    total = sum(type_dict.values())

    rows = []
    for key in ["Maybe Human", "Bot", "Suspicious"]:
        value = type_dict.get(key, 0)
        rows.append({
            "type": key,
            "label": traffic_label(key),
            "count": value,
            "percent": _rate(value, total),
        })

    return rows


def build_country_rows(logs):
    country_dict = {}

    for log in logs:
        country = get_country_name(getattr(log, "ip_address", ""))
        country_dict[country] = country_dict.get(country, 0) + 1

    return sorted(
        [{"country": key, "count": value} for key, value in country_dict.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:30]


def build_page_type_rows(logs):
    result = {}

    for log in logs:
        path = log.path or "/"
        t_type = traffic_type(log.path, log.user_agent)

        if path not in result:
            result[path] = {
                "path": path,
                "maybe_human": 0,
                "bot": 0,
                "suspicious": 0,
                "total": 0,
            }

        result[path]["total"] += 1

        if t_type == "Maybe Human":
            result[path]["maybe_human"] += 1
        elif t_type == "Bot":
            result[path]["bot"] += 1
        elif t_type == "Suspicious":
            result[path]["suspicious"] += 1

    rows = list(result.values())
    rows.sort(key=lambda x: x["total"], reverse=True)
    return rows[:100]


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

        today_logs = list(queryset.filter(visit_date=today).order_by("-created_at")[:500])
        type_rows = build_type_rows(today_logs, path_field=True)
        country_rows = build_country_rows(today_logs)

        maybe_human_count = next((row["count"] for row in type_rows if row["type"] == "Maybe Human"), 0)
        bot_count = next((row["count"] for row in type_rows if row["type"] == "Bot"), 0)
        suspicious_count = next((row["count"] for row in type_rows if row["type"] == "Suspicious"), 0)

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

        today_logs = list(queryset.filter(visit_date=today).order_by("-created_at")[:500])

        type_rows = build_type_rows(today_logs, path_field=True)
        country_rows = build_country_rows(today_logs)
        page_type_rows = build_page_type_rows(today_logs)

        maybe_human_today = next((row["count"] for row in type_rows if row["type"] == "Maybe Human"), 0)
        bot_today = next((row["count"] for row in type_rows if row["type"] == "Bot"), 0)
        suspicious_today = next((row["count"] for row in type_rows if row["type"] == "Suspicious"), 0)

        extra_context = extra_context or {}
        extra_context.update({
            "daily_total": daily_total,
            "weekly_total": weekly_total,
            "monthly_total": monthly_total,
            "total_count": total_count,
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

        today_page_views = PageViewLog.objects.filter(visit_date=today).count()

        today_game_start = today_events.filter(event_type=GameEventLog.EVENT_GAME_START).count()
        today_game_finish = today_events.filter(event_type=GameEventLog.EVENT_GAME_FINISH).count()
        today_login_click = today_events.filter(event_type=GameEventLog.EVENT_LOGIN_CLICK).count()

        weekly_game_start = weekly_events.filter(event_type=GameEventLog.EVENT_GAME_START).count()
        weekly_game_finish = weekly_events.filter(event_type=GameEventLog.EVENT_GAME_FINISH).count()
        weekly_login_click = weekly_events.filter(event_type=GameEventLog.EVENT_LOGIN_CLICK).count()

        start_rate = _rate(today_game_start, today_page_views)
        finish_rate = _rate(today_game_finish, today_game_start)
        login_rate = _rate(today_login_click, today_game_finish)

        raw_game_rows = (
            today_events
            .values("game_name")
            .annotate(
                start_count=Count("id", filter=Q(event_type=GameEventLog.EVENT_GAME_START)),
                finish_count=Count("id", filter=Q(event_type=GameEventLog.EVENT_GAME_FINISH)),
                login_count=Count("id", filter=Q(event_type=GameEventLog.EVENT_LOGIN_CLICK)),
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
                "finish_rate": _rate(finish_count, start_count),
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