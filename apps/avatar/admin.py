from django.contrib import admin, messages
from django.db import transaction

from .models import UserAvatarProfile, UserRoomProfile, RoomItemPlacement

try:
    from apps.shop.models import UserFontPreference, UserOwnedItem, UserOwnedEffect
except Exception:
    UserFontPreference = None
    UserOwnedItem = None
    UserOwnedEffect = None


AVATAR_ITEM_FIELD_CANDIDATES = (
    "head_item",
    "eyes_item",
    "mouth_item",
    "eyebrow_item",
    "front_hair_item",
    "rear_hair_item",
    "body_item",
    "top_item",
    "cloth_item",
    "pants_item",
    "shoes_item",
    "hat_item",
)


PROFILE_EXTRA_FIELD_CANDIDATES = (
    "x",
    "y",
    "z_index",
    "size",
    "updated_at",
)


def existing_fields(model, candidates):
    names = {field.name for field in model._meta.get_fields()}
    return [name for name in candidates if name in names]


def avatar_item_fields():
    return existing_fields(UserAvatarProfile, AVATAR_ITEM_FIELD_CANDIDATES)


def avatar_extra_fields():
    return existing_fields(UserAvatarProfile, PROFILE_EXTRA_FIELD_CANDIDATES)


def model_field_names(model):
    if model is None:
        return set()

    return {
        field.name
        for field in model._meta.get_fields()
        if hasattr(field, "attname")
    }


def reset_font_preferences_for_users(user_ids):
    if not UserFontPreference or not user_ids:
        return 0

    fields = model_field_names(UserFontPreference)
    update_data = {}

    for field_name in ("nickname_font_item", "title_font_item", "content_font_item"):
        if field_name in fields:
            update_data[field_name] = None

    for field_name in ("nickname_effect_key", "title_effect_key", "content_effect_key"):
        if field_name in fields:
            update_data[field_name] = "none"

    for field_name in ("nickname_color", "title_color", "content_color"):
        if field_name in fields:
            update_data[field_name] = ""

    for field_name in ("nickname_scale", "nickname_letter_spacing"):
        if field_name in fields:
            update_data[field_name] = None

    if not update_data:
        return 0

    return UserFontPreference.objects.filter(user_id__in=user_ids).update(**update_data)


@admin.register(UserAvatarProfile)
class UserAvatarProfileAdmin(admin.ModelAdmin):
    list_filter = ("gender",)
    search_fields = (
        "user__username",
        "user__email",
    )
    actions = (
        "clear_selected_equipment",
        "cleanup_inactive_equipment",
        "reset_selected_users_font_effects",
        "reset_selected_users_all_avatar_state",
    )

    def get_list_display(self, request):
        base = ["id", "user", "gender"]
        return tuple(base + avatar_item_fields() + avatar_extra_fields())

    def get_fields(self, request, obj=None):
        base = ["user", "gender"]
        return tuple(base + avatar_item_fields() + avatar_extra_fields())

    def get_readonly_fields(self, request, obj=None):
        readonly = []

        if "updated_at" in avatar_extra_fields():
            readonly.append("updated_at")

        return tuple(readonly)

    def get_autocomplete_fields(self, request):
        return tuple(["user"] + avatar_item_fields())

    @admin.action(description="Clear selected avatar equipment")
    def clear_selected_equipment(self, request, queryset):
        fields = avatar_item_fields()
        updated = 0

        for profile in queryset:
            changed_fields = []

            for field_name in fields:
                if getattr(profile, field_name, None):
                    setattr(profile, field_name, None)
                    changed_fields.append(field_name)

            if changed_fields:
                profile.save(update_fields=changed_fields)
                updated += 1

        self.message_user(
            request,
            f"Cleared equipment for profiles: {updated}",
            level=messages.SUCCESS,
        )

    @admin.action(description="Cleanup inactive/deleted equipped items")
    def cleanup_inactive_equipment(self, request, queryset):
        fields = avatar_item_fields()
        updated = 0

        for profile in queryset:
            changed_fields = []

            for field_name in fields:
                item = getattr(profile, field_name, None)

                if item and hasattr(item, "is_active") and not item.is_active:
                    setattr(profile, field_name, None)
                    changed_fields.append(field_name)

            if changed_fields:
                profile.save(update_fields=changed_fields)
                updated += 1

        self.message_user(
            request,
            f"Cleaned inactive equipment for profiles: {updated}",
            level=messages.SUCCESS,
        )

    @admin.action(description="Reset selected users font/effect settings")
    def reset_selected_users_font_effects(self, request, queryset):
        user_ids = list(queryset.values_list("user_id", flat=True))
        updated = reset_font_preferences_for_users(user_ids)

        self.message_user(
            request,
            f"Reset font/effect preferences for users: {updated}",
            level=messages.SUCCESS,
        )

    @admin.action(description="Reset selected users avatar + font/effect state")
    def reset_selected_users_all_avatar_state(self, request, queryset):
        fields = avatar_item_fields()
        user_ids = list(queryset.values_list("user_id", flat=True))

        profile_updated = 0

        with transaction.atomic():
            for profile in queryset:
                changed_fields = []

                for field_name in fields:
                    if getattr(profile, field_name, None):
                        setattr(profile, field_name, None)
                        changed_fields.append(field_name)

                if changed_fields:
                    profile.save(update_fields=changed_fields)
                    profile_updated += 1

            font_pref_updated = reset_font_preferences_for_users(user_ids)

        self.message_user(
            request,
            f"Reset avatar profiles={profile_updated}, font/effect prefs={font_pref_updated}",
            level=messages.SUCCESS,
        )


