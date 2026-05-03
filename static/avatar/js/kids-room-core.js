(function () {
  const App = (window.MathnerKidsRoom = window.MathnerKidsRoom || {});

  App.modules = App.modules || [];
  App.started = false;

  App.register = function register(moduleFn) {
    if (typeof moduleFn === "function") {
      App.modules.push(moduleFn);
    }
  };

  App.start = function start() {
    if (App.started) return;
    App.started = true;

    const page = document.getElementById("avatarPage");
    if (!page) return;

    App.setup(page);

    for (const moduleFn of App.modules) {
      moduleFn(App);
    }

    if (typeof App.init === "function") {
      App.init();
    }
  };

  App.setup = function setup(page) {
    const $ = (id) => document.getElementById(id);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

    App.page = page;
    App.$ = $;
    App.$$ = $$;

    const ds = page.dataset;
    App.ds = ds;
    App.isOwner = ds.isOwner === "true";

    App.els = {
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
      roomOwnerUsername: $("roomOwnerUsername"),

      avatarLayout: $("avatarLayout"),
      avatarHeroCard: $("avatarHeroCard"),
      stageContentCard: $("avatarStageContentCard"),
      dynamicPanelTitle: $("dynamicPanelTitle"),

      avatarSideEdit: $("avatarSideEdit"),
      avatarEditPanel: $("avatarEditPanel"),
      fontEditPanel: $("fontEditPanel"),
      closeEditDrawerBtn: $("closeEditDrawerBtn"),
      closeFontDrawerBtn: $("closeFontDrawerBtn"),

      tabGuestbook: $("tab-guestbook"),
      tabDiary: $("tab-diary"),

      avatarEditSubpanelAvatar: $("avatarEditSubpanelAvatar"),
      avatarEditSubpanelSet: $("avatarEditSubpanelSet"),
      avatarEditSubpanelUnique: $("avatarEditSubpanelUnique"),

      inventoryGenderFilterBar: $("inventoryGenderFilterBar"),
      inventoryTypeFilterBar: $("inventoryTypeFilterBar"),
      setTypeFilterBar: $("setTypeFilterBar"),
      uniqueTypeFilterBar: $("uniqueTypeFilterBar"),

      calendarGrid: $("calendarGrid"),
      calendarMonthLabel: $("calendarMonthLabel"),
      calendarPrevBtn: $("calendarPrevBtn"),
      calendarNextBtn: $("calendarNextBtn"),

      guestbookContentInput: $("guestbookContent"),
      guestbookSubmitBtn: $("guestbookSubmitBtn"),
      guestbookList: $("guestbookList"),

      diaryDateInput: $("diaryDate"),
      diarySelectedDateText: $("diarySelectedDateText"),
      diaryEntryIdInput: $("diaryEntryId"),
      diaryTitleInput: $("diaryTitle"),
      diaryContentInput: $("diaryContent"),
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

      confirmModal: $("confirmModal"),
      confirmOkBtn: $("confirmOkBtn"),
      confirmCancelBtn: $("confirmCancelBtn"),
    };

    App.API = {
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
      socialFriendRespondUrlBase: ds.socialFriendRespondUrlBase || "/social/api/friends/respond/",
      socialRoomStatsUrlBase: ds.socialRoomStatsUrlBase || "/social/api/rooms/",
      socialRoomVisitUrlBase: ds.socialRoomVisitUrlBase || "/social/api/rooms/",
      socialRoomLikeUrlBase: ds.socialRoomLikeUrlBase || "/social/api/rooms/",
    };

    App.SUPPORTED_SLOTS = new Set([
      "head",
      "eyes",
      "mouth",
      "eyebrow",
      "front_hair",
      "rear_hair",
      "body",
      "top",
      "cloth",
      "pants",
      "shoes",
      "hat",
    ]);

    App.SLOT_ORDER = [
      "rear_hair",
      "cloth",
      "body",
      "pants",
      "shoes",
      "top",
      "head",
      "eyebrow",
      "eyes",
      "mouth",
      "front_hair",
      "hat",
    ];

    App.SLOT_CLASS_MAP = {
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

    App.SLOT_LABEL_MAP = {
      head: "얼굴",
      eyes: "눈",
      mouth: "입",
      eyebrow: "눈썹",
      front_hair: "앞머리",
      rear_hair: "뒷머리",
      body: "몸",
      top: "상의",
      cloth: "전신옷",
      pants: "하의",
      shoes: "신발",
      hat: "모자",
      set: "세트",
      unique: "스페셜",
    };

    App.ALL_FONT_CLASSES = [
      "font-default",
      "font-pretendard",

      "font-cute_font",
      "font-dongle",
      "font-gaegu",
      "font-gamja_flower",
      "font-gowun_dodum",
      "font-gowun_batang",
      "font-gugi",
      "font-hi_melody",
      "font-jua",
      "font-nanum_pen",
      "font-poor_story",
      "font-single_day",
      "font-sunflower",
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

    App.EFFECT_CLASS_LIST = [
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

    App.EFFECT_LABEL_MAP = {
      none: "없음",
      neon_blue: "Neon Blue",
      rainbow_flow: "Rainbow Flow",
      gold_glow: "Gold Glow",
      sparkle: "Sparkle",
      glitch: "Glitch",
      float_wave: "Float Wave",
      fire_glow: "Fire Glow",
      ice_glow: "Ice Glow",
    };

    App.DEFAULT_NICKNAME_SCALE = 1.0;
    App.DEFAULT_NICKNAME_SPACING = 0.0;
    App.MIN_NICKNAME_SCALE = 0.8;
    App.MAX_NICKNAME_SCALE = 1.6;
    App.MIN_NICKNAME_SPACING = -1.0;
    App.MAX_NICKNAME_SPACING = 6.0;

    App.EMPTY_FONT_PREF = {
      nickname_font_key: "",
      title_font_key: "",
      content_font_key: "",
      nickname_font_item_id: null,
      title_font_item_id: null,
      content_font_item_id: null,
      nickname_effect_key: "none",
      title_effect_key: "none",
      content_effect_key: "none",
      nickname_color: "#73c5ff",
      title_color: "#403932",
      content_color: "#403932",
      nickname_scale: App.DEFAULT_NICKNAME_SCALE,
      nickname_letter_spacing: App.DEFAULT_NICKNAME_SPACING,
    };

    App.state = {
      avatar: App.normalizeAvatarState(App.safeJsonParse(ds.avatarJson, {})),
      ownedItems: App.normalizeInventoryItems(App.safeJsonParse(ds.ownedAvatarItemJson || ds.inventoryItemsJson, [])),
      ownedEffects: App.normalizeOwnedEffects(App.safeJsonParse(ds.ownedEffectJson, [])),
      draftAvatar: {},
      isSaving: false,

      selectedFontItemId: null,

      ownerFontPref: {
        ...App.EMPTY_FONT_PREF,
        ...App.safeJsonParse(ds.roomOwnerFontPrefJson || ds.room_owner_font_pref_json, {}),
      },

      viewerFontPref: {
        ...App.EMPTY_FONT_PREF,
        ...App.safeJsonParse(ds.viewerFontPrefJson || ds.viewer_font_pref_json || ds.fontPrefJson, {}),
      },

      previewFont: {
        itemId: null,
        fontKey: "",
        effectKey: "none",
        nicknameScale: App.DEFAULT_NICKNAME_SCALE,
        nicknameLetterSpacing: App.DEFAULT_NICKNAME_SPACING,
      },

      activeInventoryGenderFilter: "all",
      activeInventoryTypeFilter: "all",
      activeSetTypeFilter: "all",
      activeUniqueTypeFilter: "all",
      activeEditSubtab: "avatar",

      currentMainTab: "avatar",
      friendOptionsLoaded: false,
      inventoryLoaded: Array.isArray(App.safeJsonParse(ds.ownedAvatarItemJson || ds.inventoryItemsJson, [])),
      inventoryPromise: null,

      roomStatsPromise: null,
      friendListPromise: null,
      guestbookPromise: null,
      diaryMonthPromise: null,
      diaryDatePromise: null,
      roomVisitPromise: null,

      friendshipStatus: String(ds.friendshipStatus || "none").trim(),
      friendshipDirection: String(ds.friendshipDirection || "none").trim(),
      friendshipId: String(ds.friendshipId || "").trim(),

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

    App.state.ownerFontPref.nickname_font_key = App.normalizeFontKey(App.state.ownerFontPref.nickname_font_key);
    App.state.ownerFontPref.title_font_key = App.normalizeFontKey(App.state.ownerFontPref.title_font_key);
    App.state.ownerFontPref.content_font_key = App.normalizeFontKey(App.state.ownerFontPref.content_font_key);

    App.state.viewerFontPref.nickname_font_key = App.normalizeFontKey(App.state.viewerFontPref.nickname_font_key);
    App.state.viewerFontPref.title_font_key = App.normalizeFontKey(App.state.viewerFontPref.title_font_key);
    App.state.viewerFontPref.content_font_key = App.normalizeFontKey(App.state.viewerFontPref.content_font_key);

    App.state.selectedDiaryDate = App.formatDateLocal(App.state.today);
    App.state.draftAvatar = App.deepCopy(App.state.avatar);

    App.state.selectedFontItemId = Number(
      App.state.viewerFontPref.nickname_font_item_id ||
      App.state.viewerFontPref.font_item_id ||
      0
    ) || null;

    const selectedFontCandidate = App.state.selectedFontItemId
      ? App.state.ownedItems.find((item) => Number(item.item_id) === Number(App.state.selectedFontItemId))
      : null;

    if (selectedFontCandidate && !App.isProfileFontItem(selectedFontCandidate)) {
      App.state.selectedFontItemId = null;
      App.state.viewerFontPref.nickname_font_item_id = null;
      App.state.viewerFontPref.title_font_item_id = null;
      App.state.viewerFontPref.content_font_item_id = null;
      App.state.viewerFontPref.nickname_font_key = "";
      App.state.viewerFontPref.title_font_key = "";
      App.state.viewerFontPref.content_font_key = "";
    }

    App.state.previewFont = {
      itemId: App.state.selectedFontItemId,
      fontKey: App.state.viewerFontPref.nickname_font_key || "",
      effectKey: App.state.viewerFontPref.nickname_effect_key || "none",
      nicknameScale: Number(App.state.viewerFontPref.nickname_scale ?? App.DEFAULT_NICKNAME_SCALE),
      nicknameLetterSpacing: Number(App.state.viewerFontPref.nickname_letter_spacing ?? App.DEFAULT_NICKNAME_SPACING),
    };
  };

  App.safeJsonParse = function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value || "");
    } catch {
      return fallback;
    }
  };

  App.deepCopy = function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj ?? {}));
  };

  App.escapeHtml = function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  App.normalizeTypedText = function normalizeTypedText(value) {
    return String(value ?? "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\u00a0/g, " ")
      .replace(/^\s+/gm, "");
  };

  App.escapeHtmlPreserveText = function escapeHtmlPreserveText(value) {
    return App.escapeHtml(App.normalizeTypedText(value));
  };

  App.clamp = function clamp(num, min, max) {
    return Math.min(max, Math.max(min, Number(num)));
  };

  App.formatDateLocal = function formatDateLocal(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  App.uniqueList = function uniqueList(list) {
    const seen = new Set();
    const out = [];

    for (const value of list) {
      const clean = String(value || "").trim();
      if (!clean) continue;
      if (seen.has(clean)) continue;

      seen.add(clean);
      out.push(clean);
    }

    return out;
  };

  App.swapExt = function swapExt(url, ext) {
    const clean = String(url || "").trim();
    if (!clean) return "";

    const hashParts = clean.split("#");
    const beforeHash = hashParts[0];
    const hash = hashParts.length > 1 ? `#${hashParts.slice(1).join("#")}` : "";

    const queryParts = beforeHash.split("?");
    const path = queryParts[0];
    const query = queryParts.length > 1 ? `?${queryParts.slice(1).join("?")}` : "";

    if (!/\.(webp|png|jpg|jpeg|gif)$/i.test(path)) return clean;

    return `${path.replace(/\.(webp|png|jpg|jpeg|gif)$/i, `.${ext}`)}${query}${hash}`;
  };

  App.addFilenameAlternatives = function addFilenameAlternatives(url) {
    const clean = String(url || "").trim();
    if (!clean) return [];

    const list = [clean];

    const pairs = [
      ["rear_hair", "back_hair"],
      ["rear_hair", "hair_back"],
      ["front_hair", "hair_front"],
      ["eyebrow", "eyebrows"],
      ["eyes", "eye"],
      ["mouth", "lips"],
    ];

    for (const [a, b] of pairs) {
      if (clean.includes(a)) list.push(clean.replace(a, b));
      if (clean.includes(b)) list.push(clean.replace(b, a));
    }

    return App.uniqueList(list);
  };

  App.imageCandidates = function imageCandidates(url) {
    const clean = String(url || "").trim();
    if (!clean) return [];

    const baseList = App.addFilenameAlternatives(clean);
    const candidates = [];

    for (const item of baseList) {
      candidates.push(item);
      candidates.push(App.swapExt(item, "webp"));
      candidates.push(App.swapExt(item, "png"));
      candidates.push(App.swapExt(item, "jpg"));
      candidates.push(App.swapExt(item, "jpeg"));
    }

    return App.uniqueList(candidates);
  };

  App.setImageWithFallback = function setImageWithFallback(img, url, debugName = "") {
    const candidates = App.imageCandidates(url);

    img.dataset.srcCandidates = JSON.stringify(candidates);
    img.dataset.srcIndex = "0";
    img.dataset.debugName = debugName;

    img.onerror = () => {
      const list = App.safeJsonParse(img.dataset.srcCandidates || "[]", []);
      const nextIndex = Number(img.dataset.srcIndex || 0) + 1;

      if (nextIndex < list.length) {
        img.dataset.srcIndex = String(nextIndex);
        img.src = list[nextIndex];
        return;
      }

      img.onerror = null;
      img.style.display = "none";

      if (window.console && console.warn) {
        console.warn("[Mathner Avatar] image load failed:", debugName, list);
      }
    };

    if (candidates.length) img.src = candidates[0];
  };

  App.setPanelVisible = function setPanelVisible(el, show) {
    if (!el) return;

    if (show) {
      el.removeAttribute("hidden");
      el.style.display = "block";
      el.classList.add("is-active");
    } else {
      el.setAttribute("hidden", "hidden");
      el.style.display = "none";
      el.classList.remove("is-active");
    }
  };

  App.setVisible = function setVisible(el, show, displayValue = "block") {
    if (!el) return;

    if (show) {
      el.removeAttribute("hidden");
      el.setAttribute("aria-hidden", "false");
      el.style.display = displayValue;
      el.classList.add("is-visible");
    } else {
      el.setAttribute("hidden", "hidden");
      el.setAttribute("aria-hidden", "true");
      el.style.display = "none";
      el.classList.remove("is-visible");
    }
  };

  App.normalizeSlotName = function normalizeSlotName(slot) {
    const s = String(slot || "").toLowerCase().trim();

    if (["front_hair", "hair_front", "hairfront", "fronthair", "앞머리"].includes(s)) return "front_hair";
    if (["rear_hair", "hair_rear", "hair_back", "back_hair", "hairrear", "hairback", "rearhair", "뒷머리"].includes(s)) return "rear_hair";
    if (["eye", "eyes", "눈"].includes(s)) return "eyes";
    if (["eyebrow", "eyebrows", "brow", "brows", "눈썹"].includes(s)) return "eyebrow";
    if (["mouth", "lip", "lips", "입"].includes(s)) return "mouth";
    if (["head", "face", "얼굴"].includes(s)) return "head";
    if (["body", "몸"].includes(s)) return "body";
    if (["top", "상의"].includes(s)) return "top";
    if (["cloth", "clothes", "outfit", "robe", "cloak", "cape", "전신옷", "전신"].includes(s)) return "cloth";
    if (["pants", "bottom", "bottoms", "trousers", "하의", "바지"].includes(s)) return "pants";
    if (["shoes", "shoe", "boots", "boot", "신발"].includes(s)) return "shoes";
    if (["hat", "cap", "crown", "halo", "tiara", "wreath", "모자"].includes(s)) return "hat";
    if (["set", "세트"].includes(s)) return "set";
    if (["unique", "special", "스페셜", "유니크"].includes(s)) return "unique";

    return s;
  };

  App.inferSlotFromItemMeta = function inferSlotFromItemMeta(item) {
    const source = [
      item?.name,
      item?.image_url,
      item?.image,
      item?.image_path,
      item?.slug,
      item?.code,
      item?.category,
      item?.item_group,
      item?.subtype,
      item?.subcategory,
      item?.type,
      item?.item_type,
      item?.item_category,
    ].filter(Boolean).join(" ").toLowerCase();

    if (/(전신옷|robe|cloak|cape|mantle|coat|outer|cloth|outfit|jacket|hoodie)/.test(source)) return "cloth";
    if (/(상의|top|shirt|tee|vest)/.test(source)) return "top";
    if (/(하의|바지|pants|trouser|bottom)/.test(source)) return "pants";
    if (/(신발|shoe|shoes|boot|boots|sneaker)/.test(source)) return "shoes";
    if (/(모자|crown|wreath|laurel|halo|hat|cap|tiara)/.test(source)) return "hat";
    if (/(앞머리|front hair|front_hair|hairfront|fronthair)/.test(source)) return "front_hair";
    if (/(뒷머리|rear hair|rear_hair|hairback|back hair|rearhair)/.test(source)) return "rear_hair";
    if (/(눈썹|eyebrow|brow)/.test(source)) return "eyebrow";
    if (/(눈|eyes|eye)/.test(source)) return "eyes";
    if (/(입|mouth|lip)/.test(source)) return "mouth";
    if (/(얼굴|head|face)/.test(source)) return "head";
    if (/(몸|body)/.test(source)) return "body";

    return "";
  };

  App.getDraftKeyBySlot = function getDraftKeyBySlot(slot) {
    return `${App.normalizeSlotName(slot)}_item_id`;
  };

  App.normalizeAvatarState = function normalizeAvatarState(raw) {
    const avatar = App.deepCopy(raw || {});
    const nested = avatar.equipped_item_ids || avatar.equipped || {};

    for (const slot of App.SUPPORTED_SLOTS) {
      const key = `${slot}_item_id`;

      if (!(key in avatar)) {
        avatar[key] =
          nested[key] ??
          nested[slot] ??
          nested[App.normalizeSlotName(slot)] ??
          null;
      }
    }

    avatar.gender = avatar.gender || avatar.base_gender || "male";
    return avatar;
  };

  App.resolveItemSlot = function resolveItemSlot(item) {
    const candidates = [
      item.slot,
      item.equip_slot,
      item.item_slot,
      item.avatar_slot,
      item.part,
      item.subtype,
      item.subcategory,
      item.type,
      item.item_type,
      item.item_category,
      item.category,
    ];

    for (const candidate of candidates) {
      const normalized = App.normalizeSlotName(candidate);
      if (App.SUPPORTED_SLOTS.has(normalized)) return normalized;
    }

    const inferred = App.normalizeSlotName(App.inferSlotFromItemMeta(item));
    if (App.SUPPORTED_SLOTS.has(inferred)) return inferred;

    return "";
  };

  App.FONT_KEY_ALIAS_MAP = {
    pretendard: "pretendard",
    "프리텐다드": "pretendard",
    "프리텐다드체": "pretendard",

    cute: "cute_font",
    cutefont: "cute_font",
    cute_font: "cute_font",
    "cute font": "cute_font",
    "큐트폰트": "cute_font",
    "귀여운폰트": "cute_font",
    "귀여운 폰트": "cute_font",

    dongle: "dongle",
    "동글": "dongle",
    "동글체": "dongle",

    gaegu: "gaegu",
    "개구": "gaegu",
    "개구체": "gaegu",

    gamja: "gamja_flower",
    gamjaflower: "gamja_flower",
    gamja_flower: "gamja_flower",
    "gamja flower": "gamja_flower",
    "감자꽃": "gamja_flower",
    "감자꽃체": "gamja_flower",

    gowundodum: "gowun_dodum",
    gowun_dodum: "gowun_dodum",
    "gowun dodum": "gowun_dodum",
    "고운돋움": "gowun_dodum",
    "고운돋움체": "gowun_dodum",

    gowunbatang: "gowun_batang",
    gowun_batang: "gowun_batang",
    "gowun batang": "gowun_batang",
    "고운바탕": "gowun_batang",
    "고운바탕체": "gowun_batang",

    gugi: "gugi",
    "구기": "gugi",
    "구기체": "gugi",

    himelody: "hi_melody",
    hi_melody: "hi_melody",
    "hi melody": "hi_melody",
    "하이멜로디": "hi_melody",
    "하이멜로디체": "hi_melody",

    jua: "jua",
    "주아": "jua",
    "주아체": "jua",

    nanumpen: "nanum_pen",
    nanum_pen: "nanum_pen",
    "nanum pen": "nanum_pen",
    "나눔펜": "nanum_pen",
    "나눔펜체": "nanum_pen",

    poorstory: "poor_story",
    poor_story: "poor_story",
    "poor story": "poor_story",
    "푸어스토리": "poor_story",
    "푸어 스토리": "poor_story",
    "푸어스토리체": "poor_story",

    singleday: "single_day",
    single_day: "single_day",
    "single day": "single_day",
    "싱글데이": "single_day",
    "싱글 데이": "single_day",
    "싱글데이체": "single_day",

    sunflower: "sunflower",
    "해바라기": "sunflower",
    "해바라기체": "sunflower",

    dokdo: "dokdo",
    "독도": "dokdo",
    "독도체": "dokdo",

    bubblegumsans: "bubblegum_sans",
    bubblegum_sans: "bubblegum_sans",
    "bubblegum sans": "bubblegum_sans",

    deliusswashcaps: "delius_swash_caps",
    delius_swash_caps: "delius_swash_caps",
    "delius swash caps": "delius_swash_caps",

    boogaloo: "boogaloo",

    loveyalikeasister: "love_ya_like_a_sister",
    love_ya_like_a_sister: "love_ya_like_a_sister",
    "love ya like a sister": "love_ya_like_a_sister",

    luckiestguy: "luckiest_guy",
    luckiest_guy: "luckiest_guy",
    "luckiest guy": "luckiest_guy",

    comingsoon: "coming_soon",
    coming_soon: "coming_soon",
    "coming soon": "coming_soon",

    lifesavers: "life_savers",
    life_savers: "life_savers",
    "life savers": "life_savers",

    chewy: "chewy",

    cabinsketch: "cabin_sketch",
    cabin_sketch: "cabin_sketch",
    "cabin sketch": "cabin_sketch",

    mousememoirs: "mouse_memoirs",
    mouse_memoirs: "mouse_memoirs",
    "mouse memoirs": "mouse_memoirs",

    londrinashadow: "londrina_shadow",
    londrina_shadow: "londrina_shadow",
    "londrina shadow": "londrina_shadow",

    modak: "modak",

    amaticsc: "amatic_sc",
    amatic_sc: "amatic_sc",
    "amatic sc": "amatic_sc",

    capriola: "capriola",
    mclaren: "mclaren",
  };

  App.normalizeFontKey = function normalizeFontKey(key) {
    const raw = String(key || "").trim();

    if (!raw) return "";

    const lower = raw.toLowerCase();

    if (App.FONT_KEY_ALIAS_MAP[raw]) {
      return App.FONT_KEY_ALIAS_MAP[raw];
    }

    if (App.FONT_KEY_ALIAS_MAP[lower]) {
      return App.FONT_KEY_ALIAS_MAP[lower];
    }

    const normalized = lower
      .replace(/-/g, "_")
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_가-힣]/g, "")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");

    if (App.FONT_KEY_ALIAS_MAP[normalized]) {
      return App.FONT_KEY_ALIAS_MAP[normalized];
    }

    const compact = normalized.replace(/_/g, "");

    if (App.FONT_KEY_ALIAS_MAP[compact]) {
      return App.FONT_KEY_ALIAS_MAP[compact];
    }

    return normalized;
  };

  App.isProfileFontCategory = function isProfileFontCategory(item) {
    if (!item) return false;

    const category = String(item.category || item.item_category || "").toLowerCase().trim();
    const type = String(item.type || item.item_type || "").toLowerCase().trim();
    const group = String(item.item_group || item.group || "").toLowerCase().trim();

    return (
      category === "profile_font" ||
      category === "font" ||
      type === "profile_font" ||
      type === "font" ||
      group === "profile_font" ||
      group === "font"
    );
  };

  App.isProfileEffectCategory = function isProfileEffectCategory(item) {
    if (!item) return false;

    const category = String(item.category || item.item_category || "").toLowerCase().trim();
    const type = String(item.type || item.item_type || "").toLowerCase().trim();
    const group = String(item.item_group || item.group || "").toLowerCase().trim();

    return (
      category === "profile_effect" ||
      category === "effect" ||
      type === "profile_effect" ||
      type === "effect" ||
      group === "profile_effect" ||
      group === "effect"
    );
  };

  App.normalizeEffectKey = function normalizeEffectKey(key) {
    return String(key || "")
      .trim()
      .toLowerCase()
      .replace(/-/g, "_")
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_가-힣]/g, "")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  };

  App.normalizeInventoryItems = function normalizeInventoryItems(items) {
    if (!Array.isArray(items)) return [];

    const seen = new Map();

    for (const src of items) {
      const item = { ...(src || {}) };

      item.item_id = Number(item.item_id || item.id || item.pk || 0);
      item.owned_item_id = Number(item.owned_item_id || 0);
      item.quantity = Number(item.quantity || item.count || 1);
      item.gender = String(item.gender || item.target_gender || "common").toLowerCase().trim();
      item.category = String(item.category || item.item_category || "").toLowerCase().trim();
      item.item_group = String(item.item_group || item.group || "").toLowerCase().trim();
      item.type = String(item.type || item.item_type || "").toLowerCase().trim();
      item.image_url = item.image_url || item.image || item.image_path || "";

      const isFont = App.isProfileFontCategory(item);
      const isEffect = App.isProfileEffectCategory(item);

      item.is_font = isFont;
      item.is_effect = isEffect;

      if (isFont) {
        item.font_key = App.normalizeFontKey(
          item.font_family_key ||
          item.font_key ||
          item.code ||
          item.slug ||
          item.name ||
          item.display_name ||
          item.title ||
          ""
        );

        item.font_family_key = item.font_key;
      } else {
        item.font_key = "";
        item.font_family_key = "";
      }

      if (isEffect) {
        item.effect_key = App.normalizeEffectKey(
          item.effect_key ||
          item.key ||
          item.code ||
          item.slug ||
          item.name ||
          ""
        );
      } else {
        item.effect_key = "";
      }

      item.slot = isFont || isEffect ? "" : App.resolveItemSlot(item);

      if (!item.item_id) continue;

      if (!seen.has(item.item_id)) {
        seen.set(item.item_id, item);
      } else {
        const old = seen.get(item.item_id);
        old.quantity = Number(old.quantity || 1) + Number(item.quantity || 1);
      }
    }

    return Array.from(seen.values());
  };

  App.normalizeOwnedEffects = function normalizeOwnedEffects(items) {
    if (!Array.isArray(items)) return [];

    const seen = new Map();

    for (const raw of items) {
      const effect = { ...(raw || {}) };
      const key = String(effect.effect_key || effect.key || effect.id || effect.name || "")
        .trim()
        .toLowerCase()
        .replace(/-/g, "_")
        .replace(/\s+/g, "_");

      if (!key) continue;

      const name = effect.name || App.EFFECT_LABEL_MAP[key] || key;
      const quantity = Number(effect.quantity || effect.count || 1);

      if (!seen.has(key)) {
        seen.set(key, {
          effect_key: key,
          name,
          quantity,
        });
      } else {
        seen.get(key).quantity += quantity;
      }
    }

    return Array.from(seen.values());
  };

  App.ownerUsername = function ownerUsername() {
    const ds = App.ds;
    return ds.avatarOwner || ds.avatarOwnerUsername || "";
  };

  App.ownerDisplayName = function ownerDisplayName() {
    const ds = App.ds;

    return (
      ds.ownerDisplayName ||
      ds.avatarOwnerDisplayName ||
      ds.displayName ||
      ds.avatarOwner ||
      ""
    );
  };

  App.itemByItemId = function itemByItemId(itemId) {
    const target = Number(itemId);
    if (!target) return null;

    return App.state.ownedItems.find((item) => Number(item.item_id) === target) || null;
  };

  App.equippedItem = function equippedItem(slot) {
    const key = App.getDraftKeyBySlot(slot);
    return App.itemByItemId(App.state.draftAvatar[key]);
  };

  App.normalizeItemImageUrl = function normalizeItemImageUrl(item) {
    return item?.image_url || item?.image || item?.image_path || "";
  };

  App.avatarBaseSet = function avatarBaseSet(gender) {
    const ds = App.ds;

    if (gender === "female") {
      return {
        body: ds.baseBodyFemale || "",
        head: ds.baseHeadFemale || "",
        rear_hair: ds.baseHairBackFemale || "",
        front_hair: ds.baseHairFrontFemale || "",
        eyes: ds.baseEyesFemale || "",
        eyebrow: ds.baseEyebrowFemale || "",
        mouth: ds.baseMouthFemale || "",
      };
    }

    return {
      body: ds.baseBodyMale || "",
      head: ds.baseHeadMale || "",
      rear_hair: ds.baseHairBackMale || "",
      front_hair: ds.baseHairFrontMale || "",
      eyes: ds.baseEyesMale || "",
      eyebrow: ds.baseEyebrowMale || "",
      mouth: ds.baseMouthMale || "",
    };
  };

  App.createLayer = function createLayer(src, className, altText = "", debugName = "") {
    if (!src) return null;

    const img = document.createElement("img");
    img.className = `avatar-layer ${className}`;
    img.alt = altText;
    img.loading = "eager";
    img.decoding = "async";
    img.draggable = false;

    App.setImageWithFallback(img, src, debugName || altText || className);

    return img;
  };

  App.isSetItem = function isSetItem(item) {
    if (App.isProfileFontItem(item) || App.isProfileEffectItem(item)) return false;

    const category = String(item.category || "").toLowerCase();
    const group = String(item.item_group || "").toLowerCase();
    const name = String(item.name || "").toLowerCase();

    return category === "set" || group === "set" || name.includes("set") || name.includes("세트");
  };

  App.isUniqueItem = function isUniqueItem(item) {
    if (App.isProfileFontItem(item) || App.isProfileEffectItem(item)) return false;

    const category = String(item.category || "").toLowerCase();
    const group = String(item.item_group || "").toLowerCase();
    const name = String(item.name || "").toLowerCase();
    const imageUrl = String(item.image_url || "").toLowerCase();

    return (
      category === "unique" ||
      group === "unique" ||
      name.includes("unique") ||
      name.includes("스페셜") ||
      imageUrl.includes("/unique/")
    );
  };

  App.isProfileFontItem = function isProfileFontItem(item) {
    return App.isProfileFontCategory(item);
  };

  App.isProfileEffectItem = function isProfileEffectItem(item) {
    return App.isProfileEffectCategory(item);
  };

  App.fontClassFromKey = function fontClassFromKey(key) {
    const normalized = App.normalizeFontKey(key);

    return normalized ? `font-${normalized}` : "font-default";
  };

  App.effectKeyToClass = function effectKeyToClass(effectKey) {
    const normalized = App.normalizeEffectKey
      ? App.normalizeEffectKey(effectKey || "none")
      : String(effectKey || "none")
          .trim()
          .toLowerCase()
          .replace(/-/g, "_")
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_가-힣]/g, "")
          .replace(/_+/g, "_")
          .replace(/^_+|_+$/g, "");

    return `effect-${(normalized || "none").replace(/_/g, "-")}`;
  };

  App.resetFontClasses = function resetFontClasses(el) {
    if (!el) return;
    App.ALL_FONT_CLASSES.forEach((cls) => el.classList.remove(cls));
  };

  App.clearEffectClasses = function clearEffectClasses(el) {
    if (!el) return;
    App.EFFECT_CLASS_LIST.forEach((cls) => el.classList.remove(cls));
  };

  App.applyFontClass = function applyFontClass(el, key) {
    if (!el) return;

    App.resetFontClasses(el);
    el.classList.add(App.fontClassFromKey(key));
  };

  App.applyFontEffect = function applyFontEffect(el, effectKey) {
    if (!el) return;

    App.clearEffectClasses(el);
    el.classList.add(App.effectKeyToClass(effectKey || "none"));
  };

  App.applyFontColor = function applyFontColor(el, color, fallback = "") {
    if (!el) return;
    el.style.color = color || fallback || "";
  };

  App.applyNicknameTransform = function applyNicknameTransform(el, scale = 1, spacing = 0) {
    if (!el) return;

    el.style.fontSize = `${19 * Number(scale || 1)}px`;
    el.style.letterSpacing = `${Number(spacing || 0)}px`;
  };

  App.currentSelectedEffectKey = function currentSelectedEffectKey() {
    return (App.els.fontEffectSelect?.value || "none").replace(/-/g, "_");
  };

  App.getCsrfToken = function getCsrfToken() {
    if (window.CSRF_TOKEN) return window.CSRF_TOKEN;

    const input = document.querySelector('input[name="csrfmiddlewaretoken"]');
    if (input?.value) return input.value;

    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta?.content) return meta.content;

    const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  };

  App.fetchJson = async function fetchJson(url, options = {}) {
    if (!url) {
      return {
        ok: false,
        error: "URL이 비어있어요.",
      };
    }

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
          error: data?.error || "요청에 실패했어요.",
          ...data,
        };
      }

      return {
        ok: true,
        ...data,
      };
    } catch (error) {
      return {
        ok: false,
        error: error?.message || "네트워크 오류가 발생했어요.",
      };
    }
  };

  App.postJson = async function postJson(url, payload) {
    return App.fetchJson(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": App.getCsrfToken(),
      },
      body: JSON.stringify(payload || {}),
    });
  };

  App.withPending = async function withPending(key, fn, force = false) {
    if (!force && App.state[key]) return App.state[key];

    App.state[key] = (async () => fn())();

    try {
      return await App.state[key];
    } finally {
      App.state[key] = null;
    }
  };

  App.buildUrl = function buildUrl(base, username, suffix = "") {
    const cleanBase = String(base || "").replace(/\/+$/, "");
    const cleanUser = encodeURIComponent(String(username || "").replace(/^\/+|\/+$/g, ""));
    const cleanSuffix = String(suffix || "");
    return `${cleanBase}/${cleanUser}${cleanSuffix}`;
  };

  App.getUniqueAuraVariant = function getUniqueAuraVariant(item) {
    const source = [
      item?.name,
      item?.effect_key,
      item?.aura_key,
      item?.unique_effect_key,
      item?.category,
      item?.item_group,
      item?.image_url,
    ].filter(Boolean).join(" ").toLowerCase();

    if (/(ice|frost|snow|crystal|glacier|blizzard)/.test(source)) return "ice";
    if (/(fire|flame|inferno|phoenix|lava|ember)/.test(source)) return "fire";
    if (/(shadow|dark|night|void|black|obsidian)/.test(source)) return "shadow";
    if (/(angel|holy|sun|light|divine|halo)/.test(source)) return "holy";
    if (/(rainbow|aurora|prism|galaxy|cosmic|star)/.test(source)) return "rainbow";

    return "gold";
  };

  App.getEquippedUniqueAuraSource = function getEquippedUniqueAuraSource() {
    const prioritySlots = ["hat", "head", "front_hair", "top", "cloth", "body"];

    for (const slot of prioritySlots) {
      const item = App.equippedItem(slot);
      if (!item) continue;

      const name = String(item?.name || "").toLowerCase();
      const imageUrl = String(item?.image_url || "").toLowerCase();

      const looksLikeUnique =
        App.isUniqueItem(item) ||
        imageUrl.includes("/unique/") ||
        /(crown|halo|angel|divine|holy|unique|laurel|robe|cloak|cape)/.test(name);

      if (looksLikeUnique) {
        return {
          slot,
          item,
          variant: App.getUniqueAuraVariant(item),
        };
      }
    }

    return null;
  };

  App.buildAvatarUniqueAura = function buildAvatarUniqueAura(source) {
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
  };

  App.renderAvatarCanvas = function renderAvatarCanvas() {
    const canvasEl = App.els.avatarCanvasView;
    if (!canvasEl) return;

    canvasEl.innerHTML = "";

    const stack = document.createElement("div");
    stack.className = "avatar-stack";

    const gender = App.state.draftAvatar.gender || "male";
    const base = App.avatarBaseSet(gender);

    const sourceMap = {
      rear_hair: App.equippedItem("rear_hair") ? App.normalizeItemImageUrl(App.equippedItem("rear_hair")) : base.rear_hair,
      cloth: App.equippedItem("cloth") ? App.normalizeItemImageUrl(App.equippedItem("cloth")) : "",
      body: App.equippedItem("body") ? App.normalizeItemImageUrl(App.equippedItem("body")) : base.body,
      pants: App.equippedItem("pants") ? App.normalizeItemImageUrl(App.equippedItem("pants")) : "",
      shoes: App.equippedItem("shoes") ? App.normalizeItemImageUrl(App.equippedItem("shoes")) : "",
      top: App.equippedItem("top") ? App.normalizeItemImageUrl(App.equippedItem("top")) : "",
      head: App.equippedItem("head") ? App.normalizeItemImageUrl(App.equippedItem("head")) : base.head,
      eyebrow: App.equippedItem("eyebrow") ? App.normalizeItemImageUrl(App.equippedItem("eyebrow")) : base.eyebrow,
      eyes: App.equippedItem("eyes") ? App.normalizeItemImageUrl(App.equippedItem("eyes")) : base.eyes,
      mouth: App.equippedItem("mouth") ? App.normalizeItemImageUrl(App.equippedItem("mouth")) : base.mouth,
      front_hair: App.equippedItem("front_hair") ? App.normalizeItemImageUrl(App.equippedItem("front_hair")) : base.front_hair,
      hat: App.equippedItem("hat") ? App.normalizeItemImageUrl(App.equippedItem("hat")) : "",
    };

    const uniqueAuraSource = App.getEquippedUniqueAuraSource();
    const uniqueAura = App.buildAvatarUniqueAura(uniqueAuraSource);
    if (uniqueAura) stack.appendChild(uniqueAura);

    for (const slot of App.SLOT_ORDER) {
      const layer = App.createLayer(
        sourceMap[slot],
        App.SLOT_CLASS_MAP[slot] || `avatar-layer-${slot.replace(/_/g, "-")}`,
        App.SLOT_LABEL_MAP[slot] || slot,
        `${gender}-${slot}`
      );

      if (layer) stack.appendChild(layer);
    }

    canvasEl.appendChild(stack);
  };

  App.renderAll = function renderAll() {
    App.mergeEffectInventoryFromOwnedItems?.();
    App.renderAvatarCanvas();
    App.syncOwnerNickname?.();
    App.applyCurrentFontPreferenceToEditors?.();

    if (!App.isOwner) return;

    App.updateInventoryFilterButtons?.();
    App.updateGenderButtons?.();
    App.updateEquippedSlotState?.();
    App.renderInventory?.();
    App.renderSetInventory?.();
    App.renderUniqueInventory?.();
    App.renderFontInventory?.();
    App.renderEffectInventory?.();
    App.setActiveEditSubtab?.(App.state.activeEditSubtab || "avatar");
  };
})();