from django import forms
from django.contrib import admin, messages
from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import redirect, render
from django.urls import path
from django.utils.html import format_html

from .management.commands.seed_shop_effects import EFFECT_CATALOG
from .models import ShopItem, UserFontPreference, UserOwnedEffect, UserOwnedItem

User = get_user_model()


GRANT_ADMIN_STYLE = """
<style>
  .mathner-admin-readable-panel {
    background: #111827 !important;
    color: #f9fafb !important;
    border: 1px solid #374151 !important;
    border-radius: 10px !important;
    padding: 14px 16px !important;
    max-height: 520px !important;
    overflow: auto !important;
    line-height: 1.7 !important;
  }

  .mathner-admin-readable-panel,
  .mathner-admin-readable-panel * {
    color: #f9fafb !important;
  }

  .mathner-admin-readable-panel .muted {
    color: #cbd5e1 !important;
  }

  .mathner-admin-readable-panel .good {
    color: #86efac !important;
  }

  .mathner-admin-readable-panel .warn {
    color: #fde68a !important;
  }

  .mathner-admin-readable-list {
    margin: 0 !important;
    padding-left: 20px !important;
  }

  .mathner-admin-readable-list li {
    margin: 4px 0 !important;
    color: #f9fafb !important;
  }

  .mathner-admin-danger-note {
    background: #450a0a !important;
    color: #fee2e2 !important;
    border: 1px solid #991b1b !important;
    border-radius: 10px !important;
    padding: 12px 14px !important;
    margin: 12px 0 !important;
  }

  .mathner-admin-info-note {
    background: #082f49 !important;
    color: #e0f2fe !important;
    border: 1px solid #0369a1 !important;
    border-radius: 10px !important;
    padding: 12px 14px !important;
    margin: 12px 0 !important;
  }

  .mathner-preview-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 84px;
    padding: 4px 8px;
    border-radius: 999px;
    background: #1f2937;
    color: #f9fafb !important;
    font-weight: 700;
    font-size: 12px;
  }

  .mathner-admin-help {
    background: #0f172a !important;
    color: #e5e7eb !important;
    border: 1px solid #334155 !important;
    border-radius: 12px !important;
    padding: 12px 14px !important;
    margin: 0 0 14px !important;
    line-height: 1.6 !important;
  }

  .mathner-admin-help strong {
    color: #fef08a !important;
  }
</style>
"""


def normalize_effect_key(value):
    return str(value or "").strip().lower().replace("-", "_").replace(" ", "_")


def effect_key_variants(effect_keys):
    variants = set()

    for key in effect_keys:
        normalized = normalize_effect_key(key)
        if not normalized:
            continue

        variants.add(normalized)
        variants.add(normalized.replace("_", "-"))

    return list(variants)


def model_field_names(model):
    return {
        field.name
        for field in model._meta.get_fields()
        if hasattr(field, "attname")
    }


def category_value(name, fallback):
    return getattr(ShopItem, name, fallback)


CATEGORY_PROFILE_EFFECT = category_value("CATEGORY_PROFILE_EFFECT", "profile_effect")
CATEGORY_PROFILE_FONT = category_value("CATEGORY_PROFILE_FONT", "profile_font")
CATEGORY_SET = category_value("CATEGORY_SET", "set")
CATEGORY_UNIQUE = category_value("CATEGORY_UNIQUE", "unique")
CATEGORY_AVATAR_FACE = category_value("CATEGORY_AVATAR_FACE", "avatar_face")
CATEGORY_AVATAR_HAIR = category_value("CATEGORY_AVATAR_HAIR", "avatar_hair")
CATEGORY_AVATAR_BODY = category_value("CATEGORY_AVATAR_BODY", "avatar_body")
CATEGORY_AVATAR_TOP = category_value("CATEGORY_AVATAR_TOP", "avatar_top")
CATEGORY_AVATAR_CLOTH = category_value("CATEGORY_AVATAR_CLOTH", "avatar_cloth")
CATEGORY_AVATAR_PANTS = category_value("CATEGORY_AVATAR_PANTS", "avatar_pants")
CATEGORY_AVATAR_SHOES = category_value("CATEGORY_AVATAR_SHOES", "avatar_shoes")
CATEGORY_AVATAR_HAT = category_value("CATEGORY_AVATAR_HAT", "avatar_hat")


def get_item_slot_value(item):
    if not item:
        return "-"

    return (
        getattr(item, "resolved_equip_slot", None)
        or getattr(item, "equip_slot", None)
        or "No slot"
    )


def active_effect_choices():
    qs = (
        ShopItem.objects.filter(
            category=CATEGORY_PROFILE_EFFECT,
            is_active=True,
        )
        .exclude(effect_key="")
        .order_by("name", "effect_key")
    )

    choices = []

    for item in qs:
        key = normalize_effect_key(item.effect_key)
        if not key:
            continue

        choices.append((key, item.name or key))

    return choices


def catalog_effect_name_map():
    return {
        normalize_effect_key(item["key"]): item["name"]
        for item in EFFECT_CATALOG
    }


def active_effect_key_set():
    return {
        normalize_effect_key(key)
        for key in ShopItem.objects.filter(
            category=CATEGORY_PROFILE_EFFECT,
            is_active=True,
        )
        .exclude(effect_key="")
        .values_list("effect_key", flat=True)
        if normalize_effect_key(key)
    }


def all_effect_key_set():
    keys = set(active_effect_key_set())

    for key in UserOwnedEffect.objects.values_list("effect_key", flat=True):
        normalized = normalize_effect_key(key)
        if normalized:
            keys.add(normalized)

    for key in ShopItem.objects.filter(
        category=CATEGORY_PROFILE_EFFECT,
    ).values_list("effect_key", flat=True):
        normalized = normalize_effect_key(key)
        if normalized:
            keys.add(normalized)

    return keys


