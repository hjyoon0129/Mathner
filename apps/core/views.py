import json
import re
from datetime import timedelta

from django.db import transaction
from django.http import JsonResponse, HttpResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.http import require_POST

from apps.avatar.models import UserAvatarProfile
from apps.core.models import (
    UserGameProfile,
    DEFAULT_DAILY_KEYS,
    GameEventLog,
    VisitorLog,
)


def _get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def _ensure_session_key(request):
    if not request.session.session_key:
        request.session.save()
    return request.session.session_key or ""


def _safe_game_name(value):
    value = (value or "").strip().lower()
    allowed = {"aura", "math_rain", "rain", "unknown"}
    if value not in allowed:
        return "unknown"
    if value == "rain":
        return "math_rain"
    return value


def _create_game_event_log(
    request,
    event_type,
    game_name="unknown",
    score=0,
    correct=0,
    gained_stars=0,
    reason="",
    meta=None,
):
    if event_type not in dict(GameEventLog.EVENT_CHOICES):
        return None

    try:
        return GameEventLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            event_type=event_type,
            game_name=_safe_game_name(game_name),
            ip_address=_get_client_ip(request) or None,
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            path=request.path[:500],
            session_key=_ensure_session_key(request),
            score=max(0, int(score or 0)),
            correct=max(0, int(correct or 0)),
            gained_stars=max(0, int(gained_stars or 0)),
            reason=(reason or "")[:100],
            meta=meta or {},
        )
    except Exception:
        return None


def visitor_stats(request):
    today = timezone.localdate()

    daily_count = VisitorLog.objects.filter(visit_date=today).count()
    weekly_count = VisitorLog.objects.filter(
        visit_date__gte=today - timedelta(days=6),
        visit_date__lte=today,
    ).count()
    monthly_count = VisitorLog.objects.filter(
        visit_date__year=today.year,
        visit_date__month=today.month,
    ).count()
    total_count = VisitorLog.objects.count()

    context = {
        "daily_count": daily_count,
        "weekly_count": weekly_count,
        "monthly_count": monthly_count,
        "total_count": total_count,
    }

    return render(request, "core/visitor_stats.html", context)


def robots_txt(request):
    lines = [
        "User-agent: *",
        "Allow: /",
        "Sitemap: https://mathner.com/sitemap.xml",
    ]
    return HttpResponse("\n".join(lines), content_type="text/plain")


ACTIVE_RUN_SESSION_KEY = "active_math_run_consumed"
GUEST_KEYS_SESSION_KEY = "guest_remaining_keys"
GUEST_KEYS_DATE_SESSION_KEY = "guest_keys_updated_at"
GUEST_STARS_SESSION_KEY = "guest_total_stars"
GUEST_BEST_SCORE_SESSION_KEY = "guest_best_score"
GUEST_TOTAL_CORRECT_SESSION_KEY = "guest_total_correct"


def _get_username(user):
    return user.username or getattr(user, "email", "") or "User"


def _profile_int(profile, field_name, default=0):
    return int(getattr(profile, field_name, default) or 0)


def _get_profile(request):
    if not request.user.is_authenticated:
        return None

    if hasattr(request, "_cached_game_profile"):
        return request._cached_game_profile

    profile, _ = UserGameProfile.objects.get_or_create(user=request.user)
    profile.refresh_daily_keys_if_needed()
    request._cached_game_profile = profile
    return profile


def _today_str():
    return timezone.localdate().isoformat()


def _refresh_guest_daily_keys_if_needed(request):
    today = _today_str()
    saved_date = request.session.get(GUEST_KEYS_DATE_SESSION_KEY)

    if saved_date != today:
        current_keys = int(request.session.get(GUEST_KEYS_SESSION_KEY, DEFAULT_DAILY_KEYS) or 0)
        request.session[GUEST_KEYS_DATE_SESSION_KEY] = today
        request.session[GUEST_KEYS_SESSION_KEY] = max(current_keys, DEFAULT_DAILY_KEYS)
        request.session.modified = True


def _get_guest_remaining_keys(request):
    _refresh_guest_daily_keys_if_needed(request)
    return int(request.session.get(GUEST_KEYS_SESSION_KEY, DEFAULT_DAILY_KEYS) or 0)


