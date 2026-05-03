// static/shop/js/kids-shop-00-core.js

(function () {
  "use strict";

  const page = document.getElementById("shopPage");
  if (!page) return;

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value || "");
    } catch (error) {
      return fallback;
    }
  }

  const ds = page.dataset;

  const state = {
    ownedMap: safeJsonParse(ds.ownedMap, {}),
    ownedEffectMap: safeJsonParse(ds.ownedEffectMap, {}),
    currentStars: Number(ds.currentStars || 0),
    buyUrl: ds.buyUrl || "/shop/buy/",
    buyEffectsUrl: ds.buyEffectsUrl || "/shop/buy-effects/",
    premiumUrl: ds.premiumUrl || "/#pricing",
    isPremiumUser: String(ds.isPremiumUser || "false") === "true",

    activeMainTab: "avatar",
    activeGenderFilter: "all",
    activeTypeFilter: "all",
    isBuying: false
  };

  const els = {
    page,

    mainTabs: document.querySelectorAll(".kids-tab-btn[data-main-tab]"),
    genderBtns: document.querySelectorAll('.sub-filter-btn[data-filter-group="gender"]'),
    typeBtns: document.querySelectorAll('.sub-filter-btn[data-filter-group="type"]'),

    sections: {
      avatar: document.getElementById("shopItemsSection"),
      font: document.getElementById("shopItemsSection"),
      set: document.getElementById("shopSetSection"),
      unique: document.getElementById("shopUniqueSection"),
      effect: document.getElementById("shopEffectsSection")
    },

    genderGroup: document.getElementById("shopGenderFilterGroup"),
    typeGroup: document.getElementById("shopTypeFilterGroup"),

    summaryTitle: document.getElementById("summaryTitle"),
    summaryCount: document.getElementById("summaryCount"),
    summaryCost: document.getElementById("summaryCost"),
    summaryRemain: document.getElementById("summaryRemain"),
    summaryList: document.getElementById("summaryList"),
    buyBtn: document.getElementById("shopBuyBtn"),
    starsLabel: document.getElementById("shopCurrentStars"),

    premiumModal: document.getElementById("premiumModal"),
    premiumLaterBtn: document.getElementById("premiumLaterBtn"),
    premiumGoBtn: document.getElementById("premiumGoBtn")
  };

  const ITEM_NAME_MAP = {
    "black hoodie": "검정 후드티",
    "blue hoodie": "파랑 후드티",
    "red jacket": "빨강 재킷",
    "golden laurel crown": "황금 월계관",
    "royal red robe": "왕실 붉은 로브"
  };

  const EFFECT_OPTIONS = [
    ["none", "None"],
    ["neon-blue", "Neon Blue"],
    ["rainbow-flow", "Rainbow Flow"],
    ["gold-glow", "Gold Glow"],
    ["sparkle", "Sparkle"],
    ["glitch", "Glitch"],
    ["float-wave", "Float Wave"],
    ["fire-glow", "Fire Glow"],
    ["ice-glow", "Ice Glow"]
  ];

  const FONT_KEY_ALIAS = {
    bubblegum_sans: "jua",
    delius_swash_caps: "gamja_flower",
    boogaloo: "dongle",
    love_ya_like_a_sister: "hi_melody",
    luckiest_guy: "do_hyeon",
    coming_soon: "gaegu",
    life_savers: "cute_font",
    chewy: "single_day",
    cabin_sketch: "poor_story",
    mouse_memoirs: "gugi",
    londrina_shadow: "black_han_sans",
    amatic_sc: "nanum_pen_script",
    nanum_pen: "nanum_pen_script",
    capriola: "gowun_dodum",
    mclaren: "sunflower",

    gowun_batang: "gowun_dodum",
    dokdo: "do_hyeon",
    modak: "black_han_sans"
  };

  const FONT_KO_MAP = {
    default: "기본",
    pretendard: "프리텐다드",

    jua: "주아",
    bubblegum_sans: "주아",
    "bubblegum sans": "주아",
    "Bubblegum Sans": "주아",

    gamja_flower: "감자꽃",
    "gamja flower": "감자꽃",
    "Gamja Flower": "감자꽃",
    delius_swash_caps: "감자꽃",
    "delius swash caps": "감자꽃",
    "Delius Swash Caps": "감자꽃",

    dongle: "동글",
    "Dongle": "동글",
    boogaloo: "동글",
    "Boogaloo": "동글",

    hi_melody: "하이 멜로디",
    "hi melody": "하이 멜로디",
    "Hi Melody": "하이 멜로디",
    love_ya_like_a_sister: "하이 멜로디",
    "love ya like a sister": "하이 멜로디",
    "Love Ya Like A Sister": "하이 멜로디",

    do_hyeon: "도현",
    "do hyeon": "도현",
    "Do Hyeon": "도현",
    luckiest_guy: "도현",
    "luckiest guy": "도현",
    "Luckiest Guy": "도현",

    gaegu: "개구쟁이",
    "Gaegu": "개구쟁이",
    coming_soon: "개구쟁이",
    "coming soon": "개구쟁이",
    "Coming Soon": "개구쟁이",

    cute_font: "큐트 폰트",
    "cute font": "큐트 폰트",
    "Cute Font": "큐트 폰트",
    life_savers: "큐트 폰트",
    "life savers": "큐트 폰트",
    "Life Savers": "큐트 폰트",

    single_day: "싱글 데이",
    "single day": "싱글 데이",
    "Single Day": "싱글 데이",
    chewy: "싱글 데이",
    "Chewy": "싱글 데이",

    poor_story: "푸어 스토리",
    "poor story": "푸어 스토리",
    "Poor Story": "푸어 스토리",
    cabin_sketch: "푸어 스토리",
    "cabin sketch": "푸어 스토리",
    "Cabin Sketch": "푸어 스토리",

    gugi: "구기",
    "Gugi": "구기",
    mouse_memoirs: "구기",
    "mouse memoirs": "구기",
    "Mouse Memoirs": "구기",

    black_han_sans: "검은 고딕",
    "black han sans": "검은 고딕",
    "Black Han Sans": "검은 고딕",
    londrina_shadow: "검은 고딕",
    "londrina shadow": "검은 고딕",
    "Londrina Shadow": "검은 고딕",

    nanum_pen_script: "나눔 펜글씨",
    nanum_pen: "나눔 펜글씨",
    "nanum pen script": "나눔 펜글씨",
    "Nanum Pen Script": "나눔 펜글씨",
    amatic_sc: "나눔 펜글씨",
    "amatic sc": "나눔 펜글씨",
    "Amatic SC": "나눔 펜글씨",

    gowun_dodum: "고운 돋움",
    "gowun dodum": "고운 돋움",
    "Gowun Dodum": "고운 돋움",
    capriola: "고운 돋움",
    "Capriola": "고운 돋움",

    sunflower: "해바라기",
    "Sunflower": "해바라기",
    mclaren: "해바라기",
    "McLaren": "해바라기"
  };

  const FONT_CLASS_LIST = [
    "font-default",
    "font-pretendard",

    "font-jua",
    "font-bubblegum_sans",

    "font-gamja_flower",
    "font-delius_swash_caps",

    "font-dongle",
    "font-boogaloo",

    "font-hi_melody",
    "font-love_ya_like_a_sister",

    "font-do_hyeon",
    "font-luckiest_guy",

    "font-gaegu",
    "font-coming_soon",

    "font-cute_font",
    "font-life_savers",

    "font-single_day",
    "font-chewy",

    "font-poor_story",
    "font-cabin_sketch",

    "font-gugi",
    "font-mouse_memoirs",

    "font-black_han_sans",
    "font-londrina_shadow",

    "font-nanum_pen_script",
    "font-nanum_pen",
    "font-amatic_sc",

    "font-gowun_dodum",
    "font-capriola",

    "font-sunflower",
    "font-mclaren",

    "font-gowun_batang",
    "font-dokdo",
    "font-modak"
  ];

  const EFFECT_CLASS_LIST = [
    "effect-none",
    "effect-neon-blue",
    "effect-rainbow-flow",
    "effect-gold-glow",
    "effect-sparkle",
    "effect-glitch",
    "effect-float-wave",
    "effect-fire-glow",
    "effect-ice-glow"
  ];

  /*
    seed_shop_fonts.py 기준 프리미엄 폰트:
    - 주아: jua
    - 감자꽃: gamja_flower
    - 하이 멜로디: hi_melody
    - 큐트 폰트: cute_font
    - 싱글 데이: single_day
    - 나눔 펜글씨: nanum_pen_script

    일반 폰트:
    - 동글: dongle
    - 개구쟁이: gaegu
    - 푸어 스토리: poor_story
    - 구기: gugi
    - 고운 돋움: gowun_dodum
    - 해바라기: sunflower
  */
  const PREMIUM_FONT_KEYS = new Set([
    "jua",
    "bubblegum_sans",

    "gamja_flower",
    "delius_swash_caps",

    "hi_melody",
    "love_ya_like_a_sister",

    "cute_font",
    "life_savers",

    "single_day",
    "chewy",

    "nanum_pen_script",
    "nanum_pen",
    "amatic_sc"
  ]);

  const PREMIUM_EFFECT_KEYS = new Set([
    "rainbow_flow",
    "rainbow-flow",
    "sparkle",
    "float_wave",
    "float-wave",
    "fire_glow",
    "fire-glow",
    "ice_glow",
    "ice-glow"
  ]);

  function normalizeKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/-/g, "_")
      .replace(/\s+/g, "_");
  }

  function normalizeTextKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");
  }

  function effectCssToken(value) {
    return String(value || "none")
      .trim()
      .toLowerCase()
      .replace(/_/g, "-")
      .replace(/\s+/g, "-");
  }

  function getCanonicalFontKey(value) {
    const normalized = normalizeKey(value);
    return FONT_KEY_ALIAS[normalized] || normalized || "default";
  }

  function fontCssToken(value) {
    return getCanonicalFontKey(value || "default");
  }

  function getKoreanFontName(value) {
    if (!value) return "";

    const raw = String(value).trim();
    const normalized = normalizeKey(raw);
    const spaced = normalizeTextKey(raw);
    const canonical = getCanonicalFontKey(raw);

    return (
      FONT_KO_MAP[raw] ||
      FONT_KO_MAP[normalized] ||
      FONT_KO_MAP[spaced] ||
      FONT_KO_MAP[canonical] ||
      raw
    );
  }

  function getItemDisplayName(value) {
    const key = normalizeTextKey(value);
    return ITEM_NAME_MAP[key] || value;
  }

  function getCsrfToken() {
    return (
      document.querySelector('input[name="csrfmiddlewaretoken"]')?.value ||
      window.CSRF_TOKEN ||
      ""
    );
  }

  function getOwnedQty(itemId) {
    const key = String(itemId || "").trim();
    if (!key) return 0;

    if (state.ownedMap[key] != null) {
      return Number(state.ownedMap[key] || 0);
    }

    const numKey = Number(key);
    if (!Number.isNaN(numKey) && state.ownedMap[numKey] != null) {
      return Number(state.ownedMap[numKey] || 0);
    }

    return 0;
  }

  function getOwnedEffectQty(effectKey) {
    const rawKey = String(effectKey || "").trim();
    const normalized = normalizeKey(rawKey);

    if (state.ownedEffectMap[rawKey] != null) {
      return Number(state.ownedEffectMap[rawKey] || 0);
    }

    if (state.ownedEffectMap[normalized] != null) {
      return Number(state.ownedEffectMap[normalized] || 0);
    }

    return 0;
  }

  function clearFontClasses(target) {
    if (!target) return;
    FONT_CLASS_LIST.forEach((cls) => target.classList.remove(cls));
  }

  function clearEffectClasses(target) {
    if (!target) return;
    EFFECT_CLASS_LIST.forEach((cls) => target.classList.remove(cls));
  }

  function applyPreviewFont(target, fontKey) {
    if (!target) return;

    const canonical = getCanonicalFontKey(fontKey || "default");

    clearFontClasses(target);
    target.classList.add(`font-${fontCssToken(canonical)}`);
  }

  function applyPreviewEffect(target, effectKey) {
    if (!target) return;

    clearEffectClasses(target);
    target.classList.add(`effect-${effectCssToken(effectKey || "none")}`);
  }

  window.MathnerShop = {
    page,
    state,
    els,

    ITEM_NAME_MAP,
    EFFECT_OPTIONS,
    FONT_KO_MAP,
    FONT_KEY_ALIAS,
    FONT_CLASS_LIST,
    EFFECT_CLASS_LIST,
    PREMIUM_FONT_KEYS,
    PREMIUM_EFFECT_KEYS,

    normalizeKey,
    normalizeTextKey,
    effectCssToken,
    fontCssToken,
    getCanonicalFontKey,
    getKoreanFontName,
    getItemDisplayName,
    getCsrfToken,
    getOwnedQty,
    getOwnedEffectQty,
    clearFontClasses,
    clearEffectClasses,
    applyPreviewFont,
    applyPreviewEffect
  };
})();