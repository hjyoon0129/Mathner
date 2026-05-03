const PAGE_CFG = JSON.parse(
  document.getElementById("math-rain-config")?.textContent || "{}"
);

const gameArea = document.getElementById("gameArea");

const heartsBarEl = document.getElementById("heartsBar");
const answerInput = document.getElementById("answerInput");
const submitBtn = document.getElementById("submitBtn");

const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const startOverlayBtn = document.getElementById("startOverlayBtn");
const restartBtnOverlay = document.getElementById("restartBtnOverlay");
const finishCloseBtn = document.getElementById("finishCloseBtn");
const openRankingBtn = document.getElementById("openRankingBtn");

const mobilePadWrap = document.getElementById("mobilePadWrap");
const mobilePad = document.getElementById("mobilePad");
const mobileStartBtn = document.getElementById("mobileStartBtn");
const mobileResetBtn = document.getElementById("mobileResetBtn");

const startOverlay = document.getElementById("startOverlay");
const finishOverlay = document.getElementById("finishOverlay");
const finishFxLayer = document.getElementById("finishFxLayer");

const rewardIntroOverlay = document.getElementById("rewardIntroOverlay");
const rewardIntroAmountEl = document.getElementById("rewardIntroAmount");
const rewardIntroTextEl = document.getElementById("rewardIntroText");
const rewardIntroFxEl = document.getElementById("rewardIntroFx");

const finishTitleEl = document.getElementById("finishTitle");
const finishDescEl = document.getElementById("finishDesc");
const finishBadgeEl = document.getElementById("finishBadge");
const finishStarsBigEl = document.getElementById("finishStarsBig");

const finalClearedEl = document.getElementById("finalCleared");
const finalStarsEl = document.getElementById("finalStars");

const levelIntroEl = document.getElementById("levelIntro");
const levelIntroTextEl = document.getElementById("levelIntroText");

const noKeyOverlay = document.getElementById("noKeyOverlay");
const goPricingBtn = document.getElementById("goPricingBtn");
const playLaterBtn = document.getElementById("playLaterBtn");

const opButtons = document.querySelectorAll(".op-btn");

const navStarCountEl = document.getElementById("navStarCount");
const navKeyCountEl = document.getElementById("navKeyCount");

const HIGH_SCORE_KEY = "math_rain_high_score_v20_mobile_2btn_nokey";

let selectedOp = "+";

let equations = [];
let totalStars = getInitialNavValue(navStarCountEl, PAGE_CFG.initialStars || 0);
let remainingKeys = getInitialNavValue(navKeyCountEl, PAGE_CFG.initialKeys || 0);
let hearts = 5;
let level = 1;
let cleared = 0;
let wrongCount = 0;
let runEarnedStars = 0;
let bestCombo = 0;
let currentCombo = 0;
let highScore = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);

let gameRunning = false;
let animationId = null;
let spawnTimer = null;
let lastTimestamp = 0;
let isLevelIntroShowing = false;
let levelTransitionPending = false;

let runStartedOnServer = false;
let runSaved = false;
let finalizing = false;
let rankingRecorded = false;
let finishFxTimer = null;
let rewardIntroTimer = null;

let browserBackGuardActive = false;
let browserBackFinalizing = false;
let browserBackHandlerBound = false;

let runStarsAppliedToNav = false;
let navStarFloor = null;

function isMobileUI() {
  return window.matchMedia("(max-width: 640px)").matches;
}

function getInitialNavValue(el, fallback) {
  const fromNav = Number((el?.textContent || "").trim());
  if (!Number.isNaN(fromNav)) return fromNav;

  const fromFallback = Number(fallback);
  return Number.isNaN(fromFallback) ? 0 : fromFallback;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) return parts.pop().split(";").shift();

  return "";
}

function currentOperationKey() {
  if (selectedOp === "+") return "add";
  if (selectedOp === "-") return "sub";
  if (selectedOp === "*") return "mul";
  if (selectedOp === "/") return "div";
  return "mixed";
}

function getRankingUrl() {
  return (
    PAGE_CFG.rankingUrl ||
    PAGE_CFG.rankingHomeUrl ||
    PAGE_CFG.rankingPageUrl ||
    "/ranking/"
  );
}

function getPricingUrl() {
  return PAGE_CFG.pricingUrl || "/#pricing";
}

function saveHighScore() {
  if (cleared > highScore) {
    highScore = cleared;
    localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
  }
}

function setOperationButtonsDisabled(disabled) {
  opButtons.forEach((btn) => {
    btn.disabled = disabled;
  });
}

function renderHearts() {
  if (!heartsBarEl) return;

  heartsBarEl.innerHTML = "";

  for (let i = 0; i < 5; i += 1) {
    const slot = document.createElement("span");
    slot.className = "heart-slot" + (i < hearts ? " active" : "");
    slot.textContent = "❤";
    heartsBarEl.appendChild(slot);
  }
}

