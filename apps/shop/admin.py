from django import forms
from django.contrib import admin, messages
from django.contrib.auth import get_user_model
from django.shortcuts import redirect, render
from django.urls import path

from .management.commands.seed_shop_effects import EFFECT_CATALOG
from .models import ShopItem, UserOwnedItem, UserFontPreference, UserOwnedEffect

User = get_user_model()


def normalize_effect_key(value):
    return str(value or "").strip().lower().replace("-", "_")


EFFECT_CHOICES = [
    (normalize_effect_key(item["key"]), item["name"])
    for item in EFFECT_CATALOG
]


class UserOwnedItemAdminForm(forms.ModelForm):
    class Meta:
        model = UserOwnedItem
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if "item" in self.fields:
            self.fields["item"].queryset = ShopItem.objects.exclude(
                category=ShopItem.CATEGORY_PROFILE_EFFECT
            ).order_by("category", "name")

    def clean_quantity(self):
        quantity = self.cleaned_data.get("quantity") or 0
        return max(1, quantity)

    def clean_item(self):
        item = self.cleaned_data.get("item")
        if item and item.category == ShopItem.CATEGORY_PROFILE_EFFECT:
            raise forms.ValidationError("Effect items must be managed in User owned effects.")
        return item


class UserOwnedEffectAdminForm(forms.ModelForm):
    class Meta:
        model = UserOwnedEffect
        fields = "__all__"

    def clean_effect_key(self):
        value = self.cleaned_data.get("effect_key") or ""
        return normalize_effect_key(value)

    def clean_quantity(self):
        quantity = self.cleaned_data.get("quantity") or 0
        return max(1, quantity)


class GrantItemsToUserForm(forms.Form):
    user = forms.ModelChoiceField(
        queryset=User.objects.all().order_by("username", "email"),
        label="Target user",
    )
    quantity = forms.IntegerField(
        min_value=1,
        initial=1,
        label="Quantity",
    )


class GrantAllItemsToUserForm(forms.Form):
    user = forms.ModelChoiceField(
        queryset=User.objects.all().order_by("username", "email"),
        label="Target user",
    )
    quantity = forms.IntegerField(
        min_value=1,
        initial=1,
        label="Quantity",
    )
    active_only = forms.BooleanField(
        required=False,
        initial=True,
        label="Only active items",
    )


class GrantEffectsToUserForm(forms.Form):
    user = forms.ModelChoiceField(
        queryset=User.objects.all().order_by("username", "email"),
        label="Target user",
    )
    quantity = forms.IntegerField(
        min_value=1,
        initial=1,
        label="Quantity",
    )


class GrantAllEffectsToUserForm(forms.Form):
    user = forms.ModelChoiceField(
        queryset=User.objects.all().order_by("username", "email"),
        label="Target user",
    )
    quantity = forms.IntegerField(
        min_value=1,
        initial=1,
        label="Quantity",
    )


