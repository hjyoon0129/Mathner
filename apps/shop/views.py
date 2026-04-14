import json
from collections import defaultdict

from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_POST

from apps.core.models import UserGameProfile
from .models import ShopItem, UserOwnedItem, UserOwnedEffect


CATEGORY_SET = getattr(ShopItem, "CATEGORY_SET", "set")
CATEGORY_UNIQUE = getattr(ShopItem, "CATEGORY_UNIQUE", "unique")

SHOP_ALLOWED_CATEGORIES = [
    ShopItem.CATEGORY_AVATAR_FACE,
    ShopItem.CATEGORY_AVATAR_HAIR,
    ShopItem.CATEGORY_AVATAR_BODY,
    ShopItem.CATEGORY_AVATAR_TOP,
    ShopItem.CATEGORY_AVATAR_CLOTH,
    ShopItem.CATEGORY_AVATAR_PANTS,
    ShopItem.CATEGORY_AVATAR_SHOES,
    ShopItem.CATEGORY_AVATAR_HAT,
    ShopItem.CATEGORY_PROFILE_FONT,
    CATEGORY_SET,
    CATEGORY_UNIQUE,
]

AVATAR_MAIN_CATEGORIES = [
    ShopItem.CATEGORY_AVATAR_FACE,
    ShopItem.CATEGORY_AVATAR_HAIR,
    ShopItem.CATEGORY_AVATAR_BODY,
    ShopItem.CATEGORY_AVATAR_TOP,
    ShopItem.CATEGORY_AVATAR_CLOTH,
    ShopItem.CATEGORY_AVATAR_PANTS,
    ShopItem.CATEGORY_AVATAR_SHOES,
    ShopItem.CATEGORY_AVATAR_HAT,
    ShopItem.CATEGORY_PROFILE_FONT,
]

EFFECT_CATALOG = [
    {
        "key": "neon-blue",
        "name": "Neon Blue",
        "price_stars": 90,
        "preview_class": "effect-neon-blue",
    },
    {
        "key": "rainbow-flow",
        "name": "Rainbow Flow",
        "price_stars": 130,
        "preview_class": "effect-rainbow-flow",
    },
    {
        "key": "gold-glow",
        "name": "Gold Glow",
        "price_stars": 110,
        "preview_class": "effect-gold-glow",
    },
    {
        "key": "sparkle",
        "name": "Sparkle",
        "price_stars": 95,
        "preview_class": "effect-sparkle",
    },
    {
        "key": "glitch",
        "name": "Glitch",
        "price_stars": 125,
        "preview_class": "effect-glitch",
    },
    {
        "key": "float-wave",
        "name": "Float Wave",
        "price_stars": 90,
        "preview_class": "effect-float-wave",
    },
    {
        "key": "fire-glow",
        "name": "Fire Glow",
        "price_stars": 115,
        "preview_class": "effect-fire-glow",
    },
    {
        "key": "ice-glow",
        "name": "Ice Glow",
        "price_stars": 115,
        "preview_class": "effect-ice-glow",
    },
]


def get_profile_star_value(profile):
    for field_name in ["stars", "star_count", "total_stars", "points"]:
        if hasattr(profile, field_name):
            return int(getattr(profile, field_name, 0) or 0)
    return 0


def set_profile_star_value(profile, value):
    for field_name in ["stars", "star_count", "total_stars", "points"]:
        if hasattr(profile, field_name):
            setattr(profile, field_name, int(value))
            profile.save(update_fields=[field_name])
            return True
    return False


def _slot_label_from_category(category):
    mapping = {
        ShopItem.CATEGORY_AVATAR_FACE: "head",
        ShopItem.CATEGORY_AVATAR_HAIR: "hair",
        ShopItem.CATEGORY_AVATAR_BODY: "body",
        ShopItem.CATEGORY_AVATAR_TOP: "top",
        ShopItem.CATEGORY_AVATAR_CLOTH: "cloth",
        ShopItem.CATEGORY_AVATAR_PANTS: "pants",
        ShopItem.CATEGORY_AVATAR_SHOES: "shoes",
        ShopItem.CATEGORY_AVATAR_HAT: "hat",
        ShopItem.CATEGORY_PROFILE_FONT: "font",
        CATEGORY_SET: "set",
        CATEGORY_UNIQUE: "hat",
    }
    return mapping.get(category, "")


