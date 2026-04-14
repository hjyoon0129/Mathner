document.addEventListener("DOMContentLoaded", () => {
  const page = document.getElementById("avatarPage");
  if (!page) return;

  const $ = (id) => document.getElementById(id);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const els = {
    avatarCanvasView: $("avatarCanvasView"),
    inventoryWrap: $("inventoryWrap"),
    setInventoryWrap: $("setInventoryWrap"),
    uniqueInventoryWrap: $("uniqueInventoryWrap"),

    fontInventoryWrap: $("fontInventoryWrap"),
    effectInventoryWrap: $("effectInventoryWrap"),

    fontInventoryCarousel: $("fontInventoryCarousel"),
    effectInventoryCarousel: $("effectInventoryCarousel"),
    fontPrevBtn: $("fontPrevBtn"),
    fontNextBtn: $("fontNextBtn"),
    effectPrevBtn: $("effectPrevBtn"),
    effectNextBtn: $("effectNextBtn"),

    saveAvatarChangesBtn: $("saveAvatarChangesBtn"),
    saveFontPreferenceBtn: $("saveFontPreferenceBtn"),
    resetAvatarBtn: $("resetAvatarBtn"),
    resetFontDefaultBtn: $("resetFontDefaultBtn"),

    saveHint: $("saveHint"),
    fontSaveHint: $("fontSaveHint"),

    fontEffectSelect: $("fontEffectSelect"),

    nicknameSizeDownBtn: $("nicknameSizeDownBtn"),
    nicknameSizeUpBtn: $("nicknameSizeUpBtn"),
    nicknameSizeValue: $("nicknameSizeValue"),
    nicknameSpacingDownBtn: $("nicknameSpacingDownBtn"),
    nicknameSpacingUpBtn: $("nicknameSpacingUpBtn"),
    nicknameSpacingValue: $("nicknameSpacingValue"),

    roomOwnerName: $("roomOwnerName"),
    guestbookContentInput: $("guestbookContent"),
    diaryTitleInput: $("diaryTitle"),
    diaryContentInput: $("diaryContent"),

    avatarLayout: $("avatarLayout"),
    closeEditDrawerBtn: $("closeEditDrawerBtn"),

    stageContentCard: $("avatarStageContentCard"),
    avatarHeroCard: $("avatarHeroCard"),
    dynamicPanelTitle: $("dynamicPanelTitle"),

    confirmModal: $("confirmModal"),
    confirmOkBtn: $("confirmOkBtn"),
    confirmCancelBtn: $("confirmCancelBtn"),

    tabGuestbook: $("tab-guestbook"),
    tabDiary: $("tab-diary"),

    calendarGrid: $("calendarGrid"),
    calendarMonthLabel: $("calendarMonthLabel"),
    calendarPrevBtn: $("calendarPrevBtn"),
    calendarNextBtn: $("calendarNextBtn"),

    guestbookSubmitBtn: $("guestbookSubmitBtn"),
    guestbookList: $("guestbookList"),

    diaryDateInput: $("diaryDate"),
    diarySelectedDateText: $("diarySelectedDateText"),
    diaryEntryIdInput: $("diaryEntryId"),
    diarySubmitBtn: $("diarySubmitBtn"),
    diaryClearBtn: $("diaryClearBtn"),
    diaryDeleteBtn: $("diaryDeleteBtn"),
    diaryList: $("diaryList"),

    popover: $("nameVisitPopover"),
    popoverVisitBtn: $("popoverVisitBtn"),

    visitFriendBtn: $("visitFriendBtn"),
    friendSelect: $("friendSelect"),
    goMyRoomBtn: $("goMyRoomBtn"),
    toggleRoomLikeBtn: $("toggleRoomLikeBtn"),
    toggleRoomLikeBtnText: $("toggleRoomLikeBtnText"),
    sendFriendRequestBtn: $("sendFriendRequestBtn"),

    avatarEditSubpanelAvatar: $("avatarEditSubpanelAvatar"),
    avatarEditSubpanelSet: $("avatarEditSubpanelSet"),
    avatarEditSubpanelUnique: $("avatarEditSubpanelUnique"),

    inventoryGenderFilterBar: $("inventoryGenderFilterBar"),
    inventoryTypeFilterBar: $("inventoryTypeFilterBar"),
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
    "rear_hair",
    "body",
    "pants",
    "cloth",
    "top",
    "shoes",
    "head",
    "eyebrow",
    "eyes",
    "mouth",
    "front_hair",
    "hat",
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

  const SLOT_LABEL_MAP = {
    head: "Head",
    eyes: "Eyes",
    mouth: "Mouth",
    eyebrow: "Eyebrow",
    front_hair: "Front Hair",
    rear_hair: "Rear Hair",
    body: "Body",
    top: "Top",
    cloth: "Cloth",
    pants: "Pants",
    shoes: "Shoes",
    hat: "Hat",
    set: "Set",
    unique: "Unique",
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
    selectedFontItemId: null,

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
    activeEditSubtab: "avatar",
    currentMainTab: "avatar",
    friendOptionsLoaded: false,
    inventoryLoaded: Array.isArray(safeJsonParse(ds.ownedAvatarItemJson, [])),
    inventoryPromise: null,

    roomStatsPromise: null,
    friendListPromise: null,
    guestbookPromise: null,
    diaryMonthPromise: null,
    diaryDatePromise: null,
    roomVisitPromise: null,

    hasRecordedVisitThisPage: false,

    today: new Date(),
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth(),
    selectedDiaryDate: "",
    currentVisitUrl: "",
    currentPopoverAnchor: null,
    monthDiaryDaysMap: Object.create(null),

    fontPage: 0,
    effectPage: 0,
  };

  state.selectedDiaryDate = formatDateLocal(state.today);
  state.draftAvatar = deepCopy(state.avatar);

  function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj ?? {}));
  }

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

  function formatDateLocal(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function updateSaveHint(text = "") {
    if (els.saveHint) els.saveHint.textContent = text;
  }

  function updateFontSaveHint(text = "", isError = false) {
    if (!els.fontSaveHint) return;
    els.fontSaveHint.textContent = text;
    els.fontSaveHint.classList.toggle("font-save-hint-error", !!isError);
    els.fontSaveHint.classList.toggle("font-save-hint-ok", !!text && !isError);
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

  function resolveMessageDisplayName(displayName, roomUrl = "") {
    const name = String(displayName || "").trim();
    if (name) return name;

    const ownerName = String(ownerDisplayName() || "").trim();
    const ownerUser = String(ownerUsername() || "").trim();

    if (roomUrl) {
      try {
        const clean = String(roomUrl).replace(/^https?:\/\/[^/]+/i, "");
        const match = clean.match(/\/avatar\/room\/([^/]+)\/?$/i);
        if (match && match[1]) {
          const usernameFromUrl = decodeURIComponent(match[1]).trim();
          if (usernameFromUrl && ownerUser && usernameFromUrl === ownerUser) {
            return ownerName || ownerUser || "Player";
          }
          return usernameFromUrl || "Player";
        }
      } catch (e) {}
    }

    return ownerName || ownerUser || "Player";
  }

  function inferSlotFromItemMeta(item) {
    const source = [
      item?.name,
      item?.image_url,
      item?.image_path,
      item?.slug,
      item?.code,
      item?.category,
      item?.item_group,
      item?.subtype,
      item?.subcategory,
      item?.type,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (/(crown|wreath|laurel|halo|hat|cap|tiara)/.test(source)) return "hat";
    if (/(robe|cloak|cape|mantle|coat|outer|cloth|outfit)/.test(source)) return "cloth";
    if (/(pants|trouser|bottom)/.test(source)) return "pants";
    if (/(shoe|shoes|boot|boots|sneaker)/.test(source)) return "shoes";
    if (/(top|shirt|tee|jacket|hoodie|vest)/.test(source)) return "top";
    if (/(front hair|front_hair|hairfront|fronthair)/.test(source)) return "front_hair";
    if (/(rear hair|rear_hair|hairback|back hair|rearhair)/.test(source)) return "rear_hair";
    if (/(eyebrow|brow)/.test(source)) return "eyebrow";
    if (/(eyes|eye)/.test(source)) return "eyes";
    if (/(mouth|lip)/.test(source)) return "mouth";
    if (/(head|face)/.test(source)) return "head";
    if (/(body)/.test(source)) return "body";

    return "";
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
    if (["cloth", "clothes", "outfit", "robe", "cloak", "cape"].includes(s)) return "cloth";
    if (["pants", "bottom", "bottoms", "trousers"].includes(s)) return "pants";
    if (["shoes", "shoe", "boots", "boot"].includes(s)) return "shoes";s
    if (["hat", "cap", "crown", "halo", "tiara", "wreath"].includes(s)) return "hat";
    if (["set"].includes(s)) return "set";
    if (["unique"].includes(s)) return "unique";
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

  function resolveItemSlot(item) {
    const candidates = [
      item.slot,
      item.equip_slot,
      item.item_slot,
      item.avatar_slot,
      item.part,
      item.subtype,
      item.subcategory,
      item.type,
    ];

    for (const candidate of candidates) {
      const normalized = normalizeSlotName(candidate);
      if (SUPPORTED_SLOTS.has(normalized)) return normalized;
    }

    const category = String(item.category || item.item_category || "").toLowerCase();
    if (SUPPORTED_SLOTS.has(normalizeSlotName(category))) {
      return normalizeSlotName(category);
    }

    return "";
  }

  function normalizeInventoryItems(items) {
    if (!Array.isArray(items)) return [];

    const seen = new Map();

    for (const src of items) {
      const item = { ...(src || {}) };

      item.item_id = Number(item.item_id || item.id || 0);
      item.owned_item_id = Number(item.owned_item_id || 0);
      item.quantity = Number(item.quantity || 1);
      item.gender = String(item.gender || "common").toLowerCase();
      item.is_font = Boolean(item.is_font || item.category === "profile_font" || item.type === "font");
      item.font_key = String(item.font_family_key || item.font_key || "").trim();
      item.category = String(item.category || item.item_category || "").toLowerCase();
      item.item_group = String(item.item_group || item.group || "").toLowerCase();

      item.slot = resolveItemSlot(item);

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

  function getUniqueAuraVariant(item) {
    const name = String(item?.name || "").toLowerCase();
    const key = String(
      item?.effect_key ||
      item?.aura_key ||
      item?.unique_effect_key ||
      item?.font_key ||
      item?.category ||
      item?.item_group ||
      ""
    ).toLowerCase();
    const imageUrl = String(item?.image_url || "").toLowerCase();

    const source = `${name} ${key} ${imageUrl}`;

    if (/(ice|frost|snow|crystal|glacier|blizzard)/.test(source)) return "ice";
    if (/(fire|flame|inferno|phoenix|lava|ember)/.test(source)) return "fire";
    if (/(shadow|dark|night|void|black|obsidian)/.test(source)) return "shadow";
    if (/(angel|holy|sun|light|divine|halo)/.test(source)) return "holy";
    if (/(rainbow|aurora|prism|galaxy|cosmic|star)/.test(source)) return "rainbow";

    return "gold";
  }

  function getEquippedUniqueAuraSource() {
    const prioritySlots = ["hat", "head", "front_hair", "top", "cloth", "body"];

    for (const slot of prioritySlots) {
      const item = equippedItem(slot);
      if (!item) continue;

      const name = String(item?.name || "").toLowerCase();
      const category = String(item?.category || "").toLowerCase();
      const group = String(item?.item_group || "").toLowerCase();
      const imageUrl = String(item?.image_url || "").toLowerCase();

      const looksLikeUnique =
        isUniqueItem(item) ||
        category.includes("unique") ||
        group.includes("unique") ||
        imageUrl.includes("/unique/") ||
        /(crown|halo|angel|divine|holy|unique|laurel|golden crown|gold crown|robe|cloak|cape)/.test(name);

      if (looksLikeUnique) {
        return {
          slot,
          item,
          variant: getUniqueAuraVariant(item),
        };
      }
    }

    return null;
  }

  function buildAvatarUniqueAura(source) {
    if (!source) return null;

    const aura = document.createElement("div");
    aura.className = `avatar-unique-aura avatar-unique-aura--${source.slot} avatar-unique-aura--${source.variant || "gold"}`;
    aura.setAttribute("aria-hidden", "true");
    aura.dataset.uniqueItemId = String(source.item?.item_id || "");
    aura.dataset.uniqueVariant = String(source.variant || "gold");

    aura.innerHTML = `
      <span class="avatar-unique-halo"></span>
      <span class="avatar-unique-ring"></span>
      <span class="avatar-unique-ring avatar-unique-ring-alt"></span>
      <span class="avatar-unique-spark avatar-unique-spark-1"></span>
      <span class="avatar-unique-spark avatar-unique-spark-2"></span>
      <span class="avatar-unique-spark avatar-unique-spark-3"></span>
      <span class="avatar-unique-spark avatar-unique-spark-4"></span>
      <span class="avatar-unique-float avatar-unique-float-1"></span>
      <span class="avatar-unique-float avatar-unique-float-2"></span>
      <span class="avatar-unique-float avatar-unique-float-3"></span>
    `;

    return aura;
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

    const uniqueAuraSource = getEquippedUniqueAuraSource();
    const uniqueAura = buildAvatarUniqueAura(uniqueAuraSource);
    if (uniqueAura) stack.appendChild(uniqueAura);

    for (const slot of SLOT_ORDER) {
      const className = SLOT_CLASS_MAP[slot] || `avatar-layer-${slot.replace(/_/g, "-")}`;
      const layer = createLayer(sourceMap[slot], className, altMap[slot]);
      if (layer) stack.appendChild(layer);
    }

    canvasEl.appendChild(stack);
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

  function isSetItem(item) {
    const category = String(item.category || "").toLowerCase();
    const group = String(item.item_group || "").toLowerCase();
    return category === "set" || group === "set";
  }

  function isUniqueItem(item) {
    const category = String(item.category || "").toLowerCase();
    const group = String(item.item_group || "").toLowerCase();
    return category === "unique" || group === "unique";
  }

  function isNormalAvatarItem(item) {
    return !item.is_font && !isSetItem(item) && !isUniqueItem(item);
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
    const scale = Number(state.previewFont.nicknameScale ?? state.viewerFontPref.nickname_scale ?? DEFAULT_NICKNAME_SCALE);
    const spacing = Number(state.previewFont.nicknameLetterSpacing ?? state.viewerFontPref.nickname_letter_spacing ?? DEFAULT_NICKNAME_SPACING);

    if (els.nicknameSizeValue) {
      els.nicknameSizeValue.textContent = scale === DEFAULT_NICKNAME_SCALE ? "Default" : `${scale.toFixed(1)}x`;
    }
    if (els.nicknameSpacingValue) {
      els.nicknameSpacingValue.textContent = spacing === DEFAULT_NICKNAME_SPACING ? "Default" : `${spacing}px`;
    }
  }

  function applyLiveNicknamePreview() {
    const fontKey = state.previewFont.fontKey || state.viewerFontPref.nickname_font_key || "";
    const effectKey = state.previewFont.effectKey || state.viewerFontPref.nickname_effect_key || "none";
    const scale = Number(state.previewFont.nicknameScale ?? state.viewerFontPref.nickname_scale ?? DEFAULT_NICKNAME_SCALE);
    const spacing = Number(state.previewFont.nicknameLetterSpacing ?? state.viewerFontPref.nickname_letter_spacing ?? DEFAULT_NICKNAME_SPACING);

    if (!isOwner || !els.roomOwnerName) return;

    applyFontClass(els.roomOwnerName, fontKey);
    applyNicknameTransform(els.roomOwnerName, scale, spacing);

    if (effectKey === "rainbow_flow" || effectKey === "rainbow-flow") {
      els.roomOwnerName.style.color = "transparent";
      els.roomOwnerName.style.webkitTextFillColor = "transparent";
    } else {
      els.roomOwnerName.style.color = "#7ec8ff";
      els.roomOwnerName.style.webkitTextFillColor = "";
    }

    applyFontEffect(els.roomOwnerName, effectKey);
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

  function applyViewerWritingPreview() {
    applyFontClass(els.diaryTitleInput, state.viewerFontPref.title_font_key || "");
    applyFontColor(els.diaryTitleInput, state.viewerFontPref.title_color || "#ffffff", "#ffffff");
    applyFontEffect(
      els.diaryTitleInput,
      state.viewerFontPref.title_effect_key || state.viewerFontPref.nickname_effect_key || "none"
    );

    applyFontClass(els.diaryContentInput, state.viewerFontPref.content_font_key || "");
    applyFontColor(els.diaryContentInput, state.viewerFontPref.content_color || "#eef4ff", "#eef4ff");
    applyFontEffect(els.diaryContentInput, "none");

    applyFontClass(els.guestbookContentInput, state.viewerFontPref.content_font_key || "");
    applyFontColor(els.guestbookContentInput, state.viewerFontPref.content_color || "#eef4ff", "#eef4ff");
    applyFontEffect(els.guestbookContentInput, "none");

    syncNicknameToolUI();
  }

  function applyCurrentFontPreferenceToEditors() {
    applyOwnerNicknameDisplay();
    applyViewerWritingPreview();
  }

  function getCarouselPageSize() {
    return window.innerWidth <= 1180 ? 1 : 3;
  }

  function updateSingleCarousel({ wrap, carousel, prevBtn, nextBtn, pageKey }) {
    if (!wrap || !carousel || !prevBtn || !nextBtn) return;

    const cards = Array.from(wrap.children).filter((el) =>
      el.classList.contains("font-inventory-card") || el.classList.contains("effect-inventory-card")
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

    const html = fontItems.map((item) => {
      const isSelected = Number(state.selectedFontItemId) === Number(item.item_id);
      const previewEffectClass = isSelected ? effectKeyToClass(previewEffectKey) : "effect-none";

      return `
        <div class="font-inventory-card ${isSelected ? "is-selected" : ""}">
          <div class="font-preview-box">
            <div class="font-preview-text ${fontClassFromKey(item.font_key)} ${previewEffectClass}">Mathner Hero</div>
          </div>
          <div class="font-inventory-name" title="${escapeHtml(item.name || "")}">${escapeHtml(item.name || "")}</div>
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
    }).join("");

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
    const previewFontKey = state.previewFont.fontKey || state.viewerFontPref.nickname_font_key || "";

    const html = state.ownedEffects.map((effect) => {
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
    }).join("");

    els.effectInventoryWrap.innerHTML = html;
    resetCarouselPage("effectPage");
    updateFontEffectCarousels();
  }

  function getDisplaySlotLabel(item, slot) {
    const normalized = normalizeSlotName(slot);
    if (SUPPORTED_SLOTS.has(normalized)) return SLOT_LABEL_MAP[normalized] || normalized;
    if (isSetItem(item)) return `Set · ${SLOT_LABEL_MAP[normalized] || normalized || "Part"}`;
    if (isUniqueItem(item)) return `Unique · ${SLOT_LABEL_MAP[normalized] || normalized || "Part"}`;
    return SLOT_LABEL_MAP[normalized] || normalized || "Item";
  }

  function renderInventoryCard(item) {
    const normalizedSlot = resolveItemSlot(item);
    const isSet = isSetItem(item);
    const isUnique = isUniqueItem(item);

    const equipSlot = normalizedSlot;
    const draftKey = equipSlot && SUPPORTED_SLOTS.has(equipSlot) ? getDraftKeyBySlot(equipSlot) : "";
    const isSupportedSlot = Boolean(draftKey);
    const isActive = Boolean(draftKey) && Number(state.draftAvatar[draftKey]) === Number(item.item_id);

    const imageHtml = item.image_url
      ? `<img src="${escapeHtml(forceWebp(item.image_url))}" alt="${escapeHtml(item.name || "")}" loading="lazy" decoding="async">`
      : `<div class="empty-text">NO IMG</div>`;

    const displayMeta = getDisplaySlotLabel(item, normalizedSlot);

    if (isUnique) {
      return `
        <div class="inventory-card inventory-card-unique ${isActive ? "is-equipped" : ""}">
          <div class="inventory-thumb inventory-thumb-unique">
            <span class="inventory-unique-badge">Unique</span>
            <span class="inventory-unique-glow"></span>
            <span class="inventory-unique-ring"></span>
            <span class="inventory-unique-spark inventory-unique-spark-1"></span>
            <span class="inventory-unique-spark inventory-unique-spark-2"></span>
            <span class="inventory-unique-spark inventory-unique-spark-3"></span>
            <span class="inventory-unique-spark inventory-unique-spark-4"></span>
            <span class="inventory-unique-spark inventory-unique-spark-5"></span>
            <div class="inventory-unique-item-wrap">
              ${imageHtml}
            </div>
          </div>
          <div class="inventory-name">${escapeHtml(item.name || "")}</div>
          <div class="inventory-meta">${escapeHtml(displayMeta)} · x${escapeHtml(item.quantity ?? 1)}</div>
          <button
            type="button"
            class="inventory-equip-btn ${isActive ? "is-active" : ""}"
            data-action="equip-item"
            data-item-id="${escapeHtml(item.item_id)}"
            data-slot="${escapeHtml(equipSlot)}"
            ${isSupportedSlot ? "" : "disabled"}
          >
            ${isSupportedSlot ? (isActive ? "Equipped" : "Equip") : "Set slot first"}
          </button>
        </div>
      `;
    }

    if (isSet) {
      return `
        <div class="inventory-card ${isActive ? "is-equipped" : ""}">
          <div class="inventory-thumb">
            ${imageHtml}
          </div>
          <div class="inventory-name">${escapeHtml(item.name || "")}</div>
          <div class="inventory-meta">${escapeHtml(displayMeta)} · x${escapeHtml(item.quantity ?? 1)}</div>
          <button
            type="button"
            class="inventory-equip-btn ${isActive ? "is-active" : ""}"
            data-action="equip-item"
            data-item-id="${escapeHtml(item.item_id)}"
            data-slot="${escapeHtml(equipSlot)}"
            ${isSupportedSlot ? "" : "disabled"}
          >
            ${isSupportedSlot ? (isActive ? "Equipped" : "Equip") : "Set slot first"}
          </button>
        </div>
      `;
    }

    return `
      <div class="inventory-card ${isActive ? "is-equipped" : ""}">
        <div class="inventory-thumb">
          ${imageHtml}
        </div>
        <div class="inventory-name">${escapeHtml(item.name || "")}</div>
        <div class="inventory-meta">${escapeHtml(displayMeta)} · x${escapeHtml(item.quantity ?? 1)}</div>
        <button
          type="button"
          class="inventory-equip-btn ${isActive ? "is-active" : ""}"
          data-action="equip-item"
          data-item-id="${escapeHtml(item.item_id)}"
          data-slot="${escapeHtml(equipSlot)}"
          ${isSupportedSlot ? "" : "disabled"}
        >
          ${isSupportedSlot ? (isActive ? "Equipped" : "Equip") : "Unsupported"}
        </button>
      </div>
    `;
  }

  function renderInventory() {
    const wrap = els.inventoryWrap;
    if (!wrap) return;

    const avatarItems = state.ownedItems.filter((item) => isNormalAvatarItem(item));
    if (!avatarItems.length) {
      wrap.innerHTML = `<div class="empty-text">No avatar items yet.</div>`;
      return;
    }

    const html = [];
    let visibleCount = 0;

    for (const item of avatarItems) {
      const slot = resolveItemSlot(item);
      if (!itemMatchesFilters(item, slot)) continue;
      visibleCount += 1;
      html.push(renderInventoryCard(item));
    }

    wrap.innerHTML = visibleCount ? html.join("") : `<div class="empty-text">No items match this filter.</div>`;
  }

  function renderSetInventory() {
    if (!els.setInventoryWrap) return;

    const setItems = state.ownedItems.filter((item) => isSetItem(item) && !item.is_font);

    if (!setItems.length) {
      els.setInventoryWrap.innerHTML = `<div class="empty-text">No set items yet.</div>`;
      return;
    }

    els.setInventoryWrap.innerHTML = setItems.map(renderInventoryCard).join("");
  }

  function renderUniqueInventory() {
    if (!els.uniqueInventoryWrap) return;

    const uniqueItems = state.ownedItems.filter((item) => isUniqueItem(item) && !item.is_font);

    if (!uniqueItems.length) {
      els.uniqueInventoryWrap.innerHTML = `<div class="empty-text">No unique items yet.</div>`;
      return;
    }

    els.uniqueInventoryWrap.innerHTML = uniqueItems.map(renderInventoryCard).join("");
  }

  function updateSubtabFilterVisibility(tabName) {
    const showAvatarFilters = tabName === "avatar";

    if (els.inventoryGenderFilterBar) {
      const section = els.inventoryGenderFilterBar.closest(".inventory-filter-section");
      if (section) section.style.display = showAvatarFilters ? "" : "none";
    }

    if (els.inventoryTypeFilterBar) {
      const section = els.inventoryTypeFilterBar.closest(".inventory-filter-section");
      if (section) section.style.display = showAvatarFilters ? "" : "none";
    }
  }

  function setActiveEditSubtab(tabName = "avatar") {
    state.activeEditSubtab = tabName;

    $$(".avatar-edit-subtab-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.editSubtab === tabName);
    });

    const avatarPanel = els.avatarEditSubpanelAvatar;
    const setPanel = els.avatarEditSubpanelSet;
    const uniquePanel = els.avatarEditSubpanelUnique;

    if (avatarPanel) avatarPanel.classList.remove("is-active");
    if (setPanel) setPanel.classList.remove("is-active");
    if (uniquePanel) uniquePanel.classList.remove("is-active");

    updateSubtabFilterVisibility(tabName);

    if (tabName === "set") {
      if (setPanel) setPanel.classList.add("is-active");
      renderSetInventory();
      return;
    }

    if (tabName === "unique") {
      if (uniquePanel) uniquePanel.classList.add("is-active");
      renderUniqueInventory();
      return;
    }

    if (avatarPanel) avatarPanel.classList.add("is-active");
    renderInventory();
  }

  function renderCurrentEditSubtab() {
    if (state.activeEditSubtab === "set") {
      renderSetInventory();
      return;
    }
    if (state.activeEditSubtab === "unique") {
      renderUniqueInventory();
      return;
    }
    renderInventory();
  }

  async function loadInventoryIfNeeded(force = false) {
    if (!isOwner || !API.avatarInventoryUrl) {
      renderFontInventory();
      renderEffectInventory();
      renderSetInventory();
      renderUniqueInventory();
      return null;
    }
    if (state.inventoryLoaded && !force) {
      renderCurrentEditSubtab();
      renderSetInventory();
      renderUniqueInventory();
      renderFontInventory();
      renderEffectInventory();
      updateEquippedSlotState();
      setActiveEditSubtab(state.activeEditSubtab || "avatar");
      return { ok: true, inventory: state.ownedItems };
    }
    if (state.inventoryPromise && !force) return state.inventoryPromise;

    if (els.inventoryWrap) els.inventoryWrap.innerHTML = `<div class="empty-text">Loading inventory...</div>`;
    if (els.setInventoryWrap) els.setInventoryWrap.innerHTML = `<div class="empty-text">Loading set items...</div>`;
    if (els.uniqueInventoryWrap) els.uniqueInventoryWrap.innerHTML = `<div class="empty-text">Loading unique items...</div>`;
    if (els.fontInventoryWrap) els.fontInventoryWrap.innerHTML = `<div class="empty-text">Loading fonts...</div>`;
    if (els.effectInventoryWrap) els.effectInventoryWrap.innerHTML = `<div class="empty-text">Loading effects...</div>`;

    state.inventoryPromise = (async () => {
      const result = await fetchJson(API.avatarInventoryUrl);
      if (!result.ok) {
        if (els.inventoryWrap) els.inventoryWrap.innerHTML = `<div class="empty-text">${escapeHtml(result.error || "Failed to load inventory.")}</div>`;
        if (els.setInventoryWrap) els.setInventoryWrap.innerHTML = `<div class="empty-text">${escapeHtml(result.error || "Failed to load set items.")}</div>`;
        if (els.uniqueInventoryWrap) els.uniqueInventoryWrap.innerHTML = `<div class="empty-text">${escapeHtml(result.error || "Failed to load unique items.")}</div>`;
        if (els.fontInventoryWrap) els.fontInventoryWrap.innerHTML = `<div class="empty-text">${escapeHtml(result.error || "Failed to load fonts.")}</div>`;
        renderEffectInventory();
        return result;
      }

      state.ownedItems = normalizeInventoryItems(result.inventory || result.items || []);
      if (Array.isArray(result.effects)) {
        state.ownedEffects = normalizeOwnedEffects(result.effects);
      }
      state.inventoryLoaded = true;

      renderCurrentEditSubtab();
      renderSetInventory();
      renderUniqueInventory();
      renderFontInventory();
      renderEffectInventory();
      updateEquippedSlotState();
      setActiveEditSubtab(state.activeEditSubtab || "avatar");
      return result;
    })();

    try {
      return await state.inventoryPromise;
    } finally {
      state.inventoryPromise = null;
    }
  }

  function updateGenderButtons() {
    $$(".gender-btn").forEach((btn) => {
      const isActive = btn.dataset.gender === (state.draftAvatar.gender || "male");
      btn.classList.toggle("avatar-btn-primary", isActive);
      btn.classList.toggle("avatar-btn-secondary", !isActive);
    });
  }

  function updateInventoryFilterButtons() {
    $$('[data-filter-group="gender"]').forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.filter === state.activeInventoryGenderFilter);
    });
    $$('[data-filter-group="type"]').forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.filter === state.activeInventoryTypeFilter);
    });
  }

  function syncOwnerNickname() {
    const displayName = ownerDisplayName();
    const username = ds.avatarOwnerUsername || ds.avatarOwner || "";

    [
      $("roomOwnerName"),
      $("ownerDisplayName"),
      $("ownerNickname"),
      $("avatarOwnerName"),
    ].filter(Boolean).forEach((el) => {
      el.textContent = displayName || username || "Player";
    });

    [
      $("roomOwnerUsername"),
      $("ownerUsername"),
      $("avatarOwnerUsername"),
    ].filter(Boolean).forEach((el) => {
      el.textContent = username ? `@${username}` : "";
    });
  }

  function renderAll() {
    renderAvatarCanvas();
    syncOwnerNickname();
    applyCurrentFontPreferenceToEditors();

    if (!isOwner) return;
    updateInventoryFilterButtons();
    updateGenderButtons();
    updateEquippedSlotState();
    renderInventory();
    renderSetInventory();
    renderUniqueInventory();
    renderFontInventory();
    renderEffectInventory();
    setActiveEditSubtab(state.activeEditSubtab || "avatar");
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

    els.tabGuestbook?.classList.toggle("active", tabName === "guestbook");
    els.tabDiary?.classList.toggle("active", tabName === "diary");

    if (tabName === "guestbook" && els.dynamicPanelTitle) els.dynamicPanelTitle.textContent = "Guestbook";
    if (tabName === "diary" && els.dynamicPanelTitle) els.dynamicPanelTitle.textContent = "Diary";

    closeNamePopover();
  }

  function openEditMode() {
    state.currentMainTab = "edit";
    els.avatarLayout?.classList.add("is-editing");
    setActiveSideTab("edit");
    updateMainPanels("edit");
  }

  function closeEditMode() {
    els.avatarLayout?.classList.remove("is-editing");
    closeNamePopover();

    state.previewFont = {
      itemId: null,
      fontKey: "",
      effectKey: state.viewerFontPref.nickname_effect_key || "none",
      nicknameScale: Number(state.viewerFontPref.nickname_scale ?? DEFAULT_NICKNAME_SCALE),
      nicknameLetterSpacing: Number(state.viewerFontPref.nickname_letter_spacing ?? DEFAULT_NICKNAME_SPACING),
    };
    applyCurrentFontPreferenceToEditors();
    renderFontInventory();
    renderEffectInventory();
  }

  function buildNameTextClass(fontKey = "", effectKey = "none") {
    return [
      "guest-name-btn-text",
      fontClassFromKey(fontKey),
      effectKeyToClass(effectKey),
    ].filter(Boolean).join(" ");
  }

  function makeNameButton(
    displayName,
    roomUrl,
    extraClass = "",
    fontKey = "",
    effectKey = "none",
    scale = DEFAULT_NICKNAME_SCALE,
    spacing = DEFAULT_NICKNAME_SPACING
  ) {
    const resolvedName = resolveMessageDisplayName(displayName, roomUrl);
    const safeName = escapeHtml(resolvedName || "Player");
    const safeRoomUrl = escapeHtml(roomUrl || "");

    const buttonClasses = [
      "guest-name-btn",
      "js-name-pop",
      extraClass,
    ].filter(Boolean).join(" ");

    const textClasses = buildNameTextClass(fontKey, effectKey);
    const fontSizePx = Math.max(14, Math.round(18 * Number(scale || DEFAULT_NICKNAME_SCALE)));
    const letterSpacingPx = Number(spacing || DEFAULT_NICKNAME_SPACING);

    return `<button type="button" class="${buttonClasses}" data-room-url="${safeRoomUrl}"><span class="${textClasses}" style="font-size:${fontSizePx}px; letter-spacing:${letterSpacingPx}px;">${safeName}</span></button>`;
  }

  function buildStyledBody(content, fontKey = "") {
    return `<div class="message-body ${fontClassFromKey(fontKey)}">${escapeHtmlPreserveText(content || "")}</div>`;
  }

  function buildDiaryTitle(title, fontKey = "", effectKey = "none") {
    return `<strong class="diary-entry-title ${fontClassFromKey(fontKey)} ${effectKeyToClass(effectKey)}">${escapeHtml(title || "")}</strong>`;
  }

  function renderReplyCard(reply) {
    const displayName = resolveMessageDisplayName(reply.author_display_name, reply.author_room_url);

    return `
      <div class="reply-card" data-reply-id="${escapeHtml(reply.id)}">
        <div class="reply-top">
          ${makeNameButton(
            displayName,
            reply.author_room_url,
            "",
            reply.nickname_font_key || "",
            reply.nickname_effect_key || "none",
            reply.nickname_scale ?? DEFAULT_NICKNAME_SCALE,
            reply.nickname_letter_spacing ?? DEFAULT_NICKNAME_SPACING
          )}
          <span>${escapeHtml(reply.created_at || "")}</span>
        </div>

        ${buildStyledBody(reply.content, reply.content_font_key || "")}

        ${
          reply.can_delete
            ? `<div class="message-actions"><button type="button" class="mini-action-btn danger reply-delete-btn" data-reply-id="${escapeHtml(reply.id)}">Delete</button></div>`
            : ""
        }
      </div>
    `;
  }

  function renderGuestbookEntryCard(entry) {
    const displayName = resolveMessageDisplayName(entry.author_display_name, entry.author_room_url);

    return `
      <div class="message-card guestbook-entry-card" data-entry-id="${escapeHtml(entry.id)}">
        <div class="message-top">
          ${makeNameButton(
            displayName,
            entry.author_room_url,
            "",
            entry.nickname_font_key || "",
            entry.nickname_effect_key || "none",
            entry.nickname_scale ?? DEFAULT_NICKNAME_SCALE,
            entry.nickname_letter_spacing ?? DEFAULT_NICKNAME_SPACING
          )}
          <span>${escapeHtml(entry.created_at || "")}</span>
        </div>

        ${buildStyledBody(entry.content, entry.content_font_key || "")}

        <div class="message-actions">
          ${entry.can_reply ? `<button type="button" class="mini-action-btn reply-toggle-btn" data-entry-id="${escapeHtml(entry.id)}">Reply</button>` : ""}
          ${entry.can_delete ? `<button type="button" class="mini-action-btn danger guestbook-delete-btn" data-entry-id="${escapeHtml(entry.id)}">Delete</button>` : ""}
        </div>

        <div class="reply-editor is-hidden">
          <textarea class="reply-textarea font-default" placeholder="Write a reply..."></textarea>
          <div class="reply-editor-actions">
            <button type="button" class="avatar-btn avatar-btn-primary reply-submit-btn" data-entry-id="${escapeHtml(entry.id)}">Save Reply</button>
          </div>
        </div>

        <div class="reply-list">
          ${(entry.replies || []).map(renderReplyCard).join("")}
        </div>
      </div>
    `;
  }

  async function loadGuestbookEntries(force = false) {
    if (!els.guestbookList || !API.guestbookListUrl) return null;
    if (!force && state.guestbookPromise) return state.guestbookPromise;

    els.guestbookList.innerHTML = `<div class="empty-text">Loading guestbook...</div>`;

    state.guestbookPromise = (async () => {
      const result = await fetchJson(API.guestbookListUrl);

      if (!result.ok) {
        els.guestbookList.innerHTML = `<div class="empty-text">${escapeHtml(result.error || "Failed to load guestbook.")}</div>`;
        return result;
      }

      const entries = result.entries || [];
      els.guestbookList.innerHTML = entries.length
        ? entries.map(renderGuestbookEntryCard).join("")
        : `<div class="empty-text">No guestbook messages yet.</div>`;

      applyViewerWritingPreview();
      closeNamePopover();
      return result;
    })();

    try {
      return await state.guestbookPromise;
    } finally {
      state.guestbookPromise = null;
    }
  }

  function renderDiaryListEntry(entry) {
    return `
      <div class="message-card diary-entry-card" data-entry-id="${escapeHtml(entry.id)}">
        <div class="message-top diary-entry-top">
          ${buildDiaryTitle(
            entry.title || "",
            entry.title_font_key || "",
            entry.title_effect_key || "none"
          )}
          <span>${escapeHtml(entry.entry_date || "")}</span>
        </div>

        ${buildStyledBody(entry.content, entry.content_font_key || "")}

        ${
          entry.can_delete
            ? `<div class="message-actions"><button type="button" class="mini-action-btn danger diary-inline-delete-btn" data-entry-id="${escapeHtml(entry.id)}">Delete</button></div>`
            : ""
        }
      </div>
    `;
  }

  function renderDiaryList(entries) {
    if (!els.diaryList) return;
    els.diaryList.innerHTML = entries?.length
      ? entries.map(renderDiaryListEntry).join("")
      : `<div class="empty-text">No diary entry on this date.</div>`;
    closeNamePopover();
  }

  function setDiarySelectedDate(dateStr) {
    state.selectedDiaryDate = dateStr;
    if (els.diaryDateInput) els.diaryDateInput.value = dateStr;
    if (els.diarySelectedDateText) els.diarySelectedDateText.textContent = `Selected date: ${dateStr}`;
  }

  function clearDiaryForm(keepDate = true) {
    if (els.diaryEntryIdInput) els.diaryEntryIdInput.value = "";
    if (els.diaryTitleInput) els.diaryTitleInput.value = "";
    if (els.diaryContentInput) els.diaryContentInput.value = "";

    if (!keepDate) setDiarySelectedDate(formatDateLocal(new Date()));
    applyViewerWritingPreview();
  }

  function renderCalendar() {
    if (!els.calendarGrid || !els.calendarMonthLabel) return;

    const firstDay = new Date(state.calendarYear, state.calendarMonth, 1);
    const lastDay = new Date(state.calendarYear, state.calendarMonth + 1, 0);
    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    els.calendarMonthLabel.textContent = `${state.calendarYear}.${String(state.calendarMonth + 1).padStart(2, "0")}`;

    const html = [];

    for (let i = 0; i < startWeekday; i += 1) {
      html.push(`<div class="calendar-day is-muted"></div>`);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const cellDate = `${state.calendarYear}-${String(state.calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const classes = ["calendar-day"];

      if (
        state.calendarYear === state.today.getFullYear() &&
        state.calendarMonth === state.today.getMonth() &&
        day === state.today.getDate()
      ) classes.push("is-today");

      if (state.selectedDiaryDate === cellDate) classes.push("is-selected");
      if (state.monthDiaryDaysMap[cellDate]) classes.push("has-entry");

      html.push(`<button type="button" class="${classes.join(" ")}" data-action="pick-diary-date" data-date="${cellDate}">${day}</button>`);
    }

    els.calendarGrid.innerHTML = html.join("");
  }

  async function loadDiaryMonth(force = false) {
    if (!API.diaryCalendarUrl) return null;
    if (!force && state.diaryMonthPromise) return state.diaryMonthPromise;

    state.diaryMonthPromise = (async () => {
      const url = `${API.diaryCalendarUrl}?year=${state.calendarYear}&month=${state.calendarMonth + 1}`;
      const result = await fetchJson(url);

      state.monthDiaryDaysMap = Object.create(null);
      if (result.ok) {
        for (const item of result.days || []) state.monthDiaryDaysMap[item.date] = item;
      }

      renderCalendar();
      closeNamePopover();
      return result;
    })();

    try {
      return await state.diaryMonthPromise;
    } finally {
      state.diaryMonthPromise = null;
    }
  }

  async function loadDiaryByDate(dateStr, force = false) {
    if (!dateStr || !API.diaryDateUrlBase) return null;
    if (!force && state.diaryDatePromise) return state.diaryDatePromise;

    setDiarySelectedDate(dateStr);
    renderCalendar();

    state.diaryDatePromise = (async () => {
      const result = await fetchJson(`${API.diaryDateUrlBase}${dateStr}/`);

      if (!result.ok || !result.entry) {
        renderDiaryList([]);
        if (isOwner) clearDiaryForm(true);
        return result;
      }

      const entry = result.entry;
      renderDiaryList([entry]);

      if (isOwner) {
        if (els.diaryEntryIdInput) els.diaryEntryIdInput.value = entry.id || "";
        if (els.diaryTitleInput) els.diaryTitleInput.value = entry.title || "";
        if (els.diaryContentInput) els.diaryContentInput.value = entry.content || "";
      }

      applyViewerWritingPreview();
      return result;
    })();

    try {
      return await state.diaryDatePromise;
    } finally {
      state.diaryDatePromise = null;
    }
  }

  async function handleDiaryDatePick(dateStr) {
    setDiarySelectedDate(dateStr);
    renderCalendar();

    if (isOwner) {
      clearDiaryForm(true);
      if (els.diaryDateInput) els.diaryDateInput.value = dateStr;
    }

    closeNamePopover();
    await loadDiaryByDate(dateStr, true);
  }

  async function handleDiaryDelete(entryId) {
    if (!window.confirm("Delete this diary?")) return;

    const result = await postJson(`${API.diaryDeleteUrlBase}${entryId}/delete/`, {});
    if (!result.ok) {
      alert(result.error || "Failed to delete diary.");
      return;
    }

    clearDiaryForm(true);
    closeNamePopover();
    await loadDiaryMonth(true);
    await loadDiaryByDate(state.selectedDiaryDate, true);
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
    const pop = els.popover;
    const popRect = pop.getBoundingClientRect();

    let left = window.scrollX + rect.right + 8;
    let top = window.scrollY + rect.top;

    const maxLeft = window.scrollX + window.innerWidth - popRect.width - 12;
    const maxTop = window.scrollY + window.innerHeight - popRect.height - 12;

    if (left > maxLeft) left = window.scrollX + rect.left - popRect.width - 8;
    if (left < window.scrollX + 8) left = window.scrollX + 8;
    if (top > maxTop) top = maxTop;
    if (top < window.scrollY + 8) top = window.scrollY + 8;

    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
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

  async function handleGuestbookAction(event) {
    const target = event.target;

    const toggleBtn = target.closest(".reply-toggle-btn");
    if (toggleBtn) {
      closeNamePopover();
      const card = toggleBtn.closest(".guestbook-entry-card");
      const editor = card?.querySelector(".reply-editor");
      const textarea = card?.querySelector(".reply-textarea");
      if (editor) editor.classList.toggle("is-hidden");
      if (textarea) {
        applyFontClass(textarea, state.viewerFontPref.content_font_key || "");
        applyFontColor(textarea, state.viewerFontPref.content_color || "#eef4ff", "#eef4ff");
        applyFontEffect(textarea, "none");
      }
      return;
    }

    const submitBtn = target.closest(".reply-submit-btn");
    if (submitBtn) {
      closeNamePopover();
      const entryId = submitBtn.dataset.entryId;
      const card = submitBtn.closest(".guestbook-entry-card");
      const textarea = card?.querySelector(".reply-textarea");
      const value = normalizeTypedText(textarea?.value || "").trim();

      if (!value) {
        alert("Please enter a reply.");
        return;
      }

      const payload = {
        content: value,
        nickname_font_key: state.viewerFontPref.nickname_font_key || "",
        nickname_effect_key: state.viewerFontPref.nickname_effect_key || "none",
        nickname_scale: state.viewerFontPref.nickname_scale ?? DEFAULT_NICKNAME_SCALE,
        nickname_letter_spacing: state.viewerFontPref.nickname_letter_spacing ?? DEFAULT_NICKNAME_SPACING,
        content_font_key: state.viewerFontPref.content_font_key || "",
        content_effect_key: "none",
      };

      const result = await postJson(`${API.guestbookReplyCreateUrlBase}${entryId}/reply/create/`, payload);
      if (!result.ok) {
        alert(result.error || "Failed to save reply.");
        return;
      }

      await loadGuestbookEntries(true);
      return;
    }

    const deleteBtn = target.closest(".guestbook-delete-btn");
    if (deleteBtn) {
      closeNamePopover();
      const entryId = deleteBtn.dataset.entryId;
      if (!window.confirm("Delete this message?")) return;

      const result = await postJson(`${API.guestbookDeleteUrlBase}${entryId}/delete/`, {});
      if (!result.ok) {
        alert(result.error || "Failed to delete message.");
        return;
      }

      await loadGuestbookEntries(true);
      return;
    }

    const replyDeleteBtn = target.closest(".reply-delete-btn");
    if (replyDeleteBtn) {
      closeNamePopover();
      const replyId = replyDeleteBtn.dataset.replyId;
      if (!window.confirm("Delete this reply?")) return;

      const result = await postJson(`${API.guestbookReplyDeleteUrlBase}${replyId}/delete/`, {});
      if (!result.ok) {
        alert(result.error || "Failed to delete reply.");
        return;
      }

      await loadGuestbookEntries(true);
    }
  }

  async function saveCurrentState() {
    if (!isOwner || state.isSaving || !API.avatarSaveUrl) return false;

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

      renderAll();
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

  function buildLocalViewerFontPrefAfterApply(selectedItem, payload) {
    return {
      ...state.viewerFontPref,
      nickname_font_item_id: selectedItem ? selectedItem.item_id : null,
      nickname_font_key: selectedItem?.font_key || "",
      nickname_effect_key: payload.effect_key || "none",
      nickname_scale: Number(payload.nickname_scale ?? DEFAULT_NICKNAME_SCALE),
      nickname_letter_spacing: Number(payload.nickname_letter_spacing ?? DEFAULT_NICKNAME_SPACING),
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
    if (!isOwner || !API.avatarSaveFontUrl) return;

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
      nickname_scale: isReset ? DEFAULT_NICKNAME_SCALE : Number(state.previewFont.nicknameScale ?? DEFAULT_NICKNAME_SCALE),
      nickname_letter_spacing: isReset ? DEFAULT_NICKNAME_SPACING : Number(state.previewFont.nicknameLetterSpacing ?? DEFAULT_NICKNAME_SPACING),
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
        nicknameScale: Number(state.viewerFontPref.nickname_scale ?? DEFAULT_NICKNAME_SCALE),
        nicknameLetterSpacing: Number(state.viewerFontPref.nickname_letter_spacing ?? DEFAULT_NICKNAME_SPACING),
      };

      applyCurrentFontPreferenceToEditors();
      renderFontInventory();
      renderEffectInventory();
      updateFontSaveHint("Font applied.");
      els.resetFontDefaultBtn.dataset.resetMode = "false";
    } finally {
      if (els.saveFontPreferenceBtn) {
        els.saveFontPreferenceBtn.disabled = false;
        els.saveFontPreferenceBtn.textContent = "Apply";
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

  function setRoomStats(stats) {
    if (!stats) return;

    const todayEl = $("roomTodayVisits");
    const totalEl = $("roomTotalVisits");
    const likeEl = $("roomLikeCount");

    if (todayEl) todayEl.textContent = stats.today_visits ?? 0;
    if (totalEl) totalEl.textContent = stats.total_visits ?? 0;
    if (likeEl) likeEl.textContent = stats.like_count ?? 0;

    els.toggleRoomLikeBtn?.classList.toggle("is-liked", Boolean(stats.liked_by_me));
    if (els.toggleRoomLikeBtnText) els.toggleRoomLikeBtnText.textContent = stats.liked_by_me ? "Liked" : "Like";
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

  function buildUrl(base, username, suffix = "") {
    const cleanBase = String(base || "").replace(/\/+$/, "");
    const cleanUser = encodeURIComponent(String(username || "").replace(/^\/+|\/+$/g, ""));
    const cleanSuffix = String(suffix || "");
    return `${cleanBase}/${cleanUser}${cleanSuffix}`;
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

  async function loadFriendSelectOptions(force = false) {
    if (!els.friendSelect || !API.socialFriendListUrl) return null;
    if (state.friendOptionsLoaded && !force) return null;

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

  async function activateMainTab(tabName) {
    state.currentMainTab = tabName;
    setActiveSideTab(tabName);
    updateMainPanels(tabName);

    if (tabName === "avatar") {
      closeEditMode();
      if (!isOwner) await recordRoomVisit();
      await loadRoomStats(true);
      return;
    }

    if (tabName === "guestbook") {
      closeEditMode();
      await recordRoomVisit();
      await loadRoomStats(true);
      await loadGuestbookEntries(true);
      return;
    }

    if (tabName === "diary") {
      closeEditMode();
      await recordRoomVisit();
      await loadRoomStats(true);
      await loadDiaryMonth(true);
      await loadDiaryByDate(state.selectedDiaryDate, true);
      return;
    }

    if (tabName === "edit") {
      openEditMode();
      await loadInventoryIfNeeded(true);
      return;
    }
  }

  function showAvatarEditPanel(panelName) {
    const avatarPanel = $("avatarEditPanel");
    const fontPanel = $("fontEditPanel");

    if (!avatarPanel || !fontPanel) return;

    if (panelName === "font") {
      avatarPanel.hidden = true;
      fontPanel.hidden = false;
      openEditMode();
      loadInventoryIfNeeded(true);
      applyCurrentFontPreferenceToEditors();
      renderFontInventory();
      renderEffectInventory();
      return;
    }

    avatarPanel.hidden = false;
    fontPanel.hidden = true;
    openEditMode();
    setActiveEditSubtab(state.activeEditSubtab || "avatar");
    loadInventoryIfNeeded(true);
  }

  window.switchRightEditPanel = (panelName) => {
    if (panelName === "font") {
      setActiveSideTab("edit");
      updateMainPanels("edit");
      showAvatarEditPanel("font");
      return;
    }

    setActiveSideTab("edit");
    updateMainPanels("edit");
    showAvatarEditPanel("avatar");
  };

  window.closeRightEditPanels = async () => {
    closeEditMode();
    await activateMainTab("avatar");
  };

  function bindStaticEvents() {
    $$(".side-tab-btn[data-tab-target]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        closeNamePopover();
        const target = btn.dataset.tabTarget;
        if (!target) return;

        if (target === "edit") {
          window.switchRightEditPanel?.("avatar");
          return;
        }
        await activateMainTab(target);
      });
    });

    $$(".avatar-edit-subtab-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        closeNamePopover();
        const target = btn.dataset.editSubtab || "avatar";
        setActiveEditSubtab(target);
        await loadInventoryIfNeeded(false);
      });
    });

    document.addEventListener("click", async (e) => {
      const filterBtn = e.target.closest(".inventory-filter-btn");
      if (filterBtn) {
        if (state.activeEditSubtab !== "avatar") return;
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
        renderSetInventory();
        renderUniqueInventory();
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
        renderSetInventory();
        renderUniqueInventory();
        return;
      }

      const fontBtn = e.target.closest('[data-action="select-font-item"]');
      if (fontBtn) {
        closeNamePopover();
        const itemId = Number(fontBtn.dataset.itemId || 0);
        const selectedItem = itemByItemId(itemId);
        state.selectedFontItemId = itemId || null;
        state.previewFont.itemId = itemId || null;
        state.previewFont.fontKey = selectedItem?.font_key || "";
        state.previewFont.effectKey = currentSelectedEffectKey();
        state.previewFont.nicknameScale = Number(state.viewerFontPref.nickname_scale ?? DEFAULT_NICKNAME_SCALE);
        state.previewFont.nicknameLetterSpacing = Number(state.viewerFontPref.nickname_letter_spacing ?? DEFAULT_NICKNAME_SPACING);
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
        return;
      }

      const dayBtn = e.target.closest('[data-action="pick-diary-date"]');
      if (dayBtn) {
        closeNamePopover();
        await handleDiaryDatePick(dayBtn.dataset.date || "");
        return;
      }

      const nameBtn = e.target.closest(".js-name-pop");
      if (nameBtn) {
        e.preventDefault();
        e.stopPropagation();
        const roomUrl = nameBtn.dataset.roomUrl || "";
        toggleNamePopover(nameBtn, roomUrl);
        return;
      }

      if (els.popover && !els.popover.contains(e.target)) {
        closeNamePopover();
      }
    });

    $$(".gender-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        closeNamePopover();
        state.draftAvatar.gender = btn.dataset.gender || "male";
        updateGenderButtons();
        renderAvatarCanvas();
      });
    });

    els.nicknameSizeDownBtn?.addEventListener("click", () => {
      state.previewFont.nicknameScale = clamp(
        Number(state.previewFont.nicknameScale ?? state.viewerFontPref.nickname_scale ?? DEFAULT_NICKNAME_SCALE) - 0.1,
        MIN_NICKNAME_SCALE,
        MAX_NICKNAME_SCALE
      );
      applyLiveNicknamePreview();
      syncNicknameToolUI();
    });

    els.nicknameSizeUpBtn?.addEventListener("click", () => {
      state.previewFont.nicknameScale = clamp(
        Number(state.previewFont.nicknameScale ?? state.viewerFontPref.nickname_scale ?? DEFAULT_NICKNAME_SCALE) + 0.1,
        MIN_NICKNAME_SCALE,
        MAX_NICKNAME_SCALE
      );
      applyLiveNicknamePreview();
      syncNicknameToolUI();
    });

    els.nicknameSpacingDownBtn?.addEventListener("click", () => {
      state.previewFont.nicknameLetterSpacing = clamp(
        Number(state.previewFont.nicknameLetterSpacing ?? state.viewerFontPref.nickname_letter_spacing ?? DEFAULT_NICKNAME_SPACING) - 0.5,
        MIN_NICKNAME_SPACING,
        MAX_NICKNAME_SPACING
      );
      applyLiveNicknamePreview();
      syncNicknameToolUI();
    });

    els.nicknameSpacingUpBtn?.addEventListener("click", () => {
      state.previewFont.nicknameLetterSpacing = clamp(
        Number(state.previewFont.nicknameLetterSpacing ?? state.viewerFontPref.nickname_letter_spacing ?? DEFAULT_NICKNAME_SPACING) + 0.5,
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

    window.addEventListener("scroll", () => {
      if (els.popover && !els.popover.classList.contains("is-hidden")) positionPopover();
    }, { passive: true });

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      if (els.popover && !els.popover.classList.contains("is-hidden")) closeNamePopover();
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        updateFontEffectCarousels();
      }, 80);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNamePopover();
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

    els.closeEditDrawerBtn?.addEventListener("click", async () => {
      closeNamePopover();
      await activateMainTab("avatar");
    });

    els.saveAvatarChangesBtn?.addEventListener("click", async () => {
      closeNamePopover();
      await saveCurrentState();
    });

    els.saveFontPreferenceBtn?.addEventListener("click", async () => {
      closeNamePopover();
      els.resetFontDefaultBtn.dataset.resetMode = "false";
      await saveFontPreference();
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

        renderAll();
        openEditMode();
        setActiveEditSubtab(state.activeEditSubtab || "avatar");
        updateSaveHint("Avatar reset saved.");
      } finally {
        if (els.resetAvatarBtn) {
          els.resetAvatarBtn.disabled = false;
          els.resetAvatarBtn.textContent = "Reset Avatar";
        }
      }
    });

    els.visitFriendBtn?.addEventListener("click", () => {
      closeNamePopover();
      const username = els.friendSelect?.value || "";
      if (!username) {
        alert("Choose a friend first.");
        return;
      }
      window.location.href = `${API.friendAvatarBase}${username}/`;
    });

    els.goMyRoomBtn?.addEventListener("click", () => {
      closeNamePopover();
      window.location.href = API.myRoomUrl;
    });

    els.toggleRoomLikeBtn?.addEventListener("click", async () => {
      closeNamePopover();
      const username = ownerUsername();
      const result = await postJson(buildUrl(API.socialRoomLikeUrlBase, username, "/like/"), {});
      if (!result.ok) {
        alert(result.error || "Failed to toggle like.");
        return;
      }
      if (result.stats) setRoomStats(result.stats);
    });

    els.sendFriendRequestBtn?.addEventListener("click", async () => {
      closeNamePopover();
      const username = ownerUsername();
      const result = await postJson(`${API.socialFriendRequestUrlBase}${username}/`, {});
      if (!result.ok) {
        alert(result.error || "Failed to update friend request.");
        return;
      }

      if (result.action === "sent") els.sendFriendRequestBtn.textContent = "Cancel Request";
      else if (result.action === "canceled") els.sendFriendRequestBtn.textContent = "Add Friend";
    });

    els.guestbookSubmitBtn?.addEventListener("click", async () => {
      closeNamePopover();
      const content = normalizeTypedText(els.guestbookContentInput?.value || "").trim();
      if (!content) {
        alert("Please enter a guestbook message.");
        return;
      }

      const payload = {
        content,
        nickname_font_key: state.viewerFontPref.nickname_font_key || "",
        nickname_effect_key: state.viewerFontPref.nickname_effect_key || "none",
        nickname_scale: state.viewerFontPref.nickname_scale ?? DEFAULT_NICKNAME_SCALE,
        nickname_letter_spacing: state.viewerFontPref.nickname_letter_spacing ?? DEFAULT_NICKNAME_SPACING,
        content_font_key: state.viewerFontPref.content_font_key || "",
        content_effect_key: "none",
      };

      const result = await postJson(API.guestbookCreateUrl, payload);
      if (!result.ok) {
        alert(result.error || "Failed to leave message.");
        return;
      }

      if (els.guestbookContentInput) els.guestbookContentInput.value = "";
      await loadGuestbookEntries(true);
    });

    els.guestbookList?.addEventListener("click", handleGuestbookAction);

    els.diaryDateInput?.addEventListener("change", async () => {
      closeNamePopover();
      const dateStr = els.diaryDateInput.value;
      if (!dateStr) return;

      const parts = dateStr.split("-").map(Number);
      if (parts.length === 3) {
        state.calendarYear = parts[0];
        state.calendarMonth = parts[1] - 1;
      }

      setDiarySelectedDate(dateStr);
      await loadDiaryMonth(true);
      await loadDiaryByDate(dateStr, true);
    });

    els.diarySubmitBtn?.addEventListener("click", async () => {
      closeNamePopover();
      const entryId = els.diaryEntryIdInput?.value?.trim() || "";
      const payload = {
        title: normalizeTypedText(els.diaryTitleInput?.value || "").trim(),
        content: normalizeTypedText(els.diaryContentInput?.value || "").trim(),
        entry_date: els.diaryDateInput?.value || state.selectedDiaryDate,
        title_font_key: state.viewerFontPref.title_font_key || "",
        title_effect_key: state.viewerFontPref.title_effect_key || state.viewerFontPref.nickname_effect_key || "none",
        content_font_key: state.viewerFontPref.content_font_key || "",
        content_effect_key: "none",
      };

      if (!payload.entry_date) {
        alert("Choose a diary date first.");
        return;
      }

      if (!payload.title || !payload.content) {
        alert("Please enter both title and content.");
        return;
      }

      const url = entryId ? `${API.diaryUpdateUrlBase}${entryId}/update/` : API.diaryCreateUrl;

      const result = await postJson(url, payload);
      if (!result.ok) {
        alert(result.error || "Failed to save diary.");
        return;
      }

      if (els.diaryEntryIdInput) els.diaryEntryIdInput.value = result.entry?.id || "";

      await loadDiaryMonth(true);
      await loadDiaryByDate(payload.entry_date, true);
    });

    els.diaryClearBtn?.addEventListener("click", () => {
      closeNamePopover();
      clearDiaryForm(true);
    });

    els.diaryDeleteBtn?.addEventListener("click", async () => {
      closeNamePopover();
      const entryId = els.diaryEntryIdInput?.value?.trim() || "";
      if (!entryId) {
        alert("No saved diary on this selected date.");
        return;
      }
      await handleDiaryDelete(entryId);
    });

    els.diaryList?.addEventListener("click", async (e) => {
      const inlineDeleteBtn = e.target.closest(".diary-inline-delete-btn");
      if (!inlineDeleteBtn) return;
      closeNamePopover();
      await handleDiaryDelete(inlineDeleteBtn.dataset.entryId);
    });

    els.calendarPrevBtn?.addEventListener("click", async () => {
      closeNamePopover();
      state.calendarMonth -= 1;
      if (state.calendarMonth < 0) {
        state.calendarMonth = 11;
        state.calendarYear -= 1;
      }
      await loadDiaryMonth(true);
    });

    els.calendarNextBtn?.addEventListener("click", async () => {
      closeNamePopover();
      state.calendarMonth += 1;
      if (state.calendarMonth > 11) {
        state.calendarMonth = 0;
        state.calendarYear += 1;
      }
      await loadDiaryMonth(true);
    });
  }

  async function init() {
    setDiarySelectedDate(state.selectedDiaryDate);

    state.previewFont = {
      itemId: null,
      fontKey: "",
      effectKey: state.viewerFontPref.nickname_effect_key || "none",
      nicknameScale: Number(state.viewerFontPref.nickname_scale ?? DEFAULT_NICKNAME_SCALE),
      nicknameLetterSpacing: Number(state.viewerFontPref.nickname_letter_spacing ?? DEFAULT_NICKNAME_SPACING),
    };

    if (els.fontEffectSelect) {
      els.fontEffectSelect.value = state.viewerFontPref.nickname_effect_key || "none";
    }

    renderCalendar();
    setActiveEditSubtab("avatar");
    renderAll();
    bindStaticEvents();
    await activateMainTab("avatar");
    await loadFriendSelectOptions();
    applyCurrentFontPreferenceToEditors();
    updateFontEffectCarousels();
    closeNamePopover();
  }

  init();
});