def _consume_guest_key(request):
    _refresh_guest_daily_keys_if_needed(request)
    remaining = int(request.session.get(GUEST_KEYS_SESSION_KEY, DEFAULT_DAILY_KEYS) or 0)

    if remaining <= 0:
        return False

    request.session[GUEST_KEYS_SESSION_KEY] = remaining - 1
    request.session.modified = True
    return True


def _get_guest_total_stars(request):
    return int(request.session.get(GUEST_STARS_SESSION_KEY, 0) or 0)


def _get_guest_best_score(request):
    return int(request.session.get(GUEST_BEST_SCORE_SESSION_KEY, 0) or 0)


def _get_guest_total_correct(request):
    return int(request.session.get(GUEST_TOTAL_CORRECT_SESSION_KEY, 0) or 0)


def _apply_guest_run_result(request, gained_stars=0, correct=0, score=0):
    current_stars = _get_guest_total_stars(request)
    current_best = _get_guest_best_score(request)
    current_correct = _get_guest_total_correct(request)

    request.session[GUEST_STARS_SESSION_KEY] = current_stars + max(0, int(gained_stars or 0))
    request.session[GUEST_TOTAL_CORRECT_SESSION_KEY] = current_correct + max(0, int(correct or 0))
    request.session[GUEST_BEST_SCORE_SESSION_KEY] = max(current_best, max(0, int(score or 0)))
    request.session.modified = True


def _build_nav_context(request, profile=None):
    if hasattr(request, "_cached_nav_context"):
        cached = request._cached_nav_context
        if cached is not None:
            return cached

    if not request.user.is_authenticated:
        context = {
            "nav_star_count": _get_guest_total_stars(request),
            "nav_key_count": _get_guest_remaining_keys(request),
            "username": "Guest",
            "my_nickname": "Guest",
            "is_authenticated_user": False,
        }
        request._cached_nav_context = context
        return context

    profile = profile or _get_profile(request)

    context = {
        "nav_star_count": _profile_int(profile, "total_stars"),
        "nav_key_count": int(profile.get_remaining_keys() or 0),
        "username": _get_username(request.user),
        "my_nickname": profile.get_display_name(),
        "is_authenticated_user": True,
    }
    request._cached_nav_context = context
    return context


def _extract_set_code(item):
    if not item:
        return ""

    text = f"{item.name or ''} {item.description or ''}"

    match = re.search(r"\[set\s*:\s*([a-zA-Z0-9_-]+)\]", text, re.I)
    if match:
        return match.group(1).lower()

    match = re.search(r"\bset\s*:\s*([a-zA-Z0-9_-]+)\b", text, re.I)
    if match:
        return match.group(1).lower()

    if ":" in (item.name or ""):
        maybe_prefix = item.name.split(":", 1)[0].strip().lower()
        if maybe_prefix and len(maybe_prefix) <= 24:
            return maybe_prefix.replace(" ", "_")

    return ""


def _effect_from_set_code(set_code):
    if not set_code:
        return ""

    mapping = {
        "royal": "royal-glow",
        "angel": "angel-ring",
        "shadow": "shadow-smoke",
        "neon": "neon-aura",
    }
    return mapping.get(set_code, "set-aura")


def _build_equipped_avatar_state(profile):
    equipped = {
        "hat_item_id": profile.hat_item_id,
        "cloth_item_id": profile.cloth_item_id,
        "shoes_item_id": profile.shoes_item_id,
    }

    set_codes = []
    for field_name in ["hat_item", "cloth_item", "shoes_item"]:
        item = getattr(profile, field_name, None)
        if item:
            set_code = _extract_set_code(item)
            if set_code:
                set_codes.append(set_code)

    active_set_code = ""
    active_effect = ""
    if len(set_codes) >= 2 and len(set(set_codes)) == 1:
        active_set_code = set_codes[0]
        active_effect = _effect_from_set_code(active_set_code)

    return {
        **equipped,
        "active_set_code": active_set_code,
        "active_effect": active_effect,
    }