def _normalize_category_value(category_value):
    return str(category_value or "").strip().lower()


@login_required
def shop_view(request):
    profile, _ = UserGameProfile.objects.get_or_create(user=request.user)
    shop_star_count = get_profile_star_value(profile)

    items = (
        ShopItem.objects
        .filter(is_active=True, category__in=SHOP_ALLOWED_CATEGORIES)
        .order_by("category", "id")
    )

    grouped_items = defaultdict(list)
    label_map = {
        ShopItem.CATEGORY_AVATAR_FACE: "Avatar Face",
        ShopItem.CATEGORY_AVATAR_HAIR: "Avatar Hair",
        ShopItem.CATEGORY_AVATAR_BODY: "Avatar Body",
        ShopItem.CATEGORY_AVATAR_TOP: "Avatar Top",
        ShopItem.CATEGORY_AVATAR_CLOTH: "Avatar Clothes",
        ShopItem.CATEGORY_AVATAR_PANTS: "Avatar Pants",
        ShopItem.CATEGORY_AVATAR_SHOES: "Avatar Shoes",
        ShopItem.CATEGORY_AVATAR_HAT: "Avatar Hats",
        ShopItem.CATEGORY_PROFILE_FONT: "Fonts",
    }

    font_items = []
    set_items = []
    unique_items = []

    for item in items:
        item.slot = _slot_label_from_category(item.category)
        normalized_category = _normalize_category_value(item.category)

        if item.category in AVATAR_MAIN_CATEGORIES:
            grouped_items[label_map.get(item.category, item.get_category_display())].append(item)

        if item.category == ShopItem.CATEGORY_PROFILE_FONT:
            font_items.append(item)

        if normalized_category == _normalize_category_value(CATEGORY_SET):
            set_items.append(item)

        if normalized_category == _normalize_category_value(CATEGORY_UNIQUE):
            unique_items.append(item)

    owned_items = UserOwnedItem.objects.filter(user=request.user).select_related("item")
    owned_map = {}
    for owned in owned_items:
        owned_map[str(owned.item_id)] = int(owned.quantity or 0)

    owned_effect_map = {}
    for owned in UserOwnedEffect.objects.filter(user=request.user):
        owned_effect_map[str(owned.effect_key)] = int(owned.quantity or 0)

    context = {
        "grouped_items": dict(grouped_items),
        "font_items": font_items,
        "set_items": set_items,
        "unique_items": unique_items,
        "effect_catalog": EFFECT_CATALOG,
        "owned_map_json": json.dumps(owned_map),
        "owned_effect_map_json": json.dumps(owned_effect_map),
        "shop_star_count": shop_star_count,
    }
    return render(request, "shop/shop.html", context)


