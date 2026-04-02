from django.conf import settings
from django.db import models


CATEGORY_AVATAR_CLOTH = "avatar_cloth"
CATEGORY_AVATAR_HAT = "avatar_hat"
CATEGORY_AVATAR_SHOES = "avatar_shoes"


class UserAvatarProfile(models.Model):
    GENDER_MALE = "male"
    GENDER_FEMALE = "female"

    GENDER_CHOICES = [
        (GENDER_MALE, "Male"),
        (GENDER_FEMALE, "Female"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="avatar_profile",
    )
    gender = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES,
        default=GENDER_MALE,
    )

    x = models.PositiveIntegerField(default=325)
    y = models.PositiveIntegerField(default=380)
    z_index = models.PositiveIntegerField(default=20)
    size = models.PositiveIntegerField(default=150)

    cloth_item = models.ForeignKey(
        "shop.ShopItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="avatar_cloth_profiles",
        limit_choices_to={"category": CATEGORY_AVATAR_CLOTH},
    )
    hat_item = models.ForeignKey(
        "shop.ShopItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="avatar_hat_profiles",
        limit_choices_to={"category": CATEGORY_AVATAR_HAT},
    )
    shoes_item = models.ForeignKey(
        "shop.ShopItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="avatar_shoes_profiles",
        limit_choices_to={"category": CATEGORY_AVATAR_SHOES},
    )

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"AvatarProfile<{self.user_id}>"


class UserRoomProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="room_profile",
    )
    room_width = models.PositiveIntegerField(default=800)
    room_height = models.PositiveIntegerField(default=600)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"RoomProfile<{self.user_id}>"


class RoomItemPlacement(models.Model):
    TYPE_FLOOR = "floor"
    TYPE_SURFACE = "surface"
    TYPE_WALL = "wall"

    TYPE_CHOICES = [
        (TYPE_FLOOR, "Floor"),
        (TYPE_SURFACE, "Surface"),
        (TYPE_WALL, "Wall"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="room_item_placements",
    )
    owned_item = models.ForeignKey(
        "shop.UserOwnedItem",
        on_delete=models.CASCADE,
        related_name="placements",
    )
    placement_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_FLOOR)
    parent_placement = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="child_placements",
    )
    surface_slot = models.CharField(max_length=50, blank=True, default="")
    x = models.IntegerField(default=0)
    y = models.IntegerField(default=0)
    z_index = models.IntegerField(default=1)
    offset_x = models.IntegerField(default=0)
    offset_y = models.IntegerField(default=0)
    rotation = models.IntegerField(default=0)
    scale = models.FloatField(default=1.0)
    placed = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["z_index", "id"]

    def __str__(self):
        return f"Placement<{self.user_id}:{self.owned_item_id}:{self.placement_type}>"
