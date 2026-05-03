// static/shop/js/kids-shop-06-events-init.js

(function () {
  "use strict";

  function bootShop() {
    const S = window.MathnerShop;

    if (!S) {
      console.error("[MathnerShop] kids-shop-00-core.js가 먼저 로드되지 않았어요.");
      return;
    }

    if (S.__booted === true) {
      console.warn("[MathnerShop] 이미 초기화되어 중복 실행을 막았어요.");
      return;
    }

    const requiredModules = ["fonts", "preview", "items", "tabs", "summary"];
    const missingModules = requiredModules.filter((name) => !S[name]);

    if (missingModules.length > 0) {
      console.error("[MathnerShop] 로드되지 않은 JS 모듈:", missingModules.join(", "));
      return;
    }

    S.__booted = true;

    function refreshView() {
      S.tabs.updateTabs();
      S.tabs.updateSections();

      S.items.localizeItemCardsOnly();
      S.fonts.localizeFontCards();

      S.preview.setupPreviewCards();
      S.tabs.applyFilters();

      S.items.markPremiumState();
      S.items.applyOwnedState();
      S.items.enhanceUniquePreviewAuras();

      S.preview.bindPreviewControls();
      S.summary.renderSummary();
    }

    function handleTabClick(btn) {
      const nextTab = btn.dataset.mainTab || "avatar";
      if (S.state.activeMainTab === nextTab) return;

      S.state.activeMainTab = nextTab;

      if (nextTab === "avatar") {
        S.state.activeTypeFilter = "all";
      }

      S.items.clearSelections();
      S.preview.closeAllCustomSelects();
      refreshView();
    }

    function handleFilterClick(btn) {
      const group = btn.dataset.filterGroup;
      const value = btn.dataset.filter || "all";

      if (group === "gender") {
        S.state.activeGenderFilter = value;
      }

      if (group === "type") {
        S.state.activeTypeFilter = value;
      }

      S.items.clearSelections();
      S.preview.closeAllCustomSelects();
      refreshView();
    }

    function handleCardButtonClick(btn) {
      if (btn.disabled || S.state.isBuying) return;

      const card = btn.closest(".cute-item-card");
      if (!card) return;

      const isEffect = card.classList.contains("effect-card");
      const ownedQty = isEffect
        ? S.getOwnedEffectQty(card.dataset.effectId)
        : S.getOwnedQty(card.dataset.itemId);

      if (ownedQty > 0) {
        card.classList.remove("selected");
        S.items.syncItemCardState(card);
        S.summary.renderSummary();
        return;
      }

      const isPremium = card.dataset.isPremium === "true" && !S.state.isPremiumUser;
      if (isPremium) {
        S.items.openPremiumModal();
        return;
      }

      card.classList.toggle("selected");
      S.items.syncItemCardState(card);
      S.summary.renderSummary();
    }

    function bindEvents() {
      S.els.mainTabs.forEach((btn) => {
        if (btn.dataset.shopTabBound === "true") return;
        btn.dataset.shopTabBound = "true";
        btn.addEventListener("click", () => handleTabClick(btn));
      });

      S.els.genderBtns.forEach((btn) => {
        if (btn.dataset.shopFilterBound === "true") return;
        btn.dataset.shopFilterBound = "true";
        btn.addEventListener("click", () => handleFilterClick(btn));
      });

      S.els.typeBtns.forEach((btn) => {
        if (btn.dataset.shopFilterBound === "true") return;
        btn.dataset.shopFilterBound = "true";
        btn.addEventListener("click", () => handleFilterClick(btn));
      });

      if (document.documentElement.dataset.shopGlobalClickBound !== "true") {
        document.documentElement.dataset.shopGlobalClickBound = "true";

        document.addEventListener("click", (event) => {
          const btn = event.target.closest(".shop-select-btn, .shop-effect-select-btn");

          if (btn) {
            event.preventDefault();
            handleCardButtonClick(btn);
            return;
          }

          if (!event.target.closest(".custom-select")) {
            S.preview.closeAllCustomSelects();
          }
        });

        document.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            S.items.closePremiumModal();
            S.preview.closeAllCustomSelects();
          }
        });
      }

      if (S.els.buyBtn && S.els.buyBtn.dataset.shopBuyBound !== "true") {
        S.els.buyBtn.dataset.shopBuyBound = "true";
        S.els.buyBtn.addEventListener("click", S.summary.handleBuyClick);
      }

      if (S.els.premiumLaterBtn && S.els.premiumLaterBtn.dataset.premiumLaterBound !== "true") {
        S.els.premiumLaterBtn.dataset.premiumLaterBound = "true";
        S.els.premiumLaterBtn.addEventListener("click", S.items.closePremiumModal);
      }

      if (S.els.premiumGoBtn && S.els.premiumGoBtn.dataset.premiumGoBound !== "true") {
        S.els.premiumGoBtn.dataset.premiumGoBound = "true";

        S.els.premiumGoBtn.addEventListener("click", () => {
          const pricingUrl = S.state.premiumUrl || "/#pricing";
          window.location.assign(pricingUrl);
        });
      }

      S.els.premiumModal?.querySelectorAll("[data-premium-close]").forEach((el) => {
        if (el.dataset.premiumCloseBound === "true") return;
        el.dataset.premiumCloseBound = "true";
        el.addEventListener("click", S.items.closePremiumModal);
      });
    }

    S.refreshView = refreshView;

    bindEvents();
    refreshView();

    console.log("[MathnerShop] split JS loaded successfully. MutationObserver disabled.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootShop);
  } else {
    bootShop();
  }
})();