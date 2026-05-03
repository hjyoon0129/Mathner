from datetime import datetime
import hashlib
import json
import re

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
    RoomVisit,
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


def _normalize_effect_key(value):
    raw = str(value or "none").strip().lower()
    raw = raw.replace("-", "_").replace(" ", "_")
    return raw if raw in SUPPORTED_EFFECT_KEYS else EFFECT_NONE


def _slugify_font_key(value):
    raw = str(value or "").strip().lower()
    raw = raw.replace("-", "_").replace(" ", "_")
    raw = re.sub(r"[^a-z0-9_]+", "", raw)
    raw = re.sub(r"_+", "_", raw).strip("_")
    return raw


def _font_key_from_item(item):
    if not item:
        return ""

    candidates = [
        getattr(item, "font_family_key", ""),
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
    email = (getattr(user, "email", "") or "").strip()

    if email and "@" in email:
        email = email.split("@", 1)[0]

    return nickname or first_name or username or email or "Player"


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
            "nickname_effect_key": EFFECT_NONE,
            "title_effect_key": EFFECT_NONE,
            "content_effect_key": EFFECT_NONE,
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


def _room_directory_cache_key(user_id, query=""):
    q = str(query or "").strip().lower()
    return f"social:room_directory:{user_id}:{q}"


def _get_request_data(request):
    content_type = (request.content_type or "").lower()

    if "application/json" in content_type:
        try:
            raw = request.body.decode("utf-8") if request.body else ""
            return json.loads(raw or "{}")
        except Exception:
            return {}

    return request.POST


def _get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()

    return (
        request.META.get("HTTP_CF_CONNECTING_IP")
        or request.META.get("HTTP_X_REAL_IP")
        or request.META.get("REMOTE_ADDR")
        or ""
    ).strip()


def _daily_visit_identity(request):
    if request.user.is_authenticated:
        return {
            "viewer_id": request.user.id,
            "guest_token": "",
        }

    ip = _get_client_ip(request)
    user_agent = (request.META.get("HTTP_USER_AGENT") or "").strip()
    raw = f"{ip}|{user_agent}"
    guest_token = hashlib.sha256(raw.encode("utf-8")).hexdigest() if raw else ""

    return {
        "viewer_id": None,
        "guest_token": guest_token,
    }


def _invalidate_friend_caches(*user_ids):
    for user_id in set(filter(None, user_ids)):
        cache.delete(friend_list_key(user_id))
        cache.delete(_room_directory_cache_key(user_id, ""))


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


def _normalize_directory_query(raw_query):
    return str(raw_query or "").strip()


def _friendship_state_between(me, target_user):
    if (
        not me
        or not getattr(me, "is_authenticated", False)
        or not target_user
        or me.id == target_user.id
    ):
        return {
            "friendship_id": "",
            "friendship_status": "none",
            "friendship_direction": "none",
        }

    row = (
        Friendship.objects
        .filter(
            Q(from_user=me, to_user=target_user)
            | Q(from_user=target_user, to_user=me)
        )
        .order_by("-updated_at", "-created_at", "-id")
        .first()
    )

    if not row:
        return {
            "friendship_id": "",
            "friendship_status": "none",
            "friendship_direction": "none",
        }

    if row.status == Friendship.STATUS_ACCEPTED:
        direction = "none"
    else:
        direction = "outgoing" if row.from_user_id == me.id else "incoming"

    return {
        "friendship_id": row.id,
        "friendship_status": row.status,
        "friendship_direction": direction,
    }


def _directory_friendship_map(me, target_user_ids):
    if not target_user_ids:
        return {}

    rows = (
        Friendship.objects
        .filter(
            Q(from_user=me, to_user_id__in=target_user_ids)
            | Q(to_user=me, from_user_id__in=target_user_ids)
        )
        .only("id", "from_user_id", "to_user_id", "status", "created_at", "updated_at")
        .order_by("-updated_at", "-created_at", "-id")
    )

    data = {}

    for row in rows:
        other_user_id = row.to_user_id if row.from_user_id == me.id else row.from_user_id

        if other_user_id in data:
            continue

        if row.status == Friendship.STATUS_ACCEPTED:
            direction = "none"
        else:
            direction = "outgoing" if row.from_user_id == me.id else "incoming"

        data[other_user_id] = {
            "friendship_id": row.id,
            "friendship_status": row.status,
            "friendship_direction": direction,
        }

    return data


def _serialize_directory_user(user, nickname_map, font_pref_map, friendship_map):
    pref = font_pref_map.get(user.id, {})
    relation = friendship_map.get(user.id, {})

    return {
        "id": user.id,
        "username": user.username,
        "display_name": _display_name(user, nickname_map),
        "room_url": f"/avatar/room/{user.username}/",
        "friendship_id": relation.get("friendship_id") or "",
        "friendship_status": relation.get("friendship_status", "none"),
        "friendship_direction": relation.get("friendship_direction", "none"),
        "nickname_font_key": pref.get("nickname_font_key", ""),
        "font_key": pref.get("nickname_font_key", ""),
        "font_family_key": pref.get("nickname_font_key", ""),
        "nickname_effect_key": pref.get("nickname_effect_key", EFFECT_NONE),
        "effect_key": pref.get("nickname_effect_key", EFFECT_NONE),
        "nickname_scale": pref.get("nickname_scale", 1.0),
        "nickname_letter_spacing": pref.get("nickname_letter_spacing", 0.0),
    }


def _serialize_friendship_response(me, target_user, action):
    state = _friendship_state_between(me, target_user)

    return {
        "ok": True,
        "action": action,
        "target_username": target_user.username,
        "friendship": state,
        "friendship_id": state["friendship_id"],
        "friendship_status": state["friendship_status"],
        "friendship_direction": state["friendship_direction"],
    }


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
        "nickname_effect_key": public_entry.get("nickname_effect_key", EFFECT_NONE),
        "nickname_scale": public_entry.get("nickname_scale", 1.0),
        "nickname_letter_spacing": public_entry.get("nickname_letter_spacing", 0.0),
        "content_font_key": public_entry.get("content_font_key", ""),
        "content_effect_key": EFFECT_NONE,
        "can_reply": bool(request_user.is_authenticated),
        "can_delete": bool(
            request_user.is_authenticated and (
                request_user.id == public_entry["author_id"]
                or request_user.id == room_owner_id
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
            "nickname_effect_key": reply.get("nickname_effect_key", EFFECT_NONE),
            "nickname_scale": reply.get("nickname_scale", 1.0),
            "nickname_letter_spacing": reply.get("nickname_letter_spacing", 0.0),
            "content_font_key": reply.get("content_font_key", ""),
            "content_effect_key": EFFECT_NONE,
            "can_delete": bool(
                request_user.is_authenticated and (
                    request_user.id == reply["author_id"]
                    or request_user.id == room_owner_id
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
        "nickname_effect_key": font_pref["nickname_effect_key"],
        "nickname_scale": font_pref["nickname_scale"],
        "nickname_letter_spacing": font_pref["nickname_letter_spacing"],
        "font_pref_json": json.dumps(font_pref, ensure_ascii=False),
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
            "font_key": pref.get("nickname_font_key", ""),
            "font_family_key": pref.get("nickname_font_key", ""),
            "nickname_effect_key": pref.get("nickname_effect_key", EFFECT_NONE),
            "effect_key": pref.get("nickname_effect_key", EFFECT_NONE),
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
            "room_url": f"/avatar/room/{user.username}/",
            "nickname_font_key": pref.get("nickname_font_key", ""),
            "font_key": pref.get("nickname_font_key", ""),
            "font_family_key": pref.get("nickname_font_key", ""),
            "nickname_effect_key": pref.get("nickname_effect_key", EFFECT_NONE),
            "effect_key": pref.get("nickname_effect_key", EFFECT_NONE),
            "nickname_scale": pref.get("nickname_scale", 1.0),
            "nickname_letter_spacing": pref.get("nickname_letter_spacing", 0.0),
        })

    cache.set(cache_key, friends, timeout=60)
    return JsonResponse({"ok": True, "friends": friends})


@require_GET
@login_required
def room_directory(request):
    query = _normalize_directory_query(request.GET.get("q", ""))

    users_qs = (
        User.objects
        .filter(is_active=True)
        .exclude(id=request.user.id)
        .only("id", "username", "first_name", "email")
        .order_by("username", "id")
    )

    if query:
        users_qs = users_qs.filter(
            Q(username__icontains=query)
            | Q(first_name__icontains=query)
            | Q(email__icontains=query)
            | Q(usergameprofile__nickname__icontains=query)
        ).distinct()

    users = list(users_qs[:200])
    user_ids = [u.id for u in users]

    nickname_map = _nickname_map(user_ids)
    font_pref_map = _font_pref_map(user_ids)
    friendship_map = _directory_friendship_map(request.user, user_ids)

    rooms = [
        _serialize_directory_user(user, nickname_map, font_pref_map, friendship_map)
        for user in users
    ]

    return JsonResponse({"ok": True, "rooms": rooms})


@require_POST
@login_required
def friend_request_toggle(request, username):
    target = get_object_or_404(User, username=username)

    if target.id == request.user.id:
        return JsonResponse({"ok": False, "error": "You cannot add yourself."}, status=400)

    payload = _get_request_data(request)
    action = str(payload.get("action", "toggle") or "toggle").strip().lower()

    if action in {"request", "send", "friend"}:
        action = "add"

    if action in {"delete", "unfriend"}:
        action = "remove"

    if action == "withdraw":
        action = "cancel"

    valid_actions = {"toggle", "add", "cancel", "remove", "accept", "reject"}

    if action not in valid_actions:
        return JsonResponse({"ok": False, "error": "Invalid action."}, status=400)

    with transaction.atomic():
        direct = (
            Friendship.objects
            .select_for_update()
            .filter(from_user=request.user, to_user=target)
            .order_by("-updated_at", "-id")
            .first()
        )

        reverse = (
            Friendship.objects
            .select_for_update()
            .filter(from_user=target, to_user=request.user)
            .order_by("-updated_at", "-id")
            .first()
        )

        if action == "toggle":
            if direct and direct.status == Friendship.STATUS_ACCEPTED:
                action = "remove"
            elif reverse and reverse.status == Friendship.STATUS_ACCEPTED:
                action = "remove"
            elif direct and direct.status == Friendship.STATUS_PENDING:
                action = "cancel"
            elif reverse and reverse.status == Friendship.STATUS_PENDING:
                action = "accept"
            else:
                action = "add"

        if action == "add":
            if reverse and reverse.status == Friendship.STATUS_PENDING:
                reverse.status = Friendship.STATUS_ACCEPTED
                reverse.save(update_fields=["status", "updated_at"])
                final_action = "accepted"

            elif direct and direct.status == Friendship.STATUS_ACCEPTED:
                final_action = "already_friends"

            elif reverse and reverse.status == Friendship.STATUS_ACCEPTED:
                final_action = "already_friends"

            elif direct and direct.status == Friendship.STATUS_PENDING:
                final_action = "already_pending"

            else:
                if direct:
                    direct.status = Friendship.STATUS_PENDING
                    direct.save(update_fields=["status", "updated_at"])
                else:
                    Friendship.objects.create(
                        from_user=request.user,
                        to_user=target,
                        status=Friendship.STATUS_PENDING,
                    )

                final_action = "sent"

        elif action == "cancel":
            if direct and direct.status == Friendship.STATUS_PENDING:
                direct.delete()
                final_action = "canceled"
            else:
                final_action = "nothing_changed"

        elif action == "remove":
            removed = False

            if direct and direct.status == Friendship.STATUS_ACCEPTED:
                direct.delete()
                removed = True

            if reverse and reverse.status == Friendship.STATUS_ACCEPTED:
                reverse.delete()
                removed = True

            final_action = "removed" if removed else "nothing_changed"

        elif action == "accept":
            if reverse and reverse.status == Friendship.STATUS_PENDING:
                reverse.status = Friendship.STATUS_ACCEPTED
                reverse.save(update_fields=["status", "updated_at"])
                final_action = "accepted"
            else:
                final_action = "nothing_changed"

        elif action == "reject":
            if reverse and reverse.status == Friendship.STATUS_PENDING:
                reverse.status = Friendship.STATUS_REJECTED
                reverse.save(update_fields=["status", "updated_at"])
                final_action = "rejected"
            else:
                final_action = "nothing_changed"

    _invalidate_friend_caches(request.user.id, target.id)

    return JsonResponse(_serialize_friendship_response(request.user, target, final_action))


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

        return JsonResponse({
            "ok": True,
            "action": "accepted",
            "friendship_id": friendship.id,
            "friendship_status": Friendship.STATUS_ACCEPTED,
            "friendship_direction": "none",
        })

    if action == "reject":
        friendship.status = Friendship.STATUS_REJECTED
        friendship.save(update_fields=["status", "updated_at"])
        _invalidate_friend_caches(friendship.from_user_id, friendship.to_user_id)

        return JsonResponse({
            "ok": True,
            "action": "rejected",
            "friendship_id": friendship.id,
            "friendship_status": Friendship.STATUS_REJECTED,
            "friendship_direction": "incoming",
        })

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
        deleted_count, _ = RoomLike.objects.filter(
            room_id=room.id,
            user_id=request.user.id,
        ).delete()

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

    identity = _daily_visit_identity(request)
    viewer_id = identity["viewer_id"]
    guest_token = identity["guest_token"]

    visit_exists = False

    if viewer_id:
        visit_exists = RoomVisit.objects.filter(
            room_id=room.id,
            viewer_id=viewer_id,
            visited_on=today,
        ).exists()
    elif guest_token:
        visit_exists = RoomVisit.objects.filter(
            room_id=room.id,
            guest_token=guest_token,
            visited_on=today,
        ).exists()

    if not visit_exists:
        RoomVisit.objects.create(
            room_id=room.id,
            viewer_id=viewer_id,
            guest_token=guest_token,
            visited_on=today,
        )

        Room.objects.filter(id=room.id).update(
            today_visits=F("today_visits") + 1,
            total_visits=F("total_visits") + 1,
            last_visit_date=today,
        )

    room.refresh_from_db(fields=["today_visits", "total_visits", "like_count", "last_visit_date"])
    cache.delete(room_stats_key(username))

    liked_by_me = False

    if request.user.is_authenticated:
        liked_by_me = RoomLike.objects.filter(
            room_id=room.id,
            user_id=request.user.id,
        ).exists()

    stats = {
        **_base_room_stats_payload(room),
        "liked_by_me": liked_by_me,
    }

    return JsonResponse({
        "ok": True,
        "counted": not visit_exists,
        "stats": stats,
    })


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
        },
    })


def diary_date_api(request, username, date_str):
    return diary_entry_by_date_api(request, username, date_str)