def _item_image_url(item):
    if not item or not getattr(item, "image_path", ""):
        return ""
    return f"/static/{item.image_path}"


def _get_avatar_profile(request):
    if not request.user.is_authenticated:
        return None

    if hasattr(request, "_cached_avatar_profile"):
        return request._cached_avatar_profile

    avatar_profile, _ = UserAvatarProfile.objects.select_related(
        "hat_item",
        "cloth_item",
        "shoes_item",
    ).get_or_create(user=request.user)

    request._cached_avatar_profile = avatar_profile
    return avatar_profile


def _build_play_avatar_data(request):
    if not request.user.is_authenticated:
        return {
            "enabled": False,
            "gender": "male",
            "hat_image_url": "",
            "cloth_image_url": "",
            "shoes_image_url": "",
            "active_effect": "",
            "active_set_code": "",
        }

    avatar_profile = _get_avatar_profile(request)
    equipped_state = _build_equipped_avatar_state(avatar_profile)

    return {
        "enabled": True,
        "gender": avatar_profile.gender or "male",
        "hat_image_url": _item_image_url(avatar_profile.hat_item),
        "cloth_image_url": _item_image_url(avatar_profile.cloth_item),
        "shoes_image_url": _item_image_url(avatar_profile.shoes_item),
        "active_effect": equipped_state.get("active_effect", ""),
        "active_set_code": equipped_state.get("active_set_code", ""),
    }


def _build_game_page_context(request, play_avatar_enabled=False):
    if request.user.is_authenticated:
        profile = _get_profile(request)
        nav_context = _build_nav_context(request, profile=profile)

        remaining_keys = int(profile.get_remaining_keys() or 0)
        total_stars = _profile_int(profile, "total_stars")
        best_score = _profile_int(profile, "best_score")
        total_correct = _profile_int(profile, "total_correct")
        username = _get_username(request.user)
        my_nickname = profile.get_display_name()

        play_avatar_data = _build_play_avatar_data(request) if play_avatar_enabled else {
            "enabled": False,
            "gender": "male",
            "hat_image_url": "",
            "cloth_image_url": "",
            "shoes_image_url": "",
            "active_effect": "",
            "active_set_code": "",
        }
    else:
        nav_context = _build_nav_context(request)

        remaining_keys = _get_guest_remaining_keys(request)
        total_stars = _get_guest_total_stars(request)
        best_score = _get_guest_best_score(request)
        total_correct = _get_guest_total_correct(request)
        username = "Guest"
        my_nickname = "Guest"
        play_avatar_data = {
            "enabled": False,
            "gender": "male",
            "hat_image_url": "",
            "cloth_image_url": "",
            "shoes_image_url": "",
            "active_effect": "",
            "active_set_code": "",
        }

    return {
        "user_stars": total_stars,
        "user_best_score": best_score,
        "username": username,
        "my_nickname": my_nickname,
        "total_stars": total_stars,
        "remaining_keys": remaining_keys,
        "total_correct": total_correct,
        "is_authenticated_user": request.user.is_authenticated,
        "play_avatar_data_json": json.dumps(play_avatar_data, ensure_ascii=False),
        **nav_context,
    }


def landing_view(request):
    nav_context = _build_nav_context(request)
    context = {
        **nav_context,
    }
    return render(request, "base_landing.html", context)


def app_home_view(request):
    context = _build_game_page_context(request, play_avatar_enabled=False)
    return render(request, "base_app.html", context)


def play_view(request):
    context = _build_game_page_context(request, play_avatar_enabled=True)
    return render(request, "game/aura_play.html", context)


def _get_game_name_from_request(request, fallback="aura"):
    value = ""

    try:
        if request.content_type and "application/json" in request.content_type:
            data = json.loads(request.body.decode("utf-8") or "{}")
            value = data.get("game_name", "")
    except Exception:
        value = ""

    if not value:
        value = request.POST.get("game_name", "")

    return _safe_game_name(value or fallback)


