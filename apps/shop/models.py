from django.conf import settings
from django.db import models


class ShopItem(models.Model):
    CATEGORY_AVATAR_FACE = "avatar_face"
    CATEGORY_AVATAR_HAIR = "avatar_hair"
    CATEGORY_AVATAR_BODY = "avatar_body"
    CATEGORY_AVATAR_TOP = "avatar_top"
    CATEGORY_AVATAR_CLOTH = "avatar_cloth"
    CATEGORY_AVATAR_PANTS = "avatar_pants"
    CATEGORY_AVATAR_SHOES = "avatar_shoes"
    CATEGORY_AVATAR_HAT = "avatar_hat"
    CATEGORY_FURNITURE = "furniture"
    CATEGORY_DECOR = "decor"
    CATEGORY_PROFILE_FONT = "profile_font"
    CATEGORY_PROFILE_EFFECT = "profile_effect"
    CATEGORY_SET = "set"
    CATEGORY_UNIQUE = "unique"

    CATEGORY_CHOICES = [
        (CATEGORY_AVATAR_FACE, "Avatar Face"),
        (CATEGORY_AVATAR_HAIR, "Avatar Hair"),
        (CATEGORY_AVATAR_BODY, "Avatar Body"),
        (CATEGORY_AVATAR_TOP, "Avatar Top"),
        (CATEGORY_AVATAR_CLOTH, "Avatar Cloth"),
        (CATEGORY_AVATAR_PANTS, "Avatar Pants"),
        (CATEGORY_AVATAR_SHOES, "Avatar Shoes"),
        (CATEGORY_AVATAR_HAT, "Avatar Hat"),
        (CATEGORY_FURNITURE, "Furniture"),
        (CATEGORY_DECOR, "Decor"),
        (CATEGORY_PROFILE_FONT, "Profile Font"),
        (CATEGORY_PROFILE_EFFECT, "Profile Effect"),
        (CATEGORY_SET, "Set"),
        (CATEGORY_UNIQUE, "Unique"),
    ]

    GENDER_COMMON = "common"
    GENDER_MALE = "male"
    GENDER_FEMALE = "female"

    GENDER_CHOICES = [
        (GENDER_COMMON, "Common"),
        (GENDER_MALE, "Male"),
        (GENDER_FEMALE, "Female"),
    ]

    EQUIP_SLOT_NONE = ""
    EQUIP_SLOT_HEAD = "head"
    EQUIP_SLOT_EYES = "eyes"
    EQUIP_SLOT_MOUTH = "mouth"
    EQUIP_SLOT_EYEBROW = "eyebrow"
    EQUIP_SLOT_FRONT_HAIR = "front_hair"
    EQUIP_SLOT_REAR_HAIR = "rear_hair"
    EQUIP_SLOT_BODY = "body"
    EQUIP_SLOT_TOP = "top"
    EQUIP_SLOT_CLOTH = "cloth"
    EQUIP_SLOT_PANTS = "pants"
    EQUIP_SLOT_SHOES = "shoes"
    EQUIP_SLOT_HAT = "hat"

    EQUIP_SLOT_CHOICES = [
        (EQUIP_SLOT_NONE, "No slot"),
        (EQUIP_SLOT_HEAD, "Head"),
        (EQUIP_SLOT_EYES, "Eyes"),
        (EQUIP_SLOT_MOUTH, "Mouth"),
        (EQUIP_SLOT_EYEBROW, "Eyebrow"),
        (EQUIP_SLOT_FRONT_HAIR, "Front Hair"),
        (EQUIP_SLOT_REAR_HAIR, "Rear Hair"),
        (EQUIP_SLOT_BODY, "Body"),
        (EQUIP_SLOT_TOP, "Top"),
        (EQUIP_SLOT_CLOTH, "Cloth"),
        (EQUIP_SLOT_PANTS, "Pants"),
        (EQUIP_SLOT_SHOES, "Shoes"),
        (EQUIP_SLOT_HAT, "Hat"),
    ]

    FONT_FAMILY_DEFAULT = ""
    FONT_FAMILY_GAEGU = "gaegu"
    FONT_FAMILY_DONGLE = "dongle"
    FONT_FAMILY_GOWUN = "gowun_batang"
    FONT_FAMILY_NANUM_PEN = "nanum_pen"
    FONT_FAMILY_DOKDO = "dokdo"

    FONT_FAMILY_BUBBLEGUM_SANS = "bubblegum_sans"
    FONT_FAMILY_DELIUS_SWASH_CAPS = "delius_swash_caps"
    FONT_FAMILY_BOOGALOO = "boogaloo"
    FONT_FAMILY_LOVE_YA_LIKE_A_SISTER = "love_ya_like_a_sister"
    FONT_FAMILY_LUCKIEST_GUY = "luckiest_guy"
    FONT_FAMILY_COMING_SOON = "coming_soon"
    FONT_FAMILY_LIFE_SAVERS = "life_savers"
    FONT_FAMILY_CHEWY = "chewy"
    FONT_FAMILY_CABIN_SKETCH = "cabin_sketch"
    FONT_FAMILY_MOUSE_MEMOIRS = "mouse_memoirs"
    FONT_FAMILY_LONDRINA_SHADOW = "londrina_shadow"
    FONT_FAMILY_MODAK = "modak"
    FONT_FAMILY_AMATIC_SC = "amatic_sc"
    FONT_FAMILY_CAPRIOLA = "capriola"
    FONT_FAMILY_MCLAREN = "mclaren"

    FONT_FAMILY_CHOICES = [
        (FONT_FAMILY_DEFAULT, "Default"),
        (FONT_FAMILY_GAEGU, "Gaegu"),
        (FONT_FAMILY_DONGLE, "Dongle"),
        (FONT_FAMILY_GOWUN, "Gowun Batang"),
        (FONT_FAMILY_NANUM_PEN, "Nanum Pen Script"),
        (FONT_FAMILY_DOKDO, "Dokdo"),
        (FONT_FAMILY_BUBBLEGUM_SANS, "Bubblegum Sans"),
        (FONT_FAMILY_DELIUS_SWASH_CAPS, "Delius Swash Caps"),
        (FONT_FAMILY_BOOGALOO, "Boogaloo"),
        (FONT_FAMILY_LOVE_YA_LIKE_A_SISTER, "Love Ya Like A Sister"),
        (FONT_FAMILY_LUCKIEST_GUY, "Luckiest Guy"),
        (FONT_FAMILY_COMING_SOON, "Coming Soon"),
        (FONT_FAMILY_LIFE_SAVERS, "Life Savers"),
        (FONT_FAMILY_CHEWY, "Chewy"),
        (FONT_FAMILY_CABIN_SKETCH, "Cabin Sketch"),
        (FONT_FAMILY_MOUSE_MEMOIRS, "Mouse Memoirs"),
        (FONT_FAMILY_LONDRINA_SHADOW, "Londrina Shadow"),
        (FONT_FAMILY_MODAK, "Modak"),
        (FONT_FAMILY_AMATIC_SC, "Amatic SC"),
        (FONT_FAMILY_CAPRIOLA, "Capriola"),
        (FONT_FAMILY_MCLAREN, "McLaren"),
    ]

    name = models.CharField(max_length=100)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default=GENDER_COMMON)
    description = models.TextField(blank=True)
    price_stars = models.PositiveIntegerField(default=0)
    image_path = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    equip_slot = models.CharField(
        max_length=30,
        choices=EQUIP_SLOT_CHOICES,
        blank=True,
        default="",
        help_text="Avatar/Set/Unique item equip slot. Use Cloth, Pants, Shoes, Hat, etc.",
    )

    font_family_key = models.CharField(
        max_length=50,
        choices=FONT_FAMILY_CHOICES,
        blank=True,
        default="",
        help_text="Used only when category is profile_font.",
    )
    font_preview_text = models.CharField(
        max_length=120,
        blank=True,
        default="Nickname / Writing Preview",
    )

    effect_key = models.CharField(
        max_length=50,
        blank=True,
        default="",
        help_text="Used only when category is profile_effect.",
    )
    effect_preview_class = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="Used only when category is profile_effect.",
    )

    class Meta:
        ordering = ["category", "equip_slot", "gender", "name"]

    def __str__(self):
        slot = self.resolved_equip_slot or "-"
        return f"{self.name} ({self.category}/{slot})"

    @property
    def is_font_item(self):
        return self.category == self.CATEGORY_PROFILE_FONT

    @property
    def is_effect_item(self):
        return self.category == self.CATEGORY_PROFILE_EFFECT

    def _default_slot_from_category(self):
        mapping = {
            self.CATEGORY_AVATAR_FACE: self.EQUIP_SLOT_HEAD,
            self.CATEGORY_AVATAR_HAIR: self.EQUIP_SLOT_FRONT_HAIR,
            self.CATEGORY_AVATAR_BODY: self.EQUIP_SLOT_BODY,
            self.CATEGORY_AVATAR_TOP: self.EQUIP_SLOT_TOP,
            self.CATEGORY_AVATAR_CLOTH: self.EQUIP_SLOT_CLOTH,
            self.CATEGORY_AVATAR_PANTS: self.EQUIP_SLOT_PANTS,
            self.CATEGORY_AVATAR_SHOES: self.EQUIP_SLOT_SHOES,
            self.CATEGORY_AVATAR_HAT: self.EQUIP_SLOT_HAT,
        }
        return mapping.get(self.category, "")

    @property
    def resolved_equip_slot(self):
        return self.equip_slot or self._default_slot_from_category()

    def save(self, *args, **kwargs):
        if self.category in {
            self.CATEGORY_AVATAR_FACE,
            self.CATEGORY_AVATAR_HAIR,
            self.CATEGORY_AVATAR_BODY,
            self.CATEGORY_AVATAR_TOP,
            self.CATEGORY_AVATAR_CLOTH,
            self.CATEGORY_AVATAR_PANTS,
            self.CATEGORY_AVATAR_SHOES,
            self.CATEGORY_AVATAR_HAT,
        } and not self.equip_slot:
            self.equip_slot = self._default_slot_from_category()

        if self.category in {self.CATEGORY_PROFILE_FONT, self.CATEGORY_PROFILE_EFFECT}:
            self.equip_slot = ""

        super().save(*args, **kwargs)


