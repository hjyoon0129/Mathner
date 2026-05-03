// static/shop/js/kids-shop-04-tabs-filters.js

(function () {
  "use strict";

  const S = window.MathnerShop;
  if (!S) return;

  function updateTabs() {
    S.els.mainTabs.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.mainTab === S.state.activeMainTab);
    });

    S.els.genderBtns.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.filter === S.state.activeGenderFilter);
    });

    S.els.typeBtns.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.filter === S.state.activeTypeFilter);
    });
  }

  function updateSections() {
    Object.keys(S.els.sections).forEach((key) => {
      const section = S.els.sections[key];
      if (!section) return;
      section.style.display = "none";
    });

    const activeSection = S.els.sections[S.state.activeMainTab] || S.els.sections.avatar;
    if (activeSection) activeSection.style.display = "block";

    const isAvatar = S.state.activeMainTab === "avatar";

    if (S.els.genderGroup) {
      S.els.genderGroup.style.display = isAvatar ? "flex" : "none";
    }

    if (S.els.typeGroup) {
      S.els.typeGroup.style.display = isAvatar ? "flex" : "none";
    }

    const titles = {
      avatar: "🛒 장바구니 (기본 옷)",
      set: "🛒 장바구니 (세트 옷)",
      unique: "🛒 장바구니 (스페셜)",
      font: "🛒 장바구니 (글씨체)",
      effect: "🛒 장바구니 (반짝이)"
    };

    if (S.els.summaryTitle) {
      S.els.summaryTitle.textContent = titles[S.state.activeMainTab] || "🛒 장바구니";
    }
  }

  function getCardSlot(card) {
    const slot = S.normalizeKey(card.dataset.itemSlot || "");
    const category = S.normalizeKey(card.dataset.itemCategory || "");
    const name = S.normalizeKey(card.dataset.itemName || "");

    if (slot) return slot;

    if (category === "profile_font") return "font";
    if (["head", "face", "avatar_face"].includes(category)) return "head";
    if (["eyes", "eye"].includes(category)) return "eyes";
    if (["mouth"].includes(category)) return "mouth";
    if (["eyebrow", "eyebrows"].includes(category)) return "eyebrow";
    if (["hair", "front_hair", "rear_hair", "avatar_hair"].includes(category)) return "hair";
    if (["body", "avatar_body"].includes(category)) return "body";
    if (["top", "avatar_top"].includes(category)) return "top";
    if (["cloth", "clothes", "outfit", "avatar_cloth"].includes(category)) return "cloth";
    if (["pants", "bottom", "bottoms", "avatar_pants"].includes(category)) return "pants";
    if (["shoes", "shoe", "avatar_shoes"].includes(category)) return "shoes";
    if (["hat", "cap", "avatar_hat"].includes(category)) return "hat";

    if (name.includes("hoodie") || name.includes("jacket") || name.includes("robe")) return "cloth";
    if (name.includes("후드") || name.includes("재킷") || name.includes("로브")) return "cloth";
    if (name.includes("pants")) return "pants";
    if (name.includes("shoe") || name.includes("boot")) return "shoes";
    if (name.includes("hat") || name.includes("crown") || name.includes("laurel")) return "hat";
    if (name.includes("월계관")) return "hat";

    return category || "cloth";
  }

  function matchTypeFilter(card) {
    const active = S.state.activeTypeFilter;
    const slot = getCardSlot(card);

    if (active === "all") return true;
    if (active === "face") return ["head", "face", "eyes", "mouth", "eyebrow"].includes(slot);
    if (active === "hair") return ["hair", "front_hair", "rear_hair"].includes(slot);

    return slot === active;
  }

  function matchGenderFilter(card) {
    const active = S.state.activeGenderFilter;
    if (active === "all") return true;

    const gender = String(card.dataset.itemGender || "common").toLowerCase().trim();
    return gender === active;
  }

  function applyFilters() {
    const avatarCards = document.querySelectorAll("#shopAvatarGrid .cute-item-card");

    avatarCards.forEach((card) => {
      const isFontCard = card.classList.contains("font-card");

      if (S.state.activeMainTab === "font") {
        card.style.display = isFontCard ? "flex" : "none";
        return;
      }

      if (S.state.activeMainTab === "avatar") {
        if (isFontCard) {
          card.style.display = "none";
          return;
        }

        const visible = matchGenderFilter(card) && matchTypeFilter(card);
        card.style.display = visible ? "flex" : "none";
        return;
      }

      card.style.display = "none";
    });
  }

  S.tabs = {
    updateTabs,
    updateSections,
    getCardSlot,
    matchTypeFilter,
    matchGenderFilter,
    applyFilters
  };
})();