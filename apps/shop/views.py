import json
from collections import defaultdict

from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_POST

from apps.core.models import UserGameProfile
from .models import ShopItem, UserOwnedItem, UserOwnedEffect


CATEGORY_SET = ShopItem.CATEGORY_SET
CATEGORY_UNIQUE = ShopItem.CATEGORY_UNIQUE

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
    ShopItem.CATEGORY_PROFILE_EFFECT,
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
        ShopItem.CATEGORY_PROFILE_EFFECT: "effect",
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
    effect_items = []
    set_items = []
    unique_items = []

    for item in items:
        item.slot = _slot_label_from_category(item.category)
        normalized_category = _normalize_category_value(item.category)

        if item.category in AVATAR_MAIN_CATEGORIES:
            grouped_items[label_map.get(item.category, item.get_category_display())].append(item)

        if item.category == ShopItem.CATEGORY_PROFILE_FONT:
            font_items.append(item)

        if item.category == ShopItem.CATEGORY_PROFILE_EFFECT:
            effect_items.append(item)

        if normalized_category == _normalize_category_value(CATEGORY_SET):
            set_items.append(item)

        if normalized_category == _normalize_category_value(CATEGORY_UNIQUE):
            unique_items.append(item)

    owned_items = UserOwnedItem.objects.filter(user=request.user).select_related("item")
    owned_map = {}
    owned_effect_map = {}

    for owned in owned_items:
        owned_map[str(owned.item_id)] = int(owned.quantity or 0)

        if owned.item and owned.item.category == ShopItem.CATEGORY_PROFILE_EFFECT and owned.item.effect_key:
            owned_effect_map[str(owned.item.effect_key)] = int(owned.quantity or 0)

    for owned in UserOwnedEffect.objects.filter(user=request.user):
        normalized_key = str(owned.effect_key or "").strip().lower().replace("-", "_")
        owned_effect_map[normalized_key] = max(
            int(owned.quantity or 0),
            int(owned_effect_map.get(normalized_key, 0) or 0),
        )

    effect_catalog = [
        {
            "item_id": item.id,
            "key": item.effect_key.replace("_", "-") if item.effect_key else "",
            "name": item.name,
            "price_stars": int(item.price_stars or 0),
            "preview_class": item.effect_preview_class or "",
        }
        for item in effect_items
    ]

    context = {
        "grouped_items": dict(grouped_items),
        "font_items": font_items,
        "set_items": set_items,
        "unique_items": unique_items,
        "effect_catalog": effect_catalog,
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

    normalized_keys = [
        str(key or "").strip().lower().replace("-", "_")
        for key in effect_keys
    ]

    selected_items = list(
        ShopItem.objects.filter(
            category=ShopItem.CATEGORY_PROFILE_EFFECT,
            is_active=True,
            effect_key__in=normalized_keys,
        )
    )

    if not selected_items:
        return JsonResponse({"ok": False, "error": "Selected effects not found."}, status=404)

    selected_map = {item.effect_key: item for item in selected_items}
    ordered_selected_items = []
    total_cost = 0

    for key in normalized_keys:
        item = selected_map.get(key)
        if item:
            ordered_selected_items.append(item)
            total_cost += int(item.price_stars or 0)

    already_owned_item_ids = set(
        UserOwnedItem.objects.filter(
            user=request.user,
            item_id__in=[item.id for item in ordered_selected_items],
        ).values_list("item_id", flat=True)
    )

    legacy_owned_keys = set(
        UserOwnedEffect.objects.filter(
            user=request.user,
            effect_key__in=normalized_keys,
        ).values_list("effect_key", flat=True)
    )

    owned_names = []
    if already_owned_item_ids or legacy_owned_keys:
        for item in ordered_selected_items:
            if item.id in already_owned_item_ids or item.effect_key in legacy_owned_keys:
                owned_names.append(item.name)

        return JsonResponse(
            {
                "ok": False,
                "error": "Already owned effect included.",
                "already_owned": True,
                "owned_effect_keys": list(legacy_owned_keys) + [
                    item.effect_key for item in ordered_selected_items if item.id in already_owned_item_ids
                ],
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
        for item in ordered_selected_items:
            UserOwnedItem.objects.create(
                user=request.user,
                item=item,
                quantity=1,
            )

            UserOwnedEffect.objects.update_or_create(
                user=request.user,
                effect_key=item.effect_key,
                defaults={"quantity": 1},
            )

            bought_effects.append({
                "effect_key": item.effect_key.replace("_", "-"),
                "quantity": 1,
                "name": item.name,
                "item_id": item.id,
            })

    return JsonResponse({
        "ok": True,
        "remaining_stars": new_star_value,
        "bought_effects": bought_effects,
    })