from django.core.management.base import BaseCommand
from django.contrib.staticfiles import finders
from apps.shop.models import ShopItem


class Command(BaseCommand):
    help = "Seed normal/basic shop avatar items safely"

    def pick_static_path(self, candidates):
        for path in candidates:
            if finders.find(path):
                return path
        return candidates[0] if candidates else ""

    def set_if_exists(self, defaults, field_names, key, value):
        if key in field_names:
            defaults[key] = value

    def get_category_value(self, *constant_names, fallback):
        for constant_name in constant_names:
            if hasattr(ShopItem, constant_name):
                return getattr(ShopItem, constant_name)
        return fallback

    def handle(self, *args, **options):
        model_field_names = {
            field.name
            for field in ShopItem._meta.get_fields()
            if hasattr(field, "attname")
        }

        gender_common = getattr(ShopItem, "GENDER_COMMON", "common")

        # 프로젝트마다 옷 카테고리 상수명이 조금 다를 수 있어서 안전하게 처리
        category_cloth = self.get_category_value(
            "CATEGORY_CLOTH",
            "CATEGORY_AVATAR_CLOTH",
            "CATEGORY_BODY",
            fallback="cloth",
        )

        raw_items = [
            {
                "lookup_names": ["black hoodie", "Black Hoodie", "검정 후드티"],
                "name": "검정 후드티",
                "category": category_cloth,
                "slot": "cloth",
                "equip_slot": "cloth",
                "gender": gender_common,
                "price_stars": 30,
                "description": "Basic black hoodie.",
                "image_candidates": [
                    "shop/img/basic/black_hoodie.webp",
                    "shop/img/basic/black_hoodie.png",
                    "shop/img/clothes/black_hoodie.webp",
                    "shop/img/clothes/black_hoodie.png",
                    "shop/img/avatar/black_hoodie.webp",
                    "shop/img/avatar/black_hoodie.png",
                    "shop/img/black_hoodie.webp",
                    "shop/img/black_hoodie.png",
                ],
            },
            {
                "lookup_names": ["blue hoodie", "Blue Hoodie", "파랑 후드티"],
                "name": "파랑 후드티",
                "category": category_cloth,
                "slot": "cloth",
                "equip_slot": "cloth",
                "gender": gender_common,
                "price_stars": 100,
                "description": "Basic blue hoodie.",
                "image_candidates": [
                    "shop/img/basic/blue_hoodie.webp",
                    "shop/img/basic/blue_hoodie.png",
                    "shop/img/clothes/blue_hoodie.webp",
                    "shop/img/clothes/blue_hoodie.png",
                    "shop/img/avatar/blue_hoodie.webp",
                    "shop/img/avatar/blue_hoodie.png",
                    "shop/img/blue_hoodie.webp",
                    "shop/img/blue_hoodie.png",
                ],
            },
            {
                "lookup_names": ["red jacket", "Red Jacket", "빨강 재킷"],
                "name": "빨강 재킷",
                "category": category_cloth,
                "slot": "cloth",
                "equip_slot": "cloth",
                "gender": gender_common,
                "price_stars": 40,
                "description": "Basic red jacket.",
                "image_candidates": [
                    "shop/img/basic/red_jacket.webp",
                    "shop/img/basic/red_jacket.png",
                    "shop/img/clothes/red_jacket.webp",
                    "shop/img/clothes/red_jacket.png",
                    "shop/img/avatar/red_jacket.webp",
                    "shop/img/avatar/red_jacket.png",
                    "shop/img/red_jacket.webp",
                    "shop/img/red_jacket.png",
                ],
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
            self.set_if_exists(defaults, model_field_names, "gender", raw["gender"])
            self.set_if_exists(defaults, model_field_names, "price_stars", raw["price_stars"])
            self.set_if_exists(defaults, model_field_names, "description", raw["description"])
            self.set_if_exists(defaults, model_field_names, "image_path", image_path)
            self.set_if_exists(defaults, model_field_names, "is_active", True)
            self.set_if_exists(defaults, model_field_names, "is_premium", False)

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
                f"Basic shop seed complete. created={created_count}, updated={updated_count}"
            )
        )