function updateTextForSelectors(selectors, value) {
  const text = String(value);

  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      if (!el) return;
      el.textContent = text;
    });
  });
}

function numberOrFallback(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getServerStarValue(data, fallback) {
  if (!data || typeof data !== "object") return fallback;

  return numberOrFallback(
    data.total_stars ??
      data.nav_star_count ??
      data.stars_total ??
      data.user_total_stars ??
      data.stars,
    fallback
  );
}

function getServerKeyValue(data, fallback) {
  if (!data || typeof data !== "object") return fallback;

  return numberOrFallback(
    data.remaining_keys ?? data.nav_key_count ?? data.keys,
    fallback
  );
}

function updateResourceCountsFromServer(data, options = {}) {
  const { preventStarDecrease = false } = options;
  const serverStars = getServerStarValue(data, totalStars);
  const serverKeys = getServerKeyValue(data, remainingKeys);

  remainingKeys = Number.isFinite(serverKeys) ? serverKeys : remainingKeys;

  if (Number.isFinite(serverStars)) {
    if (preventStarDecrease && navStarFloor !== null) {
      totalStars = Math.max(serverStars, navStarFloor);
    } else {
      totalStars = serverStars;
    }
  }

  if (Number.isNaN(totalStars)) totalStars = 0;
  if (Number.isNaN(remainingKeys)) remainingKeys = 0;
}

function applyRunStarsToNavOnce() {
  if (runStarsAppliedToNav) {
    syncNavResources();
    return;
  }

  const gain = numberOrFallback(runEarnedStars, 0);

  totalStars += Math.max(0, gain);
  navStarFloor = totalStars;
  runStarsAppliedToNav = true;

  syncNavResources();
}

function syncNavResources() {
  if (Number.isNaN(totalStars)) totalStars = 0;
  if (Number.isNaN(remainingKeys)) remainingKeys = 0;

  const displayStars = navStarFloor !== null
    ? Math.max(totalStars, navStarFloor)
    : totalStars;

  if (navStarCountEl) navStarCountEl.textContent = String(displayStars);
  if (navKeyCountEl) navKeyCountEl.textContent = String(remainingKeys);

  updateTextForSelectors(
    [
      "#navStarCount",
      "#navStarsCount",
      "#navbarStarCount",
      "#navbarStarsCount",
      "#topStarCount",
      "#topStarsCount",
      "#headerStarCount",
      "#headerStarsCount",
      "#mobileStarCount",
      "#mobileStarsCount",
      ".nav-star-count",
      ".nav-stars-count",
      ".navbar-star-count",
      ".navbar-stars-count",
      ".top-star-count",
      ".top-stars-count",
      "[data-nav-star-count]",
      "[data-star-count]",
    ],
    displayStars
  );

  updateTextForSelectors(
    [
      "#navKeyCount",
      "#navKeysCount",
      "#navbarKeyCount",
      "#navbarKeysCount",
      "#topKeyCount",
      "#topKeysCount",
      "#headerKeyCount",
      "#headerKeysCount",
      "#mobileKeyCount",
      "#mobileKeysCount",
      ".nav-key-count",
      ".nav-keys-count",
      ".navbar-key-count",
      ".navbar-keys-count",
      ".top-key-count",
      ".top-keys-count",
      "[data-nav-key-count]",
      "[data-key-count]",
    ],
    remainingKeys
  );
}

function updateUI() {
  renderHearts();
  syncNavResources();
  syncMobileButtons();
  updateMobileInputMode();
  updateMobilePadState();
}

function resetLocalRunState() {
  hearts = 5;
  level = 1;
  cleared = 0;
  wrongCount = 0;
  bestCombo = 0;
  currentCombo = 0;
  runEarnedStars = 0;
  gameRunning = false;
  lastTimestamp = 0;
  isLevelIntroShowing = false;
  levelTransitionPending = false;
  finalizing = false;
  runStarsAppliedToNav = false;
  navStarFloor = null;
}

function setOperation(op) {
  if (gameRunning) return;

  selectedOp = op;

  opButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.op === op);
  });
}

function getLevelTarget(levelNumber) {
  if (levelNumber === 1) return 8;
  if (levelNumber === 2) return 18;
  if (levelNumber === 3) return 30;
  if (levelNumber === 4) return 44;
  return 60 + (levelNumber - 4) * 16;
}

function getBaseReward() {
  if (selectedOp === "mixed") return level >= 3 ? 2 : 1;
  return 1;
}

function getSpawnDelay() {
  if (level >= 5) return 1250;
  if (level === 4) return 1380;
  if (level === 3) return 1520;
  if (level === 2) return 1700;
  return 1880;
}

function getFallSpeed(type = "normal") {
  let speed = 32;

  if (level === 2) speed = 38;
  else if (level === 3) speed = 44;
  else if (level === 4) speed = 50;
  else if (level >= 5) speed = 56;

  if (type === "bomb") speed += 4;
  if (type === "ringwing") speed -= 3;

  return speed + randomInt(-2, 3);
}

