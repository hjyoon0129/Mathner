document.addEventListener("DOMContentLoaded", function () {
  const page = document.getElementById("shopPage");
  if (!page) return;

  let ownedMap = {};
  try {
    ownedMap = JSON.parse(page.dataset.ownedMap || "{}");
  } catch (e) {
    ownedMap = {};
  }

  let currentStars = Number(page.dataset.currentStars || 0);
  const buyUrl = page.dataset.buyUrl;

  const currentStarsEl = document.getElementById("shopCurrentStars");
  const summaryCountEl = document.getElementById("summaryCount");
  const summaryCostEl = document.getElementById("summaryCost");
  const summaryRemainEl = document.getElementById("summaryRemain");
  const summaryListEl = document.getElementById("summaryList");
  const buyBtn = document.getElementById("shopBuyBtn");

  const maleSection = document.getElementById("shopMaleSection");
  const femaleSection = document.getElementById("shopFemaleSection");
  const commonSection = document.getElementById("shopCommonSection");

  const maleGrid = document.getElementById("shopMaleGrid");
  const femaleGrid = document.getElementById("shopFemaleGrid");
  const commonGrid = document.getElementById("shopCommonGrid");

  const maleEmptyState = document.getElementById("shopMaleEmptyState");
  const femaleEmptyState = document.getElementById("shopFemaleEmptyState");
  const commonEmptyState = document.getElementById("shopCommonEmptyState");

  let activeGenderFilter = "all";
  let activeTypeFilter = "all";

  const COMMON_ITEM_NAMES = ["blue hoodie", "black hoodie", "red jacket"];

  function postJson(url, payload) {
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": window.CSRF_TOKEN || "",
      },
      body: JSON.stringify(payload),
    }).then((res) => res.json());
  }

  function updateOwnedLabels() {
    document.querySelectorAll("[data-owned-for]").forEach((el) => {
      const itemId = el.dataset.ownedFor;
      const qty = ownedMap[itemId] || 0;
      el.textContent = `Owned ${qty}`;
    });
  }

  function getSelectedCards() {
    return [...document.querySelectorAll(".shop-card.selected")];
  }

  function normalizeSlot(slot) {
    const s = String(slot || "").toLowerCase().trim();

    if (s === "front_hair" || s === "hair_front" || s === "hairfront" || s === "fronthair") return "front_hair";
    if (s === "rear_hair" || s === "hair_rear" || s === "hair_back" || s === "hairrear" || s === "hairback" || s === "rearhair") return "rear_hair";
    if (s === "eye" || s === "eyes") return "eyes";
    if (s === "eyebrow" || s === "eyebrows") return "eyebrow";
    if (s === "mouth" || s === "lip" || s === "lips") return "mouth";
    if (s === "head" || s === "face") return "head";
    if (s === "clothes" || s === "outfit") return "cloth";
    if (s === "bottom" || s === "bottoms") return "pants";
    if (s === "shoe") return "shoes";
    if (s === "cap") return "hat";
    return s;
  }

  function inferCardSlot(card) {
    const explicitSlot = normalizeSlot(card.dataset.itemSlot || "");
    if (explicitSlot) return explicitSlot;

    const category = String(card.dataset.itemCategory || "").toLowerCase();
    const name = String(card.dataset.itemName || "").toLowerCase();

    if (["head", "face"].includes(category)) return "head";
    if (["eyes", "eye"].includes(category)) return "eyes";
    if (["mouth"].includes(category)) return "mouth";
    if (["eyebrow", "eyebrows"].includes(category)) return "eyebrow";
    if (["front_hair"].includes(category)) return "front_hair";
    if (["rear_hair"].includes(category)) return "rear_hair";
    if (["hair"].includes(category)) return "front_hair";
    if (["body"].includes(category)) return "body";
    if (["top"].includes(category)) return "top";
    if (["cloth", "clothes", "outfit"].includes(category)) return "cloth";
    if (["pants", "bottom", "bottoms"].includes(category)) return "pants";
    if (["shoes", "shoe"].includes(category)) return "shoes";
    if (["hat", "cap"].includes(category)) return "hat";

    if (name.includes("hoodie") || name.includes("jacket") || name.includes("coat") || name.includes("uniform")) return "cloth";
    if (name.includes("pants") || name.includes("skirt")) return "pants";
    if (name.includes("shoe") || name.includes("sneaker") || name.includes("boots")) return "shoes";
    if (name.includes("hat") || name.includes("cap") || name.includes("beanie")) return "hat";

    return "cloth";
  }

  function inferCardGender(card) {
    const explicitGender = String(card.dataset.itemGender || "").toLowerCase().trim();
    const name = String(card.dataset.itemName || "").toLowerCase();
    const img = String(card.dataset.itemImage || "").toLowerCase();
    const slot = inferCardSlot(card);

    if (COMMON_ITEM_NAMES.includes(name)) return "common";
    if (explicitGender === "common" || explicitGender === "unisex" || explicitGender === "all") return "common";
    if (explicitGender === "male" || explicitGender === "m") return "male";
    if (explicitGender === "female" || explicitGender === "f") return "female";

    if (name.includes("female") || img.includes("/female/")) return "female";
    if (name.includes("male") || img.includes("/male/")) return "male";

    if (["cloth", "top", "pants", "shoes", "hat"].includes(slot)) {
      return "male";
    }

    return "male";
  }

  function isFaceSlot(slot) {
    return ["head", "eyes", "mouth", "eyebrow"].includes(slot);
  }

  function isHairSlot(slot) {
    return ["front_hair", "rear_hair"].includes(slot);
  }

  function matchesType(card) {
    const slot = inferCardSlot(card);

    if (activeTypeFilter === "all") return true;
    if (activeTypeFilter === "face") return isFaceSlot(slot);
    if (activeTypeFilter === "hair") return isHairSlot(slot);
    if (activeTypeFilter === "body") return slot === "body";
    if (activeTypeFilter === "top") return slot === "top";
    if (activeTypeFilter === "cloth") return slot === "cloth";
    if (activeTypeFilter === "pants") return slot === "pants";
    if (activeTypeFilter === "shoes") return slot === "shoes";
    if (activeTypeFilter === "hat") return slot === "hat";
    return true;
  }

  function updateFilterButtons() {
    document.querySelectorAll('[data-filter-group="gender"]').forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.filter === activeGenderFilter);
    });

    document.querySelectorAll('[data-filter-group="type"]').forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.filter === activeTypeFilter);
    });
  }

  function moveCardsToGenderSections() {
    const allCards = [...document.querySelectorAll(".shop-card")];

    allCards.forEach((card) => {
      const gender = inferCardGender(card);
      if (gender === "female") {
        femaleGrid.appendChild(card);
      } else if (gender === "common") {
        commonGrid.appendChild(card);
      } else {
        maleGrid.appendChild(card);
      }
    });
  }

  function applyFilters() {
    const maleCards = [...maleGrid.querySelectorAll(".shop-card")];
    const femaleCards = [...femaleGrid.querySelectorAll(".shop-card")];
    const commonCards = [...commonGrid.querySelectorAll(".shop-card")];

    let visibleMale = 0;
    let visibleFemale = 0;
    let visibleCommon = 0;

    maleCards.forEach((card) => {
      const visible = (activeGenderFilter === "all" || activeGenderFilter === "male") && matchesType(card);
      card.style.display = visible ? "" : "none";
      if (visible) visibleMale += 1;
    });

    femaleCards.forEach((card) => {
      const visible = (activeGenderFilter === "all" || activeGenderFilter === "female") && matchesType(card);
      card.style.display = visible ? "" : "none";
      if (visible) visibleFemale += 1;
    });

    commonCards.forEach((card) => {
      const visible = (activeGenderFilter === "all" || activeGenderFilter === "common") && matchesType(card);
      card.style.display = visible ? "" : "none";
      if (visible) visibleCommon += 1;
    });

    if (activeGenderFilter === "male") {
      maleSection.style.display = "";
      femaleSection.style.display = "none";
      commonSection.style.display = "none";
    } else if (activeGenderFilter === "female") {
      maleSection.style.display = "none";
      femaleSection.style.display = "";
      commonSection.style.display = "none";
    } else if (activeGenderFilter === "common") {
      maleSection.style.display = "none";
      femaleSection.style.display = "none";
      commonSection.style.display = "";
    } else {
      maleSection.style.display = "";
      femaleSection.style.display = "";
      commonSection.style.display = "";
    }

    maleEmptyState.style.display = visibleMale === 0 ? "block" : "none";
    femaleEmptyState.style.display = visibleFemale === 0 ? "block" : "none";
    commonEmptyState.style.display = visibleCommon === 0 ? "block" : "none";
  }

  function renderSummary() {
    const selectedCards = getSelectedCards();
    let totalCost = 0;

    summaryListEl.innerHTML = "";

    if (!selectedCards.length) {
      summaryListEl.innerHTML = `<div class="summary-empty">No items selected.</div>`;
    } else {
      selectedCards.forEach((card) => {
        const name = card.dataset.itemName;
        const price = Number(card.dataset.itemPrice || 0);
        totalCost += price;

        const item = document.createElement("div");
        item.className = "summary-item";
        item.textContent = `${name} · ★ ${price}`;
        summaryListEl.appendChild(item);
      });
    }

    summaryCountEl.textContent = selectedCards.length;
    summaryCostEl.textContent = totalCost;
    summaryRemainEl.textContent = Math.max(0, currentStars - totalCost);
  }

  document.querySelectorAll(".shop-card").forEach((card) => {
    const btn = card.querySelector(".shop-select-btn");
    btn.addEventListener("click", () => {
      card.classList.toggle("selected");
      renderSummary();
    });
  });

  document.querySelectorAll('[data-filter-group="gender"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      activeGenderFilter = btn.dataset.filter || "all";
      updateFilterButtons();
      applyFilters();
    });
  });

  document.querySelectorAll('[data-filter-group="type"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      activeTypeFilter = btn.dataset.filter || "all";
      updateFilterButtons();
      applyFilters();
    });
  });

  buyBtn.addEventListener("click", async () => {
    const selectedCards = getSelectedCards();
    if (!selectedCards.length) {
      alert("Select at least one item.");
      return;
    }

    const itemIds = selectedCards.map((card) => Number(card.dataset.itemId));
    const result = await postJson(buyUrl, { item_ids: itemIds });

    if (!result.ok) {
      alert(result.error || "Purchase failed.");
      return;
    }

    currentStars = Number(result.remaining_stars || 0);
    currentStarsEl.textContent = currentStars;

    result.bought_items.forEach((item) => {
      ownedMap[String(item.item_id)] = item.quantity;
    });

    document.querySelectorAll(".shop-card.selected").forEach((card) => {
      card.classList.remove("selected");
    });

    updateOwnedLabels();
    renderSummary();
    alert(`Purchase complete. Remaining Stars: ${currentStars}`);
  });

  moveCardsToGenderSections();
  updateOwnedLabels();
  updateFilterButtons();
  applyFilters();
  renderSummary();
});