@require_POST
def start_game_run(request):
    game_name = _get_game_name_from_request(request, fallback="aura")

    if request.user.is_authenticated:
        with transaction.atomic():
            profile, _ = UserGameProfile.objects.select_for_update().get_or_create(user=request.user)
            profile.refresh_daily_keys_if_needed()
            request._cached_game_profile = profile
            request._cached_nav_context = None

            if request.session.get(ACTIVE_RUN_SESSION_KEY):
                return JsonResponse(
                    {
                        "ok": True,
                        "message": "Run already started.",
                        "remaining_keys": profile.get_remaining_keys(),
                        "total_stars": _profile_int(profile, "total_stars"),
                        "already_started": True,
                    }
                )

            if profile.get_remaining_keys() <= 0:
                return JsonResponse(
                    {
                        "ok": False,
                        "error": "No keys remaining.",
                        "message": "No keys remaining.",
                        "remaining_keys": 0,
                        "total_stars": _profile_int(profile, "total_stars"),
                    },
                    status=400,
                )

            if not profile.consume_key():
                return JsonResponse(
                    {
                        "ok": False,
                        "error": "No keys remaining.",
                        "message": "No keys remaining.",
                        "remaining_keys": 0,
                        "total_stars": _profile_int(profile, "total_stars"),
                    },
                    status=400,
                )

            request.session[ACTIVE_RUN_SESSION_KEY] = True
            request.session.modified = True
            profile.refresh_from_db()
            request._cached_game_profile = profile

        _create_game_event_log(
            request,
            event_type=GameEventLog.EVENT_GAME_START,
            game_name=game_name,
            reason="start_game_run",
        )

        return JsonResponse(
            {
                "ok": True,
                "message": "Run started successfully.",
                "remaining_keys": _profile_int(profile, "remaining_keys"),
                "total_stars": _profile_int(profile, "total_stars"),
            }
        )

    if request.session.get(ACTIVE_RUN_SESSION_KEY):
        return JsonResponse(
            {
                "ok": True,
                "message": "Run already started.",
                "remaining_keys": _get_guest_remaining_keys(request),
                "total_stars": _get_guest_total_stars(request),
                "already_started": True,
            }
        )

    if _get_guest_remaining_keys(request) <= 0:
        return JsonResponse(
            {
                "ok": False,
                "error": "No keys remaining.",
                "message": "No keys remaining.",
                "remaining_keys": 0,
                "total_stars": _get_guest_total_stars(request),
            },
            status=400,
        )

    if not _consume_guest_key(request):
        return JsonResponse(
            {
                "ok": False,
                "error": "No keys remaining.",
                "message": "No keys remaining.",
                "remaining_keys": 0,
                "total_stars": _get_guest_total_stars(request),
            },
            status=400,
        )

    request.session[ACTIVE_RUN_SESSION_KEY] = True
    request.session.modified = True

    _create_game_event_log(
        request,
        event_type=GameEventLog.EVENT_GAME_START,
        game_name=game_name,
        reason="start_game_run",
    )

    return JsonResponse(
        {
            "ok": True,
            "message": "Run started successfully.",
            "remaining_keys": _get_guest_remaining_keys(request),
            "total_stars": _get_guest_total_stars(request),
        }
    )


