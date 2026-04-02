import json
import re

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_POST

from apps.core.models import UserGameProfile


@login_required
@require_POST
def save_nickname(request):
    try:
        data = json.loads(request.body.decode("utf-8"))
    except Exception:
        return JsonResponse({"ok": False, "message": "Invalid JSON."}, status=400)

    nickname = (data.get("nickname") or "").strip()

    if not nickname:
        return JsonResponse({"ok": False, "message": "Please enter a nickname."}, status=400)

    if not re.fullmatch(r"[A-Za-z0-9_가-힣]{2,20}", nickname):
        return JsonResponse(
            {"ok": False, "message": "Use 2-20 letters, numbers, or underscores only."},
            status=400,
        )

    profile, _ = UserGameProfile.objects.get_or_create(user=request.user)

    if UserGameProfile.objects.exclude(user=request.user).filter(nickname__iexact=nickname).exists():
        return JsonResponse({"ok": False, "message": "This nickname is already taken."}, status=400)

    current_nickname = (profile.nickname or "").strip()
    is_first_set = not bool(current_nickname)
    is_actual_change = bool(current_nickname) and current_nickname.lower() != nickname.lower()

    if is_actual_change and not profile.can_change_nickname():
        remaining_days = profile.get_nickname_change_remaining_days()
        available_at = profile.get_nickname_change_available_at()
        return JsonResponse(
            {
                "ok": False,
                "message": f"You can change your nickname again in {remaining_days} day(s).",
                "remaining_days": remaining_days,
                "available_at": available_at.isoformat(),
            },
            status=400,
        )

    profile.nickname = nickname
    if is_first_set or is_actual_change:
        profile.nickname_changed_at = timezone.now()
    profile.save(update_fields=["nickname", "nickname_changed_at", "updated_at"])

    return JsonResponse(
        {
            "ok": True,
            "message": "Nickname saved successfully.",
            "nickname": profile.nickname,
            "next_available_at": profile.get_nickname_change_available_at().isoformat(),
        }
    )