@admin.register(UserRoomProfile)
class UserRoomProfileAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "room_width",
        "room_height",
        "updated_at",
    )
    search_fields = (
        "user__username",
        "user__email",
    )
    autocomplete_fields = ("user",)
    readonly_fields = ("updated_at",)


@admin.register(RoomItemPlacement)
class RoomItemPlacementAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "owned_item",
        "owned_item_name",
        "owned_item_active",
        "x",
        "y",
        "z_index",
        "rotation",
        "scale",
        "placed",
        "updated_at",
    )
    list_filter = (
        "placed",
        "owned_item__item__is_active",
    )
    search_fields = (
        "user__username",
        "user__email",
        "owned_item__item__name",
        "owned_item__item__category",
        "owned_item__item__effect_key",
        "owned_item__item__font_family_key",
    )
    autocomplete_fields = (
        "user",
        "owned_item",
    )
    readonly_fields = ("updated_at",)
    actions = (
        "unplace_selected",
        "delete_selected_placements",
        "delete_inactive_placements",
        "delete_orphan_placements",
        "delete_all_room_placements",
    )

    def owned_item_name(self, obj):
        if obj.owned_item and obj.owned_item.item:
            return obj.owned_item.item.name
        return "-"
    owned_item_name.short_description = "item name"

    def owned_item_active(self, obj):
        return bool(obj.owned_item and obj.owned_item.item and obj.owned_item.item.is_active)
    owned_item_active.boolean = True
    owned_item_active.short_description = "active"

    @admin.action(description="Unplace selected room items")
    def unplace_selected(self, request, queryset):
        updated = queryset.update(placed=False)

        self.message_user(
            request,
            f"Unplaced room items: {updated}",
            level=messages.SUCCESS,
        )

    @admin.action(description="Delete selected room placements")
    def delete_selected_placements(self, request, queryset):
        deleted = queryset.delete()[0]

        self.message_user(
            request,
            f"Deleted selected room placements: {deleted}",
            level=messages.SUCCESS,
        )

    @admin.action(description="Delete placements for inactive owned items")
    def delete_inactive_placements(self, request, queryset):
        deleted = RoomItemPlacement.objects.filter(
            owned_item__item__is_active=False
        ).delete()[0]

        self.message_user(
            request,
            f"Deleted inactive room placements: {deleted}",
            level=messages.SUCCESS,
        )

    @admin.action(description="Delete orphan placements without valid owned item")
    def delete_orphan_placements(self, request, queryset):
        deleted = RoomItemPlacement.objects.filter(
            owned_item__isnull=True
        ).delete()[0]

        self.message_user(
            request,
            f"Deleted orphan room placements: {deleted}",
            level=messages.SUCCESS,
        )

    @admin.action(description="Delete ALL room placements")
    def delete_all_room_placements(self, request, queryset):
        deleted = RoomItemPlacement.objects.all().delete()[0]

        self.message_user(
            request,
            f"Deleted ALL room placements: {deleted}",
            level=messages.WARNING,
        )