def clear_font_preferences_for_font_items(font_item_ids):
    if not font_item_ids:
        return 0

    fields = model_field_names(UserFontPreference)
    target_fields = [
        "nickname_font_item",
        "title_font_item",
        "content_font_item",
    ]

    updated = 0

    for field_name in target_fields:
        if field_name not in fields:
            continue

        qs = UserFontPreference.objects.filter(
            **{f"{field_name}_id__in": font_item_ids}
        )

        updated += qs.count()
        qs.update(**{field_name: None})

    return updated


def clear_font_preferences_for_effect_keys(effect_keys):
    variants = effect_key_variants(effect_keys)
    if not variants:
        return 0

    fields = model_field_names(UserFontPreference)
    target_fields = [
        "nickname_effect_key",
        "title_effect_key",
        "content_effect_key",
    ]

    updated = 0

    for field_name in target_fields:
        if field_name not in fields:
            continue

        qs = UserFontPreference.objects.filter(
            **{f"{field_name}__in": variants}
        )

        updated += qs.count()
        qs.update(**{field_name: "none"})

    return updated


def reset_font_preferences_queryset(queryset):
    fields = model_field_names(UserFontPreference)
    update_data = {}

    for field_name in ["nickname_font_item", "title_font_item", "content_font_item"]:
        if field_name in fields:
            update_data[field_name] = None

    for field_name in ["nickname_effect_key", "title_effect_key", "content_effect_key"]:
        if field_name in fields:
            update_data[field_name] = "none"

    for field_name in ["nickname_color", "title_color", "content_color"]:
        if field_name in fields:
            update_data[field_name] = ""

    for field_name in ["nickname_scale", "nickname_letter_spacing"]:
        if field_name in fields:
            update_data[field_name] = None

    if not update_data:
        return 0

    return queryset.update(**update_data)


def cleanup_related_for_shopitems(items):
    items = list(items)

    if not items:
        return {
            "owned_items_deleted": 0,
            "owned_effects_deleted": 0,
            "font_pref_cleared": 0,
            "effect_pref_cleared": 0,
        }

    item_ids = [item.id for item in items if item.id]

    font_item_ids = [
        item.id
        for item in items
        if item.id and item.category == CATEGORY_PROFILE_FONT
    ]

    effect_keys = [
        item.effect_key
        for item in items
        if item.category == CATEGORY_PROFILE_EFFECT and item.effect_key
    ]

    owned_items_deleted = 0
    owned_effects_deleted = 0

    if item_ids:
        owned_items_deleted = UserOwnedItem.objects.filter(
            item_id__in=item_ids
        ).delete()[0]

    if effect_keys:
        owned_effects_deleted = UserOwnedEffect.objects.filter(
            effect_key__in=effect_key_variants(effect_keys)
        ).delete()[0]

    font_pref_cleared = clear_font_preferences_for_font_items(font_item_ids)
    effect_pref_cleared = clear_font_preferences_for_effect_keys(effect_keys)

    return {
        "owned_items_deleted": owned_items_deleted,
        "owned_effects_deleted": owned_effects_deleted,
        "font_pref_cleared": font_pref_cleared,
        "effect_pref_cleared": effect_pref_cleared,
    }


def cleanup_inactive_and_orphan_shop_records():
    inactive_items = list(ShopItem.objects.filter(is_active=False))
    inactive_result = cleanup_related_for_shopitems(inactive_items)

    active_keys = active_effect_key_set()
    orphan_effect_ids = []

    for owned_effect in UserOwnedEffect.objects.all():
        key = normalize_effect_key(owned_effect.effect_key)

        if not key or key not in active_keys:
            orphan_effect_ids.append(owned_effect.id)

    orphan_effects_deleted = 0

    if orphan_effect_ids:
        orphan_effects_deleted = UserOwnedEffect.objects.filter(
            id__in=orphan_effect_ids
        ).delete()[0]

    inactive_owned_items_deleted = UserOwnedItem.objects.filter(
        item__is_active=False
    ).delete()[0]

    fields = model_field_names(UserFontPreference)
    inactive_font_pref_cleared = 0

    for field_name in ["nickname_font_item", "title_font_item", "content_font_item"]:
        if field_name not in fields:
            continue

        qs = UserFontPreference.objects.filter(
            **{f"{field_name}__is_active": False}
        )

        inactive_font_pref_cleared += qs.count()
        qs.update(**{field_name: None})

    return {
        **inactive_result,
        "orphan_effects_deleted": orphan_effects_deleted,
        "inactive_owned_items_deleted": inactive_owned_items_deleted,
        "inactive_font_pref_cleared": inactive_font_pref_cleared,
    }


def purge_all_user_shop_data():
    with transaction.atomic():
        owned_items_deleted = UserOwnedItem.objects.all().delete()[0]
        owned_effects_deleted = UserOwnedEffect.objects.all().delete()[0]
        font_pref_reset = reset_font_preferences_queryset(UserFontPreference.objects.all())

    return {
        "owned_items_deleted": owned_items_deleted,
        "owned_effects_deleted": owned_effects_deleted,
        "font_pref_reset": font_pref_reset,
    }


def purge_all_shopitems_and_user_shop_data():
    with transaction.atomic():
        user_data_result = purge_all_user_shop_data()
        shopitems_deleted = ShopItem.objects.all().delete()[0]

    return {
        **user_data_result,
        "shopitems_deleted": shopitems_deleted,
    }