function getOperationPool() {
  if (selectedOp === "mixed") return ["+", "-", "*", "/"];
  return [selectedOp];
}

function makeLevelPattern(op) {
  if (level === 1) return { kind: "two", size: "one-one", op };
  if (level === 2) return { kind: "two", size: "two-one", op };
  return { kind: "three", size: "one-one-one", op };
}

function randOneDigit() {
  return randomInt(1, 9);
}

function randTwoDigit() {
  return randomInt(10, 19);
}

function buildTwoTermQuestion(op, size) {
  let a = 1;
  let b = 1;

  if (size === "one-one") {
    a = randOneDigit();
    b = randOneDigit();
  } else {
    a = randTwoDigit();
    b = randOneDigit();
  }

  if (op === "+") return { text: `${a}+${b}`, answer: a + b };

  if (op === "-") {
    if (b > a) [a, b] = [b, a];
    if (a === b) a += 1;
    return { text: `${a}-${b}`, answer: a - b };
  }

  if (op === "*") {
    if (size === "two-one") {
      a = randTwoDigit();
      b = randomInt(2, 5);
    } else {
      a = randomInt(2, 9);
      b = randomInt(2, 9);
    }

    return { text: `${a}×${b}`, answer: a * b };
  }

  let divisor = 2;
  let quotient = 2;

  if (size === "two-one") {
    divisor = randomInt(2, 5);
    quotient = randTwoDigit();
  } else {
    divisor = randomInt(2, 9);
    quotient = randomInt(2, 9);
  }

  const dividend = divisor * quotient;

  return { text: `${dividend}÷${divisor}`, answer: quotient };
}

function buildThreeTermQuestion(op) {
  const a = randOneDigit();
  const b = randOneDigit();
  const c = randOneDigit();

  if (op === "+") return { text: `${a}+${b}+${c}`, answer: a + b + c };

  if (op === "-") {
    const sum = a + b + c;
    return { text: `${sum}-${a}-${b}`, answer: c };
  }

  if (op === "*") {
    const aa = randomInt(1, 4);
    const bb = randomInt(1, 4);
    const cc = randomInt(1, 4);

    return { text: `${aa}×${bb}×${cc}`, answer: aa * bb * cc };
  }

  const divisor = randomInt(2, 4);
  const q1 = randomInt(2, 4);
  const q2 = randomInt(2, 4);
  const dividend = divisor * q1 * q2;

  return { text: `${dividend}÷${divisor}÷${q1}`, answer: q2 };
}

function buildNormalEquation() {
  const ops = getOperationPool();
  const op = ops[randomInt(0, ops.length - 1)];
  const pattern = makeLevelPattern(op);

  let built;

  if (pattern.kind === "three") built = buildThreeTermQuestion(op);
  else built = buildTwoTermQuestion(op, pattern.size);

  return { type: "normal", text: built.text, answer: built.answer };
}

function buildBomb() {
  const base = buildNormalEquation();
  return { type: "bomb", text: `💣 ${base.text}`, answer: base.answer };
}

function buildRingWing() {
  const base = buildNormalEquation();
  return { type: "ringwing", text: `${base.text}`, answer: base.answer };
}

function buildEquationData() {
  const specialRoll = Math.random();

  if (specialRoll < 0.08) return buildBomb();
  if (specialRoll < 0.13) return buildRingWing();

  return buildNormalEquation();
}

function spawnEquation() {
  if (!gameRunning || isLevelIntroShowing || levelTransitionPending) return;

  const data = buildEquationData();
  const el = document.createElement("div");

  el.classList.add("equation");

  if (data.type === "bomb") el.classList.add("eq-bomb");
  else if (data.type === "ringwing") el.classList.add("eq-ringwing");
  else el.classList.add("eq-normal");

  el.textContent = data.text;

  const widthGuess = data.type === "ringwing" ? 132 : data.type === "bomb" ? 124 : 110;
  const left = randomInt(12, Math.max(12, gameArea.clientWidth - widthGuess - 12));

  el.style.left = `${left}px`;
  el.style.top = "-18px";

  gameArea.appendChild(el);

  equations.push({
    ...data,
    el,
    x: left,
    y: -18,
    height: 46,
    speed: getFallSpeed(data.type),
  });
}

function removeEquationByRef(item) {
  const idx = equations.indexOf(item);

  if (idx !== -1) equations.splice(idx, 1);
  if (item.el && item.el.parentNode) item.el.remove();
}

function showFloatText(text, x, y, kind = "bad") {
  const fx = document.createElement("div");

  fx.className = `float-text ${kind}`;
  fx.textContent = text;
  fx.style.left = `${x}px`;
  fx.style.top = `${y}px`;

  gameArea.appendChild(fx);

  setTimeout(() => fx.remove(), 950);
}

