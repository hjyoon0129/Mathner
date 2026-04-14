from django.core.management.base import BaseCommand
from apps.shop.models import ShopItem


class Command(BaseCommand):
    help = "Seed unique shop items safely"

    def handle(self, *args, **options):
        model_field_names = {
            field.name
            for field in ShopItem._meta.get_fields()
            if hasattr(field, "attname")
        }

        category_unique = getattr(ShopItem, "CATEGORY_UNIQUE", "unique")

        raw_items = [
            {
                "name": "Golden Laurel Crown",
                "category": category_unique,
                "price_stars": 5200,
                "gender": "common",
                "image_path": "shop/img/unique/gold_wreath.webp",
                "description": "Unique item / Hat category",
                "is_active": True,
            },
            {
                "name": "Royal Red Robe",
                "category": category_unique,
                "price_stars": 6800,
                "gender": "common",
                "image_path": "shop/img/unique/red_robe.webp",
                "description": "Unique item / Cloth category",
                "is_active": True,
            },
        ]

        if "name" not in model_field_names:
            self.stdout.write(self.style.ERROR("ShopItem model has no 'name' field."))
            return

        for raw in raw_items:
            lookup = {"name": raw["name"]}
            defaults = {
                k: v
                for k, v in raw.items()
                if k in model_field_names and k != "name"
            }

            obj, created = ShopItem.objects.update_or_create(
                **lookup,
                defaults=defaults,
            )

            image_path = getattr(obj, "image_path", "")
            description = getattr(obj, "description", "")

            if created:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Created: {obj.name} (image={image_path}, desc={description})"
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"Updated: {obj.name} (image={image_path}, desc={description})"
                    )
                )

        self.stdout.write(self.style.SUCCESS("Unique shop seed complete."))