class ShopItemAdminForm(forms.ModelForm):
    class Meta:
        model = ShopItem
        fields = "__all__"

    def clean(self):
        cleaned = super().clean()
        category = cleaned.get("category")
        equip_slot = cleaned.get("equip_slot") or ""

        if category in {CATEGORY_PROFILE_FONT, CATEGORY_PROFILE_EFFECT}:
            cleaned["equip_slot"] = ""

        if category in {CATEGORY_SET, CATEGORY_UNIQUE} and not equip_slot:
            raise forms.ValidationError("Set/Unique items must have an equip slot.")

        if category not in {
            CATEGORY_SET,
            CATEGORY_UNIQUE,
            CATEGORY_AVATAR_FACE,
            CATEGORY_AVATAR_HAIR,
            CATEGORY_AVATAR_BODY,
            CATEGORY_AVATAR_TOP,
            CATEGORY_AVATAR_CLOTH,
            CATEGORY_AVATAR_PANTS,
            CATEGORY_AVATAR_SHOES,
            CATEGORY_AVATAR_HAT,
        }:
            cleaned["equip_slot"] = ""

        return cleaned


class UserOwnedItemAdminForm(forms.ModelForm):
    class Meta:
        model = UserOwnedItem
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if "item" in self.fields:
            self.fields["item"].queryset = ShopItem.objects.all().order_by(
                "category",
                "equip_slot",
                "gender",
                "name",
                "id",
            )

    def clean_quantity(self):
        quantity = self.cleaned_data.get("quantity") or 0
        return max(1, quantity)


class UserOwnedEffectAdminForm(forms.ModelForm):
    class Meta:
        model = UserOwnedEffect
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if "effect_key" not in self.fields:
            return

        choices = active_effect_choices()
        current = ""

        if self.instance and self.instance.pk:
            current = normalize_effect_key(self.instance.effect_key)

        choice_keys = {key for key, _ in choices}

        if current and current not in choice_keys:
            choices.insert(0, (current, f"{current} (inactive/orphan)"))

        if not choices:
            choices = [
                (key, catalog_effect_name_map().get(key, key))
                for key in sorted(all_effect_key_set())
            ]

        if not choices:
            choices = [("", "No active effects")]

        self.fields["effect_key"] = forms.ChoiceField(
            choices=choices,
            required=True,
            label=self.fields["effect_key"].label,
            help_text="Active Profile Effect ShopItems are preferred. Orphan keys can be deleted here.",
        )

    def clean_effect_key(self):
        return normalize_effect_key(self.cleaned_data.get("effect_key") or "")

    def clean_quantity(self):
        quantity = self.cleaned_data.get("quantity") or 0
        return max(1, quantity)


class GrantItemsToUserForm(forms.Form):
    user = forms.ModelChoiceField(
        queryset=User.objects.all().order_by("username", "email"),
        label="Target user",
    )
    quantity = forms.IntegerField(min_value=1, initial=1, label="Quantity")


class GrantAllItemsToUserForm(forms.Form):
    user = forms.ModelChoiceField(
        queryset=User.objects.all().order_by("username", "email"),
        label="Target user",
    )
    quantity = forms.IntegerField(min_value=1, initial=1, label="Quantity")
    active_only = forms.BooleanField(required=False, initial=True, label="Only active items")