function showRewardFloat(x, y, amount) {
  const wrap = document.createElement("div");
  wrap.className = "reward-float";

  const num = document.createElement("span");
  num.className = "reward-number";
  num.textContent = `+${amount}`;

  const icon = document.createElement("span");
  icon.className = "reward-icon";
  icon.textContent = "⭐";

  wrap.appendChild(num);
  wrap.appendChild(icon);

  wrap.style.left = `${x}px`;
  wrap.style.top = `${y}px`;

  gameArea.appendChild(wrap);

  setTimeout(() => wrap.remove(), 1050);
}

function showLevelIntro(levelNumber, callback) {
  isLevelIntroShowing = true;

  if (levelIntroTextEl) levelIntroTextEl.textContent = `${levelNumber} 단계`;
  if (levelIntroEl) levelIntroEl.classList.remove("hidden");

  setTimeout(() => {
    if (levelIntroEl) levelIntroEl.classList.add("hidden");
    isLevelIntroShowing = false;
    if (callback) callback();
  }, 900);
}

function maybeQueueLevelTransition() {
  if (levelTransitionPending) return;

  if (cleared >= getLevelTarget(level)) {
    levelTransitionPending = true;
    clearInterval(spawnTimer);
    updateUI();
  }
}

function maybeStartPendingLevel() {
  if (!levelTransitionPending || equations.length > 0 || !gameRunning) return;

  level += 1;
  levelTransitionPending = false;

  updateUI();

  showLevelIntro(level, () => {
    if (!gameRunning) return;
    spawnEquation();
    restartSpawnTimer();
  });
}

function rewardCurrentHit(item) {
  const reward = getBaseReward();

  runEarnedStars += reward;
  cleared += 1;
  currentCombo += 1;

  if (currentCombo > bestCombo) bestCombo = currentCombo;

  saveHighScore();
  maybeQueueLevelTransition();
  updateUI();
  showRewardFloat(item.x + 14, item.y - 2, reward);
}

function clearAllCurrentEquations() {
  const currentItems = [...equations];

  equations = [];

  currentItems.forEach((item) => {
    if (item.type === "bomb") {
      item.el.classList.add("miss");
    } else {
      item.el.classList.add("hit");
      rewardCurrentHit(item);
    }

    setTimeout(() => {
      if (item.el && item.el.parentNode) item.el.remove();
    }, 180);
  });

  setTimeout(() => {
    maybeStartPendingLevel();
  }, 220);
}

function handleCorrectNormal(item) {
  removeEquationByRef(item);

  item.el.classList.add("hit");
  gameArea.appendChild(item.el);
  rewardCurrentHit(item);

  setTimeout(() => {
    if (item.el && item.el.parentNode) item.el.remove();
    maybeStartPendingLevel();
  }, 180);
}

function handleCorrectRingWing(item) {
  removeEquationByRef(item);

  item.el.classList.add("hit");
  gameArea.appendChild(item.el);

  currentCombo += 1;

  if (currentCombo > bestCombo) bestCombo = currentCombo;

  showFloatText("마법 정답! ✨", item.x - 14, item.y, "ring");

  setTimeout(() => {
    if (item.el && item.el.parentNode) item.el.remove();
    clearAllCurrentEquations();
  }, 120);
}

function handleCorrectBomb(item) {
  removeEquationByRef(item);

  item.el.classList.add("hit");
  gameArea.appendChild(item.el);

  hearts = Math.max(0, hearts - 1);
  wrongCount += 1;
  currentCombo = 0;

  showFloatText("-1 ♥", item.x + 8, item.y, "bad");
  updateUI();

  setTimeout(() => {
    if (item.el && item.el.parentNode) item.el.remove();
    maybeStartPendingLevel();
    if (hearts <= 0) endGame();
  }, 180);
}

function submitAnswer() {
  if (!gameRunning || isLevelIntroShowing) return;

  const raw = answerInput.value.trim();

  if (!raw) return;

  const value = Number(raw);

  if (Number.isNaN(value)) return;

  const item = equations.find((eq) => eq.answer === value);

  if (!item) {
    answerInput.value = "";
    if (!isMobileUI()) answerInput.focus();
    return;
  }

  if (item.type === "ringwing") handleCorrectRingWing(item);
  else if (item.type === "bomb") handleCorrectBomb(item);
  else handleCorrectNormal(item);

  answerInput.value = "";

  if (!isMobileUI()) answerInput.focus();

  updateMobilePadState();
}

function handleGroundHit(item) {
  if (!gameRunning) return;

  removeEquationByRef(item);

  item.el.classList.add("miss");
  gameArea.appendChild(item.el);

  if (item.type === "bomb") {
    currentCombo = 0;
  } else {
    hearts = Math.max(0, hearts - 1);
    wrongCount += 1;
    currentCombo = 0;
    showFloatText("-1 ♥", item.x + 12, item.y, "bad");
  }

  updateUI();

  setTimeout(() => {
    if (item.el && item.el.parentNode) item.el.remove();
    maybeStartPendingLevel();
  }, 220);

  if (hearts <= 0) endGame();
}