class UserOwnedItem(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_shop_items",
    )
    item = models.ForeignKey(
        ShopItem,
        on_delete=models.CASCADE,
        related_name="owned_by_users",
    )
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "item")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} - {self.item.name} x{self.quantity}"


class UserFontPreference(models.Model):
    EFFECT_NONE = "none"
    EFFECT_NEON_BLUE = "neon_blue"
    EFFECT_RAINBOW_FLOW = "rainbow_flow"
    EFFECT_GOLD_GLOW = "gold_glow"
    EFFECT_SPARKLE = "sparkle"
    EFFECT_GLITCH = "glitch"
    EFFECT_FLOAT_WAVE = "float_wave"
    EFFECT_FIRE_GLOW = "fire_glow"
    EFFECT_ICE_GLOW = "ice_glow"

    EFFECT_CHOICES = [
        (EFFECT_NONE, "None"),
        (EFFECT_NEON_BLUE, "Neon Blue"),
        (EFFECT_RAINBOW_FLOW, "Rainbow Flow"),
        (EFFECT_GOLD_GLOW, "Gold Glow"),
        (EFFECT_SPARKLE, "Sparkle"),
        (EFFECT_GLITCH, "Glitch"),
        (EFFECT_FLOAT_WAVE, "Float Wave"),
        (EFFECT_FIRE_GLOW, "Fire Glow"),
        (EFFECT_ICE_GLOW, "Ice Glow"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="font_preference",
    )

    nickname_font_item = models.ForeignKey(
        ShopItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="nickname_font_users",
        limit_choices_to={"category": ShopItem.CATEGORY_PROFILE_FONT},
    )
    title_font_item = models.ForeignKey(
        ShopItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="title_font_users",
        limit_choices_to={"category": ShopItem.CATEGORY_PROFILE_FONT},
    )
    content_font_item = models.ForeignKey(
        ShopItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="content_font_users",
        limit_choices_to={"category": ShopItem.CATEGORY_PROFILE_FONT},
    )

    nickname_effect_key = models.CharField(
        max_length=30,
        choices=EFFECT_CHOICES,
        default=EFFECT_NONE,
    )
    title_effect_key = models.CharField(
        max_length=30,
        choices=EFFECT_CHOICES,
        default=EFFECT_NONE,
    )
    content_effect_key = models.CharField(
        max_length=30,
        choices=EFFECT_CHOICES,
        default=EFFECT_NONE,
    )

    nickname_color = models.CharField(max_length=20, default="#ffffff")
    title_color = models.CharField(max_length=20, default="#ffffff")
    content_color = models.CharField(max_length=20, default="#eef4ff")

    nickname_scale = models.FloatField(default=1.0)
    nickname_letter_spacing = models.FloatField(default=0.0)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"FontPreference<{self.user_id}>"

    @property
    def nickname_font_key(self):
        return self.nickname_font_item.font_family_key if self.nickname_font_item else ""

    @property
    def title_font_key(self):
        return self.title_font_item.font_family_key if self.title_font_item else ""

    @property
    def content_font_key(self):
        return self.content_font_item.font_family_key if self.content_font_item else ""

    @property
    def writing_font_key(self):
        return self.content_font_key


class UserOwnedEffect(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_effects",
    )
    effect_key = models.CharField(max_length=50)
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "effect_key")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} - {self.effect_key} x{self.quantity}"