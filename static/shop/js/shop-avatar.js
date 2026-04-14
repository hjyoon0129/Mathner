window.ShopApp = window.ShopApp || {};

window.ShopApp.avatar = {
  init() {
    const app = window.ShopApp;
    this.app = app;

    this.maleSection = app.els.maleSection;
    this.femaleSection = app.els.femaleSection;
    this.commonSection = app.els.commonSection;

    this.maleGrid = app.els.maleGrid;
    this.femaleGrid = app.els.femaleGrid;
    this.commonGrid = app.els.commonGrid;

    this.maleEmptyState = app.els.maleEmptyState;
    this.femaleEmptyState = app.els.femaleEmptyState;
    this.commonEmptyState = app.els.commonEmptyState;

    this.moveCardsToGenderSections();
    this.bindAvatarCards();
  },

  inferCardSlot(card) {
    const app = this.app;
    const explicitSlot = app.utils.normalizeSlot(card.dataset.itemSlot || "");
    if (explicitSlot) return explicitSlot;

    const category = String(card.dataset.itemCategory || "").toLowerCase();
    const name = String(card.dataset.itemName || "").toLowerCase();

    if (["avatar_face", "head", "face"].includes(category)) return "head";
    if (["avatar_hair", "front_hair", "rear_hair", "hair"].includes(category)) return "hair";
    if (["avatar_body", "body"].includes(category)) return "body";
    if (["avatar_top", "top"].includes(category)) return "top";
    if (["avatar_cloth", "cloth", "clothes", "outfit"].includes(category)) return "cloth";
    if (["avatar_pants", "pants", "bottom", "bottoms"].includes(category)) return "pants";
    if (["avatar_shoes", "shoes", "shoe"].includes(category)) return "shoes";
    if (["avatar_hat", "hat", "cap"].includes(category)) return "hat";
    if (["profile_font", "font"].includes(category)) return "font";
    if (["unique"].includes(category)) return "unique";

    if (name.includes("hoodie") || name.includes("jacket") || name.includes("coat")) return "cloth";
    if (name.includes("pants") || name.includes("skirt")) return "pants";
    if (name.includes("shoe") || name.includes("sneaker") || name.includes("boots")) return "shoes";
    if (name.includes("hat") || name.includes("cap") || name.includes("beanie")) return "hat";

    return "cloth";
  },

  inferCardGender(card) {
    const explicitGender = String(card.dataset.itemGender || "").toLowerCase().trim();
    const name = String(card.dataset.itemName || "").toLowerCase();
    const img = String(card.dataset.itemImage || "").toLowerCase();
    const slot = this.inferCardSlot(card);

    if (slot === "font") return "common";
    if (this.app.constants.COMMON_ITEM_NAMES.has(name)) return "common";

    if (["common", "unisex", "all"].includes(explicitGender)) return "common";
    if (["male", "m"].includes(explicitGender)) return "male";
    if (["female", "f"].includes(explicitGender)) return "female";

    if (name.includes("female") || img.includes("/female/")) return "female";
    if (name.includes("male") || img.includes("/male/")) return "male";

    if (["cloth", "top", "pants", "shoes", "hat"].includes(slot)) return "male";
    return "male";
  },

  isFaceSlot(slot) {
    return ["head", "eyes", "mouth", "eyebrow"].includes(slot);
  },

  isHairSlot(slot) {
    return ["front_hair", "rear_hair", "hair"].includes(slot);
  },

  matchesType(card) {
    const activeTypeFilter = this.app.state.activeTypeFilter;
    const slot = this.inferCardSlot(card);

    if (activeTypeFilter === "all") return true;
    if (activeTypeFilter === "face") return this.isFaceSlot(slot);
    if (activeTypeFilter === "hair") return this.isHairSlot(slot);
    if (activeTypeFilter === "body") return slot === "body";
    if (activeTypeFilter === "top") return slot === "top";
    if (activeTypeFilter === "cloth") return slot === "cloth";
    if (activeTypeFilter === "pants") return slot === "pants";
    if (activeTypeFilter === "shoes") return slot === "shoes";
    if (activeTypeFilter === "hat") return slot === "hat";
    return true;
  },

  matchesMainTab(card) {
    const slot = this.inferCardSlot(card);
    if (this.app.state.activeMainTab === "avatar") return slot !== "font" && slot !== "unique";
    if (this.app.state.activeMainTab === "font") return slot === "font";
    return false;
  },

  moveCardsToGenderSections() {
    const allCards = [...document.querySelectorAll(".shop-card:not(.shop-unique-card)")];
    allCards.forEach((card) => {
      const gender = this.inferCardGender(card);
      if (gender === "female") {
        this.femaleGrid.appendChild(card);
      } else if (gender === "common") {
        this.commonGrid.appendChild(card);
      } else {
        this.maleGrid.appendChild(card);
      }
    });
  },

  applyFilters() {
    const app = this.app;
    const maleCards = [...this.maleGrid.querySelectorAll(".shop-card")];
    const femaleCards = [...this.femaleGrid.querySelectorAll(".shop-card")];
    const commonCards = [...this.commonGrid.querySelectorAll(".shop-card")];

    let visibleMale = 0;
    let visibleFemale = 0;
    let visibleCommon = 0;

    maleCards.forEach((card) => {
      const visible =
        this.matchesMainTab(card) &&
        (app.state.activeMainTab === "font" ? false : (app.state.activeGenderFilter === "all" || app.state.activeGenderFilter === "male")) &&
        this.matchesType(card);

      card.style.display = visible ? "" : "none";
      if (visible) visibleMale += 1;
    });

    femaleCards.forEach((card) => {
      const visible =
        this.matchesMainTab(card) &&
        (app.state.activeMainTab === "font" ? false : (app.state.activeGenderFilter === "all" || app.state.activeGenderFilter === "female")) &&
        this.matchesType(card);

      card.style.display = visible ? "" : "none";
      if (visible) visibleFemale += 1;
    });

    commonCards.forEach((card) => {
      const visible =
        this.matchesMainTab(card) &&
        (app.state.activeMainTab === "font" ? true : (app.state.activeGenderFilter === "all" || app.state.activeGenderFilter === "common")) &&
        this.matchesType(card);

      card.style.display = visible ? "" : "none";
      if (visible) visibleCommon += 1;
    });

    if (app.state.activeMainTab === "font") {
      this.maleSection.style.display = "none";
      this.femaleSection.style.display = "none";
      this.commonSection.style.display = "";
      this.commonEmptyState.textContent = "No font items match this filter.";
    } else if (app.state.activeMainTab !== "avatar") {
      this.maleSection.style.display = "none";
      this.femaleSection.style.display = "none";
      this.commonSection.style.display = "none";
    } else if (app.state.activeGenderFilter === "male") {
      this.maleSection.style.display = "";
      this.femaleSection.style.display = "none";
      this.commonSection.style.display = "none";
      this.commonEmptyState.textContent = "No common items match this filter.";
    } else if (app.state.activeGenderFilter === "female") {
      this.maleSection.style.display = "none";
      this.femaleSection.style.display = "";
      this.commonSection.style.display = "none";
      this.commonEmptyState.textContent = "No common items match this filter.";
    } else if (app.state.activeGenderFilter === "common") {
      this.maleSection.style.display = "none";
      this.femaleSection.style.display = "none";
      this.commonSection.style.display = "";
      this.commonEmptyState.textContent = "No common items match this filter.";
    } else {
      this.maleSection.style.display = "";
      this.femaleSection.style.display = "";
      this.commonSection.style.display = "";
      this.commonEmptyState.textContent = "No common items match this filter.";
    }

    this.maleEmptyState.style.display = visibleMale === 0 ? "block" : "none";
    this.femaleEmptyState.style.display = visibleFemale === 0 ? "block" : "none";
    this.commonEmptyState.style.display = visibleCommon === 0 ? "block" : "none";
  },

  bindAvatarCards() {
    const app = this.app;

    document.querySelectorAll(".shop-card:not(.shop-unique-card)").forEach((card) => {
      const btn = card.querySelector(".shop-select-btn");
      if (!btn) return;

      btn.addEventListener("click", () => {
        const itemId = String(card.dataset.itemId || "");
        const ownedQty = Number(app.state.ownedMap[itemId] || 0);
        const isPremium = card.dataset.isPremium === "true";
        const slot = this.inferCardSlot(card);

        if (ownedQty > 0) return;

        if (slot === "font") {
          if (isPremium) {
            app.openPremiumModal();
            return;
          }
          card.classList.toggle("selected");
          app.updateSelectButtons();
          app.renderSummary();
          return;
        }

        if (app.state.activeMainTab !== "avatar") return;

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