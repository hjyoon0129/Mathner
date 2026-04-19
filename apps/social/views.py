from datetime import datetime
import json

from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.core.cache import cache
from django.db import transaction
from django.db.models import F, Prefetch, Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST

from apps.core.models import UserGameProfile
from apps.shop.models import UserFontPreference
from .cache_keys import (
    diary_calendar_key,
    friend_list_key,
    guestbook_list_key,
    room_stats_key,
)
from .models import (
    DiaryEntry,
    Friendship,
    GuestbookEntry,
    GuestbookReply,
    Room,
    RoomLike,
    EFFECT_NONE,
)


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


def _normalize_effect_key(value):
    raw = str(value or "none").strip().lower()
    raw = raw.replace("-", "_").replace(" ", "_")
    return raw if raw in SUPPORTED_EFFECT_KEYS else EFFECT_NONE


def _safe_float(value, default=1.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _clamp_float(value, min_value, max_value):
    return max(min_value, min(max_value, _safe_float(value, min_value)))


def _nickname_map(user_ids):
    if not user_ids:
        return {}

    rows = UserGameProfile.objects.filter(user_id__in=user_ids).values("user_id", "nickname")
    return {
        row["user_id"]: (row["nickname"] or "").strip()
        for row in rows
    }


def _display_name(user, nickname_map=None):
    if not user:
        return "Player"

    nickname = ""
    if nickname_map:
        nickname = (nickname_map.get(user.id) or "").strip()

    first_name = (getattr(user, "first_name", "") or "").strip()
    username = (getattr(user, "username", "") or "").strip()

    return nickname or first_name or username or "Player"


def _font_key_from_item(item):
    if not item:
        return ""
    return (getattr(item, "font_family_key", "") or "").strip()


def _font_pref_map(user_ids):
    if not user_ids:
        return {}

    rows = (
        UserFontPreference.objects
        .select_related("nickname_font_item")
        .filter(user_id__in=user_ids)
    )

    data = {}
    for pref in rows:
        data[pref.user_id] = {
            "nickname_font_key": _font_key_from_item(pref.nickname_font_item),
            "nickname_effect_key": _normalize_effect_key(getattr(pref, "nickname_effect_key", "none")),
            "nickname_scale": float(getattr(pref, "nickname_scale", 1.0) or 1.0),
            "nickname_letter_spacing": float(getattr(pref, "nickname_letter_spacing", 0.0) or 0.0),
        }
    return data


def _get_font_pref(user):
    if not user or not user.is_authenticated:
        return {
            "nickname_font_key": "",
            "title_font_key": "",
            "content_font_key": "",
            "writing_font_key": "",
            "nickname_effect_key": "none",
            "title_effect_key": "none",
            "content_effect_key": "none",
            "nickname_scale": 1.0,
            "nickname_letter_spacing": 0.0,
            "nickname_color": "#ffffff",
            "title_color": "#ffffff",
            "content_color": "#eef4ff",
        }

    pref, _ = UserFontPreference.objects.select_related(
        "nickname_font_item",
        "title_font_item",
        "content_font_item",
    ).get_or_create(user=user)

    nickname_font_key = _font_key_from_item(pref.nickname_font_item)
    title_font_key = _font_key_from_item(pref.title_font_item)
    content_font_key = _font_key_from_item(pref.content_font_item)

    return {
        "nickname_font_key": nickname_font_key,
        "title_font_key": title_font_key,
        "content_font_key": content_font_key,
        "writing_font_key": content_font_key,
        "nickname_effect_key": _normalize_effect_key(getattr(pref, "nickname_effect_key", "none")),
        "title_effect_key": EFFECT_NONE,
        "content_effect_key": EFFECT_NONE,
        "nickname_scale": float(getattr(pref, "nickname_scale", 1.0) or 1.0),
        "nickname_letter_spacing": float(getattr(pref, "nickname_letter_spacing", 0.0) or 0.0),
        "nickname_color": getattr(pref, "nickname_color", "#ffffff") or "#ffffff",
        "title_color": getattr(pref, "title_color", "#ffffff") or "#ffffff",
        "content_color": getattr(pref, "content_color", "#eef4ff") or "#eef4ff",
    }


def _get_or_create_room(user):
    room, _ = Room.objects.get_or_create(owner=user)
    return room


def _room_directory_cache_key(user_id):
    return f"social:room_directory:{user_id}"


def _get_request_data(request):
    content_type = (request.content_type or "").lower()

    if "application/json" in content_type:
        try:
            raw = request.body.decode("utf-8") if request.body else ""
            return json.loads(raw or "{}")
        except Exception:
            return {}

    return request.POST


def _invalidate_friend_caches(*user_ids):
    for user_id in set(filter(None, user_ids)):
        cache.delete(friend_list_key(user_id))
        cache.delete(_room_directory_cache_key(user_id))


def _get_friend_users(user):
    rows = list(
        Friendship.objects
        .select_related("from_user", "to_user")
        .filter(status=Friendship.STATUS_ACCEPTED)
        .filter(Q(from_user=user) | Q(to_user=user))
        .only(
            "id",
            "from_user__id",
            "from_user__username",
            "from_user__first_name",
            "to_user__id",
            "to_user__username",
            "to_user__first_name",
            "created_at",
            "updated_at",
        )
        .order_by("-updated_at", "-created_at")
    )

    friend_users = []
    seen_user_ids = set()

    for row in rows:
        friend = row.to_user if row.from_user_id == user.id else row.from_user
        if not friend or friend.id in seen_user_ids:
            continue
        seen_user_ids.add(friend.id)
        friend_users.append(friend)

    friend_users.sort(key=lambda u: ((u.username or "").lower(), u.id))
    return friend_users


def _sync_room_today_visits(room):
    today = timezone.localdate()

    if room.last_visit_date != today:
        Room.objects.filter(id=room.id).update(
            today_visits=0,
            last_visit_date=today,
        )
        room.today_visits = 0
        room.last_visit_date = today

    return room


def _base_room_stats_payload(room):
    return {
        "today_visits": int(room.today_visits or 0),
        "total_visits": int(room.total_visits or 0),
        "like_count": int(room.like_count or 0),
    }


def _serialize_guestbook_entry_public(entry, nickname_map):
    replies = getattr(entry, "prefetched_replies", [])

    return {
        "id": entry.id,
        "author_id": entry.author_id,
        "author_display_name": _display_name(entry.author, nickname_map),
        "author_room_url": f"/avatar/room/{entry.author.username}/",
        "created_at": timezone.localtime(entry.created_at).strftime("%Y-%m-%d %H:%M"),
        "content": entry.content,
        "nickname_font_key": entry.nickname_font_key or "",
        "nickname_effect_key": _normalize_effect_key(entry.nickname_effect_key),
        "nickname_scale": float(entry.nickname_scale or 1.0),
        "nickname_letter_spacing": float(entry.nickname_letter_spacing or 0.0),
        "content_font_key": entry.content_font_key or "",
        "content_effect_key": EFFECT_NONE,
        "replies": [
            {
                "id": reply.id,
                "author_id": reply.author_id,
                "author_display_name": _display_name(reply.author, nickname_map),
                "author_room_url": f"/avatar/room/{reply.author.username}/",
                "created_at": timezone.localtime(reply.created_at).strftime("%Y-%m-%d %H:%M"),
                "content": reply.content,
                "nickname_font_key": reply.nickname_font_key or "",
                "nickname_effect_key": _normalize_effect_key(reply.nickname_effect_key),
                "nickname_scale": float(reply.nickname_scale or 1.0),
                "nickname_letter_spacing": float(reply.nickname_letter_spacing or 0.0),
                "content_font_key": reply.content_font_key or "",
                "content_effect_key": EFFECT_NONE,
            }
            for reply in replies
        ],
    }


def _apply_guestbook_permissions(public_entry, request_user, room_owner_id):
    entry = {
        "id": public_entry["id"],
        "author_display_name": public_entry["author_display_name"],
        "author_room_url": public_entry["author_room_url"],
        "created_at": public_entry["created_at"],
        "content": public_entry["content"],
        "nickname_font_key": public_entry.get("nickname_font_key", ""),
        "nickname_effect_key": public_entry.get("nickname_effect_key", "none"),
        "nickname_scale": public_entry.get("nickname_scale", 1.0),
        "nickname_letter_spacing": public_entry.get("nickname_letter_spacing", 0.0),
        "content_font_key": public_entry.get("content_font_key", ""),
        "content_effect_key": EFFECT_NONE,
        "can_reply": bool(request_user.is_authenticated),
        "can_delete": bool(
            request_user.is_authenticated and (
                request_user.id == public_entry["author_id"] or request_user.id == room_owner_id
            )
        ),
        "replies": [],
    }

    for reply in public_entry.get("replies", []):
        entry["replies"].append({
            "id": reply["id"],
            "author_display_name": reply["author_display_name"],
            "author_room_url": reply["author_room_url"],
            "created_at": reply["created_at"],
            "content": reply["content"],
            "nickname_font_key": reply.get("nickname_font_key", ""),
            "nickname_effect_key": reply.get("nickname_effect_key", "none"),
            "nickname_scale": reply.get("nickname_scale", 1.0),
            "nickname_letter_spacing": reply.get("nickname_letter_spacing", 0.0),
            "content_font_key": reply.get("content_font_key", ""),
            "content_effect_key": EFFECT_NONE,
            "can_delete": bool(
                request_user.is_authenticated and (
                    request_user.id == reply["author_id"] or request_user.id == room_owner_id
                )
            ),
        })

    return entry


@login_required
def social_hub(request):
    font_pref = _get_font_pref(request.user)
    return render(request, "social/social.html", {
        "nickname_font_key": font_pref["nickname_font_key"],
        "writing_font_key": font_pref["writing_font_key"],
    })


@require_GET
@login_required
def friend_requests(request):
    rows = list(
        Friendship.objects
        .select_related("from_user")
        .filter(to_user=request.user, status=Friendship.STATUS_PENDING)
        .only(
            "id",
            "from_user__id",
            "from_user__username",
            "from_user__first_name",
            "created_at",
        )
        .order_by("-created_at")
    )

    user_ids = [row.from_user_id for row in rows if row.from_user_id]
    nickname_map = _nickname_map(user_ids)
    font_pref_map = _font_pref_map(user_ids)

    data = []
    for row in rows:
        pref = font_pref_map.get(row.from_user_id, {})
        data.append({
            "id": row.id,
            "username": row.from_user.username,
            "display_name": _display_name(row.from_user, nickname_map),
            "room_url": f"/avatar/room/{row.from_user.username}/",
            "created_at": timezone.localtime(row.created_at).strftime("%Y-%m-%d %H:%M"),
            "nickname_font_key": pref.get("nickname_font_key", ""),
            "nickname_effect_key": pref.get("nickname_effect_key", "none"),
            "nickname_scale": pref.get("nickname_scale", 1.0),
            "nickname_letter_spacing": pref.get("nickname_letter_spacing", 0.0),
        })

    return JsonResponse({"ok": True, "requests": data})


@require_GET
@login_required
def friend_list(request):
    cache_key = friend_list_key(request.user.id)
    cached = cache.get(cache_key)
    if cached is not None:
        return JsonResponse({"ok": True, "friends": cached})

    friend_users = _get_friend_users(request.user)
    user_ids = [u.id for u in friend_users]
    nickname_map = _nickname_map(user_ids)
    font_pref_map = _font_pref_map(user_ids)

    friends = []
    for user in friend_users:
        pref = font_pref_map.get(user.id, {})
        friends.append({
            "username": user.username,
            "display_name": _display_name(user, nickname_map),
            "nickname_font_key": pref.get("nickname_font_key", ""),
            "nickname_effect_key": pref.get("nickname_effect_key", "none"),
            "nickname_scale": pref.get("nickname_scale", 1.0),
            "nickname_letter_spacing": pref.get("nickname_letter_spacing", 0.0),
        })

    cache.set(cache_key, friends, timeout=60)
    return JsonResponse({"ok": True, "friends": friends})


@require_GET
@login_required
def room_directory(request):
    cache_key = _room_directory_cache_key(request.user.id)
    cached = cache.get(cache_key)
    if cached is not None:
        return JsonResponse({"ok": True, "rooms": cached})

    users = _get_friend_users(request.user)
    user_ids = [u.id for u in users]
    nickname_map = _nickname_map(user_ids)
    font_pref_map = _font_pref_map(user_ids)

    rooms = []
    for user in users:
        pref = font_pref_map.get(user.id, {})
        rooms.append({
            "username": user.username,
            "display_name": _display_name(user, nickname_map),
            "room_url": f"/avatar/room/{user.username}/",
            "friendship_status": Friendship.STATUS_ACCEPTED,
            "nickname_font_key": pref.get("nickname_font_key", ""),
            "nickname_effect_key": pref.get("nickname_effect_key", "none"),
            "nickname_scale": pref.get("nickname_scale", 1.0),
            "nickname_letter_spacing": pref.get("nickname_letter_spacing", 0.0),
        })

    cache.set(cache_key, rooms, timeout=60)
    return JsonResponse({"ok": True, "rooms": rooms})


@require_POST
@login_required
def friend_request_toggle(request, username):
    target = get_object_or_404(User, username=username)

    if target == request.user:
        return JsonResponse({"ok": False, "error": "You cannot add yourself."}, status=400)

    existing = Friendship.objects.filter(
        from_user=request.user,
        to_user=target,
    ).first()

    reverse_existing = Friendship.objects.filter(
        from_user=target,
        to_user=request.user,
    ).first()

    if reverse_existing and reverse_existing.status == Friendship.STATUS_ACCEPTED:
        return JsonResponse({"ok": True, "action": "already_friends"})

    if existing:
        if existing.status == Friendship.STATUS_PENDING:
            existing.delete()
            _invalidate_friend_caches(request.user.id, target.id)
            return JsonResponse({"ok": True, "action": "canceled"})

        if existing.status == Friendship.STATUS_ACCEPTED:
            return JsonResponse({"ok": True, "action": "already_friends"})

        existing.status = Friendship.STATUS_PENDING
        existing.save(update_fields=["status", "updated_at"])
        _invalidate_friend_caches(request.user.id, target.id)
        return JsonResponse({"ok": True, "action": "sent"})

    Friendship.objects.create(
        from_user=request.user,
        to_user=target,
        status=Friendship.STATUS_PENDING,
    )
    _invalidate_friend_caches(request.user.id, target.id)
    return JsonResponse({"ok": True, "action": "sent"})


@require_POST
@login_required
def friend_request_respond(request, friendship_id):
    payload = _get_request_data(request)
    action = str(payload.get("action", "")).strip().lower()

    friendship = get_object_or_404(
        Friendship.objects.select_related("from_user", "to_user"),
        id=friendship_id,
        to_user=request.user,
        status=Friendship.STATUS_PENDING,
    )

    if action == "accept":
        friendship.status = Friendship.STATUS_ACCEPTED
        friendship.save(update_fields=["status", "updated_at"])
        _invalidate_friend_caches(friendship.from_user_id, friendship.to_user_id)
        return JsonResponse({"ok": True, "action": "accepted"})

    if action == "reject":
        friendship.status = Friendship.STATUS_REJECTED
        friendship.save(update_fields=["status", "updated_at"])
        _invalidate_friend_caches(friendship.from_user_id, friendship.to_user_id)
        return JsonResponse({"ok": True, "action": "rejected"})

    return JsonResponse({"ok": False, "error": "Invalid action."}, status=400)


@require_GET
def room_stats_api(request, username):
    room = get_object_or_404(
        Room.objects.select_related("owner").only(
            "id",
            "owner__id",
            "owner__username",
            "today_visits",
            "total_visits",
            "like_count",
            "last_visit_date",
        ),
        owner__username=username,
    )

    room = _sync_room_today_visits(room)
    base_stats = _base_room_stats_payload(room)
    cache.set(room_stats_key(username), base_stats, timeout=20)

    liked_by_me = False
    if request.user.is_authenticated:
        liked_by_me = RoomLike.objects.filter(
            room__owner__username=username,
            user=request.user,
        ).exists()

    stats = {
        **base_stats,
        "liked_by_me": liked_by_me,
    }
    return JsonResponse({"ok": True, "stats": stats})


@require_POST
@login_required
def room_like_toggle_api(request, username):
    room = get_object_or_404(
        Room.objects.select_related("owner").only(
            "id",
            "owner__username",
            "today_visits",
            "total_visits",
            "like_count",
            "last_visit_date",
        ),
        owner__username=username,
    )

    room = _sync_room_today_visits(room)

    with transaction.atomic():
        deleted_count, _ = RoomLike.objects.filter(room_id=room.id, user_id=request.user.id).delete()

        if deleted_count:
            Room.objects.filter(id=room.id).update(like_count=F("like_count") - 1)
            liked_by_me = False
        else:
            RoomLike.objects.create(room_id=room.id, user_id=request.user.id)
            Room.objects.filter(id=room.id).update(like_count=F("like_count") + 1)
            liked_by_me = True

    room.refresh_from_db(fields=["today_visits", "total_visits", "like_count", "last_visit_date"])
    cache.delete(room_stats_key(username))

    stats = {
        **_base_room_stats_payload(room),
        "liked_by_me": liked_by_me,
    }
    return JsonResponse({"ok": True, "stats": stats})


@require_POST
def room_visit_api(request, username):
    room = get_object_or_404(
        Room.objects.select_related("owner").only(
            "id",
            "owner__username",
            "today_visits",
            "total_visits",
            "like_count",
            "last_visit_date",
        ),
        owner__username=username,
    )

    room = _sync_room_today_visits(room)
    today = timezone.localdate()

    Room.objects.filter(id=room.id).update(
        today_visits=F("today_visits") + 1,
        total_visits=F("total_visits") + 1,
        last_visit_date=today,
    )
    room.refresh_from_db(fields=["today_visits", "total_visits", "like_count", "last_visit_date"])
    cache.delete(room_stats_key(username))

    liked_by_me = False
    if request.user.is_authenticated:
        liked_by_me = RoomLike.objects.filter(room_id=room.id, user_id=request.user.id).exists()

    stats = {
        **_base_room_stats_payload(room),
        "liked_by_me": liked_by_me,
    }
    return JsonResponse({"ok": True, "stats": stats})


@require_GET
def guestbook_list_api(request, username):
    cache_key = guestbook_list_key(username)
    cached = cache.get(cache_key)

    if cached is None:
        room = get_object_or_404(
            Room.objects.select_related("owner").only("id", "owner__id", "owner__username"),
            owner__username=username,
        )

        reply_qs = (
            GuestbookReply.objects
            .select_related("author")
            .only(
                "id",
                "entry_id",
                "author__id",
                "author__username",
                "author__first_name",
                "content",
                "nickname_font_key",
                "nickname_effect_key",
                "nickname_scale",
                "nickname_letter_spacing",
                "content_font_key",
                "content_effect_key",
                "created_at",
            )
            .order_by("created_at")
        )

        entries = list(
            GuestbookEntry.objects
            .select_related("room", "room__owner", "author")
            .prefetch_related(
                Prefetch("replies", queryset=reply_qs, to_attr="prefetched_replies")
            )
            .only(
                "id",
                "room__id",
                "room__owner__id",
                "room__owner__username",
                "author__id",
                "author__username",
                "author__first_name",
                "content",
                "nickname_font_key",
                "nickname_effect_key",
                "nickname_scale",
                "nickname_letter_spacing",
                "content_font_key",
                "content_effect_key",
                "created_at",
            )
            .filter(room=room)
            .order_by("-created_at")[:20]
        )

        user_ids = set()
        for entry in entries:
            if entry.author_id:
                user_ids.add(entry.author_id)
            for reply in getattr(entry, "prefetched_replies", []):
                if reply.author_id:
                    user_ids.add(reply.author_id)

        nickname_map = _nickname_map(list(user_ids))
        public_entries = [_serialize_guestbook_entry_public(entry, nickname_map) for entry in entries]

        cached = {
            "room_owner_id": room.owner_id,
            "entries": public_entries,
        }
        cache.set(cache_key, cached, timeout=15)

    room_owner_id = cached["room_owner_id"]
    public_entries = cached["entries"]

    data = [
        _apply_guestbook_permissions(entry, request.user, room_owner_id)
        for entry in public_entries
    ]

    return JsonResponse({"ok": True, "entries": data})


@require_POST
@login_required
def guestbook_create_api(request, username):
    room = get_object_or_404(Room.objects.select_related("owner"), owner__username=username)
    payload = _get_request_data(request)
    content = str(payload.get("content", "")).strip()

    if not content:
        return JsonResponse({"ok": False, "error": "Message is required."}, status=400)

    GuestbookEntry.objects.create(
        room=room,
        author=request.user,
        content=content,
        nickname_font_key=str(payload.get("nickname_font_key", "") or "").strip(),
        nickname_effect_key=_normalize_effect_key(payload.get("nickname_effect_key")),
        nickname_scale=_clamp_float(payload.get("nickname_scale"), 0.8, 1.6),
        nickname_letter_spacing=_clamp_float(payload.get("nickname_letter_spacing"), -1.0, 6.0),
        content_font_key=str(payload.get("content_font_key", "") or "").strip(),
        content_effect_key=EFFECT_NONE,
    )
    cache.delete(guestbook_list_key(username))
    return JsonResponse({"ok": True})


@require_POST
@login_required
def guestbook_delete_api(request, entry_id):
    entry = get_object_or_404(
        GuestbookEntry.objects.select_related("room", "room__owner", "author"),
        id=entry_id,
    )

    if request.user != entry.author and request.user != entry.room.owner:
        return JsonResponse({"ok": False, "error": "Permission denied."}, status=403)

    username = entry.room.owner.username
    entry.delete()
    cache.delete(guestbook_list_key(username))
    return JsonResponse({"ok": True})


@require_POST
@login_required
def guestbook_reply_create_api(request, entry_id):
    entry = get_object_or_404(
        GuestbookEntry.objects.select_related("room", "room__owner"),
        id=entry_id,
    )
    payload = _get_request_data(request)
    content = str(payload.get("content", "")).strip()

    if not content:
        return JsonResponse({"ok": False, "error": "Reply is required."}, status=400)

    GuestbookReply.objects.create(
        entry=entry,
        author=request.user,
        content=content,
        nickname_font_key=str(payload.get("nickname_font_key", "") or "").strip(),
        nickname_effect_key=_normalize_effect_key(payload.get("nickname_effect_key")),
        nickname_scale=_clamp_float(payload.get("nickname_scale"), 0.8, 1.6),
        nickname_letter_spacing=_clamp_float(payload.get("nickname_letter_spacing"), -1.0, 6.0),
        content_font_key=str(payload.get("content_font_key", "") or "").strip(),
        content_effect_key=EFFECT_NONE,
    )
    cache.delete(guestbook_list_key(entry.room.owner.username))
    return JsonResponse({"ok": True})


@require_POST
@login_required
def guestbook_reply_delete_api(request, reply_id):
    reply = get_object_or_404(
        GuestbookReply.objects.select_related("entry", "entry__room", "entry__room__owner", "author"),
        id=reply_id,
    )

    if request.user != reply.author and request.user != reply.entry.room.owner:
        return JsonResponse({"ok": False, "error": "Permission denied."}, status=403)

    username = reply.entry.room.owner.username
    reply.delete()
    cache.delete(guestbook_list_key(username))
    return JsonResponse({"ok": True})


@login_required
@require_POST
def diary_create_api(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except Exception:
        return JsonResponse({"ok": False, "error": "Invalid JSON payload."}, status=400)

    room = get_object_or_404(Room, owner=request.user)

    title = (payload.get("title") or "").strip()
    content = (payload.get("content") or "").strip()
    entry_date_raw = (payload.get("entry_date") or "").strip()

    if not title or not content or not entry_date_raw:
        return JsonResponse({"ok": False, "error": "Title, content, and entry date are required."}, status=400)

    try:
        entry_date = datetime.strptime(entry_date_raw, "%Y-%m-%d").date()
    except ValueError:
        return JsonResponse({"ok": False, "error": "Invalid entry date."}, status=400)

    entry, created = DiaryEntry.objects.update_or_create(
        room=room,
        entry_date=entry_date,
        defaults={
            "title": title,
            "content": content,
            "title_font_key": str(payload.get("title_font_key", "") or "").strip(),
            "title_effect_key": _normalize_effect_key(payload.get("title_effect_key")),
            "content_font_key": str(payload.get("content_font_key", "") or "").strip(),
            "content_effect_key": EFFECT_NONE,
        },
    )

    cache.delete(diary_calendar_key(request.user.username, entry_date.year, entry_date.month))

    return JsonResponse({
        "ok": True,
        "entry": {
            "id": entry.id,
            "title": entry.title,
            "content": entry.content,
            "entry_date": entry.entry_date.strftime("%Y-%m-%d"),
            "title_font_key": entry.title_font_key or "",
            "title_effect_key": _normalize_effect_key(entry.title_effect_key),
            "content_font_key": entry.content_font_key or "",
            "content_effect_key": EFFECT_NONE,
            "can_delete": True,
        },
        "created": created,
    })


@login_required
@require_POST
def diary_update_api(request, entry_id):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except Exception:
        return JsonResponse({"ok": False, "error": "Invalid JSON payload."}, status=400)

    room = get_object_or_404(Room, owner=request.user)
    entry = get_object_or_404(DiaryEntry, id=entry_id, room=room)

    title = (payload.get("title") or "").strip()
    content = (payload.get("content") or "").strip()
    entry_date_raw = (payload.get("entry_date") or "").strip()

    if not title or not content or not entry_date_raw:
        return JsonResponse({"ok": False, "error": "Title, content, and entry date are required."}, status=400)

    try:
        entry_date = datetime.strptime(entry_date_raw, "%Y-%m-%d").date()
    except ValueError:
        return JsonResponse({"ok": False, "error": "Invalid entry date."}, status=400)

    old_date = entry.entry_date

    entry.title = title
    entry.content = content
    entry.entry_date = entry_date
    entry.title_font_key = str(payload.get("title_font_key", "") or "").strip()
    entry.title_effect_key = _normalize_effect_key(payload.get("title_effect_key"))
    entry.content_font_key = str(payload.get("content_font_key", "") or "").strip()
    entry.content_effect_key = EFFECT_NONE
    entry.save(update_fields=[
        "title",
        "content",
        "entry_date",
        "title_font_key",
        "title_effect_key",
        "content_font_key",
        "content_effect_key",
        "updated_at",
    ])

    cache.delete(diary_calendar_key(request.user.username, old_date.year, old_date.month))
    cache.delete(diary_calendar_key(request.user.username, entry_date.year, entry_date.month))

    return JsonResponse({
        "ok": True,
        "entry": {
            "id": entry.id,
            "title": entry.title,
            "content": entry.content,
            "entry_date": entry.entry_date.strftime("%Y-%m-%d"),
            "title_font_key": entry.title_font_key or "",
            "title_effect_key": _normalize_effect_key(entry.title_effect_key),
            "content_font_key": entry.content_font_key or "",
            "content_effect_key": EFFECT_NONE,
            "can_delete": True,
        },
    })


@login_required
@require_POST
def diary_delete_api(request, entry_id):
    room = get_object_or_404(Room, owner=request.user)
    entry = get_object_or_404(DiaryEntry, id=entry_id, room=room)

    entry_date = entry.entry_date
    entry.delete()

    cache.delete(diary_calendar_key(request.user.username, entry_date.year, entry_date.month))
    return JsonResponse({"ok": True})


@require_GET
def diary_calendar_api(request, username):
    year = int(request.GET.get("year"))
    month = int(request.GET.get("month"))

    cache_key = diary_calendar_key(username, year, month)
    cached = cache.get(cache_key)
    if cached is not None:
        return JsonResponse({"ok": True, "days": cached})

    room = get_object_or_404(Room.objects.select_related("owner"), owner__username=username)
    rows = (
        DiaryEntry.objects
        .filter(room=room, entry_date__year=year, entry_date__month=month)
        .values_list("entry_date", flat=True)
        .distinct()
    )
    days = [{"date": d.strftime("%Y-%m-%d")} for d in rows]
    cache.set(cache_key, days, timeout=30)
    return JsonResponse({"ok": True, "days": days})


@require_GET
def diary_entry_by_date_api(request, username, date_str):
    room = get_object_or_404(Room.objects.select_related("owner"), owner__username=username)

    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return JsonResponse({"ok": False, "error": "Invalid date."}, status=400)

    entry = (
        DiaryEntry.objects
        .filter(room=room, entry_date=target_date)
        .order_by("-created_at")
        .first()
    )

    if not entry:
        return JsonResponse({"ok": False, "entry": None}, status=200)

    return JsonResponse({
        "ok": True,
        "entry": {
            "id": entry.id,
            "title": entry.title,
            "content": entry.content,
            "entry_date": entry.entry_date.strftime("%Y-%m-%d"),
            "title_font_key": entry.title_font_key or "",
            "title_effect_key": _normalize_effect_key(entry.title_effect_key),
            "content_font_key": entry.content_font_key or "",
            "content_effect_key": EFFECT_NONE,
            "can_delete": bool(request.user.is_authenticated and request.user == room.owner),
        }
    })


def diary_date_api(request, username, date_str):
    return diary_entry_by_date_api(request, username, date_str)