@admin.register(ShopItem)
class ShopItemAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "category",
        "gender",
        "price_stars",
        "font_family_key",
        "effect_key",
        "effect_preview_class",
        "is_active",
    )
    list_filter = (
        "category",
        "gender",
        "is_active",
        "font_family_key",
        "effect_key",
    )
    search_fields = (
        "name",
        "description",
        "image_path",
        "font_preview_text",
        "effect_key",
        "effect_preview_class",
    )
    fields = (
        "name",
        "category",
        "gender",
        "description",
        "price_stars",
        "image_path",
        "font_family_key",
        "font_preview_text",
        "effect_key",
        "effect_preview_class",
        "is_active",
    )
    actions = ("grant_selected_items_to_user",)

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "grant-selected/",
                self.admin_site.admin_view(self.grant_selected_view),
                name="shop_shopitem_grant_selected",
            ),
            path(
                "grant-all/",
                self.admin_site.admin_view(self.grant_all_view),
                name="shop_shopitem_grant_all",
            ),
        ]
        return custom_urls + urls

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context["grant_all_items_url"] = "grant-all/"
        return super().changelist_view(request, extra_context=extra_context)

    def _grant_items(self, *, user, items, quantity=1):
        created_count = 0
        updated_count = 0
        quantity = max(1, int(quantity or 1))

        for item in items:
            obj, created = UserOwnedItem.objects.get_or_create(
                user=user,
                item=item,
                defaults={"quantity": quantity},
            )

            if created:
                created_count += 1
            else:
                desired_quantity = max(int(obj.quantity or 0), quantity)
                if desired_quantity != obj.quantity:
                    obj.quantity = desired_quantity
                    obj.save(update_fields=["quantity"])
                    updated_count += 1

            if item.category == ShopItem.CATEGORY_PROFILE_EFFECT and item.effect_key:
                UserOwnedEffect.objects.update_or_create(
                    user=user,
                    effect_key=normalize_effect_key(item.effect_key),
                    defaults={"quantity": quantity},
                )

        return created_count, updated_count

    @admin.action(description="Grant checked ShopItems to a user")
    def grant_selected_items_to_user(self, request, queryset):
        selected_ids = list(queryset.values_list("id", flat=True))
        if not selected_ids:
            self.message_user(request, "No ShopItems selected.", level=messages.WARNING)
            return
        request.session["shopitem_grant_selected_ids"] = selected_ids
        return redirect("admin:shop_shopitem_grant_selected")

    def grant_selected_view(self, request):
        selected_ids = request.session.get("shopitem_grant_selected_ids", [])
        queryset = ShopItem.objects.filter(id__in=selected_ids).order_by("category", "id")

        if not selected_ids or not queryset.exists():
            self.message_user(request, "No selected ShopItems found.", level=messages.WARNING)
            return redirect("../")

        if request.method == "POST":
            form = GrantItemsToUserForm(request.POST)
            if form.is_valid():
                user = form.cleaned_data["user"]
                quantity = form.cleaned_data["quantity"]

                created_count, updated_count = self._grant_items(
                    user=user,
                    items=queryset,
                    quantity=quantity,
                )

                self.message_user(
                    request,
                    f"Granted selected items to {user}. created={created_count}, updated={updated_count}",
                    level=messages.SUCCESS,
                )
                request.session.pop("shopitem_grant_selected_ids", None)
                return redirect("../")
        else:
            form = GrantItemsToUserForm()

        context = {
            **self.admin_site.each_context(request),
            "opts": self.model._meta,
            "title": "Grant checked ShopItems to a user",
            "form": form,
            "items": queryset,
            "selected_count": queryset.count(),
        }
        return render(request, "admin/shop/grant_selected_items.html", context)

    def grant_all_view(self, request):
        if request.method == "POST":
            form = GrantAllItemsToUserForm(request.POST)
            if form.is_valid():
                user = form.cleaned_data["user"]
                quantity = form.cleaned_data["quantity"]
                active_only = form.cleaned_data["active_only"]

                queryset = ShopItem.objects.all().order_by("category", "id")
                if active_only:
                    queryset = queryset.filter(is_active=True)

                created_count, updated_count = self._grant_items(
                    user=user,
                    items=queryset,
                    quantity=quantity,
                )

                self.message_user(
                    request,
                    f"Granted all shop items to {user}. created={created_count}, updated={updated_count}",
                    level=messages.SUCCESS,
                )
                return redirect("../")
        else:
            form = GrantAllItemsToUserForm(initial={"active_only": True, "quantity": 1})

        preview_count = ShopItem.objects.filter(is_active=True).count()

        context = {
            **self.admin_site.each_context(request),
            "opts": self.model._meta,
            "title": "Grant all ShopItems to a user",
            "form": form,
            "preview_count": preview_count,
        }
        return render(request, "admin/shop/grant_all_items.html", context)


@admin.register(UserOwnedItem)
class UserOwnedItemAdmin(admin.ModelAdmin):
    form = UserOwnedItemAdminForm
    list_display = ("id", "user", "item", "item_category", "quantity", "created_at")
    list_filter = ("item__category", "item__gender", "item__is_active")
    search_fields = ("user__username", "user__email", "item__name")
    autocomplete_fields = ("user", "item")
    readonly_fields = ("created_at",)
    fields = ("user", "item", "quantity", "created_at")

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.exclude(item__category=ShopItem.CATEGORY_PROFILE_EFFECT)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "item":
            kwargs["queryset"] = ShopItem.objects.exclude(
                category=ShopItem.CATEGORY_PROFILE_EFFECT
            ).order_by("category", "name")
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def item_category(self, obj):
        return obj.item.category if obj.item else "-"
    item_category.short_description = "category"

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)


