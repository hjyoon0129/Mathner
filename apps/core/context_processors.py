from apps.core.models import UserGameProfile, DEFAULT_DAILY_KEYS


def profile_context(request):
    needs_nickname = False
    my_nickname = ""
    nav_star_count = 0
    nav_key_count = DEFAULT_DAILY_KEYS

    if request.user.is_authenticated:
        try:
            profile, _ = UserGameProfile.objects.get_or_create(user=request.user)

            my_nickname = (
                profile.nickname
                or request.user.username
                or getattr(request.user, "email", "")
                or "User"
            )
            nav_star_count = int(profile.total_stars or 0)
            nav_key_count = profile.get_remaining_keys()
            needs_nickname = not bool(profile.nickname or request.user.username)

        except Exception:
            needs_nickname = False
            my_nickname = getattr(request.user, "username", "") or getattr(request.user, "email", "") or "User"
            nav_star_count = 0
            nav_key_count = 0

    return {
        "needs_nickname": needs_nickname,
        "my_nickname": my_nickname,
        "nav_star_count": nav_star_count,
        "nav_key_count": nav_key_count,
    }