function gameLoop(timestamp) {
  if (!gameRunning) return;

  if (!lastTimestamp) lastTimestamp = timestamp;

  const delta = (timestamp - lastTimestamp) / 1000;

  lastTimestamp = timestamp;

  if (!isLevelIntroShowing) {
    const groundY = gameArea.clientHeight - 72;

    for (let i = equations.length - 1; i >= 0; i -= 1) {
      const item = equations[i];

      item.y += item.speed * delta;
      item.el.style.top = `${item.y}px`;

      if (item.y + item.height >= groundY) {
        handleGroundHit(item);
      }
    }
  }

  animationId = requestAnimationFrame(gameLoop);
}

function restartSpawnTimer() {
  clearInterval(spawnTimer);
  spawnTimer = setInterval(spawnEquation, getSpawnDelay());
}

function clearAllEquationsNow() {
  equations.forEach((item) => {
    if (item.el && item.el.parentNode) item.el.remove();
  });

  equations = [];
}

function openNoKeyOverlay() {
  if (goPricingBtn) goPricingBtn.setAttribute("href", getPricingUrl());
  if (noKeyOverlay) noKeyOverlay.classList.add("show");
}

function closeNoKeyOverlay() {
  if (noKeyOverlay) noKeyOverlay.classList.remove("show");
}