@admin.register(UserOwnedEffect)
class UserOwnedEffectAdmin(admin.ModelAdmin):
    form = UserOwnedEffectAdminForm
    list_display = ("id", "user", "effect_key", "effect_name", "quantity", "created_at")
    list_filter = ("effect_key",)
    search_fields = ("user__username", "user__email", "effect_key")
    autocomplete_fields = ("user",)
    readonly_fields = ("created_at",)
    fields = ("user", "effect_key", "quantity", "created_at")
    actions = ("grant_selected_effects_to_user",)

    def effect_name(self, obj):
        catalog_map = {
            normalize_effect_key(item["key"]): item["name"]
            for item in EFFECT_CATALOG
        }
        return catalog_map.get(normalize_effect_key(obj.effect_key), obj.effect_key)
    effect_name.short_description = "effect name"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "grant-selected/",
                self.admin_site.admin_view(self.grant_selected_view),
                name="shop_userownedeffect_grant_selected",
            ),
            path(
                "grant-all/",
                self.admin_site.admin_view(self.grant_all_view),
                name="shop_userownedeffect_grant_all",
            ),
        ]
        return custom_urls + urls

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context["grant_all_effects_url"] = "grant-all/"
        return super().changelist_view(request, extra_context=extra_context)

    def _get_all_effect_keys(self):
        return [normalize_effect_key(item["key"]) for item in EFFECT_CATALOG]

    def _grant_effects(self, *, user, effect_keys, quantity=1):
        created_count = 0
        updated_count = 0
        quantity = max(1, int(quantity or 1))

        for effect_key in effect_keys:
            normalized_key = normalize_effect_key(effect_key)
            obj, created = UserOwnedEffect.objects.get_or_create(
                user=user,
                effect_key=normalized_key,
                defaults={"quantity": quantity},
            )

            if created:
                created_count += 1
            else:
                desired_quantity = max(int(obj.quantity or 0), quantity)
                if desired_quantity != obj.quantity:
                    obj.quantity = desired_quantity
                    obj.save(update_fields=["quantity"])
                    updated_count += 1

            effect_item = ShopItem.objects.filter(
                category=ShopItem.CATEGORY_PROFILE_EFFECT,
                effect_key=normalized_key,
                is_active=True,
            ).first()

            if effect_item:
                owned_item, owned_created = UserOwnedItem.objects.get_or_create(
                    user=user,
                    item=effect_item,
                    defaults={"quantity": quantity},
                )
                if not owned_created:
                    desired_quantity = max(int(owned_item.quantity or 0), quantity)
                    if desired_quantity != owned_item.quantity:
                        owned_item.quantity = desired_quantity
                        owned_item.save(update_fields=["quantity"])

        return created_count, updated_count

    @admin.action(description="Grant checked effects to a user")
    def grant_selected_effects_to_user(self, request, queryset):
        selected_ids = list(queryset.values_list("id", flat=True))
        if not selected_ids:
            self.message_user(request, "No effects selected.", level=messages.WARNING)
            return
        request.session["effect_grant_selected_ids"] = selected_ids
        return redirect("admin:shop_userownedeffect_grant_selected")

    def grant_selected_view(self, request):
        selected_ids = request.session.get("effect_grant_selected_ids", [])
        queryset = UserOwnedEffect.objects.filter(id__in=selected_ids).order_by("effect_key", "id")

        if not selected_ids or not queryset.exists():
            self.message_user(request, "No selected effects found.", level=messages.WARNING)
            return redirect("../")

        selected_effect_keys = list(queryset.values_list("effect_key", flat=True).distinct())

        if request.method == "POST":
            form = GrantEffectsToUserForm(request.POST)
            if form.is_valid():
                user = form.cleaned_data["user"]
                quantity = form.cleaned_data["quantity"]

                created_count, updated_count = self._grant_effects(
                    user=user,
                    effect_keys=selected_effect_keys,
                    quantity=quantity,
                )

                self.message_user(
                    request,
                    f"Granted selected effects to {user}. created={created_count}, updated={updated_count}",
                    level=messages.SUCCESS,
                )
                request.session.pop("effect_grant_selected_ids", None)
                return redirect("../")
        else:
            form = GrantEffectsToUserForm()

        context = {
            **self.admin_site.each_context(request),
            "opts": self.model._meta,
            "title": "Grant checked effects to a user",
            "form": form,
            "effects": selected_effect_keys,
            "selected_count": len(selected_effect_keys),
        }
        return render(request, "admin/shop/grant_selected_effects.html", context)

    def grant_all_view(self, request):
        effect_keys = self._get_all_effect_keys()

        if request.method == "POST":
            form = GrantAllEffectsToUserForm(request.POST)
            if form.is_valid():
                user = form.cleaned_data["user"]
                quantity = form.cleaned_data["quantity"]

                created_count, updated_count = self._grant_effects(
                    user=user,
                    effect_keys=effect_keys,
                    quantity=quantity,
                )

                self.message_user(
                    request,
                    f"Granted all effects to {user}. created={created_count}, updated={updated_count}",
                    level=messages.SUCCESS,
                )
                return redirect("../")
        else:
            form = GrantAllEffectsToUserForm(initial={"quantity": 1})

        context = {
            **self.admin_site.each_context(request),
            "opts": self.model._meta,
            "title": "Grant all effects to a user",
            "form": form,
            "effect_count": len(effect_keys),
            "effect_keys": effect_keys,
        }
        return render(request, "admin/shop/grant_all_effects.html", context)

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)

        effect_item = ShopItem.objects.filter(
            category=ShopItem.CATEGORY_PROFILE_EFFECT,
            effect_key=normalize_effect_key(obj.effect_key),
            is_active=True,
        ).first()

        if effect_item:
            owned_item, created = UserOwnedItem.objects.get_or_create(
                user=obj.user,
                item=effect_item,
                defaults={"quantity": max(1, int(obj.quantity or 1))},
            )
            if not created:
                desired_quantity = max(int(owned_item.quantity or 0), int(obj.quantity or 1))
                if desired_quantity != owned_item.quantity:
                    owned_item.quantity = desired_quantity
                    owned_item.save(update_fields=["quantity"])


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