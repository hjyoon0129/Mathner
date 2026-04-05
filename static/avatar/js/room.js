document.addEventListener("DOMContentLoaded", function () {
  const page = document.getElementById("avatarPage");
  if (!page) return;

  const isOwner = page.dataset.isOwner === "true";

  const avatarCanvasView = document.getElementById("avatarCanvasView");
  const inventoryWrap = document.getElementById("inventoryWrap");
  const saveAvatarChangesBtn = document.getElementById("saveAvatarChangesBtn");
  const resetAvatarBtn = document.getElementById("resetAvatarBtn");
  const saveHint = document.getElementById("saveHint");

  const avatarLayout = document.getElementById("avatarLayout");
  const closeEditDrawerBtn = document.getElementById("closeEditDrawerBtn");

  const stageCardBody = document.getElementById("avatarStageCardBody");
  const stageContentCard = document.getElementById("avatarStageContentCard");
  const mobileTabPaneCard = document.getElementById("mobileTabPaneCard");
  const mobileTabPaneMount = document.getElementById("mobileTabPaneMount");

  const guestbookCreateUrl = page.dataset.guestbookCreateUrl;
  const diaryCreateUrl = page.dataset.diaryCreateUrl;
  const avatarSaveUrl = page.dataset.avatarSaveUrl;
  const avatarResetUrl = page.dataset.avatarResetUrl;
  const friendAvatarBase = page.dataset.friendAvatarBase;
  const myRoomUrl = page.dataset.myRoomUrl || "/avatar/my-room/";

  const socialFriendRequestUrlBase = page.dataset.socialFriendRequestUrlBase || "/social/api/friends/request/";
  const socialFriendRespondUrlBase = page.dataset.socialFriendRespondUrlBase || "/social/api/friends/respond/";
  const socialFriendRequestsUrl = page.dataset.socialFriendRequestsUrl || "";
  const socialFriendListUrl = page.dataset.socialFriendListUrl || "";
  const socialRoomListUrl = page.dataset.socialRoomListUrl || "";
  const socialRoomStatsUrlBase = page.dataset.socialRoomStatsUrlBase || "/social/api/rooms/";
  const socialRoomVisitUrlBase = page.dataset.socialRoomVisitUrlBase || "/social/api/rooms/";
  const socialRoomLikeUrlBase = page.dataset.socialRoomLikeUrlBase || "/social/api/rooms/";

  const confirmModal = document.getElementById("confirmModal");
  const confirmOkBtn = document.getElementById("confirmOkBtn");
  const confirmCancelBtn = document.getElementById("confirmCancelBtn");

  const tabAvatar = document.getElementById("tab-avatar");
  const tabGuestbook = document.getElementById("tab-guestbook");
  const tabDiary = document.getElementById("tab-diary");

  let avatar = {};
  let ownedItems = [];
  let draftAvatar = {};
  let isSaving = false;

  let activeInventoryGenderFilter = "all";
  let activeInventoryTypeFilter = "all";
  let currentSearchQuery = "";
  let currentMainTab = "avatar";

  const COMMON_ITEM_NAMES = ["blue hoodie", "black hoodie", "red jacket"];

  try {
    avatar = JSON.parse(page.dataset.avatarJson || "{}");
  } catch (e) {
    console.error("avatarJson parse error:", e);
    avatar = {};
  }

  try {
    ownedItems = JSON.parse(page.dataset.ownedAvatarItemJson || "[]");
  } catch (e) {
    console.error("ownedAvatarItemJson parse error:", e);
    ownedItems = [];
  }

  function isMobileRoomUI() {
    return window.matchMedia("(max-width: 768px)").matches;
  }

  function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj || {}));
  }

  function updateSaveHint(text) {
    if (saveHint) saveHint.textContent = text || "";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function forceWebp(url) {
    if (!url) return "";
    const cleanUrl = String(url).trim();
    if (!cleanUrl) return "";

    const parts = cleanUrl.split("?");
    const pathOnly = parts[0];
    const query = parts.length > 1 ? `?${parts.slice(1).join("?")}` : "";

    if (/\.webp$/i.test(pathOnly)) return `${pathOnly}${query}`;
    if (/\.(png|jpg|jpeg|gif)$/i.test(pathOnly)) {
      return `${pathOnly.replace(/\.(png|jpg|jpeg|gif)$/i, ".webp")}${query}`;
    }
    return `${pathOnly}${query}`;
  }

  function getDisplayName(item) {
    if (!item) return "Player";
    return String(
      item.display_name ||
      item.nickname ||
      item.current_nickname ||
      item.author_display_name ||
      item.from_display_name ||
      item.owner_display_name ||
      item.profile_nickname ||
      item.username ||
      item.from_username ||
      item.owner_username ||
      item.author_username ||
      "Player"
    );
  }

  function getUsername(item) {
    if (!item) return "";
    return String(
      item.username ||
      item.from_username ||
      item.owner_username ||
      item.author_username ||
      ""
    );
  }

  function syncNavbarNickname() {
    const ownerDisplayName =
      page.dataset.ownerDisplayName ||
      page.dataset.avatarOwnerDisplayName ||
      page.dataset.displayName ||
      "";

    if (!ownerDisplayName) return;

    const possibleTargets = [
      document.getElementById("navbarNickname"),
      document.getElementById("navNickname"),
      document.getElementById("headerNickname"),
      document.getElementById("userDisplayName"),
      document.getElementById("currentUserDisplayName"),
      document.querySelector(".navbar .user-name"),
      document.querySelector(".navbar .username"),
      document.querySelector(".navbar .nickname"),
      document.querySelector(".site-header .user-name"),
      document.querySelector(".site-header .username"),
      document.querySelector(".site-header .nickname"),
      document.querySelector(".nav-user-trigger"),
      document.querySelector(".user-menu-trigger"),
      document.querySelector(".account-dropdown-toggle"),
      document.querySelector(".profile-dropdown-toggle")
    ].filter(Boolean);

    possibleTargets.forEach((el) => {
      if (!el) return;
      const hasChildren = el.children && el.children.length > 0;
      if (!hasChildren) {
        el.textContent = ownerDisplayName;
      }
    });
  }

  function syncOwnerNickname() {
    const ownerDisplayName =
      page.dataset.ownerDisplayName ||
      page.dataset.avatarOwnerDisplayName ||
      page.dataset.displayName ||
      page.dataset.avatarOwner ||
      "";

    const ownerUsername =
      page.dataset.avatarOwnerUsername ||
      page.dataset.avatarOwner ||
      "";

    const ownerNameTargets = [
      document.getElementById("roomOwnerName"),
      document.getElementById("ownerDisplayName"),
      document.getElementById("ownerNickname"),
      document.getElementById("avatarOwnerName"),
    ].filter(Boolean);

    ownerNameTargets.forEach((el) => {
      el.textContent = ownerDisplayName || ownerUsername || "Player";
    });

    const ownerUsernameTargets = [
      document.getElementById("roomOwnerUsername"),
      document.getElementById("ownerUsername"),
      document.getElementById("avatarOwnerUsername"),
    ].filter(Boolean);

    ownerUsernameTargets.forEach((el) => {
      el.textContent = ownerUsername ? `@${ownerUsername}` : "";
    });

    syncNavbarNickname();
  }

  function avatarBaseSet(gender) {
    if (gender === "female") {
      return {
        body: forceWebp(page.dataset.baseBodyFemale || ""),
        head: forceWebp(page.dataset.baseHeadFemale || ""),
        rear_hair: forceWebp(page.dataset.baseHairBackFemale || ""),
        front_hair: forceWebp(page.dataset.baseHairFrontFemale || ""),
        eyes: forceWebp(page.dataset.baseEyesFemale || ""),
        eyebrow: forceWebp(page.dataset.baseEyebrowFemale || ""),
        mouth: forceWebp(page.dataset.baseMouthFemale || ""),
      };
    }

    return {
      body: forceWebp(page.dataset.baseBodyMale || ""),
      head: forceWebp(page.dataset.baseHeadMale || ""),
      rear_hair: forceWebp(page.dataset.baseHairBackMale || ""),
      front_hair: forceWebp(page.dataset.baseHairFrontMale || ""),
      eyes: forceWebp(page.dataset.baseEyesMale || ""),
      eyebrow: forceWebp(page.dataset.baseEyebrowMale || ""),
      mouth: forceWebp(page.dataset.baseMouthMale || ""),
    };
  }

  function normalizeSlotName(slot) {
    const s = String(slot || "").toLowerCase().trim();

    if (s === "front_hair" || s === "hair_front" || s === "hairfront" || s === "fronthair") return "front_hair";
    if (s === "rear_hair" || s === "hair_rear" || s === "hair_back" || s === "hairrear" || s === "hairback" || s === "rearhair") return "rear_hair";
    if (s === "eye" || s === "eyes") return "eyes";
    if (s === "eyebrow" || s === "eyebrows" || s === "brow" || s === "brows") return "eyebrow";
    if (s === "mouth" || s === "lip" || s === "lips") return "mouth";
    if (s === "head" || s === "face") return "head";
    if (s === "body") return "body";
    if (s === "top") return "top";
    if (s === "cloth" || s === "clothes" || s === "outfit") return "cloth";
    if (s === "pants" || s === "bottom" || s === "bottoms") return "pants";
    if (s === "shoes" || s === "shoe") return "shoes";
    if (s === "hat" || s === "cap") return "hat";
    return s;
  }

  function getDraftKeyBySlot(slot) {
    return `${normalizeSlotName(slot)}_item_id`;
  }

  function itemByItemId(itemId) {
    return ownedItems.find((item) => Number(item.item_id) === Number(itemId)) || null;
  }

  function equippedItem(slot) {
    const key = `${normalizeSlotName(slot)}_item_id`;
    return itemByItemId(draftAvatar[key]);
  }

  function normalizeItemImageUrl(item) {
    if (!item || !item.image_url) return "";
    return forceWebp(item.image_url);
  }

  function createLayer(src, className, altText = "") {
    if (!src) return null;
    const img = document.createElement("img");
    img.className = `avatar-layer ${className}`;
    img.src = forceWebp(src);
    img.alt = altText;
    img.loading = "eager";
    img.decoding = "async";
    return img;
  }

  function activeFaceSetCode() {
    const slots = [
      "head", "eyes", "mouth", "eyebrow",
      "front_hair", "rear_hair", "body",
      "top", "cloth", "pants", "shoes", "hat",
    ]
      .map((slot) => equippedItem(slot))
      .filter(Boolean)
      .map((item) => item.set_code || "")
      .filter(Boolean);

    if (slots.length < 2) return "";
    return new Set(slots).size === 1 ? slots[0] : "";
  }

  function activeEffect() {
    const setCode = activeFaceSetCode();
    if (!setCode) return "";
    const map = {
      royal: "royal-glow",
      angel: "angel-ring",
      shadow: "shadow-smoke",
      neon: "neon-aura",
    };
    return map[setCode] || "set-aura";
  }

  async function fetchJson(url) {
    try {
      const res = await fetch(url, {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        data = { ok: false, error: "Invalid JSON response." };
      }
      if (!("ok" in data)) data.ok = res.ok;
      if (!res.ok && !data.error) data.error = `Request failed (${res.status})`;
      return data;
    } catch (error) {
      console.error(error);
      return { ok: false, error: "Network error." };
    }
  }

  function postJson(url, payload) {
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": window.CSRF_TOKEN || "",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const text = await res.text();
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch (e) {
          data = { ok: false, error: "Server returned invalid JSON." };
        }
        if (!("ok" in data)) data.ok = res.ok;
        if (!res.ok && !data.error) data.error = `Request failed (${res.status})`;
        return data;
      })
      .catch((error) => {
        console.error(error);
        return { ok: false, error: "Network error while saving." };
      });
  }

  function renderAvatarCanvas(canvasEl) {
    if (!canvasEl) return;
    canvasEl.innerHTML = "";

    const stack = document.createElement("div");
    stack.className = "avatar-stack";

    const gender = draftAvatar.gender || "male";
    const base = avatarBaseSet(gender);

    if (activeFaceSetCode()) {
      if (activeEffect() === "angel-ring") {
        const ring = document.createElement("div");
        ring.className = "avatar-effect-ring";
        stack.appendChild(ring);
      } else {
        const glow = document.createElement("div");
        glow.className = "avatar-effect-glow";
        stack.appendChild(glow);
      }
    }

    const bodyItem = equippedItem("body");
    const pantsItem = equippedItem("pants");
    const shoesItem = equippedItem("shoes");
    const rearHairItem = equippedItem("rear_hair");
    const clothItem = equippedItem("cloth");
    const topItem = equippedItem("top");
    const headItem = equippedItem("head");
    const eyebrowItem = equippedItem("eyebrow");
    const eyesItem = equippedItem("eyes");
    const mouthItem = equippedItem("mouth");
    const frontHairItem = equippedItem("front_hair");
    const hatItem = equippedItem("hat");

    const bodyLayer = bodyItem
      ? createLayer(normalizeItemImageUrl(bodyItem), "avatar-layer-body", bodyItem.name || "Body")
      : createLayer(base.body, "avatar-layer-body", "Avatar body");

    const pantsLayer = pantsItem ? createLayer(normalizeItemImageUrl(pantsItem), "avatar-layer-pants", pantsItem.name || "Pants") : null;
    const shoesLayer = shoesItem ? createLayer(normalizeItemImageUrl(shoesItem), "avatar-layer-shoes", shoesItem.name || "Shoes") : null;
    const rearHairLayer = rearHairItem ? createLayer(normalizeItemImageUrl(rearHairItem), "avatar-layer-hair-rear", rearHairItem.name || "Rear hair") : createLayer(base.rear_hair, "avatar-layer-hair-rear", "Avatar rear hair");
    const clothLayer = clothItem ? createLayer(normalizeItemImageUrl(clothItem), "avatar-layer-cloth", clothItem.name || "Cloth") : null;
    const topLayer = topItem ? createLayer(normalizeItemImageUrl(topItem), "avatar-layer-top", topItem.name || "Top") : null;
    const headLayer = headItem ? createLayer(normalizeItemImageUrl(headItem), "avatar-layer-head", headItem.name || "Head") : createLayer(base.head, "avatar-layer-head", "Avatar head");
    const eyebrowLayer = eyebrowItem ? createLayer(normalizeItemImageUrl(eyebrowItem), "avatar-layer-eyebrow", eyebrowItem.name || "Eyebrow") : createLayer(base.eyebrow, "avatar-layer-eyebrow", "Avatar eyebrow");
    const eyesLayer = eyesItem ? createLayer(normalizeItemImageUrl(eyesItem), "avatar-layer-eyes", eyesItem.name || "Eyes") : createLayer(base.eyes, "avatar-layer-eyes", "Avatar eyes");
    const mouthLayer = mouthItem ? createLayer(normalizeItemImageUrl(mouthItem), "avatar-layer-mouth", mouthItem.name || "Mouth") : createLayer(base.mouth, "avatar-layer-mouth", "Avatar mouth");
    const frontHairLayer = frontHairItem ? createLayer(normalizeItemImageUrl(frontHairItem), "avatar-layer-hair-front", frontHairItem.name || "Front hair") : createLayer(base.front_hair, "avatar-layer-hair-front", "Avatar front hair");
    const hatLayer = hatItem ? createLayer(normalizeItemImageUrl(hatItem), "avatar-layer-hat", hatItem.name || "Hat") : null;

    if (bodyLayer) stack.appendChild(bodyLayer);
    if (pantsLayer) stack.appendChild(pantsLayer);
    if (shoesLayer) stack.appendChild(shoesLayer);
    if (rearHairLayer) stack.appendChild(rearHairLayer);
    if (clothLayer) stack.appendChild(clothLayer);
    if (topLayer) stack.appendChild(topLayer);
    if (headLayer) stack.appendChild(headLayer);
    if (eyebrowLayer) stack.appendChild(eyebrowLayer);
    if (eyesLayer) stack.appendChild(eyesLayer);
    if (mouthLayer) stack.appendChild(mouthLayer);
    if (frontHairLayer) stack.appendChild(frontHairLayer);
    if (hatLayer) stack.appendChild(hatLayer);

    canvasEl.appendChild(stack);
  }

  function detectItemGender(item) {
    const raw = String(item.gender || item.target_gender || "").toLowerCase().trim();
    const name = String(item.name || "").toLowerCase();
    const image = String(item.image_url || "").toLowerCase();
    const slot = normalizeSlotName(item.slot || "");

    if (COMMON_ITEM_NAMES.includes(name)) return "common";
    if (raw === "common" || raw === "unisex" || raw === "all") return "common";
    if (raw === "male" || raw === "m") return "male";
    if (raw === "female" || raw === "f") return "female";
    if (name.includes("female") || image.includes("/female/")) return "female";
    if (name.includes("male") || image.includes("/male/")) return "male";
    if (["cloth", "top", "pants", "shoes", "hat"].includes(slot)) return "male";
    return "all";
  }

  function isFaceSlot(slot) {
    return ["head", "eyes", "mouth", "eyebrow"].includes(slot);
  }

  function isHairSlot(slot) {
    return ["front_hair", "rear_hair"].includes(slot);
  }

  function matchesGenderFilter(item) {
    const gender = detectItemGender(item);
    if (activeInventoryGenderFilter === "all") return true;
    return gender === activeInventoryGenderFilter;
  }

  function matchesTypeFilter(normalizedSlot) {
    if (activeInventoryTypeFilter === "all") return true;
    if (activeInventoryTypeFilter === "face") return isFaceSlot(normalizedSlot);
    if (activeInventoryTypeFilter === "hair") return isHairSlot(normalizedSlot);
    if (activeInventoryTypeFilter === "body") return normalizedSlot === "body";
    if (activeInventoryTypeFilter === "top") return normalizedSlot === "top";
    if (activeInventoryTypeFilter === "cloth") return normalizedSlot === "cloth";
    if (activeInventoryTypeFilter === "pants") return normalizedSlot === "pants";
    if (activeInventoryTypeFilter === "shoes") return normalizedSlot === "shoes";
    if (activeInventoryTypeFilter === "hat") return normalizedSlot === "hat";
    return true;
  }

  function itemMatchesFilters(item, normalizedSlot) {
    return matchesGenderFilter(item) && matchesTypeFilter(normalizedSlot);
  }

  function updateEquippedSlotState() {
    const slots = ["head", "eyes", "mouth", "eyebrow", "front_hair", "rear_hair", "body", "top", "cloth", "pants", "shoes", "hat"];
    slots.forEach((slot) => {
      const card = document.querySelector(`[data-slot-card="${slot}"]`);
      if (!card) return;
      card.classList.toggle("is-equipped", !!equippedItem(slot));
    });
  }

  function renderInventory() {
    if (!inventoryWrap) return;
    inventoryWrap.innerHTML = "";

    if (!ownedItems.length) {
      inventoryWrap.innerHTML = `<div class="empty-text">No avatar items yet.</div>`;
      return;
    }

    const supportedSlots = ["head", "eyes", "mouth", "eyebrow", "front_hair", "rear_hair", "body", "top", "cloth", "pants", "shoes", "hat"];
    let visibleCount = 0;

    ownedItems.forEach((item) => {
      const normalizedSlot = normalizeSlotName(item.slot);
      const draftKey = getDraftKeyBySlot(item.slot);
      const isSupportedSlot = supportedSlots.includes(normalizedSlot);

      if (!itemMatchesFilters(item, normalizedSlot)) return;
      visibleCount += 1;

      const card = document.createElement("div");
      card.className = "inventory-card";

      const thumb = document.createElement("div");
      thumb.className = "inventory-thumb";

      if (item.image_url) {
        const img = document.createElement("img");
        img.src = forceWebp(item.image_url);
        img.alt = item.name;
        img.loading = "lazy";
        img.decoding = "async";
        thumb.appendChild(img);
      } else {
        thumb.innerHTML = `<div class="empty-text">NO IMG</div>`;
      }

      const name = document.createElement("div");
      name.className = "inventory-name";
      name.textContent = item.name;

      const meta = document.createElement("div");
      meta.className = "inventory-meta";
      meta.textContent = `${normalizedSlot} · x${item.quantity}`;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "inventory-equip-btn";

      const isActive = Number(draftAvatar[draftKey]) === Number(item.item_id);
      if (isActive) {
        btn.classList.add("is-active");
        card.classList.add("is-equipped");
      }

      if (!isSupportedSlot) {
        btn.disabled = true;
        btn.textContent = "Unsupported";
      } else {
        btn.textContent = isActive ? "Equipped" : "Equip";
        btn.addEventListener("click", () => {
          draftAvatar[draftKey] = Number(item.item_id);
          renderAll();
          updateSaveHint(`${item.name} equipped.`);
        });
      }

      card.appendChild(thumb);
      card.appendChild(name);
      card.appendChild(meta);
      card.appendChild(btn);
      inventoryWrap.appendChild(card);
    });

    if (visibleCount === 0) {
      inventoryWrap.innerHTML = `<div class="empty-text">No items match this filter.</div>`;
    }
  }

  function updateGenderButtons() {
    document.querySelectorAll(".gender-btn").forEach((btn) => {
      btn.classList.remove("avatar-btn-primary");
      btn.classList.add("avatar-btn-secondary");
      if (btn.dataset.gender === (draftAvatar.gender || "male")) {
        btn.classList.remove("avatar-btn-secondary");
        btn.classList.add("avatar-btn-primary");
      }
    });
  }

  function updateInventoryFilterButtons() {
    document.querySelectorAll('[data-filter-group="gender"]').forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.filter === activeInventoryGenderFilter);
    });

    document.querySelectorAll('[data-filter-group="type"]').forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.filter === activeInventoryTypeFilter);
    });
  }

  function restoreDesktopPaneLayout() {
    if (!stageCardBody) return;
    if (tabGuestbook && tabGuestbook.parentElement !== stageCardBody) stageCardBody.appendChild(tabGuestbook);
    if (tabDiary && tabDiary.parentElement !== stageCardBody) stageCardBody.appendChild(tabDiary);
    if (mobileTabPaneCard) mobileTabPaneCard.style.display = "none";
  }

  function syncResponsiveTabPanePlacement() {
    const mobile = isMobileRoomUI();

    if (!mobile) {
      restoreDesktopPaneLayout();
      return;
    }

    if (!mobileTabPaneCard || !mobileTabPaneMount) return;

    if (currentMainTab === "guestbook" && tabGuestbook) {
      if (tabGuestbook.parentElement !== mobileTabPaneMount) mobileTabPaneMount.appendChild(tabGuestbook);
      mobileTabPaneCard.style.display = "block";
    } else if (currentMainTab === "diary" && tabDiary) {
      if (tabDiary.parentElement !== mobileTabPaneMount) mobileTabPaneMount.appendChild(tabDiary);
      mobileTabPaneCard.style.display = "block";
    } else {
      mobileTabPaneCard.style.display = "none";
    }
  }

  function updateStageContentVisibility() {
    if (!stageContentCard) return;
    if (currentMainTab === "guestbook" || currentMainTab === "diary") {
      stageContentCard.style.display = "block";
    } else {
      stageContentCard.style.display = "none";
    }
  }

  function renderAll() {
    renderAvatarCanvas(avatarCanvasView);
    if (isOwner) {
      updateInventoryFilterButtons();
      renderInventory();
      updateEquippedSlotState();
      updateGenderButtons();
    }
    syncOwnerNickname();
    updateStageContentVisibility();
    applyMobileRoomCleanup();
  }

  function setActiveSideTab(tabName) {
    document.querySelectorAll(".side-tab-btn[data-tab-target]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tabTarget === tabName);
    });
  }

  function openEditMode() {
    currentMainTab = "edit";
    if (avatarLayout) avatarLayout.classList.add("is-editing");
    setActiveSideTab("edit");
    renderAll();
    applyMobileRoomCleanup();
  }

  function closeEditMode() {
    if (avatarLayout) avatarLayout.classList.remove("is-editing");
    applyMobileRoomCleanup();
  }

  async function saveCurrentState() {
    if (!isOwner || isSaving) return false;

    isSaving = true;
    if (saveAvatarChangesBtn) {
      saveAvatarChangesBtn.disabled = true;
      saveAvatarChangesBtn.textContent = "Saving...";
    }
    updateSaveHint("Saving avatar...");

    try {
      const result = await postJson(avatarSaveUrl, {
        gender: draftAvatar.gender || "male",
        equipped: {
          head_item_id: draftAvatar.head_item_id || null,
          eyes_item_id: draftAvatar.eyes_item_id || null,
          mouth_item_id: draftAvatar.mouth_item_id || null,
          eyebrow_item_id: draftAvatar.eyebrow_item_id || null,
          front_hair_item_id: draftAvatar.front_hair_item_id || null,
          rear_hair_item_id: draftAvatar.rear_hair_item_id || null,
          body_item_id: draftAvatar.body_item_id || null,
          top_item_id: draftAvatar.top_item_id || null,
          cloth_item_id: draftAvatar.cloth_item_id || null,
          pants_item_id: draftAvatar.pants_item_id || null,
          shoes_item_id: draftAvatar.shoes_item_id || null,
          hat_item_id: draftAvatar.hat_item_id || null,
        },
      });

      if (!result.ok) {
        alert(result.error || "Failed to save avatar.");
        updateSaveHint("Save failed.");
        return false;
      }

      avatar = result.avatar || avatar;
      draftAvatar = deepCopy(avatar);
      ownedItems = result.inventory || ownedItems;
      renderAll();
      updateSaveHint("Avatar saved.");
      return true;
    } finally {
      isSaving = false;
      if (saveAvatarChangesBtn) {
        saveAvatarChangesBtn.disabled = false;
        saveAvatarChangesBtn.textContent = "Save Avatar";
      }
    }
  }

  function openConfirmModal() {
    return new Promise((resolve) => {
      if (!confirmModal) {
        resolve(window.confirm("Reset equipped avatar items?"));
        return;
      }

      confirmModal.classList.add("is-open");
      confirmModal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");

      const close = (result) => {
        confirmModal.classList.remove("is-open");
        confirmModal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open");

        confirmOkBtn?.removeEventListener("click", handleOk);
        confirmCancelBtn?.removeEventListener("click", handleCancel);
        confirmModal.querySelectorAll("[data-close-confirm]").forEach((el) => el.removeEventListener("click", handleCancel));
        document.removeEventListener("keydown", handleEsc);
        resolve(result);
      };

      const handleOk = () => close(true);
      const handleCancel = () => close(false);
      const handleEsc = (e) => { if (e.key === "Escape") close(false); };

      confirmOkBtn?.addEventListener("click", handleOk);
      confirmCancelBtn?.addEventListener("click", handleCancel);
      confirmModal.querySelectorAll("[data-close-confirm]").forEach((el) => el.addEventListener("click", handleCancel));
      document.addEventListener("keydown", handleEsc);
    });
  }

  function setRoomStats(stats) {
    if (!stats) return;

    const todayEl = document.getElementById("roomTodayVisits");
    const totalEl = document.getElementById("roomTotalVisits");
    const likeEl = document.getElementById("roomLikeCount");
    const likeBtn = document.getElementById("toggleRoomLikeBtn");
    const likeBtnText = document.getElementById("toggleRoomLikeBtnText");

    if (todayEl) todayEl.textContent = stats.today_visits ?? 0;
    if (totalEl) totalEl.textContent = stats.total_visits ?? 0;
    if (likeEl) likeEl.textContent = stats.like_count ?? 0;

    if (likeBtn) likeBtn.classList.toggle("is-liked", !!stats.liked_by_me);
    if (likeBtnText) likeBtnText.textContent = stats.liked_by_me ? "Liked" : "Like";
  }

  async function loadRoomStats() {
    const roomOwnerUsername = page.dataset.avatarOwner;
    if (!roomOwnerUsername || !socialRoomStatsUrlBase) return;

    const result = await fetchJson(`${socialRoomStatsUrlBase}${roomOwnerUsername}/stats/`);
    if (result.ok && result.stats) setRoomStats(result.stats);
  }

  async function recordRoomVisit() {
    const roomOwnerUsername = page.dataset.avatarOwner;
    if (isOwner || !roomOwnerUsername || !socialRoomVisitUrlBase) return;

    const result = await postJson(`${socialRoomVisitUrlBase}${roomOwnerUsername}/visit/`, {});
    if (result.ok && result.stats) setRoomStats(result.stats);
  }

  function renderFriendRequests(items) {
    const wrap = document.getElementById("friendRequestList");
    if (!wrap) return;

    if (!items.length) {
      wrap.innerHTML = `<div class="empty-text">No pending requests.</div>`;
      return;
    }

    wrap.innerHTML = "";

    items.forEach((item) => {
      const displayName = getDisplayName(item);
      const username = getUsername(item);

      const card = document.createElement("div");
      card.className = "friend-request-card";
      card.innerHTML = `
        <div class="friend-request-top">
          <div class="friend-request-head-left">
            <div class="friend-request-name">${escapeHtml(displayName)}</div>
          </div>
          <div class="friend-request-sub">${escapeHtml(item.created_at || "")}</div>
        </div>
        <div class="friend-request-actions">
          <a href="${item.room_url}" class="avatar-btn avatar-btn-secondary">Visit</a>
          <button type="button" class="avatar-btn avatar-btn-primary friend-accept-btn" data-id="${item.id}" data-username="${escapeHtml(username)}">Accept</button>
          <button type="button" class="avatar-btn avatar-btn-secondary friend-reject-btn" data-id="${item.id}" data-username="${escapeHtml(username)}">Reject</button>
        </div>
      `;
      wrap.appendChild(card);
    });

    wrap.querySelectorAll(".friend-accept-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const result = await postJson(`${socialFriendRespondUrlBase}${id}/`, { action: "accept" });
        if (!result.ok) {
          alert(result.error || "Accept failed.");
          return;
        }
        await loadFriendRequests();
        await loadFriendSelectOptions();
        await loadRoomDirectory(currentSearchQuery);
      });
    });

    wrap.querySelectorAll(".friend-reject-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const result = await postJson(`${socialFriendRespondUrlBase}${id}/`, { action: "reject" });
        if (!result.ok) {
          alert(result.error || "Reject failed.");
          return;
        }
        await loadFriendRequests();
        await loadFriendSelectOptions();
        await loadRoomDirectory(currentSearchQuery);
      });
    });
  }

  async function loadFriendRequests() {
    if (!socialFriendRequestsUrl) return;
    const result = await fetchJson(socialFriendRequestsUrl);
    if (result.ok) renderFriendRequests(result.requests || []);
  }

  async function loadFriendSelectOptions() {
    const friendSelect = document.getElementById("friendSelect");
    if (!friendSelect || !socialFriendListUrl) return;

    const result = await fetchJson(socialFriendListUrl);
    if (!result.ok) return;

    friendSelect.innerHTML = `<option value="">Choose friend</option>`;
    (result.friends || []).forEach((friend) => {
      const option = document.createElement("option");
      option.value = getUsername(friend);
      option.textContent = getDisplayName(friend);
      friendSelect.appendChild(option);
    });
  }

  function buildFriendActionHtml(item, username) {
    const isFriend = item.friendship_status === "accepted";
    const isPending = item.friendship_status === "pending";

    if (isFriend) {
      return `<span class="mini-pill is-warm">Friend</span>`;
    }

    if (isPending) {
      return `<button type="button" class="avatar-btn avatar-btn-secondary directory-add-friend-btn is-pending" data-username="${escapeHtml(username)}">Cancel</button>`;
    }

    return `<button type="button" class="avatar-btn avatar-btn-secondary directory-add-friend-btn" data-username="${escapeHtml(username)}">Friend</button>`;
  }

  function buildRoomCard(item, index) {
    const number = index + 1;
    const username = getUsername(item);
    const displayName = getDisplayName(item);

    return `
      <div class="room-row-card">
        <div class="room-row-line">
          <div class="room-row-number">${number}</div>
          <div class="room-row-name room-row-name-fixed">${escapeHtml(displayName)}</div>
          <a href="${item.room_url}" class="avatar-btn avatar-btn-primary people-action-btn">Visit</a>
          ${buildFriendActionHtml(item, username)}
        </div>
      </div>
    `;
  }

  async function toggleFriendRequest(username) {
    const result = await postJson(`${socialFriendRequestUrlBase}${username}/`, {});
    if (!result.ok) {
      alert(result.error || "Failed to update friend request.");
      return false;
    }
    return true;
  }

  function renderRoomDirectory(items) {
    const wrap = document.getElementById("roomDirectoryList");
    if (!wrap) return;

    if (!items.length) {
      wrap.innerHTML = `<div class="empty-text">No users found.</div>`;
      return;
    }

    wrap.innerHTML = items.map((item, index) => buildRoomCard(item, index)).join("");

    wrap.querySelectorAll(".directory-add-friend-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const username = btn.dataset.username;
        const ok = await toggleFriendRequest(username);
        if (!ok) return;
        await loadFriendRequests();
        await loadFriendSelectOptions();
        await loadRoomDirectory(currentSearchQuery);
      });
    });
  }

  async function loadRoomDirectory(query = "") {
    if (!socialRoomListUrl) return;
    currentSearchQuery = query || "";

    let result = await fetchJson(socialRoomListUrl);
    if (!result.ok) return;

    let rooms = result.rooms || [];

    if (currentSearchQuery) {
      const q = currentSearchQuery.toLowerCase();
      rooms = rooms.filter((item) => {
        const displayName = String(getDisplayName(item)).toLowerCase();
        const username = String(getUsername(item)).toLowerCase();
        return displayName.includes(q) || username.includes(q);
      });
    }

    renderRoomDirectory(rooms);
  }

  async function runUserSearch() {
    const input = document.getElementById("userSearchInput");
    if (!input) return;
    await loadRoomDirectory(input.value.trim());
  }

  function findResetSection() {
    if (!resetAvatarBtn) return null;
    return resetAvatarBtn.closest(".avatar-reset-section") || resetAvatarBtn.parentElement;
  }

  function applyMobileRoomCleanup() {
    const mobile = isMobileRoomUI();

    page.classList.toggle("is-mobile-room", mobile);
    page.classList.toggle("is-mobile-editing", mobile && currentMainTab === "edit");

    const resetSection = findResetSection();
    if (resetSection) {
      resetSection.style.display = mobile ? "none" : "";
    }

    if (saveHint) {
      saveHint.style.display = mobile ? "none" : "";
    }

    document.querySelectorAll(".utility-card").forEach((el) => {
      el.style.display = mobile ? "none" : "";
    });

    setActiveSideTab(currentMainTab === "edit" ? "edit" : currentMainTab);
    syncResponsiveTabPanePlacement();
    updateStageContentVisibility();
  }

  document.querySelectorAll(".gender-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      draftAvatar.gender = btn.dataset.gender;
      renderAll();
      updateSaveHint(`Base changed to ${draftAvatar.gender}.`);
    });
  });

  document.querySelectorAll('[data-filter-group="gender"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      activeInventoryGenderFilter = btn.dataset.filter || "all";
      updateInventoryFilterButtons();
      renderInventory();
    });
  });

  document.querySelectorAll('[data-filter-group="type"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      activeInventoryTypeFilter = btn.dataset.filter || "all";
      updateInventoryFilterButtons();
      renderInventory();
    });
  });

  document.querySelectorAll("[data-clear-slot]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const slot = normalizeSlotName(btn.dataset.clearSlot);
      if (!slot) return;
      draftAvatar[`${slot}_item_id`] = null;
      renderAll();
      updateSaveHint(`${slot} cleared.`);
    });
  });

  if (saveAvatarChangesBtn) {
    saveAvatarChangesBtn.addEventListener("click", async () => {
      await saveCurrentState();
    });
  }

  if (resetAvatarBtn) {
    resetAvatarBtn.addEventListener("click", async () => {
      const ok = await openConfirmModal();
      if (!ok) return;

      resetAvatarBtn.disabled = true;
      resetAvatarBtn.textContent = "Resetting...";

      try {
        const result = await postJson(avatarResetUrl, {});
        if (!result.ok) {
          alert(result.error || "Failed to reset avatar.");
          return;
        }

        avatar = result.avatar || avatar;
        draftAvatar = deepCopy(avatar);
        ownedItems = result.inventory || ownedItems;
        renderAll();
        openEditMode();
        updateSaveHint("Avatar reset saved.");
      } finally {
        resetAvatarBtn.disabled = false;
        resetAvatarBtn.textContent = "Reset Avatar";
      }
    });
  }

  function activateMainTab(tabName) {
    currentMainTab = tabName;

    document.querySelectorAll(".tab-pane").forEach((pane) => pane.classList.remove("active"));

    if (tabName === "edit") {
      if (tabAvatar) tabAvatar.classList.add("active");
      openEditMode();
      syncResponsiveTabPanePlacement();
      updateStageContentVisibility();
      return;
    }

    closeEditMode();

    if (tabName === "avatar") {
      if (tabAvatar) tabAvatar.classList.add("active");
    } else if (tabName === "guestbook") {
      if (tabGuestbook) tabGuestbook.classList.add("active");
    } else if (tabName === "diary") {
      if (tabDiary) tabDiary.classList.add("active");
    }

    setActiveSideTab(tabName);

    setTimeout(() => {
      renderAll();
      applyMobileRoomCleanup();
    }, 20);
  }

  document.querySelectorAll(".side-tab-btn[data-tab-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = btn.dataset.tabTarget;
      if (tabName) activateMainTab(tabName);
    });
  });

  if (closeEditDrawerBtn) {
    closeEditDrawerBtn.addEventListener("click", () => {
      activateMainTab("avatar");
    });
  }

  const visitFriendBtn = document.getElementById("visitFriendBtn");
  const friendSelect = document.getElementById("friendSelect");
  if (visitFriendBtn && friendSelect) {
    visitFriendBtn.addEventListener("click", () => {
      const username = friendSelect.value;
      if (!username) {
        alert("Choose a friend first.");
        return;
      }
      window.location.href = `${friendAvatarBase}${username}/`;
    });
  }

  const goMyRoomBtn = document.getElementById("goMyRoomBtn");
  if (goMyRoomBtn) {
    goMyRoomBtn.addEventListener("click", () => {
      window.location.href = myRoomUrl;
    });
  }

  const toggleRoomLikeBtn = document.getElementById("toggleRoomLikeBtn");
  if (toggleRoomLikeBtn) {
    toggleRoomLikeBtn.addEventListener("click", async () => {
      const roomOwnerUsername = page.dataset.avatarOwner;
      const result = await postJson(`${socialRoomLikeUrlBase}${roomOwnerUsername}/like-toggle/`, {});
      if (!result.ok) {
        alert(result.error || "Failed to toggle like.");
        return;
      }
      if (result.stats) setRoomStats(result.stats);
      await loadRoomDirectory(currentSearchQuery);
    });
  }

  const sendFriendRequestBtn = document.getElementById("sendFriendRequestBtn");
  if (sendFriendRequestBtn) {
    sendFriendRequestBtn.addEventListener("click", async () => {
      const roomOwnerUsername = page.dataset.avatarOwner;
      const result = await postJson(`${socialFriendRequestUrlBase}${roomOwnerUsername}/`, {});
      if (!result.ok) {
        alert(result.error || "Failed to update friend request.");
        return;
      }

      if (result.action === "sent") {
        sendFriendRequestBtn.textContent = "Cancel Request";
      } else if (result.action === "canceled") {
        sendFriendRequestBtn.textContent = "Add Friend";
      }

      await loadFriendRequests();
      await loadFriendSelectOptions();
      await loadRoomDirectory(currentSearchQuery);
    });
  }

  const userSearchBtn = document.getElementById("userSearchBtn");
  const userSearchInput = document.getElementById("userSearchInput");

  if (userSearchBtn) userSearchBtn.addEventListener("click", runUserSearch);
  if (userSearchInput) {
    userSearchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        runUserSearch();
      }
    });
  }

  const guestbookSubmitBtn = document.getElementById("guestbookSubmitBtn");
  const guestbookContent = document.getElementById("guestbookContent");
  const guestbookList = document.getElementById("guestbookList");

  if (guestbookSubmitBtn && guestbookContent) {
    guestbookSubmitBtn.addEventListener("click", async () => {
      const content = guestbookContent.value.trim();
      if (!content) {
        alert("Please enter a guestbook message.");
        return;
      }

      const result = await postJson(guestbookCreateUrl, { content });
      if (!result.ok) {
        alert(result.error || "Failed to leave message.");
        return;
      }

      const authorName = getDisplayName(result.entry || {});
      const card = document.createElement("div");
      card.className = "message-card";
      card.innerHTML = `
        <div class="message-top">
          <strong>${escapeHtml(authorName)}</strong>
          <span>${escapeHtml(result.entry.created_at || "")}</span>
        </div>
        <div class="message-body"></div>
      `;
      card.querySelector(".message-body").textContent = result.entry.content || "";

      if (guestbookList) {
        if (guestbookList.querySelector(".empty-text")) guestbookList.innerHTML = "";
        guestbookList.prepend(card);
      }

      guestbookContent.value = "";
    });
  }

  const diarySubmitBtn = document.getElementById("diarySubmitBtn");
  const diaryTitle = document.getElementById("diaryTitle");
  const diaryContent = document.getElementById("diaryContent");
  const diaryVisibility = document.getElementById("diaryVisibility");
  const diaryList = document.getElementById("diaryList");

  if (diarySubmitBtn && diaryTitle && diaryContent && diaryVisibility) {
    diarySubmitBtn.addEventListener("click", async () => {
      const title = diaryTitle.value.trim();
      const content = diaryContent.value.trim();
      const visibility = diaryVisibility.value;

      if (!title || !content) {
        alert("Please enter both title and content.");
        return;
      }

      const result = await postJson(diaryCreateUrl, { title, content, visibility });
      if (!result.ok) {
        alert(result.error || "Failed to save diary.");
        return;
      }

      const card = document.createElement("div");
      card.className = "message-card";
      card.innerHTML = `
        <div class="message-top">
          <strong>${escapeHtml(result.entry.title || "")}</strong>
          <span>${escapeHtml(result.entry.created_at || "")}</span>
        </div>
        <div class="message-meta">${escapeHtml(result.entry.visibility || "")}</div>
        <div class="message-body"></div>
      `;
      card.querySelector(".message-body").textContent = result.entry.content || "";

      if (diaryList) {
        if (diaryList.querySelector(".empty-text")) diaryList.innerHTML = "";
        diaryList.prepend(card);
      }

      diaryTitle.value = "";
      diaryContent.value = "";
      diaryVisibility.value = "friends";
    });
  }

  draftAvatar = deepCopy(avatar);
  renderAll();
  activateMainTab("avatar");
  updateSaveHint("");
  syncOwnerNickname();
  loadRoomStats();
  recordRoomVisit();
  loadFriendRequests();
  loadFriendSelectOptions();
  loadRoomDirectory("");

  window.addEventListener("resize", () => {
    syncResponsiveTabPanePlacement();
    renderAll();
    applyMobileRoomCleanup();
  });
});