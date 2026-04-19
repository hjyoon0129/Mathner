from django import template

register = template.Library()


FONT_CLASS_MAP = {
    "": "font-default",
    "default": "font-default",
    "gaegu": "font-gaegu",
    "dongle": "font-dongle",
    "gowun_batang": "font-gowun_batang",
    "gowun-batang": "font-gowun_batang",
    "nanum_pen": "font-nanum_pen",
    "nanum-pen": "font-nanum_pen",
    "nanum_pen_script": "font-nanum_pen",
    "nanum-pen-script": "font-nanum_pen",
    "dokdo": "font-dokdo",
    "bubblegum_sans": "font-bubblegum_sans",
    "bubblegum-sans": "font-bubblegum_sans",
    "delius_swash_caps": "font-delius_swash_caps",
    "delius-swash-caps": "font-delius_swash_caps",
    "boogaloo": "font-boogaloo",
    "love_ya_like_a_sister": "font-love_ya_like_a_sister",
    "love-ya-like-a-sister": "font-love_ya_like_a_sister",
    "luckiest_guy": "font-luckiest_guy",
    "luckiest-guy": "font-luckiest_guy",
    "coming_soon": "font-coming_soon",
    "coming-soon": "font-coming_soon",
    "life_savers": "font-life_savers",
    "life-savers": "font-life_savers",
    "chewy": "font-chewy",
    "cabin_sketch": "font-cabin_sketch",
    "cabin-sketch": "font-cabin_sketch",
    "mouse_memoirs": "font-mouse_memoirs",
    "mouse-memoirs": "font-mouse_memoirs",
    "londrina_shadow": "font-londrina_shadow",
    "londrina-shadow": "font-londrina_shadow",
    "modak": "font-modak",
    "amatic_sc": "font-amatic_sc",
    "amatic-sc": "font-amatic_sc",
    "capriola": "font-capriola",
    "mclaren": "font-mclaren",
}

EFFECT_CLASS_MAP = {
    "": "effect-none",
    "none": "effect-none",
    "neon_blue": "effect-neon-blue",
    "neon-blue": "effect-neon-blue",
    "rainbow_flow": "effect-rainbow-flow",
    "rainbow-flow": "effect-rainbow-flow",
    "gold_glow": "effect-gold-glow",
    "gold-glow": "effect-gold-glow",
    "sparkle": "effect-sparkle",
    "glitch": "effect-glitch",
    "float_wave": "effect-float-wave",
    "float-wave": "effect-float-wave",
    "fire_glow": "effect-fire-glow",
    "fire-glow": "effect-fire-glow",
    "ice_glow": "effect-ice-glow",
    "ice-glow": "effect-ice-glow",
}


@register.filter
def font_class(value):
    key = str(value or "").strip().lower()
    return FONT_CLASS_MAP.get(key, "font-default")


@register.filter
def effect_class(value):
    key = str(value or "").strip().lower()
    return EFFECT_CLASS_MAP.get(key, "effect-none")


@register.filter
def mul(value, arg):
    try:
        return float(value) * float(arg)
    except Exception:
        return value