async function startRunOnServer() {
  if (!PAGE_CFG.startRunUrl) return;

  const response = await fetch(PAGE_CFG.startRunUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken"),
      "X-Requested-With": "XMLHttpRequest",
    },
    credentials: "same-origin",
    body: JSON.stringify({
      game_mode: "math_rain",
      game_name: "math_rain",
      game: "math_rain",
      operation: currentOperationKey(),
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    const err = new Error(data.message || data.error || "Failed to start run.");
    err.code = data.error_code || "";
    throw err;
  }

  runStartedOnServer = true;
  updateResourceCountsFromServer(data);
  syncNavResources();
}

async function recordRankingScore() {
  if (!PAGE_CFG.recordRankingUrl) return;
  if (rankingRecorded) return;
  if (!PAGE_CFG.isAuthenticated) return;

  const hasMeaningfulResult = Number(cleared || 0) > 0 || Number(runEarnedStars || 0) > 0;

  if (!hasMeaningfulResult) return;

  try {
    const response = await fetch(PAGE_CFG.recordRankingUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
        "X-Requested-With": "XMLHttpRequest",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        game_mode: "math_rain",
        game_name: "math_rain",
        game: "math_rain",
        operation: currentOperationKey(),
        score: cleared,
        correct_count: cleared,
        wrong_count: wrongCount,
        earned_stars: runEarnedStars,
        gained_stars: runEarnedStars,
        best_combo: bestCombo,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.ok) rankingRecorded = true;
  } catch (error) {}
}

function buildFinalizePayloadObject(reason) {
  return {
    reason,
    earned_stars: runEarnedStars,
    gained_stars: runEarnedStars,
    stars: runEarnedStars,
    correct_count: cleared,
    wrong_count: wrongCount,
    best_combo: bestCombo,
    max_combo: bestCombo,
    correct: cleared,
    score: cleared,
    game_mode: "math_rain",
    game_name: "math_rain",
    game: "math_rain",
    operation: currentOperationKey(),
  };
}

function buildFinalizePayload(reason) {
  return JSON.stringify(buildFinalizePayloadObject(reason));
}

function getFinishMeta(reason) {
  if (reason === "game_over") {
    return {
      badge: "끝!",
      title: "게임 오버 😭",
      desc: "",
      rewardText: "내가 모은 별이 안전하게 저장되었어요!",
    };
  }

  if (reason === "reset") {
    return {
      badge: "저장 완료",
      title: "다시하기",
      desc: "",
      rewardText: "새로 시작하기 전에, 모은 별을 모두 담았어요!",
    };
  }

  if (reason === "browser_back" || reason === "leave") {
    return {
      badge: "저장 완료",
      title: "도전 저장 완료!",
      desc: "",
      rewardText: "나가기 전에 모은 별을 안전하게 담았어요!",
    };
  }

  return {
    badge: "끝!",
    title: "도전 완료! 🥳",
    desc: "",
    rewardText: "정말 잘했어요! 예쁜 별을 획득했어요.",
  };
}

function clearFinishFx() {
  if (finishFxTimer) {
    clearTimeout(finishFxTimer);
    finishFxTimer = null;
  }

  if (finishFxLayer) finishFxLayer.innerHTML = "";
}

function playFinishStarRain(amount) {
  if (!finishFxLayer) return;

  clearFinishFx();

  const totalCount = Math.min(42, Math.max(18, amount * 5));

  for (let i = 0; i < totalCount; i += 1) {
    const star = document.createElement("span");

    star.className = "finish-drop-star";
    star.textContent = "★";
    star.style.left = `${Math.random() * 100}%`;
    star.style.animationDuration = `${1.4 + Math.random() * 1.1}s`;
    star.style.animationDelay = `${Math.random() * 0.4}s`;
    star.style.fontSize = `${18 + Math.random() * 14}px`;

    finishFxLayer.appendChild(star);
  }

  const gain = document.createElement("div");

  gain.className = "finish-gain-pop";
  gain.textContent = `+${amount} ★`;

  finishFxLayer.appendChild(gain);

  finishFxTimer = setTimeout(() => {
    clearFinishFx();
  }, 2500);
}

function clearRewardIntroFx() {
  if (rewardIntroTimer) {
    clearTimeout(rewardIntroTimer);
    rewardIntroTimer = null;
  }

  if (rewardIntroFxEl) rewardIntroFxEl.innerHTML = "";
}

function playRewardIntroFx(amount) {
  if (!rewardIntroFxEl) return;

  rewardIntroFxEl.innerHTML = "";

  const fallingCount = Math.min(36, Math.max(20, amount * 6));

  for (let i = 0; i < fallingCount; i += 1) {
    const star = document.createElement("span");

    star.className = "reward-intro-falling-star" + (Math.random() > 0.72 ? " big" : "");
    star.textContent = "★";
    star.style.left = `${Math.random() * 100}%`;
    star.style.fontSize = `${16 + Math.random() * 20}px`;
    star.style.animationDuration = `${1.05 + Math.random() * 1.1}s`;
    star.style.animationDelay = `${Math.random() * 0.55}s`;

    rewardIntroFxEl.appendChild(star);
  }

  for (let i = 0; i < 22; i += 1) {
    const burst = document.createElement("span");

    burst.className = "reward-intro-burst";
    burst.style.setProperty("--bx", `${(Math.random() - 0.5) * 250}px`);
    burst.style.setProperty("--by", `${(Math.random() - 0.5) * 210}px`);
    burst.style.animationDelay = `${Math.random() * 0.18}s`;

    rewardIntroFxEl.appendChild(burst);
  }
}

function closeRewardIntroOverlay() {
  if (rewardIntroOverlay) rewardIntroOverlay.classList.remove("show");
  clearRewardIntroFx();
}

function openFinishOverlay(reason) {
  const meta = getFinishMeta(reason);

  if (finishBadgeEl) finishBadgeEl.textContent = meta.badge;
  if (finishTitleEl) finishTitleEl.textContent = meta.title;

  if (finishDescEl) {
    finishDescEl.textContent = meta.desc || "";
    finishDescEl.classList.toggle("hidden", !meta.desc);
  }

  if (finishStarsBigEl) finishStarsBigEl.textContent = String(runEarnedStars);
  if (finalClearedEl) finalClearedEl.textContent = String(cleared);
  if (finalStarsEl) finalStarsEl.textContent = String(runEarnedStars);

  if (openRankingBtn) openRankingBtn.setAttribute("href", getRankingUrl());

  if (finishOverlay) finishOverlay.classList.add("show");

  const finishCard = finishOverlay?.querySelector(".finish-card");

  if (finishCard) finishCard.scrollTop = 0;

  requestAnimationFrame(() => {
    playFinishStarRain(runEarnedStars);
  });
}

function openRewardIntroThenFinish(reason) {
  const meta = getFinishMeta(reason);

  closeRewardIntroOverlay();

  if (finishOverlay) finishOverlay.classList.remove("show");

  if (rewardIntroAmountEl) rewardIntroAmountEl.textContent = `+${runEarnedStars}`;
  if (rewardIntroTextEl) rewardIntroTextEl.textContent = meta.rewardText;

  if (rewardIntroOverlay) rewardIntroOverlay.classList.add("show");

  playRewardIntroFx(runEarnedStars);

  rewardIntroTimer = setTimeout(() => {
    closeRewardIntroOverlay();
    openFinishOverlay(reason);
  }, 3000);
}

function closeFinishOverlay() {
  if (finishOverlay) finishOverlay.classList.remove("show");
  clearFinishFx();
}

function stopRunMotion() {
  gameRunning = false;

  clearInterval(spawnTimer);
  cancelAnimationFrame(animationId);
  clearAllEquationsNow();
  setOperationButtonsDisabled(false);
}

async function finalizeRun(reason, options = {}) {
  const { silent = false, keepalive = false } = options;

  if (finalizing || runSaved || !runStartedOnServer) {
    if (!silent) openRewardIntroThenFinish(reason);
    return;
  }

  finalizing = true;

  stopRunMotion();

  applyRunStarsToNavOnce();

  if (PAGE_CFG.finalizeRunUrl) {
    try {
      const response = await fetch(PAGE_CFG.finalizeRunUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "same-origin",
        keepalive,
        body: buildFinalizePayload(reason),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.ok) {
        runSaved = true;
        runStartedOnServer = false;
        updateResourceCountsFromServer(data, { preventStarDecrease: true });
      }
    } catch (error) {}
  }

  if (!runSaved && keepalive && PAGE_CFG.finalizeRunUrl) {
    sendFinalizeWithKeepaliveOnly(reason);
    runSaved = true;
    runStartedOnServer = false;
  }

  await recordRankingScore();
  saveHighScore();
  updateUI();

  if (!silent) openRewardIntroThenFinish(reason);

  finalizing = false;
}

function sendFinalizeWithKeepaliveOnly(reason) {
  if (!PAGE_CFG.finalizeRunUrl) return;

  const payloadObject = buildFinalizePayloadObject(reason);
  const payload = JSON.stringify(payloadObject);

  try {
    fetch(PAGE_CFG.finalizeRunUrl, {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
        "X-Requested-With": "XMLHttpRequest",
      },
      body: payload,
    }).catch(() => null);
  } catch (error) {
    try {
      const formBody = new URLSearchParams();

      Object.entries(payloadObject).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formBody.append(key, String(value));
        }
      });

      fetch(PAGE_CFG.finalizeRunUrl, {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-CSRFToken": getCookie("csrftoken"),
          "X-Requested-With": "XMLHttpRequest",
        },
        body: formBody.toString(),
      }).catch(() => null);
    } catch (fallbackError) {}
  }
}

