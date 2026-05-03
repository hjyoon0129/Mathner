import json
import re
from collections import OrderedDict

from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.http import require_GET, require_POST

from apps.avatar.models import RoomItemPlacement, UserAvatarProfile, UserRoomProfile
from apps.core.models import UserGameProfile
from apps.shop.models import UserFontPreference, UserOwnedEffect, UserOwnedItem
from apps.social.models import Friendship


User = get_user_model()

ROOM_WIDTH_DEFAULT = 800
ROOM_HEIGHT_DEFAULT = 600

DEFAULT_NICKNAME_SCALE = 1.0
DEFAULT_NICKNAME_LETTER_SPACING = 0.0
MIN_NICKNAME_SCALE = 0.8
MAX_NICKNAME_SCALE = 1.6
MIN_NICKNAME_SPACING = -1.0
MAX_NICKNAME_SPACING = 6.0

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

EFFECT_LABEL_MAP = {
    "none": "None",
    "neon_blue": "Neon Blue",
    "rainbow_flow": "Rainbow Flow",
    "gold_glow": "Gold Glow",
    "sparkle": "Sparkle",
    "glitch": "Glitch",
    "float_wave": "Float Wave",
    "fire_glow": "Fire Glow",
    "ice_glow": "Ice Glow",
}

EFFECT_KEY_ALIAS_MAP = {
    "none": "none",

    "neonblue": "neon_blue",
    "neon_blue": "neon_blue",
    "neon blue": "neon_blue",
    "네온블루": "neon_blue",
    "네온 블루": "neon_blue",

    "rainbowflow": "rainbow_flow",
    "rainbow_flow": "rainbow_flow",
    "rainbow flow": "rainbow_flow",
    "레인보우": "rainbow_flow",
    "무지개": "rainbow_flow",
    "무지개효과": "rainbow_flow",

    "goldglow": "gold_glow",
    "gold_glow": "gold_glow",
    "gold glow": "gold_glow",
    "골드글로우": "gold_glow",
    "골드 글로우": "gold_glow",
    "금빛": "gold_glow",
    "금빛효과": "gold_glow",

    "sparkle": "sparkle",
    "스파클": "sparkle",
    "반짝이": "sparkle",
    "반짝이효과": "sparkle",
    "반짝임": "sparkle",

    "glitch": "glitch",
    "글리치": "glitch",

    "floatwave": "float_wave",
    "float_wave": "float_wave",
    "float wave": "float_wave",
    "물결": "float_wave",
    "물결효과": "float_wave",

    "fireglow": "fire_glow",
    "fire_glow": "fire_glow",
    "fire glow": "fire_glow",
    "불꽃": "fire_glow",
    "불꽃효과": "fire_glow",

    "iceglow": "ice_glow",
    "ice_glow": "ice_glow",
    "ice glow": "ice_glow",
    "얼음": "ice_glow",
    "얼음효과": "ice_glow",
}

AVATAR_SLOT_TO_FIELD = OrderedDict([
    ("body", "body_item"),
    ("head", "head_item"),
    ("eyes", "eyes_item"),
    ("mouth", "mouth_item"),
    ("eyebrow", "eyebrow_item"),
    ("front_hair", "front_hair_item"),
    ("rear_hair", "rear_hair_item"),
    ("top", "top_item"),
    ("cloth", "cloth_item"),
    ("pants", "pants_item"),
    ("hat", "hat_item"),
    ("shoes", "shoes_item"),
])

CATEGORY_TO_SLOT = {
    "avatar_body": "body",
    "body": "body",
    "avatar_head": "head",
    "head": "head",
    "face": "head",
    "avatar_face": "head",

    "avatar_eyes": "eyes",
    "eyes": "eyes",
    "eye": "eyes",

    "avatar_mouth": "mouth",
    "mouth": "mouth",
    "lip": "mouth",
    "lips": "mouth",

    "avatar_eyebrow": "eyebrow",
    "eyebrow": "eyebrow",
    "eyebrows": "eyebrow",
    "brow": "eyebrow",

    "avatar_front_hair": "front_hair",
    "front_hair": "front_hair",
    "hair_front": "front_hair",
    "fronthair": "front_hair",

    "avatar_rear_hair": "rear_hair",
    "rear_hair": "rear_hair",
    "hair_back": "rear_hair",
    "hair_rear": "rear_hair",
    "rearhair": "rear_hair",

    "avatar_top": "top",
    "top": "top",

    "avatar_cloth": "cloth",
    "cloth": "cloth",
    "clothes": "cloth",
    "outfit": "cloth",

    "avatar_pants": "pants",
    "pants": "pants",
    "bottom": "pants",
    "bottoms": "pants",

    "avatar_hat": "hat",
    "hat": "hat",
    "cap": "hat",

    "avatar_shoes": "shoes",
    "shoes": "shoes",
    "shoe": "shoes",

    "unique": "",
    "set": "",
}

