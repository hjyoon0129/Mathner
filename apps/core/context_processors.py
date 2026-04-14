from apps.core.models import UserGameProfile, DEFAULT_DAILY_KEYS


ACTIVE_RUN_SESSION_KEY = "active_math_run_consumed"
GUEST_KEYS_SESSION_KEY = "guest_remaining_keys"
GUEST_KEYS_DATE_SESSION_KEY = "guest_keys_updated_at"
GUEST_STARS_SESSION_KEY = "guest_total_stars"
GUEST_BEST_SCORE_SESSION_KEY = "guest_best_score"
GUEST_TOTAL_CORRECT_SESSION_KEY = "guest_total_correct"


def _clean_text(value):
    if value is None:
        return ""
    return str(value).strip()


def _email_prefix(user):
    email = _clean_text(getattr(user, "email", ""))
    if email and "@" in email:
        return email.split("@", 1)[0]
    return email


def _get_display_name(user, profile=None):
    if not user or not user.is_authenticated:
        return "Guest"

    nickname = ""
    username = _clean_text(getattr(user, "username", ""))
    email_prefix = _email_prefix(user)

    if profile is not None:
        nickname = _clean_text(getattr(profile, "nickname", ""))

    if nickname:
        return nickname
    if email_prefix:
        return email_prefix
    if username:
        return username
    return "User"


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


def _get_guest_total_stars(request):
    return int(request.session.get(GUEST_STARS_SESSION_KEY, 0) or 0)


def _get_cached_game_profile(request):
    if not getattr(request, "user", None) or not request.user.is_authenticated:
        return None

    if hasattr(request, "_cached_game_profile"):
        return request._cached_game_profile

    profile, _ = UserGameProfile.objects.get_or_create(user=request.user)
    profile.refresh_daily_keys_if_needed()
    request._cached_game_profile = profile
    return profile


def profile_context(request):
    if hasattr(request, "_cached_profile_context"):
        return request._cached_profile_context

    needs_nickname = False
    my_nickname = "Guest"
    nav_star_count = _get_guest_total_stars(request)
    nav_key_count = _get_guest_remaining_keys(request)

    if request.user.is_authenticated:
        try:
            profile = _get_cached_game_profile(request)
            my_nickname = _get_display_name(request.user, profile)
            nav_star_count = int(getattr(profile, "total_stars", 0) or 0)
            nav_key_count = int(profile.get_remaining_keys() or 0)
            needs_nickname = not bool(_clean_text(getattr(profile, "nickname", "")))
        except Exception:
            my_nickname = _get_display_name(request.user, None)
            nav_star_count = 0
            nav_key_count = DEFAULT_DAILY_KEYS
            needs_nickname = False

    context = {
        "needs_nickname": needs_nickname,
        "my_nickname": my_nickname,
        "nav_star_count": nav_star_count,
        "nav_key_count": nav_key_count,
    }
    request._cached_profile_context = context
    return context