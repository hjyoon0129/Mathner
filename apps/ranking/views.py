import json

from django.apps import apps
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.db.models import Max, Q, Sum
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_GET, require_POST

from apps.core.models import UserGameProfile
from apps.core.views import _build_nav_context
from apps.ranking.models import GameScore

User = get_user_model()

VALID_GAME_TABS = {
    "total",
    "avatar_aura",
    "math_rain",
    "tug_of_war",
}

VALID_GAME_MODES = {
    "practice",
    "classic",
    "challenge",
    "avatar_aura",
    "math_rain",
    "acid_rain",
    "tug_of_war",
}

VALID_OPERATIONS = {"add", "sub", "mul", "div", "mixed"}

GAME_TAB_LABELS = {
    "total": "Total Ranking",
    "avatar_aura": "Avatar Aura",
    "math_rain": "Math Rain",
    "tug_of_war": "Tug of War",
}

GAME_TAB_MODE_MAP = {
    "total": None,
    "avatar_aura": ["practice", "classic", "challenge", "avatar_aura"],
    "math_rain": ["math_rain", "acid_rain"],
    "tug_of_war": ["tug_of_war"],
}


def _display_name(user):
    if not user:
        return "User"

    try:
        profile = UserGameProfile.objects.filter(user=user).first()
    except Exception:
        profile = None

    nickname = None
    if profile:
        if hasattr(profile, "get_display_name"):
            try:
                nickname = profile.get_display_name()
            except Exception:
                nickname = getattr(profile, "nickname", None)
        else:
            nickname = getattr(profile, "nickname", None)

    username = getattr(user, "username", None)
    email_prefix = (getattr(user, "email", "") or "").split("@")[0]

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


def _normalize_mode(raw_mode):
    mode = (raw_mode or "practice").strip().lower()
    if mode == "acid_rain":
        return "math_rain"
    return mode if mode in VALID_GAME_MODES else "practice"


def _normalize_operation(raw_operation):
    operation = (raw_operation or "mixed").strip().lower()
    return operation if operation in VALID_OPERATIONS else "mixed"


def _mode_to_game_tab(mode):
    normalized = _normalize_mode(mode)

    if normalized in {"practice", "classic", "challenge", "avatar_aura"}:
        return "avatar_aura"
    if normalized in {"math_rain", "acid_rain"}:
        return "math_rain"
    if normalized == "tug_of_war":
        return "tug_of_war"
    return "total"


def _normalize_game_tab(raw_game=None, raw_mode=None):
    game = (raw_game or "").strip().lower()
    if game in VALID_GAME_TABS:
        return game

    if raw_mode:
        return _mode_to_game_tab(raw_mode)

    return "total"


def _mode_filters_for_game_tab(game_tab):
    return GAME_TAB_MODE_MAP.get(game_tab)


def _build_rank_entries(user_ids=None, game_tab="total"):
    qs = GameScore.objects.all()

    if user_ids is not None:
        qs = qs.filter(user_id__in=user_ids)

    mode_filters = _mode_filters_for_game_tab(game_tab)
    if mode_filters:
        normalized_modes = [_normalize_mode(mode) for mode in mode_filters]
        qs = qs.filter(game_mode__in=normalized_modes)

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
                "nickname": _display_name(user),
                "total_correct": int(row["total_correct"] or 0),
                "best_combo": int(row["best_combo"] or 0),
                "earned_stars": int(row["total_stars"] or 0),
            }
        )
    return entries


def ranking_home(request):
    selected_game = _normalize_game_tab(
        raw_game=request.GET.get("game"),
        raw_mode=request.GET.get("mode"),
    )

    context = {
        "selected_game": selected_game,
        "selected_game_label": GAME_TAB_LABELS.get(selected_game, "Total Ranking"),
        "game_tabs": [
            {"key": "total", "label": "Total"},
            {"key": "avatar_aura", "label": "Avatar Aura"},
            {"key": "math_rain", "label": "Math Rain"},
        ],
        **_build_nav_context(request),
    }
    return render(request, "ranking/ranking.html", context)


@require_GET
def api_leaderboard(request):
    scope = (request.GET.get("scope") or "global").strip().lower()
    selected_game = _normalize_game_tab(
        raw_game=request.GET.get("game"),
        raw_mode=request.GET.get("mode"),
    )

    if scope == "friends":
        if not request.user.is_authenticated:
            return JsonResponse(
                {"ok": False, "message": "Login required for friend ranking."},
                status=401,
            )

        friend_ids = _accepted_friend_user_ids(request.user)
        visible_ids = set(friend_ids)
        visible_ids.add(request.user.id)

        entries = _build_rank_entries(user_ids=visible_ids, game_tab=selected_game)
        return JsonResponse(
            {
                "ok": True,
                "scope": "friends",
                "game": selected_game,
                "entries": entries,
            }
        )

    entries = _build_rank_entries(game_tab=selected_game)
    return JsonResponse(
        {
            "ok": True,
            "scope": "global",
            "game": selected_game,
            "entries": entries,
        }
    )


@login_required
@require_GET
def api_friend_nearby_rank(request):
    selected_game = _normalize_game_tab(
        raw_game=request.GET.get("game"),
        raw_mode=request.GET.get("mode"),
    )

    friend_ids = _accepted_friend_user_ids(request.user)
    visible_ids = set(friend_ids)
    visible_ids.add(request.user.id)

    entries = _build_rank_entries(user_ids=visible_ids, game_tab=selected_game)

    my_index = None
    for i, item in enumerate(entries):
        if item["user_id"] == request.user.id:
            my_index = i
            break

    if my_index is None:
        return JsonResponse(
            {
                "ok": True,
                "game": selected_game,
                "my_rank": None,
                "my_score": None,
                "total_count": len(entries),
                "above": None,
                "below": None,
                "my_nickname": _display_name(request.user),
            }
        )

    above = entries[my_index - 1] if my_index - 1 >= 0 else None
    below = entries[my_index + 1] if my_index + 1 < len(entries) else None
    mine = entries[my_index]

    return JsonResponse(
        {
            "ok": True,
            "game": selected_game,
            "my_rank": mine["rank"],
            "my_score": mine["total_correct"],
            "total_count": len(entries),
            "above": above,
            "below": below,
            "my_nickname": mine["nickname"],
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

    game_mode = _normalize_mode(data.get("game_mode"))
    operation = _normalize_operation(data.get("operation"))

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

    return JsonResponse(
        {
            "ok": True,
            "mode": game_mode,
            "game": _mode_to_game_tab(game_mode),
        }
    )