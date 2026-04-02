from django.contrib import admin
from .models import ShopItem, UserOwnedItem


@admin.register(ShopItem)
class ShopItemAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "category", "price_stars", "is_active")
    list_filter = ("category", "is_active")
    search_fields = ("name", "description")


@admin.register(UserOwnedItem)
class UserOwnedItemAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "item", "quantity", "created_at")
    list_filter = ("item__category",)
    search_fields = ("user__username", "item__name")