class GrantFilteredItemsToUserForm(forms.Form):
    user = forms.ModelChoiceField(
        queryset=User.objects.all().order_by("username", "email"),
        label="Target user",
    )
    category = forms.ChoiceField(
        required=False,
        label="Category",
        choices=(),
    )
    equip_slot = forms.ChoiceField(
        required=False,
        label="Equip slot",
        choices=(),
    )
    gender = forms.ChoiceField(
        required=False,
        label="Gender",
        choices=(),
    )
    active_only = forms.BooleanField(
        required=False,
        initial=True,
        label="Only active items",
    )
    quantity = forms.IntegerField(
        min_value=1,
        initial=1,
        label="Quantity",
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        category_values = (
            ShopItem.objects
            .exclude(category="")
            .order_by("category")
            .values_list("category", flat=True)
            .distinct()
        )

        slot_values = (
            ShopItem.objects
            .exclude(equip_slot="")
            .order_by("equip_slot")
            .values_list("equip_slot", flat=True)
            .distinct()
        )

        gender_values = (
            ShopItem.objects
            .exclude(gender="")
            .order_by("gender")
            .values_list("gender", flat=True)
            .distinct()
        )

        self.fields["category"].choices = [("", "All categories")] + [
            (value, value) for value in category_values
        ]

        self.fields["equip_slot"].choices = [("", "All slots")] + [
            (value, value) for value in slot_values
        ]

        self.fields["gender"].choices = [("", "All genders")] + [
            (value, value) for value in gender_values
        ]


class GrantEffectsToUserForm(forms.Form):
    user = forms.ModelChoiceField(
        queryset=User.objects.all().order_by("username", "email"),
        label="Target user",
    )
    quantity = forms.IntegerField(min_value=1, initial=1, label="Quantity")


class GrantAllEffectsToUserForm(forms.Form):
    user = forms.ModelChoiceField(
        queryset=User.objects.all().order_by("username", "email"),
        label="Target user",
    )
    quantity = forms.IntegerField(min_value=1, initial=1, label="Quantity")


@admin.register(ShopItem)
class ShopItemAdmin(admin.ModelAdmin):
    form = ShopItemAdminForm

    ordering = (
        "category",
        "equip_slot",
        "gender",
        "name",
        "id",
    )
    list_per_page = 100
    list_max_show_all = 1000
    actions_selection_counter = True
    show_full_result_count = True

    list_display = (
        "id",
        "name",
        "category",
        "equip_slot",
        "gender",
        "price_stars",
        "font_family_key",
        "effect_key",
        "effect_preview_class",
        "item_type_badge",
        "is_active",
    )
    list_filter = (
        "category",
        "equip_slot",
        "gender",
        "is_active",
        "font_family_key",
        "effect_key",
    )
    search_fields = (
        "id",
        "name",
        "description",
        "image_path",
        "font_family_key",
        "font_preview_text",
        "effect_key",
        "effect_preview_class",
    )
    fields = (
        "name",
        "category",
        "equip_slot",
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
    actions = (
        "grant_filtered_items_to_user",
        "grant_selected_items_to_user",
        "grant_visible_filtered_items_to_user",
        "deactivate_and_cleanup_selected",
        "cleanup_inactive_or_orphan_records",
        "delete_selected_and_cleanup",
        "purge_all_user_owned_shop_data",
        "delete_all_shopitems_and_cleanup_everything",
    )

    def get_queryset(self, request):
        return super().get_queryset(request).order_by(
            "category",
            "equip_slot",
            "gender",
            "name",
            "id",
        )

    def _get_posted_admin_action(self, request):
        for action in request.POST.getlist("action"):
            action = str(action or "").strip()

            if action:
                return action

        return ""

    def changelist_view(self, request, extra_context=None):
        if request.method == "POST":
            action = self._get_posted_admin_action(request)

            if action == "grant_filtered_items_to_user":
                return redirect("admin:shop_shopitem_grant_filtered")

        extra_context = extra_context or {}
        extra_context["grant_all_items_url"] = "grant-all/"
        extra_context["grant_filtered_items_url"] = "grant-filtered/"
        extra_context["mathner_admin_style"] = GRANT_ADMIN_STYLE
        extra_context["selection_help"] = (
            "엑셀식 지급: Action 드롭다운에서 'Grant by category / slot to a user' 선택 → Run → "
            "다음 화면에서 Category, Equip slot, Gender를 고른 뒤 아래 리스트에서 필요한 아이템만 체크해서 지급합니다."
        )

        return super().changelist_view(request, extra_context=extra_context)

    def response_action(self, request, queryset):
        action = self._get_posted_admin_action(request)

        if action == "grant_filtered_items_to_user":
            return redirect("admin:shop_shopitem_grant_filtered")

        return super().response_action(request, queryset)

    def item_type_badge(self, obj):
        label = obj.category or "-"

        if obj.category == CATEGORY_PROFILE_EFFECT:
            label = "Effect"
        elif obj.category == CATEGORY_PROFILE_FONT:
            label = "Font"

        return format_html(
            '<span class="mathner-preview-chip">{}</span>',
            label,
        )

    item_type_badge.short_description = "type"
    item_type_badge.admin_order_field = "category"

    class Media:
        css = {
            "all": (),
        }

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
            path(
                "grant-filtered/",
                self.admin_site.admin_view(self.grant_filtered_view),
                name="shop_shopitem_grant_filtered",
            ),
        ]
        return custom_urls + urls

    def save_model(self, request, obj, form, change):
        old_obj = None

        if change and obj.pk:
            old_obj = ShopItem.objects.filter(pk=obj.pk).first()

        super().save_model(request, obj, form, change)

        cleanup_targets = []

        if obj.pk and not obj.is_active:
            cleanup_targets.append(obj)

        if old_obj:
            old_effect_key = normalize_effect_key(old_obj.effect_key)
            new_effect_key = normalize_effect_key(obj.effect_key)

            if (
                old_obj.category == CATEGORY_PROFILE_EFFECT
                and old_effect_key
                and old_effect_key != new_effect_key
            ):
                UserOwnedEffect.objects.filter(
                    effect_key__in=effect_key_variants([old_effect_key])
                ).delete()
                clear_font_preferences_for_effect_keys([old_effect_key])

            if (
                old_obj.category == CATEGORY_PROFILE_FONT
                and obj.category != CATEGORY_PROFILE_FONT
            ):
                clear_font_preferences_for_font_items([obj.pk])

        if cleanup_targets:
            result = cleanup_related_for_shopitems(cleanup_targets)
            self.message_user(
                request,
                f"Inactive item cleanup complete: {result}",
                level=messages.WARNING,
            )

    def delete_model(self, request, obj):
        result = cleanup_related_for_shopitems([obj])
        super().delete_model(request, obj)
        self.message_user(
            request,
            f"Deleted item and cleaned related owned records: {result}",
            level=messages.SUCCESS,
        )

    def delete_queryset(self, request, queryset):
        items = list(queryset)
        result = cleanup_related_for_shopitems(items)
        queryset.delete()
        self.message_user(
            request,
            f"Deleted selected items and cleaned related owned records: {result}",
            level=messages.SUCCESS,
        )

    def _grant_items(self, *, user, items, quantity=1):
        created_count = 0
        updated_count = 0
        skipped_count = 0
        effect_created_count = 0
        effect_updated_count = 0

        quantity = max(1, int(quantity or 1))

        for item in items:
            if not item.is_active:
                skipped_count += 1
                continue

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

            if item.category == CATEGORY_PROFILE_EFFECT and item.effect_key:
                effect_obj, effect_created = UserOwnedEffect.objects.get_or_create(
                    user=user,
                    effect_key=normalize_effect_key(item.effect_key),
                    defaults={"quantity": quantity},
                )

                if effect_created:
                    effect_created_count += 1
                else:
                    desired_effect_quantity = max(int(effect_obj.quantity or 0), quantity)

                    if desired_effect_quantity != effect_obj.quantity:
                        effect_obj.quantity = desired_effect_quantity
                        effect_obj.save(update_fields=["quantity"])
                        effect_updated_count += 1

        return {
            "created": created_count,
            "updated": updated_count,
            "skipped": skipped_count,
            "effect_created": effect_created_count,
            "effect_updated": effect_updated_count,
        }

    @admin.action(description="Grant by category / slot to a user")
    def grant_filtered_items_to_user(self, request, queryset):
        return redirect("admin:shop_shopitem_grant_filtered")

    @admin.action(description="Grant checked ShopItems to a user")
    def grant_selected_items_to_user(self, request, queryset):
        selected_ids = list(queryset.values_list("id", flat=True))

        if not selected_ids:
            self.message_user(request, "No ShopItems selected.", level=messages.WARNING)
            return

        request.session["shopitem_grant_selected_ids"] = selected_ids
        return redirect("admin:shop_shopitem_grant_selected")

    @admin.action(description="Grant current checked/filtered ShopItems to a user")
    def grant_visible_filtered_items_to_user(self, request, queryset):
        selected_ids = list(queryset.values_list("id", flat=True))

        if not selected_ids:
            self.message_user(request, "No filtered ShopItems selected.", level=messages.WARNING)
            return

        request.session["shopitem_grant_selected_ids"] = selected_ids
        return redirect("admin:shop_shopitem_grant_selected")

    @admin.action(description="Deactivate selected and cleanup owned records")
    def deactivate_and_cleanup_selected(self, request, queryset):
        items = list(queryset)

        queryset.update(is_active=False)
        result = cleanup_related_for_shopitems(items)

        self.message_user(
            request,
            f"Selected items deactivated and cleaned: {result}",
            level=messages.SUCCESS,
        )

    @admin.action(description="Cleanup inactive/orphan owned shop records")
    def cleanup_inactive_or_orphan_records(self, request, queryset):
        result = cleanup_inactive_and_orphan_shop_records()

        self.message_user(
            request,
            f"Cleanup complete: {result}",
            level=messages.SUCCESS,
        )

    @admin.action(description="Delete selected ShopItems and cleanup all related records")
    def delete_selected_and_cleanup(self, request, queryset):
        items = list(queryset)
        result = cleanup_related_for_shopitems(items)
        deleted = queryset.delete()[0]

        self.message_user(
            request,
            f"Deleted selected ShopItems={deleted}, cleanup={result}",
            level=messages.WARNING,
        )

    @admin.action(description="DANGER: Delete ALL user owned shop data and reset font/effects")
    def purge_all_user_owned_shop_data(self, request, queryset):
        result = purge_all_user_shop_data()

        self.message_user(
            request,
            f"Purged ALL user owned shop data and reset font/effects: {result}",
            level=messages.WARNING,
        )

    @admin.action(description="DANGER: Delete ALL ShopItems + owned items/effects/preferences")
    def delete_all_shopitems_and_cleanup_everything(self, request, queryset):
        result = purge_all_shopitems_and_user_shop_data()

        self.message_user(
            request,
            f"Deleted ALL ShopItems and all related shop user data: {result}",
            level=messages.ERROR,
        )

    def grant_selected_view(self, request):
        selected_ids = request.session.get("shopitem_grant_selected_ids", [])

        queryset = ShopItem.objects.filter(
            id__in=selected_ids,
            is_active=True,
        ).order_by("category", "equip_slot", "gender", "name", "id")

        if not selected_ids or not queryset.exists():
            self.message_user(request, "No active selected ShopItems found.", level=messages.WARNING)
            return redirect("../")

        if request.method == "POST":
            form = GrantItemsToUserForm(request.POST)

            if form.is_valid():
                user = form.cleaned_data["user"]
                quantity = form.cleaned_data["quantity"]

                result = self._grant_items(
                    user=user,
                    items=queryset,
                    quantity=quantity,
                )

                self.message_user(
                    request,
                    f"Granted selected items to {user}. {result}",
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
            "mathner_admin_style": GRANT_ADMIN_STYLE,
        }

        return render(request, "admin/shop/grant_selected_items.html", context)

    def grant_all_view(self, request):
        if request.method == "POST":
            form = GrantAllItemsToUserForm(request.POST)

            if form.is_valid():
                user = form.cleaned_data["user"]
                quantity = form.cleaned_data["quantity"]
                active_only = form.cleaned_data["active_only"]

                queryset = ShopItem.objects.all().order_by(
                    "category",
                    "equip_slot",
                    "gender",
                    "name",
                    "id",
                )

                if active_only:
                    queryset = queryset.filter(is_active=True)

                result = self._grant_items(
                    user=user,
                    items=queryset,
                    quantity=quantity,
                )

                self.message_user(
                    request,
                    f"Granted all shop items to {user}. {result}",
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
            "mathner_admin_style": GRANT_ADMIN_STYLE,
        }

        return render(request, "admin/shop/grant_all_items.html", context)

    def grant_filtered_view(self, request):
        candidate_items = ShopItem.objects.all().order_by(
            "category",
            "equip_slot",
            "gender",
            "name",
            "id",
        )

        preview_count = candidate_items.filter(is_active=True).count()

        if request.method == "POST":
            form = GrantFilteredItemsToUserForm(request.POST)

            if form.is_valid():
                user = form.cleaned_data["user"]
                category = form.cleaned_data["category"]
                equip_slot = form.cleaned_data["equip_slot"]
                gender = form.cleaned_data["gender"]
                active_only = form.cleaned_data["active_only"]
                quantity = form.cleaned_data["quantity"]

                selected_ids = [
                    value
                    for value in request.POST.getlist("selected_item_ids")
                    if str(value).isdigit()
                ]

                if not selected_ids:
                    self.message_user(
                        request,
                        "지급할 아이템을 하나 이상 체크해야 합니다.",
                        level=messages.WARNING,
                    )

                    context = {
                        **self.admin_site.each_context(request),
                        "opts": self.model._meta,
                        "title": "Grant by category / slot to a user",
                        "form": form,
                        "candidate_items": candidate_items,
                        "preview_count": preview_count,
                        "mathner_admin_style": GRANT_ADMIN_STYLE,
                    }

                    return render(request, "admin/shop/grant_filtered_items.html", context)

                queryset = ShopItem.objects.filter(id__in=selected_ids).order_by(
                    "category",
                    "equip_slot",
                    "gender",
                    "name",
                    "id",
                )

                if active_only:
                    queryset = queryset.filter(is_active=True)

                if category:
                    queryset = queryset.filter(category=category)

                if equip_slot:
                    queryset = queryset.filter(equip_slot=equip_slot)

                if gender:
                    queryset = queryset.filter(gender=gender)

                selected_count = queryset.count()

                if selected_count <= 0:
                    self.message_user(
                        request,
                        "선택된 아이템이 현재 필터 조건과 맞지 않습니다.",
                        level=messages.WARNING,
                    )

                    context = {
                        **self.admin_site.each_context(request),
                        "opts": self.model._meta,
                        "title": "Grant by category / slot to a user",
                        "form": form,
                        "candidate_items": candidate_items,
                        "preview_count": preview_count,
                        "mathner_admin_style": GRANT_ADMIN_STYLE,
                    }

                    return render(request, "admin/shop/grant_filtered_items.html", context)

                result = self._grant_items(
                    user=user,
                    items=queryset,
                    quantity=quantity,
                )

                self.message_user(
                    request,
                    f"Granted checked filtered shop items to {user}. count={selected_count}, result={result}",
                    level=messages.SUCCESS,
                )

                return redirect("../")
        else:
            form = GrantFilteredItemsToUserForm(
                initial={
                    "active_only": True,
                    "quantity": 1,
                    "category": "",
                    "equip_slot": "",
                    "gender": "",
                }
            )

        context = {
            **self.admin_site.each_context(request),
            "opts": self.model._meta,
            "title": "Grant by category / slot to a user",
            "form": form,
            "candidate_items": candidate_items,
            "preview_count": preview_count,
            "mathner_admin_style": GRANT_ADMIN_STYLE,
        }

        return render(request, "admin/shop/grant_filtered_items.html", context)


@admin.register(UserOwnedItem)
class UserOwnedItemAdmin(admin.ModelAdmin):
    form = UserOwnedItemAdminForm

    ordering = (
        "user__username",
        "item__category",
        "item__equip_slot",
        "item__name",
        "id",
    )
    list_per_page = 100
    actions_selection_counter = True

    list_display = (
        "id",
        "user",
        "item",
        "item_category",
        "item_slot",
        "item_effect_key",
        "item_font_key",
        "item_active",
        "quantity",
        "created_at",
    )
    list_filter = (
        "item__category",
        "item__equip_slot",
        "item__gender",
        "item__is_active",
        "item__effect_key",
        "item__font_family_key",
    )
    search_fields = (
        "user__username",
        "user__email",
        "item__name",
        "item__category",
        "item__effect_key",
        "item__font_family_key",
    )
    autocomplete_fields = ("user", "item")
    readonly_fields = ("created_at",)
    fields = ("user", "item", "quantity", "created_at")
    actions = (
        "delete_selected_owned_items",
        "delete_inactive_owned_items",
        "delete_all_owned_items",
        "sync_selected_effect_owned_items",
    )

    def item_category(self, obj):
        return obj.item.category if obj.item else "-"

    item_category.short_description = "category"
    item_category.admin_order_field = "item__category"

    def item_slot(self, obj):
        return get_item_slot_value(obj.item)

    item_slot.short_description = "slot"
    item_slot.admin_order_field = "item__equip_slot"

    def item_effect_key(self, obj):
        return normalize_effect_key(obj.item.effect_key) if obj.item and obj.item.effect_key else "-"

    item_effect_key.short_description = "effect"
    item_effect_key.admin_order_field = "item__effect_key"

    def item_font_key(self, obj):
        return obj.item.font_family_key if obj.item and obj.item.font_family_key else "-"

    item_font_key.short_description = "font"
    item_font_key.admin_order_field = "item__font_family_key"

    def item_active(self, obj):
        return bool(obj.item and obj.item.is_active)

    item_active.boolean = True
    item_active.short_description = "active"
    item_active.admin_order_field = "item__is_active"

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)

        if obj.item and obj.item.category == CATEGORY_PROFILE_EFFECT and obj.item.effect_key:
            effect_obj, created = UserOwnedEffect.objects.get_or_create(
                user=obj.user,
                effect_key=normalize_effect_key(obj.item.effect_key),
                defaults={"quantity": max(1, int(obj.quantity or 1))},
            )

            if not created:
                desired_quantity = max(int(effect_obj.quantity or 0), int(obj.quantity or 1))

                if desired_quantity != effect_obj.quantity:
                    effect_obj.quantity = desired_quantity
                    effect_obj.save(update_fields=["quantity"])

    def delete_queryset(self, request, queryset):
        rows = list(queryset.select_related("user", "item"))
        effect_pairs = []

        for row in rows:
            if row.item and row.item.category == CATEGORY_PROFILE_EFFECT and row.item.effect_key:
                effect_pairs.append((row.user_id, normalize_effect_key(row.item.effect_key)))

        deleted = queryset.delete()[0]

        effect_deleted = 0

        for user_id, effect_key in effect_pairs:
            still_has_item = UserOwnedItem.objects.filter(
                user_id=user_id,
                item__category=CATEGORY_PROFILE_EFFECT,
                item__effect_key__in=effect_key_variants([effect_key]),
            ).exists()

            if not still_has_item:
                effect_deleted += UserOwnedEffect.objects.filter(
                    user_id=user_id,
                    effect_key__in=effect_key_variants([effect_key]),
                ).delete()[0]

        self.message_user(
            request,
            f"Deleted owned items={deleted}, matching effects removed={effect_deleted}",
            level=messages.SUCCESS,
        )

    @admin.action(description="Delete selected owned items")
    def delete_selected_owned_items(self, request, queryset):
        self.delete_queryset(request, queryset)

    @admin.action(description="Delete inactive owned items")
    def delete_inactive_owned_items(self, request, queryset):
        deleted = UserOwnedItem.objects.filter(item__is_active=False).delete()[0]

        self.message_user(
            request,
            f"Deleted inactive owned items: {deleted}",
            level=messages.SUCCESS,
        )

    @admin.action(description="Delete ALL owned items")
    def delete_all_owned_items(self, request, queryset):
        deleted = UserOwnedItem.objects.all().delete()[0]

        self.message_user(
            request,
            f"Deleted ALL owned items: {deleted}",
            level=messages.WARNING,
        )

    @admin.action(description="Sync UserOwnedEffect from selected effect ShopItems")
    def sync_selected_effect_owned_items(self, request, queryset):
        created_count = 0
        updated_count = 0

        for owned in queryset.select_related("user", "item"):
            if not owned.item or owned.item.category != CATEGORY_PROFILE_EFFECT or not owned.item.effect_key:
                continue

            obj, created = UserOwnedEffect.objects.get_or_create(
                user=owned.user,
                effect_key=normalize_effect_key(owned.item.effect_key),
                defaults={"quantity": max(1, int(owned.quantity or 1))},
            )

            if created:
                created_count += 1
            else:
                desired_quantity = max(int(obj.quantity or 0), int(owned.quantity or 1))

                if desired_quantity != obj.quantity:
                    obj.quantity = desired_quantity
                    obj.save(update_fields=["quantity"])
                    updated_count += 1

        self.message_user(
            request,
            f"Synced UserOwnedEffect rows. created={created_count}, updated={updated_count}",
            level=messages.SUCCESS,
        )


