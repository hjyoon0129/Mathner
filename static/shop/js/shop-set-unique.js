window.ShopApp = window.ShopApp || {};

window.ShopApp.setUnique = {
  init() {
    this.app = window.ShopApp;

    this.ensureState();
    this.bindCategoryTabs();
    this.bindCardButtons();
    this.bindUniqueHoverFX();
    this.decorateUniqueCards();

    this.applyInitialFilters();
    this.syncAllButtons();
    this.purgeOwnedSelections();
    this.refreshAppSummary();
  },

  ensureState() {
    const app = this.app;
    app.state = app.state || {};

    if (!app.state.activeSubTabs) {
      app.state.activeSubTabs = {
        set: "all",
        unique: "all",
      };
    } else {
      app.state.activeSubTabs.set = app.state.activeSubTabs.set || "all";
      app.state.activeSubTabs.unique = app.state.activeSubTabs.unique || "all";
    }
  },

  normalizeCategory(value) {
    const raw = String(value || "").trim().toLowerCase();

    if (!raw) return "all";
    if (raw === "robe") return "cloth";
    if (raw === "clothes") return "cloth";
    if (raw === "tops") return "cloth";
    if (raw === "top") return "cloth";
    if (raw === "bottom") return "pants";
    if (raw === "pant") return "pants";
    if (raw === "shoe") return "shoes";

    return raw;
  },

  inferCategoryFromName(name) {
    const value = String(name || "").trim().toLowerCase();

    if (!value) return "all";
    if (/(robe|cloak|cape|mantle|coat|outer)/.test(value)) return "cloth";
    if (/(pants|trouser|bottom)/.test(value)) return "pants";
    if (/(shoe|shoes|boot|boots|sneaker)/.test(value)) return "shoes";
    if (/(hat|cap|crown|laurel|halo|tiara|wreath)/.test(value)) return "hat";

    return "all";
  },

  getCardCategory(card) {
    if (!card) return "all";

    const explicitSlot =
      card.dataset.itemSlot ||
      card.dataset.equipSlot ||
      card.dataset.subcategory ||
      card.dataset.categorySlot ||
      "";

    const normalizedExplicit = this.normalizeCategory(explicitSlot);
    if (normalizedExplicit && normalizedExplicit !== "all") {
      return normalizedExplicit;
    }

    const category =
      card.dataset.subcategory ||
      card.dataset.category ||
      card.dataset.itemCategory ||
      card.dataset.itemType ||
      card.dataset.type ||
      "";

    const normalizedCategory = this.normalizeCategory(category);
    if (["cloth", "pants", "shoes", "hat"].includes(normalizedCategory)) {
      return normalizedCategory;
    }

    return this.inferCategoryFromName(card.dataset.itemName || "");
  },

  getScopeRoot(scope) {
    return document.querySelector(`[data-shop-scope="${scope}"]`);
  },

  getCards(scope) {
    const root = this.getScopeRoot(scope);
    if (!root) return [];
    return Array.from(root.querySelectorAll(".shop-set-card, .shop-unique-card"));
  },

  getAllCards() {
    return Array.from(document.querySelectorAll(".shop-set-card, .shop-unique-card"));
  },

  getTabButtons(scope) {
    const root = this.getScopeRoot(scope);
    if (!root) return [];
    return Array.from(root.querySelectorAll(".shop-subcat-btn"));
  },

  getCardButton(card) {
    if (!card) return null;
    return card.querySelector(".shop-select-btn, .shop-unique-select-btn");
  },

  getOwnedQty(itemId) {
    const key = String(itemId || "").trim();
    if (!key) return 0;

    if (typeof this.app.utils?.getOwnedQtyByItemId === "function") {
      return this.app.utils.getOwnedQtyByItemId(key);
    }

    const ownedMap = (this.app.state && this.app.state.ownedMap) || {};

    if (ownedMap[key] != null) {
      return Number(ownedMap[key] || 0);
    }

    const numKey = Number(key);
    if (!Number.isNaN(numKey) && ownedMap[numKey] != null) {
      return Number(ownedMap[numKey] || 0);
    }

    return 0;
  },

  isOwned(card) {
    if (!card) return false;
    const itemId = String(card.dataset.itemId || "");
    return this.getOwnedQty(itemId) > 0;
  },

  bindCategoryTabs() {
    ["set", "unique"].forEach((scope) => {
      const buttons = this.getTabButtons(scope);

      buttons.forEach((btn) => {
        if (btn.dataset.boundSubcat === "true") return;
        btn.dataset.boundSubcat = "true";

        btn.addEventListener("click", () => {
          const category = this.normalizeCategory(
            btn.dataset.subcat || btn.dataset.category || btn.textContent
          );

          this.app.state.activeSubTabs[scope] = category;
          this.updateTabButtons(scope);
          this.applyFilter(scope);
        });
      });

      this.updateTabButtons(scope);
    });
  },

  updateTabButtons(scope) {
    const active = this.normalizeCategory(this.app.state.activeSubTabs[scope] || "all");

    this.getTabButtons(scope).forEach((btn) => {
      const category = this.normalizeCategory(
        btn.dataset.subcat || btn.dataset.category || btn.textContent
      );

      btn.classList.toggle("active", category === active);
    });
  },

  applyFilter(scope) {
    const active = this.normalizeCategory(this.app.state.activeSubTabs[scope] || "all");
    const cards = this.getCards(scope);

    cards.forEach((card) => {
      const cardCategory = this.getCardCategory(card);
      const visible = active === "all" || cardCategory === active;

      card.classList.toggle("is-hidden-by-subcat", !visible);
      card.style.display = visible ? "" : "none";
    });

    this.updateEmptyState(scope);
    this.syncAllButtons();
  },

  applyInitialFilters() {
    this.applyFilter("set");
    this.applyFilter("unique");
  },

  updateEmptyState(scope) {
    const root = this.getScopeRoot(scope);
    if (!root) return;

    const cards = this.getCards(scope);
    const visibleCards = cards.filter((card) => card.style.display !== "none");

    let emptyBox = root.querySelector(".shop-subcat-empty");

    if (!emptyBox) {
      emptyBox = document.createElement("div");
      emptyBox.className = "shop-subcat-empty";
      emptyBox.innerHTML = `
        <div class="shop-subcat-empty-icon">✦</div>
        <div class="shop-subcat-empty-title">No items in this category</div>
        <div class="shop-subcat-empty-text">Items for this subcategory will appear here.</div>
      `;
      const grid = root.querySelector(".shop-set-grid, .shop-unique-grid");
      if (grid && grid.parentNode) {
        grid.parentNode.insertBefore(emptyBox, grid.nextSibling);
      }
    }

    emptyBox.style.display = visibleCards.length ? "none" : "grid";
  },

  decorateUniqueCards() {
    document.querySelectorAll(".shop-unique-card").forEach((card) => {
      if (card.querySelector(".shop-unique-float-particles")) return;

      const thumb = card.querySelector(".shop-unique-thumb");
      if (!thumb) return;

      const particleLayer = document.createElement("div");
      particleLayer.className = "shop-unique-float-particles";
      particleLayer.innerHTML = `
        <span class="unique-float-dot dot-1"></span>
        <span class="unique-float-dot dot-2"></span>
        <span class="unique-float-dot dot-3"></span>
        <span class="unique-float-dot dot-4"></span>
        <span class="unique-float-dot dot-5"></span>
      `;

      thumb.appendChild(particleLayer);
    });
  },

  bindUniqueHoverFX() {
    document.querySelectorAll(".shop-unique-card").forEach((card) => {
      const thumb = card.querySelector(".shop-unique-thumb");
      if (!thumb) return;

      if (card.dataset.boundHover === "true") return;
      card.dataset.boundHover = "true";

      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const rx = ((y / rect.height) - 0.5) * -5;
        const ry = ((x / rect.width) - 0.5) * 7;

        card.style.setProperty("--ux", `${x}px`);
        card.style.setProperty("--uy", `${y}px`);
        card.style.setProperty("--tilt-x", `${rx.toFixed(2)}deg`);
        card.style.setProperty("--tilt-y", `${ry.toFixed(2)}deg`);
      });

      card.addEventListener("mouseleave", () => {
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
      });
    });
  },

  bindCardButtons() {
    this.getAllCards().forEach((card) => {
      const btn = this.getCardButton(card);
      if (!btn || btn.dataset.bound === "true") return;

      btn.dataset.bound = "true";

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleCardClick(card);
      });
    });
  },

  handleCardClick(card) {
    if (!card) return;

    if (this.isOwned(card)) {
      card.classList.remove("selected");
      this.syncCardButton(card);
      this.refreshAppSummary();
      return;
    }

    const btn = this.getCardButton(card);
    if (btn && btn.disabled) return;

    card.classList.toggle("selected");

    if (card.classList.contains("selected") && card.classList.contains("shop-unique-card")) {
      this.spawnSelectBurst(card);
    }

    this.syncCardButton(card);
    this.refreshAppSummary();
  },

  syncCardButton(card) {
    if (!card) return;

    if (typeof this.app.applyOwnedStateToItemCard === "function") {
      this.app.applyOwnedStateToItemCard(card);
      return;
    }

    const btn = this.getCardButton(card);
    if (!btn) return;

    const owned = this.isOwned(card);
    const selected = card.classList.contains("selected");

    btn.classList.remove("is-owned", "is-selected");
    card.classList.remove("is-owned");

    if (owned) {
      card.classList.remove("selected");
      card.classList.add("is-owned");
      btn.textContent = "Owned";
      btn.disabled = true;
      btn.classList.add("is-owned");
      btn.setAttribute("aria-disabled", "true");
      return;
    }

    btn.disabled = false;
    btn.removeAttribute("aria-disabled");

    if (selected) {
      btn.textContent = "Selected";
      btn.classList.add("is-selected");
    } else {
      btn.textContent = "Select";
    }
  },

  syncAllButtons() {
    this.getAllCards().forEach((card) => {
      this.syncCardButton(card);
    });
  },

  purgeOwnedSelections() {
    this.getAllCards().forEach((card) => {
      if (this.isOwned(card)) {
        card.classList.remove("selected");
      }
    });
  },

  refreshAppSummary() {
    this.purgeOwnedSelections();
    this.syncAllButtons();

    if (typeof this.app.updateSelectButtons === "function") {
      this.app.updateSelectButtons();
    }

    if (typeof this.app.renderSummary === "function") {
      this.app.renderSummary();
    }

    this.forceCleanSummaryList();
  },

  forceCleanSummaryList() {
    const summaryList = document.getElementById("summaryList");
    const summaryCount = document.getElementById("summaryCount");

    if (!summaryList) return;

    const ownedNames = new Set(
      this.getAllCards()
        .filter((card) => this.isOwned(card))
        .map((card) => String(card.dataset.itemName || "").trim())
        .filter(Boolean)
    );

    Array.from(summaryList.children).forEach((node) => {
      const text = (node.textContent || "").trim();
      if (!text) return;

      for (const ownedName of ownedNames) {
        if (text.includes(ownedName)) {
          node.remove();
          break;
        }
      }
    });

    const remainingItems = Array.from(summaryList.children).filter(
      (node) => !node.classList.contains("summary-empty")
    );

    if (remainingItems.length === 0) {
      summaryList.innerHTML = `<div class="summary-empty">No items selected.</div>`;
      if (summaryCount) summaryCount.textContent = "0";
    }
  },

  spawnSelectBurst(card) {
    const thumb = card.querySelector(".shop-unique-thumb");
    if (!thumb) return;

    const oldBurst = thumb.querySelector(".shop-unique-select-burst");
    if (oldBurst) oldBurst.remove();

    const burst = document.createElement("div");
    burst.className = "shop-unique-select-burst";
    burst.innerHTML = `
      <span class="burst-line line-1"></span>
      <span class="burst-line line-2"></span>
      <span class="burst-line line-3"></span>
      <span class="burst-line line-4"></span>
      <span class="burst-line line-5"></span>
      <span class="burst-line line-6"></span>
    `;
    thumb.appendChild(burst);

    setTimeout(() => {
      burst.remove();
    }, 900);
  },
};

document.addEventListener("DOMContentLoaded", () => {
  if (window.ShopApp && window.ShopApp.setUnique) {
    window.ShopApp.setUnique.init();
  }
});