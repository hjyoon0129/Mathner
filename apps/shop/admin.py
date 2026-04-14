from django import forms
from django.contrib import admin
from django.contrib.auth import get_user_model

from .models import ShopItem, UserOwnedItem, UserFontPreference, UserOwnedEffect

User = get_user_model()


class UserOwnedItemAdminForm(forms.ModelForm):
    class Meta:
        model = UserOwnedItem
        fields = "__all__"

    def clean_quantity(self):
        quantity = self.cleaned_data.get("quantity") or 0
        return max(1, quantity)


class UserOwnedEffectAdminForm(forms.ModelForm):
    class Meta:
        model = UserOwnedEffect
        fields = "__all__"

    def clean_effect_key(self):
        value = (self.cleaned_data.get("effect_key") or "").strip()
        return value.lower().replace("-", "_")

    def clean_quantity(self):
        quantity = self.cleaned_data.get("quantity") or 0
        return max(1, quantity)


@admin.register(ShopItem)
class ShopItemAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "category",
        "gender",
        "price_stars",
        "font_family_key",
        "is_active",
    )
    list_filter = ("category", "gender", "is_active", "font_family_key")
    search_fields = ("name", "description", "image_path", "font_preview_text")
    fields = (
        "name",
        "category",
        "gender",
        "description",
        "price_stars",
        "image_path",
        "font_family_key",
        "font_preview_text",
        "is_active",
    )


@admin.register(UserOwnedItem)
class UserOwnedItemAdmin(admin.ModelAdmin):
    form = UserOwnedItemAdminForm
    list_display = ("id", "user", "item", "item_category", "quantity", "created_at")
    list_filter = ("item__category", "item__gender", "item__is_active")
    search_fields = ("user__username", "user__email", "item__name")
    autocomplete_fields = ("user", "item")
    readonly_fields = ("created_at",)
    fields = ("user", "item", "quantity", "created_at")

    def item_category(self, obj):
        return obj.item.category if obj.item else "-"
    item_category.short_description = "category"


@admin.register(UserOwnedEffect)
class UserOwnedEffectAdmin(admin.ModelAdmin):
    form = UserOwnedEffectAdminForm
    list_display = ("id", "user", "effect_key", "quantity", "created_at")
    search_fields = ("user__username", "user__email", "effect_key")
    autocomplete_fields = ("user",)
    readonly_fields = ("created_at",)
    fields = ("user", "effect_key", "quantity", "created_at")


@admin.register(UserFontPreference)
class UserFontPreferenceAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "nickname_font_item",
        "title_font_item",
        "content_font_item",
        "updated_at",
    )
    search_fields = (
        "user__username",
        "user__email",
        "nickname_font_item__name",
        "title_font_item__name",
        "content_font_item__name",
    )
    autocomplete_fields = (
        "user",
        "nickname_font_item",
        "title_font_item",
        "content_font_item",
    )
    readonly_fields = ("updated_at",)