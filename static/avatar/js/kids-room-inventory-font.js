(function () {
  const App = window.MathnerKidsRoom;

  App.register(function inventoryFontModule(App) {
    const $ = App.$;
    const $$ = App.$$;
    const els = App.els;
    const state = App.state;
    const API = App.API;

    App.detectItemGender = function detectItemGender(item) {
      const raw = String(item.gender || item.target_gender || "").toLowerCase().trim();

      if (["common", "unisex", "all", "공용", ""].includes(raw)) return "common";
      if (["male", "m", "남자", "남성"].includes(raw)) return "male";
      if (["female", "f", "여자", "여성"].includes(raw)) return "female";

      return "common";
    };

    App.isFaceSlot = function isFaceSlot(slot) {
      return ["head", "eyes", "mouth", "eyebrow"].includes(slot);
    };

    App.isHairSlot = function isHairSlot(slot) {
      return ["front_hair", "rear_hair"].includes(slot);
    };

    App.isNormalAvatarItem = function isNormalAvatarItem(item) {
      return !App.isProfileFontItem(item) &&
        !App.isProfileEffectItem(item) &&
        !App.isSetItem(item) &&
        !App.isUniqueItem(item);
    };

    App.matchesGenderFilter = function matchesGenderFilter(item) {
      const gender = App.detectItemGender(item);

      if (state.activeInventoryGenderFilter === "all") return true;
      return gender === state.activeInventoryGenderFilter;
    };

    App.matchesTypeFilter = function matchesTypeFilter(slot) {
      const filter = state.activeInventoryTypeFilter;

      if (filter === "all") return true;
      if (filter === "face") return App.isFaceSlot(slot);
      if (filter === "hair") return App.isHairSlot(slot);

      return slot === filter;
    };

    App.matchesSetTypeFilter = function matchesSetTypeFilter(slot) {
      return state.activeSetTypeFilter === "all" || slot === state.activeSetTypeFilter;
    };

    App.matchesUniqueTypeFilter = function matchesUniqueTypeFilter(slot) {
      return state.activeUniqueTypeFilter === "all" || slot === state.activeUniqueTypeFilter;
    };

    App.updateEquippedSlotState = function updateEquippedSlotState() {
      for (const slot of App.SUPPORTED_SLOTS) {
        const card = document.querySelector(`[data-slot-card="${slot}"]`);
        if (!card) continue;

        card.classList.toggle("is-equipped", Boolean(App.equippedItem(slot)));
      }
    };

    App.updateGenderButtons = function updateGenderButtons() {
      $$(".gender-btn").forEach((btn) => {
        const isActive = btn.dataset.gender === (state.draftAvatar.gender || "male");

        btn.classList.toggle("btn-blue", isActive);
        btn.classList.toggle("btn-gray", !isActive);
        btn.classList.toggle("avatar-btn-primary", isActive);
        btn.classList.toggle("avatar-btn-secondary", !isActive);
      });
    };

    App.updateInventoryFilterButtons = function updateInventoryFilterButtons() {
      $$('[data-filter-group="gender"]').forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.filter === state.activeInventoryGenderFilter);
      });

      $$('[data-filter-group="type"]').forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.filter === state.activeInventoryTypeFilter);
      });

      $$('[data-filter-group="set-type"]').forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.filter === state.activeSetTypeFilter);
      });

      $$('[data-filter-group="unique-type"]').forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.filter === state.activeUniqueTypeFilter);
      });
    };

    App.mergeEffectInventoryFromOwnedItems = function mergeEffectInventoryFromOwnedItems() {
      const byKey = new Map();

      for (const effect of state.ownedEffects || []) {
        const key = String(effect.effect_key || "").trim().toLowerCase().replace(/-/g, "_");
        if (!key) continue;

        byKey.set(key, {
          effect_key: key,
          name: effect.name || App.EFFECT_LABEL_MAP[key] || key,
          quantity: Number(effect.quantity || 1),
        });
      }

      for (const item of state.ownedItems || []) {
        if (!App.isProfileEffectItem(item)) continue;

        const rawKey = item.effect_key || item.name || "";
        const key = String(rawKey)
          .trim()
          .toLowerCase()
          .replace(/-/g, "_")
          .replace(/\s+/g, "_");

        if (!key) continue;

        if (!byKey.has(key)) {
          byKey.set(key, {
            effect_key: key,
            name: item.name || App.EFFECT_LABEL_MAP[key] || key,
            quantity: Number(item.quantity || 1),
          });
        } else {
          byKey.get(key).quantity = Math.max(
            Number(byKey.get(key).quantity || 1),
            Number(item.quantity || 1)
          );
        }
      }

      state.ownedEffects = Array.from(byKey.values());
    };

    App.getCarouselPageSize = function getCarouselPageSize() {
      return window.innerWidth <= 1180 ? 1 : 3;
    };

    App.updateSingleCarousel = function updateSingleCarousel({ wrap, carousel, prevBtn, nextBtn, pageKey }) {
      if (!wrap || !carousel || !prevBtn || !nextBtn) return;

      const cards = Array.from(wrap.children).filter((el) =>
        el.classList.contains("font-inventory-card") ||
        el.classList.contains("effect-inventory-card")
      );

      const pageSize = App.getCarouselPageSize();
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
    };

    App.updateFontEffectCarousels = function updateFontEffectCarousels() {
      App.updateSingleCarousel({
        wrap: els.fontInventoryWrap,
        carousel: els.fontInventoryCarousel,
        prevBtn: els.fontPrevBtn,
        nextBtn: els.fontNextBtn,
        pageKey: "fontPage",
      });

      App.updateSingleCarousel({
        wrap: els.effectInventoryWrap,
        carousel: els.effectInventoryCarousel,
        prevBtn: els.effectPrevBtn,
        nextBtn: els.effectNextBtn,
        pageKey: "effectPage",
      });

      App.applyNicknamePreviewToEditorCards?.();
    };

    App.resetCarouselPage = function resetCarouselPage(pageKey) {
      state[pageKey] = 0;
    };

    App.setEffectSelection = function setEffectSelection(effectKey = "none", options = {}) {
      const { preservePage = false } = options;
      const normalized = String(effectKey || "none").replace(/-/g, "_");

      if (els.fontEffectSelect) {
        els.fontEffectSelect.value = normalized;
      }

      state.previewFont.effectKey = normalized;
      App.renderEffectInventory({ preservePage });
      App.applyLiveNicknamePreview();
    };

    App.getActiveNicknameScale = function getActiveNicknameScale() {
      return Number(
        state.previewFont.nicknameScale ??
        state.viewerFontPref.nickname_scale ??
        App.DEFAULT_NICKNAME_SCALE
      );
    };

    App.getActiveNicknameSpacing = function getActiveNicknameSpacing() {
      return Number(
        state.previewFont.nicknameLetterSpacing ??
        state.viewerFontPref.nickname_letter_spacing ??
        App.DEFAULT_NICKNAME_SPACING
      );
    };

    App.getNicknamePreviewInlineStyle = function getNicknamePreviewInlineStyle() {
      const scale = App.clamp(
        App.getActiveNicknameScale(),
        App.MIN_NICKNAME_SCALE,
        App.MAX_NICKNAME_SCALE
      );

      const spacing = App.clamp(
        App.getActiveNicknameSpacing(),
        App.MIN_NICKNAME_SPACING,
        App.MAX_NICKNAME_SPACING
      );

      const fontSize = Math.max(15, Math.round(19 * scale));

      return `font-size:${fontSize}px; letter-spacing:${spacing}px;`;
    };

    App.applyNicknamePreviewToEditorCards = function applyNicknamePreviewToEditorCards(root = document) {
      const scale = App.clamp(
        App.getActiveNicknameScale(),
        App.MIN_NICKNAME_SCALE,
        App.MAX_NICKNAME_SCALE
      );

      const spacing = App.clamp(
        App.getActiveNicknameSpacing(),
        App.MIN_NICKNAME_SPACING,
        App.MAX_NICKNAME_SPACING
      );

      const fontSize = Math.max(15, Math.round(19 * scale));

      [
        ...$$(".font-inventory-card .font-preview-text", root),
        ...$$(".effect-inventory-card .font-preview-text", root),
      ].forEach((el) => {
        el.style.fontSize = `${fontSize}px`;
        el.style.letterSpacing = `${spacing}px`;
      });
    };

    App.syncNicknameToolUI = function syncNicknameToolUI() {
      const scale = App.clamp(
        App.getActiveNicknameScale(),
        App.MIN_NICKNAME_SCALE,
        App.MAX_NICKNAME_SCALE
      );

      const spacing = App.clamp(
        App.getActiveNicknameSpacing(),
        App.MIN_NICKNAME_SPACING,
        App.MAX_NICKNAME_SPACING
      );

      if (els.nicknameSizeValue) {
        els.nicknameSizeValue.textContent = scale === App.DEFAULT_NICKNAME_SCALE ? "기본" : `${scale.toFixed(1)}x`;
      }

      if (els.nicknameSpacingValue) {
        els.nicknameSpacingValue.textContent = spacing === App.DEFAULT_NICKNAME_SPACING ? "기본" : `${spacing}px`;
      }
    };

    App.applyLiveNicknamePreview = function applyLiveNicknamePreview() {
      if (!App.isOwner) return;

      const fontKey = state.previewFont.fontKey || state.viewerFontPref.nickname_font_key || "";
      const effectKey = state.previewFont.effectKey || state.viewerFontPref.nickname_effect_key || "none";
      const scale = App.clamp(
        App.getActiveNicknameScale(),
        App.MIN_NICKNAME_SCALE,
        App.MAX_NICKNAME_SCALE
      );
      const spacing = App.clamp(
        App.getActiveNicknameSpacing(),
        App.MIN_NICKNAME_SPACING,
        App.MAX_NICKNAME_SPACING
      );

      if (els.roomOwnerName) {
        App.applyFontClass(els.roomOwnerName, fontKey);
        App.applyNicknameTransform(els.roomOwnerName, scale, spacing);

        if (effectKey === "rainbow_flow" || effectKey === "rainbow-flow") {
          els.roomOwnerName.style.color = "transparent";
          els.roomOwnerName.style.webkitTextFillColor = "transparent";
        } else {
          els.roomOwnerName.style.color = "#73c5ff";
          els.roomOwnerName.style.webkitTextFillColor = "";
        }

        App.applyFontEffect(els.roomOwnerName, effectKey);
      }

      App.applyNicknamePreviewToEditorCards();
    };

    App.applyOwnerNicknameDisplay = function applyOwnerNicknameDisplay() {
      if (!els.roomOwnerName) return;

      const effectKey = state.ownerFontPref.nickname_effect_key || "none";

      App.applyFontClass(els.roomOwnerName, state.ownerFontPref.nickname_font_key || "");
      App.applyNicknameTransform(
        els.roomOwnerName,
        Number(state.ownerFontPref.nickname_scale ?? App.DEFAULT_NICKNAME_SCALE),
        Number(state.ownerFontPref.nickname_letter_spacing ?? App.DEFAULT_NICKNAME_SPACING)
      );

      if (effectKey === "rainbow_flow" || effectKey === "rainbow-flow") {
        els.roomOwnerName.style.color = "transparent";
        els.roomOwnerName.style.webkitTextFillColor = "transparent";
      } else {
        els.roomOwnerName.style.color = state.ownerFontPref.nickname_color || "#73c5ff";
        els.roomOwnerName.style.webkitTextFillColor = "";
      }

      App.applyFontEffect(els.roomOwnerName, effectKey);
    };

    App.applyViewerWritingPreview = function applyViewerWritingPreview() {
      App.applyFontClass(els.diaryTitleInput, state.viewerFontPref.title_font_key || "");
      App.applyFontEffect(els.diaryTitleInput, "none");

      if (els.diaryTitleInput) {
        els.diaryTitleInput.style.color = "#403932";
        els.diaryTitleInput.style.webkitTextFillColor = "";
      }

      App.applyFontClass(els.diaryContentInput, state.viewerFontPref.content_font_key || "");
      App.applyFontEffect(els.diaryContentInput, "none");

      if (els.diaryContentInput) {
        els.diaryContentInput.style.color = "#403932";
        els.diaryContentInput.style.webkitTextFillColor = "";
      }

      App.applyFontClass(els.guestbookContentInput, state.viewerFontPref.content_font_key || "");
      App.applyFontEffect(els.guestbookContentInput, "none");

      if (els.guestbookContentInput) {
        els.guestbookContentInput.style.color = "#403932";
        els.guestbookContentInput.style.webkitTextFillColor = "";
      }

      App.syncNicknameToolUI();
      App.applyNicknamePreviewToEditorCards();
    };

    App.applyCurrentFontPreferenceToEditors = function applyCurrentFontPreferenceToEditors() {
      App.applyOwnerNicknameDisplay();
      App.applyViewerWritingPreview();
      App.applyNicknamePreviewToEditorCards();
    };

    App.renderFontInventory = function renderFontInventory(options = {}) {
      if (!els.fontInventoryWrap) return;

      const { preservePage = false } = options;
      const fontItems = state.ownedItems.filter((item) => App.isProfileFontItem(item));

      if (!fontItems.length) {
        els.fontInventoryWrap.innerHTML = `<div class="empty-text">아직 글씨체가 없어도 기본 글씨체에 반짝이 효과를 적용할 수 있어요.</div>`;
        if (!preservePage) App.resetCarouselPage("fontPage");
        App.updateFontEffectCarousels();
        return;
      }

      const previewEffectKey = App.currentSelectedEffectKey();
      const previewStyle = App.getNicknamePreviewInlineStyle();

      els.fontInventoryWrap.innerHTML = fontItems.map((item) => {
        const isSelected = Number(state.selectedFontItemId) === Number(item.item_id);
        const previewEffectClass = isSelected ? App.effectKeyToClass(previewEffectKey) : "effect-none";
        const fontKey = item.font_key || "";

        return `
          <div class="font-inventory-card ${isSelected ? "is-selected" : ""}">
            <div class="font-preview-box">
              <div class="font-preview-text ${App.fontClassFromKey(fontKey)} ${previewEffectClass}" style="${previewStyle}">
                매스너!
              </div>
            </div>

            <div class="font-inventory-name" title="${App.escapeHtml(item.name || "")}">
              ${App.escapeHtml(item.name || "")}
            </div>

            <button
              type="button"
              class="font-card-select-btn ${isSelected ? "is-selected" : ""}"
              data-action="select-font-item"
              data-item-id="${App.escapeHtml(item.item_id)}"
            >
              ${isSelected ? "선택됨" : "선택"}
            </button>
          </div>
        `;
      }).join("");

      if (!preservePage) App.resetCarouselPage("fontPage");
      App.updateFontEffectCarousels();
      App.applyNicknamePreviewToEditorCards(els.fontInventoryWrap);
    };

    App.renderEffectInventory = function renderEffectInventory(options = {}) {
      if (!els.effectInventoryWrap) return;

      const { preservePage = false } = options;

      if (!state.ownedEffects.length) {
        els.effectInventoryWrap.innerHTML = `<div class="empty-text">아직 반짝이 효과가 없어요.</div>`;
        if (!preservePage) App.resetCarouselPage("effectPage");
        App.updateFontEffectCarousels();
        return;
      }

      const selectedKey = App.currentSelectedEffectKey();
      const previewFontKey = state.previewFont.fontKey || state.viewerFontPref.nickname_font_key || "";
      const previewStyle = App.getNicknamePreviewInlineStyle();

      els.effectInventoryWrap.innerHTML = state.ownedEffects.map((effect) => {
        const effectKey = String(effect.effect_key || "none").replace(/-/g, "_");
        const isSelected = effectKey === selectedKey;

        return `
          <div class="effect-inventory-card ${isSelected ? "is-selected" : ""}">
            <div class="font-preview-box">
              <div class="font-preview-text ${App.fontClassFromKey(previewFontKey)} ${App.effectKeyToClass(effectKey)}" style="${previewStyle}">
                매스너!
              </div>
            </div>

            <div class="font-inventory-name" title="${App.escapeHtml(effect.name || "")}">
              ${App.escapeHtml(effect.name || "")}
            </div>

            <button
              type="button"
              class="effect-card-select-btn ${isSelected ? "is-selected" : ""}"
              data-action="select-effect-item"
              data-effect-key="${App.escapeHtml(effectKey)}"
            >
              ${isSelected ? "선택됨" : "효과 넣기"}
            </button>
          </div>
        `;
      }).join("");

      if (!preservePage) App.resetCarouselPage("effectPage");
      App.updateFontEffectCarousels();
      App.applyNicknamePreviewToEditorCards(els.effectInventoryWrap);
    };

    App.getDisplaySlotLabel = function getDisplaySlotLabel(item, slot) {
      const normalized = App.normalizeSlotName(slot);

      if (App.SUPPORTED_SLOTS.has(normalized)) return App.SLOT_LABEL_MAP[normalized] || normalized;
      if (App.isSetItem(item)) return `세트 · ${App.SLOT_LABEL_MAP[normalized] || normalized || "아이템"}`;
      if (App.isUniqueItem(item)) return `스페셜 · ${App.SLOT_LABEL_MAP[normalized] || normalized || "아이템"}`;

      return App.SLOT_LABEL_MAP[normalized] || normalized || "아이템";
    };

    App.renderInventoryImageHtml = function renderInventoryImageHtml(item) {
      const imageUrl = App.normalizeItemImageUrl(item);

      if (!imageUrl) {
        return `<div class="empty-text">이미지 없음</div>`;
      }

      const candidates = App.imageCandidates(imageUrl);

      return `
        <img
          src="${App.escapeHtml(candidates[0] || imageUrl)}"
          alt="${App.escapeHtml(item.name || "")}"
          loading="lazy"
          decoding="async"
          data-img-fallback='${App.escapeHtml(JSON.stringify(candidates))}'
        >
      `;
    };

    App.renderInventoryCard = function renderInventoryCard(item) {
      const normalizedSlot = App.resolveItemSlot(item);
      const isUnique = App.isUniqueItem(item);

      const equipSlot = normalizedSlot;
      const draftKey = equipSlot && App.SUPPORTED_SLOTS.has(equipSlot) ? App.getDraftKeyBySlot(equipSlot) : "";
      const isSupportedSlot = Boolean(draftKey);
      const isActive = Boolean(draftKey) && Number(state.draftAvatar[draftKey]) === Number(item.item_id);
      const imageHtml = App.renderInventoryImageHtml(item);

      const cardClass = isUnique
        ? `inventory-card inventory-card-unique ${isActive ? "is-equipped" : ""}`
        : `inventory-card ${isActive ? "is-equipped" : ""}`;

      const thumbClass = isUnique ? "inventory-thumb inventory-thumb-unique" : "inventory-thumb";

      return `
        <div class="${cardClass}">
          <div class="${thumbClass}">
            ${
              isUnique
                ? `
                  <span class="inventory-unique-badge">스페셜</span>
                  <span class="inventory-unique-glow"></span>
                  <span class="inventory-unique-ring"></span>
                  <span class="inventory-unique-spark inventory-unique-spark-1"></span>
                  <span class="inventory-unique-spark inventory-unique-spark-2"></span>
                  <span class="inventory-unique-spark inventory-unique-spark-3"></span>
                  <span class="inventory-unique-spark inventory-unique-spark-4"></span>
                  <span class="inventory-unique-spark inventory-unique-spark-5"></span>
                  <div class="inventory-unique-item-wrap">${imageHtml}</div>
                `
                : imageHtml
            }
          </div>

          <div class="inventory-name">${App.escapeHtml(item.name || "")}</div>

          <button
            type="button"
            class="inventory-equip-btn ${isActive ? "is-active" : ""}"
            data-action="equip-item"
            data-item-id="${App.escapeHtml(item.item_id)}"
            data-slot="${App.escapeHtml(equipSlot)}"
            ${isSupportedSlot ? "" : "disabled"}
          >
            ${isSupportedSlot ? (isActive ? "입는 중" : "입기") : "착용 불가"}
          </button>
        </div>
      `;
    };

    App.attachInventoryImageFallbacks = function attachInventoryImageFallbacks(root = document) {
      $$("img[data-img-fallback]", root).forEach((img) => {
        if (img.dataset.boundFallback === "true") return;

        img.dataset.boundFallback = "true";
        img.dataset.fallbackIndex = "0";

        img.onerror = () => {
          const candidates = App.safeJsonParse(img.dataset.imgFallback || "[]", []);
          const nextIndex = Number(img.dataset.fallbackIndex || 0) + 1;

          if (nextIndex < candidates.length) {
            img.dataset.fallbackIndex = String(nextIndex);
            img.src = candidates[nextIndex];
            return;
          }

          img.onerror = null;
          img.style.display = "none";
        };
      });
    };

    App.renderInventory = function renderInventory() {
      if (!els.inventoryWrap) return;

      const avatarItems = state.ownedItems.filter((item) => App.isNormalAvatarItem(item));

      if (!avatarItems.length) {
        els.inventoryWrap.innerHTML = `<div class="empty-text">아직 옷이 없어요.</div>`;
        return;
      }

      const html = [];

      for (const item of avatarItems) {
        const slot = App.resolveItemSlot(item);
        if (!App.matchesGenderFilter(item)) continue;
        if (!App.matchesTypeFilter(slot)) continue;

        html.push(App.renderInventoryCard(item));
      }

      els.inventoryWrap.innerHTML = html.length
        ? html.join("")
        : `<div class="empty-text">조건에 맞는 옷이 없어요.</div>`;

      App.attachInventoryImageFallbacks(els.inventoryWrap);
    };

    App.renderSetInventory = function renderSetInventory() {
      if (!els.setInventoryWrap) return;

      const setItems = state.ownedItems
        .filter((item) => App.isSetItem(item) && !App.isProfileFontItem(item) && !App.isProfileEffectItem(item))
        .filter((item) => App.matchesSetTypeFilter(App.resolveItemSlot(item)));

      els.setInventoryWrap.innerHTML = setItems.length
        ? setItems.map(App.renderInventoryCard).join("")
        : `<div class="empty-text">아직 세트 옷이 없어요.</div>`;

      App.attachInventoryImageFallbacks(els.setInventoryWrap);
    };

    App.renderUniqueInventory = function renderUniqueInventory() {
      if (!els.uniqueInventoryWrap) return;

      const uniqueItems = state.ownedItems
        .filter((item) => App.isUniqueItem(item) && !App.isProfileFontItem(item) && !App.isProfileEffectItem(item))
        .filter((item) => App.matchesUniqueTypeFilter(App.resolveItemSlot(item)));

      els.uniqueInventoryWrap.innerHTML = uniqueItems.length
        ? uniqueItems.map(App.renderInventoryCard).join("")
        : `<div class="empty-text">아직 스페셜 옷이 없어요.</div>`;

      App.attachInventoryImageFallbacks(els.uniqueInventoryWrap);
    };

    App.updateSubtabFilterVisibility = function updateSubtabFilterVisibility(tabName) {
      const showAvatarFilters = tabName === "avatar";
      const showSetFilters = tabName === "set";
      const showUniqueFilters = tabName === "unique";

      if (els.inventoryGenderFilterBar) {
        const section = els.inventoryGenderFilterBar.closest(".inventory-filter-section");
        if (section) section.style.display = showAvatarFilters ? "" : "none";
      }

      if (els.inventoryTypeFilterBar) {
        const section = els.inventoryTypeFilterBar.closest(".inventory-filter-section");
        if (section) section.style.display = showAvatarFilters ? "" : "none";
      }

      if (els.setTypeFilterBar) {
        const section = els.setTypeFilterBar.closest(".inventory-filter-section");
        if (section) section.style.display = showSetFilters ? "" : "none";
      }

      if (els.uniqueTypeFilterBar) {
        const section = els.uniqueTypeFilterBar.closest(".inventory-filter-section");
        if (section) section.style.display = showUniqueFilters ? "" : "none";
      }
    };

    App.setActiveEditSubtab = function setActiveEditSubtab(tabName = "avatar") {
      state.activeEditSubtab = tabName;

      $$(".avatar-edit-subtab-btn, .kids-tab-btn").forEach((btn) => {
        if (!btn.dataset.editSubtab) return;
        btn.classList.toggle("is-active", btn.dataset.editSubtab === tabName);
      });

      App.setPanelVisible(els.avatarEditSubpanelAvatar, tabName === "avatar");
      App.setPanelVisible(els.avatarEditSubpanelSet, tabName === "set");
      App.setPanelVisible(els.avatarEditSubpanelUnique, tabName === "unique");

      App.updateSubtabFilterVisibility(tabName);

      if (tabName === "set") {
        App.renderSetInventory();
        return;
      }

      if (tabName === "unique") {
        App.renderUniqueInventory();
        return;
      }

      App.renderInventory();
    };

    App.renderCurrentEditSubtab = function renderCurrentEditSubtab() {
      if (state.activeEditSubtab === "set") {
        App.renderSetInventory();
        return;
      }

      if (state.activeEditSubtab === "unique") {
        App.renderUniqueInventory();
        return;
      }

      App.renderInventory();
    };

    App.loadInventoryIfNeeded = async function loadInventoryIfNeeded(force = false) {
      if (!App.isOwner || !API.avatarInventoryUrl) {
        App.mergeEffectInventoryFromOwnedItems();
        App.renderCurrentEditSubtab();
        App.renderSetInventory();
        App.renderUniqueInventory();
        App.renderFontInventory();
        App.renderEffectInventory();
        return null;
      }

      if (state.inventoryLoaded && !force) {
        App.mergeEffectInventoryFromOwnedItems();
        App.renderCurrentEditSubtab();
        App.renderSetInventory();
        App.renderUniqueInventory();
        App.renderFontInventory();
        App.renderEffectInventory();
        App.updateEquippedSlotState();
        App.setActiveEditSubtab(state.activeEditSubtab || "avatar");
        return { ok: true, inventory: state.ownedItems };
      }

      if (state.inventoryPromise && !force) return state.inventoryPromise;

      if (els.inventoryWrap) els.inventoryWrap.innerHTML = `<div class="empty-text">옷장을 여는 중...</div>`;
      if (els.setInventoryWrap) els.setInventoryWrap.innerHTML = `<div class="empty-text">세트 옷을 불러오는 중...</div>`;
      if (els.uniqueInventoryWrap) els.uniqueInventoryWrap.innerHTML = `<div class="empty-text">스페셜 옷을 불러오는 중...</div>`;
      if (els.fontInventoryWrap) els.fontInventoryWrap.innerHTML = `<div class="empty-text">글씨체를 불러오는 중...</div>`;
      if (els.effectInventoryWrap) els.effectInventoryWrap.innerHTML = `<div class="empty-text">효과를 불러오는 중...</div>`;

      state.inventoryPromise = (async () => {
        const result = await App.fetchJson(API.avatarInventoryUrl);

        if (!result.ok) {
          const msg = App.escapeHtml(result.error || "옷장을 불러오지 못했어요.");

          if (els.inventoryWrap) els.inventoryWrap.innerHTML = `<div class="empty-text">${msg}</div>`;
          if (els.setInventoryWrap) els.setInventoryWrap.innerHTML = `<div class="empty-text">${msg}</div>`;
          if (els.uniqueInventoryWrap) els.uniqueInventoryWrap.innerHTML = `<div class="empty-text">${msg}</div>`;
          if (els.fontInventoryWrap) els.fontInventoryWrap.innerHTML = `<div class="empty-text">${msg}</div>`;
          if (els.effectInventoryWrap) els.effectInventoryWrap.innerHTML = `<div class="empty-text">${msg}</div>`;

          App.mergeEffectInventoryFromOwnedItems();
          return result;
        }

        state.ownedItems = App.normalizeInventoryItems(result.inventory || result.items || []);

        if (Array.isArray(result.effects)) {
          state.ownedEffects = App.normalizeOwnedEffects(result.effects);
        }

        App.mergeEffectInventoryFromOwnedItems();
        state.inventoryLoaded = true;

        App.renderCurrentEditSubtab();
        App.renderSetInventory();
        App.renderUniqueInventory();
        App.renderFontInventory();
        App.renderEffectInventory();
        App.updateEquippedSlotState();
        App.setActiveEditSubtab(state.activeEditSubtab || "avatar");

        return result;
      })();

      try {
        return await state.inventoryPromise;
      } finally {
        state.inventoryPromise = null;
      }
    };

    App.updateSaveHint = function updateSaveHint(text = "") {
      if (els.saveHint) els.saveHint.textContent = text;
    };

    App.updateFontSaveHint = function updateFontSaveHint(text = "", isError = false) {
      if (!els.fontSaveHint) return;

      els.fontSaveHint.textContent = text;
      els.fontSaveHint.classList.toggle("font-save-hint-error", Boolean(isError));
      els.fontSaveHint.classList.toggle("font-save-hint-ok", Boolean(text && !isError));
    };

    App.saveCurrentState = async function saveCurrentState() {
      if (!App.isOwner || state.isSaving || !API.avatarSaveUrl) return false;

      state.isSaving = true;

      if (els.saveAvatarChangesBtn) {
        els.saveAvatarChangesBtn.disabled = true;
        els.saveAvatarChangesBtn.textContent = "저장 중...";
      }

      App.updateSaveHint("아바타 저장 중...");

      try {
        const equipped = {};

        for (const slot of App.SUPPORTED_SLOTS) {
          equipped[`${slot}_item_id`] = state.draftAvatar[`${slot}_item_id`] || null;
        }

        const result = await App.postJson(API.avatarSaveUrl, {
          gender: state.draftAvatar.gender || "male",
          equipped,
        });

        if (!result.ok) {
          alert(result.error || "아바타 저장에 실패했어요.");
          App.updateSaveHint("저장 실패 😢");
          return false;
        }

        state.avatar = App.normalizeAvatarState(result.avatar || state.avatar);
        state.draftAvatar = App.deepCopy(state.avatar);
        state.ownedItems = App.normalizeInventoryItems(result.inventory || result.items || state.ownedItems);

        if (Array.isArray(result.effects)) {
          state.ownedEffects = App.normalizeOwnedEffects(result.effects);
        }

        App.mergeEffectInventoryFromOwnedItems();
        state.inventoryLoaded = true;

        App.renderAll();
        App.updateSaveHint("아바타 저장 완료! ✨");

        return true;
      } finally {
        state.isSaving = false;

        if (els.saveAvatarChangesBtn) {
          els.saveAvatarChangesBtn.disabled = false;
          els.saveAvatarChangesBtn.textContent = "저장하기";
        }
      }
    };

    App.buildLocalViewerFontPrefAfterApply = function buildLocalViewerFontPrefAfterApply(selectedItem, payload) {
      const safeSelectedItem = selectedItem && App.isProfileFontItem(selectedItem) ? selectedItem : null;

      return {
        ...state.viewerFontPref,

        nickname_font_item_id: safeSelectedItem ? safeSelectedItem.item_id : null,
        nickname_font_key: safeSelectedItem?.font_key || "",
        nickname_effect_key: payload.effect_key || "none",
        nickname_scale: Number(payload.nickname_scale ?? App.DEFAULT_NICKNAME_SCALE),
        nickname_letter_spacing: Number(payload.nickname_letter_spacing ?? App.DEFAULT_NICKNAME_SPACING),
        nickname_color: "#73c5ff",

        title_font_item_id: safeSelectedItem ? safeSelectedItem.item_id : null,
        title_font_key: safeSelectedItem?.font_key || "",
        title_effect_key: "none",
        title_color: "#403932",

        content_font_item_id: safeSelectedItem ? safeSelectedItem.item_id : null,
        content_font_key: safeSelectedItem?.font_key || "",
        content_effect_key: "none",
        content_color: "#403932",
      };
    };

    App.saveFontPreference = async function saveFontPreference() {
      if (!App.isOwner || !API.avatarSaveFontUrl) return;

      const isReset = els.resetFontDefaultBtn?.dataset.resetMode === "true";

      const selectedCandidate = state.selectedFontItemId
        ? App.itemByItemId(state.selectedFontItemId)
        : null;

      const selectedItem = selectedCandidate && App.isProfileFontItem(selectedCandidate)
        ? selectedCandidate
        : null;

      if (selectedCandidate && !selectedItem) {
        state.selectedFontItemId = null;
        state.previewFont.itemId = null;
        state.previewFont.fontKey = "";
      }

      const currentFontPage = state.fontPage;
      const currentEffectPage = state.effectPage;

      const payload = {
        font_item_id: isReset ? null : (selectedItem ? selectedItem.item_id : null),

        apply_to_nickname: true,
        apply_to_title: true,
        apply_to_content: true,

        nickname_color: "#73c5ff",
        title_color: "#403932",
        content_color: "#403932",

        effect_key: isReset ? "none" : App.currentSelectedEffectKey(),

        nickname_scale: isReset
          ? App.DEFAULT_NICKNAME_SCALE
          : Number(state.previewFont.nicknameScale ?? App.DEFAULT_NICKNAME_SCALE),

        nickname_letter_spacing: isReset
          ? App.DEFAULT_NICKNAME_SPACING
          : Number(state.previewFont.nicknameLetterSpacing ?? App.DEFAULT_NICKNAME_SPACING),

        reset_default: isReset,
      };

      try {
        if (els.saveFontPreferenceBtn) {
          els.saveFontPreferenceBtn.disabled = true;
          els.saveFontPreferenceBtn.textContent = "저장 중...";
        }

        App.updateFontSaveHint("글씨체/효과 저장 중...");

        const result = await App.postJson(API.avatarSaveFontUrl, payload);

        if (!result.ok) {
          App.updateFontSaveHint(result.error || "글씨체/효과 저장에 실패했어요.", true);
          return;
        }

        if (isReset) {
          state.viewerFontPref = { ...App.EMPTY_FONT_PREF };
          state.ownerFontPref = { ...App.EMPTY_FONT_PREF };
          state.selectedFontItemId = null;
        } else {
          state.viewerFontPref = {
            ...App.buildLocalViewerFontPrefAfterApply(selectedItem, payload),
            ...(result.font_pref || {}),
            title_effect_key: "none",
            content_effect_key: "none",
            title_color: "#403932",
            content_color: "#403932",
          };

          state.ownerFontPref = { ...state.viewerFontPref };
          state.selectedFontItemId = selectedItem ? Number(selectedItem.item_id) : null;
        }

        state.previewFont = {
          itemId: state.selectedFontItemId,
          fontKey: isReset
            ? ""
            : (selectedItem?.font_key || state.viewerFontPref.nickname_font_key || ""),
          effectKey: state.viewerFontPref.nickname_effect_key || "none",
          nicknameScale: Number(state.viewerFontPref.nickname_scale ?? App.DEFAULT_NICKNAME_SCALE),
          nicknameLetterSpacing: Number(
            state.viewerFontPref.nickname_letter_spacing ?? App.DEFAULT_NICKNAME_SPACING
          ),
        };

        if (els.fontEffectSelect) {
          els.fontEffectSelect.value = state.viewerFontPref.nickname_effect_key || "none";
        }

        state.fontPage = currentFontPage;
        state.effectPage = currentEffectPage;

        App.applyCurrentFontPreferenceToEditors();
        App.renderFontInventory({ preservePage: true });
        App.renderEffectInventory({ preservePage: true });
        App.updateFontEffectCarousels();

        App.updateFontSaveHint("글씨체/효과 저장 완료! ✨");

        if (els.resetFontDefaultBtn) {
          els.resetFontDefaultBtn.dataset.resetMode = "false";
        }
      } finally {
        if (els.saveFontPreferenceBtn) {
          els.saveFontPreferenceBtn.disabled = false;
          els.saveFontPreferenceBtn.textContent = "글씨체/효과 저장하기";
        }
      }
    };
  });
})();