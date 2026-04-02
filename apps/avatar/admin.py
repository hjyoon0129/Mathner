from django.contrib import admin

from .models import UserAvatarProfile, UserRoomProfile, RoomItemPlacement


@admin.register(UserAvatarProfile)
class UserAvatarProfileAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "gender",
        "cloth_item",
        "hat_item",
        "shoes_item",
        "x",
        "y",
        "z_index",
        "size",
        "updated_at",
    )
    list_filter = ("gender",)
    search_fields = (
        "user__username",
        "user__email",
    )
    autocomplete_fields = (
        "user",
        "cloth_item",
        "hat_item",
        "shoes_item",
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


@admin.register(RoomItemPlacement)
class RoomItemPlacementAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "owned_item",
        "x",
        "y",
        "z_index",
        "rotation",
        "scale",
        "placed",
        "updated_at",
    )
    list_filter = ("placed",)
    search_fields = (
        "user__username",
        "user__email",
        "owned_item__item__name",
    )
    autocomplete_fields = (
        "user",
        "owned_item",
    )