function finalizeRunForPageLeaving(reason = "leave") {
  if (!gameRunning || runSaved || finalizing || !runStartedOnServer) return;

  finalizing = true;

  stopRunMotion();

  applyRunStarsToNavOnce();

  runSaved = true;
  runStartedOnServer = false;

  sendFinalizeWithKeepaliveOnly(reason);
}

function armBrowserBackGuard() {
  if (browserBackGuardActive) return;
  if (!window.history || !window.history.pushState) return;

  try {
    window.history.pushState(
      { mathnerRainRunGuard: true },
      "",
      window.location.href
    );
    browserBackGuardActive = true;
  } catch (error) {
    browserBackGuardActive = false;
  }
}

function bindBrowserBackFinalize() {
  if (browserBackHandlerBound) return;

  browserBackHandlerBound = true;

  window.addEventListener("popstate", () => {
    if (
      !browserBackGuardActive ||
      !gameRunning ||
      runSaved ||
      finalizing ||
      browserBackFinalizing
    ) {
      return;
    }

    browserBackFinalizing = true;
    browserBackGuardActive = false;

    finalizeRunForPageLeaving("browser_back");

    setTimeout(() => {
      try {
        window.history.back();
      } catch (error) {
        window.location.href = "/";
      }
    }, 30);
  });

  window.addEventListener("pagehide", () => {
    finalizeRunForPageLeaving("pagehide");
  });

  window.addEventListener("beforeunload", () => {
    finalizeRunForPageLeaving("beforeunload");
  });
}

async function startGame() {
  if (gameRunning) return;

  closeNoKeyOverlay();
  clearInterval(spawnTimer);
  cancelAnimationFrame(animationId);
  clearAllEquationsNow();
  closeFinishOverlay();
  closeRewardIntroOverlay();

  resetLocalRunState();

  if (PAGE_CFG.startRunUrl) {
    try {
      await startRunOnServer();
    } catch (error) {
      const msg = String(error?.message || "").toLowerCase();
      const code = String(error?.code || "").toUpperCase();

      if (
        code === "NO_KEYS" ||
        msg.includes("no key") ||
        msg.includes("no keys") ||
        msg.includes("key") ||
        msg.includes("remaining") ||
        msg.includes("used all")
      ) {
        openNoKeyOverlay();
      }

      return;
    }
  } else {
    if (remainingKeys <= 0) {
      openNoKeyOverlay();
      return;
    }

    remainingKeys -= 1;
    syncNavResources();
  }

  runEarnedStars = 0;
  hearts = 5;
  level = 1;
  cleared = 0;
  wrongCount = 0;
  bestCombo = 0;
  currentCombo = 0;
  lastTimestamp = 0;
  gameRunning = true;
  isLevelIntroShowing = false;
  levelTransitionPending = false;
  runSaved = false;
  finalizing = false;
  rankingRecorded = false;

  armBrowserBackGuard();
  setOperationButtonsDisabled(true);

  if (startOverlay) startOverlay.classList.remove("show");

  updateUI();

  answerInput.value = "";

  if (!isMobileUI()) answerInput.focus();

  showLevelIntro(1, () => {
    if (!gameRunning) return;
    spawnEquation();
    restartSpawnTimer();
  });

  animationId = requestAnimationFrame(gameLoop);
}

async function resetGame() {
  if (gameRunning && runStartedOnServer && !runSaved) {
    await finalizeRun("reset", { silent: false });
    return;
  }

  clearInterval(spawnTimer);
  cancelAnimationFrame(animationId);
  clearAllEquationsNow();
  closeRewardIntroOverlay();
  closeFinishOverlay();
  closeNoKeyOverlay();

  resetLocalRunState();
  setOperationButtonsDisabled(false);

  if (levelIntroEl) levelIntroEl.classList.add("hidden");
  if (startOverlay) startOverlay.classList.add("show");

  updateUI();
}

