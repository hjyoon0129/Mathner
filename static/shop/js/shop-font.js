window.ShopApp = window.ShopApp || {};

window.ShopApp.font = {
  REMOVED_FONT_KEYS: new Set([
    "modak",
    "luckiest_guy",
  ]),

  PREMIUM_FONT_KEYS: new Set([
    "delius_swash_caps",
    "mouse_memoirs",
    "londrina_shadow",
    "capriola",
    "mclaren",
    "cabin_sketch",
    "love_ya_like_a_sister",
    "life_savers",
  ]),

  PREMIUM_EFFECT_KEYS: new Set([
    "rainbow_flow",
    "sparkle",
    "float_wave",
    "fire_glow",
    "ice_glow",
  ]),

  EFFECT_CLASS_LIST: [
    "effect-none",
    "effect-neon-blue",
    "effect-rainbow-flow",
    "effect-gold-glow",
    "effect-sparkle",
    "effect-glitch",
    "effect-float-wave",
    "effect-fire-glow",
    "effect-ice-glow",
  ],

  FONT_CLASS_LIST: [
    "font-default",
    "font-gaegu",
    "font-dongle",
    "font-gowun_batang",
    "font-nanum_pen",
    "font-dokdo",
    "font-bubblegum_sans",
    "font-delius_swash_caps",
    "font-boogaloo",
    "font-love_ya_like_a_sister",
    "font-luckiest_guy",
    "font-coming_soon",
    "font-life_savers",
    "font-chewy",
    "font-cabin_sketch",
    "font-mouse_memoirs",
    "font-londrina_shadow",
    "font-modak",
    "font-amatic_sc",
    "font-capriola",
    "font-mclaren",
  ],

  init() {
    this.app = window.ShopApp;
    this.removeDisabledFonts();
    this.markPremiumState();
    this.bindFontPreview();
    this.bindEffectPreviewSelects();
    this.bindEffectCards();
  },

  isFontCard(card) {
    return String(card.dataset.itemCategory || "").toLowerCase() === "profile_font";
  },

  isRemovedFont(card) {
    if (!this.isFontCard(card)) return false;
    return this.REMOVED_FONT_KEYS.has(
      this.app.utils.normalizeKey(card.dataset.itemFontFamily || card.dataset.itemName || "")
    );
  },

  isPremiumFont(card) {
    if (!this.isFontCard(card)) return false;
    return this.PREMIUM_FONT_KEYS.has(
      this.app.utils.normalizeKey(card.dataset.itemFontFamily || "")
    );
  },

  isPremiumEffect(card) {
    return this.PREMIUM_EFFECT_KEYS.has(
      this.app.utils.normalizeKey(card.dataset.effectId || "")
    );
  },

  setPremiumState(card, premium) {
    const badge = card.querySelector(".shop-premium-badge");
    card.dataset.isPremium = premium ? "true" : "false";
    card.classList.toggle("is-premium", premium);
    if (badge) badge.hidden = !premium;
  },

  removeDisabledFonts() {
    document.querySelectorAll(".shop-card").forEach((card) => {
      if (!this.isFontCard(card)) return;
      if (this.isRemovedFont(card)) card.remove();
    });
  },

  markPremiumState() {
    const app = this.app;

    document.querySelectorAll(".shop-card").forEach((card) => {
      if (!this.isFontCard(card)) return;

      if (app.state.isPremiumUser) {
        this.setPremiumState(card, false);
        return;
      }

      this.setPremiumState(card, this.isPremiumFont(card));
    });

    document.querySelectorAll(".shop-effect-card").forEach((card) => {
      if (app.state.isPremiumUser) {
        this.setPremiumState(card, false);
        return;
      }

      this.setPremiumState(card, this.isPremiumEffect(card));
    });
  },

  clearEffectClasses(el) {
    if (!el) return;
    this.EFFECT_CLASS_LIST.forEach((cls) => el.classList.remove(cls));
  },

  clearFontClasses(el) {
    if (!el) return;
    this.FONT_CLASS_LIST.forEach((cls) => el.classList.remove(cls));
  },

  applyPreviewFont(target, fontKey) {
    if (!target) return;
    this.clearFontClasses(target);
    target.classList.add(`font-${String(fontKey || "default").trim()}`);
  },

  applyPreviewEffect(target, effectKey) {
    if (!target) return;
    this.clearEffectClasses(target);
    target.classList.add(`effect-${String(effectKey || "none").trim()}`);
  },

  syncFontCardPreview(card) {
    if (!card) return;
    const previewTarget = card.querySelector(".shop-font-preview-live");
    const effectSelect = card.querySelector(".shop-font-effect-select");
    if (!previewTarget || !effectSelect) return;

    this.applyPreviewFont(previewTarget, card.dataset.itemFontFamily || "default");
    this.applyPreviewEffect(previewTarget, effectSelect.value || "none");
  },

  syncEffectPreview(selectEl) {
    if (!selectEl) return;
    const effectKey = String(selectEl.dataset.effectPreview || "none").trim();
    const target = document.querySelector(`[data-effect-target="${effectKey}"]`);
    if (!target) return;

    this.applyPreviewFont(target, selectEl.value || "default");
    this.applyPreviewEffect(target, effectKey);
  },

  bindFontPreview() {
    document.querySelectorAll(".shop-font-effect-select").forEach((select) => {
      select.addEventListener("change", () => {
        const card = select.closest(".shop-card");
        this.syncFontCardPreview(card);
      });

      const card = select.closest(".shop-card");
      this.syncFontCardPreview(card);
    });
  },

  bindEffectPreviewSelects() {
    document.querySelectorAll(".shop-effect-preview-select[data-effect-preview]").forEach((selectEl) => {
      selectEl.addEventListener("change", () => this.syncEffectPreview(selectEl));
      this.syncEffectPreview(selectEl);
    });
  },

  bindEffectCards() {
    const app = this.app;

    document.querySelectorAll(".shop-effect-card").forEach((card) => {
      const btn = card.querySelector(".shop-effect-select-btn");
      if (!btn) return;

      btn.addEventListener("click", () => {
        const effectKey = app.utils.normalizeKey(card.dataset.effectId || "");
        const ownedQty = Number(app.state.ownedEffectMap[effectKey] || 0);
        const isPremium = card.dataset.isPremium === "true";

        if (ownedQty > 0) return;

        if (isPremium) {
          app.openPremiumModal();
          return;
        }

        card.classList.toggle("selected");
        app.updateSelectButtons();
        app.renderSummary();
      });
    });
  },
};