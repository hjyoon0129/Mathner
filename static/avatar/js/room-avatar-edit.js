(function () {
  function boot() {
    const shared = window.RoomPage;
    if (!shared || shared.__avatarEditBooted) return;
    shared.__avatarEditBooted = true;

    const { els, state, API } = shared;

    const escapeHtml =
      shared.escapeHtml ||
      function (value) {
        return String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      };

    const fetchJson = shared.fetchJson;
    const postJson = shared.postJson;
    const renderAvatarCanvas = shared.renderAvatarCanvas || function () {};
    const closeNamePopover = shared.closeNamePopover || function () {};
    const deepCopy =
      shared.deepCopy ||
      function (obj) {
        return JSON.parse(JSON.stringify(obj ?? {}));
      };
    const normalizeAvatarState = shared.normalizeAvatarState;
    const normalizeInventoryItems = shared.normalizeInventoryItems;
    const normalizeOwnedEffects = shared.normalizeOwnedEffects;
    const updateSaveHint = shared.updateSaveHint || function () {};

    const SUPPORTED_SLOTS = shared.SUPPORTED_SLOTS;
    const getDraftKeyBySlot = shared.getDraftKeyBySlot;
    const normalizeSlotName = shared.normalizeSlotName;
    const itemByItemId = shared.itemByItemId;

    function equippedItem(slot) {
      return itemByItemId(state.draftAvatar[getDraftKeyBySlot(slot)]);
    }

    function detectItemGender(item) {
      const raw = String(item.gender || item.target_gender || "").toLowerCase().trim();
      if (["common", "unisex", "all", ""].includes(raw)) return "common";
      if (["male", "m"].includes(raw)) return "male";
      if (["female", "f"].includes(raw)) return "female";
      return "common";
    }

    function isFaceSlot(slot) {
      return ["head", "eyes", "mouth", "eyebrow"].includes(slot);
    }

    function isHairSlot(slot) {
      return ["front_hair", "rear_hair"].includes(slot);
    }

    function matchesGenderFilter(item) {
      const gender = detectItemGender(item);
      return state.activeInventoryGenderFilter === "all"
        ? true
        : gender === state.activeInventoryGenderFilter;
    }

    function matchesTypeFilter(slot) {
      const filter = state.activeInventoryTypeFilter;
      if (filter === "all") return true;
      if (filter === "face") return isFaceSlot(slot);
      if (filter === "hair") return isHairSlot(slot);
      return slot === filter;
    }

    function itemMatchesFilters(item, slot) {
      return matchesGenderFilter(item) && matchesTypeFilter(slot);
    }

    function updateEquippedSlotState() {
      for (const slot of SUPPORTED_SLOTS) {
        const card = document.querySelector(`[data-slot-card="${slot}"]`);
        if (!card) continue;
        card.classList.toggle("is-equipped", Boolean(equippedItem(slot)));
      }
    }

    function updateGenderButtons() {
      document.querySelectorAll(".gender-btn").forEach((btn) => {
        const isActive = btn.dataset.gender === (state.draftAvatar.gender || "male");
        btn.classList.toggle("avatar-btn-primary", isActive);
        btn.classList.toggle("avatar-btn-secondary", !isActive);
      });
    }

    function updateInventoryFilterButtons() {
      document.querySelectorAll('[data-filter-group="gender"]').forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.filter === state.activeInventoryGenderFilter);
      });

      document.querySelectorAll('[data-filter-group="type"]').forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.filter === state.activeInventoryTypeFilter);
      });
    }

    function renderInventory() {
      const wrap = els.inventoryWrap;
      if (!wrap) return;

      const avatarItems = state.ownedItems.filter((item) => !item.is_font);
      if (!avatarItems.length) {
        wrap.innerHTML = `<div class="empty-text">No avatar items yet.</div>`;
        return;
      }

      const html = [];
      let visibleCount = 0;

      for (const item of avatarItems) {
        const slot = normalizeSlotName(item.slot);
        if (!itemMatchesFilters(item, slot)) continue;
        visibleCount += 1;

        const draftKey = getDraftKeyBySlot(slot);
        const isSupportedSlot = SUPPORTED_SLOTS.has(slot);
        const isActive = Number(state.draftAvatar[draftKey]) === Number(item.item_id);

        html.push(`
          <div class="inventory-card ${isActive ? "is-equipped" : ""}">
            <div class="inventory-thumb">
              ${
                item.image_url
                  ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name || "")}" loading="lazy" decoding="async">`
                  : `<div class="empty-text">NO IMG</div>`
              }
            </div>
            <div class="inventory-name">${escapeHtml(item.name || "")}</div>
            <div class="inventory-meta">${escapeHtml(slot)} · x${escapeHtml(item.quantity ?? 1)}</div>
            <button
              type="button"
              class="inventory-equip-btn ${isActive ? "is-active" : ""}"
              data-action="equip-item"
              data-item-id="${escapeHtml(item.item_id)}"
              data-slot="${escapeHtml(slot)}"
              ${isSupportedSlot ? "" : "disabled"}
            >
              ${isSupportedSlot ? (isActive ? "Equipped" : "Equip") : "Unsupported"}
            </button>
          </div>
        `);
      }

      wrap.innerHTML = visibleCount
        ? html.join("")
        : `<div class="empty-text">No items match this filter.</div>`;
    }

    function renderSetInventory() {
      const wrap = document.getElementById("setInventoryWrap");
      if (!wrap) return;

      const items = state.ownedItems.filter((item) => String(item.item_group || item.group || "").toLowerCase() === "set");
      wrap.innerHTML = items.length
        ? items.map((item) => `
            <div class="inventory-card">
              <div class="inventory-thumb">
                ${
                  item.image_url
                    ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name || "")}" loading="lazy" decoding="async">`
                    : `<div class="empty-text">NO IMG</div>`
                }
              </div>
              <div class="inventory-name">${escapeHtml(item.name || "")}</div>
              <div class="inventory-meta">Set</div>
            </div>
          `).join("")
        : `<div class="empty-text">No set items yet.</div>`;
    }

    function renderUniqueInventory() {
      const wrap = document.getElementById("uniqueInventoryWrap");
      if (!wrap) return;

      const items = state.ownedItems.filter((item) => String(item.item_group || item.group || "").toLowerCase() === "unique");
      wrap.innerHTML = items.length
        ? items.map((item) => `
            <div class="inventory-card">
              <div class="inventory-thumb">
                ${
                  item.image_url
                    ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name || "")}" loading="lazy" decoding="async">`
                    : `<div class="empty-text">NO IMG</div>`
                }
              </div>
              <div class="inventory-name">${escapeHtml(item.name || "")}</div>
              <div class="inventory-meta">Unique</div>
            </div>
          `).join("")
        : `<div class="empty-text">No unique items yet.</div>`;
    }

    async function loadInventoryIfNeeded(force = false) {
      if (!shared.isOwner || !API.avatarInventoryUrl) {
        renderInventory();
        renderSetInventory();
        renderUniqueInventory();
        return null;
      }

      if (state.inventoryLoaded && !force) {
        renderInventory();
        renderSetInventory();
        renderUniqueInventory();
        updateEquippedSlotState();
        return { ok: true, inventory: state.ownedItems };
      }

      if (state.inventoryPromise && !force) return state.inventoryPromise;

      if (els.inventoryWrap) {
        els.inventoryWrap.innerHTML = `<div class="empty-text">Loading inventory...</div>`;
      }

      state.inventoryPromise = (async () => {
        const result = await fetchJson(API.avatarInventoryUrl);

        if (!result.ok) {
          if (els.inventoryWrap) {
            els.inventoryWrap.innerHTML = `<div class="empty-text">${escapeHtml(result.error || "Failed to load inventory.")}</div>`;
          }
          return result;
        }

        state.ownedItems = normalizeInventoryItems(result.inventory || result.items || []);
        if (Array.isArray(result.effects)) {
          state.ownedEffects = normalizeOwnedEffects(result.effects);
        }
        state.inventoryLoaded = true;

        renderInventory();
        renderSetInventory();
        renderUniqueInventory();
        updateEquippedSlotState();
        return result;
      })();

      try {
        return await state.inventoryPromise;
      } finally {
        state.inventoryPromise = null;
      }
    }

    async function saveCurrentState() {
      if (!shared.isOwner || state.isSaving || !API.avatarSaveUrl) return false;

      state.isSaving = true;

      if (els.saveAvatarChangesBtn) {
        els.saveAvatarChangesBtn.disabled = true;
        els.saveAvatarChangesBtn.textContent = "Saving...";
      }
      updateSaveHint("Saving avatar...");

      try {
        const equipped = {};
        for (const slot of SUPPORTED_SLOTS) {
          equipped[`${slot}_item_id`] = state.draftAvatar[`${slot}_item_id`] || null;
        }

        const result = await postJson(API.avatarSaveUrl, {
          gender: state.draftAvatar.gender || "male",
          equipped,
        });

        if (!result.ok) {
          alert(result.error || "Failed to save avatar.");
          updateSaveHint("Save failed.");
          return false;
        }

        state.avatar = normalizeAvatarState(result.avatar || state.avatar);
        state.draftAvatar = deepCopy(state.avatar);
        state.ownedItems = normalizeInventoryItems(result.inventory || result.items || state.ownedItems);

        if (Array.isArray(result.effects)) {
          state.ownedEffects = normalizeOwnedEffects(result.effects);
        }

        state.inventoryLoaded = true;

        renderAvatarCanvas();
        renderInventory();
        renderSetInventory();
        renderUniqueInventory();
        updateGenderButtons();
        updateEquippedSlotState();
        updateSaveHint("Avatar saved.");
        return true;
      } finally {
        state.isSaving = false;
        if (els.saveAvatarChangesBtn) {
          els.saveAvatarChangesBtn.disabled = false;
          els.saveAvatarChangesBtn.textContent = "Save Avatar";
        }
      }
    }

    function openConfirmModal() {
      return new Promise((resolve) => {
        if (!els.confirmModal) {
          resolve(window.confirm("Reset equipped avatar items?"));
          return;
        }

        const modal = els.confirmModal;
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");

        const close = (result) => {
          modal.classList.remove("is-open");
          modal.setAttribute("aria-hidden", "true");
          document.body.classList.remove("modal-open");
          els.confirmOkBtn?.removeEventListener("click", onOk);
          els.confirmCancelBtn?.removeEventListener("click", onCancel);
          modal.querySelectorAll("[data-close-confirm]").forEach((el) => {
            el.removeEventListener("click", onCancel);
          });
          document.removeEventListener("keydown", onEsc);
          resolve(result);
        };

        const onOk = () => close(true);
        const onCancel = () => close(false);
        const onEsc = (e) => {
          if (e.key === "Escape") close(false);
        };

        els.confirmOkBtn?.addEventListener("click", onOk);
        els.confirmCancelBtn?.addEventListener("click", onCancel);
        modal.querySelectorAll("[data-close-confirm]").forEach((el) => {
          el.addEventListener("click", onCancel);
        });
        document.addEventListener("keydown", onEsc);
      });
    }

    function switchAvatarEditSubtab(targetName) {
      document.querySelectorAll(".avatar-edit-subtab-btn").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.editSubtab === targetName);
      });

      document.querySelectorAll(".avatar-edit-subpanel").forEach((panel) => {
        panel.classList.remove("is-active");
      });

      if (targetName === "avatar") {
        document.getElementById("avatarEditSubpanelAvatar")?.classList.add("is-active");
      } else if (targetName === "set") {
        document.getElementById("avatarEditSubpanelSet")?.classList.add("is-active");
      } else if (targetName === "unique") {
        document.getElementById("avatarEditSubpanelUnique")?.classList.add("is-active");
      }
    }

    function bindAvatarEditEvents() {
      document.addEventListener("click", async (e) => {
        const filterBtn = e.target.closest(".inventory-filter-btn");
        if (filterBtn) {
          closeNamePopover();
          const group = filterBtn.dataset.filterGroup;
          const filter = filterBtn.dataset.filter || "all";

          if (group === "gender") state.activeInventoryGenderFilter = filter;
          if (group === "type") state.activeInventoryTypeFilter = filter;

          updateInventoryFilterButtons();
          renderInventory();
          return;
        }

        const clearBtn = e.target.closest("[data-clear-slot]");
        if (clearBtn) {
          closeNamePopover();
          const slot = normalizeSlotName(clearBtn.dataset.clearSlot);
          if (!SUPPORTED_SLOTS.has(slot)) return;

          state.draftAvatar[getDraftKeyBySlot(slot)] = null;
          renderAvatarCanvas();
          updateEquippedSlotState();
          renderInventory();
          return;
        }

        const equipBtn = e.target.closest('[data-action="equip-item"]');
        if (equipBtn) {
          closeNamePopover();
          const slot = normalizeSlotName(equipBtn.dataset.slot);
          const itemId = Number(equipBtn.dataset.itemId || 0);
          if (!SUPPORTED_SLOTS.has(slot) || !itemId) return;

          const draftKey = getDraftKeyBySlot(slot);
          const isSame = Number(state.draftAvatar[draftKey]) === itemId;
          state.draftAvatar[draftKey] = isSame ? null : itemId;

          renderAvatarCanvas();
          updateEquippedSlotState();
          renderInventory();
          return;
        }

        const subtabBtn = e.target.closest(".avatar-edit-subtab-btn");
        if (subtabBtn) {
          closeNamePopover();
          switchAvatarEditSubtab(subtabBtn.dataset.editSubtab || "avatar");
        }
      });

      document.querySelectorAll(".gender-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          closeNamePopover();
          state.draftAvatar.gender = btn.dataset.gender || "male";
          updateGenderButtons();
          renderAvatarCanvas();
        });
      });

      els.saveAvatarChangesBtn?.addEventListener("click", async () => {
        closeNamePopover();
        await saveCurrentState();
      });

      els.resetAvatarBtn?.addEventListener("click", async () => {
        closeNamePopover();
        const ok = await openConfirmModal();
        if (!ok) return;

        if (els.resetAvatarBtn) {
          els.resetAvatarBtn.disabled = true;
          els.resetAvatarBtn.textContent = "Resetting...";
        }

        try {
          const result = await postJson(API.avatarResetUrl, {});
          if (!result.ok) {
            alert(result.error || "Failed to reset avatar.");
            return;
          }

          state.avatar = normalizeAvatarState(result.avatar || state.avatar);
          state.draftAvatar = deepCopy(state.avatar);
          state.ownedItems = normalizeInventoryItems(result.inventory || result.items || state.ownedItems);

          if (Array.isArray(result.effects)) {
            state.ownedEffects = normalizeOwnedEffects(result.effects);
          }

          state.inventoryLoaded = true;

          renderAvatarCanvas();
          renderInventory();
          renderSetInventory();
          renderUniqueInventory();
          updateGenderButtons();
          updateEquippedSlotState();
          updateSaveHint("Avatar reset saved.");
        } finally {
          if (els.resetAvatarBtn) {
            els.resetAvatarBtn.disabled = false;
            els.resetAvatarBtn.textContent = "Reset Avatar";
          }
        }
      });
    }

    shared.renderInventory = renderInventory;
    shared.renderSetInventory = renderSetInventory;
    shared.renderUniqueInventory = renderUniqueInventory;
    shared.loadInventoryIfNeeded = loadInventoryIfNeeded;
    shared.updateInventoryFilterButtons = updateInventoryFilterButtons;
    shared.updateGenderButtons = updateGenderButtons;
    shared.updateEquippedSlotState = updateEquippedSlotState;
    shared.saveCurrentState = saveCurrentState;
    shared.openConfirmModal = openConfirmModal;
    shared.switchAvatarEditSubtab = switchAvatarEditSubtab;
    shared.bindAvatarEditEvents = bindAvatarEditEvents;

    bindAvatarEditEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();