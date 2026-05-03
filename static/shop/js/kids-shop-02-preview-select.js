// static/shop/js/kids-shop-02-preview-select.js

(function () {
  "use strict";

  const S = window.MathnerShop;
  if (!S) return;

  function ensurePreviewStage(card) {
    if (!card) return;

    const thumb = card.querySelector(".item-thumb");
    if (!thumb) return;

    if (card.classList.contains("font-card")) {
      thumb.classList.add("font-thumb");
    }

    if (card.classList.contains("effect-card")) {
      thumb.classList.add("effect-thumb");
    }

    const preview = thumb.querySelector(".font-preview, .effect-preview, .shop-preview-text");
    if (!preview) return;

    let stage = thumb.querySelector(".shop-preview-stage");

    if (!stage) {
      stage = document.createElement("div");
      stage.className = "shop-preview-stage";
      thumb.insertBefore(stage, preview);
      stage.appendChild(preview);
    } else if (preview.parentElement !== stage) {
      stage.appendChild(preview);
    }
  }

  function createSelectLabel(labelText) {
    const label = document.createElement("label");
    label.className = "preview-select-label";

    const span = document.createElement("span");
    span.textContent = labelText;

    label.appendChild(span);
    return label;
  }

  function ensureFontEffectSelect(card) {
    if (!card || !card.classList.contains("font-card")) return;

    let select = card.querySelector(".shop-font-effect-select");
    if (select) return;

    const label = createSelectLabel("Preview Effect");

    select = document.createElement("select");
    select.className = "preview-select shop-font-effect-select";

    S.EFFECT_OPTIONS.forEach(([value, text]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      select.appendChild(option);
    });

    label.appendChild(select);

    const price = card.querySelector(".item-price");
    if (price) {
      card.insertBefore(label, price);
    } else {
      card.appendChild(label);
    }
  }

  function ensureEffectFontSelect(card) {
    if (!card || !card.classList.contains("effect-card")) return;

    let select = card.querySelector(".shop-effect-preview-select");
    if (select) return;

    const label = createSelectLabel("Preview Font");

    select = document.createElement("select");
    select.className = "preview-select shop-effect-preview-select";
    select.dataset.effectPreview = card.dataset.effectId || "none";

    S.fonts.collectFontOptions().forEach(([value, text]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      select.appendChild(option);
    });

    label.appendChild(select);

    const price = card.querySelector(".item-price");
    if (price) {
      card.insertBefore(label, price);
    } else {
      card.appendChild(label);
    }
  }

  function syncFontCardPreview(card) {
    if (!card) return;

    const previewTarget = S.fonts.getFontPreviewTarget(card);
    const effectSelect = card.querySelector(".shop-font-effect-select");
    if (!previewTarget) return;

    const fontKey = S.fonts.getFontKeyFromCard(card);
    const canonical = S.getCanonicalFontKey(fontKey);
    const effectKey = effectSelect ? effectSelect.value : "none";

    card.dataset.itemFontFamily = canonical;

    S.applyPreviewFont(previewTarget, canonical);
    S.applyPreviewEffect(previewTarget, effectKey);
  }

  function syncEffectPreview(selectEl) {
    if (!selectEl) return;

    const card = selectEl.closest(".effect-card");
    if (!card) return;

    const effectKey = card.dataset.effectId || selectEl.dataset.effectPreview || "none";
    const target = S.fonts.getEffectPreviewTarget(card);
    if (!target) return;

    const canonical = S.getCanonicalFontKey(selectEl.value || "default");

    selectEl.value = canonical;
    selectEl.dataset.effectPreview = effectKey;

    S.applyPreviewFont(target, canonical);
    S.applyPreviewEffect(target, effectKey);
  }

  function closeAllCustomSelects(exceptWrapper = null) {
    document.querySelectorAll(".custom-select.is-open").forEach((wrapper) => {
      if (wrapper !== exceptWrapper) {
        wrapper.classList.remove("is-open");

        const card = wrapper.closest(".cute-item-card");
        if (card) card.classList.remove("select-open");
      }
    });
  }

  function getOptionSignature(select) {
    return Array.from(select.options)
      .map((option) => `${option.value}::${option.textContent}`)
      .join("||");
  }

  function updateCustomSelect(select) {
    const wrapper = select?._customSelectWrapper;
    if (!select || !wrapper) return;

    const selectedOption = select.options[select.selectedIndex];
    const text = selectedOption ? selectedOption.textContent : "Select";
    const triggerText = wrapper.querySelector(".custom-select-text");

    if (triggerText) {
      triggerText.textContent = text;
    }

    wrapper.querySelectorAll(".custom-select-option").forEach((btn) => {
      btn.classList.toggle("is-selected", btn.dataset.value === select.value);
    });
  }

  function buildCustomMenu(select, wrapper) {
    const menu = wrapper.querySelector(".custom-select-menu");
    if (!menu) return;

    menu.innerHTML = "";

    Array.from(select.options).forEach((option) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "custom-select-option";
      item.dataset.value = option.value;
      item.textContent = option.textContent;

      item.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));

        updateCustomSelect(select);

        wrapper.classList.remove("is-open");

        const card = wrapper.closest(".cute-item-card");
        if (card) card.classList.remove("select-open");
      });

      menu.appendChild(item);
    });

    wrapper.dataset.optionSignature = getOptionSignature(select);
    updateCustomSelect(select);
  }

  function rebuildCustomSelectIfNeeded(select) {
    const wrapper = select?._customSelectWrapper;
    if (!select || !wrapper) return;

    if (select.classList.contains("shop-effect-preview-select")) {
      S.fonts.localizeFontSelectOptions(select);
    }

    const nextSignature = getOptionSignature(select);
    const prevSignature = wrapper.dataset.optionSignature || "";

    if (nextSignature !== prevSignature) {
      buildCustomMenu(select, wrapper);
      return;
    }

    updateCustomSelect(select);
  }

  function replaceNativeSelect(select) {
    if (!select) return;

    if (select.classList.contains("shop-effect-preview-select")) {
      S.fonts.localizeFontSelectOptions(select);
    }

    if (select.dataset.customSelectReady === "true") {
      rebuildCustomSelectIfNeeded(select);
      return;
    }

    select.dataset.customSelectReady = "true";
    select.classList.add("native-select-hidden");

    const wrapper = document.createElement("div");
    wrapper.className = "custom-select";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "custom-select-trigger";

    const triggerText = document.createElement("span");
    triggerText.className = "custom-select-text";

    const arrow = document.createElement("span");
    arrow.className = "custom-select-arrow";
    arrow.textContent = "▾";

    trigger.appendChild(triggerText);
    trigger.appendChild(arrow);

    const menu = document.createElement("div");
    menu.className = "custom-select-menu";

    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);

    select.parentNode.insertBefore(wrapper, select.nextSibling);

    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const card = wrapper.closest(".cute-item-card");
      const willOpen = !wrapper.classList.contains("is-open");

      closeAllCustomSelects(wrapper);

      wrapper.classList.toggle("is-open", willOpen);

      if (card) {
        card.classList.toggle("select-open", willOpen);
      }
    });

    select._customSelectWrapper = wrapper;

    buildCustomMenu(select, wrapper);
  }

  function setupPreviewCards() {
    document.querySelectorAll(".font-card, .effect-card").forEach((card) => {
      ensurePreviewStage(card);
    });

    document.querySelectorAll(".font-card").forEach((card) => {
      S.fonts.localizeFontCard(card);
      ensureFontEffectSelect(card);
    });

    document.querySelectorAll(".effect-card").forEach((card) => {
      ensureEffectFontSelect(card);
    });
  }

  function bindPreviewControls() {
    document.querySelectorAll(".shop-font-effect-select").forEach((select) => {
      if (select.dataset.previewBound !== "true") {
        select.dataset.previewBound = "true";

        select.addEventListener("change", () => {
          syncFontCardPreview(select.closest(".cute-item-card"));
          updateCustomSelect(select);
        });
      }

      replaceNativeSelect(select);
      syncFontCardPreview(select.closest(".cute-item-card"));
      updateCustomSelect(select);
    });

    document.querySelectorAll(".shop-effect-preview-select").forEach((select) => {
      if (select.dataset.previewBound !== "true") {
        select.dataset.previewBound = "true";

        select.addEventListener("change", () => {
          syncEffectPreview(select);
          updateCustomSelect(select);
        });
      }

      S.fonts.localizeFontSelectOptions(select);
      replaceNativeSelect(select);
      syncEffectPreview(select);
      updateCustomSelect(select);
    });
  }

  S.preview = {
    ensurePreviewStage,
    createSelectLabel,
    ensureFontEffectSelect,
    ensureEffectFontSelect,
    syncFontCardPreview,
    syncEffectPreview,
    closeAllCustomSelects,
    updateCustomSelect,
    replaceNativeSelect,
    rebuildCustomSelectIfNeeded,
    setupPreviewCards,
    bindPreviewControls
  };
})();