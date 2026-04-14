from django.core.management.base import BaseCommand
from apps.shop.models import ShopItem


class Command(BaseCommand):
    help = "Seed font items into shop"

    def handle(self, *args, **options):
        fonts = [
            {
                "name": "Bubblegum Sans",
                "font_family_key": ShopItem.FONT_FAMILY_BUBBLEGUM_SANS,
                "description": "Bright playful font for nickname and title.",
                "price_stars": 120,
            },
            {
                "name": "Delius Swash Caps",
                "font_family_key": ShopItem.FONT_FAMILY_DELIUS_SWASH_CAPS,
                "description": "Curly stylish font for nickname and title.",
                "price_stars": 120,
            },
            {
                "name": "Boogaloo",
                "font_family_key": ShopItem.FONT_FAMILY_BOOGALOO,
                "description": "Comic display font with fun energy.",
                "price_stars": 120,
            },
            {
                "name": "Love Ya Like A Sister",
                "font_family_key": ShopItem.FONT_FAMILY_LOVE_YA_LIKE_A_SISTER,
                "description": "Cute hand-drawn title font.",
                "price_stars": 130,
            },
            {
                "name": "Luckiest Guy",
                "font_family_key": ShopItem.FONT_FAMILY_LUCKIEST_GUY,
                "description": "Bold arcade-style nickname font.",
                "price_stars": 150,
            },
            {
                "name": "Coming Soon",
                "font_family_key": ShopItem.FONT_FAMILY_COMING_SOON,
                "description": "Soft handwriting style font.",
                "price_stars": 110,
            },
            {
                "name": "Life Savers",
                "font_family_key": ShopItem.FONT_FAMILY_LIFE_SAVERS,
                "description": "Retro candy sign font.",
                "price_stars": 150,
            },
            {
                "name": "Chewy",
                "font_family_key": ShopItem.FONT_FAMILY_CHEWY,
                "description": "Rounded chunky display font.",
                "price_stars": 130,
            },
            {
                "name": "Cabin Sketch",
                "font_family_key": ShopItem.FONT_FAMILY_CABIN_SKETCH,
                "description": "Sketch-style headline font.",
                "price_stars": 140,
            },
            {
                "name": "Mouse Memoirs",
                "font_family_key": ShopItem.FONT_FAMILY_MOUSE_MEMOIRS,
                "description": "Cartoon memory font.",
                "price_stars": 130,
            },
            {
                "name": "Londrina Shadow",
                "font_family_key": ShopItem.FONT_FAMILY_LONDRINA_SHADOW,
                "description": "Shadow headline font.",
                "price_stars": 160,
            },
            {
                "name": "Modak",
                "font_family_key": ShopItem.FONT_FAMILY_MODAK,
                "description": "Heavy bubble display font.",
                "price_stars": 160,
            },
            {
                "name": "Amatic SC",
                "font_family_key": ShopItem.FONT_FAMILY_AMATIC_SC,
                "description": "Tall handwritten title font.",
                "price_stars": 120,
            },
            {
                "name": "Capriola",
                "font_family_key": ShopItem.FONT_FAMILY_CAPRIOLA,
                "description": "Friendly rounded sans font.",
                "price_stars": 120,
            },
            {
                "name": "McLaren",
                "font_family_key": ShopItem.FONT_FAMILY_MCLAREN,
                "description": "Clean comic display font.",
                "price_stars": 130,
            },
        ]

        created_count = 0
        updated_count = 0

        for font in fonts:
            item, created = ShopItem.objects.update_or_create(
                name=font["name"],
                category=ShopItem.CATEGORY_PROFILE_FONT,
                defaults={
                    "gender": ShopItem.GENDER_COMMON,
                    "description": font["description"],
                    "price_stars": font["price_stars"],
                    "image_path": "",
                    "is_active": True,
                    "font_family_key": font["font_family_key"],
                    "font_preview_text": "Mathner Style",
                },
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. created={created_count}, updated={updated_count}"
            )
        )