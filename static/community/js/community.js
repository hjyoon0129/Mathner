document.addEventListener("DOMContentLoaded", function () {
  CommunityApp.init();
});

const CommunityApp = {
  FONT_CLASS_LIST: [
    "font-default",
    "font-gaegu",
    "font-dongle",
    "font-gowun_batang",
    "font-nanum_pen",
    "font-dokdo",
    "font-bubblegum_sans",
    "font-delius_swash_caps",
    "font-boogaloo",
    "font-love_ya_like_a_sister",
    "font-luckiest_guy",
    "font-coming_soon",
    "font-life_savers",
    "font-chewy",
    "font-cabin_sketch",
    "font-mouse_memoirs",
    "font-londrina_shadow",
    "font-modak",
    "font-amatic_sc",
    "font-capriola",
    "font-mclaren",
  ],

  EFFECT_CLASS_LIST: [
    "effect-none",
    "effect-neon-blue",
    "effect-rainbow-flow",
    "effect-gold-glow",
    "effect-sparkle",
    "effect-glitch",
    "effect-float-wave",
    "effect-fire-glow",
    "effect-ice-glow",
  ],

  observer: null,
  isApplyingNicknameStyles: false,

  init() {
    this.initCommunitySortDropdown();
    this.initCommunityCommentToggles();
    this.initCommunityCollapseAll();
    this.applyNicknameStyles(document);
    this.observeNicknameMutations();
  },

  qs(selector, root = document) {
    return root.querySelector(selector);
  },

  qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  },

  normalizeKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/-/g, "_");
  },

  fontClassFromKey(key) {
    const normalized = this.normalizeKey(key);
    return normalized ? `font-${normalized}` : "font-default";
  },

  effectClassFromKey(key) {
    const normalized = this.normalizeKey(key || "none").replace(/_/g, "-");
    return `effect-${normalized || "none"}`;
  },

  clearFontClasses(el) {
    if (!el) return;
    this.FONT_CLASS_LIST.forEach((cls) => el.classList.remove(cls));
  },

  clearEffectClasses(el) {
    if (!el) return;
    this.EFFECT_CLASS_LIST.forEach((cls) => el.classList.remove(cls));
  },

  getExistingFontClass(el) {
    if (!el) return "";
    return this.FONT_CLASS_LIST.find((cls) => el.classList.contains(cls)) || "";
  },

  getExistingEffectClass(el) {
    if (!el) return "";
    return this.EFFECT_CLASS_LIST.find((cls) => el.classList.contains(cls)) || "";
  },

  findNicknameSourceElement(el) {
    if (!el) return null;

    return (
      el.closest("[data-nickname-font-key]") ||
      el.closest("[data-font-key]") ||
      el.closest(".community-writer-box") ||
      el.closest(".community-writer-inline") ||
      el.closest(".comment-author-wrap") ||
      el.closest(".detail-meta-item") ||
      el.closest(".community-notice-meta") ||
      el
    );
  },

  readDatasetValue(el, keys) {
    for (const key of keys) {
      if (el?.dataset?.[key] !== undefined && el.dataset[key] !== "") {
        return el.dataset[key];
      }
    }
    return "";
  },

  applySingleNicknameStyle(el) {
    if (!el) return;

    const source = this.findNicknameSourceElement(el);

    const datasetFontKey =
      this.readDatasetValue(el, ["nicknameFontKey", "fontKey", "authorFontKey"]) ||
      this.readDatasetValue(source, ["nicknameFontKey", "fontKey", "authorFontKey"]);

    const datasetEffectKey =
      this.readDatasetValue(el, ["nicknameEffectKey", "effectKey", "authorEffectKey"]) ||
      this.readDatasetValue(source, ["nicknameEffectKey", "effectKey", "authorEffectKey"]) ||
      "none";

    const datasetScale =
      this.readDatasetValue(el, ["nicknameScale", "scale"]) ||
      this.readDatasetValue(source, ["nicknameScale", "scale"]);

    const datasetSpacing =
      this.readDatasetValue(el, ["nicknameLetterSpacing", "letterSpacing"]) ||
      this.readDatasetValue(source, ["nicknameLetterSpacing", "letterSpacing"]);

    const finalFontClass = datasetFontKey
      ? this.fontClassFromKey(datasetFontKey)
      : (this.getExistingFontClass(el) || "font-default");

    const finalEffectClass = datasetEffectKey
      ? this.effectClassFromKey(datasetEffectKey)
      : (this.getExistingEffectClass(el) || "effect-none");

    const nextFontSize = (() => {
      if (!datasetScale) return "";
      const scaleNum = Number(datasetScale);
      if (Number.isNaN(scaleNum) || scaleNum <= 0) return "";
      return `${Math.round(15 * scaleNum)}px`;
    })();

    const nextLetterSpacing = (() => {
      if (datasetSpacing === "") return "";
      const spacingNum = Number(datasetSpacing);
      if (Number.isNaN(spacingNum)) return "";
      return `${spacingNum}px`;
    })();

    const normalizedEffectKey = this.normalizeKey(datasetEffectKey);
    const hasRainbow = finalEffectClass === "effect-rainbow-flow" || normalizedEffectKey === "rainbow_flow";

    const currentFontClass = this.getExistingFontClass(el) || "font-default";
    const currentEffectClass = this.getExistingEffectClass(el) || "effect-none";
    const currentFontSize = el.style.fontSize || "";
    const currentLetterSpacing = el.style.letterSpacing || "";
    const currentFill = el.style.webkitTextFillColor || "";
    const nextFill = hasRainbow ? "transparent" : "";

    const noChange =
      currentFontClass === finalFontClass &&
      currentEffectClass === finalEffectClass &&
      currentFontSize === nextFontSize &&
      currentLetterSpacing === nextLetterSpacing &&
      currentFill === nextFill &&
      el.style.visibility === "visible" &&
      el.style.opacity === "1";

    if (noChange) return;

    this.clearFontClasses(el);
    this.clearEffectClasses(el);

    el.classList.add(finalFontClass);
    el.classList.add(finalEffectClass);

    if (nextFontSize) {
      el.style.fontSize = nextFontSize;
    }

    if (nextLetterSpacing !== "") {
      el.style.letterSpacing = nextLetterSpacing;
    }

    if (hasRainbow) {
      el.style.color = "transparent";
      el.style.webkitTextFillColor = "transparent";
    } else {
      el.style.webkitTextFillColor = "";
    }

    el.style.visibility = "visible";
    el.style.opacity = "1";

    if (!el.style.transform) {
      el.style.transform = "translateZ(0)";
    }
  },

  applyNicknameStyles(root = document) {
    if (this.isApplyingNicknameStyles) return;

    this.isApplyingNicknameStyles = true;

    try {
      const targets = this.qsa(
        [
          ".nickname-text",
          ".nickname-strong",
          ".community-writer-box .nickname-strong",
          ".community-writer-inline .nickname-strong",
          ".comment-author-wrap .nickname-strong",
          ".detail-meta .nickname-strong",
          ".community-notice-meta .nickname-strong",
        ].join(", "),
        root
      );

      targets.forEach((el) => this.applySingleNicknameStyle(el));
    } finally {
      this.isApplyingNicknameStyles = false;
    }
  },

  observeNicknameMutations() {
    const targetRoot = document.body;
    if (!targetRoot || typeof MutationObserver === "undefined") return;

    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      if (this.isApplyingNicknameStyles) return;

      let shouldApply = false;

      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length) {
          for (const node of mutation.addedNodes) {
            if (
              node instanceof HTMLElement &&
              (
                node.matches?.(".nickname-text, .nickname-strong") ||
                node.querySelector?.(".nickname-text, .nickname-strong")
              )
            ) {
              shouldApply = true;
              break;
            }
          }
        }

        if (
          mutation.type === "attributes" &&
          mutation.target instanceof HTMLElement &&
          (
            mutation.target.classList.contains("nickname-text") ||
            mutation.target.classList.contains("nickname-strong")
          )
        ) {
          shouldApply = true;
        }

        if (shouldApply) break;
      }

      if (shouldApply) {
        window.requestAnimationFrame(() => {
          this.applyNicknameStyles(document);
        });
      }
    });

    this.observer.observe(targetRoot, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "data-font-key",
        "data-effect-key",
        "data-nickname-font-key",
        "data-nickname-effect-key",
        "data-nickname-scale",
        "data-nickname-letter-spacing",
      ],
    });
  },

  initCommunitySortDropdown() {
    const dropdown = this.qs("#communitySortDropdown");
    const trigger = this.qs("#communitySortTrigger");
    const menu = this.qs("#communitySortMenu");
    const input = this.qs("#communitySortInput");
    const label = this.qs("#communitySortLabel");
    const form = this.qs("#communitySearchForm");

    if (!dropdown || !trigger || !menu || !input || !label || !form) return;

    const options = this.qsa(".community-sort-option", menu);

    const closeMenu = () => {
      menu.classList.remove("is-open");
      trigger.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    };

    const openMenu = () => {
      menu.classList.add("is-open");
      trigger.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
    };

    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (menu.classList.contains("is-open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    options.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const value = (btn.dataset.sortValue || "latest").trim();
        const text = btn.textContent.trim();

        input.value = value;
        label.textContent = text;

        options.forEach((opt) => opt.classList.remove("is-active"));
        btn.classList.add("is-active");

        closeMenu();

        setTimeout(() => {
          form.submit();
        }, 0);
      });
    });

    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target)) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeMenu();
      }
    });
  },

  initCommunityCommentToggles() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(
        ".reply-toggle-btn, .comment-edit-toggle-btn, .comment-collapse-btn"
      );
      if (!btn) return;

      const targetId = btn.getAttribute("data-target");
      const target = document.getElementById(targetId);
      if (!target) return;

      if (btn.classList.contains("comment-collapse-btn")) {
        target.classList.toggle("is-collapsed");
        btn.classList.toggle("is-open", !target.classList.contains("is-collapsed"));
        return;
      }

      target.classList.toggle("is-open");
    });
  },

  initCommunityCollapseAll() {
    const toggleAllBtn = this.qs("#toggleAllCommentsBtn");
    if (!toggleAllBtn) return;

    let collapsed = false;

    toggleAllBtn.addEventListener("click", () => {
      collapsed = !collapsed;

      this.qsa(".comment-children").forEach((el) => {
        el.classList.toggle("is-collapsed", collapsed);
      });

      this.qsa(".comment-collapse-btn").forEach((btn) => {
        btn.classList.toggle("is-open", !collapsed);
      });

      toggleAllBtn.textContent = collapsed ? "Expand All" : "Collapse All";
    });
  },
};