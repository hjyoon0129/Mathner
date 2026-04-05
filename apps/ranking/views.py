import json

from django.apps import apps
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.db.models import Sum, Max, Q
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_GET, require_POST

from apps.core.models import UserGameProfile
from apps.ranking.models import GameScore

User = get_user_model()


def ranking_home(request):
    return render(request, "ranking/ranking.html")


def _display_name(user):
    try:
        profile = UserGameProfile.objects.filter(user=user).first()
    except Exception:
        profile = None

    nickname = getattr(profile, "nickname", None) if profile else None
    username = getattr(user, "username", None) if user else None
    email_prefix = ((getattr(user, "email", "") or "").split("@")[0]) if user else ""

    return nickname or username or email_prefix or "User"


def _get_social_friend_model():
    candidate_names = [
        "FriendRequest",
        "Friendship",
        "Friend",
        "Follow",
        "Relationship",
    ]

    for model_name in candidate_names:
        try:
            model = apps.get_model("social", model_name)
            if model is not None:
                return model
        except Exception:
            continue
    return None


def _accepted_friend_user_ids(user):
    friend_model = _get_social_friend_model()
    if friend_model is None:
        return set()

    friend_ids = set()
    field_names = {f.name for f in friend_model._meta.get_fields()}

    try:
        if {"from_user", "to_user"}.issubset(field_names):
            qs = friend_model.objects.filter(Q(from_user=user) | Q(to_user=user))
            if "status" in field_names:
                qs = qs.filter(status="accepted")

            for item in qs:
                if getattr(item, "from_user_id", None) == user.id:
                    if getattr(item, "to_user_id", None):
                        friend_ids.add(item.to_user_id)
                else:
                    if getattr(item, "from_user_id", None):
                        friend_ids.add(item.from_user_id)
            return friend_ids

        if {"requester", "receiver"}.issubset(field_names):
            qs = friend_model.objects.filter(Q(requester=user) | Q(receiver=user))
            if "status" in field_names:
                qs = qs.filter(status="accepted")

            for item in qs:
                if getattr(item, "requester_id", None) == user.id:
                    if getattr(item, "receiver_id", None):
                        friend_ids.add(item.receiver_id)
                else:
                    if getattr(item, "requester_id", None):
                        friend_ids.add(item.requester_id)
            return friend_ids

        if {"user", "friend"}.issubset(field_names):
            qs = friend_model.objects.filter(Q(user=user) | Q(friend=user))
            if "status" in field_names:
                qs = qs.filter(status="accepted")

            for item in qs:
                if getattr(item, "user_id", None) == user.id:
                    if getattr(item, "friend_id", None):
                        friend_ids.add(item.friend_id)
                else:
                    if getattr(item, "user_id", None):
                        friend_ids.add(item.user_id)
            return friend_ids

        if {"user1", "user2"}.issubset(field_names):
            qs = friend_model.objects.filter(Q(user1=user) | Q(user2=user))
            if "status" in field_names:
                qs = qs.filter(status="accepted")

            for item in qs:
                if getattr(item, "user1_id", None) == user.id:
                    if getattr(item, "user2_id", None):
                        friend_ids.add(item.user2_id)
                else:
                    if getattr(item, "user1_id", None):
                        friend_ids.add(item.user1_id)
            return friend_ids

    except Exception:
        return set()

    return set()


def _build_rank_entries(user_ids=None):
    qs = GameScore.objects.all()

    if user_ids is not None:
        qs = qs.filter(user_id__in=user_ids)

    rows = (
        qs.values("user_id")
        .annotate(
            total_correct=Sum("correct_count"),
            best_combo=Max("best_combo"),
            total_stars=Sum("earned_stars"),
        )
        .order_by("-total_correct", "-best_combo", "-total_stars", "user_id")
    )

    user_id_list = [row["user_id"] for row in rows]
    user_map = {u.id: u for u in User.objects.filter(id__in=user_id_list)}

    entries = []
    for idx, row in enumerate(rows, start=1):
        user = user_map.get(row["user_id"])
        entries.append(
            {
                "rank": idx,
                "user_id": row["user_id"],
                "nickname": _display_name(user) if user else "User",
                "total_correct": int(row["total_correct"] or 0),
                "best_combo": int(row["best_combo"] or 0),
                "earned_stars": int(row["total_stars"] or 0),
            }
        )
    return entries


@require_GET
def api_leaderboard(request):
    scope = (request.GET.get("scope") or "global").strip().lower()

    if scope == "friends":
        if not request.user.is_authenticated:
            return JsonResponse(
                {"ok": False, "message": "Login required for friend ranking."},
                status=401,
            )

        friend_ids = _accepted_friend_user_ids(request.user)
        visible_ids = set(friend_ids)
        visible_ids.add(request.user.id)

        entries = _build_rank_entries(user_ids=visible_ids)

        return JsonResponse(
            {
                "ok": True,
                "scope": "friends",
                "entries": entries,
            }
        )

    entries = _build_rank_entries()

    return JsonResponse(
        {
            "ok": True,
            "scope": "global",
            "entries": entries,
        }
    )


@login_required
@require_GET
def api_friend_nearby_rank(request):
    friend_ids = _accepted_friend_user_ids(request.user)
    visible_ids = set(friend_ids)
    visible_ids.add(request.user.id)

    entries = _build_rank_entries(user_ids=visible_ids)

    my_index = None
    for i, item in enumerate(entries):
        if item["user_id"] == request.user.id:
            my_index = i
            break

    if my_index is None:
        return JsonResponse(
            {
                "ok": True,
                "my_rank": None,
                "my_score": None,
                "total_count": len(entries),
                "above": None,
                "below": None,
            }
        )

    above = entries[my_index - 1] if my_index - 1 >= 0 else None
    below = entries[my_index + 1] if my_index + 1 < len(entries) else None
    mine = entries[my_index]

    return JsonResponse(
        {
            "ok": True,
            "my_rank": mine["rank"],
            "my_score": mine["total_correct"],
            "total_count": len(entries),
            "above": above,
            "below": below,
        }
    )


@login_required
@require_POST
def api_record_score(request):
    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse(
            {"ok": False, "message": "Invalid JSON body."},
            status=400,
        )

    game_mode = (data.get("game_mode") or "practice").strip().lower()
    operation = (data.get("operation") or "mixed").strip().lower()

    valid_modes = {"practice", "classic", "challenge"}
    valid_operations = {"add", "sub", "mul", "div", "mixed"}

    if game_mode not in valid_modes:
        game_mode = "practice"

    if operation not in valid_operations:
        operation = "mixed"

    score = max(0, int(data.get("score") or 0))
    correct_count = max(0, int(data.get("correct_count") or 0))
    wrong_count = max(0, int(data.get("wrong_count") or 0))
    earned_stars = max(0, int(data.get("earned_stars") or 0))
    best_combo = max(0, int(data.get("best_combo") or 0))

    GameScore.objects.create(
        user=request.user,
        game_mode=game_mode,
        operation=operation,
        score=score,
        correct_count=correct_count,
        wrong_count=wrong_count,
        earned_stars=earned_stars,
        best_combo=best_combo,
    )

    return JsonResponse({"ok": True})