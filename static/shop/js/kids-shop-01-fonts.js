// static/shop/js/kids-shop-01-fonts.js

(function () {
  "use strict";

  const S = window.MathnerShop;
  if (!S) return;

  function getFontKeyFromCard(card) {
    if (!card) return "default";

    if (card.dataset.itemFontFamily) {
      return S.getCanonicalFontKey(card.dataset.itemFontFamily);
    }

    const target = card.querySelector(
      ".font-preview, .shop-font-preview-live, .shop-preview-text, .effect-preview"
    );

    if (!target) return "default";

    const found = Array.from(target.classList).find((cls) => cls.startsWith("font-"));
    if (!found) return "default";

    return S.getCanonicalFontKey(found.replace(/^font-/, ""));
  }

  function getFontPreviewTarget(card) {
    if (!card) return null;

    let target = card.querySelector(".shop-font-preview-live");
    if (target) return target;

    target = card.querySelector(".font-preview");
    if (target) {
      target.classList.add("shop-font-preview-live", "shop-preview-text");
      return target;
    }

    return card.querySelector(".shop-preview-text");
  }

  function getEffectPreviewTarget(card) {
    if (!card) return null;

    let target = card.querySelector(".effect-preview");
    if (target) {
      target.classList.add("shop-preview-text");
      return target;
    }

    return card.querySelector(".shop-preview-text, [data-effect-target]");
  }

  function localizeFontCard(card) {
    if (!card || !card.classList.contains("font-card")) return;

    const fontKey = getFontKeyFromCard(card);
    const canonical = S.getCanonicalFontKey(fontKey);
    const koName = S.getKoreanFontName(canonical);

    card.dataset.itemFontFamily = canonical;
    card.dataset.itemName = koName;

    const nameEl = card.querySelector(".item-name");
    if (nameEl) {
      nameEl.textContent = koName;
    }

    const preview = getFontPreviewTarget(card);
    S.applyPreviewFont(preview, canonical);
  }

  function collectFontOptions() {
    const options = [["default", "기본"]];

    document.querySelectorAll(".font-card").forEach((card) => {
      const fontKey = getFontKeyFromCard(card);
      const canonical = S.getCanonicalFontKey(fontKey);
      const koName = S.getKoreanFontName(canonical);

      if (!options.some(([value]) => value === canonical)) {
        options.push([canonical, koName]);
      }
    });

    return options;
  }

  function localizeFontSelectOptions(select) {
    if (!select) return;

    Array.from(select.options).forEach((option) => {
      const canonical = S.getCanonicalFontKey(option.value);
      const koName = S.getKoreanFontName(canonical);

      option.value = canonical;
      option.textContent = koName;
    });
  }

  function localizeFontCards() {
    document.querySelectorAll(".font-card").forEach(localizeFontCard);
  }

  S.fonts = {
    getFontKeyFromCard,
    getFontPreviewTarget,
    getEffectPreviewTarget,
    localizeFontCard,
    collectFontOptions,
    localizeFontSelectOptions,
    localizeFontCards
  };
})();