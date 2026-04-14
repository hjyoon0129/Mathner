(function () {
  function boot() {
    const shared = window.RoomPage;
    if (!shared || shared.__fontEditBooted) return;
    shared.__fontEditBooted = true;

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

    const postJson = shared.postJson;
    const closeNamePopover = shared.closeNamePopover || function () {};
    const itemByItemId = shared.itemByItemId;

    const DEFAULT_NICKNAME_SCALE = shared.DEFAULT_NICKNAME_SCALE ?? 1.0;
    const DEFAULT_NICKNAME_SPACING = shared.DEFAULT_NICKNAME_SPACING ?? 0.0;
    const MIN_NICKNAME_SCALE = shared.MIN_NICKNAME_SCALE ?? 0.8;
    const MAX_NICKNAME_SCALE = shared.MAX_NICKNAME_SCALE ?? 1.6;
    const MIN_NICKNAME_SPACING = shared.MIN_NICKNAME_SPACING ?? -1.0;
    const MAX_NICKNAME_SPACING = shared.MAX_NICKNAME_SPACING ?? 6.0;

    const EMPTY_FONT_PREF = shared.EMPTY_FONT_PREF || {
      nickname_font_key: "",
      title_font_key: "",
      content_font_key: "",
      nickname_font_item_id: null,
      title_font_item_id: null,
      content_font_item_id: null,
      nickname_effect_key: "none",
      title_effect_key: "none",
      content_effect_key: "none",
      nickname_color: "#7ec8ff",
      title_color: "#ffffff",
      content_color: "#eef4ff",
      nickname_scale: DEFAULT_NICKNAME_SCALE,
      nickname_letter_spacing: DEFAULT_NICKNAME_SPACING,
    };

    const clamp =
      shared.clamp ||
      function (num, min, max) {
        return Math.min(max, Math.max(min, Number(num)));
      };

    const fontClassFromKey =
      shared.fontClassFromKey ||
      function (key) {
        return key ? `font-${key}` : "font-default";
      };

    const effectKeyToClass =
      shared.effectKeyToClass ||
      function (effectKey) {
        return `effect-${String(effectKey || "none").trim().replace(/_/g, "-")}`;
      };

    const applyLiveNicknamePreview = shared.applyLiveNicknamePreview || function () {};
    const applyCurrentFontPreferenceToEditors = shared.applyCurrentFontPreferenceToEditors || function () {};
    const updateFontSaveHint = shared.updateFontSaveHint || function () {};

    function currentSelectedEffectKey() {
      return (els.fontEffectSelect?.value || "none").replace(/-/g, "_");
    }

    function setEffectSelection(effectKey = "none") {
      const normalized = String(effectKey || "none").replace(/-/g, "_");
      if (els.fontEffectSelect) els.fontEffectSelect.value = normalized;
      state.previewFont.effectKey = normalized;
      renderEffectInventory();
    }

    function syncNicknameToolUI() {
      const scale = Number(
        state.previewFont.nicknameScale ??
          state.viewerFontPref.nickname_scale ??
          DEFAULT_NICKNAME_SCALE
      );
      const spacing = Number(
        state.previewFont.nicknameLetterSpacing ??
          state.viewerFontPref.nickname_letter_spacing ??
          DEFAULT_NICKNAME_SPACING
      );

      if (els.nicknameSizeValue) {
        els.nicknameSizeValue.textContent =
          scale === DEFAULT_NICKNAME_SCALE ? "Default" : `${scale.toFixed(1)}x`;
      }

      if (els.nicknameSpacingValue) {
        els.nicknameSpacingValue.textContent =
          spacing === DEFAULT_NICKNAME_SPACING ? "Default" : `${spacing}px`;
      }
    }

    function getCarouselPageSize() {
      return window.innerWidth <= 1180 ? 1 : 3;
    }

    function updateSingleCarousel({ wrap, carousel, prevBtn, nextBtn, pageKey }) {
      if (!wrap || !carousel || !prevBtn || !nextBtn) return;

      const cards = Array.from(wrap.children).filter(
        (el) =>
          el.classList.contains("font-inventory-card") ||
          el.classList.contains("effect-inventory-card")
      );

      const pageSize = getCarouselPageSize();
      const total = cards.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));

      if (state[pageKey] > totalPages - 1) state[pageKey] = totalPages - 1;
      if (state[pageKey] < 0) state[pageKey] = 0;

      wrap.style.setProperty("--font-page-size", String(pageSize));
      wrap.style.setProperty("--font-current-page", String(state[pageKey]));

      const shouldShowNav = total > pageSize;
      prevBtn.hidden = !shouldShowNav;
      nextBtn.hidden = !shouldShowNav;
      prevBtn.disabled = !shouldShowNav || state[pageKey] <= 0;
      nextBtn.disabled = !shouldShowNav || state[pageKey] >= totalPages - 1;

      carousel.dataset.pageSize = String(pageSize);
      carousel.dataset.totalPages = String(totalPages);
    }

    function updateFontEffectCarousels() {
      updateSingleCarousel({
        wrap: els.fontInventoryWrap,
        carousel: els.fontInventoryCarousel,
        prevBtn: els.fontPrevBtn,
        nextBtn: els.fontNextBtn,
        pageKey: "fontPage",
      });

      updateSingleCarousel({
        wrap: els.effectInventoryWrap,
        carousel: els.effectInventoryCarousel,
        prevBtn: els.effectPrevBtn,
        nextBtn: els.effectNextBtn,
        pageKey: "effectPage",
      });
    }

    function resetCarouselPage(pageKey) {
      state[pageKey] = 0;
    }

    function renderFontInventory() {
      if (!els.fontInventoryWrap) return;

      const fontItems = state.ownedItems.filter((item) => item.is_font);

      if (!fontItems.length) {
        els.fontInventoryWrap.innerHTML = `<div class="empty-text">No font items.</div>`;
        resetCarouselPage("fontPage");
        updateFontEffectCarousels();
        return;
      }

      const previewEffectKey = currentSelectedEffectKey();

      const html = fontItems
        .map((item) => {
          const isSelected = Number(state.selectedFontItemId) === Number(item.item_id);
          const previewEffectClass = isSelected
            ? effectKeyToClass(previewEffectKey)
            : "effect-none";

          return `
            <div class="font-inventory-card ${isSelected ? "is-selected" : ""}">
              <div class="font-preview-box">
                <div class="font-preview-text ${fontClassFromKey(item.font_key)} ${previewEffectClass}">
                  Mathner Hero
                </div>
              </div>
              <div class="font-inventory-name" title="${escapeHtml(item.name || "")}">
                ${escapeHtml(item.name || "")}
              </div>
              <button
                type="button"
                class="font-card-select-btn ${isSelected ? "is-selected" : ""}"
                data-action="select-font-item"
                data-item-id="${escapeHtml(item.item_id)}"
              >
                ${isSelected ? "Selected" : "Select Font"}
              </button>
            </div>
          `;
        })
        .join("");

      els.fontInventoryWrap.innerHTML = html;
      resetCarouselPage("fontPage");
      updateFontEffectCarousels();
    }

    function renderEffectInventory() {
      if (!els.effectInventoryWrap) return;

      if (!state.ownedEffects.length) {
        els.effectInventoryWrap.innerHTML = `<div class="empty-text">No effect items.</div>`;
        resetCarouselPage("effectPage");
        updateFontEffectCarousels();
        return;
      }

      const selectedKey = currentSelectedEffectKey();
      const previewFontKey =
        state.previewFont.fontKey || state.viewerFontPref.nickname_font_key || "";

      const html = state.ownedEffects
        .map((effect) => {
          const isSelected = effect.effect_key === selectedKey;
          return `
            <div class="effect-inventory-card ${isSelected ? "is-selected" : ""}">
              <div class="font-preview-box">
                <div class="font-preview-text ${fontClassFromKey(previewFontKey)} ${effectKeyToClass(effect.effect_key)}">
                  Mathner Hero
                </div>
              </div>
              <div class="font-inventory-name" title="${escapeHtml(effect.name || "")}">
                ${escapeHtml(effect.name || "")}
              </div>
              <button
                type="button"
                class="effect-card-select-btn ${isSelected ? "is-selected" : ""}"
                data-action="select-effect-item"
                data-effect-key="${escapeHtml(effect.effect_key)}"
              >
                ${isSelected ? "Selected" : "Select Effect"}
              </button>
            </div>
          `;
        })
        .join("");

      els.effectInventoryWrap.innerHTML = html;
      resetCarouselPage("effectPage");
      updateFontEffectCarousels();
    }

    function buildLocalViewerFontPrefAfterApply(selectedItem, payload) {
      return {
        ...state.viewerFontPref,
        nickname_font_item_id: selectedItem ? selectedItem.item_id : null,
        nickname_font_key: selectedItem?.font_key || "",
        nickname_effect_key: payload.effect_key || "none",
        nickname_scale: Number(payload.nickname_scale ?? DEFAULT_NICKNAME_SCALE),
        nickname_letter_spacing: Number(
          payload.nickname_letter_spacing ?? DEFAULT_NICKNAME_SPACING
        ),
        nickname_color: "#7ec8ff",

        title_font_item_id: selectedItem ? selectedItem.item_id : null,
        title_font_key: selectedItem?.font_key || "",
        title_effect_key: payload.effect_key || "none",
        title_color: "#ffffff",

        content_font_item_id: selectedItem ? selectedItem.item_id : null,
        content_font_key: selectedItem?.font_key || "",
        content_effect_key: "none",
        content_color: "#eef4ff",
      };
    }

    async function saveFontPreference() {
      if (!shared.isOwner || !API.avatarSaveFontUrl) return;

      const isReset = els.resetFontDefaultBtn?.dataset.resetMode === "true";

      if (!isReset && !state.selectedFontItemId) {
        updateFontSaveHint("Choose a font first.", true);
        return;
      }

      const selectedItem = itemByItemId(state.selectedFontItemId);

      const payload = {
        font_item_id: isReset ? null : state.selectedFontItemId,
        apply_to_nickname: true,
        apply_to_title: true,
        apply_to_content: true,
        nickname_color: "#7ec8ff",
        title_color: "#ffffff",
        content_color: "#eef4ff",
        effect_key: isReset ? "none" : currentSelectedEffectKey(),
        nickname_scale: isReset
          ? DEFAULT_NICKNAME_SCALE
          : Number(state.previewFont.nicknameScale ?? DEFAULT_NICKNAME_SCALE),
        nickname_letter_spacing: isReset
          ? DEFAULT_NICKNAME_SPACING
          : Number(
              state.previewFont.nicknameLetterSpacing ?? DEFAULT_NICKNAME_SPACING
            ),
        reset_default: isReset,
      };

      try {
        if (els.saveFontPreferenceBtn) {
          els.saveFontPreferenceBtn.disabled = true;
          els.saveFontPreferenceBtn.textContent = "Apply";
        }

        updateFontSaveHint("Applying font...");

        const result = await postJson(API.avatarSaveFontUrl, payload);
        if (!result.ok) {
          updateFontSaveHint(result.error || "Failed to apply font.", true);
          return;
        }

        if (isReset) {
          state.viewerFontPref = { ...EMPTY_FONT_PREF };
          state.ownerFontPref = { ...EMPTY_FONT_PREF };
          state.selectedFontItemId = null;
        } else {
          state.viewerFontPref = {
            ...buildLocalViewerFontPrefAfterApply(selectedItem, payload),
            ...(result.font_pref || {}),
          };
          state.ownerFontPref = { ...state.viewerFontPref };
        }

        state.previewFont = {
          itemId: null,
          fontKey: "",
          effectKey: state.viewerFontPref.nickname_effect_key || "none",
          nicknameScale: Number(
            state.viewerFontPref.nickname_scale ?? DEFAULT_NICKNAME_SCALE
          ),
          nicknameLetterSpacing: Number(
            state.viewerFontPref.nickname_letter_spacing ?? DEFAULT_NICKNAME_SPACING
          ),
        };

        applyCurrentFontPreferenceToEditors();
        renderFontInventory();
        renderEffectInventory();
        updateFontSaveHint("Font applied.");
        if (els.resetFontDefaultBtn) els.resetFontDefaultBtn.dataset.resetMode = "false";
      } finally {
        if (els.saveFontPreferenceBtn) {
          els.saveFontPreferenceBtn.disabled = false;
          els.saveFontPreferenceBtn.textContent = "Apply";
        }
      }
    }

    function bindFontEditEvents() {
      document.addEventListener("click", async (e) => {
        const fontBtn = e.target.closest('[data-action="select-font-item"]');
        if (fontBtn) {
          closeNamePopover();

          const itemId = Number(fontBtn.dataset.itemId || 0);
          const selectedItem = itemByItemId(itemId);

          state.selectedFontItemId = itemId || null;
          state.previewFont.itemId = itemId || null;
          state.previewFont.fontKey = selectedItem?.font_key || "";
          state.previewFont.effectKey = currentSelectedEffectKey();
          state.previewFont.nicknameScale = Number(
            state.viewerFontPref.nickname_scale ?? DEFAULT_NICKNAME_SCALE
          );
          state.previewFont.nicknameLetterSpacing = Number(
            state.viewerFontPref.nickname_letter_spacing ?? DEFAULT_NICKNAME_SPACING
          );

          if (els.resetFontDefaultBtn) els.resetFontDefaultBtn.dataset.resetMode = "false";

          renderFontInventory();
          renderEffectInventory();
          applyLiveNicknamePreview();
          syncNicknameToolUI();
          return;
        }

        const effectBtn = e.target.closest('[data-action="select-effect-item"]');
        if (effectBtn) {
          closeNamePopover();

          const effectKey = String(effectBtn.dataset.effectKey || "none");
          setEffectSelection(effectKey);
          state.previewFont.effectKey = effectKey;

          if (els.resetFontDefaultBtn) els.resetFontDefaultBtn.dataset.resetMode = "false";

          renderEffectInventory();
          applyLiveNicknamePreview();
        }
      });

      els.nicknameSizeDownBtn?.addEventListener("click", () => {
        state.previewFont.nicknameScale = clamp(
          Number(
            state.previewFont.nicknameScale ??
              state.viewerFontPref.nickname_scale ??
              DEFAULT_NICKNAME_SCALE
          ) - 0.1,
          MIN_NICKNAME_SCALE,
          MAX_NICKNAME_SCALE
        );
        applyLiveNicknamePreview();
        syncNicknameToolUI();
      });

      els.nicknameSizeUpBtn?.addEventListener("click", () => {
        state.previewFont.nicknameScale = clamp(
          Number(
            state.previewFont.nicknameScale ??
              state.viewerFontPref.nickname_scale ??
              DEFAULT_NICKNAME_SCALE
          ) + 0.1,
          MIN_NICKNAME_SCALE,
          MAX_NICKNAME_SCALE
        );
        applyLiveNicknamePreview();
        syncNicknameToolUI();
      });

      els.nicknameSpacingDownBtn?.addEventListener("click", () => {
        state.previewFont.nicknameLetterSpacing = clamp(
          Number(
            state.previewFont.nicknameLetterSpacing ??
              state.viewerFontPref.nickname_letter_spacing ??
              DEFAULT_NICKNAME_SPACING
          ) - 0.5,
          MIN_NICKNAME_SPACING,
          MAX_NICKNAME_SPACING
        );
        applyLiveNicknamePreview();
        syncNicknameToolUI();
      });

      els.nicknameSpacingUpBtn?.addEventListener("click", () => {
        state.previewFont.nicknameLetterSpacing = clamp(
          Number(
            state.previewFont.nicknameLetterSpacing ??
              state.viewerFontPref.nickname_letter_spacing ??
              DEFAULT_NICKNAME_SPACING
          ) + 0.5,
          MIN_NICKNAME_SPACING,
          MAX_NICKNAME_SPACING
        );
        applyLiveNicknamePreview();
        syncNicknameToolUI();
      });

      els.resetFontDefaultBtn?.addEventListener("click", async () => {
        state.selectedFontItemId = null;
        state.previewFont = {
          itemId: null,
          fontKey: "",
          effectKey: "none",
          nicknameScale: DEFAULT_NICKNAME_SCALE,
          nicknameLetterSpacing: DEFAULT_NICKNAME_SPACING,
        };

        setEffectSelection("none");
        els.resetFontDefaultBtn.dataset.resetMode = "true";
        applyLiveNicknamePreview();
        await saveFontPreference();
      });

      els.saveFontPreferenceBtn?.addEventListener("click", async () => {
        closeNamePopover();
        if (els.resetFontDefaultBtn) els.resetFontDefaultBtn.dataset.resetMode = "false";
        await saveFontPreference();
      });

      els.fontPrevBtn?.addEventListener("click", () => {
        state.fontPage = Math.max(0, state.fontPage - 1);
        updateFontEffectCarousels();
      });

      els.fontNextBtn?.addEventListener("click", () => {
        state.fontPage += 1;
        updateFontEffectCarousels();
      });

      els.effectPrevBtn?.addEventListener("click", () => {
        state.effectPage = Math.max(0, state.effectPage - 1);
        updateFontEffectCarousels();
      });

      els.effectNextBtn?.addEventListener("click", () => {
        state.effectPage += 1;
        updateFontEffectCarousels();
      });

      let resizeTimer = null;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          updateFontEffectCarousels();
        }, 80);
      });
    }

    shared.currentSelectedEffectKey = currentSelectedEffectKey;
    shared.setEffectSelection = setEffectSelection;
    shared.syncNicknameToolUI = syncNicknameToolUI;
    shared.updateFontEffectCarousels = updateFontEffectCarousels;
    shared.renderFontInventory = renderFontInventory;
    shared.renderEffectInventory = renderEffectInventory;
    shared.saveFontPreference = saveFontPreference;
    shared.bindFontEditEvents = bindFontEditEvents;

    bindFontEditEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();