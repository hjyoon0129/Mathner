from django.core.management.base import BaseCommand
from apps.shop.models import ShopItem


EFFECT_CATALOG = [
    {
        "key": "neon-blue",
        "name": "Neon Blue",
        "price_stars": 90,
        "preview_class": "effect-neon-blue",
    },
    {
        "key": "rainbow-flow",
        "name": "Rainbow Flow",
        "price_stars": 130,
        "preview_class": "effect-rainbow-flow",
    },
    {
        "key": "gold-glow",
        "name": "Gold Glow",
        "price_stars": 110,
        "preview_class": "effect-gold-glow",
    },
    {
        "key": "sparkle",
        "name": "Sparkle",
        "price_stars": 95,
        "preview_class": "effect-sparkle",
    },
    {
        "key": "glitch",
        "name": "Glitch",
        "price_stars": 125,
        "preview_class": "effect-glitch",
    },
    {
        "key": "float-wave",
        "name": "Float Wave",
        "price_stars": 90,
        "preview_class": "effect-float-wave",
    },
    {
        "key": "fire-glow",
        "name": "Fire Glow",
        "price_stars": 115,
        "preview_class": "effect-fire-glow",
    },
    {
        "key": "ice-glow",
        "name": "Ice Glow",
        "price_stars": 115,
        "preview_class": "effect-ice-glow",
    },
]


class Command(BaseCommand):
    help = "Seed shop effects into ShopItem"

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0

        for effect in EFFECT_CATALOG:
            item, created = ShopItem.objects.update_or_create(
                effect_key=effect["key"].strip().lower().replace("-", "_"),
                category=ShopItem.CATEGORY_PROFILE_EFFECT,
                defaults={
                    "name": effect["name"],
                    "gender": ShopItem.GENDER_COMMON,
                    "description": f"{effect['name']} effect item",
                    "price_stars": effect["price_stars"],
                    "image_path": "",
                    "is_active": True,
                    "effect_preview_class": effect["preview_class"],
                    "font_family_key": ShopItem.FONT_FAMILY_DEFAULT,
                    "font_preview_text": "Mathner Style",
                },
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. created={created_count}, updated={updated_count}, total={len(EFFECT_CATALOG)}"
            )
        )