import json

from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.db.models import Q, Sum
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST

from apps.core.models import UserGameProfile
from apps.social.models import (
    Friendship,
    RoomDiaryEntry,
    RoomGuestbookEntry,
    RoomLike,
    RoomVisitLog,
)

User = get_user_model()


def _pick_first_nonempty(*values):
    for value in values:
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def _get_related_nickname(obj, attr_name):
    rel = getattr(obj, attr_name, None)
    if not rel:
        return ""
    return (getattr(rel, "nickname", "") or "").strip()


def _get_or_create_game_profile(user):
    profile, _ = UserGameProfile.objects.get_or_create(user=user)
    return profile


def get_display_name(user):
    """
    social API 전체에서 navbar와 같은 닉네임 기준 사용
    """
    if not user:
        return ""

    game_profile_nickname = ""
    try:
        game_profile = getattr(user, "game_profile", None)
        if game_profile is None:
            game_profile = _get_or_create_game_profile(user)
        game_profile_nickname = (getattr(game_profile, "nickname", "") or "").strip()
    except Exception:
        game_profile_nickname = ""

    nickname = _pick_first_nonempty(
        game_profile_nickname,
        getattr(user, "nickname", ""),
        _get_related_nickname(user, "profile"),
        _get_related_nickname(user, "userprofile"),
        _get_related_nickname(user, "social_profile"),
        _get_related_nickname(user, "member_profile"),
        getattr(user, "first_name", ""),
    )

    username = (getattr(user, "username", "") or "").strip()
    return nickname or username or f"user{user.id}"


def get_accepted_friends(user):
    sent_ids = Friendship.objects.filter(
        from_user=user,
        status=Friendship.STATUS_ACCEPTED,
    ).values_list("to_user_id", flat=True)

    received_ids = Friendship.objects.filter(
        to_user=user,
        status=Friendship.STATUS_ACCEPTED,
    ).values_list("from_user_id", flat=True)

    friend_ids = list(sent_ids) + list(received_ids)
    return User.objects.filter(id__in=friend_ids).order_by("username")


def get_friendship_between(user_a, user_b):
    if not user_a or not user_b or user_a == user_b:
        return None

    return Friendship.objects.filter(
        Q(from_user=user_a, to_user=user_b) | Q(from_user=user_b, to_user=user_a)
    ).order_by("-created_at").first()


def are_friends(user_a, user_b):
    friendship = get_friendship_between(user_a, user_b)
    return bool(friendship and friendship.status == Friendship.STATUS_ACCEPTED)


def build_room_stats(room_owner, viewer=None):
    today = timezone.localdate()

    today_visits = (
        RoomVisitLog.objects.filter(room_owner=room_owner, visit_date=today)
        .aggregate(total=Sum("visit_count"))
        .get("total")
        or 0
    )

    total_visits = (
        RoomVisitLog.objects.filter(room_owner=room_owner)
        .aggregate(total=Sum("visit_count"))
        .get("total")
        or 0
    )

    like_count = RoomLike.objects.filter(room_owner=room_owner).count()
    liked_by_me = False

    if viewer and viewer.is_authenticated:
        liked_by_me = RoomLike.objects.filter(room_owner=room_owner, user=viewer).exists()

    return {
        "today_visits": today_visits,
        "total_visits": total_visits,
        "like_count": like_count,
        "liked_by_me": liked_by_me,
    }


@login_required
@require_POST
def create_guestbook_entry_api(request, username):
    room_owner = get_object_or_404(User, username=username)

    try:
        payload = json.loads(request.body.decode("utf-8"))
    except Exception:
        return JsonResponse({"ok": False, "error": "Invalid JSON."}, status=400)

    content = (payload.get("content") or "").strip()
    if not content:
        return JsonResponse({"ok": False, "error": "Please enter a message."}, status=400)

    if len(content) > 300:
        return JsonResponse({"ok": False, "error": "Message is too long."}, status=400)

    entry = RoomGuestbookEntry.objects.create(
        room_owner=room_owner,
        author=request.user,
        content=content,
    )

    return JsonResponse({
        "ok": True,
        "entry": {
            "id": entry.id,
            "author": get_display_name(entry.author),
            "author_username": entry.author.username,
            "author_display_name": get_display_name(entry.author),
            "content": entry.content,
            "created_at": entry.created_at.strftime("%Y-%m-%d %H:%M"),
        }
    })


