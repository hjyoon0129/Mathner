window.ShopApp = window.ShopApp || {};

document.addEventListener("DOMContentLoaded", function () {
  const page = document.getElementById("shopPage");
  if (!page) return;

  const app = window.ShopApp;

  let ownedMap = {};
  let ownedEffectMap = {};

  try {
    ownedMap = JSON.parse(page.dataset.ownedMap || "{}");
  } catch (e) {
    ownedMap = {};
  }

  try {
    ownedEffectMap = JSON.parse(page.dataset.ownedEffectMap || "{}");
  } catch (e) {
    ownedEffectMap = {};
  }

  app.page = page;

  app.state = {
    ownedMap,
    ownedEffectMap,
    currentStars: Number(page.dataset.currentStars || 0),
    buyUrl: page.dataset.buyUrl || "",
    buyEffectsUrl: page.dataset.buyEffectsUrl || "",
    premiumUrl: page.dataset.premiumUrl || "/#pricing",
    isPremiumUser: String(page.dataset.isPremiumUser || "false") === "true",

    activeGenderFilter: "all",
    activeTypeFilter: "all",
    activeMainTab: "avatar",
  };

  app.els = {
    currentStarsEl: document.getElementById("shopCurrentStars"),
    summaryCountEl: document.getElementById("summaryCount"),
    summaryCostEl: document.getElementById("summaryCost"),
    summaryRemainEl: document.getElementById("summaryRemain"),
    summaryListEl: document.getElementById("summaryList"),
    summaryTitleEl: document.getElementById("summaryTitle"),
    buyBtn: document.getElementById("shopBuyBtn"),

    maleSection: document.getElementById("shopMaleSection"),
    femaleSection: document.getElementById("shopFemaleSection"),
    commonSection: document.getElementById("shopCommonSection"),
    commonSectionHeading: document.getElementById("shopCommonSectionHeading"),

    maleGrid: document.getElementById("shopMaleGrid"),
    femaleGrid: document.getElementById("shopFemaleGrid"),
    commonGrid: document.getElementById("shopCommonGrid"),

    maleEmptyState: document.getElementById("shopMaleEmptyState"),
    femaleEmptyState: document.getElementById("shopFemaleEmptyState"),
    commonEmptyState: document.getElementById("shopCommonEmptyState"),

    itemsSection: document.getElementById("shopItemsSection"),
    effectsSection: document.getElementById("shopEffectsSection"),
    setSection: document.getElementById("shopSetSection"),
    uniqueSection: document.getElementById("shopUniqueSection"),
    itemsSectionTitle: document.getElementById("shopItemsSectionTitle"),

    genderFilterGroup: document.getElementById("shopGenderFilterGroup"),
    typeFilterGroup: document.getElementById("shopTypeFilterGroup"),
    summaryCard: document.getElementById("shopSummaryCard"),

    premiumModal: document.getElementById("premiumModal"),
    premiumLaterBtn: document.getElementById("premiumLaterBtn"),
    premiumGoBtn: document.getElementById("premiumGoBtn"),
  };

  app.constants = {
    COMMON_ITEM_NAMES: new Set(["blue hoodie", "black hoodie", "red jacket"]),
  };

  app.utils = {
    normalizeKey(value) {
      return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/-/g, "_")
        .replace(/\s+/g, "_");
    },

    normalizeName(value) {
      return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
    },

    normalizeSlot(slot) {
      const s = String(slot || "").toLowerCase().trim();
      if (["front_hair", "hair_front", "hairfront", "fronthair"].includes(s)) return "front_hair";
      if (["rear_hair", "hair_rear", "hair_back", "hairrear", "hairback", "rearhair"].includes(s)) return "rear_hair";
      if (["eye", "eyes"].includes(s)) return "eyes";
      if (["eyebrow", "eyebrows"].includes(s)) return "eyebrow";
      if (["mouth", "lip", "lips"].includes(s)) return "mouth";
      if (["head", "face"].includes(s)) return "head";
      if (["clothes", "outfit"].includes(s)) return "cloth";
      if (["bottom", "bottoms"].includes(s)) return "pants";
      if (["shoe"].includes(s)) return "shoes";
      if (["cap"].includes(s)) return "hat";
      return s;
    },

    postJson(url, payload) {
      return fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": window.CSRF_TOKEN || "",
        },
        body: JSON.stringify(payload),
      }).then(async (res) => {
        const data = await res.json().catch(() => ({
          ok: false,
          error: "Invalid server response.",
        }));
        if (typeof data.ok === "undefined") data.ok = res.ok;
        return data;
      });
    },
  };

  app.openPremiumModal = function () {
    const modal = app.els.premiumModal;
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  };

  app.closePremiumModal = function () {
    const modal = app.els.premiumModal;
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  };

  app.getSelectedCards = function () {
    return [...document.querySelectorAll(".shop-card.selected, .shop-unique-card.selected")];
  };

  app.getSelectedEffectCards = function () {
    return [...document.querySelectorAll(".shop-effect-card.selected")];
  };

  app.updateFilterButtons = function () {
    document.querySelectorAll('[data-filter-group="gender"]').forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.filter === app.state.activeGenderFilter);
    });

    document.querySelectorAll('[data-filter-group="type"]').forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.filter === app.state.activeTypeFilter);
    });

    document.querySelectorAll("[data-main-tab]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.mainTab === app.state.activeMainTab);
    });
  };

  app.updateMainTabLayout = function () {
    const {
      itemsSection,
      effectsSection,
      setSection,
      uniqueSection,
      summaryCard,
      genderFilterGroup,
      typeFilterGroup,
      summaryTitleEl,
      buyBtn,
      itemsSectionTitle,
      commonSectionHeading,
    } = app.els;

    itemsSection.style.display = "none";
    effectsSection.style.display = "none";
    setSection.style.display = "none";
    uniqueSection.style.display = "none";

    if (app.state.activeMainTab === "effect") {
      effectsSection.style.display = "";
      summaryCard.style.display = "";
      genderFilterGroup.style.display = "none";
      typeFilterGroup.style.display = "none";
      summaryTitleEl.textContent = "Font Effect Summary";
      buyBtn.disabled = false;
      buyBtn.textContent = "Buy Selected Effects";
      return;
    }

    if (app.state.activeMainTab === "set") {
      setSection.style.display = "";
      summaryCard.style.display = "";
      genderFilterGroup.style.display = "none";
      typeFilterGroup.style.display = "none";
      summaryTitleEl.textContent = "Set Summary";
      buyBtn.disabled = true;
      buyBtn.textContent = "Coming Soon";
      return;
    }

    if (app.state.activeMainTab === "unique") {
      uniqueSection.style.display = "";
      summaryCard.style.display = "";
      genderFilterGroup.style.display = "none";
      typeFilterGroup.style.display = "none";
      summaryTitleEl.textContent = "Unique Summary";
      buyBtn.disabled = false;
      buyBtn.textContent = "Buy Unique Item";
      return;
    }

    itemsSection.style.display = "";
    summaryCard.style.display = "";

    if (app.state.activeMainTab === "font") {
      itemsSectionTitle.textContent = "Font Items";
      genderFilterGroup.style.display = "none";
      typeFilterGroup.style.display = "none";
      commonSectionHeading.textContent = "Font Items";
      summaryTitleEl.textContent = "Font Summary";
      buyBtn.disabled = false;
      buyBtn.textContent = "Buy Selected";
      return;
    }

    itemsSectionTitle.textContent = "Avatar Items";
    genderFilterGroup.style.display = "";
    typeFilterGroup.style.display = "";
    commonSectionHeading.textContent = "Common Items";
    summaryTitleEl.textContent = "Purchase Summary";
    buyBtn.disabled = false;
    buyBtn.textContent = "Buy Selected";
  };

  app.updateSelectButtons = function () {
    document.querySelectorAll(".shop-card").forEach((card) => {
      const itemId = String(card.dataset.itemId || "");
      const ownedQty = Number(app.state.ownedMap[itemId] || 0);
      const selectBtn = card.querySelector(".shop-select-btn");
      const isPremium = card.dataset.isPremium === "true";

      if (!selectBtn) return;

      card.classList.remove("is-owned");

      if (ownedQty > 0) {
        selectBtn.textContent = "Owned";
        selectBtn.disabled = true;
        card.classList.remove("selected");
        card.classList.add("is-owned");
        return;
      }

      if (isPremium) {
        selectBtn.disabled = false;
        selectBtn.textContent = "Premium Unlock";
        card.classList.remove("selected");
        return;
      }

      selectBtn.disabled = false;
      selectBtn.textContent = card.classList.contains("selected") ? "Selected" : "Select";
    });

    document.querySelectorAll(".shop-effect-card").forEach((card) => {
      const effectKey = app.utils.normalizeKey(card.dataset.effectId || "");
      const ownedQty = Number(app.state.ownedEffectMap[effectKey] || 0);
      const selectBtn = card.querySelector(".shop-effect-select-btn");
      const isPremium = card.dataset.isPremium === "true";

      if (!selectBtn) return;

      card.classList.remove("is-owned");

      if (ownedQty > 0) {
        selectBtn.textContent = "Owned";
        selectBtn.disabled = true;
        card.classList.remove("selected");
        card.classList.add("is-owned");
        return;
      }

      if (isPremium) {
        selectBtn.disabled = false;
        selectBtn.textContent = "Premium Unlock";
        card.classList.remove("selected");
        return;
      }

      selectBtn.disabled = false;
      selectBtn.textContent = card.classList.contains("selected") ? "Selected" : "Select";
    });
  };

  app.renderSummary = function () {
    const selectedCards = app.getSelectedCards();
    const selectedEffectCards = app.getSelectedEffectCards();

    let totalCost = 0;
    app.els.summaryListEl.innerHTML = "";

    if (app.state.activeMainTab === "set") {
      app.els.summaryCountEl.textContent = "0";
      app.els.summaryCostEl.textContent = "0";
      app.els.summaryRemainEl.textContent = app.state.currentStars;
      app.els.summaryListEl.innerHTML = `<div class="summary-empty">Set items are not available yet.</div>`;
      return;
    }

    if (app.state.activeMainTab === "unique") {
      if (!selectedCards.length) {
        app.els.summaryListEl.innerHTML = `<div class="summary-empty">No unique items selected.</div>`;
      } else {
        selectedCards.forEach((card) => {
          const name = card.dataset.itemName;
          const price = Number(card.dataset.itemPrice || 0);
          totalCost += price;

          const item = document.createElement("div");
          item.className = "summary-item";
          item.textContent = `${name} · ★ ${price}`;
          app.els.summaryListEl.appendChild(item);
        });
      }

      app.els.summaryCountEl.textContent = selectedCards.length;
      app.els.summaryCostEl.textContent = totalCost;
      app.els.summaryRemainEl.textContent = Math.max(0, app.state.currentStars - totalCost);
      return;
    }

    if (app.state.activeMainTab === "effect") {
      if (!selectedEffectCards.length) {
        app.els.summaryListEl.innerHTML = `<div class="summary-empty">No effects selected.</div>`;
      } else {
        selectedEffectCards.forEach((card) => {
          const name = card.dataset.effectName;
          const price = Number(card.dataset.effectPrice || 0);
          totalCost += price;

          const item = document.createElement("div");
          item.className = "summary-item";
          item.textContent = `${name} · ★ ${price}`;
          app.els.summaryListEl.appendChild(item);
        });
      }

      app.els.summaryCountEl.textContent = selectedEffectCards.length;
      app.els.summaryCostEl.textContent = totalCost;
      app.els.summaryRemainEl.textContent = Math.max(0, app.state.currentStars - totalCost);
      return;
    }

    if (!selectedCards.length) {
      app.els.summaryListEl.innerHTML = `<div class="summary-empty">No items selected.</div>`;
    } else {
      selectedCards.forEach((card) => {
        const name = card.dataset.itemName;
        const price = Number(card.dataset.itemPrice || 0);
        totalCost += price;

        const item = document.createElement("div");
        item.className = "summary-item";
        item.textContent = `${name} · ★ ${price}`;
        app.els.summaryListEl.appendChild(item);
      });
    }

    app.els.summaryCountEl.textContent = selectedCards.length;
    app.els.summaryCostEl.textContent = totalCost;
    app.els.summaryRemainEl.textContent = Math.max(0, app.state.currentStars - totalCost);
  };

  app.refreshView = function () {
    app.updateFilterButtons();
    app.updateMainTabLayout();
    app.avatar?.applyFilters?.();
    app.updateSelectButtons();
    app.renderSummary();
  };

  app.bindGlobalEvents = function () {
    document.querySelectorAll('[data-filter-group="gender"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        app.state.activeGenderFilter = btn.dataset.filter || "all";
        app.refreshView();
      });
    });

    document.querySelectorAll('[data-filter-group="type"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        app.state.activeTypeFilter = btn.dataset.filter || "all";
        app.refreshView();
      });
    });

    document.querySelectorAll("[data-main-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        app.state.activeMainTab = btn.dataset.mainTab || "avatar";

        if (app.state.activeMainTab === "font") {
          app.state.activeGenderFilter = "all";
          app.state.activeTypeFilter = "all";
        } else if (app.state.activeMainTab === "avatar") {
          app.state.activeTypeFilter = "all";
        }

        app.refreshView();
      });
    });

    app.els.buyBtn?.addEventListener("click", async () => {
      if (app.state.activeMainTab === "set") return;

      if (app.state.activeMainTab === "effect") {
        const selectedEffectCards = app.getSelectedEffectCards();
        if (!selectedEffectCards.length) {
          alert("Select at least one effect.");
          return;
        }

        const effectKeys = selectedEffectCards.map((card) => String(card.dataset.effectId));
        const result = await app.utils.postJson(app.state.buyEffectsUrl, { effect_keys: effectKeys });

        if (!result.ok) {
          if (result.already_owned && result.owned_effect_names?.length) {
            alert(`Already owned: ${result.owned_effect_names.join(", ")}`);
          } else {
            alert(result.error || "Effect purchase failed.");
          }
          return;
        }

        app.state.currentStars = Number(result.remaining_stars || 0);
        if (app.els.currentStarsEl) app.els.currentStarsEl.textContent = app.state.currentStars;

        (result.bought_effects || []).forEach((effect) => {
          app.state.ownedEffectMap[app.utils.normalizeKey(effect.effect_key)] = effect.quantity || 1;
        });

        document.querySelectorAll(".shop-effect-card.selected").forEach((card) => {
          card.classList.remove("selected");
        });

        app.updateSelectButtons();
        app.renderSummary();
        alert(`Effect purchase complete. Remaining Stars: ${app.state.currentStars}`);
        return;
      }

      const selectedCards = app.getSelectedCards();
      if (!selectedCards.length) {
        alert("Select at least one item.");
        return;
      }

      const itemIds = selectedCards.map((card) => Number(card.dataset.itemId));

      if (itemIds.some((id) => !id || id === 999999)) {
        alert("This unique item is preview only. Register the real item in DB first.");
        return;
      }

      const result = await app.utils.postJson(app.state.buyUrl, { item_ids: itemIds });

      if (!result.ok) {
        if (result.already_owned && result.owned_item_names?.length) {
          alert(`Already owned: ${result.owned_item_names.join(", ")}`);
        } else {
          alert(result.error || "Purchase failed.");
        }
        return;
      }

      app.state.currentStars = Number(result.remaining_stars || 0);
      if (app.els.currentStarsEl) app.els.currentStarsEl.textContent = app.state.currentStars;

      (result.bought_items || []).forEach((item) => {
        app.state.ownedMap[String(item.item_id)] = item.quantity || 1;
      });

      document.querySelectorAll(".shop-card.selected").forEach((card) => {
        card.classList.remove("selected");
      });

      app.updateSelectButtons();
      app.renderSummary();
      alert(`Purchase complete. Remaining Stars: ${app.state.currentStars}`);
    });

    app.els.premiumLaterBtn?.addEventListener("click", app.closePremiumModal);
    app.els.premiumGoBtn?.addEventListener("click", () => {
      window.location.href = app.state.premiumUrl;
    });

    app.els.premiumModal?.querySelectorAll("[data-premium-close]").forEach((el) => {
      el.addEventListener("click", app.closePremiumModal);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") app.closePremiumModal();
    });
  };

  app.avatar?.init?.();
  app.font?.init?.();
  app.setUnique?.init?.();
  app.bindGlobalEvents();
  app.refreshView();
});