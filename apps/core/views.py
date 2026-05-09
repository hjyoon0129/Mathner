import json
import re
from datetime import timedelta
from uuid import uuid4

from django.db import transaction
from django.http import JsonResponse, HttpResponse
from django.shortcuts import render
from django.utils import timezone
from django.utils.cache import patch_vary_headers
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_POST

from apps.avatar.models import UserAvatarProfile
from apps.core.models import (
    UserGameProfile,
    DEFAULT_DAILY_KEYS,
    GameEventLog,
    VisitorLog,
)


def _set_no_store_headers(response):
    """
    브라우저 뒤로가기 / 앞으로가기 / bfcache / 일반 캐시 때문에
    별/열쇠가 예전 값으로 보이는 문제를 막기 위한 공통 헤더.
    게임 페이지와 게임 API 응답은 사용자별 상태값이 있으므로 캐시하면 안 된다.
    """
    response["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0, private"
    response["Pragma"] = "no-cache"
    response["Expires"] = "0"
    patch_vary_headers(response, ["Cookie"])
    return response


def _render_no_store(request, template_name, context=None, status=None):
    response = render(request, template_name, context or {}, status=status)
    return _set_no_store_headers(response)


def _json_no_store(data, status=200):
    response = JsonResponse(data, status=status)
    return _set_no_store_headers(response)


def _invalidate_request_state_cache(request):
    """
    같은 request 안에서 profile/nav context를 캐싱해두는 경우가 있어서,
    별/열쇠를 변경한 직후에는 반드시 캐시를 비운다.
    """
    for attr in [
        "_cached_game_profile",
        "_cached_nav_context",
        "_cached_avatar_profile",
        "_mathner_payload_cache",
    ]:
        if hasattr(request, attr):
            try:
                delattr(request, attr)
            except Exception:
                pass


def _get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def _ensure_session_key(request):
    if not request.session.session_key:
        request.session.save()
    return request.session.session_key or ""


def _clean_text(value):
    if value is None:
        return ""
    return str(value).strip()


def _safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _safe_game_name(value):
    value = (value or "").strip().lower()
    value = value.replace("-", "_").replace(" ", "_")

    if value in {"avatar_aura", "aura_play", "play_aura"}:
        return "aura"

    if value in {"rain", "mathrain", "math_rain"}:
        return "math_rain"

    allowed = {"aura", "math_rain", "unknown"}
    if value not in allowed:
        return "unknown"

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
            score=max(0, _safe_int(score, 0)),
            correct=max(0, _safe_int(correct, 0)),
            gained_stars=max(0, _safe_int(gained_stars, 0)),
            reason=(reason or "")[:100],
            meta=meta or {},
        )
    except Exception:
        return None


@never_cache
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

    return _render_no_store(request, "core/visitor_stats.html", context)


@never_cache
def robots_txt(request):
    lines = [
        "User-agent: *",
        "Allow: /",
        "Sitemap: https://mathner.com/sitemap.xml",
    ]
    response = HttpResponse("\n".join(lines), content_type="text/plain")
    return response


ACTIVE_RUN_SESSION_KEY = "active_math_run_consumed"
ACTIVE_RUN_ID_SESSION_KEY = "active_math_run_id"
ACTIVE_RUN_GAME_NAME_SESSION_KEY = "active_math_run_game_name"
LAST_FINALIZED_RUN_ID_SESSION_KEY = "last_finalized_math_run_id"

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

    request.session[GUEST_STARS_SESSION_KEY] = current_stars + max(0, _safe_int(gained_stars, 0))
    request.session[GUEST_TOTAL_CORRECT_SESSION_KEY] = current_correct + max(0, _safe_int(correct, 0))
    request.session[GUEST_BEST_SCORE_SESSION_KEY] = max(current_best, max(0, _safe_int(score, 0)))
    request.session.modified = True