@login_required
@require_POST
def create_diary_entry_api(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except Exception:
        return JsonResponse({"ok": False, "error": "Invalid JSON."}, status=400)

    title = (payload.get("title") or "").strip()
    content = (payload.get("content") or "").strip()
    visibility = (payload.get("visibility") or RoomDiaryEntry.VISIBILITY_FRIENDS).strip()

    if not title:
        return JsonResponse({"ok": False, "error": "Please enter a title."}, status=400)

    if not content:
        return JsonResponse({"ok": False, "error": "Please enter diary content."}, status=400)

    if visibility not in {
        RoomDiaryEntry.VISIBILITY_PRIVATE,
        RoomDiaryEntry.VISIBILITY_FRIENDS,
        RoomDiaryEntry.VISIBILITY_PUBLIC,
    }:
        return JsonResponse({"ok": False, "error": "Invalid visibility."}, status=400)

    entry = RoomDiaryEntry.objects.create(
        user=request.user,
        title=title,
        content=content,
        visibility=visibility,
    )

    return JsonResponse({
        "ok": True,
        "entry": {
            "id": entry.id,
            "title": entry.title,
            "content": entry.content,
            "visibility": entry.visibility,
            "created_at": entry.created_at.strftime("%Y-%m-%d %H:%M"),
        }
    })


@login_required
@require_GET
def search_users_api(request):
    query = (request.GET.get("q") or "").strip()
    if len(query) < 1:
        return JsonResponse({"ok": True, "results": []})

    users = User.objects.exclude(id=request.user.id).order_by("username")

    results = []
    q = query.lower()

    for user in users:
        display_name = get_display_name(user)
        username = (user.username or "").strip()

        haystack = f"{display_name} {username} {(getattr(user, 'first_name', '') or '').strip()}".lower()
        if q not in haystack:
            continue

        friendship = get_friendship_between(request.user, user)
        status = "none"
        direction = ""

        if friendship:
            status = friendship.status
            if friendship.from_user_id == request.user.id:
                direction = "sent"
            else:
                direction = "received"

        results.append({
            "id": user.id,
            "username": user.username,
            "display_name": display_name,
            "room_url": f"/avatar/room/{user.username}/",
            "friendship_status": status,
            "friendship_direction": direction,
        })

        if len(results) >= 20:
            break

    return JsonResponse({"ok": True, "results": results})


@login_required
@require_POST
def send_friend_request_api(request, username):
    to_user = get_object_or_404(User, username=username)

    if request.user == to_user:
        return JsonResponse({"ok": False, "error": "You cannot add yourself."}, status=400)

    existing = get_friendship_between(request.user, to_user)

    if existing:
        if existing.status == Friendship.STATUS_ACCEPTED:
            return JsonResponse({
                "ok": False,
                "error": "Already friends.",
                "state": "accepted",
            }, status=400)

        if existing.status == Friendship.STATUS_PENDING:
            if existing.from_user_id == request.user.id:
                existing.delete()
                return JsonResponse({
                    "ok": True,
                    "message": "Friend request canceled.",
                    "action": "canceled",
                    "state": "none",
                })

            return JsonResponse({
                "ok": False,
                "error": "This user already sent you a friend request.",
                "state": "incoming",
            }, status=400)

        if existing.status == Friendship.STATUS_REJECTED:
            existing.delete()

    friendship = Friendship.objects.create(
        from_user=request.user,
        to_user=to_user,
        status=Friendship.STATUS_PENDING,
    )

    return JsonResponse({
        "ok": True,
        "message": "Friend request sent.",
        "friendship_id": friendship.id,
        "action": "sent",
        "state": "pending",
    })


@login_required
@require_GET
def my_friend_requests_api(request):
    incoming = Friendship.objects.filter(
        to_user=request.user,
        status=Friendship.STATUS_PENDING,
    ).select_related("from_user").order_by("-created_at")

    data = []
    for item in incoming:
        data.append({
            "id": item.id,
            "from_username": item.from_user.username,
            "from_display_name": get_display_name(item.from_user),
            "created_at": item.created_at.strftime("%Y-%m-%d %H:%M"),
            "room_url": f"/avatar/room/{item.from_user.username}/",
        })

    return JsonResponse({"ok": True, "requests": data})


@login_required
@require_POST
def respond_friend_request_api(request, friendship_id):
    friendship = get_object_or_404(
        Friendship,
        id=friendship_id,
        to_user=request.user,
        status=Friendship.STATUS_PENDING,
    )

    try:
        payload = json.loads(request.body.decode("utf-8"))
    except Exception:
        payload = {}

    action = (payload.get("action") or "").strip().lower()

    if action == "accept":
        friendship.status = Friendship.STATUS_ACCEPTED
    elif action == "reject":
        friendship.status = Friendship.STATUS_REJECTED
    else:
        return JsonResponse({"ok": False, "error": "Invalid action."}, status=400)

    friendship.responded_at = timezone.now()
    friendship.save(update_fields=["status", "responded_at"])

    return JsonResponse({
        "ok": True,
        "status": friendship.status,
        "message": "Updated successfully.",
    })


@login_required
@require_GET
def my_friends_api(request):
    friends = get_accepted_friends(request.user)
    results = []
    for user in friends:
        results.append({
            "username": user.username,
            "display_name": get_display_name(user),
            "room_url": f"/avatar/room/{user.username}/",
        })
    return JsonResponse({"ok": True, "friends": results})


@login_required
@require_GET
def room_directory_api(request):
    users = User.objects.exclude(id=request.user.id).order_by("-date_joined", "username")[:50]
    results = []

    for user in users:
        stats = build_room_stats(user, request.user)
        friendship = get_friendship_between(request.user, user)
        status = friendship.status if friendship else "none"

        results.append({
            "username": user.username,
            "display_name": get_display_name(user),
            "room_url": f"/avatar/room/{user.username}/",
            "friendship_status": status,
            "today_visits": stats["today_visits"],
            "total_visits": stats["total_visits"],
            "like_count": stats["like_count"],
        })

    return JsonResponse({"ok": True, "rooms": results})


@login_required
@require_POST
def record_room_visit_api(request, username):
    room_owner = get_object_or_404(User, username=username)

    if request.user == room_owner:
        return JsonResponse({"ok": True, "skipped": True, "stats": build_room_stats(room_owner, request.user)})

    today = timezone.localdate()

    visit_log, _ = RoomVisitLog.objects.get_or_create(
        room_owner=room_owner,
        visitor=request.user,
        visit_date=today,
        defaults={"visit_count": 0},
    )
    visit_log.visit_count += 1
    visit_log.save(update_fields=["visit_count", "last_visited_at"])

    return JsonResponse({
        "ok": True,
        "stats": build_room_stats(room_owner, request.user),
    })


@login_required
@require_GET
def room_stats_api(request, username):
    room_owner = get_object_or_404(User, username=username)
    return JsonResponse({
        "ok": True,
        "stats": build_room_stats(room_owner, request.user),
    })


@login_required
@require_POST
def toggle_room_like_api(request, username):
    room_owner = get_object_or_404(User, username=username)

    if request.user == room_owner:
        return JsonResponse({"ok": False, "error": "You cannot like your own room."}, status=400)

    like = RoomLike.objects.filter(room_owner=room_owner, user=request.user).first()
    if like:
        like.delete()
        liked = False
    else:
        RoomLike.objects.create(room_owner=room_owner, user=request.user)
        liked = True

    stats = build_room_stats(room_owner, request.user)

    return JsonResponse({
        "ok": True,
        "liked": liked,
        "stats": stats,
    })