@require_POST
def save_game_result(request):
    try:
        data = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, TypeError, ValueError):
        return JsonResponse(
            {"ok": False, "error": "Invalid JSON", "message": "Invalid JSON"},
            status=400,
        )

    gained_stars = max(0, int(data.get("gained_stars", data.get("earned_stars", 0)) or 0))
    score = max(0, int(data.get("score", 0) or 0))
    correct = max(0, int(data.get("correct", data.get("correct_count", 0)) or 0))
    reason = data.get("reason", "")
    game_name = _safe_game_name(data.get("game_name", "aura"))

    if request.user.is_authenticated:
        with transaction.atomic():
            profile, _ = UserGameProfile.objects.select_for_update().get_or_create(user=request.user)
            profile.refresh_daily_keys_if_needed()
            request._cached_game_profile = profile
            request._cached_nav_context = None

            active_run_consumed = bool(request.session.get(ACTIVE_RUN_SESSION_KEY))

            if not active_run_consumed:
                if profile.get_remaining_keys() <= 0:
                    return JsonResponse(
                        {
                            "ok": False,
                            "error": "No keys remaining.",
                            "message": "No keys remaining.",
                            "remaining_keys": 0,
                            "total_stars": _profile_int(profile, "total_stars"),
                        },
                        status=400,
                    )

                if not profile.consume_key():
                    return JsonResponse(
                        {
                            "ok": False,
                            "error": "No keys remaining.",
                            "message": "No keys remaining.",
                            "remaining_keys": 0,
                            "total_stars": _profile_int(profile, "total_stars"),
                        },
                        status=400,
                    )

            profile.apply_run_result(
                gained_stars=gained_stars,
                correct=correct,
                score=score,
            )

            request.session[ACTIVE_RUN_SESSION_KEY] = False
            request.session.modified = True
            profile.refresh_from_db()
            request._cached_game_profile = profile

        _create_game_event_log(
            request,
            event_type=GameEventLog.EVENT_GAME_FINISH,
            game_name=game_name,
            score=score,
            correct=correct,
            gained_stars=gained_stars,
            reason=reason or "save_game_result",
        )

        return JsonResponse(
            {
                "ok": True,
                "message": "Run saved successfully.",
                "total_stars": _profile_int(profile, "total_stars"),
                "best_score": _profile_int(profile, "best_score"),
                "total_correct": _profile_int(profile, "total_correct"),
                "remaining_keys": _profile_int(profile, "remaining_keys"),
                "reason": reason,
            }
        )

    active_run_consumed = bool(request.session.get(ACTIVE_RUN_SESSION_KEY))

    if not active_run_consumed:
        if _get_guest_remaining_keys(request) <= 0:
            return JsonResponse(
                {
                    "ok": False,
                    "error": "No keys remaining.",
                    "message": "No keys remaining.",
                    "remaining_keys": 0,
                    "total_stars": _get_guest_total_stars(request),
                },
                status=400,
            )

        if not _consume_guest_key(request):
            return JsonResponse(
                {
                    "ok": False,
                    "error": "No keys remaining.",
                    "message": "No keys remaining.",
                    "remaining_keys": 0,
                    "total_stars": _get_guest_total_stars(request),
                },
                status=400,
            )

    _apply_guest_run_result(
        request,
        gained_stars=gained_stars,
        correct=correct,
        score=score,
    )

    request.session[ACTIVE_RUN_SESSION_KEY] = False
    request.session.modified = True

    _create_game_event_log(
        request,
        event_type=GameEventLog.EVENT_GAME_FINISH,
        game_name=game_name,
        score=score,
        correct=correct,
        gained_stars=gained_stars,
        reason=reason or "save_game_result",
    )

    return JsonResponse(
        {
            "ok": True,
            "message": "Run saved successfully.",
            "total_stars": _get_guest_total_stars(request),
            "best_score": _get_guest_best_score(request),
            "total_correct": _get_guest_total_correct(request),
            "remaining_keys": _get_guest_remaining_keys(request),
            "reason": reason,
        }
    )


@require_POST
def track_game_event(request):
    try:
        data = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, TypeError, ValueError):
        data = request.POST

    event_type = data.get("event_type", "")
    game_name = data.get("game_name", "unknown")

    if event_type not in dict(GameEventLog.EVENT_CHOICES):
        return JsonResponse({"ok": False, "error": "Invalid event_type"}, status=400)

    log = _create_game_event_log(
        request,
        event_type=event_type,
        game_name=game_name,
        score=data.get("score", 0),
        correct=data.get("correct", data.get("correct_count", 0)),
        gained_stars=data.get("gained_stars", data.get("earned_stars", 0)),
        reason=data.get("reason", "manual"),
        meta={
            "source": data.get("source", "client"),
            "page": data.get("page", ""),
        },
    )

    return JsonResponse({"ok": True, "id": log.id if log else None})


def privacy_view(request):
    nav_context = _build_nav_context(request)
    return render(request, "core/privacy.html", nav_context)


def terms_view(request):
    nav_context = _build_nav_context(request)
    return render(request, "core/terms.html", nav_context)


def refund_view(request):
    nav_context = _build_nav_context(request)
    return render(request, "core/refund.html", nav_context)