import json
import re

from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_POST

from apps.core.models import UserGameProfile, DEFAULT_DAILY_KEYS
from apps.avatar.models import UserAvatarProfile


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


def _get_profile(user):
    profile, _ = UserGameProfile.objects.get_or_create(user=user)
    profile.refresh_daily_keys_if_needed()
    return profile


def _today_str():
    from django.utils import timezone
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


def _build_nav_context(request):
    if not request.user.is_authenticated:
        return {
            "nav_star_count": _get_guest_total_stars(request),
            "nav_key_count": _get_guest_remaining_keys(request),
            "username": "Guest",
            "my_nickname": "Guest",
            "is_authenticated_user": False,
        }

    profile = _get_profile(request.user)

    return {
        "nav_star_count": _profile_int(profile, "total_stars"),
        "nav_key_count": profile.get_remaining_keys(),
        "username": _get_username(request.user),
        "my_nickname": profile.get_display_name(),
        "is_authenticated_user": True,
    }


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


def _build_play_avatar_data(user):
    if not user or not user.is_authenticated:
        return {
            "enabled": False,
            "gender": "male",
            "hat_image_url": "",
            "cloth_image_url": "",
            "shoes_image_url": "",
            "active_effect": "",
            "active_set_code": "",
        }

    avatar_profile, _ = UserAvatarProfile.objects.select_related(
        "hat_item", "cloth_item", "shoes_item"
    ).get_or_create(user=user)

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


def landing_view(request):
    context = _build_nav_context(request)
    return render(request, "core/landing.html", context)


def play_view(request):
    nav_context = _build_nav_context(request)

    if request.user.is_authenticated:
        profile = _get_profile(request.user)
        remaining_keys = profile.get_remaining_keys()
        total_stars = _profile_int(profile, "total_stars")
        best_score = _profile_int(profile, "best_score")
        total_correct = _profile_int(profile, "total_correct")
        username = _get_username(request.user)
        my_nickname = profile.get_display_name()
        play_avatar_data = _build_play_avatar_data(request.user)
    else:
        remaining_keys = _get_guest_remaining_keys(request)
        total_stars = _get_guest_total_stars(request)
        best_score = _get_guest_best_score(request)
        total_correct = _get_guest_total_correct(request)
        username = "Guest"
        my_nickname = "Guest"
        play_avatar_data = _build_play_avatar_data(None)

    context = {
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
    return render(request, "core/play.html", context)


@require_POST
def start_game_run(request):
    if request.user.is_authenticated:
        with transaction.atomic():
            profile, _ = UserGameProfile.objects.select_for_update().get_or_create(user=request.user)
            profile.refresh_daily_keys_if_needed()

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

            consumed = profile.consume_key()
            if not consumed:
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

    consumed = _consume_guest_key(request)
    if not consumed:
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

    if request.user.is_authenticated:
        with transaction.atomic():
            profile, _ = UserGameProfile.objects.select_for_update().get_or_create(user=request.user)
            profile.refresh_daily_keys_if_needed()

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

                consumed = profile.consume_key()
                if not consumed:
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

        consumed = _consume_guest_key(request)
        if not consumed:
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


def privacy_view(request):
    context = _build_nav_context(request)
    return render(request, "core/privacy.html", context)


def terms_view(request):
    context = _build_nav_context(request)
    return render(request, "core/terms.html", context)


def refund_view(request):
    context = _build_nav_context(request)
    return render(request, "core/refund.html", context)