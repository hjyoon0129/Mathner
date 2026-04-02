import json
from collections import defaultdict

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_POST

from apps.core.models import UserGameProfile
from .models import ShopItem, UserOwnedItem


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


@login_required
def shop_view(request):
    profile, _ = UserGameProfile.objects.get_or_create(user=request.user)
    shop_star_count = get_profile_star_value(profile)

    items = (
        ShopItem.objects
        .filter(
            is_active=True,
            category__in=[
                ShopItem.CATEGORY_AVATAR_CLOTH,
                ShopItem.CATEGORY_AVATAR_HAT,
                ShopItem.CATEGORY_AVATAR_SHOES,
            ],
        )
        .order_by("category", "id")
    )

    grouped_items = defaultdict(list)
    label_map = {
        ShopItem.CATEGORY_AVATAR_HAT: "Avatar Hats",
        ShopItem.CATEGORY_AVATAR_CLOTH: "Avatar Clothes",
        ShopItem.CATEGORY_AVATAR_SHOES: "Avatar Shoes",
    }

    for item in items:
        grouped_items[label_map.get(item.category, item.get_category_display())].append(item)

    owned_items = UserOwnedItem.objects.filter(user=request.user).select_related("item")
    owned_map = {}
    for owned in owned_items:
        owned_map[str(owned.item_id)] = int(owned.quantity or 0)

    context = {
        "grouped_items": dict(grouped_items),
        "owned_map_json": json.dumps(owned_map),
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

    item_ids = payload.get("item_ids") or []
    if not item_ids:
        return JsonResponse({"ok": False, "error": "No items selected."}, status=400)

    items = list(
        ShopItem.objects.filter(
            id__in=item_ids,
            is_active=True,
            category__in=[
                ShopItem.CATEGORY_AVATAR_CLOTH,
                ShopItem.CATEGORY_AVATAR_HAT,
                ShopItem.CATEGORY_AVATAR_SHOES,
            ],
        )
    )
    if not items:
        return JsonResponse({"ok": False, "error": "Selected items not found."}, status=404)

    profile, _ = UserGameProfile.objects.get_or_create(user=request.user)
    current_stars = get_profile_star_value(profile)

    item_map = {item.id: item for item in items}
    selected_items = []
    total_cost = 0

    for item_id in item_ids:
        item = item_map.get(int(item_id))
        if item:
            selected_items.append(item)
            total_cost += int(item.price_stars or 0)

    if total_cost > current_stars:
        return JsonResponse({"ok": False, "error": "Not enough stars."}, status=400)

    new_star_value = current_stars - total_cost
    if not set_profile_star_value(profile, new_star_value):
        return JsonResponse({"ok": False, "error": "Star field was not found in profile."}, status=500)

    bought_items = []
    for item in selected_items:
        owned, _ = UserOwnedItem.objects.get_or_create(
            user=request.user,
            item=item,
            defaults={"quantity": 0},
        )
        owned.quantity = int(owned.quantity or 0) + 1
        owned.save(update_fields=["quantity"])

        bought_items.append({
            "item_id": item.id,
            "quantity": int(owned.quantity or 0),
            "name": item.name,
        })

    return JsonResponse({
        "ok": True,
        "remaining_stars": new_star_value,
        "bought_items": bought_items,
    })
