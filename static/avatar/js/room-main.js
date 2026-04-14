(function () {
  "use strict";

  function boot() {
    const page = document.getElementById("avatarPage");
    if (!page) return;

    const $ = (id) => document.getElementById(id);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    const els = {
      page,
      avatarLayout: $("avatarLayout"),
      avatarHeroCard: $("avatarHeroCard"),
      stageContentCard: $("avatarStageContentCard"),
      dynamicPanelTitle: $("dynamicPanelTitle"),
      tabGuestbook: $("tab-guestbook"),
      tabDiary: $("tab-diary"),

      avatarCanvasView: $("avatarCanvasView"),
      roomOwnerName: $("roomOwnerName"),
      roomOwnerUsername: $("roomOwnerUsername"),

      inventoryWrap: $("inventoryWrap"),
      fontInventoryWrap: $("fontInventoryWrap"),
      effectInventoryWrap: $("effectInventoryWrap"),

      avatarEditPanel: $("avatarEditPanel"),
      fontEditPanel: $("fontEditPanel"),
      openAvatarEditBtn: $("openAvatarEditBtn"),
      openFontEditBtn: $("openFontEditBtn"),
      closeEditDrawerBtn: $("closeEditDrawerBtn"),
      closeFontDrawerBtn: $("closeFontDrawerBtn"),

      saveHint: $("saveHint"),
      fontSaveHint: $("fontSaveHint"),

      confirmModal: $("confirmModal"),
      confirmOkBtn: $("confirmOkBtn"),
      confirmCancelBtn: $("confirmCancelBtn"),

      popover: $("nameVisitPopover"),
      popoverVisitBtn: $("popoverVisitBtn"),

      friendSelect: $("friendSelect"),
      visitFriendBtn: $("visitFriendBtn"),
      goMyRoomBtn: $("goMyRoomBtn"),

      toggleRoomLikeBtn: $("toggleRoomLikeBtn"),
      toggleRoomLikeBtnText: $("toggleRoomLikeBtnText"),
      sendFriendRequestBtn: $("sendFriendRequestBtn"),

      roomTodayVisits: $("roomTodayVisits"),
      roomTotalVisits: $("roomTotalVisits"),
      roomLikeCount: $("roomLikeCount"),

      fontEffectSelect: $("fontEffectSelect"),
      nicknameSizeValue: $("nicknameSizeValue"),
      nicknameSpacingValue: $("nicknameSpacingValue"),
    };

    const ds = page.dataset;
    const isOwner = ds.isOwner === "true";

    const API = {
      guestbookListUrl: ds.guestbookListUrl || "",
      guestbookCreateUrl: ds.guestbookCreateUrl || "",
      guestbookDeleteUrlBase: ds.guestbookDeleteUrlBase || "/social/api/guestbook/",
      guestbookReplyCreateUrlBase: ds.guestbookReplyCreateUrlBase || "/social/api/guestbook/",
      guestbookReplyDeleteUrlBase: ds.guestbookReplyDeleteUrlBase || "/social/api/guestbook/reply/",

      diaryCreateUrl: ds.diaryCreateUrl || "",
      diaryCalendarUrl: ds.diaryCalendarUrl || "",
      diaryDateUrlBase: ds.diaryDateUrlBase || "",
      diaryUpdateUrlBase: ds.diaryUpdateUrlBase || "/social/api/diary/",
      diaryDeleteUrlBase: ds.diaryDeleteUrlBase || "/social/api/diary/",

      avatarSaveUrl: ds.avatarSaveUrl || "",
      avatarSaveFontUrl: ds.avatarSaveFontUrl || "",
      avatarResetUrl: ds.avatarResetUrl || "",
      avatarInventoryUrl: ds.avatarInventoryUrl || "",
      friendAvatarBase: ds.friendAvatarBase || "/avatar/room/",
      myRoomUrl: ds.myRoomUrl || "/avatar/my-room/",

      socialFriendListUrl: ds.socialFriendListUrl || "",
      socialFriendRequestUrlBase: ds.socialFriendRequestUrlBase || "/social/api/friends/request/",
      socialRoomStatsUrlBase: ds.socialRoomStatsUrlBase || "/social/api/rooms/",
      socialRoomVisitUrlBase: ds.socialRoomVisitUrlBase || "/social/api/rooms/",
      socialRoomLikeUrlBase: ds.socialRoomLikeUrlBase || "/social/api/rooms/",
    };

    const SUPPORTED_SLOTS = new Set([
      "head", "eyes", "mouth", "eyebrow",
      "front_hair", "rear_hair",
      "body", "top", "cloth", "pants", "shoes", "hat",
    ]);

    const SLOT_ORDER = [
      "body", "pants", "shoes", "rear_hair", "cloth", "top",
      "head", "eyebrow", "eyes", "mouth", "front_hair", "hat",
    ];

    const SLOT_CLASS_MAP = {
      body: "avatar-layer-body",
      pants: "avatar-layer-pants",
      shoes: "avatar-layer-shoes",
      rear_hair: "avatar-layer-hair-rear",
      cloth: "avatar-layer-cloth",
      top: "avatar-layer-top",
      head: "avatar-layer-head",
      eyebrow: "avatar-layer-eyebrow",
      eyes: "avatar-layer-eyes",
      mouth: "avatar-layer-mouth",
      front_hair: "avatar-layer-hair-front",
      hat: "avatar-layer-hat",
    };

    const ALL_FONT_CLASSES = [
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
    ];

    const EFFECT_CLASS_LIST = [
      "effect-none",
      "effect-neon-blue",
      "effect-rainbow-flow",
      "effect-gold-glow",
      "effect-sparkle",
      "effect-glitch",
      "effect-float-wave",
      "effect-fire-glow",
      "effect-ice-glow",
    ];

    const EFFECT_LABEL_MAP = {
      none: "None",
      neon_blue: "Neon Blue",
      rainbow_flow: "Rainbow Flow",
      gold_glow: "Gold Glow",
      sparkle: "Sparkle",
      glitch: "Glitch",
      float_wave: "Float Wave",
      fire_glow: "Fire Glow",
      ice_glow: "Ice Glow",
    };

    const DEFAULT_NICKNAME_SCALE = 1.0;
    const DEFAULT_NICKNAME_SPACING = 0.0;
    const MIN_NICKNAME_SCALE = 0.8;
    const MAX_NICKNAME_SCALE = 1.6;
    const MIN_NICKNAME_SPACING = -1.0;
    const MAX_NICKNAME_SPACING = 6.0;

    function safeJsonParse(value, fallback) {
      try {
        return JSON.parse(value || "");
      } catch {
        return fallback;
      }
    }

    function deepCopy(obj) {
      return JSON.parse(JSON.stringify(obj ?? {}));
    }

    const EMPTY_FONT_PREF = {
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

    const state = {
      avatar: normalizeAvatarState(safeJsonParse(ds.avatarJson, {})),
      ownedItems: normalizeInventoryItems(safeJsonParse(ds.ownedAvatarItemJson, [])),
      ownedEffects: normalizeOwnedEffects(safeJsonParse(ds.ownedEffectJson, [])),
      draftAvatar: {},
      isSaving: false,

      ownerFontPref: {
        ...EMPTY_FONT_PREF,
        ...safeJsonParse(ds.roomOwnerFontPrefJson || ds.room_owner_font_pref_json, {}),
      },
      viewerFontPref: {
        ...EMPTY_FONT_PREF,
        ...safeJsonParse(ds.viewerFontPrefJson || ds.viewer_font_pref_json || ds.fontPrefJson, {}),
      },

      previewFont: {
        itemId: null,
        fontKey: "",
        effectKey: "none",
        nicknameScale: DEFAULT_NICKNAME_SCALE,
        nicknameLetterSpacing: DEFAULT_NICKNAME_SPACING,
      },

      activeInventoryGenderFilter: "all",
      activeInventoryTypeFilter: "all",
      currentMainTab: "avatar",

      today: new Date(),
      currentVisitUrl: "",
      currentPopoverAnchor: null,
      hasRecordedVisitThisPage: false,

      inventoryLoaded: Array.isArray(safeJsonParse(ds.ownedAvatarItemJson, [])),
      inventoryPromise: null,
      roomStatsPromise: null,
      friendListPromise: null,

      fontPage: 0,
      effectPage: 0,
      selectedFontItemId: null,
    };

    state.draftAvatar = deepCopy(state.avatar);

    function escapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function normalizeTypedText(value) {
      return String(value ?? "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\u00a0/g, " ")
        .replace(/^\s+/gm, "");
    }

    function escapeHtmlPreserveText(value) {
      return escapeHtml(normalizeTypedText(value));
    }

    function clamp(num, min, max) {
      return Math.min(max, Math.max(min, Number(num)));
    }

    function forceWebp(url) {
      if (!url) return "";
      const cleanUrl = String(url).trim();
      if (!cleanUrl) return "";

      const [pathOnly, ...rest] = cleanUrl.split("?");
      const query = rest.length ? `?${rest.join("?")}` : "";

      if (/\.webp$/i.test(pathOnly)) return `${pathOnly}${query}`;
      if (/\.(png|jpg|jpeg|gif)$/i.test(pathOnly)) {
        return `${pathOnly.replace(/\.(png|jpg|jpeg|gif)$/i, ".webp")}${query}`;
      }
      return `${pathOnly}${query}`;
    }

    function ownerUsername() {
      return ds.avatarOwner || "";
    }

    function ownerDisplayName() {
      return (
        ds.ownerDisplayName ||
        ds.avatarOwnerDisplayName ||
        ds.displayName ||
        ds.avatarOwner ||
        ""
      );
    }

    function normalizeSlotName(slot) {
      const s = String(slot || "").toLowerCase().trim();

      if (["front_hair", "hair_front", "hairfront", "fronthair"].includes(s)) return "front_hair";
      if (["rear_hair", "hair_rear", "hair_back", "hairrear", "hairback", "rearhair"].includes(s)) return "rear_hair";
      if (["eye", "eyes"].includes(s)) return "eyes";
      if (["eyebrow", "eyebrows", "brow", "brows"].includes(s)) return "eyebrow";
      if (["mouth", "lip", "lips"].includes(s)) return "mouth";
      if (["head", "face"].includes(s)) return "head";
      if (["body"].includes(s)) return "body";
      if (["top"].includes(s)) return "top";
      if (["cloth", "clothes", "outfit"].includes(s)) return "cloth";
      if (["pants", "bottom", "bottoms"].includes(s)) return "pants";
      if (["shoes", "shoe"].includes(s)) return "shoes";
      if (["hat", "cap"].includes(s)) return "hat";
      return s;
    }

    function getDraftKeyBySlot(slot) {
      return `${normalizeSlotName(slot)}_item_id`;
    }

    function normalizeAvatarState(raw) {
      const avatar = deepCopy(raw || {});
      const nested = avatar.equipped_item_ids || {};

      for (const slot of SUPPORTED_SLOTS) {
        const key = `${slot}_item_id`;
        if (!(key in avatar)) avatar[key] = nested[key] ?? null;
      }

      avatar.gender = avatar.gender || "male";
      return avatar;
    }

    function normalizeInventoryItems(items) {
      if (!Array.isArray(items)) return [];

      const seen = new Map();

      for (const src of items) {
        const item = { ...(src || {}) };
        item.slot = normalizeSlotName(item.slot || item.category || "");
        item.item_id = Number(item.item_id || item.id || 0);
        item.owned_item_id = Number(item.owned_item_id || 0);
        item.quantity = Number(item.quantity || 1);
        item.gender = String(item.gender || "common").toLowerCase();
        item.is_font = Boolean(item.is_font || item.category === "profile_font" || item.type === "font");
        item.font_key = String(item.font_family_key || item.font_key || "").trim();

        if (!item.item_id) continue;

        if (!seen.has(item.item_id)) {
          seen.set(item.item_id, item);
        } else {
          seen.get(item.item_id).quantity += item.quantity || 1;
        }
      }

      return Array.from(seen.values());
    }

    function normalizeOwnedEffects(items) {
      if (!Array.isArray(items)) return [];
      const seen = new Map();

      for (const raw of items) {
        const effect = { ...(raw || {}) };
        const key = String(
          effect.effect_key ||
          effect.key ||
          effect.id ||
          effect.name ||
          ""
        ).trim().toLowerCase();

        if (!key) continue;

        const normalizedKey = key.replace(/-/g, "_");
        const name = effect.name || EFFECT_LABEL_MAP[normalizedKey] || normalizedKey;
        const quantity = Number(effect.quantity || effect.count || 1);

        if (!seen.has(normalizedKey)) {
          seen.set(normalizedKey, {
            effect_key: normalizedKey,
            name,
            quantity,
          });
        } else {
          seen.get(normalizedKey).quantity += quantity;
        }
      }

      return Array.from(seen.values());
    }

    function itemByItemId(itemId) {
      const target = Number(itemId);
      if (!target) return null;
      return state.ownedItems.find((item) => Number(item.item_id) === target) || null;
    }

    function equippedItem(slot) {
      return itemByItemId(state.draftAvatar[getDraftKeyBySlot(slot)]);
    }

    function normalizeItemImageUrl(item) {
      return item?.image_url ? forceWebp(item.image_url) : "";
    }

    function avatarBaseSet(gender) {
      if (gender === "female") {
        return {
          body: forceWebp(ds.baseBodyFemale || ""),
          head: forceWebp(ds.baseHeadFemale || ""),
          rear_hair: forceWebp(ds.baseHairBackFemale || ""),
          front_hair: forceWebp(ds.baseHairFrontFemale || ""),
          eyes: forceWebp(ds.baseEyesFemale || ""),
          eyebrow: forceWebp(ds.baseEyebrowFemale || ""),
          mouth: forceWebp(ds.baseMouthFemale || ""),
        };
      }
      return {
        body: forceWebp(ds.baseBodyMale || ""),
        head: forceWebp(ds.baseHeadMale || ""),
        rear_hair: forceWebp(ds.baseHairBackMale || ""),
        front_hair: forceWebp(ds.baseHairFrontMale || ""),
        eyes: forceWebp(ds.baseEyesMale || ""),
        eyebrow: forceWebp(ds.baseEyebrowMale || ""),
        mouth: forceWebp(ds.baseMouthMale || ""),
      };
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

    function renderAvatarCanvas() {
      const canvasEl = els.avatarCanvasView;
      if (!canvasEl) return;

      canvasEl.innerHTML = "";
      const stack = document.createElement("div");
      stack.className = "avatar-stack";

      const gender = state.draftAvatar.gender || "male";
      const base = avatarBaseSet(gender);

      const sourceMap = {
        body: equippedItem("body") ? normalizeItemImageUrl(equippedItem("body")) : base.body,
        pants: equippedItem("pants") ? normalizeItemImageUrl(equippedItem("pants")) : "",
        shoes: equippedItem("shoes") ? normalizeItemImageUrl(equippedItem("shoes")) : "",
        rear_hair: equippedItem("rear_hair") ? normalizeItemImageUrl(equippedItem("rear_hair")) : base.rear_hair,
        cloth: equippedItem("cloth") ? normalizeItemImageUrl(equippedItem("cloth")) : "",
        top: equippedItem("top") ? normalizeItemImageUrl(equippedItem("top")) : "",
        head: equippedItem("head") ? normalizeItemImageUrl(equippedItem("head")) : base.head,
        eyebrow: equippedItem("eyebrow") ? normalizeItemImageUrl(equippedItem("eyebrow")) : base.eyebrow,
        eyes: equippedItem("eyes") ? normalizeItemImageUrl(equippedItem("eyes")) : base.eyes,
        mouth: equippedItem("mouth") ? normalizeItemImageUrl(equippedItem("mouth")) : base.mouth,
        front_hair: equippedItem("front_hair") ? normalizeItemImageUrl(equippedItem("front_hair")) : base.front_hair,
        hat: equippedItem("hat") ? normalizeItemImageUrl(equippedItem("hat")) : "",
      };

      const altMap = {
        body: equippedItem("body")?.name || "Avatar body",
        pants: equippedItem("pants")?.name || "Pants",
        shoes: equippedItem("shoes")?.name || "Shoes",
        rear_hair: equippedItem("rear_hair")?.name || "Avatar rear hair",
        cloth: equippedItem("cloth")?.name || "Cloth",
        top: equippedItem("top")?.name || "Top",
        head: equippedItem("head")?.name || "Avatar head",
        eyebrow: equippedItem("eyebrow")?.name || "Avatar eyebrow",
        eyes: equippedItem("eyes")?.name || "Avatar eyes",
        mouth: equippedItem("mouth")?.name || "Avatar mouth",
        front_hair: equippedItem("front_hair")?.name || "Avatar front hair",
        hat: equippedItem("hat")?.name || "Hat",
      };

      for (const slot of SLOT_ORDER) {
        const className = SLOT_CLASS_MAP[slot] || `avatar-layer-${slot.replace(/_/g, "-")}`;
        const layer = createLayer(sourceMap[slot], className, altMap[slot]);
        if (layer) stack.appendChild(layer);
      }

      canvasEl.appendChild(stack);
    }

    function fontClassFromKey(key) {
      return key ? `font-${key}` : "font-default";
    }

    function effectKeyToClass(effectKey) {
      return `effect-${String(effectKey || "none").trim().replace(/_/g, "-")}`;
    }

    function resetFontClasses(el) {
      if (!el) return;
      ALL_FONT_CLASSES.forEach((cls) => el.classList.remove(cls));
    }

    function clearEffectClasses(el) {
      if (!el) return;
      EFFECT_CLASS_LIST.forEach((cls) => el.classList.remove(cls));
    }

    function applyFontClass(el, key) {
      if (!el) return;
      resetFontClasses(el);
      el.classList.add(fontClassFromKey(key));
    }

    function applyFontEffect(el, effectKey) {
      if (!el) return;
      clearEffectClasses(el);
      el.classList.add(effectKeyToClass(effectKey || "none"));
    }

    function applyFontColor(el, color, fallback = "") {
      if (!el) return;
      el.style.color = color || fallback || "";
    }

    function applyNicknameTransform(el, scale = DEFAULT_NICKNAME_SCALE, spacing = DEFAULT_NICKNAME_SPACING) {
      if (!el) return;
      el.style.fontSize = `${19 * scale}px`;
      el.style.letterSpacing = `${spacing}px`;
    }

    function syncOwnerNickname() {
      const displayName = ownerDisplayName();
      const username = ds.avatarOwnerUsername || ds.avatarOwner || "";

      [els.roomOwnerName].filter(Boolean).forEach((el) => {
        el.textContent = displayName || username || "Player";
      });

      [els.roomOwnerUsername].filter(Boolean).forEach((el) => {
        el.textContent = username ? `@${username}` : "";
      });
    }

    function applyOwnerNicknameDisplay() {
      if (!els.roomOwnerName) return;

      const effectKey = state.ownerFontPref.nickname_effect_key || "none";

      applyFontClass(els.roomOwnerName, state.ownerFontPref.nickname_font_key || "");
      applyNicknameTransform(
        els.roomOwnerName,
        Number(state.ownerFontPref.nickname_scale ?? DEFAULT_NICKNAME_SCALE),
        Number(state.ownerFontPref.nickname_letter_spacing ?? DEFAULT_NICKNAME_SPACING)
      );

      if (effectKey === "rainbow_flow" || effectKey === "rainbow-flow") {
        els.roomOwnerName.style.color = "transparent";
        els.roomOwnerName.style.webkitTextFillColor = "transparent";
      } else {
        els.roomOwnerName.style.color = state.ownerFontPref.nickname_color || "#7ec8ff";
        els.roomOwnerName.style.webkitTextFillColor = "";
      }

      applyFontEffect(els.roomOwnerName, effectKey);
    }

    function renderShell() {
      renderAvatarCanvas();
      syncOwnerNickname();
      applyOwnerNicknameDisplay();
    }

    function setActiveSideTab(tabName) {
      $$(".side-tab-btn[data-tab-target]").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.tabTarget === tabName);
      });
    }

    function updateMainPanels(tabName) {
      if (!els.avatarHeroCard || !els.stageContentCard) return;

      const showAvatar = tabName === "avatar" || tabName === "edit";
      els.avatarHeroCard.classList.toggle("is-visible", showAvatar);
      els.stageContentCard.classList.toggle("is-visible", !showAvatar);

      if (els.tabGuestbook) els.tabGuestbook.classList.toggle("active", tabName === "guestbook");
      if (els.tabDiary) els.tabDiary.classList.toggle("active", tabName === "diary");

      if (tabName === "guestbook" && els.dynamicPanelTitle) els.dynamicPanelTitle.textContent = "Guestbook";
      if (tabName === "diary" && els.dynamicPanelTitle) els.dynamicPanelTitle.textContent = "Diary";
    }

    function openEditMode(panelName) {
      state.currentMainTab = "edit";
      if (els.avatarLayout) els.avatarLayout.classList.add("is-editing");
      setActiveSideTab("edit");
      updateMainPanels("edit");

      if (els.avatarEditPanel) els.avatarEditPanel.hidden = panelName !== "avatar";
      if (els.fontEditPanel) els.fontEditPanel.hidden = panelName !== "font";

      if (els.openAvatarEditBtn) els.openAvatarEditBtn.classList.toggle("active", panelName === "avatar");
      if (els.openFontEditBtn) els.openFontEditBtn.classList.toggle("active", panelName === "font");
    }

    function closeEditMode() {
      if (els.avatarLayout) els.avatarLayout.classList.remove("is-editing");
      if (els.avatarEditPanel) els.avatarEditPanel.hidden = true;
      if (els.fontEditPanel) els.fontEditPanel.hidden = true;
      if (els.openAvatarEditBtn) els.openAvatarEditBtn.classList.remove("active");
      if (els.openFontEditBtn) els.openFontEditBtn.classList.remove("active");
    }

    function getCsrfToken() {
      const input = document.querySelector('input[name="csrfmiddlewaretoken"]');
      if (input?.value) return input.value;

      const meta = document.querySelector('meta[name="csrf-token"]');
      if (meta?.content) return meta.content;

      const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
      return match ? decodeURIComponent(match[1]) : "";
    }

    async function fetchJson(url, options = {}) {
      try {
        const response = await fetch(url, {
          credentials: "same-origin",
          headers: {
            "X-Requested-With": "XMLHttpRequest",
            ...(options.headers || {}),
          },
          ...options,
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          return {
            ok: false,
            status: response.status,
            error: data?.error || "Request failed.",
            ...data,
          };
        }
        return { ok: true, ...data };
      } catch (error) {
        return {
          ok: false,
          error: error?.message || "Network error.",
        };
      }
    }

    async function postJson(url, payload) {
      return fetchJson(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        body: JSON.stringify(payload || {}),
      });
    }

    async function withPending(key, fn, force = false) {
      if (!force && state[key]) return state[key];
      state[key] = (async () => fn())();
      try {
        return await state[key];
      } finally {
        state[key] = null;
      }
    }

    function buildUrl(base, username, suffix = "") {
      const cleanBase = String(base || "").replace(/\/+$/, "");
      const cleanUser = encodeURIComponent(String(username || "").replace(/^\/+|\/+$/g, ""));
      return `${cleanBase}/${cleanUser}${suffix || ""}`;
    }

    function setRoomStats(stats) {
      if (!stats) return;
      if (els.roomTodayVisits) els.roomTodayVisits.textContent = stats.today_visits ?? 0;
      if (els.roomTotalVisits) els.roomTotalVisits.textContent = stats.total_visits ?? 0;
      if (els.roomLikeCount) els.roomLikeCount.textContent = stats.like_count ?? 0;

      if (els.toggleRoomLikeBtn) els.toggleRoomLikeBtn.classList.toggle("is-liked", Boolean(stats.liked_by_me));
      if (els.toggleRoomLikeBtnText) {
        els.toggleRoomLikeBtnText.textContent = stats.liked_by_me ? "Liked" : "Like";
      }
    }

    async function loadRoomStats(force = false) {
      const username = ownerUsername();
      if (!username || !API.socialRoomStatsUrlBase) return null;

      return withPending("roomStatsPromise", async () => {
        const result = await fetchJson(buildUrl(API.socialRoomStatsUrlBase, username, "/stats/"));
        if (result.ok && result.stats) setRoomStats(result.stats);
        return result;
      }, force);
    }

    async function recordRoomVisit(force = false) {
      const username = ownerUsername();
      if (!username || !API.socialRoomVisitUrlBase) return null;
      if (!force && state.hasRecordedVisitThisPage) return null;

      const result = await postJson(buildUrl(API.socialRoomVisitUrlBase, username, "/visit/"), {});
      if (result.ok) {
        state.hasRecordedVisitThisPage = true;
        if (result.stats) setRoomStats(result.stats);
      }
      return result;
    }

    async function loadFriendSelectOptions(force = false) {
      if (!els.friendSelect || !API.socialFriendListUrl) return null;
      if (!force && state.friendOptionsLoaded) return null;

      return withPending("friendListPromise", async () => {
        const result = await fetchJson(API.socialFriendListUrl);
        if (!result.ok) return result;

        const current = els.friendSelect.value;
        const options = [`<option value="">Choose friend</option>`];
        for (const friend of result.friends || []) {
          const username = escapeHtml(friend.username || "");
          const name = escapeHtml(friend.display_name || friend.username || "");
          options.push(`<option value="${username}">${name}</option>`);
        }
        els.friendSelect.innerHTML = options.join("");
        if (current) els.friendSelect.value = current;

        state.friendOptionsLoaded = true;
        return result;
      }, force);
    }

    function closeNamePopover() {
      if (!els.popover) return;
      els.popover.classList.add("is-hidden");
      els.popover.style.left = "-9999px";
      els.popover.style.top = "-9999px";
      state.currentVisitUrl = "";
      state.currentPopoverAnchor = null;
    }

    function positionPopover() {
      if (!els.popover || els.popover.classList.contains("is-hidden") || !state.currentPopoverAnchor) return;

      const rect = state.currentPopoverAnchor.getBoundingClientRect();
      const popRect = els.popover.getBoundingClientRect();

      let left = window.scrollX + rect.right + 8;
      let top = window.scrollY + rect.top;

      const maxLeft = window.scrollX + window.innerWidth - popRect.width - 12;
      const maxTop = window.scrollY + window.innerHeight - popRect.height - 12;

      if (left > maxLeft) left = window.scrollX + rect.left - popRect.width - 8;
      if (left < window.scrollX + 8) left = window.scrollX + 8;
      if (top > maxTop) top = maxTop;
      if (top < window.scrollY + 8) top = window.scrollY + 8;

      els.popover.style.left = `${left}px`;
      els.popover.style.top = `${top}px`;
    }

    function openNamePopover(target, roomUrl) {
      if (!els.popover || !target || !roomUrl) return;
      state.currentVisitUrl = roomUrl;
      state.currentPopoverAnchor = target;
      els.popover.classList.remove("is-hidden");
      positionPopover();
    }

    function toggleNamePopover(target, roomUrl) {
      const isSameTarget =
        state.currentPopoverAnchor === target &&
        els.popover &&
        !els.popover.classList.contains("is-hidden");

      if (isSameTarget) {
        closeNamePopover();
        return;
      }
      openNamePopover(target, roomUrl);
    }

    async function openConfirmModal() {
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
          $$("[data-close-confirm]", modal).forEach((el) => el.removeEventListener("click", onCancel));
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
        $$("[data-close-confirm]", modal).forEach((el) => el.addEventListener("click", onCancel));
        document.addEventListener("keydown", onEsc);
      });
    }

    async function activateMainTab(tabName) {
      state.currentMainTab = tabName;
      setActiveSideTab(tabName);
      updateMainPanels(tabName);

      if (tabName !== "edit") closeEditMode();

      if (tabName === "avatar") {
        if (!isOwner) await recordRoomVisit();
        await loadRoomStats(true);
      }

      document.dispatchEvent(new CustomEvent("mathner:tab-changed", {
        detail: { tabName }
      }));
    }

    function bindCoreEvents() {
      $$(".side-tab-btn[data-tab-target]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          closeNamePopover();
          const target = btn.dataset.tabTarget;
          if (!target) return;
          await activateMainTab(target);
        });
      });

      $$("[data-open-edit-panel]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const panel = btn.dataset.openEditPanel || "avatar";
          openEditMode(panel);
          document.dispatchEvent(new CustomEvent("mathner:edit-panel-open", {
            detail: { panelName: panel }
          }));
        });
      });

      els.closeEditDrawerBtn?.addEventListener("click", async () => {
        closeNamePopover();
        await activateMainTab("avatar");
      });

      els.closeFontDrawerBtn?.addEventListener("click", async () => {
        closeNamePopover();
        await activateMainTab("avatar");
      });

      document.addEventListener("click", (e) => {
        const nameBtn = e.target.closest(".js-name-pop");
        if (nameBtn) {
          e.preventDefault();
          e.stopPropagation();
          toggleNamePopover(nameBtn, nameBtn.dataset.roomUrl || "");
          return;
        }

        if (els.popover && !els.popover.contains(e.target)) {
          closeNamePopover();
        }
      });

      els.popoverVisitBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (state.currentVisitUrl) {
          const url = state.currentVisitUrl;
          closeNamePopover();
          window.location.href = url;
        }
      });

      window.addEventListener("scroll", positionPopover, { passive: true });
      window.addEventListener("resize", closeNamePopover, { passive: true });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeNamePopover();
      });

      els.visitFriendBtn?.addEventListener("click", () => {
        const username = els.friendSelect?.value || "";
        if (!username) {
          alert("Choose a friend first.");
          return;
        }
        window.location.href = `${API.friendAvatarBase}${username}/`;
      });

      els.goMyRoomBtn?.addEventListener("click", () => {
        window.location.href = API.myRoomUrl;
      });

      els.toggleRoomLikeBtn?.addEventListener("click", async () => {
        const username = ownerUsername();
        const result = await postJson(buildUrl(API.socialRoomLikeUrlBase, username, "/like/"), {});
        if (!result.ok) {
          alert(result.error || "Failed to toggle like.");
          return;
        }
        if (result.stats) setRoomStats(result.stats);
      });

      els.sendFriendRequestBtn?.addEventListener("click", async () => {
        const username = ownerUsername();
        const result = await postJson(`${API.socialFriendRequestUrlBase}${username}/`, {});
        if (!result.ok) {
          alert(result.error || "Failed to update friend request.");
          return;
        }

        if (result.action === "sent") els.sendFriendRequestBtn.textContent = "Cancel Request";
        else if (result.action === "canceled") els.sendFriendRequestBtn.textContent = "Add Friend";
        else if (result.action === "friends") els.sendFriendRequestBtn.textContent = "Friend";
      });
    }

    const app = {
      $,
      $$,
      els,
      ds,
      API,
      state,
      isOwner,

      SUPPORTED_SLOTS,
      SLOT_ORDER,
      SLOT_CLASS_MAP,
      ALL_FONT_CLASSES,
      EFFECT_CLASS_LIST,
      EFFECT_LABEL_MAP,

      DEFAULT_NICKNAME_SCALE,
      DEFAULT_NICKNAME_SPACING,
      MIN_NICKNAME_SCALE,
      MAX_NICKNAME_SCALE,
      MIN_NICKNAME_SPACING,
      MAX_NICKNAME_SPACING,
      EMPTY_FONT_PREF,

      safeJsonParse,
      deepCopy,
      escapeHtml,
      normalizeTypedText,
      escapeHtmlPreserveText,
      clamp,
      forceWebp,
      ownerUsername,
      ownerDisplayName,
      normalizeSlotName,
      getDraftKeyBySlot,
      normalizeAvatarState,
      normalizeInventoryItems,
      normalizeOwnedEffects,
      itemByItemId,
      equippedItem,
      normalizeItemImageUrl,
      avatarBaseSet,
      createLayer,
      renderAvatarCanvas,
      fontClassFromKey,
      effectKeyToClass,
      resetFontClasses,
      clearEffectClasses,
      applyFontClass,
      applyFontEffect,
      applyFontColor,
      applyNicknameTransform,
      syncOwnerNickname,
      applyOwnerNicknameDisplay,
      renderShell,
      setActiveSideTab,
      updateMainPanels,
      openEditMode,
      closeEditMode,
      fetchJson,
      postJson,
      withPending,
      buildUrl,
      setRoomStats,
      loadRoomStats,
      recordRoomVisit,
      loadFriendSelectOptions,
      closeNamePopover,
      openNamePopover,
      toggleNamePopover,
      positionPopover,
      openConfirmModal,
      activateMainTab,
    };

    window.MathnerRoomApp = app;

    renderShell();
    bindCoreEvents();
    loadFriendSelectOptions();
    activateMainTab("avatar");

    document.dispatchEvent(new CustomEvent("mathner:room-ready", {
      detail: { app }
    }));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();