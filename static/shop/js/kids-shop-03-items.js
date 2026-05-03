// static/shop/js/kids-shop-03-items.js

(function () {
  "use strict";

  const S = window.MathnerShop;
  if (!S) return;

  function localizeItemCardsOnly() {
    document.querySelectorAll(".cute-item-card").forEach((card) => {
      if (card.classList.contains("font-card")) return;
      if (card.classList.contains("effect-card")) return;

      const nameEl = card.querySelector(".item-name");
      if (!nameEl) return;

      const nextName = S.getItemDisplayName(card.dataset.itemName || nameEl.textContent);
      card.dataset.itemName = nextName;
      nameEl.textContent = nextName;
    });
  }

  function enhanceUniquePreviewAuras() {
    document.querySelectorAll("#shopUniqueSection .unique-thumb").forEach((thumb) => {
      if (thumb.dataset.auraReady === "true") return;
      thumb.dataset.auraReady = "true";

      const aura = document.createElement("div");
      aura.className = "shop-unique-preview-aura";

      const halo = document.createElement("span");
      halo.className = "shop-unique-preview-halo";
      aura.appendChild(halo);

      for (let i = 1; i <= 4; i += 1) {
        const spark = document.createElement("span");
        spark.className = `shop-unique-preview-spark spark-${i}`;
        aura.appendChild(spark);
      }

      for (let i = 1; i <= 3; i += 1) {
        const floatDot = document.createElement("span");
        floatDot.className = `shop-unique-preview-float float-${i}`;
        aura.appendChild(floatDot);
      }

      thumb.insertBefore(aura, thumb.firstChild);
    });
  }

  function setPremiumVisual(card, isPremium) {
    let badge = card.querySelector(".premium-badge");

    if (isPremium && !badge) {
      badge = document.createElement("span");
      badge.className = "premium-badge";
      badge.textContent = "PREMIUM";
      card.appendChild(badge);
    }

    card.dataset.isPremium = isPremium ? "true" : "false";
    card.classList.toggle("is-premium", isPremium);

    if (badge) {
      badge.hidden = !isPremium;
    }
  }

  function markPremiumState() {
    document.querySelectorAll(".cute-item-card").forEach((card) => {
      if (S.state.isPremiumUser) {
        setPremiumVisual(card, false);
        return;
      }

      const currentPremium = card.dataset.isPremium === "true";

      if (card.classList.contains("font-card")) {
        const fontKey = S.normalizeKey(S.fonts.getFontKeyFromCard(card));
        const canonical = S.getCanonicalFontKey(fontKey);
        setPremiumVisual(card, currentPremium || S.PREMIUM_FONT_KEYS.has(canonical) || S.PREMIUM_FONT_KEYS.has(fontKey));
        return;
      }

      if (card.classList.contains("effect-card")) {
        const effectKey = S.normalizeKey(card.dataset.effectId || "");
        setPremiumVisual(card, currentPremium || S.PREMIUM_EFFECT_KEYS.has(effectKey));
        return;
      }

      setPremiumVisual(card, currentPremium);
    });
  }

  function openPremiumModal() {
    if (!S.els.premiumModal) return;

    S.els.premiumModal.classList.add("is-open");
    S.els.premiumModal.style.display = "block";
    S.els.premiumModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closePremiumModal() {
    if (!S.els.premiumModal) return;

    S.els.premiumModal.classList.remove("is-open");
    S.els.premiumModal.style.display = "none";
    S.els.premiumModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function syncItemCardState(card) {
    if (!card) return;

    const btn = card.querySelector(".shop-select-btn, .shop-effect-select-btn");
    if (!btn) return;

    const isEffect = card.classList.contains("effect-card");
    const isPremium = card.dataset.isPremium === "true" && !S.state.isPremiumUser;

    const itemId = card.dataset.itemId;
    const effectId = card.dataset.effectId;

    const ownedQty = isEffect ? S.getOwnedEffectQty(effectId) : S.getOwnedQty(itemId);
    const selected = card.classList.contains("selected");

    btn.classList.remove("btn-owned", "btn-selected", "btn-premium", "btn-pink", "btn-yellow");
    btn.classList.add("btn-blue");

    card.classList.toggle("is-owned", ownedQty > 0);

    if (ownedQty > 0) {
      card.classList.remove("selected");
      btn.textContent = "보유중 ✔";
      btn.disabled = true;
      btn.setAttribute("aria-disabled", "true");
      btn.classList.remove("btn-blue");
      btn.classList.add("btn-owned");
      return;
    }

    btn.disabled = false;
    btn.removeAttribute("aria-disabled");

    if (isPremium) {
      card.classList.remove("selected");
      btn.textContent = "프리미엄 🔒";
      btn.classList.remove("btn-blue");
      btn.classList.add("btn-premium");
      return;
    }

    if (selected) {
      btn.textContent = "담김 🧺";
      btn.classList.remove("btn-blue");
      btn.classList.add("btn-selected");
      return;
    }

    btn.textContent = "담기";
  }

  function applyOwnedState() {
    document.querySelectorAll(".cute-item-card").forEach((card) => {
      syncItemCardState(card);
    });
  }

  function clearSelections() {
    document.querySelectorAll(".cute-item-card.selected").forEach((card) => {
      card.classList.remove("selected");
      syncItemCardState(card);
    });
  }

  S.items = {
    localizeItemCardsOnly,
    enhanceUniquePreviewAuras,
    setPremiumVisual,
    markPremiumState,
    openPremiumModal,
    closePremiumModal,
    syncItemCardState,
    applyOwnedState,
    clearSelections
  };
})();