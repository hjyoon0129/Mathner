from django.shortcuts import render
from django.urls import reverse

from apps.core.views import _build_game_page_context


def aura_play_view(request):
    context = _build_game_page_context(request, play_avatar_enabled=True)
    return render(request, "game/aura_play.html", context)


def math_rain_view(request):
    context = _build_game_page_context(request, play_avatar_enabled=True)

    context["page_cfg"] = {
        "isAuthenticated": request.user.is_authenticated,
        "initialStars": context.get("nav_star_count", context.get("total_stars", 0)),
        "initialKeys": context.get("nav_key_count", context.get("remaining_keys", 0)),
        "startRunUrl": reverse("core:start_game_run"),
        "finalizeRunUrl": reverse("core:save_game_result"),
    }
    return render(request, "game/Math_rain.html", context)