@admin.register(UserOwnedEffect)
class UserOwnedEffectAdmin(admin.ModelAdmin):
    form = UserOwnedEffectAdminForm

    ordering = (
        "user__username",
        "effect_key",
        "id",
    )
    list_per_page = 100
    actions_selection_counter = True

    list_display = (
        "id",
        "user",
        "effect_key",
        "effect_name",
        "effect_active",
        "matching_shopitem_count",
        "quantity",
        "created_at",
    )
    list_filter = ("effect_key",)
    search_fields = ("user__username", "user__email", "effect_key")
    autocomplete_fields = ("user",)
    readonly_fields = ("created_at",)
    fields = ("user", "effect_key", "quantity", "created_at")
    actions = (
        "grant_selected_effects_to_user",
        "sync_from_owned_effect_items",
        "delete_selected_effects",
        "delete_orphan_effects",
        "delete_all_owned_effects",
    )

    def effect_name(self, obj):
        active_item = ShopItem.objects.filter(
            category=CATEGORY_PROFILE_EFFECT,
            effect_key=normalize_effect_key(obj.effect_key),
            is_active=True,
        ).first()

        if active_item:
            return active_item.name

        return catalog_effect_name_map().get(normalize_effect_key(obj.effect_key), obj.effect_key)

    effect_name.short_description = "effect name"

    def effect_active(self, obj):
        return ShopItem.objects.filter(
            category=CATEGORY_PROFILE_EFFECT,
            effect_key=normalize_effect_key(obj.effect_key),
            is_active=True,
        ).exists()

    effect_active.boolean = True
    effect_active.short_description = "active in shop"

    def matching_shopitem_count(self, obj):
        return ShopItem.objects.filter(
            category=CATEGORY_PROFILE_EFFECT,
            effect_key__in=effect_key_variants([obj.effect_key]),
        ).count()

    matching_shopitem_count.short_description = "shop items"

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
        extra_context["mathner_admin_style"] = GRANT_ADMIN_STYLE

        return super().changelist_view(request, extra_context=extra_context)

    def _get_all_effect_keys(self):
        return sorted(active_effect_key_set())

    def _grant_effects(self, *, user, effect_keys, quantity=1):
        created_count = 0
        updated_count = 0
        skipped_count = 0
        owned_item_created = 0
        owned_item_updated = 0

        quantity = max(1, int(quantity or 1))
        active_keys = active_effect_key_set()

        for effect_key in effect_keys:
            normalized_key = normalize_effect_key(effect_key)

            if normalized_key not in active_keys:
                skipped_count += 1
                continue

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
                category=CATEGORY_PROFILE_EFFECT,
                effect_key=normalized_key,
                is_active=True,
            ).first()

            if effect_item:
                owned_item, owned_created = UserOwnedItem.objects.get_or_create(
                    user=user,
                    item=effect_item,
                    defaults={"quantity": quantity},
                )

                if owned_created:
                    owned_item_created += 1
                else:
                    desired_item_quantity = max(int(owned_item.quantity or 0), quantity)

                    if desired_item_quantity != owned_item.quantity:
                        owned_item.quantity = desired_item_quantity
                        owned_item.save(update_fields=["quantity"])
                        owned_item_updated += 1

        return {
            "created": created_count,
            "updated": updated_count,
            "skipped": skipped_count,
            "owned_item_created": owned_item_created,
            "owned_item_updated": owned_item_updated,
        }

    @admin.action(description="Grant checked effects to a user")
    def grant_selected_effects_to_user(self, request, queryset):
        selected_ids = list(queryset.values_list("id", flat=True))

        if not selected_ids:
            self.message_user(request, "No effects selected.", level=messages.WARNING)
            return

        request.session["effect_grant_selected_ids"] = selected_ids

        return redirect("admin:shop_userownedeffect_grant_selected")

    @admin.action(description="Sync missing UserOwnedEffect rows from active effect ShopItems")
    def sync_from_owned_effect_items(self, request, queryset):
        effect_items = UserOwnedItem.objects.filter(
            item__category=CATEGORY_PROFILE_EFFECT,
            item__is_active=True,
        ).select_related("item", "user")

        created_count = 0
        updated_count = 0

        for owned in effect_items:
            if not owned.item or not owned.item.effect_key:
                continue

            obj, created = UserOwnedEffect.objects.get_or_create(
                user=owned.user,
                effect_key=normalize_effect_key(owned.item.effect_key),
                defaults={"quantity": max(1, int(owned.quantity or 1))},
            )

            if created:
                created_count += 1
            else:
                desired_quantity = max(int(obj.quantity or 0), int(owned.quantity or 1))

                if desired_quantity != obj.quantity:
                    obj.quantity = desired_quantity
                    obj.save(update_fields=["quantity"])
                    updated_count += 1

        self.message_user(
            request,
            f"Synced active UserOwnedEffect rows. created={created_count}, updated={updated_count}",
            level=messages.SUCCESS,
        )

    @admin.action(description="Delete selected owned effects")
    def delete_selected_effects(self, request, queryset):
        deleted = queryset.delete()[0]

        self.message_user(
            request,
            f"Deleted selected owned effects: {deleted}",
            level=messages.SUCCESS,
        )

    @admin.action(description="Delete orphan/inactive owned effects")
    def delete_orphan_effects(self, request, queryset):
        active_keys = active_effect_key_set()
        delete_ids = []

        for effect in UserOwnedEffect.objects.all():
            key = normalize_effect_key(effect.effect_key)

            if not key or key not in active_keys:
                delete_ids.append(effect.id)

        deleted = 0

        if delete_ids:
            deleted = UserOwnedEffect.objects.filter(id__in=delete_ids).delete()[0]

        self.message_user(
            request,
            f"Deleted orphan/inactive owned effects: {deleted}",
            level=messages.SUCCESS,
        )

    @admin.action(description="Delete ALL owned effects")
    def delete_all_owned_effects(self, request, queryset):
        deleted = UserOwnedEffect.objects.all().delete()[0]
        clear_count = clear_font_preferences_for_effect_keys(all_effect_key_set())

        self.message_user(
            request,
            f"Deleted ALL owned effects: {deleted}, cleared effect preferences: {clear_count}",
            level=messages.WARNING,
        )

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

                result = self._grant_effects(
                    user=user,
                    effect_keys=selected_effect_keys,
                    quantity=quantity,
                )

                self.message_user(
                    request,
                    f"Granted selected effects to {user}. {result}",
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
            "mathner_admin_style": GRANT_ADMIN_STYLE,
        }

        return render(request, "admin/shop/grant_selected_effects.html", context)

    def grant_all_view(self, request):
        effect_keys = self._get_all_effect_keys()

        if request.method == "POST":
            form = GrantAllEffectsToUserForm(request.POST)

            if form.is_valid():
                user = form.cleaned_data["user"]
                quantity = form.cleaned_data["quantity"]

                result = self._grant_effects(
                    user=user,
                    effect_keys=effect_keys,
                    quantity=quantity,
                )

                self.message_user(
                    request,
                    f"Granted all active effects to {user}. {result}",
                    level=messages.SUCCESS,
                )

                return redirect("../")
        else:
            form = GrantAllEffectsToUserForm(initial={"quantity": 1})

        context = {
            **self.admin_site.each_context(request),
            "opts": self.model._meta,
            "title": "Grant all active effects to a user",
            "form": form,
            "effect_count": len(effect_keys),
            "effect_keys": effect_keys,
            "mathner_admin_style": GRANT_ADMIN_STYLE,
        }

        return render(request, "admin/shop/grant_all_effects.html", context)

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)

        effect_item = ShopItem.objects.filter(
            category=CATEGORY_PROFILE_EFFECT,
            effect_key=normalize_effect_key(obj.effect_key),
            is_active=True,
        ).first()

        if not effect_item:
            return

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
    ordering = (
        "user__username",
        "id",
    )
    list_per_page = 100
    actions_selection_counter = True

    list_display = (
        "id",
        "user",
        "nickname_font_item",
        "nickname_effect_key",
        "title_font_item",
        "title_effect_key",
        "content_font_item",
        "content_effect_key",
        "updated_at",
    )
    list_filter = (
        "nickname_effect_key",
        "title_effect_key",
        "content_effect_key",
    )
    search_fields = (
        "user__username",
        "user__email",
        "nickname_font_item__name",
        "title_font_item__name",
        "content_font_item__name",
        "nickname_effect_key",
        "title_effect_key",
        "content_effect_key",
    )
    autocomplete_fields = (
        "user",
        "nickname_font_item",
        "title_font_item",
        "content_font_item",
    )
    readonly_fields = ("updated_at",)
    actions = (
        "reset_selected_font_preferences",
        "reset_all_font_preferences",
        "delete_selected_font_preferences",
        "delete_all_font_preferences",
    )

    @admin.action(description="Reset selected font/effect preferences")
    def reset_selected_font_preferences(self, request, queryset):
        updated = reset_font_preferences_queryset(queryset)

        self.message_user(
            request,
            f"Reset selected font/effect preferences: {updated}",
            level=messages.SUCCESS,
        )

    @admin.action(description="Reset ALL font/effect preferences")
    def reset_all_font_preferences(self, request, queryset):
        updated = reset_font_preferences_queryset(UserFontPreference.objects.all())

        self.message_user(
            request,
            f"Reset ALL font/effect preferences: {updated}",
            level=messages.WARNING,
        )

    @admin.action(description="Delete selected font preference rows")
    def delete_selected_font_preferences(self, request, queryset):
        deleted = queryset.delete()[0]

        self.message_user(
            request,
            f"Deleted selected font preference rows: {deleted}",
            level=messages.SUCCESS,
        )

    @admin.action(description="Delete ALL font preference rows")
    def delete_all_font_preferences(self, request, queryset):
        deleted = UserFontPreference.objects.all().delete()[0]

        self.message_user(
            request,
            f"Deleted ALL font preference rows: {deleted}",
            level=messages.WARNING,
        )