def _get_current_game_state(request, profile=None):
    """
    게임 JS가 어떤 게임이든 공통으로 믿을 수 있는 최신 상태.
    앞으로 새 게임을 만들어도 start/save API에서 이 값을 그대로 쓰면 된다.
    """
    if request.user.is_authenticated:
        profile = profile or _get_profile(request)
        profile.refresh_daily_keys_if_needed()

        return {
            "total_stars": _profile_int(profile, "total_stars"),
            "remaining_keys": int(profile.get_remaining_keys() or 0),
            "best_score": _profile_int(profile, "best_score"),
            "total_correct": _profile_int(profile, "total_correct"),
            "nav_star_count": _profile_int(profile, "total_stars"),
            "nav_key_count": int(profile.get_remaining_keys() or 0),
            "is_authenticated_user": True,
            "username": _get_username(request.user),
            "my_nickname": profile.get_display_name(),
        }

    return {
        "total_stars": _get_guest_total_stars(request),
        "remaining_keys": _get_guest_remaining_keys(request),
        "best_score": _get_guest_best_score(request),
        "total_correct": _get_guest_total_correct(request),
        "nav_star_count": _get_guest_total_stars(request),
        "nav_key_count": _get_guest_remaining_keys(request),
        "is_authenticated_user": False,
        "username": "Guest",
        "my_nickname": "Guest",
    }


def _build_game_api_payload(request, profile=None, **extra):
    payload = {
        "ok": True,
        **_get_current_game_state(request, profile=profile),
    }
    payload.update(extra)
    return payload


def _build_nav_context(request, profile=None):
    if hasattr(request, "_cached_nav_context"):
        cached = request._cached_nav_context
        if cached is not None:
            return cached

    state = _get_current_game_state(request, profile=profile)

    context = {
        "nav_star_count": state["nav_star_count"],
        "nav_key_count": state["nav_key_count"],
        "username": state["username"],
        "my_nickname": state["my_nickname"],
        "is_authenticated_user": state["is_authenticated_user"],
    }

    request._cached_nav_context = context
    return context


