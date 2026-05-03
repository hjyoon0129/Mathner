from django.core.management.base import BaseCommand
from apps.shop.models import ShopItem


class Command(BaseCommand):
    help = "Replace shop font items with Korean kid-friendly Google fonts"

    def set_if_exists(self, obj, field_names, key, value):
        if key in field_names:
            setattr(obj, key, value)

    def handle(self, *args, **options):
        category_profile_font = getattr(
            ShopItem,
            "CATEGORY_PROFILE_FONT",
            "profile_font",
        )
        gender_common = getattr(ShopItem, "GENDER_COMMON", "common")

        model_field_names = {
            field.name
            for field in ShopItem._meta.get_fields()
            if hasattr(field, "attname")
        }

        fonts = [
            {
                "name": "주아",
                "font_family_key": "jua",
                "old_keys": ["bubblegum_sans", "jua"],
                "old_names": ["Bubblegum Sans", "말랑 주아", "Jua", "주아"],
                "description": "둥글고 또렷해서 초등 저학년 닉네임에 잘 어울리는 한글 폰트.",
                "price_stars": 120,
                "is_premium": True,
            },
            {
                "name": "감자꽃",
                "font_family_key": "gamja_flower",
                "old_keys": ["delius_swash_caps", "gamja_flower"],
                "old_names": ["Delius Swash Caps", "감자꽃 손글씨", "Gamja Flower", "감자꽃"],
                "description": "손으로 쓴 느낌이 부드럽고 귀여운 한글 폰트.",
                "price_stars": 120,
                "is_premium": True,
            },
            {
                "name": "동글",
                "font_family_key": "dongle",
                "old_keys": ["boogaloo", "dongle"],
                "old_names": ["Boogaloo", "동글 팡팡", "Dongle", "동글"],
                "description": "크고 동글동글해서 아이들이 보기 쉬운 한글 폰트.",
                "price_stars": 120,
                "is_premium": False,
            },
            {
                "name": "하이 멜로디",
                "font_family_key": "hi_melody",
                "old_keys": ["love_ya_like_a_sister", "hi_melody"],
                "old_names": ["Love Ya Like A Sister", "하이 멜로디", "Hi Melody"],
                "description": "가볍고 귀여운 손글씨 느낌의 프리미엄 한글 폰트.",
                "price_stars": 130,
                "is_premium": True,
            },
            {
                "name": "개구쟁이",
                "font_family_key": "gaegu",
                "old_keys": ["coming_soon", "gaegu"],
                "old_names": ["Coming Soon", "꼬마 손글씨", "Gaegu", "개구쟁이"],
                "description": "장난기 있는 손글씨 느낌의 한글 폰트.",
                "price_stars": 110,
                "is_premium": False,
            },
            {
                "name": "큐트 폰트",
                "font_family_key": "cute_font",
                "old_keys": ["life_savers", "cute_font"],
                "old_names": ["Life Savers", "귀염 글씨", "Cute Font", "큐트 폰트"],
                "description": "아기자기하고 귀여운 분위기의 프리미엄 한글 폰트.",
                "price_stars": 150,
                "is_premium": True,
            },
            {
                "name": "싱글 데이",
                "font_family_key": "single_day",
                "old_keys": ["chewy", "single_day"],
                "old_names": ["Chewy", "싱글 데이", "Single Day"],
                "description": "밝고 명랑한 느낌의 한글 손글씨 폰트.",
                "price_stars": 130,
                "is_premium": True,
            },
            {
                "name": "푸어 스토리",
                "font_family_key": "poor_story",
                "old_keys": ["cabin_sketch", "poor_story"],
                "old_names": ["Cabin Sketch", "이야기 손글씨", "Poor Story", "푸어 스토리"],
                "description": "동화책 같은 느낌의 프리미엄 한글 손글씨 폰트.",
                "price_stars": 140,
                "is_premium": False,
            },
            {
                "name": "구기",
                "font_family_key": "gugi",
                "old_keys": ["mouse_memoirs", "gugi"],
                "old_names": ["Mouse Memoirs", "구기체", "Gugi", "구기"],
                "description": "개성 있고 장난스러운 프리미엄 한글 폰트.",
                "price_stars": 130,
                "is_premium": False,
            },
            {
                "name": "나눔 펜글씨",
                "font_family_key": "nanum_pen_script",
                "old_keys": ["amatic_sc", "nanum_pen", "nanum_pen_script"],
                "old_names": ["Amatic SC", "나눔 펜글씨", "Nanum Pen Script"],
                "description": "친근한 손글씨 느낌의 한글 폰트.",
                "price_stars": 120,
                "is_premium": True,
            },
            {
                "name": "고운 돋움",
                "font_family_key": "gowun_dodum",
                "old_keys": ["capriola", "gowun_dodum"],
                "old_names": ["Capriola", "고운 돋움", "Gowun Dodum"],
                "description": "가장 또렷하고 읽기 편한 프리미엄 한글 기본 폰트.",
                "price_stars": 120,
                "is_premium": False,
            },
            {
                "name": "해바라기",
                "font_family_key": "sunflower",
                "old_keys": ["mclaren", "sunflower"],
                "old_names": ["McLaren", "해바라기체", "Sunflower", "해바라기"],
                "description": "밝고 깨끗한 느낌의 프리미엄 한글 폰트.",
                "price_stars": 130,
                "is_premium": False,
            },
        ]

        removed_font_keys = [
            "do_hyeon",
            "luckiest_guy",
            "dokdo",
            "black_han_sans",
            "londrina_shadow",
        ]

        removed_font_names = [
            "도현",
            "Do Hyeon",
            "Luckiest Guy",
            "또박 도현",
            "Dokdo",
            "검은 고딕",
            "Black Han Sans",
            "Londrina Shadow",
            "까만 제목체",
        ]

        active_keys = [font["font_family_key"] for font in fonts]
        created_count = 0
        updated_count = 0
        deactivated_count = 0
        removed_count = 0

        for font in fonts:
            existing = None

            if "font_family_key" in model_field_names:
                existing = ShopItem.objects.filter(
                    category=category_profile_font,
                    font_family_key__in=font["old_keys"],
                ).first()

            if not existing:
                existing = ShopItem.objects.filter(
                    category=category_profile_font,
                    name__in=font["old_names"],
                ).first()

            if existing:
                item = existing
                created = False
            else:
                item = ShopItem(category=category_profile_font)
                created = True

            item.name = font["name"]
            item.category = category_profile_font

            self.set_if_exists(item, model_field_names, "gender", gender_common)
            self.set_if_exists(item, model_field_names, "description", font["description"])
            self.set_if_exists(item, model_field_names, "price_stars", font["price_stars"])
            self.set_if_exists(item, model_field_names, "image_path", "")
            self.set_if_exists(item, model_field_names, "is_active", True)
            self.set_if_exists(item, model_field_names, "font_family_key", font["font_family_key"])
            self.set_if_exists(item, model_field_names, "font_preview_text", "매스너!")
            self.set_if_exists(item, model_field_names, "is_premium", font["is_premium"])

            item.save()

            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"Created: {item.name}"))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f"Updated: {item.name}"))

        old_font_qs = ShopItem.objects.filter(category=category_profile_font)

        if "font_family_key" in model_field_names:
            old_font_qs = old_font_qs.exclude(font_family_key__in=active_keys)
        else:
            old_font_qs = old_font_qs.exclude(name__in=[font["name"] for font in fonts])

        if "is_active" in model_field_names:
            deactivated_count = old_font_qs.update(is_active=False)

            removed_qs = ShopItem.objects.filter(category=category_profile_font).filter(
                name__in=removed_font_names
            )

            if "font_family_key" in model_field_names:
                removed_key_qs = ShopItem.objects.filter(
                    category=category_profile_font,
                    font_family_key__in=removed_font_keys,
                )
                removed_qs = removed_qs | removed_key_qs

            removed_count = removed_qs.update(is_active=False)

        self.stdout.write(
            self.style.SUCCESS(
                f"Korean Google font seed complete. "
                f"created={created_count}, "
                f"updated={updated_count}, "
                f"deactivated={deactivated_count}, "
                f"removed={removed_count}"
            )
        )