@login_required
@require_POST
def buy_items_view(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except Exception:
        return JsonResponse({"ok": False, "error": "Invalid JSON payload."}, status=400)

    raw_item_ids = payload.get("item_ids") or []
    if not raw_item_ids:
        return JsonResponse({"ok": False, "error": "No items selected."}, status=400)

    try:
        item_ids = [int(v) for v in raw_item_ids]
    except (TypeError, ValueError):
        return JsonResponse({"ok": False, "error": "Invalid item ids."}, status=400)

    items = list(
        ShopItem.objects.filter(
            id__in=item_ids,
            is_active=True,
            category__in=SHOP_ALLOWED_CATEGORIES,
        )
    )
    if not items:
        return JsonResponse({"ok": False, "error": "Selected items not found."}, status=404)

    item_map = {item.id: item for item in items}
    selected_items = []
    total_cost = 0
    not_found_ids = []

    for item_id in item_ids:
        item = item_map.get(item_id)
        if item:
            selected_items.append(item)
            total_cost += int(item.price_stars or 0)
        else:
            not_found_ids.append(item_id)

    if not selected_items:
        return JsonResponse({"ok": False, "error": "Selected items not found."}, status=404)

    if not_found_ids:
        return JsonResponse(
            {
                "ok": False,
                "error": "Some selected items were not found.",
                "missing_item_ids": not_found_ids,
            },
            status=404,
        )

    already_owned_ids = set(
        UserOwnedItem.objects.filter(
            user=request.user,
            item_id__in=[item.id for item in selected_items],
        ).values_list("item_id", flat=True)
    )

    if already_owned_ids:
        owned_names = [item.name for item in selected_items if item.id in already_owned_ids]
        return JsonResponse(
            {
                "ok": False,
                "error": "Already owned item included.",
                "already_owned": True,
                "owned_item_ids": list(already_owned_ids),
                "owned_item_names": owned_names,
            },
            status=400,
        )

    profile, _ = UserGameProfile.objects.get_or_create(user=request.user)
    current_stars = get_profile_star_value(profile)

    if total_cost > current_stars:
        return JsonResponse({"ok": False, "error": "Not enough stars."}, status=400)

    with transaction.atomic():
        new_star_value = current_stars - total_cost
        if not set_profile_star_value(profile, new_star_value):
            return JsonResponse({"ok": False, "error": "Star field was not found in profile."}, status=500)

        bought_items = []
        for item in selected_items:
            owned = UserOwnedItem.objects.create(
                user=request.user,
                item=item,
                quantity=1,
            )
            bought_items.append({
                "item_id": item.id,
                "quantity": int(owned.quantity or 1),
                "name": item.name,
                "category": item.category,
            })

    return JsonResponse({
        "ok": True,
        "remaining_stars": new_star_value,
        "bought_items": bought_items,
    })


@login_required
@require_POST
def buy_effects_view(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except Exception:
        return JsonResponse({"ok": False, "error": "Invalid JSON payload."}, status=400)

    effect_keys = payload.get("effect_keys") or []
    if not effect_keys:
        return JsonResponse({"ok": False, "error": "No effects selected."}, status=400)

    catalog_map = {item["key"]: item for item in EFFECT_CATALOG}
    selected_effects = []
    total_cost = 0

    for key in effect_keys:
        effect = catalog_map.get(str(key))
        if effect:
            selected_effects.append(effect)
            total_cost += int(effect["price_stars"])

    if not selected_effects:
        return JsonResponse({"ok": False, "error": "Selected effects not found."}, status=404)

    already_owned_keys = set(
        UserOwnedEffect.objects.filter(
            user=request.user,
            effect_key__in=[item["key"] for item in selected_effects],
        ).values_list("effect_key", flat=True)
    )

    if already_owned_keys:
        owned_names = [item["name"] for item in selected_effects if item["key"] in already_owned_keys]
        return JsonResponse(
            {
                "ok": False,
                "error": "Already owned effect included.",
                "already_owned": True,
                "owned_effect_keys": list(already_owned_keys),
                "owned_effect_names": owned_names,
            },
            status=400,
        )

    profile, _ = UserGameProfile.objects.get_or_create(user=request.user)
    current_stars = get_profile_star_value(profile)

    if total_cost > current_stars:
        return JsonResponse({"ok": False, "error": "Not enough stars."}, status=400)

    with transaction.atomic():
        new_star_value = current_stars - total_cost
        if not set_profile_star_value(profile, new_star_value):
            return JsonResponse({"ok": False, "error": "Star field was not found in profile."}, status=500)

        bought_effects = []
        for effect in selected_effects:
            owned = UserOwnedEffect.objects.create(
                user=request.user,
                effect_key=effect["key"],
                quantity=1,
            )
            bought_effects.append({
                "effect_key": effect["key"],
                "quantity": int(owned.quantity or 1),
                "name": effect["name"],
            })

    return JsonResponse({
        "ok": True,
        "remaining_stars": new_star_value,
        "bought_effects": bought_effects,
    })