SUPPORTED_FONT_KEYS = {
    "pretendard",

    "cute_font",
    "dongle",
    "gaegu",
    "gamja_flower",
    "gowun_dodum",
    "gowun_batang",
    "gugi",
    "hi_melody",
    "jua",
    "nanum_pen",
    "poor_story",
    "single_day",
    "sunflower",
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

FONT_KEY_ALIAS_MAP = {
    "pretendard": "pretendard",
    "프리텐다드": "pretendard",
    "프리텐다드체": "pretendard",

    "cute": "cute_font",
    "cutefont": "cute_font",
    "cute_font": "cute_font",
    "cute font": "cute_font",
    "큐트폰트": "cute_font",
    "귀여운폰트": "cute_font",
    "귀여운 폰트": "cute_font",

    "dongle": "dongle",
    "동글": "dongle",
    "동글체": "dongle",

    "gaegu": "gaegu",
    "개구": "gaegu",
    "개구체": "gaegu",

    "gamja": "gamja_flower",
    "gamjaflower": "gamja_flower",
    "gamja_flower": "gamja_flower",
    "gamja flower": "gamja_flower",
    "감자꽃": "gamja_flower",
    "감자꽃체": "gamja_flower",

    "gowundodum": "gowun_dodum",
    "gowun_dodum": "gowun_dodum",
    "gowun dodum": "gowun_dodum",
    "고운돋움": "gowun_dodum",
    "고운돋움체": "gowun_dodum",

    "gowunbatang": "gowun_batang",
    "gowun_batang": "gowun_batang",
    "gowun batang": "gowun_batang",
    "고운바탕": "gowun_batang",
    "고운바탕체": "gowun_batang",

    "gugi": "gugi",
    "구기": "gugi",
    "구기체": "gugi",

    "himelody": "hi_melody",
    "hi_melody": "hi_melody",
    "hi melody": "hi_melody",
    "하이멜로디": "hi_melody",
    "하이멜로디체": "hi_melody",

    "jua": "jua",
    "주아": "jua",
    "주아체": "jua",

    "nanumpen": "nanum_pen",
    "nanum_pen": "nanum_pen",
    "nanum pen": "nanum_pen",
    "나눔펜": "nanum_pen",
    "나눔펜체": "nanum_pen",

    "poorstory": "poor_story",
    "poor_story": "poor_story",
    "poor story": "poor_story",
    "푸어스토리": "poor_story",
    "푸어 스토리": "poor_story",
    "푸어스토리체": "poor_story",

    "singleday": "single_day",
    "single_day": "single_day",
    "single day": "single_day",
    "싱글데이": "single_day",
    "싱글 데이": "single_day",
    "싱글데이체": "single_day",

    "sunflower": "sunflower",
    "해바라기": "sunflower",
    "해바라기체": "sunflower",

    "dokdo": "dokdo",
    "독도": "dokdo",
    "독도체": "dokdo",

    "bubblegumsans": "bubblegum_sans",
    "bubblegum_sans": "bubblegum_sans",
    "bubblegum sans": "bubblegum_sans",

    "deliusswashcaps": "delius_swash_caps",
    "delius_swash_caps": "delius_swash_caps",
    "delius swash caps": "delius_swash_caps",

    "boogaloo": "boogaloo",

    "loveyalikeasister": "love_ya_like_a_sister",
    "love_ya_like_a_sister": "love_ya_like_a_sister",
    "love ya like a sister": "love_ya_like_a_sister",

    "luckiestguy": "luckiest_guy",
    "luckiest_guy": "luckiest_guy",
    "luckiest guy": "luckiest_guy",

    "comingsoon": "coming_soon",
    "coming_soon": "coming_soon",
    "coming soon": "coming_soon",

    "lifesavers": "life_savers",
    "life_savers": "life_savers",
    "life savers": "life_savers",

    "chewy": "chewy",

    "cabinsketch": "cabin_sketch",
    "cabin_sketch": "cabin_sketch",
    "cabin sketch": "cabin_sketch",

    "mousememoirs": "mouse_memoirs",
    "mouse_memoirs": "mouse_memoirs",
    "mouse memoirs": "mouse_memoirs",

    "londrinashadow": "londrina_shadow",
    "londrina_shadow": "londrina_shadow",
    "londrina shadow": "londrina_shadow",

    "modak": "modak",

    "amaticsc": "amatic_sc",
    "amatic_sc": "amatic_sc",
    "amatic sc": "amatic_sc",

    "capriola": "capriola",
    "mclaren": "mclaren",
}


def _safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _safe_float(value, default=1.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _clamp_float(value, min_value, max_value):
    return max(min_value, min(max_value, _safe_float(value, min_value)))


def _normalize_plain_key(value):
    raw = str(value or "").strip().lower()
    raw = raw.replace("-", "_").replace(" ", "_")
    raw = re.sub(r"[^a-z0-9_가-힣]+", "", raw)
    raw = re.sub(r"_+", "_", raw).strip("_")
    return raw


def _normalize_effect_key(value):
    raw_original = str(value or "none").strip()
    if not raw_original:
        return "none"

    raw_lower = raw_original.lower().strip()

    if raw_lower in EFFECT_KEY_ALIAS_MAP:
        return EFFECT_KEY_ALIAS_MAP[raw_lower]

    normalized = _normalize_plain_key(raw_original)

    if normalized in EFFECT_KEY_ALIAS_MAP:
        return EFFECT_KEY_ALIAS_MAP[normalized]

    compact = normalized.replace("_", "")

    if compact in EFFECT_KEY_ALIAS_MAP:
        return EFFECT_KEY_ALIAS_MAP[compact]

    return normalized if normalized in SUPPORTED_EFFECT_KEYS else "none"


def _image_url_from_item(item):
    if not item:
        return ""

    image_path = getattr(item, "image_path", "") or getattr(item, "image", "") or ""
    if not image_path:
        return ""

    image_path = str(image_path).strip()
    if image_path.startswith("http://") or image_path.startswith("https://") or image_path.startswith("/"):
        return image_path
    return f"/static/{image_path}"


def _slugify_font_key(value):
    raw_original = str(value or "").strip()
    if not raw_original:
        return ""

    raw_lower = raw_original.lower().strip()

    if raw_original in FONT_KEY_ALIAS_MAP:
        return FONT_KEY_ALIAS_MAP[raw_original]

    if raw_lower in FONT_KEY_ALIAS_MAP:
        return FONT_KEY_ALIAS_MAP[raw_lower]

    normalized = _normalize_plain_key(raw_original)

    if normalized in FONT_KEY_ALIAS_MAP:
        return FONT_KEY_ALIAS_MAP[normalized]

    compact = normalized.replace("_", "")

    if compact in FONT_KEY_ALIAS_MAP:
        return FONT_KEY_ALIAS_MAP[compact]

    return normalized


def _font_key_from_item(item):
    if not item:
        return ""

    candidates = [
        getattr(item, "font_family_key", ""),
        getattr(item, "font_key", ""),
        getattr(item, "code", ""),
        getattr(item, "slug", ""),
        getattr(item, "name", ""),
        getattr(item, "display_name", ""),
        getattr(item, "title", ""),
    ]

    for candidate in candidates:
        key = _slugify_font_key(candidate)
        if key in SUPPORTED_FONT_KEYS:
            return key

    return ""


def _effect_key_from_item(item):
    if not item:
        return ""

    candidates = [
        getattr(item, "effect_key", ""),
        getattr(item, "key", ""),
        getattr(item, "code", ""),
        getattr(item, "slug", ""),
        getattr(item, "name", ""),
        getattr(item, "display_name", ""),
        getattr(item, "title", ""),
    ]

    for candidate in candidates:
        raw = str(candidate or "").strip()
        if not raw:
            continue

        key = _normalize_effect_key(raw)
        if key in SUPPORTED_EFFECT_KEYS and key != "none":
            return key

    return ""


def _is_effect_item(item):
    if not item:
        return False

    category = str(getattr(item, "category", "") or "").strip().lower()
    item_type = str(getattr(item, "type", "") or "").strip().lower()
    item_group = str(getattr(item, "item_group", "") or "").strip().lower()

    if category in {"profile_effect", "effect"}:
        return True

    if item_type in {"profile_effect", "effect"}:
        return True

    if item_group in {"profile_effect", "effect"}:
        return True

    if "effect" in category or "effect" in item_type or "effect" in item_group:
        return True

    return bool(_effect_key_from_item(item))


def _is_font_item(item):
    if not item:
        return False

    if _is_effect_item(item):
        return False

    category = str(getattr(item, "category", "") or "").strip().lower()
    item_type = str(getattr(item, "type", "") or "").strip().lower()
    item_group = str(getattr(item, "item_group", "") or "").strip().lower()

    if category in {"profile_font", "font"}:
        return True

    if item_type in {"profile_font", "font"}:
        return True

    if item_group in {"profile_font", "font"}:
        return True

    if "font" in category or "font" in item_type or "font" in item_group:
        return True

    return bool(_font_key_from_item(item))


def _normalize_item_group(category):
    category = str(category or "").strip().lower()
    if category == "unique":
        return "unique"
    if category == "set":
        return "set"
    if category in {"profile_font", "font"}:
        return "font"
    if category in {"profile_effect", "effect"}:
        return "effect"
    return ""


def _get_display_name(user):
    if not user:
        return "User"

    try:
        profile = UserGameProfile.objects.only("nickname").get(user=user)
        nickname = (profile.nickname or "").strip()
        if nickname:
            return nickname
    except UserGameProfile.DoesNotExist:
        pass

    profile = getattr(user, "profile", None)
    nickname = getattr(profile, "nickname", None)
    if nickname:
        nickname = str(nickname).strip()
        if nickname:
            return nickname

    first_name = str(getattr(user, "first_name", "") or "").strip()
    if first_name:
        return first_name

    username = str(getattr(user, "username", "") or "").strip()
    if username:
        return username

    email = str(getattr(user, "email", "") or "").strip()
    if email:
        return email.split("@")[0]

    return "User"


def _get_empty_font_pref():
    return {
        "nickname_font_key": "",
        "title_font_key": "",
        "content_font_key": "",
        "writing_font_key": "",
        "nickname_font_item_id": None,
        "title_font_item_id": None,
        "content_font_item_id": None,
        "nickname_effect_key": "none",
        "title_effect_key": "none",
        "content_effect_key": "none",
        "nickname_scale": DEFAULT_NICKNAME_SCALE,
        "nickname_letter_spacing": DEFAULT_NICKNAME_LETTER_SPACING,
        "nickname_color": "#ffffff",
        "title_color": "#ffffff",
        "content_color": "#eef4ff",
    }


def _get_font_pref(user):
    if not user or not getattr(user, "is_authenticated", False):
        return _get_empty_font_pref()

    pref, _ = UserFontPreference.objects.select_related(
        "nickname_font_item",
        "title_font_item",
        "content_font_item",
    ).get_or_create(user=user)

    nickname_item = getattr(pref, "nickname_font_item", None)
    title_item = getattr(pref, "title_font_item", None)
    content_item = getattr(pref, "content_font_item", None)

    nickname_font_key = _font_key_from_item(nickname_item)
    title_font_key = _font_key_from_item(title_item)
    content_font_key = _font_key_from_item(content_item)

    return {
        "nickname_font_key": nickname_font_key,
        "title_font_key": title_font_key,
        "content_font_key": content_font_key,
        "writing_font_key": content_font_key,
        "nickname_font_item_id": getattr(pref, "nickname_font_item_id", None),
        "title_font_item_id": getattr(pref, "title_font_item_id", None),
        "content_font_item_id": getattr(pref, "content_font_item_id", None),
        "nickname_effect_key": _normalize_effect_key(getattr(pref, "nickname_effect_key", "none")),
        "title_effect_key": _normalize_effect_key(getattr(pref, "title_effect_key", "none")),
        "content_effect_key": _normalize_effect_key(getattr(pref, "content_effect_key", "none")),
        "nickname_scale": float(getattr(pref, "nickname_scale", DEFAULT_NICKNAME_SCALE) or DEFAULT_NICKNAME_SCALE),
        "nickname_letter_spacing": float(
            getattr(pref, "nickname_letter_spacing", DEFAULT_NICKNAME_LETTER_SPACING)
            or DEFAULT_NICKNAME_LETTER_SPACING
        ),
        "nickname_color": getattr(pref, "nickname_color", "#ffffff") or "#ffffff",
        "title_color": getattr(pref, "title_color", "#ffffff") or "#ffffff",
        "content_color": getattr(pref, "content_color", "#eef4ff") or "#eef4ff",
    }


def _normalize_gender(item):
    gender = (
        getattr(item, "gender", None)
        or getattr(item, "target_gender", None)
        or getattr(item, "for_gender", None)
        or "common"
    )
    gender = str(gender).strip().lower()

    if gender in {"unisex", "all", "both", "none", ""}:
        return "common"
    if gender not in {"male", "female", "common"}:
        return "common"
    return gender


def _normalize_avatar_type(category):
    category = (category or "").strip().lower()

    mapping = {
        "avatar_head": "head",
        "avatar_face": "head",
        "avatar_eyes": "face",
        "avatar_mouth": "face",
        "avatar_eyebrow": "face",
        "avatar_front_hair": "hair",
        "avatar_rear_hair": "hair",
        "avatar_body": "body",
        "avatar_top": "top",
        "avatar_cloth": "cloth",
        "avatar_pants": "pants",
        "avatar_shoes": "shoes",
        "avatar_hat": "hat",
        "profile_font": "font",
        "profile_effect": "effect",

        "head": "head",
        "face": "head",
        "eyes": "face",
        "eye": "face",
        "mouth": "face",
        "eyebrow": "face",
        "eyebrows": "face",
        "front_hair": "hair",
        "rear_hair": "hair",
        "hair": "hair",
        "body": "body",
        "top": "top",
        "cloth": "cloth",
        "clothes": "cloth",
        "outfit": "cloth",
        "pants": "pants",
        "bottom": "pants",
        "bottoms": "pants",
        "shoes": "shoes",
        "shoe": "shoes",
        "hat": "hat",
        "cap": "hat",
        "font": "font",
        "effect": "effect",
        "unique": "unique",
        "set": "set",
    }
    return mapping.get(category, category)


def _normalize_slot_name(value):
    value = str(value or "").strip().lower()
    return CATEGORY_TO_SLOT.get(value, value if value in AVATAR_SLOT_TO_FIELD else "")


def _infer_slot_from_item(item):
    if _is_font_item(item) or _is_effect_item(item):
        return ""

    equip_slot = (
        getattr(item, "resolved_equip_slot", None)
        or getattr(item, "equip_slot", None)
        or getattr(item, "slot", None)
        or ""
    )
    normalized = _normalize_slot_name(equip_slot)
    if normalized in AVATAR_SLOT_TO_FIELD:
        return normalized

    category = str(getattr(item, "category", "") or "").strip().lower()
    normalized = _normalize_slot_name(category)
    if normalized in AVATAR_SLOT_TO_FIELD:
        return normalized

    source = " ".join([
        str(getattr(item, "name", "") or ""),
        str(getattr(item, "description", "") or ""),
        str(getattr(item, "image_path", "") or ""),
        str(getattr(item, "code", "") or ""),
        str(getattr(item, "slug", "") or ""),
    ]).lower()

    if re.search(r"(robe|cloak|cape|mantle|coat|outer|cloth|outfit)", source):
        return "cloth"
    if re.search(r"(pants|trouser|bottom)", source):
        return "pants"
    if re.search(r"(shoe|shoes|boot|boots|sneaker)", source):
        return "shoes"
    if re.search(r"(hat|cap|crown|laurel|halo|tiara|wreath)", source):
        return "hat"
    if re.search(r"(shirt|tee|jacket|hoodie|vest|top)", source):
        return "top"

    return ""


def _get_avatar_profile(user):
    avatar_profile, _ = UserAvatarProfile.objects.select_related(
        "body_item",
        "head_item",
        "eyes_item",
        "mouth_item",
        "eyebrow_item",
        "front_hair_item",
        "rear_hair_item",
        "top_item",
        "cloth_item",
        "pants_item",
        "hat_item",
        "shoes_item",
    ).get_or_create(user=user)
    return avatar_profile


def _get_room_profile(user):
    room_profile, _ = UserRoomProfile.objects.get_or_create(
        user=user,
        defaults={
            "room_width": ROOM_WIDTH_DEFAULT,
            "room_height": ROOM_HEIGHT_DEFAULT,
        },
    )
    return room_profile


def _serialize_avatar_profile(profile):
    data = {
        "gender": profile.gender or "male",
        "x": int(profile.x or 0),
        "y": int(profile.y or 0),
        "z_index": int(profile.z_index or 0),
        "size": int(profile.size or 150),

        "body_image_url": _image_url_from_item(profile.body_item),
        "head_image_url": _image_url_from_item(profile.head_item),
        "eyes_image_url": _image_url_from_item(profile.eyes_item),
        "mouth_image_url": _image_url_from_item(profile.mouth_item),
        "eyebrow_image_url": _image_url_from_item(profile.eyebrow_item),
        "front_hair_image_url": _image_url_from_item(profile.front_hair_item),
        "rear_hair_image_url": _image_url_from_item(profile.rear_hair_item),
        "top_image_url": _image_url_from_item(profile.top_item),
        "cloth_image_url": _image_url_from_item(profile.cloth_item),
        "pants_image_url": _image_url_from_item(profile.pants_item),
        "hat_image_url": _image_url_from_item(profile.hat_item),
        "shoes_image_url": _image_url_from_item(profile.shoes_item),
    }

    for slot, field_name in AVATAR_SLOT_TO_FIELD.items():
        data[f"{slot}_item_id"] = getattr(profile, f"{field_name}_id")

    return data


def _serialize_placement(placement):
    item = placement.owned_item.item
    return {
        "placement_id": placement.id,
        "owned_item_id": placement.owned_item_id,
        "item_id": item.id,
        "name": getattr(item, "name", "") or "",
        "category": getattr(item, "category", "") or "",
        "description": getattr(item, "description", "") or "",
        "image_url": _image_url_from_item(item),
        "placement_type": placement.placement_type,
        "parent_placement_id": placement.parent_placement_id,
        "surface_slot": placement.surface_slot or "",
        "x": int(placement.x or 0),
        "y": int(placement.y or 0),
        "z_index": int(placement.z_index or 0),
        "offset_x": int(placement.offset_x or 0),
        "offset_y": int(placement.offset_y or 0),
        "rotation": int(placement.rotation or 0),
        "scale": float(placement.scale or 1.0),
        "placed": bool(placement.placed),
    }


def _group_owned_items(user):
    rows = (
        UserOwnedItem.objects
        .select_related("item")
        .filter(user=user, item__isnull=False)
        .order_by("item_id", "id")
    )

    grouped = OrderedDict()
    for owned in rows:
        item = owned.item
        category = str(getattr(item, "category", "") or "").strip().lower()
        item_group = _normalize_item_group(category)
        effect_key = _effect_key_from_item(item)
        is_effect = _is_effect_item(item)
        is_font = _is_font_item(item)
        font_key = _font_key_from_item(item) if is_font else ""
        slot = _infer_slot_from_item(item)

        if is_effect:
            item_group = "effect"

        if is_font:
            item_group = "font"

        if item.id not in grouped:
            grouped[item.id] = {
                "owned_item_id": owned.id,
                "item_id": item.id,
                "id": item.id,
                "name": getattr(item, "name", "") or "",
                "category": category,
                "item_group": item_group,
                "group": item_group,
                "slot": slot,
                "equip_slot": slot,
                "resolved_equip_slot": slot,
                "type": "effect" if is_effect else _normalize_avatar_type(category),
                "gender": _normalize_gender(item),
                "description": getattr(item, "description", "") or "",
                "image_url": _image_url_from_item(item),
                "price": int(getattr(item, "price_stars", 0) or 0),
                "quantity": max(1, int(getattr(owned, "quantity", 1) or 1)),
                "is_font": is_font,
                "is_effect": is_effect,
                "font_key": font_key,
                "font_family_key": getattr(item, "font_family_key", "") or font_key,
                "effect_key": effect_key,
            }
        else:
            grouped[item.id]["quantity"] += max(1, int(getattr(owned, "quantity", 1) or 1))

    return list(grouped.values())


def _group_owned_effects(user):
    grouped = OrderedDict()

    effect_rows = (
        UserOwnedEffect.objects
        .filter(user=user)
        .order_by("effect_key", "id")
    )

    for owned in effect_rows:
        effect_key = _normalize_effect_key(getattr(owned, "effect_key", "none"))
        if effect_key == "none":
            continue

        if effect_key not in grouped:
            grouped[effect_key] = {
                "effect_key": effect_key,
                "name": EFFECT_LABEL_MAP.get(effect_key, effect_key.replace("_", " ").title()),
                "quantity": max(1, int(getattr(owned, "quantity", 1) or 1)),
                "preview_class": f"effect-{effect_key.replace('_', '-')}",
                "is_effect": True,
            }
        else:
            grouped[effect_key]["quantity"] += max(1, int(getattr(owned, "quantity", 1) or 1))

    item_rows = (
        UserOwnedItem.objects
        .select_related("item")
        .filter(user=user, item__isnull=False)
        .order_by("item_id", "id")
    )

    for owned in item_rows:
        item = owned.item
        effect_key = _effect_key_from_item(item)

        if not effect_key or effect_key == "none":
            continue

        if effect_key not in grouped:
            grouped[effect_key] = {
                "effect_key": effect_key,
                "name": getattr(item, "name", "") or EFFECT_LABEL_MAP.get(effect_key, effect_key.replace("_", " ").title()),
                "quantity": max(1, int(getattr(owned, "quantity", 1) or 1)),
                "preview_class": f"effect-{effect_key.replace('_', '-')}",
                "is_effect": True,
            }
        else:
            grouped[effect_key]["quantity"] += max(1, int(getattr(owned, "quantity", 1) or 1))

    return list(grouped.values())


def _friendship_state_between(me, target_user):
    if not me or not getattr(me, "is_authenticated", False) or not target_user or me.id == target_user.id:
        return {
            "friendship_id": "",
            "friendship_status": "none",
            "friendship_direction": "none",
        }

    friendship = (
        Friendship.objects
        .filter(
            Q(from_user=me, to_user=target_user) |
            Q(from_user=target_user, to_user=me)
        )
        .order_by("-updated_at", "-id")
        .first()
    )

    if not friendship:
        return {
            "friendship_id": "",
            "friendship_status": "none",
            "friendship_direction": "none",
        }

    if friendship.status == Friendship.STATUS_ACCEPTED:
        direction = "none"
    else:
        direction = "outgoing" if friendship.from_user_id == me.id else "incoming"

    return {
        "friendship_id": friendship.id,
        "friendship_status": friendship.status,
        "friendship_direction": direction,
    }


def _build_room_context(room_owner, request_user=None):
    avatar_profile = _get_avatar_profile(room_owner)
    room_profile = _get_room_profile(room_owner)

    owner_font_pref = _get_font_pref(room_owner)
    viewer_font_pref = _get_font_pref(request_user) if request_user and request_user.is_authenticated else _get_empty_font_pref()

    placements = (
        RoomItemPlacement.objects
        .select_related("owned_item", "owned_item__item", "parent_placement")
        .filter(user=room_owner, placed=True)
        .order_by("z_index", "id")
    )
    placement_list = [_serialize_placement(p) for p in placements]

    is_owner = bool(
        request_user
        and request_user.is_authenticated
        and request_user.id == room_owner.id
    )

    inventory_items = _group_owned_items(room_owner) if is_owner else []
    owned_effect_items = _group_owned_effects(room_owner) if is_owner else []

    friendship_info = _friendship_state_between(request_user, room_owner)

    return {
        "room_owner": room_owner,
        "room_owner_name": _get_display_name(room_owner),
        "is_owner": is_owner,
        "room_profile": room_profile,
        "room_width": int(room_profile.room_width or ROOM_WIDTH_DEFAULT),
        "room_height": int(room_profile.room_height or ROOM_HEIGHT_DEFAULT),
        "avatar_profile": avatar_profile,
        "avatar_data_json": json.dumps(_serialize_avatar_profile(avatar_profile), ensure_ascii=False),
        "room_items_json": json.dumps(placement_list, ensure_ascii=False),
        "inventory_items_json": json.dumps(inventory_items, ensure_ascii=False),
        "owned_effect_items_json": json.dumps(owned_effect_items, ensure_ascii=False),

        "nickname_font_key": owner_font_pref["nickname_font_key"],
        "title_font_key": owner_font_pref["title_font_key"],
        "content_font_key": owner_font_pref["content_font_key"],

        "font_pref_json": json.dumps(owner_font_pref, ensure_ascii=False),
        "room_owner_font_pref_json": json.dumps(owner_font_pref, ensure_ascii=False),
        "viewer_font_pref_json": json.dumps(viewer_font_pref, ensure_ascii=False),

        "friendship_id": friendship_info["friendship_id"],
        "friendship_status": friendship_info["friendship_status"],
        "friendship_direction": friendship_info["friendship_direction"],
    }


def _validate_avatar_item_for_slot(user, slot, item_id):
    if not item_id:
        return None, None

    item_id = _safe_int(item_id, 0)
    if item_id <= 0:
        return None, "Invalid item id."

    owned = (
        UserOwnedItem.objects
        .select_related("item")
        .filter(user=user, item_id=item_id)
        .order_by("id")
        .first()
    )
    if not owned or not owned.item:
        return None, "You do not own this item."

    actual_slot = _infer_slot_from_item(owned.item)
    if actual_slot != slot:
        return None, f"Item slot mismatch for {slot}."

    return owned.item, None


def _validate_owned_font_item(user, font_item_id):
    item_id = _safe_int(font_item_id, 0)

    if item_id <= 0:
        return None, "", "Invalid font item."

    owned = (
        UserOwnedItem.objects
        .select_related("item")
        .filter(user=user, item_id=item_id, item__isnull=False)
        .order_by("id")
        .first()
    )

    if not owned:
        owned = (
            UserOwnedItem.objects
            .select_related("item")
            .filter(user=user, id=item_id, item__isnull=False)
            .order_by("id")
            .first()
        )

    if not owned or not owned.item:
        return None, "", "You do not own this font."

    if not _is_font_item(owned.item):
        return None, "", "Selected item is not a font."

    font_key = _font_key_from_item(owned.item)

    if not font_key:
        return None, "", "Unsupported font item."

    return owned.item, font_key, None


def _validate_owned_effect(user, effect_key):
    normalized = _normalize_effect_key(effect_key)

    if normalized == "none":
        return "none", None

    owned_effect = (
        UserOwnedEffect.objects
        .filter(user=user, effect_key__in=[normalized, normalized.replace("_", "-")])
        .order_by("id")
        .first()
    )

    if owned_effect:
        stored_key = _normalize_effect_key(getattr(owned_effect, "effect_key", normalized))
        return stored_key, None

    owned_item = (
        UserOwnedItem.objects
        .select_related("item")
        .filter(user=user, item__isnull=False)
        .order_by("id")
    )

    for row in owned_item:
        item_effect_key = _effect_key_from_item(row.item)
        if item_effect_key == normalized:
            return item_effect_key, None

    return None, "You do not own this effect."


@login_required
def my_room_view(request):
    context = _build_room_context(request.user, request_user=request.user)
    return render(request, "avatar/room_page.html", context)


def room_view(request, username):
    room_owner = get_object_or_404(User, username=username)
    context = _build_room_context(room_owner, request_user=request.user)
    return render(request, "avatar/room_page.html", context)


@require_GET
@login_required
def avatar_inventory(request):
    inventory = _group_owned_items(request.user)
    effects = _group_owned_effects(request.user)
    return JsonResponse({
        "ok": True,
        "inventory": inventory,
        "items": inventory,
        "effects": effects,
    })


@require_POST
@login_required
def save_avatar_state(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError, TypeError, ValueError):
        return JsonResponse({"ok": False, "error": "Invalid JSON payload."}, status=400)

    gender = str(payload.get("gender") or "male").strip().lower()
    if gender not in {"male", "female"}:
        gender = "male"

    equipped = payload.get("equipped") or {}
    if not isinstance(equipped, dict):
        return JsonResponse({"ok": False, "error": "equipped must be an object."}, status=400)

    resolved_items = {}
    for slot, field_name in AVATAR_SLOT_TO_FIELD.items():
        item_id = equipped.get(f"{slot}_item_id")
        item, error = _validate_avatar_item_for_slot(request.user, slot, item_id)
        if error:
            return JsonResponse({"ok": False, "error": error}, status=400)
        resolved_items[field_name] = item

    with transaction.atomic():
        profile = _get_avatar_profile(request.user)
        profile.gender = gender
        for field_name, item in resolved_items.items():
            setattr(profile, field_name, item)
        profile.save()

    inventory = _group_owned_items(request.user)
    effects = _group_owned_effects(request.user)

    return JsonResponse({
        "ok": True,
        "message": "Avatar saved successfully.",
        "avatar": _serialize_avatar_profile(profile),
        "inventory": inventory,
        "items": inventory,
        "effects": effects,
    })


@require_POST
@login_required
def save_font_preference(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError, TypeError, ValueError):
        return JsonResponse({"ok": False, "error": "Invalid JSON payload."}, status=400)

    reset_default = bool(payload.get("reset_default"))
    font_item_id = payload.get("font_item_id")
    effect_key_raw = payload.get("effect_key")

    nickname_scale = _clamp_float(
        payload.get("nickname_scale"),
        MIN_NICKNAME_SCALE,
        MAX_NICKNAME_SCALE,
    )

    nickname_letter_spacing = _clamp_float(
        payload.get("nickname_letter_spacing"),
        MIN_NICKNAME_SPACING,
        MAX_NICKNAME_SPACING,
    )

    selected_item = None
    font_key = ""
    effect_key = "none"

    if reset_default:
        effect_key = "none"
    else:
        if font_item_id:
            selected_item, font_key, error = _validate_owned_font_item(request.user, font_item_id)

            if error:
                return JsonResponse({
                    "ok": False,
                    "error": error,
                    "debug_font_item_id": font_item_id,
                }, status=400)

        validated_effect_key, effect_error = _validate_owned_effect(request.user, effect_key_raw)

        if effect_error:
            return JsonResponse({"ok": False, "error": effect_error}, status=400)

        effect_key = validated_effect_key or "none"

    with transaction.atomic():
        pref, _ = UserFontPreference.objects.get_or_create(user=request.user)

        if reset_default:
            pref.nickname_font_item = None
            pref.title_font_item = None
            pref.content_font_item = None

            pref.nickname_effect_key = "none"
            pref.title_effect_key = "none"
            pref.content_effect_key = "none"

            pref.nickname_scale = DEFAULT_NICKNAME_SCALE
            pref.nickname_letter_spacing = DEFAULT_NICKNAME_LETTER_SPACING

            pref.nickname_color = "#ffffff"
            pref.title_color = "#ffffff"
            pref.content_color = "#eef4ff"
        else:
            pref.nickname_font_item = selected_item
            pref.title_font_item = selected_item
            pref.content_font_item = selected_item

            pref.nickname_effect_key = effect_key
            pref.title_effect_key = "none"
            pref.content_effect_key = "none"

            pref.nickname_scale = nickname_scale
            pref.nickname_letter_spacing = nickname_letter_spacing

            pref.nickname_color = "#73c5ff"
            pref.title_color = "#403932"
            pref.content_color = "#403932"

        pref.save()

    return JsonResponse({
        "ok": True,
        "message": "Font preference saved.",
        "font_pref": _get_font_pref(request.user),
        "room_owner_name": _get_display_name(request.user),
        "font_item_id": getattr(selected_item, "id", None),
        "font_key": font_key,
        "effect_key": effect_key,
    })


@require_POST
@login_required
def reset_avatar_state(request):
    with transaction.atomic():
        profile = _get_avatar_profile(request.user)
        profile.gender = UserAvatarProfile.GENDER_MALE
        for field_name in AVATAR_SLOT_TO_FIELD.values():
            setattr(profile, field_name, None)
        profile.save()

    inventory = _group_owned_items(request.user)
    effects = _group_owned_effects(request.user)

    return JsonResponse({
        "ok": True,
        "message": "Avatar reset successfully.",
        "avatar": _serialize_avatar_profile(profile),
        "inventory": inventory,
        "items": inventory,
        "effects": effects,
    })


@require_POST
@login_required
def reset_room(request):
    with transaction.atomic():
        RoomItemPlacement.objects.filter(user=request.user).delete()

        room_profile = _get_room_profile(request.user)
        room_profile.room_width = ROOM_WIDTH_DEFAULT
        room_profile.room_height = ROOM_HEIGHT_DEFAULT
        room_profile.save(update_fields=["room_width", "room_height", "updated_at"])

    return JsonResponse(
        {
            "ok": True,
            "message": "Room reset successfully.",
            "room_width": ROOM_WIDTH_DEFAULT,
            "room_height": ROOM_HEIGHT_DEFAULT,
            "placements": [],
        }
    )


@require_POST
@login_required
def save_room_state(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError, TypeError, ValueError):
        return JsonResponse({"ok": False, "error": "Invalid JSON payload."}, status=400)

    room_width = _safe_int(payload.get("room_width"), ROOM_WIDTH_DEFAULT)
    room_height = _safe_int(payload.get("room_height"), ROOM_HEIGHT_DEFAULT)
    placements = payload.get("placements", [])

    if not isinstance(placements, list):
        return JsonResponse({"ok": False, "error": "placements must be a list."}, status=400)

    with transaction.atomic():
        room_profile = _get_room_profile(request.user)
        room_profile.room_width = max(1, room_width)
        room_profile.room_height = max(1, room_height)
        room_profile.save(update_fields=["room_width", "room_height", "updated_at"])

        RoomItemPlacement.objects.filter(user=request.user).delete()
        created_items = []

        owned_lookup = {
            obj.id: obj
            for obj in UserOwnedItem.objects.select_related("item").filter(user=request.user)
        }

        for row in placements:
            if not isinstance(row, dict):
                continue

            owned_item_id = _safe_int(row.get("owned_item_id"), 0)
            if owned_item_id <= 0:
                continue

            owned_item = owned_lookup.get(owned_item_id)
            if not owned_item:
                continue

            placement = RoomItemPlacement.objects.create(
                user=request.user,
                owned_item=owned_item,
                placement_type=(row.get("placement_type") or RoomItemPlacement.TYPE_FLOOR)[:20],
                parent_placement=None,
                surface_slot=(row.get("surface_slot") or "")[:50],
                x=_safe_int(row.get("x"), 0),
                y=_safe_int(row.get("y"), 0),
                z_index=_safe_int(row.get("z_index"), 1),
                offset_x=_safe_int(row.get("offset_x"), 0),
                offset_y=_safe_int(row.get("offset_y"), 0),
                rotation=_safe_int(row.get("rotation"), 0),
                scale=_safe_float(row.get("scale"), 1.0),
                placed=bool(row.get("placed", True)),
            )
            created_items.append(_serialize_placement(placement))

    return JsonResponse({
        "ok": True,
        "message": "Room saved successfully.",
        "room_width": room_profile.room_width,
        "room_height": room_profile.room_height,
        "placements": created_items,
    })