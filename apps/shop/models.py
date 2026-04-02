from django.conf import settings
from django.db import models


class ShopItem(models.Model):
    CATEGORY_AVATAR_CLOTH = "avatar_cloth"
    CATEGORY_AVATAR_HAT = "avatar_hat"
    CATEGORY_AVATAR_SHOES = "avatar_shoes"
    CATEGORY_FURNITURE = "furniture"
    CATEGORY_DECOR = "decor"

    CATEGORY_CHOICES = [
        (CATEGORY_AVATAR_CLOTH, "Avatar Cloth"),
        (CATEGORY_AVATAR_HAT, "Avatar Hat"),
        (CATEGORY_AVATAR_SHOES, "Avatar Shoes"),
        (CATEGORY_FURNITURE, "Furniture"),
        (CATEGORY_DECOR, "Decor"),
    ]

    name = models.CharField(max_length=100)
    category = models.CharField(max_length=40, choices=CATEGORY_CHOICES)
    description = models.TextField(blank=True)
    price_stars = models.PositiveIntegerField(default=0)
    image_path = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.category})"


class UserOwnedItem(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_shop_items",
    )
    item = models.ForeignKey(
        ShopItem,
        on_delete=models.CASCADE,
        related_name="owned_users",
    )
    quantity = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "item")

    def __str__(self):
        return f"{self.user_id} - {self.item.name} x{self.quantity}"