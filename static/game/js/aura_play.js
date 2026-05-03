(function () {
  "use strict";

  const PAGE_CFG = window.PLAY_PAGE_CONFIG || {};
  const playPageRoot = document.getElementById("playPageRoot");

  const GAME_MODES = {
    practice: {
      key: "practice",
      label: "🌱 연습 모드",
      shortLabel: "연습 모드",
      rewardText: '기본 1개 →<br><strong>피버 3개!</strong>',
      ruleText: '연속으로 맞추면<br><strong>마법이 강해져요!</strong>',
      operationLabel: "어떤 기호를 연습할까? ➕ ➖ ✖️ ➗",
    },
    classic: {
      key: "classic",
      label: "🌟 클래식",
      shortLabel: "클래식",
      rewardText: '기본 2개 →<br><strong>피버 4개!</strong>',
      ruleText: '처음엔 쉽고<br><strong>점점 섞여서 나와요!</strong>',
      operationLabel: "어떤 기호로 도전할까? ➕ ➖ ✖️ ➗",
    },
    challenge: {
      key: "challenge",
      label: "🔥 챌린지",
      shortLabel: "챌린지",
      rewardText: '기본 3개 →<br><strong>피버 5개!</strong>',
      ruleText: '클래식 문제가<br><strong>사칙연산으로 섞여요!</strong>',
      operationLabel: "",
    },
  };

  const OPERATION_META = {
    add: { label: "더하기 ➕", sign: "+" },
    sub: { label: "빼기 ➖", sign: "-" },
    mul: { label: "곱하기 ✖️", sign: "×" },
    div: { label: "나누기 ➗", sign: "÷" },
  };

  /*
    아바타 방 kids-room-shop-match-patch.js 방식 그대로 가져옴.
    핵심:
    - bubblegum_sans 같은 영문 키도 실제 표현은 Jua 등 shop 기준 폰트로 매칭
    - font-family를 inline style로 강제 적용
    - effect는 effect-rainbow-flow처럼 하이픈 클래스 사용
  */
  const FONT_FAMILY_MAP = {
    default: 'var(--play-font-main), "Pretendard", sans-serif',
    pretendard: 'var(--play-font-main), "Pretendard", sans-serif',

    jua: '"Jua", var(--play-font-main), sans-serif',
    bubblegum_sans: '"Jua", var(--play-font-main), sans-serif',

    gamja_flower: '"Gamja Flower", var(--play-font-main), cursive',
    delius_swash_caps: '"Gamja Flower", var(--play-font-main), cursive',

    dongle: '"Dongle", var(--play-font-main), sans-serif',
    boogaloo: '"Dongle", var(--play-font-main), sans-serif',

    hi_melody: '"Hi Melody", var(--play-font-main), cursive',
    love_ya_like_a_sister: '"Hi Melody", var(--play-font-main), cursive',

    do_hyeon: '"Do Hyeon", var(--play-font-main), sans-serif',
    luckiest_guy: '"Do Hyeon", var(--play-font-main), sans-serif',

    gaegu: '"Gaegu", var(--play-font-main), cursive',
    coming_soon: '"Gaegu", var(--play-font-main), cursive',

    cute_font: '"Cute Font", var(--play-font-main), cursive',
    life_savers: '"Cute Font", var(--play-font-main), cursive',

    single_day: '"Single Day", var(--play-font-main), cursive',
    chewy: '"Single Day", var(--play-font-main), cursive',

    poor_story: '"Poor Story", var(--play-font-main), cursive',
    cabin_sketch: '"Poor Story", var(--play-font-main), cursive',

    gugi: '"Gugi", var(--play-font-main), cursive',
    mouse_memoirs: '"Gugi", var(--play-font-main), cursive',

    black_han_sans: '"Black Han Sans", var(--play-font-main), sans-serif',
    londrina_shadow: '"Black Han Sans", var(--play-font-main), sans-serif',

    nanum_pen: '"Nanum Pen Script", var(--play-font-main), cursive',
    nanum_pen_script: '"Nanum Pen Script", var(--play-font-main), cursive',
    amatic_sc: '"Nanum Pen Script", var(--play-font-main), cursive',

    gowun_dodum: '"Gowun Dodum", var(--play-font-main), sans-serif',
    capriola: '"Gowun Dodum", var(--play-font-main), sans-serif',

    sunflower: '"Sunflower", var(--play-font-main), sans-serif',
    mclaren: '"Sunflower", var(--play-font-main), sans-serif',

    gowun_batang: '"Gowun Batang", var(--play-font-main), serif',
    dokdo: '"Dokdo", var(--play-font-main), cursive',
    modak: '"Modak", var(--play-font-main), cursive',
  };

  const FONT_SIZE_MAP = {
    default: 19,
    pretendard: 19,

    jua: 20,
    bubblegum_sans: 20,

    gamja_flower: 24,
    delius_swash_caps: 24,

    dongle: 30,
    boogaloo: 30,

    hi_melody: 25,
    love_ya_like_a_sister: 25,

    do_hyeon: 20,
    luckiest_guy: 20,

    gaegu: 23,
    coming_soon: 23,

    cute_font: 30,
    life_savers: 30,

    single_day: 24,
    chewy: 24,

    poor_story: 22,
    cabin_sketch: 22,

    gugi: 20,
    mouse_memoirs: 20,

    black_han_sans: 19,
    londrina_shadow: 19,

    nanum_pen: 27,
    nanum_pen_script: 27,
    amatic_sc: 27,

    gowun_dodum: 20,
    capriola: 20,

    sunflower: 20,
    mclaren: 20,

    gowun_batang: 20,
    dokdo: 26,
    modak: 22,
  };

  const FONT_WEIGHT_MAP = {
    default: 900,
    pretendard: 900,

    dongle: 700,
    gaegu: 700,
    sunflower: 700,
    mclaren: 700,

    jua: 400,
    bubblegum_sans: 400,
    gamja_flower: 400,
    delius_swash_caps: 400,
    hi_melody: 400,
    love_ya_like_a_sister: 400,
    do_hyeon: 400,
    luckiest_guy: 400,
    cute_font: 400,
    life_savers: 400,
    single_day: 400,
    chewy: 400,
    poor_story: 400,
    cabin_sketch: 400,
    gugi: 400,
    mouse_memoirs: 400,
    black_han_sans: 400,
    londrina_shadow: 400,
    nanum_pen: 400,
    nanum_pen_script: 400,
    amatic_sc: 400,
    gowun_dodum: 400,
    capriola: 400,
    gowun_batang: 400,
    dokdo: 400,
    modak: 400,
  };

  const EFFECT_ALIAS_MAP = {
    none: "none",
    normal: "none",
    default: "none",

    neon: "neon_blue",
    neonblue: "neon_blue",
    neon_blue: "neon_blue",
    "neon blue": "neon_blue",
    "네온블루": "neon_blue",
    "네온 블루": "neon_blue",

    rainbow: "rainbow_flow",
    rainbowflow: "rainbow_flow",
    rainbow_flow: "rainbow_flow",
    "rainbow flow": "rainbow_flow",
    "레인보우": "rainbow_flow",
    "무지개": "rainbow_flow",

    gold: "gold_glow",
    goldglow: "gold_glow",
    gold_glow: "gold_glow",
    "gold glow": "gold_glow",
    "골드글로우": "gold_glow",
    "골드 글로우": "gold_glow",
    "금빛": "gold_glow",

    sparkle: "sparkle",
    "스파클": "sparkle",
    "반짝이": "sparkle",

    glitch: "glitch",
    "글리치": "glitch",

    float: "float_wave",
    floatwave: "float_wave",
    float_wave: "float_wave",
    "float wave": "float_wave",
    "물결": "float_wave",

    fire: "fire_glow",
    fireglow: "fire_glow",
    fire_glow: "fire_glow",
    "fire glow": "fire_glow",
    "불꽃": "fire_glow",

    ice: "ice_glow",
    iceglow: "ice_glow",
    ice_glow: "ice_glow",
    "ice glow": "ice_glow",
    "얼음": "ice_glow",
  };

  let screenSelect, screenSetup, screenPlay;
  let gameModeTiles, practiceOpSeg, practiceOperationWrap;
  let modeBandNow, setupRewardText, setupRuleText;
  let sectionLabel;

  let btnBackToModes, btnGoPlay, btnBackToSetup;
  let btnStart, btnReset, btnSubmit, btnKeyModalClose, btnOpenRanking;

  let timeLeftEl, progressFill, mathText, answerInput, msg, mobilePad;
  let statStars, statKeys, statAura, statGameMode, earnedStarsEl;
  let statusAvatarCanvas, modal, rewardOverlay, keyExhaustedModal;

  let totalStars = 0;
  let remainingKeys = 0;
  let selectedGameMode = "practice";
  let selectedPracticeOperation = "add";

  let running = false;
  let timerId = null;
  let msgTimer = null;
  let timeLeft = 60;

  let questionA = 0;
  let questionB = 0;
  let currentAnswer = 0;
  let currentOperation = "add";
  let currentQuestionText = "";

  let correct = 0;
  let wrong = 0;
  let earnedStars = 0;
  let combo = 0;
  let maxCombo = 0;

  let activeRunId = null;
  let avatarDataCache = null;
  let finalizedLock = false;
  let keySyncInProgress = false;

  let nicknameStyleInjected = false;
  let nicknameObserverStarted = false;
  let nicknameApplyTimer = null;

  function qs(id) {
    return document.getElementById(id);
  }

  function bindElements() {
    screenSelect = qs("screenSelect");
    screenSetup = qs("screenSetup");
    screenPlay = qs("screenPlay");

    gameModeTiles = qs("gameModeTiles");
    practiceOpSeg = qs("practiceOpSeg");
    practiceOperationWrap = qs("practiceOperationWrap");

    modeBandNow = qs("modeBandNow");
    setupRewardText = qs("setupRewardText");
    setupRuleText = qs("setupRuleText");
    sectionLabel = document.querySelector("#practiceOperationWrap .sectionLabel");

    btnBackToModes = qs("btnBackToModes");
    btnGoPlay = qs("btnGoPlay");
    btnBackToSetup = qs("btnBackToSetup");
    btnStart = qs("btnStart");
    btnReset = qs("btnReset");
    btnSubmit = qs("btnSubmit");
    btnKeyModalClose = qs("btnKeyModalClose");
    btnOpenRanking = qs("btnOpenRanking");

    timeLeftEl = qs("timeLeft");
    progressFill = qs("progressFill");
    mathText = qs("mathText");
    answerInput = qs("answerInput");
    msg = qs("msg");
    mobilePad = qs("mobilePad");

    statStars = qs("statStars");
    statKeys = qs("statKeys");
    statAura = qs("statAura");
    statGameMode = qs("statGameMode");
    earnedStarsEl = qs("earnedStars");

    statusAvatarCanvas = qs("statusAvatarCanvas");
    modal = qs("modal");
    rewardOverlay = qs("rewardOverlay");
    keyExhaustedModal = qs("keyExhaustedModal");
  }

  function isAuthenticatedUser() {
    return Boolean(PAGE_CFG.isAuthenticated);
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function show(screen) {
    [screenSelect, screenSetup, screenPlay].forEach(function (s) {
      if (s) s.classList.remove("on");
    });

    if (screen) screen.classList.add("on");

    requestAnimationFrame(applyAllNicknameStyles);
  }

  function getCookie(name) {
    const cookies = document.cookie ? document.cookie.split(";") : [];

    for (let i = 0; i < cookies.length; i += 1) {
      const cookie = cookies[i].trim();

      if (cookie.indexOf(name + "=") === 0) {
        return decodeURIComponent(cookie.slice(name.length + 1));
      }
    }

    return "";
  }

  function safeJsonParse(text, fallback) {
    try {
      if (!text) return fallback;
      return JSON.parse(text);
    } catch (e) {
      return fallback;
    }
  }

  function cleanValue(value) {
    if (value === undefined || value === null) return "";

    const v = String(value).trim();

    if (!v || v === "null" || v === "undefined" || v === "None") return "";

    return v;
  }

  function getDataAttr(name) {
    if (!playPageRoot) return "";
    return cleanValue(playPageRoot.getAttribute(name));
  }

  function getAvatarData() {
    if (avatarDataCache) return avatarDataCache;

    if (!playPageRoot) {
      avatarDataCache = {};
      return avatarDataCache;
    }

    const raw = playPageRoot.getAttribute("data-play-avatar-json") || "{}";
    avatarDataCache = safeJsonParse(raw, {});

    if (!avatarDataCache || typeof avatarDataCache !== "object") {
      avatarDataCache = {};
    }

    return avatarDataCache;
  }

  function pickValue(obj, keys) {
    if (!obj || typeof obj !== "object") return "";

    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const parts = key.split(".");
      let cur = obj;

      for (let j = 0; j < parts.length; j += 1) {
        if (!cur || typeof cur !== "object") {
          cur = undefined;
          break;
        }

        cur = cur[parts[j]];
      }

      if (cur !== undefined && cur !== null && String(cur).trim() !== "") {
        return cur;
      }
    }

    return "";
  }

  function getAvatarImage(avatarData, keys) {
    return cleanValue(pickValue(avatarData, keys));
  }

  async function parseFetchResponse(res) {
    const text = await res.text();
    const data = text ? safeJsonParse(text, {}) : {};

    if (!res.ok) {
      const err = new Error(data.message || data.error || "HTTP " + res.status);
      err.data = data;
      err.status = res.status;
      throw err;
    }

    return data;
  }

  async function postJson(url, payload) {
    if (!url) return null;

    try {
      const res = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify(payload || {}),
      });

      return await parseFetchResponse(res);
    } catch (jsonError) {
      const formBody = new URLSearchParams();

      Object.entries(payload || {}).forEach(function ([key, value]) {
        if (value !== undefined && value !== null) {
          formBody.append(key, String(value));
        }
      });

      const res = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: formBody.toString(),
      });

      return await parseFetchResponse(res);
    }
  }

  function setMessage(text, type) {
    if (!msg) return;

    if (msgTimer) clearTimeout(msgTimer);

    msg.className = "msg show";

    if (type) msg.classList.add(type);

    msg.textContent = text;

    msgTimer = setTimeout(function () {
      msg.classList.remove("show");
    }, 1500);
  }

  function hideMessageInstantly() {
    if (!msg) return;

    if (msgTimer) clearTimeout(msgTimer);

    msg.className = "msg";
  }

  function renderTopStatus() {
    if (statStars) statStars.textContent = String(totalStars);
    if (statKeys) statKeys.textContent = String(remainingKeys);

    const navStar = qs("navStarCount");
    const navKey = qs("navKeyCount");

    if (navStar) navStar.textContent = String(totalStars);
    if (navKey) navKey.textContent = String(remainingKeys);

    if (!isAuthenticatedUser()) {
      localStorage.setItem("mathner_guest_stars", String(totalStars));
      localStorage.setItem("mathner_guest_keys", String(remainingKeys));
    }
  }

  function initData() {
    if (!isAuthenticatedUser()) {
      const savedStars = localStorage.getItem("mathner_guest_stars");
      const savedKeys = localStorage.getItem("mathner_guest_keys");

      totalStars = savedStars !== null ? Number(savedStars) : Number(PAGE_CFG.initialStars || 0);
      remainingKeys = savedKeys !== null ? Number(savedKeys) : Number(PAGE_CFG.initialKeys || 3);
    } else {
      totalStars = Number(PAGE_CFG.initialStars || 0);
      remainingKeys = Number(PAGE_CFG.initialKeys || 3);
    }

    if (Number.isNaN(totalStars)) totalStars = 0;
    if (Number.isNaN(remainingKeys)) remainingKeys = 0;

    renderTopStatus();
  }

  function renderModeTiles() {
    if (!gameModeTiles) return;

    gameModeTiles.innerHTML = "";

    Object.values(GAME_MODES).forEach(function (mode) {
      const tile = document.createElement("button");

      tile.type = "button";
      tile.className = "tile";
      tile.innerHTML =
        '<div class="k">모드 선택</div>' +
        '<div class="v">' + mode.label + '</div>';

      tile.addEventListener("click", function () {
        selectedGameMode = mode.key;

        updateSetupPanel();
        updateRankingLink();
        show(screenSetup);
      });

      gameModeTiles.appendChild(tile);
    });
  }

  function renderPracticeOperations() {
    if (!practiceOpSeg) return;

    practiceOpSeg.innerHTML = "";

    ["add", "sub", "mul", "div"].forEach(function (key) {
      const btn = document.createElement("button");

      btn.type = "button";
      btn.className = "btn " + (selectedPracticeOperation === key ? "btn-primary" : "secondary");
      btn.textContent = OPERATION_META[key].label;

      btn.addEventListener("click", function () {
        selectedPracticeOperation = key;
        renderPracticeOperations();
        updateSetupPanel();
      });

      practiceOpSeg.appendChild(btn);
    });
  }

  function updateSetupPanel() {
    const mode = GAME_MODES[selectedGameMode] || GAME_MODES.practice;

    if (modeBandNow) modeBandNow.textContent = mode.label;
    if (statGameMode) statGameMode.textContent = mode.shortLabel;
    if (setupRewardText) setupRewardText.innerHTML = mode.rewardText;
    if (setupRuleText) setupRuleText.innerHTML = mode.ruleText;
    if (sectionLabel) sectionLabel.textContent = mode.operationLabel;

    if (practiceOperationWrap) {
      practiceOperationWrap.style.display = selectedGameMode === "challenge" ? "none" : "block";
    }

    requestAnimationFrame(applyAllNicknameStyles);
  }

  function updateCanvasParticles(stateKey) {
    const particles = document.querySelectorAll(".canvas-particle");

    particles.forEach(function (p) {
      p.textContent = "";
      p.classList.remove("is-wind-star", "is-fever-star", "is-super-star");

      if (stateKey === "combo") p.classList.add("is-wind-star");
      if (stateKey === "fever") p.classList.add("is-fever-star");
      if (stateKey === "super") p.classList.add("is-super-star");
    });
  }

  function setAuraState(stateKey) {
    if (!playPageRoot) return;

    playPageRoot.setAttribute("data-aura-state", stateKey);

    if (statusAvatarCanvas) {
      statusAvatarCanvas.classList.toggle(
        "is-fever-canvas",
        stateKey === "fever" || stateKey === "super"
      );
    }

    updateCanvasParticles(stateKey);

    if (statAura) {
      if (stateKey === "idle") statAura.textContent = "조용함...";
      if (stateKey === "combo") statAura.textContent = "바람부는 중 🌬️";
      if (stateKey === "fever") statAura.textContent = "피버 모드 🔥";
      if (stateKey === "super") statAura.textContent = "황금 피버 ⚡";
    }

    requestAnimationFrame(applyAllNicknameStyles);
  }

  function updateAuraByCombo() {
    if (!running) {
      setAuraState("idle");
      return;
    }

    if (combo >= 10) setAuraState("super");
    else if (combo >= 5) setAuraState("fever");
    else if (combo >= 2) setAuraState("combo");
    else setAuraState("idle");
  }

  function updateTimerUI() {
    if (timeLeftEl) timeLeftEl.textContent = String(timeLeft);

    if (progressFill) {
      progressFill.style.width = String((timeLeft / 60) * 100) + "%";
    }
  }

  function resetGameUI() {
    correct = 0;
    wrong = 0;
    earnedStars = 0;
    combo = 0;
    maxCombo = 0;
    activeRunId = null;
    finalizedLock = false;
    running = false;
    currentQuestionText = "";
    currentOperation = "add";

    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }

    timeLeft = 60;

    if (earnedStarsEl) earnedStarsEl.textContent = "0";

    if (mathText) {
      mathText.textContent = "준비, 시작!";
      mathText.classList.add("is-ready-text");
    }

    if (answerInput) {
      answerInput.value = "";
      answerInput.disabled = true;
    }

    if (btnSubmit) btnSubmit.disabled = true;

    if (btnStart) {
      btnStart.disabled = false;
      btnStart.textContent = "▶️ 준비, 시작!";
    }

    hideMessageInstantly();
    updateTimerUI();
    setAuraState("idle");
    applyAllNicknameStyles();
  }

  function getMixedLevel() {
    const roll = randInt(1, 100);

    if (combo >= 5) {
      if (roll <= 25) return 1;
      if (roll <= 65) return 2;
      return 3;
    }

    if (combo >= 2) {
      if (roll <= 45) return 1;
      if (roll <= 85) return 2;
      return 3;
    }

    return 1;
  }

  function setQuestion(a, b, answer, opKey, text) {
    questionA = a;
    questionB = b;
    currentAnswer = answer;
    currentOperation = opKey;
    currentQuestionText = text || "";
  }

  function makePracticeQuestion(opKey) {
    currentQuestionText = "";

    if (opKey === "add") {
      const a = randInt(1, 9);
      const b = randInt(1, 9);
      setQuestion(a, b, a + b, "add");
    }

    if (opKey === "sub") {
      let a = randInt(2, 9);
      let b = randInt(1, 9);

      if (b > a) {
        const temp = a;
        a = b;
        b = temp;
      }

      setQuestion(a, b, a - b, "sub");
    }

    if (opKey === "mul") {
      const a = randInt(1, 9);
      const b = randInt(1, 9);
      setQuestion(a, b, a * b, "mul");
    }

    if (opKey === "div") {
      const divisor = randInt(1, 9);
      const quotient = randInt(1, 9);
      const dividend = divisor * quotient;

      setQuestion(dividend, divisor, quotient, "div");
    }
  }

  function makeClassicAdd(level) {
    if (level === 1) {
      const a = randInt(1, 9);
      const b = randInt(1, 9);
      setQuestion(a, b, a + b, "add", `${a} + ${b} = ?`);
      return;
    }

    if (level === 2) {
      const a = randInt(10, 29);
      const b = randInt(1, 9);
      setQuestion(a, b, a + b, "add", `${a} + ${b} = ?`);
      return;
    }

    const a = randInt(1, 9);
    const b = randInt(1, 9);
    const c = randInt(1, 9);
    setQuestion(a, b, a + b + c, "add", `${a} + ${b} + ${c} = ?`);
  }

  function makeClassicSub(level) {
    if (level === 1) {
      let a = randInt(2, 9);
      let b = randInt(1, 9);

      if (b > a) {
        const temp = a;
        a = b;
        b = temp;
      }

      setQuestion(a, b, a - b, "sub", `${a} - ${b} = ?`);
      return;
    }

    if (level === 2) {
      const a = randInt(10, 39);
      const b = randInt(1, 9);
      setQuestion(a, b, a - b, "sub", `${a} - ${b} = ?`);
      return;
    }

    let a = randInt(20, 59);
    let b = randInt(10, 39);

    if (b > a) {
      const temp = a;
      a = b;
      b = temp;
    }

    setQuestion(a, b, a - b, "sub", `${a} - ${b} = ?`);
  }

  function makeClassicMul(level) {
    let a;
    let b;

    if (level === 1) {
      a = randInt(2, 5);
      b = randInt(2, 5);
    } else if (level === 2) {
      a = randInt(2, 9);
      b = randInt(2, 5);
    } else {
      a = randInt(2, 9);
      b = randInt(2, 9);
    }

    setQuestion(a, b, a * b, "mul", `${a} × ${b} = ?`);
  }

  function makeClassicDiv(level) {
    let divisor;
    let quotient;

    if (level === 1) {
      divisor = randInt(2, 5);
      quotient = randInt(2, 5);
    } else if (level === 2) {
      divisor = randInt(2, 9);
      quotient = randInt(2, 5);
    } else {
      divisor = randInt(2, 9);
      quotient = randInt(2, 9);
    }

    const dividend = divisor * quotient;
    setQuestion(dividend, divisor, quotient, "div", `${dividend} ÷ ${divisor} = ?`);
  }

  function makeClassicQuestion(opKey) {
    const level = getMixedLevel();

    if (opKey === "add") makeClassicAdd(level);
    if (opKey === "sub") makeClassicSub(level);
    if (opKey === "mul") makeClassicMul(level);
    if (opKey === "div") makeClassicDiv(level);
  }

  function makeChallengeQuestion() {
    const ops = ["add", "sub", "mul", "div"];
    const opKey = ops[randInt(0, ops.length - 1)];

    makeClassicQuestion(opKey);
  }

  function nextQuestion() {
    const opKey = selectedPracticeOperation;

    if (selectedGameMode === "challenge") {
      makeChallengeQuestion();
    } else if (selectedGameMode === "classic") {
      makeClassicQuestion(opKey);
    } else {
      makePracticeQuestion(opKey);
    }

    if (mathText) {
      mathText.classList.remove("is-ready-text");

      if (currentQuestionText) {
        mathText.textContent = currentQuestionText;
      } else {
        mathText.textContent =
          String(questionA) +
          " " +
          OPERATION_META[currentOperation].sign +
          " " +
          String(questionB) +
          " = ?";
      }
    }

    if (answerInput) {
      answerInput.value = "";

      if (window.innerWidth > 900) {
        answerInput.focus();
      }
    }

    requestAnimationFrame(applyAllNicknameStyles);
  }

  function getStarGain() {
    if (selectedGameMode === "classic") {
      if (combo >= 5) return 4;
      if (combo >= 2) return 3;
      return 2;
    }

    if (selectedGameMode === "challenge") {
      if (combo >= 5) return 5;
      if (combo >= 2) return 4;
      return 3;
    }

    if (combo >= 5) return 3;
    if (combo >= 2) return 2;
    return 1;
  }

  function optimisticConsumeKey() {
    remainingKeys = Math.max(remainingKeys - 1, 0);
    renderTopStatus();
  }

  async function syncStartRunInBackground() {
    if (keySyncInProgress) return;
    if (!isAuthenticatedUser() || !PAGE_CFG.startRunUrl) return;

    keySyncInProgress = true;

    try {
      const data = await postJson(PAGE_CFG.startRunUrl, {
        game: PAGE_CFG.gameName || "aura",
        game_name: PAGE_CFG.gameName || "aura",
        mode: selectedGameMode,
        operation: selectedGameMode === "challenge" ? "mixed" : selectedPracticeOperation,
      });

      if (data && (data.ok === false || data.allowed === false || data.error === "NO_KEYS")) {
        return;
      }

      activeRunId = data && (data.run_id || data.game_run_id || data.id)
        ? data.run_id || data.game_run_id || data.id
        : activeRunId;

      if (data && data.remaining_keys !== undefined) {
        remainingKeys = Number(data.remaining_keys);
      } else if (data && data.keys !== undefined) {
        remainingKeys = Number(data.keys);
      }

      if (data && data.total_stars !== undefined) {
        totalStars = Number(data.total_stars);
      }

      if (data && data.stars !== undefined && data.total_stars === undefined) {
        totalStars = Number(data.stars);
      }

      if (Number.isNaN(remainingKeys)) remainingKeys = 0;
      if (Number.isNaN(totalStars)) totalStars = 0;

      renderTopStatus();
    } catch (e) {
      console.warn("start run sync failed:", e);
    } finally {
      keySyncInProgress = false;
    }
  }

  function startGame() {
    if (running) return;

    if (remainingKeys <= 0) {
      if (keyExhaustedModal) keyExhaustedModal.classList.add("on");
      return;
    }

    optimisticConsumeKey();
    syncStartRunInBackground();

    running = true;
    finalizedLock = false;
    timeLeft = 60;
    correct = 0;
    wrong = 0;
    earnedStars = 0;
    combo = 0;
    maxCombo = 0;
    currentQuestionText = "";

    if (earnedStarsEl) earnedStarsEl.textContent = "0";

    if (answerInput) {
      answerInput.disabled = false;
      answerInput.value = "";
    }

    if (btnSubmit) btnSubmit.disabled = false;

    if (btnStart) {
      btnStart.disabled = true;
      btnStart.textContent = "게임 진행 중! 💦";
    }

    hideMessageInstantly();
    updateTimerUI();
    nextQuestion();
    applyAllNicknameStyles();

    timerId = setInterval(function () {
      timeLeft -= 1;
      updateTimerUI();

      if (timeLeft <= 0) {
        finalizeRun();
      }
    }, 1000);
  }

  function createTinyStarTrail(effectBox, amount) {
    const count = Math.min(7, Math.max(3, amount + 2));

    for (let i = 0; i < count; i += 1) {
      const tiny = document.createElement("div");

      tiny.className = "riseStarTrail";
      tiny.textContent = i % 3 === 0 ? "★" : "✦";

      tiny.style.setProperty("--sx", String(randInt(-34, 34)) + "px");
      tiny.style.setProperty("--ex", String(randInt(-92, 92)) + "px");
      tiny.style.animationDelay = String(i * 0.07) + "s";

      effectBox.appendChild(tiny);

      setTimeout(function () {
        if (tiny && tiny.parentNode) {
          tiny.parentNode.removeChild(tiny);
        }
      }, 2300);
    }
  }

  function showRisingStar(amount) {
    const effectBox = qs("liveEffects") || qs("questionBox");

    if (!effectBox) return;

    const star = document.createElement("div");

    star.className = "riseStarAnim";
    star.innerHTML =
      '<span class="rise-star-core">⭐ <span class="rise-star-amount">+' +
      String(amount) +
      "</span></span>";

    star.style.marginLeft = String(randInt(-8, 8)) + "px";

    effectBox.appendChild(star);
    createTinyStarTrail(effectBox, amount);

    setTimeout(function () {
      if (star && star.parentNode) {
        star.parentNode.removeChild(star);
      }
    }, 2350);
  }

  function submitAnswer() {
    if (!running || !answerInput) return;

    const val = answerInput.value.trim();

    if (val === "") return;

    if (Number(val) === currentAnswer) {
      correct += 1;
      combo += 1;
      maxCombo = Math.max(maxCombo, combo);

      const gain = getStarGain();

      earnedStars += gain;

      setMessage("정답! 별 +" + String(gain) + "개!", "good");
      showRisingStar(gain);
    } else {
      wrong += 1;
      combo = 0;

      setMessage("앗! 정답은 " + String(currentAnswer) + " 였어! 다시 해보자!", "bad");
    }

    if (earnedStarsEl) earnedStarsEl.textContent = String(earnedStars);

    updateAuraByCombo();
    nextQuestion();
  }

  function buildResultPayload() {
    return {
      run_id: activeRunId,
      game: PAGE_CFG.gameName || "aura",
      game_name: PAGE_CFG.gameName || "aura",
      mode: selectedGameMode,
      operation: selectedGameMode === "challenge" ? "mixed" : selectedPracticeOperation,
      current_operation: currentOperation,
      score: correct,
      correct: correct,
      correct_count: correct,
      wrong: wrong,
      wrong_count: wrong,
      earned_stars: earnedStars,
      stars: earnedStars,
      max_combo: maxCombo,
      time_left: Math.max(timeLeft, 0),
      duration_seconds: 60 - Math.max(timeLeft, 0),
    };
  }

  async function saveGameResultToServer(payload) {
    if (!isAuthenticatedUser() || !PAGE_CFG.finalizeRunUrl) return null;

    try {
      const data = await postJson(PAGE_CFG.finalizeRunUrl, payload);

      if (data && data.total_stars !== undefined) {
        totalStars = Number(data.total_stars);
      } else if (data && data.stars_total !== undefined) {
        totalStars = Number(data.stars_total);
      } else if (data && data.user_total_stars !== undefined) {
        totalStars = Number(data.user_total_stars);
      }

      if (data && data.remaining_keys !== undefined) {
        remainingKeys = Number(data.remaining_keys);
      } else if (data && data.keys !== undefined) {
        remainingKeys = Number(data.keys);
      }

      if (Number.isNaN(totalStars)) totalStars = 0;
      if (Number.isNaN(remainingKeys)) remainingKeys = 0;

      renderTopStatus();

      return data;
    } catch (e) {
      return null;
    }
  }

  async function recordRankingScore(payload) {
    if (!isAuthenticatedUser() || !PAGE_CFG.rankingRecordUrl) return null;

    try {
      return await postJson(PAGE_CFG.rankingRecordUrl, payload);
    } catch (e) {
      return null;
    }
  }

  function extractRank(data) {
    if (!data) return null;

    return data.my_rank ||
      data.rank ||
      data.ranking ||
      data.friend_rank ||
      data.position ||
      null;
  }

  function updateRankingLink() {
    if (!btnOpenRanking) return;

    try {
      const base = PAGE_CFG.rankingHomeUrlBase || btnOpenRanking.getAttribute("href") || "/";
      const url = new URL(base, window.location.origin);

      url.searchParams.set("game", PAGE_CFG.gameName || "aura");
      url.searchParams.set("mode", selectedGameMode);

      btnOpenRanking.href = url.toString();
    } catch (e) {
      btnOpenRanking.href = PAGE_CFG.rankingHomeUrlBase || "/";
    }
  }

  async function loadSimpleFriendRanking() {
    const summaryBox = qs("friendRankSummary");
    const rankText = qs("friendRankText");

    if (!summaryBox || !rankText) return;

    summaryBox.style.display = "block";

    if (!isAuthenticatedUser()) {
      rankText.textContent = "로그인하면 친구 랭킹이 보여요! 🔒";
      return;
    }

    const base = PAGE_CFG.friendNearbyRankUrlBase;

    if (!base) {
      rankText.textContent = "랭킹 주소가 아직 연결되지 않았어요. 💦";
      return;
    }

    try {
      rankText.textContent = "랭킹 확인 중... ⏳";

      const url = new URL(base, window.location.origin);

      url.searchParams.set("game", PAGE_CFG.gameName || "aura");
      url.searchParams.set("game_name", PAGE_CFG.gameName || "aura");
      url.searchParams.set("mode", selectedGameMode);
      url.searchParams.set("score", String(correct));

      const res = await fetch(url.toString(), {
        credentials: "same-origin",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      const data = await res.json();
      const rank = extractRank(data);

      if ((data.ok === undefined || data.ok) && rank) {
        const myNick = getCurrentNickname();

        rankText.innerHTML =
          "#" +
          String(rank) +
          '위 (<span class="friend-rank-nickname synced-nickname" data-nickname-sync="1"></span>) 🏆';

        const nickSpan = rankText.querySelector(".friend-rank-nickname");

        if (nickSpan) {
          nickSpan.textContent = myNick;
          applyNicknameStyle(nickSpan);
        }
      } else if (data.message) {
        rankText.textContent = data.message;
      } else {
        rankText.textContent = "랭킹에 아직 친구가 없어요! 🌱";
      }
    } catch (e) {
      rankText.textContent = "랭킹을 불러오지 못했어요. 💦";
    }
  }

  async function syncResultAndRanking() {
    const payload = buildResultPayload();

    await saveGameResultToServer(payload);
    await recordRankingScore(payload);
    await loadSimpleFriendRanking();
  }

  function clearRewardRain() {
    const rewardConfetti = document.querySelector(".rewardConfetti");

    if (!rewardConfetti) return;

    rewardConfetti.innerHTML = "";
  }

  function createRewardRain(amount) {
    const rewardConfetti = document.querySelector(".rewardConfetti");

    if (!rewardConfetti) return;

    rewardConfetti.innerHTML = "";

    const starCount = Math.min(40, Math.max(18, amount * 3));

    for (let i = 0; i < starCount; i += 1) {
      const star = document.createElement("div");

      star.className = "rewardRainStar";
      star.textContent = i % 4 === 0 ? "⭐" : "✦";

      star.style.left = String(randInt(0, 100)) + "%";
      star.style.setProperty("--drift", String(randInt(-90, 90)) + "px");
      star.style.setProperty("--size", String(randInt(14, 34)) + "px");
      star.style.setProperty("--dur", String((randInt(190, 330) / 100).toFixed(2)) + "s");
      star.style.animationDelay = String((randInt(0, 85) / 100).toFixed(2)) + "s";

      rewardConfetti.appendChild(star);
    }
  }

  function showRewardOverlay() {
    const rewardAmount = qs("rewardAmount");

    if (rewardAmount) rewardAmount.textContent = "+" + String(earnedStars);

    createRewardRain(earnedStars);

    if (rewardOverlay) rewardOverlay.classList.add("show");

    setTimeout(function () {
      if (rewardOverlay) rewardOverlay.classList.remove("show");
      clearRewardRain();

      if (modal) modal.classList.add("on");

      requestAnimationFrame(applyAllNicknameStyles);
    }, 2800);
  }

  async function finalizeRun() {
    if (finalizedLock) return;

    finalizedLock = true;
    running = false;

    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }

    totalStars += earnedStars;
    renderTopStatus();

    setAuraState("idle");
    hideMessageInstantly();

    if (answerInput) answerInput.disabled = true;
    if (btnSubmit) btnSubmit.disabled = true;

    if (btnStart) {
      btnStart.disabled = false;
      btnStart.textContent = "▶️ 준비, 시작!";
    }

    const rCorrect = qs("rCorrect");
    const rWrong = qs("rWrong");
    const rStars = qs("rStars");

    if (rCorrect) rCorrect.textContent = String(correct);
    if (rWrong) rWrong.textContent = String(wrong);
    if (rStars) rStars.textContent = String(earnedStars);

    const rankText = qs("friendRankText");
    const rankSummary = qs("friendRankSummary");

    if (rankSummary) rankSummary.style.display = "block";
    if (rankText) rankText.textContent = "랭킹 저장 중... ⏳";

    updateRankingLink();

    const rankingPromise = syncResultAndRanking();

    showRewardOverlay();

    await rankingPromise;

    applyAllNicknameStyles();
  }

  function normalizePlainKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/-/g, "_")
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_가-힣]/g, "")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function normalizeFontKey(fontKey) {
    return normalizePlainKey(fontKey || "");
  }

  function normalizeEffectKey(effectKey) {
    const raw = String(effectKey || "none").trim();
    const lower = raw.toLowerCase();

    if (EFFECT_ALIAS_MAP[lower]) return EFFECT_ALIAS_MAP[lower];

    const normalized = normalizePlainKey(raw);

    if (EFFECT_ALIAS_MAP[normalized]) return EFFECT_ALIAS_MAP[normalized];

    const compact = normalized.replace(/_/g, "");

    if (EFFECT_ALIAS_MAP[compact]) return EFFECT_ALIAS_MAP[compact];

    return normalized || "none";
  }

  function fontClassFromKey(fontKey) {
    const key = normalizeFontKey(fontKey);

    return key ? "font-" + key : "font-default";
  }

  function effectClassFromKey(effectKey) {
    const key = normalizeEffectKey(effectKey || "none");

    return "effect-" + key.replace(/_/g, "-");
  }

  function getFontFamily(fontKey) {
    const key = normalizeFontKey(fontKey);

    return FONT_FAMILY_MAP[key] || FONT_FAMILY_MAP.default;
  }

  function getFontBaseSize(fontKey) {
    const key = normalizeFontKey(fontKey);

    return FONT_SIZE_MAP[key] || FONT_SIZE_MAP.default;
  }

  function getFontWeight(fontKey) {
    const key = normalizeFontKey(fontKey);

    if (Object.prototype.hasOwnProperty.call(FONT_WEIGHT_MAP, key)) {
      return FONT_WEIGHT_MAP[key];
    }

    return 400;
  }

  function clampValue(value, min, max, fallback) {
    const n = Number(value);

    if (!Number.isFinite(n)) return fallback;

    return Math.min(max, Math.max(min, n));
  }

  function cleanClassString(value) {
    if (!value || typeof value !== "string") return "";

    return value
      .split(/\s+/)
      .map(function (v) {
        return v.trim();
      })
      .filter(function (v) {
        return /^[A-Za-z0-9_-]+$/.test(v);
      })
      .join(" ");
  }

  function getCurrentNickname() {
    const avatarData = getAvatarData();

    return cleanValue(
      PAGE_CFG.nickname ||
      PAGE_CFG.myNickname ||
      PAGE_CFG.displayName ||
      PAGE_CFG.username ||
      pickValue(avatarData, [
        "nickname",
        "display_name",
        "displayName",
        "username",
        "user.username",
        "owner.display_name",
        "owner.nickname",
        "owner.username",
      ])
    ) || "마법사님";
  }

  function getNicknameStyleInfo() {
    const avatarData = getAvatarData();

    const rawFontKey = cleanValue(
      pickValue(avatarData, [
        "nickname_font_key",
        "nicknameFontKey",
        "font_key",
        "fontKey",

        "owner_font_pref.nickname_font_key",
        "ownerFontPref.nickname_font_key",
        "ownerFontPref.nicknameFontKey",
        "viewer_font_pref.nickname_font_key",
        "viewerFontPref.nickname_font_key",
        "viewerFontPref.nicknameFontKey",
        "font_pref.nickname_font_key",
        "fontPref.nickname_font_key",
        "fontPref.nicknameFontKey",

        "selected_font_key",
        "selectedFontKey",
        "equipped_font_key",
        "equippedFontKey",
        "profile_font_key",

        "font.key",
        "font.font_key",
        "font.fontKey",
        "nickname_font.key",
        "nickname_font.font_key",
        "nickname_font.fontKey",
        "equipped_font.key",
        "equipped_font.font_key",
      ]) ||
      PAGE_CFG.nicknameFontKey ||
      PAGE_CFG.fontKey ||
      ""
    );

    const rawEffectKey = cleanValue(
      pickValue(avatarData, [
        "nickname_effect_key",
        "nicknameEffectKey",
        "effect_key",
        "effectKey",

        "owner_font_pref.nickname_effect_key",
        "ownerFontPref.nickname_effect_key",
        "ownerFontPref.nicknameEffectKey",
        "viewer_font_pref.nickname_effect_key",
        "viewerFontPref.nickname_effect_key",
        "viewerFontPref.nicknameEffectKey",
        "font_pref.nickname_effect_key",
        "fontPref.nickname_effect_key",
        "fontPref.nicknameEffectKey",

        "selected_effect_key",
        "selectedEffectKey",
        "equipped_effect_key",
        "equippedEffectKey",
        "profile_effect_key",

        "effect.key",
        "effect.effect_key",
        "effect.effectKey",
        "nickname_effect.key",
        "nickname_effect.effect_key",
        "nickname_effect.effectKey",
        "equipped_effect.key",
        "equipped_effect.effect_key",
      ]) ||
      PAGE_CFG.nicknameEffectKey ||
      PAGE_CFG.effectKey ||
      "none"
    );

    const rawFontClass = cleanClassString(String(
      pickValue(avatarData, [
        "nickname_font_class",
        "nicknameFontClass",
        "font_class",
        "fontClass",
        "font_css_class",
        "fontCssClass",
        "font.preview_class",
        "font.previewClass",
        "font.css_class",
        "font.cssClass",
        "font.class_name",
        "font.className",
        "nickname_font.preview_class",
        "nickname_font.previewClass",
        "nickname_font.css_class",
        "nickname_font.cssClass",
        "nickname_font.class_name",
        "nickname_font.className",
      ]) ||
      PAGE_CFG.nicknameFontClass ||
      PAGE_CFG.fontClass ||
      ""
    ));

    const rawEffectClass = cleanClassString(String(
      pickValue(avatarData, [
        "nickname_effect_class",
        "nicknameEffectClass",
        "font_effect_class",
        "fontEffectClass",
        "effect_class",
        "effectClass",
        "effect_css_class",
        "effectCssClass",
        "effect.preview_class",
        "effect.previewClass",
        "effect.css_class",
        "effect.cssClass",
        "effect.class_name",
        "effect.className",
        "nickname_effect.preview_class",
        "nickname_effect.previewClass",
        "nickname_effect.css_class",
        "nickname_effect.cssClass",
        "nickname_effect.class_name",
        "nickname_effect.className",
      ]) ||
      PAGE_CFG.nicknameEffectClass ||
      PAGE_CFG.effectClass ||
      ""
    ));

    const rawScale = pickValue(avatarData, [
      "nickname_scale",
      "nicknameScale",
      "owner_font_pref.nickname_scale",
      "ownerFontPref.nickname_scale",
      "ownerFontPref.nicknameScale",
      "viewer_font_pref.nickname_scale",
      "viewerFontPref.nickname_scale",
      "viewerFontPref.nicknameScale",
      "font_pref.nickname_scale",
      "fontPref.nickname_scale",
      "fontPref.nicknameScale",
    ]);

    const rawSpacing = pickValue(avatarData, [
      "nickname_letter_spacing",
      "nicknameLetterSpacing",
      "owner_font_pref.nickname_letter_spacing",
      "ownerFontPref.nickname_letter_spacing",
      "ownerFontPref.nicknameLetterSpacing",
      "viewer_font_pref.nickname_letter_spacing",
      "viewerFontPref.nickname_letter_spacing",
      "viewerFontPref.nicknameLetterSpacing",
      "font_pref.nickname_letter_spacing",
      "fontPref.nickname_letter_spacing",
      "fontPref.nicknameLetterSpacing",
    ]);

    const color = cleanValue(
      pickValue(avatarData, [
        "nickname_color",
        "nicknameColor",
        "font_color",
        "fontColor",
        "owner_font_pref.nickname_color",
        "ownerFontPref.nickname_color",
        "viewer_font_pref.nickname_color",
        "viewerFontPref.nickname_color",
        "font_pref.nickname_color",
        "fontPref.nickname_color",
      ]) ||
      PAGE_CFG.nicknameColor ||
      "#fff8ea"
    );

    const fontKey = normalizeFontKey(rawFontKey);
    const effectKey = normalizeEffectKey(rawEffectKey);

    const keyFontClass = fontClassFromKey(fontKey);
    const keyEffectClass = effectClassFromKey(effectKey);

    return {
      fontKey,
      effectKey,
      fontClass: cleanClassString([rawFontClass, keyFontClass].filter(Boolean).join(" ")),
      effectClass: cleanClassString([rawEffectClass, keyEffectClass].filter(Boolean).join(" ")),
      scale: clampValue(rawScale, 0.8, 1.6, 1),
      spacing: clampValue(rawSpacing, -1, 6, 0),
      color,
    };
  }

  function buildNicknameInlineStyle(info) {
    const fontKey = info.fontKey || "";
    const baseSize = getFontBaseSize(fontKey);
    const size = Math.max(14, Math.round(baseSize * info.scale));
    const family = getFontFamily(fontKey);
    const weight = getFontWeight(fontKey);
    const spacing = clampValue(info.spacing, -1, 6, 0);

    return {
      family,
      size,
      weight,
      spacing,
    };
  }

  function injectNicknameStylePatch() {
    if (nicknameStyleInjected) return;

    nicknameStyleInjected = true;

    if (document.getElementById("mathnerAuraAvatarRoomNicknamePatch")) return;

    const style = document.createElement("style");
    style.id = "mathnerAuraAvatarRoomNicknamePatch";

    style.textContent = `
      .play-page .status-avatar-name {
        width: 100% !important;
        max-width: 100% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
        overflow: visible !important;
      }

      .play-page .status-avatar-name-text,
      .play-page .status-avatar-name-text.synced-nickname,
      .play-page .status-avatar-name-text.mn-aura-nickname-force,
      .play-page .friend-rank-nickname.mn-aura-nickname-force {
        display: inline-block !important;
        width: auto !important;
        max-width: 100% !important;
        margin-left: auto !important;
        margin-right: auto !important;
        padding: 0 !important;
        line-height: 1.05 !important;
        white-space: nowrap !important;
        text-align: center !important;
        vertical-align: middle !important;
        transform-origin: center center !important;
        animation-play-state: running !important;
        position: relative !important;
        z-index: 2 !important;
      }

      .play-page .effect-rainbow-flow,
      .play-page .font-effect-rainbow,
      .play-page .rainbow-flow,
      .play-page .fx-rainbow-flow {
        background-image: linear-gradient(90deg, #ff4d6d, #ff9f1a, #00b894, #0984e3, #a29bfe, #ff4d6d) !important;
        background-size: 300% 100% !important;
        background-color: transparent !important;
        -webkit-background-clip: text !important;
        background-clip: text !important;
        color: transparent !important;
        -webkit-text-fill-color: transparent !important;
        text-shadow: none !important;
        -webkit-text-stroke: 0 !important;
        filter: drop-shadow(0 1px 1px rgba(0,0,0,0.18)) !important;
        animation: nicknameRainbowFlow 6s linear infinite !important;
      }

      .play-page .effect-float-wave {
        animation: auraNicknameFloatWave 1.8s ease-in-out infinite !important;
      }

      .play-page .effect-neon-blue {
        color: #18DDE2 !important;
        -webkit-text-fill-color: #18DDE2 !important;
        text-shadow:
          0 0 4px rgba(125,249,255,.72),
          0 0 9px rgba(0,210,211,.46),
          0 1px 3px rgba(0,0,0,.22) !important;
      }

      .play-page .effect-gold-glow {
        color: #F5B800 !important;
        -webkit-text-fill-color: #F5B800 !important;
        text-shadow:
          0 0 4px rgba(255,215,0,0.68),
          0 0 9px rgba(255,143,0,0.36),
          0 1px 3px rgba(0,0,0,0.22) !important;
      }

      .play-page .effect-sparkle {
        color: #E9A800 !important;
        -webkit-text-fill-color: #E9A800 !important;
        text-shadow:
          0 0 4px rgba(255,255,255,0.75),
          0 0 9px rgba(255,215,0,0.50),
          0 1px 3px rgba(0,0,0,0.20) !important;
      }

      .play-page .effect-glitch {
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
        text-shadow:
          1px 0 rgba(255,0,90,0.65),
          -1px 0 rgba(0,210,255,0.65),
          0 1px 3px rgba(0,0,0,0.24) !important;
      }

      .play-page .effect-fire-glow {
        color: #ff9f1a !important;
        -webkit-text-fill-color: #ff9f1a !important;
        text-shadow:
          0 0 4px rgba(255,215,0,.60),
          0 0 9px rgba(255,99,0,.45),
          0 1px 3px rgba(0,0,0,.22) !important;
      }

      .play-page .effect-ice-glow {
        color: #00bcd4 !important;
        -webkit-text-fill-color: #00bcd4 !important;
        text-shadow:
          0 0 4px rgba(180,255,255,.68),
          0 0 10px rgba(0,180,255,.42),
          0 1px 3px rgba(0,0,0,.22) !important;
      }
    `;

    document.head.appendChild(style);
  }

  function ensureStatusNicknameTextLayer() {
    const root = qs("statusAvatarName");

    if (!root) return null;

    let layer = qs("statusAvatarNameText") || root.querySelector(".status-avatar-name-text");

    if (!layer) {
      const currentText = String(root.textContent || "").trim();

      root.innerHTML = "";

      layer = document.createElement("span");
      layer.id = "statusAvatarNameText";
      layer.className = "status-avatar-name-text synced-nickname";
      layer.dataset.nicknameSync = "1";
      layer.textContent = currentText || getCurrentNickname();

      root.appendChild(layer);
    }

    root.classList.remove("synced-nickname", "mn-aura-nickname-force");
    root.style.setProperty("width", "100%", "important");
    root.style.setProperty("display", "flex", "important");
    root.style.setProperty("align-items", "center", "important");
    root.style.setProperty("justify-content", "center", "important");
    root.style.setProperty("text-align", "center", "important");

    return layer;
  }

  function clearFontEffectClasses(el) {
    if (!el || !el.classList) return;

    Array.from(el.classList).forEach(function (cls) {
      if (
        cls.startsWith("font-") ||
        cls.startsWith("effect-") ||
        cls.startsWith("font-effect-") ||
        cls === "rainbow-flow" ||
        cls === "neon-blue" ||
        cls === "gold-glow" ||
        cls.startsWith("fx-")
      ) {
        el.classList.remove(cls);
      }
    });
  }

  function clearNicknameVisualInline(el) {
    if (!el || !el.style) return;

    [
      "font-family",
      "font-size",
      "font-weight",
      "letter-spacing",
      "line-height",
      "white-space",
      "color",
      "-webkit-text-fill-color",
      "background",
      "background-image",
      "background-size",
      "background-position",
      "background-repeat",
      "background-clip",
      "-webkit-background-clip",
      "text-shadow",
      "filter",
      "animation",
      "animation-play-state",
      "transform",
      "opacity",
    ].forEach(function (prop) {
      el.style.removeProperty(prop);
    });
  }

  function applyNicknameStyle(el) {
    if (!el) return;

    injectNicknameStylePatch();

    const info = getNicknameStyleInfo();
    const visual = buildNicknameInlineStyle(info);
    const hasRainbow = info.effectKey === "rainbow_flow" || info.effectClass.indexOf("rainbow") >= 0;

    clearFontEffectClasses(el);
    clearNicknameVisualInline(el);

    el.classList.add("synced-nickname");
    el.classList.add("mn-aura-nickname-force");

    if (info.fontClass) {
      info.fontClass.split(/\s+/).forEach(function (cls) {
        if (cls) el.classList.add(cls);
      });
    } else {
      el.classList.add(fontClassFromKey(info.fontKey));
    }

    if (info.effectClass) {
      info.effectClass.split(/\s+/).forEach(function (cls) {
        if (cls) el.classList.add(cls);
      });
    } else {
      el.classList.add(effectClassFromKey(info.effectKey));
    }

    el.dataset.fontKey = info.fontKey || "";
    el.dataset.effectKey = info.effectKey || "none";

    el.style.setProperty("font-family", visual.family, "important");
    el.style.setProperty("font-size", String(visual.size) + "px", "important");
    el.style.setProperty("font-weight", String(visual.weight), "important");
    el.style.setProperty("letter-spacing", String(visual.spacing) + "px", "important");
    el.style.setProperty("line-height", "1.05", "important");
    el.style.setProperty("white-space", "nowrap", "important");
    el.style.setProperty("display", "inline-block", "important");
    el.style.setProperty("text-align", "center", "important");
    el.style.setProperty("animation-play-state", "running", "important");

    if (hasRainbow) {
      el.style.setProperty("color", "transparent", "important");
      el.style.setProperty("-webkit-text-fill-color", "transparent", "important");
      el.style.setProperty("background-clip", "text", "important");
      el.style.setProperty("-webkit-background-clip", "text", "important");
    } else if (info.effectKey === "none" || info.effectKey === "default" || info.effectKey === "normal") {
      const color = info.color || "#fff8ea";
      el.style.setProperty("color", color, "important");
      el.style.setProperty("-webkit-text-fill-color", color, "important");
      el.style.setProperty(
        "text-shadow",
        "0 0 6px rgba(255,211,123,0.55), 0 1px 2px rgba(0,0,0,0.32)",
        "important"
      );
    }
  }

  function isUsableNicknameElement(el) {
    if (!el || !el.tagName) return false;

    const tag = el.tagName.toLowerCase();

    if (["script", "style", "input", "textarea", "select", "option", "canvas", "img", "svg", "path"].indexOf(tag) >= 0) {
      return false;
    }

    return true;
  }

  function getNicknameCandidateElements() {
    const list = [];
    const seen = new Set();

    const mainLayer = ensureStatusNicknameTextLayer();

    if (mainLayer) {
      seen.add(mainLayer);
      list.push(mainLayer);
    }

    const selectors = [
      "#statusAvatarNameText",
      ".status-avatar-name-text",
      ".friend-rank-nickname",
      "[data-nickname-sync]",
      "[data-sync-nickname]",
      "[data-nickname-style]",
      ".player-nickname",
      ".status-nickname",
      ".avatar-nickname",
      ".aura-nickname",
      ".game-nickname",
      ".result-nickname",
      ".my-nickname",
      ".nickname-text",
      ".nicknameLabel",
      ".nickname-label",
      "#statusNickname",
      "#playerNickname",
      "#playNickname",
      "#gameNickname",
      "#auraNickname",
      "#avatarNickname",
      "#resultNickname",
      "#nicknameText",
      "#nicknameLabel",
      "#myNickname",
      "#statusAvatarNickname",
      "#auraPlayerNickname"
    ];

    selectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (el) {
        if (!isUsableNicknameElement(el)) return;
        if (seen.has(el)) return;

        seen.add(el);
        list.push(el);
      });
    });

    return list;
  }

  function applyAllNicknameStyles() {
    const targets = getNicknameCandidateElements();

    targets.forEach(function (el) {
      applyNicknameStyle(el);
    });
  }

  function scheduleApplyNicknameStyles() {
    if (nicknameApplyTimer) clearTimeout(nicknameApplyTimer);

    nicknameApplyTimer = setTimeout(function () {
      applyAllNicknameStyles();
    }, 60);
  }

  function observeNicknameTargets() {
    if (nicknameObserverStarted) return;
    if (!window.MutationObserver) return;

    nicknameObserverStarted = true;

    const root = playPageRoot || document.body;

    const observer = new MutationObserver(function () {
      scheduleApplyNicknameStyles();
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function addAvatarLayer(stack, src, cls, z) {
    const cleanSrc = cleanValue(src);

    if (!cleanSrc) return;

    const img = document.createElement("img");

    img.className = "status-avatar-layer " + cls;
    img.src = cleanSrc;
    img.alt = "";
    img.style.zIndex = String(z);

    img.onerror = function () {
      img.style.display = "none";
    };

    stack.appendChild(img);
  }

  function renderStatusAvatar() {
    const stack = qs("statusAvatarStack");

    if (!stack || !playPageRoot) return;

    try {
      stack.innerHTML = "";

      const avatarData = getAvatarData();
      const genderRaw = cleanValue(avatarData.gender || "male");
      const gender = genderRaw || "male";

      const baseBody = getDataAttr("data-base-body-" + gender) || getDataAttr("data-base-body-male");
      const baseHead = getDataAttr("data-base-head-" + gender) || getDataAttr("data-base-head-male");
      const baseHairBack = getDataAttr("data-base-hair-back-" + gender) || getDataAttr("data-base-hair-back-male");
      const baseHairFront = getDataAttr("data-base-hair-front-" + gender) || getDataAttr("data-base-hair-front-male");
      const baseEyes = getDataAttr("data-base-eyes-" + gender) || getDataAttr("data-base-eyes-male");
      const baseEyebrow = getDataAttr("data-base-eyebrow-" + gender) || getDataAttr("data-base-eyebrow-male");
      const baseMouth = getDataAttr("data-base-mouth-" + gender) || getDataAttr("data-base-mouth-male");
      const windAuraUrl = getDataAttr("data-wind-aura-url");

      const auraLayer = document.createElement("div");
      auraLayer.className = "status-avatar-foot-aura";

      if (windAuraUrl) {
        auraLayer.innerHTML =
          '<img class="status-avatar-foot-aura-img" src="' + windAuraUrl + '" alt="">';
      }

      stack.appendChild(auraLayer);

      const customUnique = getAvatarImage(avatarData, [
        "unique_image_url",
        "effect_image_url",
        "unique.image_url",
        "effect.image_url",
        "equipped_unique.image_url",
      ]);

      const customRearHair = getAvatarImage(avatarData, [
        "rear_hair_image_url",
        "hair_back_image_url",
        "rearHairImageUrl",
        "hairBackImageUrl",
        "rear_hair.image_url",
        "hair_back.image_url",
      ]);

      const customFrontHair = getAvatarImage(avatarData, [
        "front_hair_image_url",
        "hair_front_image_url",
        "frontHairImageUrl",
        "hairFrontImageUrl",
        "front_hair.image_url",
        "hair_front.image_url",
      ]);

      const customEyes = getAvatarImage(avatarData, [
        "eyes_image_url",
        "eye_image_url",
        "eyes.image_url",
        "eye.image_url",
      ]);

      const customEyebrow = getAvatarImage(avatarData, [
        "eyebrow_image_url",
        "brow_image_url",
        "eyebrow.image_url",
        "brow.image_url",
      ]);

      const customMouth = getAvatarImage(avatarData, [
        "mouth_image_url",
        "mouth.image_url",
      ]);

      const customCloth = getAvatarImage(avatarData, [
        "cloth_image_url",
        "clothes_image_url",
        "top_image_url",
        "cloth.image_url",
        "clothes.image_url",
        "top.image_url",
      ]);

      const customPants = getAvatarImage(avatarData, [
        "pants_image_url",
        "bottom_image_url",
        "pants.image_url",
        "bottom.image_url",
      ]);

      const customShoes = getAvatarImage(avatarData, [
        "shoes_image_url",
        "shoe_image_url",
        "shoes.image_url",
        "shoe.image_url",
      ]);

      const customHat = getAvatarImage(avatarData, [
        "hat_image_url",
        "head_item_image_url",
        "hat.image_url",
        "head_item.image_url",
      ]);

      addAvatarLayer(stack, customUnique, "status-avatar-layer-unique-back", 8);
      addAvatarLayer(stack, customRearHair || baseHairBack, "status-avatar-layer-hair-rear", 20);
      addAvatarLayer(stack, baseBody, "status-avatar-layer-body", 30);
      addAvatarLayer(stack, customPants, "status-avatar-layer-pants", 34);
      addAvatarLayer(stack, customShoes, "status-avatar-layer-shoes", 35);
      addAvatarLayer(stack, customCloth, "status-avatar-layer-cloth", 40);
      addAvatarLayer(stack, baseHead, "status-avatar-layer-head", 50);
      addAvatarLayer(stack, customEyebrow || baseEyebrow, "status-avatar-layer-eyebrow", 60);
      addAvatarLayer(stack, customEyes || baseEyes, "status-avatar-layer-eyes", 70);
      addAvatarLayer(stack, customMouth || baseMouth, "status-avatar-layer-mouth", 80);
      addAvatarLayer(stack, customFrontHair || baseHairFront, "status-avatar-layer-hair-front", 90);
      addAvatarLayer(stack, customHat, "status-avatar-layer-hat", 100);

      applyAllNicknameStyles();
    } catch (e) {
      console.error("renderStatusAvatar error:", e);
    }
  }

  function bindEvents() {
    if (btnBackToModes) {
      btnBackToModes.addEventListener("click", function () {
        show(screenSelect);
      });
    }

    if (btnGoPlay) {
      btnGoPlay.addEventListener("click", function () {
        show(screenPlay);
        resetGameUI();
        applyAllNicknameStyles();
      });
    }

    if (btnBackToSetup) {
      btnBackToSetup.addEventListener("click", function () {
        show(screenSetup);
      });
    }

    if (btnStart) {
      btnStart.addEventListener("click", startGame);
    }

    if (btnReset) {
      btnReset.addEventListener("click", function () {
        if (running) finalizeRun();
        else resetGameUI();
      });
    }

    if (btnSubmit) {
      btnSubmit.addEventListener("click", submitAnswer);
    }

    if (answerInput) {
      answerInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          submitAnswer();
        }
      });
    }

    const btnClose = qs("btnClose");

    if (btnClose) {
      btnClose.addEventListener("click", function () {
        if (modal) modal.classList.remove("on");
        applyAllNicknameStyles();
      });
    }

    const btnAgain = qs("btnAgain");

    if (btnAgain) {
      btnAgain.addEventListener("click", function () {
        if (modal) modal.classList.remove("on");
        resetGameUI();
        applyAllNicknameStyles();
      });
    }

    if (btnKeyModalClose) {
      btnKeyModalClose.addEventListener("click", function () {
        if (keyExhaustedModal) keyExhaustedModal.classList.remove("on");
      });
    }

    if (mobilePad) {
      mobilePad.addEventListener("click", function (e) {
        if (!running || !answerInput) return;

        const btn = e.target.closest("[data-pad]");

        if (!btn) return;

        const key = btn.getAttribute("data-pad");

        if (key === "clear") {
          answerInput.value = "";
        } else if (key === "back") {
          answerInput.value = String(answerInput.value).slice(0, -1);
        } else if (answerInput.value.length < 5) {
          answerInput.value += key;
        }
      });
    }
  }

  function initPage() {
    bindElements();

    try { initData(); } catch (e) { console.error("initData error:", e); }
    try { injectNicknameStylePatch(); } catch (e) { console.error("injectNicknameStylePatch error:", e); }
    try { ensureStatusNicknameTextLayer(); } catch (e) { console.error("ensureStatusNicknameTextLayer error:", e); }
    try { renderModeTiles(); } catch (e) { console.error("renderModeTiles error:", e); }
    try { renderPracticeOperations(); } catch (e) { console.error("renderPracticeOperations error:", e); }
    try { updateSetupPanel(); } catch (e) { console.error("updateSetupPanel error:", e); }
    try { updateRankingLink(); } catch (e) { console.error("updateRankingLink error:", e); }
    try { show(screenSelect); } catch (e) { console.error("show screen error:", e); }
    try { renderStatusAvatar(); } catch (e) { console.error("renderStatusAvatar outer error:", e); }
    try { bindEvents(); } catch (e) { console.error("bindEvents error:", e); }
    try { observeNicknameTargets(); } catch (e) { console.error("observeNicknameTargets error:", e); }

    try {
      updateTimerUI();
      setAuraState("idle");
      applyAllNicknameStyles();

      setTimeout(applyAllNicknameStyles, 100);
      setTimeout(applyAllNicknameStyles, 400);
      setTimeout(applyAllNicknameStyles, 1000);
      setTimeout(applyAllNicknameStyles, 1800);
    } catch (e) {
      console.error("final init error:", e);
    }

    window.MathnerApplyAuraNicknameStyles = applyAllNicknameStyles;
    window.MathnerGetAuraNicknameStyleInfo = getNicknameStyleInfo;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPage);
  } else {
    initPage();
  }
})();