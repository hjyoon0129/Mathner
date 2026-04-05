import json
import re

from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.http import require_POST

from apps.avatar.models import UserAvatarProfile, UserRoomProfile, RoomItemPlacement
from apps.core.models import UserGameProfile
from apps.shop.models import ShopItem, UserOwnedItem
from apps.social.models import RoomGuestbookEntry, RoomDiaryEntry, Friendship


AVATAR_CATEGORY_ORDER = [
    ShopItem.CATEGORY_AVATAR_HAT,
    ShopItem.CATEGORY_AVATAR_CLOTH,
    ShopItem.CATEGORY_AVATAR_SHOES,
]


def _safe_json(data):
    return json.dumps(data, ensure_ascii=False)


def _get_or_create_avatar_profile(user):
    profile, _ = UserAvatarProfile.objects.get_or_create(user=user)
    return profile


def _get_or_create_room_profile(user):
    profile, _ = UserRoomProfile.objects.get_or_create(user=user)
    return profile


def _get_or_create_game_profile(user):
    profile, _ = UserGameProfile.objects.get_or_create(user=user)
    return profile


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


def _get_current_display_name(user):
    """
    navbar와 완전히 같은 기준으로 닉네임 표시:
    1) UserGameProfile.nickname
    2) user.nickname
    3) user.profile.nickname
    4) user.userprofile.nickname
    5) user.social_profile.nickname
    6) user.member_profile.nickname
    7) user.first_name
    8) username
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


def _extract_set_code(item):
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


def _category_slot_name(category):
    return {
        ShopItem.CATEGORY_AVATAR_HAT: "hat",
        ShopItem.CATEGORY_AVATAR_CLOTH: "cloth",
        ShopItem.CATEGORY_AVATAR_SHOES: "shoes",
    }.get(category, "")


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


def _build_owned_avatar_item_data(user):
    owned_items = (
        UserOwnedItem.objects
        .filter(
            user=user,
            item__category__in=AVATAR_CATEGORY_ORDER,
            quantity__gt=0,
            item__is_active=True,
        )
        .select_related("item")
        .order_by("item__category", "id")
    )

    result = []
    for owned in owned_items:
        item = owned.item
        result.append({
            "owned_item_id": owned.id,
            "item_id": item.id,
            "name": item.name,
            "category": item.category,
            "slot": _category_slot_name(item.category),
            "quantity": int(owned.quantity or 0),
            "image_url": f"/static/{item.image_path}" if item.image_path else "",
            "description": item.description or "",
            "set_code": _extract_set_code(item),
        })
    return result


def _build_equipped_state(profile):
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


def _build_avatar_data(profile):
    return {
        "gender": profile.gender,
        "x": int(profile.x or 0),
        "y": int(profile.y or 0),
        "z_index": int(profile.z_index or 20),
        "size": int(profile.size or 150),
        **_build_equipped_state(profile),
    }


def _build_friend_list(user):
    sent = (
        Friendship.objects
        .filter(from_user=user, status=Friendship.STATUS_ACCEPTED)
        .select_related("to_user")
    )
    received = (
        Friendship.objects
        .filter(to_user=user, status=Friendship.STATUS_ACCEPTED)
        .select_related("from_user")
    )

    friends = [f.to_user for f in sent] + [f.from_user for f in received]
    seen = set()
    ordered = []

    for f in friends:
        if f.id not in seen:
            seen.add(f.id)
            f.display_name = _get_current_display_name(f)
            ordered.append(f)

    return ordered


@login_required
def my_avatar_view(request):
    return avatar_view(request, request.user.username)


@login_required
def avatar_view(request, username=None):
    avatar_owner = get_object_or_404(User, username=username) if username else request.user
    is_owner = request.user == avatar_owner

    avatar_profile = _get_or_create_avatar_profile(avatar_owner)
    _get_or_create_room_profile(avatar_owner)

    guestbook_entries = (
        RoomGuestbookEntry.objects
        .filter(room_owner=avatar_owner)
        .select_related("author")
        .order_by("-created_at")[:50]
    )

    for entry in guestbook_entries:
        entry.author_display_name = _get_current_display_name(entry.author)

    if is_owner:
        diary_entries = (
            RoomDiaryEntry.objects
            .filter(user=avatar_owner)
            .order_by("-created_at")[:50]
        )
    else:
        diary_entries = (
            RoomDiaryEntry.objects
            .filter(user=avatar_owner, visibility=RoomDiaryEntry.VISIBILITY_PUBLIC)
            .order_by("-created_at")[:50]
        )

    my_friends = _build_friend_list(request.user)
    owner_display_name = _get_current_display_name(avatar_owner)

    context = {
        "avatar_owner": avatar_owner,
        "display_name": owner_display_name,
        "owner_display_name": owner_display_name,
        "owner_username": avatar_owner.username,
        "is_owner": is_owner,
        "guestbook_entries": guestbook_entries,
        "diary_entries": diary_entries,
        "my_friends": my_friends,
        "avatar_data_json": _safe_json(_build_avatar_data(avatar_profile)),
        "owned_avatar_item_data_json": _safe_json(_build_owned_avatar_item_data(avatar_owner)),
    }
    return render(request, "avatar/room_page.html", context)


@login_required
@require_POST
def save_avatar_state(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except Exception:
        return JsonResponse({"ok": False, "error": "Invalid JSON payload."}, status=400)

    profile = _get_or_create_avatar_profile(request.user)

    gender = (payload.get("gender") or profile.gender or "male").lower()
    if gender not in {"male", "female"}:
        gender = profile.gender

    equipped = payload.get("equipped") or {}

    owned_items = {
        owned.item_id: owned
        for owned in UserOwnedItem.objects.select_related("item").filter(user=request.user, quantity__gt=0)
    }

    def resolve_item(slot_category_key, field_name):
        raw_id = equipped.get(field_name)
        if not raw_id:
            return None

        try:
            item_id = int(raw_id)
        except (TypeError, ValueError):
            raise ValueError(f"Invalid {field_name}.")

        owned = owned_items.get(item_id)
        if not owned:
            raise ValueError(f"You do not own that {field_name.replace('_item_id', '')} item.")

        if owned.item.category != slot_category_key:
            raise ValueError(f"Invalid category for {field_name.replace('_item_id', '')} slot.")

        return owned.item

    try:
        hat_item = resolve_item(ShopItem.CATEGORY_AVATAR_HAT, "hat_item_id")
        cloth_item = resolve_item(ShopItem.CATEGORY_AVATAR_CLOTH, "cloth_item_id")
        shoes_item = resolve_item(ShopItem.CATEGORY_AVATAR_SHOES, "shoes_item_id")
    except ValueError as exc:
        return JsonResponse({"ok": False, "error": str(exc)}, status=400)

    profile.gender = gender
    profile.hat_item = hat_item
    profile.cloth_item = cloth_item
    profile.shoes_item = shoes_item
    profile.save(update_fields=["gender", "hat_item", "cloth_item", "shoes_item", "updated_at"])

    return JsonResponse({
        "ok": True,
        "avatar": _build_avatar_data(profile),
        "inventory": _build_owned_avatar_item_data(request.user),
    })


@login_required
@require_POST
def reset_avatar(request):
    profile = _get_or_create_avatar_profile(request.user)
    profile.hat_item = None
    profile.cloth_item = None
    profile.shoes_item = None
    profile.save(update_fields=["hat_item", "cloth_item", "shoes_item", "updated_at"])

    return JsonResponse({
        "ok": True,
        "avatar": _build_avatar_data(profile),
        "inventory": _build_owned_avatar_item_data(request.user),
    })


my_room_view = my_avatar_view
room_view = avatar_view
save_room_state = save_avatar_state
reset_room = reset_avatar