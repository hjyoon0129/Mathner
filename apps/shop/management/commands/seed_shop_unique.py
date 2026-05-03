from django.core.management.base import BaseCommand
from django.contrib.staticfiles import finders
from apps.shop.models import ShopItem


class Command(BaseCommand):
    help = "Seed unique shop items safely"

    def pick_static_path(self, candidates):
        for path in candidates:
            if finders.find(path):
                return path
        return candidates[0] if candidates else ""

    def set_if_exists(self, defaults, field_names, key, value):
        if key in field_names:
            defaults[key] = value

    def handle(self, *args, **options):
        model_field_names = {
            field.name
            for field in ShopItem._meta.get_fields()
            if hasattr(field, "attname")
        }

        category_unique = getattr(ShopItem, "CATEGORY_UNIQUE", "unique")
        gender_common = getattr(ShopItem, "GENDER_COMMON", "common")

        raw_items = [
            {
                "lookup_names": ["Golden Laurel Crown", "황금 월계관"],
                "name": "황금 월계관",
                "category": category_unique,
                "slot": "hat",
                "equip_slot": "hat",
                "price_stars": 5200,
                "gender": gender_common,
                "image_candidates": [
                    "shop/img/unique/gold_wreath.webp",
                    "shop/img/unique/gold_wreath.png",
                    "shop/img/unique/golden_laurel_crown.webp",
                    "shop/img/unique/golden_laurel_crown.png",
                ],
                "description": "Unique golden crown aura item.",
                "is_active": True,
            },
            {
                "lookup_names": ["Royal Red Robe", "왕실 붉은 로브"],
                "name": "왕실 붉은 로브",
                "category": category_unique,
                "slot": "cloth",
                "equip_slot": "cloth",
                "price_stars": 6800,
                "gender": gender_common,
                "image_candidates": [
                    "shop/img/unique/red_robe.webp",
                    "shop/img/unique/red_robe.png",
                    "shop/img/unique/royal_red_robe.webp",
                    "shop/img/unique/royal_red_robe.png",
                ],
                "description": "Unique royal red robe aura item.",
                "is_active": True,
            },
        ]

        if "name" not in model_field_names:
            self.stdout.write(self.style.ERROR("ShopItem model has no 'name' field."))
            return

        created_count = 0
        updated_count = 0

        for raw in raw_items:
            existing = None

            for lookup_name in raw["lookup_names"]:
                existing = ShopItem.objects.filter(name__iexact=lookup_name).first()
                if existing:
                    break

            image_path = self.pick_static_path(raw["image_candidates"])

            defaults = {}
            self.set_if_exists(defaults, model_field_names, "name", raw["name"])
            self.set_if_exists(defaults, model_field_names, "category", raw["category"])
            self.set_if_exists(defaults, model_field_names, "slot", raw["slot"])
            self.set_if_exists(defaults, model_field_names, "equip_slot", raw["equip_slot"])
            self.set_if_exists(defaults, model_field_names, "price_stars", raw["price_stars"])
            self.set_if_exists(defaults, model_field_names, "gender", raw["gender"])
            self.set_if_exists(defaults, model_field_names, "image_path", image_path)
            self.set_if_exists(defaults, model_field_names, "description", raw["description"])
            self.set_if_exists(defaults, model_field_names, "is_active", raw["is_active"])

            if existing:
                for key, value in defaults.items():
                    setattr(existing, key, value)
                existing.save()
                obj = existing
                created = False
            else:
                create_kwargs = dict(defaults)
                create_kwargs["name"] = raw["name"]
                obj = ShopItem.objects.create(**create_kwargs)
                created = True

            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"Created: {obj.name}"))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f"Updated: {obj.name}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"Unique shop seed complete. created={created_count}, updated={updated_count}"
            )
        )