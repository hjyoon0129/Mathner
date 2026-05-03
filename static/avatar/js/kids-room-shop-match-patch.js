(function () {
  const App = window.MathnerKidsRoom;

  if (!App || typeof App.register !== "function") return;

  App.register(function roomShopMatchPatch(App) {
    const $$ = App.$$;
    const els = App.els;
    const state = App.state;

    /* =========================================================
       1. Effect normalize
       ========================================================= */

    const EFFECT_KEY_SET = new Set([
      "none",
      "neon_blue",
      "rainbow_flow",
      "gold_glow",
      "sparkle",
      "glitch",
      "float_wave",
      "fire_glow",
      "ice_glow",
    ]);

    const EFFECT_ALIAS_MAP = {
      none: "none",

      neonblue: "neon_blue",
      neon_blue: "neon_blue",
      "neon blue": "neon_blue",
      "네온블루": "neon_blue",
      "네온 블루": "neon_blue",

      rainbowflow: "rainbow_flow",
      rainbow_flow: "rainbow_flow",
      "rainbow flow": "rainbow_flow",
      "레인보우": "rainbow_flow",
      "무지개": "rainbow_flow",

      goldglow: "gold_glow",
      gold_glow: "gold_glow",
      "gold glow": "gold_glow",
      "골드글로우": "gold_glow",
      "골드 글로우": "gold_glow",
      "금빛": "gold_glow",

      sparkle: "sparkle",
      "스파클": "sparkle",
      "반짝이": "sparkle",

      glitch: "glitch",
      "글리치": "glitch",

      floatwave: "float_wave",
      float_wave: "float_wave",
      "float wave": "float_wave",
      "물결": "float_wave",

      fireglow: "fire_glow",
      fire_glow: "fire_glow",
      "fire glow": "fire_glow",
      "불꽃": "fire_glow",

      iceglow: "ice_glow",
      ice_glow: "ice_glow",
      "ice glow": "ice_glow",
      "얼음": "ice_glow",
    };

    function normalizePlainKey(value = "") {
      return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/-/g, "_")
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_가-힣]/g, "")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
    }

    function normalizeEffectKey(effectKey = "none") {
      const raw = String(effectKey || "none").trim();
      const lower = raw.toLowerCase();

      if (EFFECT_ALIAS_MAP[lower]) return EFFECT_ALIAS_MAP[lower];

      const normalized = normalizePlainKey(raw);
      if (EFFECT_ALIAS_MAP[normalized]) return EFFECT_ALIAS_MAP[normalized];

      const compact = normalized.replace(/_/g, "");
      if (EFFECT_ALIAS_MAP[compact]) return EFFECT_ALIAS_MAP[compact];

      return EFFECT_KEY_SET.has(normalized) ? normalized : "none";
    }

    function effectClassFromKey(effectKey = "none") {
      return `effect-${normalizeEffectKey(effectKey).replace(/_/g, "-")}`;
    }

    App.normalizeEffectKey = normalizeEffectKey;

    App.effectKeyToClass = function effectKeyToClassPatched(effectKey = "none") {
      return effectClassFromKey(effectKey || "none");
    };

    /* =========================================================
       2. Strict item classification
       - 옷이 폰트로 들어가는 문제 방지
       - code / slug / name만 보고 font로 판단하지 않음
       ========================================================= */

    function getCategoryValue(item, key) {
      return String(item?.[key] || "").trim().toLowerCase();
    }

    function hasProfileFontCategory(item) {
      if (!item) return false;

      const category = getCategoryValue(item, "category") || getCategoryValue(item, "item_category");
      const type = getCategoryValue(item, "type") || getCategoryValue(item, "item_type");
      const group = getCategoryValue(item, "item_group") || getCategoryValue(item, "group");

      return (
        category === "profile_font" ||
        category === "font" ||
        type === "profile_font" ||
        type === "font" ||
        group === "profile_font" ||
        group === "font"
      );
    }

    function hasProfileEffectCategory(item) {
      if (!item) return false;

      const category = getCategoryValue(item, "category") || getCategoryValue(item, "item_category");
      const type = getCategoryValue(item, "type") || getCategoryValue(item, "item_type");
      const group = getCategoryValue(item, "item_group") || getCategoryValue(item, "group");

      return (
        category === "profile_effect" ||
        category === "effect" ||
        type === "profile_effect" ||
        type === "effect" ||
        group === "profile_effect" ||
        group === "effect"
      );
    }

    function normalizeFontKey(fontKey = "") {
      if (typeof App.normalizeFontKey === "function") {
        return App.normalizeFontKey(fontKey || "");
      }

      return normalizePlainKey(fontKey || "");
    }

    function hasFontKeyField(item) {
      const key = normalizeFontKey(item?.font_key || item?.font_family_key || "");
      return Boolean(key);
    }

    function hasEffectKeyField(item) {
      const key = normalizeEffectKey(item?.effect_key || item?.key || "");
      return Boolean(key && key !== "none");
    }

    function isEffectLikeItemStrict(item) {
      if (!item) return false;

      if (hasProfileEffectCategory(item)) return true;

      if (item.is_effect === true && hasEffectKeyField(item)) return true;

      return false;
    }

    function isFontLikeItemStrict(item) {
      if (!item) return false;
      if (isEffectLikeItemStrict(item)) return false;

      if (hasProfileFontCategory(item)) return true;

      if (item.is_font === true && hasFontKeyField(item)) return true;

      return false;
    }

    App.isProfileFontItem = isFontLikeItemStrict;
    App.isProfileEffectItem = isEffectLikeItemStrict;

    function sanitizeOwnedItems() {
      if (!Array.isArray(state.ownedItems)) return;

      state.ownedItems = state.ownedItems.map((item) => {
        const next = { ...(item || {}) };

        const isFont = isFontLikeItemStrict(next);
        const isEffect = isEffectLikeItemStrict(next);

        next.is_font = isFont;
        next.is_effect = isEffect;

        if (isFont) {
          next.font_key = normalizeFontKey(next.font_key || next.font_family_key || "");
          next.font_family_key = next.font_key;
          next.slot = "";
        } else {
          next.font_key = "";
          next.font_family_key = "";
        }

        if (isEffect) {
          next.effect_key = normalizeEffectKey(next.effect_key || next.key || "");
          next.slot = "";
        } else {
          next.effect_key = "";
        }

        if (!isFont && !isEffect && typeof App.resolveItemSlot === "function") {
          next.slot = App.resolveItemSlot(next);
        }

        return next;
      });
    }

    /* =========================================================
       3. Font / effect class helpers
       ========================================================= */

    function fontClassFromKey(fontKey = "") {
      const normalized = normalizeFontKey(fontKey);
      return normalized ? `font-${normalized}` : "font-default";
    }

    App.fontClassFromKey = function fontClassFromKeyPatched(fontKey = "") {
      return fontClassFromKey(fontKey);
    };

    App.resetFontClasses = function resetFontClassesPatched(el) {
      if (!el || !el.classList) return;

      if (Array.isArray(App.ALL_FONT_CLASSES)) {
        App.ALL_FONT_CLASSES.forEach((cls) => el.classList.remove(cls));
      }

      Array.from(el.classList).forEach((cls) => {
        if (cls.startsWith("font-")) {
          el.classList.remove(cls);
        }
      });
    };

    App.clearEffectClasses = function clearEffectClassesPatched(el) {
      if (!el || !el.classList) return;

      if (Array.isArray(App.EFFECT_CLASS_LIST)) {
        App.EFFECT_CLASS_LIST.forEach((cls) => el.classList.remove(cls));
      }

      Array.from(el.classList).forEach((cls) => {
        if (cls.startsWith("effect-")) {
          el.classList.remove(cls);
        }
      });
    };

    App.applyFontClass = function applyFontClassPatched(el, fontKey = "") {
      if (!el) return;

      const normalized = normalizeFontKey(fontKey || "");

      App.resetFontClasses(el);
      el.classList.add(normalized ? `font-${normalized}` : "font-default");
      el.dataset.fontKey = normalized || "";
    };

    App.applyFontEffect = function applyFontEffectPatched(el, effectKey = "none") {
      if (!el) return;

      const normalized = normalizeEffectKey(effectKey || "none");

      App.clearEffectClasses(el);
      el.classList.add(effectClassFromKey(normalized));
      el.dataset.effectKey = normalized;
    };

    /* =========================================================
       4. Font visual map
       - 아바타 닉네임과 방명록 닉네임이 같은 폰트로 보이도록 사용
       ========================================================= */

    const FONT_FAMILY_MAP = {
      default: 'var(--kids-font), sans-serif',
      pretendard: 'var(--kids-font), sans-serif',

      jua: '"Jua", var(--kids-font), sans-serif',
      bubblegum_sans: '"Jua", var(--kids-font), sans-serif',

      gamja_flower: '"Gamja Flower", var(--kids-font), cursive',
      delius_swash_caps: '"Gamja Flower", var(--kids-font), cursive',

      dongle: '"Dongle", var(--kids-font), sans-serif',
      boogaloo: '"Dongle", var(--kids-font), sans-serif',

      hi_melody: '"Hi Melody", var(--kids-font), cursive',
      love_ya_like_a_sister: '"Hi Melody", var(--kids-font), cursive',

      do_hyeon: '"Do Hyeon", var(--kids-font), sans-serif',
      luckiest_guy: '"Do Hyeon", var(--kids-font), sans-serif',

      gaegu: '"Gaegu", var(--kids-font), cursive',
      coming_soon: '"Gaegu", var(--kids-font), cursive',

      cute_font: '"Cute Font", var(--kids-font), cursive',
      life_savers: '"Cute Font", var(--kids-font), cursive',

      single_day: '"Single Day", var(--kids-font), cursive',
      chewy: '"Single Day", var(--kids-font), cursive',

      poor_story: '"Poor Story", var(--kids-font), cursive',
      cabin_sketch: '"Poor Story", var(--kids-font), cursive',

      gugi: '"Gugi", var(--kids-font), cursive',
      mouse_memoirs: '"Gugi", var(--kids-font), cursive',

      black_han_sans: '"Black Han Sans", var(--kids-font), sans-serif',
      londrina_shadow: '"Black Han Sans", var(--kids-font), sans-serif',

      nanum_pen: '"Nanum Pen Script", var(--kids-font), cursive',
      nanum_pen_script: '"Nanum Pen Script", var(--kids-font), cursive',
      amatic_sc: '"Nanum Pen Script", var(--kids-font), cursive',

      gowun_dodum: '"Gowun Dodum", var(--kids-font), sans-serif',
      capriola: '"Gowun Dodum", var(--kids-font), sans-serif',

      sunflower: '"Sunflower", var(--kids-font), sans-serif',
      mclaren: '"Sunflower", var(--kids-font), sans-serif',

      gowun_batang: '"Gowun Batang", var(--kids-font), serif',
      dokdo: '"Dokdo", var(--kids-font), cursive',
      modak: '"Modak", var(--kids-font), cursive',
    };

    const FONT_SIZE_MAP = {
      default: 19,
      pretendard: 19,

      jua: 20,
      bubblegum_sans: 20,

      gamja_flower: 24,
      delius_swash_caps: 24,

      dongle: 30,
      boogaloo: 30,

      hi_melody: 25,
      love_ya_like_a_sister: 25,

      do_hyeon: 20,
      luckiest_guy: 20,

      gaegu: 23,
      coming_soon: 23,

      cute_font: 30,
      life_savers: 30,

      single_day: 24,
      chewy: 24,

      poor_story: 22,
      cabin_sketch: 22,

      gugi: 20,
      mouse_memoirs: 20,

      black_han_sans: 19,
      londrina_shadow: 19,

      nanum_pen: 27,
      nanum_pen_script: 27,
      amatic_sc: 27,

      gowun_dodum: 20,
      capriola: 20,

      sunflower: 20,
      mclaren: 20,

      gowun_batang: 20,
      dokdo: 26,
      modak: 22,
    };

    const FONT_WEIGHT_MAP = {
      default: 900,
      pretendard: 900,

      dongle: 700,
      gaegu: 700,
      sunflower: 700,

      jua: 400,
      gamja_flower: 400,
      delius_swash_caps: 400,
      hi_melody: 400,
      do_hyeon: 400,
      cute_font: 400,
      single_day: 400,
      poor_story: 400,
      gugi: 400,
      black_han_sans: 400,
      nanum_pen: 400,
      nanum_pen_script: 400,
      gowun_dodum: 400,
      gowun_batang: 400,
      dokdo: 400,
      modak: 400,
    };

    function getFontFamily(fontKey = "") {
      const normalized = normalizeFontKey(fontKey || "");
      return FONT_FAMILY_MAP[normalized] || FONT_FAMILY_MAP.default;
    }

    function getFontBaseSize(fontKey = "") {
      const normalized = normalizeFontKey(fontKey || "");
      return FONT_SIZE_MAP[normalized] || FONT_SIZE_MAP.default;
    }

    function getFontWeight(fontKey = "") {
      const normalized = normalizeFontKey(fontKey || "");
      return FONT_WEIGHT_MAP[normalized] || 400;
    }

    function clampValue(value, min, max, fallback = min) {
      const n = Number(value);
      if (!Number.isFinite(n)) return fallback;
      return Math.min(max, Math.max(min, n));
    }

    function getActiveNicknameScale() {
      return clampValue(
        state.previewFont?.nicknameScale ??
          state.viewerFontPref?.nickname_scale ??
          App.DEFAULT_NICKNAME_SCALE,
        App.MIN_NICKNAME_SCALE,
        App.MAX_NICKNAME_SCALE,
        App.DEFAULT_NICKNAME_SCALE
      );
    }

    function getActiveNicknameSpacing() {
      return clampValue(
        state.previewFont?.nicknameLetterSpacing ??
          state.viewerFontPref?.nickname_letter_spacing ??
          App.DEFAULT_NICKNAME_SPACING,
        App.MIN_NICKNAME_SPACING,
        App.MAX_NICKNAME_SPACING,
        App.DEFAULT_NICKNAME_SPACING
      );
    }

    App.getActiveNicknameScale = getActiveNicknameScale;
    App.getActiveNicknameSpacing = getActiveNicknameSpacing;

    function getNicknameTextInlineStyle(fontKey = "", scale = 1, spacing = 0) {
      const normalizedFontKey = normalizeFontKey(fontKey || "");
      const safeScale = clampValue(scale, App.MIN_NICKNAME_SCALE, App.MAX_NICKNAME_SCALE, App.DEFAULT_NICKNAME_SCALE);
      const safeSpacing = clampValue(spacing, App.MIN_NICKNAME_SPACING, App.MAX_NICKNAME_SPACING, App.DEFAULT_NICKNAME_SPACING);
      const size = Math.max(14, Math.round(getFontBaseSize(normalizedFontKey) * safeScale));

      return [
        `font-family:${getFontFamily(normalizedFontKey)} !important`,
        `font-size:${size}px !important`,
        `font-weight:${getFontWeight(normalizedFontKey)} !important`,
        `letter-spacing:${safeSpacing}px !important`,
        "line-height:1.05 !important",
        "white-space:nowrap !important",
      ].join("; ");
    }

    /* =========================================================
       5. Owner nickname visual
       ========================================================= */

    function getValidSelectedFontItem() {
      const selectedItem = state.selectedFontItemId
        ? App.itemByItemId?.(state.selectedFontItemId)
        : null;

      return selectedItem && isFontLikeItemStrict(selectedItem) ? selectedItem : null;
    }

    function getSelectedFontKey() {
      const selectedItem = getValidSelectedFontItem();

      return normalizeFontKey(
        selectedItem?.font_key ||
          selectedItem?.font_family_key ||
          state.previewFont?.fontKey ||
          state.viewerFontPref?.nickname_font_key ||
          ""
      );
    }

    function getOwnerNicknameFontKey(live = false) {
      if (App.isOwner && live) {
        return normalizeFontKey(
          getSelectedFontKey() ||
            state.viewerFontPref?.nickname_font_key ||
            state.ownerFontPref?.nickname_font_key ||
            ""
        );
      }

      return normalizeFontKey(
        state.ownerFontPref?.nickname_font_key ||
          state.viewerFontPref?.nickname_font_key ||
          getSelectedFontKey() ||
          ""
      );
    }

    function getOwnerNicknameEffectKey(live = false) {
      if (App.isOwner && live) {
        return normalizeEffectKey(
          state.previewFont?.effectKey ||
            state.viewerFontPref?.nickname_effect_key ||
            state.ownerFontPref?.nickname_effect_key ||
            "none"
        );
      }

      return normalizeEffectKey(
        state.ownerFontPref?.nickname_effect_key ||
          state.viewerFontPref?.nickname_effect_key ||
          state.previewFont?.effectKey ||
          "none"
      );
    }

    function getOwnerNicknameScale(live = false) {
      if (App.isOwner && live) return getActiveNicknameScale();

      return clampValue(
        state.ownerFontPref?.nickname_scale ??
          state.viewerFontPref?.nickname_scale ??
          App.DEFAULT_NICKNAME_SCALE,
        App.MIN_NICKNAME_SCALE,
        App.MAX_NICKNAME_SCALE,
        App.DEFAULT_NICKNAME_SCALE
      );
    }

    function getOwnerNicknameSpacing(live = false) {
      if (App.isOwner && live) return getActiveNicknameSpacing();

      return clampValue(
        state.ownerFontPref?.nickname_letter_spacing ??
          state.viewerFontPref?.nickname_letter_spacing ??
          App.DEFAULT_NICKNAME_SPACING,
        App.MIN_NICKNAME_SPACING,
        App.MAX_NICKNAME_SPACING,
        App.DEFAULT_NICKNAME_SPACING
      );
    }

    function clearTextEffectInline(el) {
      if (!el || !el.style) return;

      el.style.removeProperty("background");
      el.style.removeProperty("background-image");
      el.style.removeProperty("background-size");
      el.style.removeProperty("background-position");
      el.style.removeProperty("background-repeat");
      el.style.removeProperty("background-clip");
      el.style.removeProperty("-webkit-background-clip");
      el.style.removeProperty("text-shadow");
      el.style.removeProperty("filter");
      el.style.removeProperty("animation");
      el.style.removeProperty("opacity");
      el.style.removeProperty("transform");
    }

    function clearVisualClasses(el) {
      if (!el || !el.classList) return;

      Array.from(el.classList).forEach((cls) => {
        if (cls.startsWith("font-") || cls.startsWith("effect-")) {
          el.classList.remove(cls);
        }
      });
    }

    function ensureOwnerNameTextLayer() {
      const root = els.roomOwnerName;
      if (!root) return null;

      let layer = root.querySelector(".room-owner-name-text-layer");

      if (!layer) {
        const currentText = String(root.textContent || "").trim();

        root.innerHTML = "";

        layer = document.createElement("span");
        layer.className = "room-owner-name-text-layer";
        layer.textContent =
          currentText ||
          App.ownerDisplayName?.() ||
          App.ownerUsername?.() ||
          "Player";

        root.appendChild(layer);
      }

      root.classList.add("room-owner-name-shell");
      clearVisualClasses(root);
      clearTextEffectInline(root);

      root.style.setProperty("display", "inline-flex", "important");
      root.style.setProperty("align-items", "center", "important");
      root.style.setProperty("justify-content", "center", "important");

      return layer;
    }

    function applyOwnerNicknameVisual(live = false) {
      const layer = ensureOwnerNameTextLayer();
      if (!layer) return;

      const fontKey = getOwnerNicknameFontKey(live);
      const effectKey = getOwnerNicknameEffectKey(live);
      const scale = getOwnerNicknameScale(live);
      const spacing = getOwnerNicknameSpacing(live);
      const defaultColor =
        state.ownerFontPref?.nickname_color ||
        state.viewerFontPref?.nickname_color ||
        "#fff8ea";

      clearVisualClasses(layer);
      clearTextEffectInline(layer);

      App.applyFontClass(layer, fontKey);
      App.applyFontEffect(layer, effectKey);

      layer.style.cssText += `; ${getNicknameTextInlineStyle(fontKey, scale, spacing)}`;

      if (effectKey === "rainbow_flow") {
        layer.style.setProperty("color", "transparent", "important");
        layer.style.setProperty("-webkit-text-fill-color", "transparent", "important");
        layer.style.setProperty("background-clip", "text", "important");
        layer.style.setProperty("-webkit-background-clip", "text", "important");
      } else if (effectKey === "none") {
        layer.style.setProperty("color", defaultColor, "important");
        layer.style.setProperty("-webkit-text-fill-color", defaultColor, "important");
      } else {
        layer.style.removeProperty("color");
        layer.style.removeProperty("-webkit-text-fill-color");
      }

      layer.dataset.fontKey = fontKey || "";
      layer.dataset.effectKey = effectKey || "none";
    }

    App.applyLiveNicknamePreview = function applyLiveNicknamePreviewPatched() {
      if (!App.isOwner) return;

      applyOwnerNicknameVisual(true);
      App.applyNicknamePreviewToEditorCards?.();
    };

    App.applyOwnerNicknameDisplay = function applyOwnerNicknameDisplayPatched() {
      applyOwnerNicknameVisual(false);
      App.applyNicknamePreviewToEditorCards?.();
    };

    const originalSyncOwnerNickname = App.syncOwnerNickname?.bind(App);

    App.syncOwnerNickname = function syncOwnerNicknamePatched() {
      if (typeof originalSyncOwnerNickname === "function") {
        originalSyncOwnerNickname();
      }

      const layer = ensureOwnerNameTextLayer();
      if (!layer) return;

      const name =
        App.ownerDisplayName?.() ||
        App.ownerUsername?.() ||
        "Player";

      if (!String(layer.textContent || "").trim()) {
        layer.textContent = name;
      }

      applyOwnerNicknameVisual(false);
    };

    /* =========================================================
       6. Guestbook nickname override
       - 핵심 수정: 방명록 닉네임에도 font-family inline 적용
       ========================================================= */

    App.buildNameTextClass = function buildNameTextClassPatched(fontKey = "", effectKey = "none") {
      const normalizedFontKey = typeof App.normalizeGuestbookFontKey === "function"
        ? App.normalizeGuestbookFontKey(fontKey || "")
        : normalizeFontKey(fontKey || "");

      const normalizedEffectKey = typeof App.normalizeGuestbookEffectKey === "function"
        ? App.normalizeGuestbookEffectKey(effectKey || "none")
        : normalizeEffectKey(effectKey || "none");

      return [
        "guest-name-btn-text",
        fontClassFromKey(normalizedFontKey),
        effectClassFromKey(normalizedEffectKey || "none"),
      ].filter(Boolean).join(" ");
    };

    App.makeNameButton = function makeNameButtonPatched(
      displayName,
      roomUrl,
      extraClass = "",
      fontKey = "",
      effectKey = "none",
      scale = App.DEFAULT_NICKNAME_SCALE,
      spacing = App.DEFAULT_NICKNAME_SPACING
    ) {
      const resolvedName = App.resolveMessageDisplayName(displayName, roomUrl);
      const safeName = App.escapeHtml(resolvedName || "Player");
      const safeRoomUrl = App.escapeHtml(roomUrl || "");

      const normalizedFontKey = typeof App.normalizeGuestbookFontKey === "function"
        ? App.normalizeGuestbookFontKey(fontKey || "")
        : normalizeFontKey(fontKey || "");

      const normalizedEffectKey = typeof App.normalizeGuestbookEffectKey === "function"
        ? App.normalizeGuestbookEffectKey(effectKey || "none")
        : normalizeEffectKey(effectKey || "none");

      const buttonClasses = [
        "guest-name-btn",
        "guest-name-label-btn",
        "js-name-pop",
        extraClass,
      ].filter(Boolean).join(" ");

      const textClasses = App.buildNameTextClass(normalizedFontKey, normalizedEffectKey);

      const inlineStyle = getNicknameTextInlineStyle(
        normalizedFontKey,
        App.safeNicknameScale ? App.safeNicknameScale(scale) : Number(scale || App.DEFAULT_NICKNAME_SCALE),
        App.safeNicknameSpacing ? App.safeNicknameSpacing(spacing) : Number(spacing || App.DEFAULT_NICKNAME_SPACING)
      );

      return `
        <button
          type="button"
          class="${buttonClasses}"
          data-room-url="${safeRoomUrl}"
          data-font-key="${App.escapeHtml(normalizedFontKey)}"
          data-effect-key="${App.escapeHtml(normalizedEffectKey)}"
          aria-label="${safeName}의 방 보기"
        >
          <span class="guest-name-label-shell">
            <span
              class="${textClasses}"
              data-font-key="${App.escapeHtml(normalizedFontKey)}"
              data-effect-key="${App.escapeHtml(normalizedEffectKey)}"
              style="${inlineStyle}"
            >${safeName}</span>
          </span>
        </button>
      `;
    };

    /* =========================================================
       7. Editor preview
       ========================================================= */

    App.getNicknamePreviewInlineStyle = function getNicknamePreviewInlineStylePatched() {
      const fontKey = getSelectedFontKey();

      return getNicknameTextInlineStyle(
        fontKey,
        getActiveNicknameScale(),
        getActiveNicknameSpacing()
      );
    };

    function getFontKeyFromClassList(el) {
      if (!el || !el.classList) return "";

      for (const cls of Array.from(el.classList)) {
        if (cls.startsWith("font-")) {
          return normalizeFontKey(cls.replace(/^font-/, ""));
        }
      }

      return "";
    }

    App.applyNicknamePreviewToEditorCards = function applyNicknamePreviewToEditorCardsPatched(root = document) {
      const targets = [
        ...$$(".font-inventory-card .font-preview-text", root),
        ...$$(".effect-inventory-card .font-preview-text", root),
      ];

      targets.forEach((el) => {
        const fontKey = getFontKeyFromClassList(el) || getSelectedFontKey();

        el.style.cssText += `; ${getNicknameTextInlineStyle(
          fontKey,
          getActiveNicknameScale(),
          getActiveNicknameSpacing()
        )}`;
      });
    };

    const originalUpdateFontEffectCarousels = App.updateFontEffectCarousels?.bind(App);

    App.updateFontEffectCarousels = function updateFontEffectCarouselsPatched() {
      if (typeof originalUpdateFontEffectCarousels === "function") {
        originalUpdateFontEffectCarousels();
      }

      App.applyNicknamePreviewToEditorCards?.();
    };

    const originalSyncNicknameToolUI = App.syncNicknameToolUI?.bind(App);

    App.syncNicknameToolUI = function syncNicknameToolUIPatched() {
      if (typeof originalSyncNicknameToolUI === "function") {
        originalSyncNicknameToolUI();
      }

      App.applyNicknamePreviewToEditorCards?.();
    };

    /* =========================================================
       8. Effect inventory
       ========================================================= */

    App.mergeEffectInventoryFromOwnedItems = function mergeEffectInventoryFromOwnedItemsPatched() {
      const byKey = new Map();

      for (const effect of state.ownedEffects || []) {
        const key = normalizeEffectKey(effect.effect_key || effect.key || "");
        if (!key || key === "none") continue;

        byKey.set(key, {
          effect_key: key,
          name: effect.name || App.EFFECT_LABEL_MAP?.[key] || key,
          quantity: Number(effect.quantity || 1),
        });
      }

      for (const item of state.ownedItems || []) {
        if (!isEffectLikeItemStrict(item)) continue;

        const key = normalizeEffectKey(item.effect_key || item.key || "");
        if (!key || key === "none") continue;

        if (!byKey.has(key)) {
          byKey.set(key, {
            effect_key: key,
            name: item.name || App.EFFECT_LABEL_MAP?.[key] || key,
            quantity: Number(item.quantity || 1),
          });
        } else {
          byKey.get(key).quantity = Math.max(
            Number(byKey.get(key).quantity || 1),
            Number(item.quantity || 1)
          );
        }
      }

      state.ownedEffects = Array.from(byKey.values());
    };

    App.setEffectSelection = function setEffectSelectionPatched(effectKey = "none", options = {}) {
      const normalized = normalizeEffectKey(effectKey);
      const { preservePage = false } = options;

      if (els.fontEffectSelect) {
        els.fontEffectSelect.value = normalized;
      }

      state.previewFont.effectKey = normalized;

      App.renderEffectInventory?.({ preservePage });
      App.applyLiveNicknamePreview?.();
      App.applyNicknamePreviewToEditorCards?.();
    };

    /* =========================================================
       9. Guestbook / Diary body
       ========================================================= */

    function readableBodyInlineStyle() {
      return [
        "display:block !important",
        "width:100% !important",
        "max-width:100% !important",
        "color:#2f2924 !important",
        "-webkit-text-fill-color:#2f2924 !important",
        "background:none !important",
        "background-image:none !important",
        "background-clip:initial !important",
        "-webkit-background-clip:initial !important",
        "text-shadow:none !important",
        "filter:none !important",
        "animation:none !important",
        "transform:none !important",
        "opacity:1 !important",
        "line-height:1.65 !important",
        "white-space:pre-wrap !important",
        "word-break:break-word !important",
        "overflow-wrap:anywhere !important",
        "text-align:left !important",
      ].join("; ");
    }

    function forceReadableBodyStyle(el) {
      if (!el) return;

      App.clearEffectClasses(el);
      el.classList.add("effect-none");
      el.classList.add("mathner-readable-body");

      el.style.setProperty("color", "#2f2924", "important");
      el.style.setProperty("-webkit-text-fill-color", "#2f2924", "important");
      el.style.setProperty("background", "none", "important");
      el.style.setProperty("background-image", "none", "important");
      el.style.setProperty("background-clip", "initial", "important");
      el.style.setProperty("-webkit-background-clip", "initial", "important");
      el.style.setProperty("text-shadow", "none", "important");
      el.style.setProperty("filter", "none", "important");
      el.style.setProperty("animation", "none", "important");
      el.style.setProperty("transform", "none", "important");
      el.style.setProperty("opacity", "1", "important");
      el.style.setProperty("line-height", "1.65", "important");
      el.style.setProperty("white-space", "pre-wrap", "important");
      el.style.setProperty("word-break", "break-word", "important");
      el.style.setProperty("overflow-wrap", "anywhere", "important");
    }

    function forceReadableInputStyle(el) {
      if (!el) return;

      App.clearEffectClasses(el);
      el.classList.add("effect-none");

      el.style.setProperty("color", "#2f2924", "important");
      el.style.setProperty("-webkit-text-fill-color", "#2f2924", "important");
      el.style.setProperty("background", "#ffffff", "important");
      el.style.setProperty("background-image", "none", "important");
      el.style.setProperty("background-clip", "initial", "important");
      el.style.setProperty("-webkit-background-clip", "initial", "important");
      el.style.setProperty("text-shadow", "none", "important");
      el.style.setProperty("filter", "none", "important");
      el.style.setProperty("animation", "none", "important");
      el.style.setProperty("opacity", "1", "important");
      el.style.setProperty("line-height", "1.65", "important");
    }

    App.fixRenderedGuestbookBodies = function fixRenderedGuestbookBodiesPatched(root = document) {
      [
        ...$$(".message-body", root),
        ...$$(".reply-body", root),
      ].forEach(forceReadableBodyStyle);
    };

    App.buildStyledBody = function buildStyledBodyPatched(content, fontKey = "", effectKey = "none", extraClass = "") {
      const normalizedFontKey = normalizeFontKey(fontKey || "");

      return `
        <div
          class="message-body ${extraClass} ${fontClassFromKey(normalizedFontKey)} effect-none mathner-readable-body"
          data-effect-stripped="true"
          style="${readableBodyInlineStyle()}"
        >${App.escapeHtmlPreserveText(content || "")}</div>
      `;
    };

    App.buildDiaryTitle = function buildDiaryTitlePatched(title, fontKey = "", effectKey = "none") {
      const normalizedFontKey = normalizeFontKey(fontKey || "");
      const normalizedEffectKey = normalizeEffectKey(effectKey || "none");

      return `
        <strong class="diary-entry-title ${fontClassFromKey(normalizedFontKey)} ${effectClassFromKey(normalizedEffectKey)}">
          ${App.escapeHtml(title || "")}
        </strong>
      `;
    };

    App.applyViewerWritingPreview = function applyViewerWritingPreviewPatched() {
      const contentFontKey = normalizeFontKey(
        state.viewerFontPref?.content_font_key ||
          state.viewerFontPref?.nickname_font_key ||
          getSelectedFontKey() ||
          ""
      );

      const titleFontKey = normalizeFontKey(
        state.viewerFontPref?.title_font_key ||
          state.viewerFontPref?.nickname_font_key ||
          getSelectedFontKey() ||
          ""
      );

      if (els.guestbookContentInput) {
        App.applyFontClass(els.guestbookContentInput, contentFontKey);
        App.applyFontEffect(els.guestbookContentInput, "none");
        forceReadableInputStyle(els.guestbookContentInput);
      }

      if (els.diaryContentInput) {
        App.applyFontClass(els.diaryContentInput, contentFontKey);
        App.applyFontEffect(els.diaryContentInput, "none");
        forceReadableInputStyle(els.diaryContentInput);
      }

      if (els.diaryTitleInput) {
        App.applyFontClass(els.diaryTitleInput, titleFontKey);
        App.applyFontEffect(els.diaryTitleInput, "none");
        forceReadableInputStyle(els.diaryTitleInput);
      }

      App.syncNicknameToolUI?.();
      App.applyNicknamePreviewToEditorCards?.();
      App.fixRenderedGuestbookBodies?.(els.guestbookList || document);
      App.fixRenderedGuestbookBodies?.(els.diaryList || document);
    };

    App.applyCurrentFontPreferenceToEditors = function applyCurrentFontPreferenceToEditorsPatched() {
      App.applyOwnerNicknameDisplay?.();
      App.applyViewerWritingPreview?.();
      App.applyNicknamePreviewToEditorCards?.();
    };

    /* =========================================================
       10. Guestbook / Diary style payload
       ========================================================= */

    function currentFallbackNicknameFontKey() {
      return normalizeFontKey(
        state.viewerFontPref?.nickname_font_key ||
          state.ownerFontPref?.nickname_font_key ||
          getSelectedFontKey() ||
          ""
      );
    }

    App.pickGuestbookStyle = function pickGuestbookStylePatched(record = {}) {
      const fallbackFontKey = currentFallbackNicknameFontKey();

      const nicknameFontKey = normalizeFontKey(
        record.nickname_font_key ||
          record.author_nickname_font_key ||
          record.author_font_key ||
          record.profile_font_key ||
          record.font_key ||
          fallbackFontKey ||
          ""
      );

      const nicknameEffectKey = normalizeEffectKey(
        record.nickname_effect_key ||
          record.author_nickname_effect_key ||
          record.author_effect_key ||
          record.profile_effect_key ||
          record.effect_key ||
          "none"
      );

      const contentFontKey = normalizeFontKey(
        record.content_font_key ||
          record.author_content_font_key ||
          record.writing_font_key ||
          record.body_font_key ||
          record.font_key ||
          nicknameFontKey ||
          ""
      );

      return {
        nicknameFontKey,
        nicknameEffectKey,
        nicknameScale: clampValue(
          record.nickname_scale ??
            record.author_nickname_scale ??
            record.profile_nickname_scale ??
            state.viewerFontPref?.nickname_scale ??
            App.DEFAULT_NICKNAME_SCALE,
          App.MIN_NICKNAME_SCALE,
          App.MAX_NICKNAME_SCALE,
          App.DEFAULT_NICKNAME_SCALE
        ),
        nicknameSpacing: clampValue(
          record.nickname_letter_spacing ??
            record.author_nickname_letter_spacing ??
            record.profile_nickname_letter_spacing ??
            state.viewerFontPref?.nickname_letter_spacing ??
            App.DEFAULT_NICKNAME_SPACING,
          App.MIN_NICKNAME_SPACING,
          App.MAX_NICKNAME_SPACING,
          App.DEFAULT_NICKNAME_SPACING
        ),
        contentFontKey,
        contentEffectKey: "none",
      };
    };

    App.pickDiaryStyle = function pickDiaryStylePatched(record = {}) {
      const fallbackFontKey = currentFallbackNicknameFontKey();

      const titleFontKey = normalizeFontKey(
        record.title_font_key ||
          record.nickname_font_key ||
          record.font_key ||
          fallbackFontKey ||
          ""
      );

      const titleEffectKey = normalizeEffectKey(
        record.title_effect_key ||
          record.nickname_effect_key ||
          record.effect_key ||
          "none"
      );

      const contentFontKey = normalizeFontKey(
        record.content_font_key ||
          record.body_font_key ||
          record.font_key ||
          titleFontKey ||
          ""
      );

      return {
        titleFontKey,
        titleEffectKey,
        contentFontKey,
        contentEffectKey: "none",
      };
    };

    App.buildGuestbookStylePayload = function buildGuestbookStylePayloadPatched(extra = {}) {
      const pref = state.viewerFontPref || {};
      const selectedFontKey = getSelectedFontKey();

      const nicknameFontKey = normalizeFontKey(
        pref.nickname_font_key ||
          state.ownerFontPref?.nickname_font_key ||
          selectedFontKey ||
          pref.font_key ||
          ""
      );

      const nicknameEffectKey = normalizeEffectKey(
        pref.nickname_effect_key ||
          state.ownerFontPref?.nickname_effect_key ||
          state.previewFont?.effectKey ||
          "none"
      );

      const contentFontKey = normalizeFontKey(
        pref.content_font_key ||
          pref.writing_font_key ||
          nicknameFontKey ||
          selectedFontKey ||
          ""
      );

      return {
        ...extra,
        nickname_font_key: nicknameFontKey,
        nickname_effect_key: nicknameEffectKey,
        nickname_scale: clampValue(
          pref.nickname_scale ?? App.DEFAULT_NICKNAME_SCALE,
          App.MIN_NICKNAME_SCALE,
          App.MAX_NICKNAME_SCALE,
          App.DEFAULT_NICKNAME_SCALE
        ),
        nickname_letter_spacing: clampValue(
          pref.nickname_letter_spacing ?? App.DEFAULT_NICKNAME_SPACING,
          App.MIN_NICKNAME_SPACING,
          App.MAX_NICKNAME_SPACING,
          App.DEFAULT_NICKNAME_SPACING
        ),
        content_font_key: contentFontKey,
        content_effect_key: "none",
      };
    };

    App.buildDiaryStylePayload = function buildDiaryStylePayloadPatched(extra = {}) {
      const pref = state.viewerFontPref || {};
      const selectedFontKey = getSelectedFontKey();

      const titleFontKey = normalizeFontKey(
        pref.title_font_key ||
          pref.nickname_font_key ||
          selectedFontKey ||
          pref.font_key ||
          ""
      );

      const titleEffectKey = normalizeEffectKey(
        pref.title_effect_key ||
          pref.nickname_effect_key ||
          state.previewFont?.effectKey ||
          "none"
      );

      const contentFontKey = normalizeFontKey(
        pref.content_font_key ||
          pref.nickname_font_key ||
          selectedFontKey ||
          pref.font_key ||
          ""
      );

      return {
        ...extra,
        title_font_key: titleFontKey,
        title_effect_key: titleEffectKey,
        content_font_key: contentFontKey,
        content_effect_key: "none",
      };
    };

    /* =========================================================
       11. Render font / effect inventory
       ========================================================= */

    App.renderFontInventory = function renderFontInventoryPatched(options = {}) {
      if (!els.fontInventoryWrap) return;

      const { preservePage = false } = options;
      const fontItems = (state.ownedItems || []).filter((item) => isFontLikeItemStrict(item));

      if (!fontItems.length) {
        els.fontInventoryWrap.innerHTML = `
          <div class="empty-text">
            아직 글씨체가 없어요.<br>
            아래 반짝이 효과만 골라도 기본 글씨체에 저장할 수 있어요.
          </div>
        `;

        state.selectedFontItemId = null;
        state.previewFont.itemId = null;
        state.previewFont.fontKey = "";

        if (!preservePage && typeof App.resetCarouselPage === "function") {
          App.resetCarouselPage("fontPage");
        }

        App.updateFontEffectCarousels?.();
        return;
      }

      const previewEffectKey = normalizeEffectKey(
        App.currentSelectedEffectKey?.() ||
          state.previewFont?.effectKey ||
          "none"
      );

      const previewStyle = App.getNicknamePreviewInlineStyle?.() || "";

      els.fontInventoryWrap.innerHTML = fontItems.map((item) => {
        const itemFontKey = normalizeFontKey(item.font_key || item.font_family_key || "");
        const isSelected = Number(state.selectedFontItemId) === Number(item.item_id);
        const previewEffectClass = isSelected ? effectClassFromKey(previewEffectKey) : "effect-none";

        return `
          <div class="font-inventory-card ${isSelected ? "is-selected" : ""}">
            <div class="font-preview-box">
              <div class="font-preview-text ${fontClassFromKey(itemFontKey)} ${previewEffectClass}" style="${previewStyle}">
                매스너!
              </div>
            </div>

            <div class="font-inventory-name" title="${App.escapeHtml(item.name || "")}">
              ${App.escapeHtml(item.name || "")}
            </div>

            <button
              type="button"
              class="font-card-select-btn ${isSelected ? "is-selected" : ""}"
              data-action="select-font-item"
              data-item-id="${App.escapeHtml(item.item_id)}"
            >
              ${isSelected ? "선택됨" : "선택"}
            </button>
          </div>
        `;
      }).join("");

      if (!preservePage && typeof App.resetCarouselPage === "function") {
        App.resetCarouselPage("fontPage");
      }

      App.updateFontEffectCarousels?.();
      App.applyNicknamePreviewToEditorCards?.(els.fontInventoryWrap);
    };

    App.renderEffectInventory = function renderEffectInventoryPatched(options = {}) {
      if (!els.effectInventoryWrap) return;

      const { preservePage = false } = options;

      App.mergeEffectInventoryFromOwnedItems?.();

      if (!state.ownedEffects.length) {
        els.effectInventoryWrap.innerHTML = `<div class="empty-text">아직 반짝이 효과가 없어요.</div>`;

        if (!preservePage && typeof App.resetCarouselPage === "function") {
          App.resetCarouselPage("effectPage");
        }

        App.updateFontEffectCarousels?.();
        return;
      }

      const selectedKey = normalizeEffectKey(
        App.currentSelectedEffectKey?.() ||
          state.previewFont?.effectKey ||
          "none"
      );

      const previewFontKey = getSelectedFontKey();
      const previewStyle = App.getNicknamePreviewInlineStyle?.() || "";

      els.effectInventoryWrap.innerHTML = state.ownedEffects.map((effect) => {
        const effectKey = normalizeEffectKey(effect.effect_key || effect.key || "none");
        const isSelected = effectKey === selectedKey;

        return `
          <div class="effect-inventory-card ${isSelected ? "is-selected" : ""}">
            <div class="font-preview-box">
              <div class="font-preview-text ${fontClassFromKey(previewFontKey)} ${effectClassFromKey(effectKey)}" style="${previewStyle}">
                매스너!
              </div>
            </div>

            <div class="font-inventory-name" title="${App.escapeHtml(effect.name || "")}">
              ${App.escapeHtml(effect.name || App.EFFECT_LABEL_MAP?.[effectKey] || effectKey)}
            </div>

            <button
              type="button"
              class="effect-card-select-btn ${isSelected ? "is-selected" : ""}"
              data-action="select-effect-item"
              data-effect-key="${App.escapeHtml(effectKey)}"
            >
              ${isSelected ? "선택됨" : "효과 넣기"}
            </button>
          </div>
        `;
      }).join("");

      if (!preservePage && typeof App.resetCarouselPage === "function") {
        App.resetCarouselPage("effectPage");
      }

      App.updateFontEffectCarousels?.();
      App.applyNicknamePreviewToEditorCards?.(els.effectInventoryWrap);
    };

    /* =========================================================
       12. Save font preference
       ========================================================= */

    App.buildLocalViewerFontPrefAfterApply = function buildLocalViewerFontPrefAfterApplyPatched(selectedItem, payload) {
      const safeSelectedItem = selectedItem && isFontLikeItemStrict(selectedItem) ? selectedItem : null;
      const fontKey = normalizeFontKey(safeSelectedItem?.font_key || safeSelectedItem?.font_family_key || "");
      const effectKey = normalizeEffectKey(payload.effect_key || "none");

      return {
        ...state.viewerFontPref,

        nickname_font_item_id: safeSelectedItem ? safeSelectedItem.item_id : null,
        nickname_font_key: fontKey,
        nickname_effect_key: effectKey,
        nickname_scale: Number(payload.nickname_scale ?? App.DEFAULT_NICKNAME_SCALE),
        nickname_letter_spacing: Number(payload.nickname_letter_spacing ?? App.DEFAULT_NICKNAME_SPACING),
        nickname_color: "#fff8ea",

        title_font_item_id: safeSelectedItem ? safeSelectedItem.item_id : null,
        title_font_key: fontKey,
        title_effect_key: effectKey,
        title_color: "#403932",

        content_font_item_id: safeSelectedItem ? safeSelectedItem.item_id : null,
        content_font_key: fontKey,
        content_effect_key: "none",
        content_color: "#403932",
      };
    };

    App.saveFontPreference = async function saveFontPreferencePatched() {
      if (!App.isOwner || !App.API?.avatarSaveFontUrl) return;

      const isReset = els.resetFontDefaultBtn?.dataset.resetMode === "true";

      const selectedCandidate = !isReset && state.selectedFontItemId
        ? App.itemByItemId?.(state.selectedFontItemId)
        : null;

      const selectedItem = selectedCandidate && isFontLikeItemStrict(selectedCandidate)
        ? selectedCandidate
        : null;

      if (selectedCandidate && !selectedItem) {
        state.selectedFontItemId = null;
        state.previewFont.itemId = null;
        state.previewFont.fontKey = "";
      }

      const currentFontPage = state.fontPage;
      const currentEffectPage = state.effectPage;

      const selectedEffectKey = isReset
        ? "none"
        : normalizeEffectKey(App.currentSelectedEffectKey?.() || state.previewFont?.effectKey || "none");

      const payload = {
        font_item_id: isReset || !selectedItem ? null : selectedItem.item_id,

        apply_to_nickname: true,
        apply_to_title: true,
        apply_to_content: true,

        nickname_color: "#fff8ea",
        title_color: "#403932",
        content_color: "#403932",

        effect_key: selectedEffectKey,

        nickname_scale: isReset
          ? App.DEFAULT_NICKNAME_SCALE
          : Number(state.previewFont?.nicknameScale ?? App.DEFAULT_NICKNAME_SCALE),

        nickname_letter_spacing: isReset
          ? App.DEFAULT_NICKNAME_SPACING
          : Number(state.previewFont?.nicknameLetterSpacing ?? App.DEFAULT_NICKNAME_SPACING),

        reset_default: isReset,
      };

      try {
        if (els.saveFontPreferenceBtn) {
          els.saveFontPreferenceBtn.disabled = true;
          els.saveFontPreferenceBtn.textContent = "저장 중...";
        }

        App.updateFontSaveHint?.("글씨체/효과 저장 중...");

        const result = await App.postJson(App.API.avatarSaveFontUrl, payload);

        if (!result.ok) {
          App.updateFontSaveHint?.(result.error || "글씨체/효과 저장에 실패했어요.", true);
          return;
        }

        if (isReset) {
          state.viewerFontPref = { ...App.EMPTY_FONT_PREF };
          state.ownerFontPref = { ...App.EMPTY_FONT_PREF };
          state.selectedFontItemId = null;
        } else {
          const localPref = App.buildLocalViewerFontPrefAfterApply(selectedItem, payload);
          const serverPref = result.font_pref || {};

          const finalFontKey = normalizeFontKey(
            serverPref.nickname_font_key ||
              localPref.nickname_font_key ||
              ""
          );

          state.viewerFontPref = {
            ...localPref,
            ...serverPref,

            nickname_font_key: finalFontKey,
            title_font_key: normalizeFontKey(serverPref.title_font_key || finalFontKey),
            content_font_key: normalizeFontKey(serverPref.content_font_key || finalFontKey),

            nickname_effect_key: normalizeEffectKey(serverPref.nickname_effect_key || selectedEffectKey),
            title_effect_key: normalizeEffectKey(serverPref.title_effect_key || serverPref.nickname_effect_key || selectedEffectKey),
            content_effect_key: "none",

            nickname_color: "#fff8ea",
            title_color: "#403932",
            content_color: "#403932",
          };

          state.ownerFontPref = { ...state.viewerFontPref };
          state.selectedFontItemId = selectedItem ? Number(selectedItem.item_id) : null;
        }

        state.previewFont = {
          itemId: state.selectedFontItemId,
          fontKey: isReset ? "" : getSelectedFontKey(),
          effectKey: state.viewerFontPref.nickname_effect_key || "none",
          nicknameScale: Number(state.viewerFontPref.nickname_scale ?? App.DEFAULT_NICKNAME_SCALE),
          nicknameLetterSpacing: Number(
            state.viewerFontPref.nickname_letter_spacing ?? App.DEFAULT_NICKNAME_SPACING
          ),
        };

        if (els.fontEffectSelect) {
          els.fontEffectSelect.value = state.viewerFontPref.nickname_effect_key || "none";
        }

        state.fontPage = currentFontPage;
        state.effectPage = currentEffectPage;

        sanitizeOwnedItems();

        App.applyCurrentFontPreferenceToEditors?.();
        App.renderCurrentEditSubtab?.();
        App.renderSetInventory?.();
        App.renderUniqueInventory?.();
        App.renderFontInventory?.({ preservePage: true });
        App.renderEffectInventory?.({ preservePage: true });
        App.updateFontEffectCarousels?.();

        App.updateFontSaveHint?.("글씨체/효과 저장 완료! ✨");

        if (els.resetFontDefaultBtn) {
          els.resetFontDefaultBtn.dataset.resetMode = "false";
        }
      } finally {
        if (els.saveFontPreferenceBtn) {
          els.saveFontPreferenceBtn.disabled = false;
          els.saveFontPreferenceBtn.textContent = "글씨체 저장하기";
        }
      }
    };

    /* =========================================================
       13. Render hooks
       ========================================================= */

    const originalLoadGuestbookEntries = App.loadGuestbookEntries?.bind(App);

    if (typeof originalLoadGuestbookEntries === "function") {
      App.loadGuestbookEntries = async function loadGuestbookEntriesPatched(...args) {
        const result = await originalLoadGuestbookEntries(...args);
        App.fixRenderedGuestbookBodies?.(els.guestbookList || document);
        return result;
      };
    }

    const originalRenderDiaryList = App.renderDiaryList?.bind(App);

    if (typeof originalRenderDiaryList === "function") {
      App.renderDiaryList = function renderDiaryListPatched(...args) {
        originalRenderDiaryList(...args);
        App.fixRenderedGuestbookBodies?.(els.diaryList || document);
      };
    }

    const originalHandleGuestbookAction = App.handleGuestbookAction?.bind(App);

    if (typeof originalHandleGuestbookAction === "function") {
      App.handleGuestbookAction = async function handleGuestbookActionPatched(event) {
        const result = await originalHandleGuestbookAction(event);

        const card = event?.target?.closest?.(".guestbook-entry-card");
        const textarea = card?.querySelector?.(".reply-textarea");

        if (textarea) {
          const contentFontKey = normalizeFontKey(
            state.viewerFontPref?.content_font_key ||
              state.viewerFontPref?.nickname_font_key ||
              getSelectedFontKey() ||
              ""
          );

          App.applyFontClass(textarea, contentFontKey);
          App.applyFontEffect(textarea, "none");
          forceReadableInputStyle(textarea);
        }

        App.fixRenderedGuestbookBodies?.(els.guestbookList || document);

        return result;
      };
    }

    /* =========================================================
       14. Initial
       ========================================================= */

    sanitizeOwnedItems();

    if (state.selectedFontItemId) {
      const selected = App.itemByItemId?.(state.selectedFontItemId);

      if (!selected || !isFontLikeItemStrict(selected)) {
        state.selectedFontItemId = null;
        state.previewFont.itemId = null;
        state.previewFont.fontKey = "";
      }
    }

    App.mergeEffectInventoryFromOwnedItems?.();
    App.applyOwnerNicknameDisplay?.();
    App.applyViewerWritingPreview?.();
    App.renderCurrentEditSubtab?.();
    App.renderSetInventory?.();
    App.renderUniqueInventory?.();
    App.renderFontInventory?.({ preservePage: true });
    App.renderEffectInventory?.({ preservePage: true });
    App.applyNicknamePreviewToEditorCards?.();
    App.fixRenderedGuestbookBodies?.(document);
  });
})();