function endGame() {
  if (!gameRunning) return;

  finalizeRun("game_over");
}

function bindLeaveSettlement() {
  const navLinks = document.querySelectorAll("a[href]");

  navLinks.forEach((link) => {
    link.addEventListener("click", async (e) => {
      if (!gameRunning || runSaved || finalizing) return;
      if (link.target === "_blank") return;

      const href = link.getAttribute("href") || "";

      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

      e.preventDefault();

      await finalizeRun("leave", {
        silent: true,
        keepalive: true,
      });

      window.location.href = href;
    });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden") return;
    finalizeRunForPageLeaving("visibility_hidden");
  });
}

function updateMobileInputMode() {
  if (!answerInput) return;

  if (isMobileUI()) {
    answerInput.readOnly = true;
    answerInput.setAttribute("readonly", "readonly");
    answerInput.setAttribute("inputmode", "none");

    if (mobilePadWrap) mobilePadWrap.setAttribute("aria-hidden", "false");
  } else {
    answerInput.readOnly = false;
    answerInput.removeAttribute("readonly");
    answerInput.setAttribute("inputmode", "numeric");

    if (mobilePadWrap) mobilePadWrap.setAttribute("aria-hidden", "true");
  }
}

function syncMobileButtons() {
  if (mobileStartBtn) {
    mobileStartBtn.disabled = Boolean(startBtn?.disabled);
    mobileStartBtn.textContent = startBtn ? startBtn.textContent : "🚀 시작하기";
  }

  if (mobileResetBtn) {
    mobileResetBtn.disabled = Boolean(resetBtn?.disabled);
  }
}

function updateMobilePadState() {
  if (!mobilePad) return;

  const disabled = !gameRunning || finalizing || !answerInput || answerInput.disabled;

  mobilePad.querySelectorAll("[data-pad]").forEach((btn) => {
    btn.disabled = disabled;
  });
}

function appendAnswerDigit(digit) {
  if (!answerInput || answerInput.disabled || !gameRunning) return;
  if (String(answerInput.value).length >= 4) return;

  answerInput.value = `${answerInput.value}${digit}`;
  updateMobilePadState();
}

function backspaceAnswerDigit() {
  if (!answerInput || answerInput.disabled || !gameRunning) return;

  answerInput.value = String(answerInput.value).slice(0, -1);
  updateMobilePadState();
}

function clearAnswerDigits() {
  if (!answerInput || answerInput.disabled || !gameRunning) return;

  answerInput.value = "";
  updateMobilePadState();
}

function bindMobilePad() {
  if (!mobilePad) return;

  mobilePad.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-pad]");

    if (!btn) return;

    const key = btn.getAttribute("data-pad");

    if (!key) return;

    if (key === "clear") {
      clearAnswerDigits();
      return;
    }

    if (key === "back") {
      backspaceAnswerDigit();
      return;
    }

    appendAnswerDigit(key);
  });

  if (answerInput) {
    answerInput.addEventListener("click", (e) => {
      if (isMobileUI()) {
        e.preventDefault();
        answerInput.blur();
      }
    });

    answerInput.addEventListener("focus", () => {
      if (isMobileUI()) {
        answerInput.blur();
      }
    });
  }
}

opButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    setOperation(btn.dataset.op);
  });
});

if (submitBtn) {
  submitBtn.addEventListener("click", submitAnswer);
}

if (answerInput) {
  answerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitAnswer();
  });
}

if (startBtn) {
  startBtn.addEventListener("click", startGame);
}

if (startOverlayBtn) {
  startOverlayBtn.addEventListener("click", startGame);
}

if (mobileStartBtn) {
  mobileStartBtn.addEventListener("click", startGame);
}

if (restartBtnOverlay) {
  restartBtnOverlay.addEventListener("click", () => {
    closeFinishOverlay();
    closeRewardIntroOverlay();
    startGame();
  });
}

if (resetBtn) {
  resetBtn.addEventListener("click", resetGame);
}

if (mobileResetBtn) {
  mobileResetBtn.addEventListener("click", resetGame);
}

if (finishCloseBtn) {
  finishCloseBtn.addEventListener("click", () => {
    closeFinishOverlay();
  });
}

if (playLaterBtn) {
  playLaterBtn.addEventListener("click", () => {
    closeNoKeyOverlay();
  });
}

if (goPricingBtn) {
  goPricingBtn.setAttribute("href", getPricingUrl());
}

if (openRankingBtn) {
  openRankingBtn.setAttribute("href", getRankingUrl());
}

window.addEventListener("resize", () => {
  updateMobileInputMode();
  syncMobileButtons();
  updateMobilePadState();
});

setOperationButtonsDisabled(false);
setOperation("+");
updateUI();
bindMobilePad();
bindLeaveSettlement();
bindBrowserBackFinalize();