def _extract_set_code(item):
    if not item:
        return ""

    text = f"{getattr(item, 'name', '') or ''} {getattr(item, 'description', '') or ''}"

    match = re.search(r"\[set\s*:\s*([a-zA-Z0-9_-]+)\]", text, re.I)
    if match:
        return match.group(1).lower()

    match = re.search(r"\bset\s*:\s*([a-zA-Z0-9_-]+)\b", text, re.I)
    if match:
        return match.group(1).lower()

    item_name = getattr(item, "name", "") or ""
    if ":" in item_name:
        maybe_prefix = item_name.split(":", 1)[0].strip().lower()
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
    if not profile:
        return {
            "hat_item_id": None,
            "cloth_item_id": None,
            "shoes_item_id": None,
            "active_set_code": "",
            "active_effect": "",
        }

    equipped = {
        "hat_item_id": getattr(profile, "hat_item_id", None),
        "cloth_item_id": getattr(profile, "cloth_item_id", None),
        "shoes_item_id": getattr(profile, "shoes_item_id", None),
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
    if not item:
        return ""

    image_path = _clean_text(getattr(item, "image_path", ""))
    if image_path:
        if image_path.startswith("/"):
            return image_path
        return f"/static/{image_path}"

    image_url = _clean_text(getattr(item, "image_url", ""))
    if image_url:
        return image_url

    image = getattr(item, "image", None)
    if image:
        try:
            return image.url
        except Exception:
            return ""

    return ""


SUPPORTED_FONT_KEYS = {
    "gaegu",
    "dongle",
    "gowun_batang",
    "nanum_pen",
    "dokdo",
    "bubblegum_sans",
    "delius_swash_caps",
    "boogaloo",
    "love_ya_like_a_sister",
    "luckiest_guy",
    "coming_soon",
    "life_savers",
    "chewy",
    "cabin_sketch",
    "mouse_memoirs",
    "londrina_shadow",
    "modak",
    "amatic_sc",
    "capriola",
    "mclaren",
}

SUPPORTED_EFFECT_KEYS = {
    "none",
    "neon_blue",
    "rainbow_flow",
    "gold_glow",
    "sparkle",
    "glitch",
    "float_wave",
    "fire_glow",
    "ice_glow",
}

DEFAULT_NICKNAME_SCALE = 1.0
DEFAULT_NICKNAME_LETTER_SPACING = 0.0


def _slugify_font_key(value):
    raw = str(value or "").strip().lower()
    raw = raw.replace("-", "_").replace(" ", "_")
    raw = re.sub(r"[^a-z0-9_]+", "", raw)
    raw = re.sub(r"_+", "_", raw).strip("_")
    return raw


def _font_key_from_item(item):
    if not item:
        return ""

    direct_key = _slugify_font_key(getattr(item, "font_family_key", ""))
    if direct_key in SUPPORTED_FONT_KEYS:
        return direct_key

    candidates = [
        getattr(item, "font_key", ""),
        getattr(item, "code", ""),
        getattr(item, "slug", ""),
        getattr(item, "name", ""),
    ]

    for candidate in candidates:
        key = _slugify_font_key(candidate)
        if key in SUPPORTED_FONT_KEYS:
            return key

    return ""


def _normalize_effect_key(value):
    raw = str(value or "none").strip().lower()
    raw = raw.replace("-", "_").replace(" ", "_")
    raw = re.sub(r"[^a-z0-9_]+", "", raw)
    raw = re.sub(r"_+", "_", raw).strip("_")
    return raw if raw in SUPPORTED_EFFECT_KEYS else "none"


def _normalize_play_nickname_color(value):
    color = _clean_text(value)

    if not color:
        return ""

    lowered = color.lower().replace(" ", "")

    if lowered in {
        "#fff",
        "#ffffff",
        "white",
        "rgb(255,255,255)",
        "rgba(255,255,255,1)",
    }:
        return ""

    return color


def _font_class_from_key(font_key):
    clean_key = _slugify_font_key(font_key)
    return f"font-{clean_key}" if clean_key else "font-default"


def _effect_class_from_key(effect_key):
    clean_key = _normalize_effect_key(effect_key)
    return f"effect-{clean_key.replace('_', '-')}"


def _get_empty_font_pref():
    return {
        "nickname_font_key": "",
        "nickname_effect_key": "none",
        "nickname_scale": DEFAULT_NICKNAME_SCALE,
        "nickname_letter_spacing": DEFAULT_NICKNAME_LETTER_SPACING,
        "nickname_color": "",
    }


def _get_play_font_pref(user):
    if not user or not getattr(user, "is_authenticated", False):
        return _get_empty_font_pref()

    try:
        from apps.shop.models import UserFontPreference

        pref, _ = UserFontPreference.objects.select_related(
            "nickname_font_item",
            "title_font_item",
            "content_font_item",
        ).get_or_create(user=user)

        nickname_item = getattr(pref, "nickname_font_item", None)
        nickname_font_key = _font_key_from_item(nickname_item)
        nickname_effect_key = _normalize_effect_key(getattr(pref, "nickname_effect_key", "none"))
        nickname_color = _normalize_play_nickname_color(getattr(pref, "nickname_color", ""))

        return {
            "nickname_font_key": nickname_font_key,
            "nickname_effect_key": nickname_effect_key,
            "nickname_scale": float(getattr(pref, "nickname_scale", DEFAULT_NICKNAME_SCALE) or DEFAULT_NICKNAME_SCALE),
            "nickname_letter_spacing": float(
                getattr(pref, "nickname_letter_spacing", DEFAULT_NICKNAME_LETTER_SPACING)
                or DEFAULT_NICKNAME_LETTER_SPACING
            ),
            "nickname_color": nickname_color,
        }
    except Exception:
        return _get_empty_font_pref()


def _font_pref_to_play_json(font_pref):
    font_key = _slugify_font_key(font_pref.get("nickname_font_key", ""))
    effect_key = _normalize_effect_key(font_pref.get("nickname_effect_key", "none"))
    font_class = _font_class_from_key(font_key)
    effect_class = _effect_class_from_key(effect_key)
    nickname_color = _normalize_play_nickname_color(font_pref.get("nickname_color", ""))

    return {
        "nickname_font_key": font_key,
        "font_key": font_key,
        "selected_font_key": font_key,
        "equipped_font_key": font_key,

        "nickname_effect_key": effect_key,
        "effect_key": effect_key,
        "font_effect_key": effect_key,
        "selected_effect_key": effect_key,
        "equipped_effect_key": effect_key,

        "nickname_font_class": font_class,
        "font_class": font_class,
        "selected_font_class": font_class,
        "equipped_font_class": font_class,

        "nickname_effect_class": effect_class,
        "font_effect_class": effect_class,
        "effect_class": effect_class,
        "selected_effect_class": effect_class,
        "equipped_effect_class": effect_class,

        "nickname_scale": float(font_pref.get("nickname_scale", DEFAULT_NICKNAME_SCALE) or DEFAULT_NICKNAME_SCALE),
        "nickname_letter_spacing": float(
            font_pref.get("nickname_letter_spacing", DEFAULT_NICKNAME_LETTER_SPACING)
            or DEFAULT_NICKNAME_LETTER_SPACING
        ),
        "nickname_color": nickname_color,
        "font_color": nickname_color,
    }


def _empty_play_avatar_data():
    return {
        "enabled": False,
        "gender": "male",

        "body_image_url": "",
        "head_image_url": "",
        "eyes_image_url": "",
        "mouth_image_url": "",
        "eyebrow_image_url": "",
        "front_hair_image_url": "",
        "rear_hair_image_url": "",
        "top_image_url": "",
        "cloth_image_url": "",
        "pants_image_url": "",
        "hat_image_url": "",
        "shoes_image_url": "",

        "active_effect": "",
        "active_set_code": "",

        **_font_pref_to_play_json(_get_empty_font_pref()),
    }


def _get_avatar_profile(request):
    if not request.user.is_authenticated:
        return None

    if hasattr(request, "_cached_avatar_profile"):
        return request._cached_avatar_profile

    avatar_profile, _ = UserAvatarProfile.objects.select_related(
        "body_item",
        "head_item",
        "eyes_item",
        "mouth_item",
        "eyebrow_item",
        "front_hair_item",
        "rear_hair_item",
        "top_item",
        "cloth_item",
        "pants_item",
        "hat_item",
        "shoes_item",
    ).get_or_create(user=request.user)

    request._cached_avatar_profile = avatar_profile
    return avatar_profile


def _build_play_avatar_data(request):
    if not request.user.is_authenticated:
        return _empty_play_avatar_data()

    avatar_profile = _get_avatar_profile(request)
    equipped_state = _build_equipped_avatar_state(avatar_profile)
    font_pref = _get_play_font_pref(request.user)

    return {
        "enabled": True,
        "gender": getattr(avatar_profile, "gender", "") or "male",

        "body_image_url": _item_image_url(getattr(avatar_profile, "body_item", None)),
        "head_image_url": _item_image_url(getattr(avatar_profile, "head_item", None)),
        "eyes_image_url": _item_image_url(getattr(avatar_profile, "eyes_item", None)),
        "mouth_image_url": _item_image_url(getattr(avatar_profile, "mouth_item", None)),
        "eyebrow_image_url": _item_image_url(getattr(avatar_profile, "eyebrow_item", None)),
        "front_hair_image_url": _item_image_url(getattr(avatar_profile, "front_hair_item", None)),
        "rear_hair_image_url": _item_image_url(getattr(avatar_profile, "rear_hair_item", None)),
        "top_image_url": _item_image_url(getattr(avatar_profile, "top_item", None)),
        "cloth_image_url": _item_image_url(getattr(avatar_profile, "cloth_item", None)),
        "pants_image_url": _item_image_url(getattr(avatar_profile, "pants_item", None)),
        "hat_image_url": _item_image_url(getattr(avatar_profile, "hat_item", None)),
        "shoes_image_url": _item_image_url(getattr(avatar_profile, "shoes_item", None)),

        "active_effect": equipped_state.get("active_effect", ""),
        "active_set_code": equipped_state.get("active_set_code", ""),

        **_font_pref_to_play_json(font_pref),
    }


def _build_game_page_context(request, play_avatar_enabled=False):
    if request.user.is_authenticated:
        profile = _get_profile(request)
        state = _get_current_game_state(request, profile=profile)

        total_stars = state["total_stars"]
        remaining_keys = state["remaining_keys"]
        best_score = state["best_score"]
        total_correct = state["total_correct"]
        username = state["username"]
        my_nickname = state["my_nickname"]

        play_avatar_data = _build_play_avatar_data(request) if play_avatar_enabled else _empty_play_avatar_data()
    else:
        state = _get_current_game_state(request)

        total_stars = state["total_stars"]
        remaining_keys = state["remaining_keys"]
        best_score = state["best_score"]
        total_correct = state["total_correct"]
        username = "Guest"
        my_nickname = "Guest"
        play_avatar_data = _empty_play_avatar_data()

    nav_context = _build_nav_context(request)

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


@never_cache
def landing_view(request):
    nav_context = _build_nav_context(request)
    context = {
        **nav_context,
    }
    return _render_no_store(request, "base_landing.html", context)


@never_cache
def app_home_view(request):
    context = _build_game_page_context(request, play_avatar_enabled=False)
    return _render_no_store(request, "base_app.html", context)


@never_cache
def play_view(request):
    context = _build_game_page_context(request, play_avatar_enabled=True)
    return _render_no_store(request, "game/aura_play.html", context)


def _read_request_payload(request):
    """
    JSON fetch, keepalive fetch, form POST를 모두 받기 위한 공통 파서.
    """
    if hasattr(request, "_mathner_payload_cache"):
        return request._mathner_payload_cache

    data = {}

    try:
        body_text = request.body.decode("utf-8") if request.body else ""
        if body_text:
            parsed = json.loads(body_text)
            if isinstance(parsed, dict):
                data = parsed
    except (json.JSONDecodeError, UnicodeDecodeError, TypeError, ValueError):
        data = {}

    if not data:
        try:
            data = request.POST.dict()
        except Exception:
            data = {}

    request._mathner_payload_cache = data
    return data


def _get_payload_value(data, *keys, default=""):
    for key in keys:
        value = data.get(key)
        if value is not None and str(value).strip() != "":
            return value
    return default


def _get_game_name_from_payload(data, fallback="aura"):
    value = _get_payload_value(
        data,
        "game_name",
        "game",
        "game_mode",
        "mode_game",
        default=fallback,
    )
    return _safe_game_name(value or fallback)


def _get_game_name_from_request(request, fallback="aura"):
    return _get_game_name_from_payload(_read_request_payload(request), fallback=fallback)


def _new_run_id():
    return uuid4().hex


def _clear_active_run(request, finalized_run_id=""):
    if finalized_run_id:
        request.session[LAST_FINALIZED_RUN_ID_SESSION_KEY] = finalized_run_id

    request.session[ACTIVE_RUN_SESSION_KEY] = False
    request.session[ACTIVE_RUN_ID_SESSION_KEY] = ""
    request.session[ACTIVE_RUN_GAME_NAME_SESSION_KEY] = ""
    request.session.modified = True


def _already_finalized_response(request, profile=None, reason="already_finalized"):
    return _json_no_store(
        _build_game_api_payload(
            request,
            profile=profile,
            already_finalized=True,
            message="Run already finalized.",
            reason=reason,
        )
    )


def _stale_run_response(request, profile=None, reason="stale_run"):
    return _json_no_store(
        _build_game_api_payload(
            request,
            profile=profile,
            ok=False,
            error="Stale run.",
            error_code="STALE_RUN",
            message="This run is no longer active.",
            reason=reason,
        ),
        status=409,
    )


@never_cache
@require_POST
def start_game_run(request):
    data = _read_request_payload(request)
    game_name = _get_game_name_from_payload(data, fallback="aura")

    if request.user.is_authenticated:
        with transaction.atomic():
            profile, _ = UserGameProfile.objects.select_for_update().get_or_create(user=request.user)
            profile.refresh_daily_keys_if_needed()
            request._cached_game_profile = profile
            request._cached_nav_context = None

            if request.session.get(ACTIVE_RUN_SESSION_KEY):
                stale_run_id = request.session.get(ACTIVE_RUN_ID_SESSION_KEY, "")

                _clear_active_run(
                    request,
                    finalized_run_id=stale_run_id or _new_run_id(),
                )

                request.session[ACTIVE_RUN_SESSION_KEY] = False
                request.session[ACTIVE_RUN_ID_SESSION_KEY] = ""
                request.session[ACTIVE_RUN_GAME_NAME_SESSION_KEY] = ""
                request.session.modified = True

            if profile.get_remaining_keys() <= 0:
                return _json_no_store(
                    _build_game_api_payload(
                        request,
                        profile=profile,
                        ok=False,
                        error="No keys remaining.",
                        error_code="NO_KEYS",
                        message="No keys remaining.",
                    ),
                    status=400,
                )

            if not profile.consume_key():
                profile.refresh_from_db()
                _invalidate_request_state_cache(request)

                return _json_no_store(
                    _build_game_api_payload(
                        request,
                        profile=profile,
                        ok=False,
                        error="No keys remaining.",
                        error_code="NO_KEYS",
                        message="No keys remaining.",
                    ),
                    status=400,
                )

            active_run_id = _new_run_id()
            request.session[ACTIVE_RUN_SESSION_KEY] = True
            request.session[ACTIVE_RUN_ID_SESSION_KEY] = active_run_id
            request.session[ACTIVE_RUN_GAME_NAME_SESSION_KEY] = game_name
            request.session.modified = True

            profile.refresh_from_db()
            request._cached_game_profile = profile
            request._cached_nav_context = None

        _create_game_event_log(
            request,
            event_type=GameEventLog.EVENT_GAME_START,
            game_name=game_name,
            reason="start_game_run",
            meta={"run_id": active_run_id},
        )

        _invalidate_request_state_cache(request)

        return _json_no_store(
            _build_game_api_payload(
                request,
                profile=profile,
                message="Run started successfully.",
                run_id=active_run_id,
            )
        )

    if request.session.get(ACTIVE_RUN_SESSION_KEY):
        stale_run_id = request.session.get(ACTIVE_RUN_ID_SESSION_KEY, "")

        _clear_active_run(
            request,
            finalized_run_id=stale_run_id or _new_run_id(),
        )

        request.session[ACTIVE_RUN_SESSION_KEY] = False
        request.session[ACTIVE_RUN_ID_SESSION_KEY] = ""
        request.session[ACTIVE_RUN_GAME_NAME_SESSION_KEY] = ""
        request.session.modified = True
        _invalidate_request_state_cache(request)

    if _get_guest_remaining_keys(request) <= 0:
        return _json_no_store(
            _build_game_api_payload(
                request,
                ok=False,
                error="No keys remaining.",
                error_code="NO_KEYS",
                message="No keys remaining.",
            ),
            status=400,
        )

    if not _consume_guest_key(request):
        _invalidate_request_state_cache(request)

        return _json_no_store(
            _build_game_api_payload(
                request,
                ok=False,
                error="No keys remaining.",
                error_code="NO_KEYS",
                message="No keys remaining.",
            ),
            status=400,
        )

    active_run_id = _new_run_id()
    request.session[ACTIVE_RUN_SESSION_KEY] = True
    request.session[ACTIVE_RUN_ID_SESSION_KEY] = active_run_id
    request.session[ACTIVE_RUN_GAME_NAME_SESSION_KEY] = game_name
    request.session.modified = True

    _create_game_event_log(
        request,
        event_type=GameEventLog.EVENT_GAME_START,
        game_name=game_name,
        reason="start_game_run",
        meta={"run_id": active_run_id},
    )

    _invalidate_request_state_cache(request)

    return _json_no_store(
        _build_game_api_payload(
            request,
            message="Run started successfully.",
            run_id=active_run_id,
        )
    )


@never_cache
@require_POST
def save_game_result(request):
    data = _read_request_payload(request)

    if not isinstance(data, dict):
        return _json_no_store(
            {"ok": False, "error": "Invalid JSON", "message": "Invalid JSON"},
            status=400,
        )

    gained_stars = max(0, _safe_int(data.get("gained_stars", data.get("earned_stars", data.get("stars", 0))), 0))
    score = max(0, _safe_int(data.get("score", data.get("correct", data.get("correct_count", 0))), 0))
    correct = max(0, _safe_int(data.get("correct", data.get("correct_count", score)), 0))
    reason = str(data.get("reason", "") or "")[:100]
    game_name = _get_game_name_from_payload(
        data,
        fallback=request.session.get(ACTIVE_RUN_GAME_NAME_SESSION_KEY, "aura"),
    )
    client_run_id = _clean_text(data.get("run_id", data.get("game_run_id", "")))

    if request.user.is_authenticated:
        with transaction.atomic():
            profile, _ = UserGameProfile.objects.select_for_update().get_or_create(user=request.user)
            profile.refresh_daily_keys_if_needed()
            request._cached_game_profile = profile
            request._cached_nav_context = None

            active_run_consumed = bool(request.session.get(ACTIVE_RUN_SESSION_KEY))
            active_run_id = _clean_text(request.session.get(ACTIVE_RUN_ID_SESSION_KEY, ""))
            last_finalized_run_id = _clean_text(request.session.get(LAST_FINALIZED_RUN_ID_SESSION_KEY, ""))
            effective_run_id = client_run_id or active_run_id

            if client_run_id and last_finalized_run_id and client_run_id == last_finalized_run_id:
                profile.refresh_from_db()
                _invalidate_request_state_cache(request)
                return _already_finalized_response(
                    request,
                    profile=profile,
                    reason=reason or "already_finalized",
                )

            if client_run_id and active_run_id and client_run_id != active_run_id:
                profile.refresh_from_db()
                _invalidate_request_state_cache(request)
                return _stale_run_response(
                    request,
                    profile=profile,
                    reason=reason or "stale_run",
                )

            if (
                effective_run_id
                and last_finalized_run_id
                and effective_run_id == last_finalized_run_id
                and not active_run_consumed
            ):
                profile.refresh_from_db()
                _invalidate_request_state_cache(request)
                return _already_finalized_response(
                    request,
                    profile=profile,
                    reason=reason or "already_finalized",
                )

            if not active_run_consumed:
                if profile.get_remaining_keys() <= 0:
                    return _json_no_store(
                        _build_game_api_payload(
                            request,
                            profile=profile,
                            ok=False,
                            error="No keys remaining.",
                            error_code="NO_KEYS",
                            message="No keys remaining.",
                        ),
                        status=400,
                    )

                if not profile.consume_key():
                    profile.refresh_from_db()
                    _invalidate_request_state_cache(request)

                    return _json_no_store(
                        _build_game_api_payload(
                            request,
                            profile=profile,
                            ok=False,
                            error="No keys remaining.",
                            error_code="NO_KEYS",
                            message="No keys remaining.",
                        ),
                        status=400,
                    )

            profile.apply_run_result(
                gained_stars=gained_stars,
                correct=correct,
                score=score,
            )

            finalized_run_id = effective_run_id or _new_run_id()
            _clear_active_run(request, finalized_run_id=finalized_run_id)
            profile.refresh_from_db()
            request._cached_game_profile = profile
            request._cached_nav_context = None

        _create_game_event_log(
            request,
            event_type=GameEventLog.EVENT_GAME_FINISH,
            game_name=game_name,
            score=score,
            correct=correct,
            gained_stars=gained_stars,
            reason=reason or "save_game_result",
            meta={"run_id": finalized_run_id},
        )

        _invalidate_request_state_cache(request)

        return _json_no_store(
            _build_game_api_payload(
                request,
                profile=profile,
                message="Run saved successfully.",
                reason=reason,
                run_id=finalized_run_id,
            )
        )

    active_run_consumed = bool(request.session.get(ACTIVE_RUN_SESSION_KEY))
    active_run_id = _clean_text(request.session.get(ACTIVE_RUN_ID_SESSION_KEY, ""))
    last_finalized_run_id = _clean_text(request.session.get(LAST_FINALIZED_RUN_ID_SESSION_KEY, ""))
    effective_run_id = client_run_id or active_run_id

    if client_run_id and last_finalized_run_id and client_run_id == last_finalized_run_id:
        _invalidate_request_state_cache(request)
        return _already_finalized_response(
            request,
            profile=None,
            reason=reason or "already_finalized",
        )

    if client_run_id and active_run_id and client_run_id != active_run_id:
        _invalidate_request_state_cache(request)
        return _stale_run_response(
            request,
            profile=None,
            reason=reason or "stale_run",
        )

    if (
        effective_run_id
        and last_finalized_run_id
        and effective_run_id == last_finalized_run_id
        and not active_run_consumed
    ):
        _invalidate_request_state_cache(request)
        return _already_finalized_response(
            request,
            profile=None,
            reason=reason or "already_finalized",
        )

    if not active_run_consumed:
        if _get_guest_remaining_keys(request) <= 0:
            return _json_no_store(
                _build_game_api_payload(
                    request,
                    ok=False,
                    error="No keys remaining.",
                    error_code="NO_KEYS",
                    message="No keys remaining.",
                ),
                status=400,
            )

        if not _consume_guest_key(request):
            _invalidate_request_state_cache(request)

            return _json_no_store(
                _build_game_api_payload(
                    request,
                    ok=False,
                    error="No keys remaining.",
                    error_code="NO_KEYS",
                    message="No keys remaining.",
                ),
                status=400,
            )

    _apply_guest_run_result(
        request,
        gained_stars=gained_stars,
        correct=correct,
        score=score,
    )

    finalized_run_id = effective_run_id or _new_run_id()
    _clear_active_run(request, finalized_run_id=finalized_run_id)

    _create_game_event_log(
        request,
        event_type=GameEventLog.EVENT_GAME_FINISH,
        game_name=game_name,
        score=score,
        correct=correct,
        gained_stars=gained_stars,
        reason=reason or "save_game_result",
        meta={"run_id": finalized_run_id},
    )

    _invalidate_request_state_cache(request)

    return _json_no_store(
        _build_game_api_payload(
            request,
            message="Run saved successfully.",
            reason=reason,
            run_id=finalized_run_id,
        )
    )


@never_cache
@require_POST
def track_game_event(request):
    data = _read_request_payload(request)

    event_type = data.get("event_type", "")
    game_name = data.get("game_name", data.get("game", "unknown"))

    if event_type not in dict(GameEventLog.EVENT_CHOICES):
        return _json_no_store({"ok": False, "error": "Invalid event_type"}, status=400)

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
            "run_id": data.get("run_id", data.get("game_run_id", "")),
        },
    )

    return _json_no_store({"ok": True, "id": log.id if log else None})


@never_cache
def privacy_view(request):
    nav_context = _build_nav_context(request)
    return _render_no_store(request, "core/privacy.html", nav_context)


@never_cache
def terms_view(request):
    nav_context = _build_nav_context(request)
    return _render_no_store(request, "core/terms.html", nav_context)


@never_cache
def refund_view(request):
    nav_context = _build_nav_context(request)
    return _render_no_store(request, "core/refund.html", nav_context)