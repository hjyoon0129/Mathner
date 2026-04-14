from django.conf import settings
from django.db import models


def _category_q(*values):
    return models.Q(category__in=[v for v in values if v])


CATEGORY_AVATAR_BODY = "avatar_body"
CATEGORY_AVATAR_HEAD = "avatar_head"
CATEGORY_AVATAR_EYES = "avatar_eyes"
CATEGORY_AVATAR_MOUTH = "avatar_mouth"
CATEGORY_AVATAR_EYEBROW = "avatar_eyebrow"
CATEGORY_AVATAR_FRONT_HAIR = "avatar_front_hair"
CATEGORY_AVATAR_REAR_HAIR = "avatar_rear_hair"
CATEGORY_AVATAR_TOP = "avatar_top"
CATEGORY_AVATAR_CLOTH = "avatar_cloth"
CATEGORY_AVATAR_PANTS = "avatar_pants"
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

    body_item = models.ForeignKey(
        "shop.ShopItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="avatar_body_profiles",
        limit_choices_to=_category_q(CATEGORY_AVATAR_BODY, "body"),
    )
    head_item = models.ForeignKey(
        "shop.ShopItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="avatar_head_profiles",
        limit_choices_to=_category_q(CATEGORY_AVATAR_HEAD, "head", "face"),
    )
    eyes_item = models.ForeignKey(
        "shop.ShopItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="avatar_eyes_profiles",
        limit_choices_to=_category_q(CATEGORY_AVATAR_EYES, "eyes", "eye"),
    )
    mouth_item = models.ForeignKey(
        "shop.ShopItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="avatar_mouth_profiles",
        limit_choices_to=_category_q(CATEGORY_AVATAR_MOUTH, "mouth", "lip", "lips"),
    )
    eyebrow_item = models.ForeignKey(
        "shop.ShopItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="avatar_eyebrow_profiles",
        limit_choices_to=_category_q(CATEGORY_AVATAR_EYEBROW, "eyebrow", "eyebrows", "brow"),
    )
    front_hair_item = models.ForeignKey(
        "shop.ShopItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="avatar_front_hair_profiles",
        limit_choices_to=_category_q(CATEGORY_AVATAR_FRONT_HAIR, "front_hair", "hair_front", "fronthair"),
    )
    rear_hair_item = models.ForeignKey(
        "shop.ShopItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="avatar_rear_hair_profiles",
        limit_choices_to=_category_q(CATEGORY_AVATAR_REAR_HAIR, "rear_hair", "hair_back", "hair_rear", "rearhair"),
    )
    top_item = models.ForeignKey(
        "shop.ShopItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="avatar_top_profiles",
        limit_choices_to=_category_q(CATEGORY_AVATAR_TOP, "top"),
    )
    cloth_item = models.ForeignKey(
        "shop.ShopItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="avatar_cloth_profiles",
        limit_choices_to=_category_q(CATEGORY_AVATAR_CLOTH, "cloth", "clothes", "outfit"),
    )
    pants_item = models.ForeignKey(
        "shop.ShopItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="avatar_pants_profiles",
        limit_choices_to=_category_q(CATEGORY_AVATAR_PANTS, "pants", "bottom", "bottoms"),
    )
    hat_item = models.ForeignKey(
        "shop.ShopItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="avatar_hat_profiles",
        limit_choices_to=_category_q(CATEGORY_AVATAR_HAT, "hat", "cap"),
    )
    shoes_item = models.ForeignKey(
        "shop.ShopItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="avatar_shoes_profiles",
        limit_choices_to=_category_q(CATEGORY_AVATAR_SHOES, "shoes", "shoe"),
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