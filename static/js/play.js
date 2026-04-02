const PAGE_CFG = window.PLAY_PAGE_CONFIG || {};
const playPageRoot = document.getElementById("playPageRoot");

const GAME_MODES = {
  practice: {
    key: "practice",
    label: "Practice",
    reward: 1,
    desc: "Choose one arithmetic type. Every correct answer gives 1 star.",
    difficulty: "Manual",
  },
  classic: {
    key: "classic",
    label: "Classic",
    reward: 3,
    desc: "Mixed operations, adaptive difficulty, and more wrong-type focused questions.",
    difficulty: "Adaptive",
  },
  challenge: {
    key: "challenge",
    label: "Challenge",
    reward: 3,
    desc: "Harder than Practice. Mixed operations, adaptive, but numbers stay within two digits.",
    difficulty: "Hard Adaptive",
  },
};

const OPERATION_META = {
  add: { label: "Add", sign: "+" },
  sub: { label: "Subtract", sign: "-" },
  mul: { label: "Multiply", sign: "×" },
  div: { label: "Divide", sign: "÷" },
};

const AURA_STATE = {
  idle: "Idle",
  combo: "Wind Rising",
  fever: "Crimson Fever",
  super: "Golden Storm",
};

const leftTitle = document.getElementById("leftTitle");
const leftSub = document.getElementById("leftSub");

const screenSelect = document.getElementById("screenSelect");
const screenSetup = document.getElementById("screenSetup");
const screenPlay = document.getElementById("screenPlay");

const gameModeTiles = document.getElementById("gameModeTiles");
const modeBandSummary = document.getElementById("modeBandSummary");
const modeBandNow = document.getElementById("modeBandNow");
const practiceOperationWrap = document.getElementById("practiceOperationWrap");
const practiceOpSeg = document.getElementById("practiceOpSeg");

const setupRewardText = document.getElementById("setupRewardText");
const setupRuleText = document.getElementById("setupRuleText");
const setupDifficultyText = document.getElementById("setupDifficultyText");
const setupRangeText = document.getElementById("setupRangeText");
const setupHint = document.getElementById("setupHint");

const btnBackToModes = document.getElementById("btnBackToModes");
const btnGoPlay = document.getElementById("btnGoPlay");
const btnBackToSetup = document.getElementById("btnBackToSetup");

const statGameMode = document.getElementById("statGameMode");
const statMode = document.getElementById("statMode");
const statDifficulty = document.getElementById("statDifficulty");
const statStars = document.getElementById("statStars");
const statKeys = document.getElementById("statKeys");
const statAura = document.getElementById("statAura");

const navStarCount = document.getElementById("navStarCount");
const navKeyCount = document.getElementById("navKeyCount");

const timerRing = document.getElementById("timerRing");
const timeLeftEl = document.getElementById("timeLeft");
const playDesc = document.getElementById("playDesc");
const mathText = document.getElementById("mathText");
const answerInput = document.getElementById("answerInput");
const btnSubmit = document.getElementById("btnSubmit");
const btnStart = document.getElementById("btnStart");
const btnReset = document.getElementById("btnReset");

const scoreEl = document.getElementById("score");
const correctEl = document.getElementById("correct");
const earnedStarsEl = document.getElementById("earnedStars");
const comboCountEl = document.getElementById("comboCount");
const hudMode = document.getElementById("hudMode");
const hudOperation = document.getElementById("hudOperation");
const msg = document.getElementById("msg");
const progressFill = document.getElementById("progressFill");

const feverPill = document.getElementById("feverPill");
const feverText = document.getElementById("feverText");
const liveEffects = document.getElementById("liveEffects");

const statusAvatarCanvas = document.getElementById("statusAvatarCanvas");
const statusAvatarGroundAuraImg = document.getElementById("statusAvatarGroundAuraImg");
const statusAvatarBurst = document.getElementById("statusAvatarBurst");

const rewardOverlay = document.getElementById("rewardOverlay");
const rewardTitle = document.getElementById("rewardTitle");
const rewardAmount = document.getElementById("rewardAmount");
const rewardSub = document.getElementById("rewardSub");
const rewardConfetti = document.getElementById("rewardConfetti");

const modal = document.getElementById("modal");
const btnClose = document.getElementById("btnClose");
const btnAgain = document.getElementById("btnAgain");
const rCorrect = document.getElementById("rCorrect");
const rWrong = document.getElementById("rWrong");
const rAcc = document.getElementById("rAcc");
const rStars = document.getElementById("rStars");
const rCombo = document.getElementById("rCombo");
const rMode = document.getElementById("rMode");
const rText = document.getElementById("rText");

const keyExhaustedModal = document.getElementById("keyExhaustedModal");
const btnKeyModalClose = document.getElementById("btnKeyModalClose");
const btnLater = document.getElementById("btnLater");

let totalStars = Number(PAGE_CFG.initialStars || 0);
let remainingKeys = Number(PAGE_CFG.initialKeys || 0);

let selectedGameMode = "practice";
let selectedPracticeOperation = "add";

let running = false;
let timerId = null;
let timeLeft = 60;
let finalizing = false;
let leavingInProgress = false;
let runStartedOnServer = false;
let runSaved = false;

let questionA = 0;
let questionB = 0;
let currentAnswer = 0;
let currentOperation = "add";
let score = 0;
let correct = 0;
let wrong = 0;
let earnedStars = 0;
let asked = 0;
let goal = 25;

let combo = 0;
let bestCombo = 0;

let wrongStats = {
  add: 0,
  sub: 0,
  mul: 0,
  div: 0,
};

let playAvatarData = {
  enabled: false,
  gender: "male",
  hat_image_url: "",
  cloth_image_url: "",
  shoes_image_url: "",
  active_effect: "",
  active_set_code: "",
};

let currentAuraState = "idle";
let auraLandingTimer = null;
let sparkleTimer = null;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function show(screen) {
  [screenSelect, screenSetup, screenPlay].forEach((s) => s.classList.remove("on"));
  screen.classList.add("on");
}

function setMessage(text, type = null) {
  if (!msg) return;
  msg.classList.remove("good", "bad");
  if (type) msg.classList.add(type);
  msg.textContent = text;
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return "";
}

function getModeConfig() {
  return GAME_MODES[selectedGameMode];
}

function getCurrentRewardPerCorrect() {
  return getModeConfig().reward;
}

function renderTopStatus() {
  const stars = Math.max(0, parseInt(totalStars || 0, 10));
  const keys = Math.max(0, parseInt(remainingKeys || 0, 10));

  if (statStars) statStars.textContent = stars;
  if (statKeys) statKeys.textContent = keys;
  if (navStarCount) navStarCount.textContent = stars;
  if (navKeyCount) navKeyCount.textContent = keys;
}

function clearLandingTimer() {
  if (auraLandingTimer) {
    clearTimeout(auraLandingTimer);
    auraLandingTimer = null;
  }
}

function clearSparkleTimer() {
  if (sparkleTimer) {
    clearInterval(sparkleTimer);
    sparkleTimer = null;
  }
}

function createSuperSparkle() {
  if (!statusAvatarCanvas || currentAuraState !== "super") return;

  const sparkle = document.createElement("span");
  sparkle.className = "status-super-sparkle";
  sparkle.style.left = `${30 + Math.random() * 40}%`;
  sparkle.style.top = `${18 + Math.random() * 42}%`;
  sparkle.style.animationDuration = `${0.8 + Math.random() * 0.6}s`;
  sparkle.style.transform = `scale(${0.7 + Math.random() * 0.9})`;
  statusAvatarCanvas.appendChild(sparkle);

  setTimeout(() => {
    sparkle.remove();
  }, 1400);
}

function updateSuperSparkleLoop() {
  clearSparkleTimer();

  if (currentAuraState === "super") {
    createSuperSparkle();
    sparkleTimer = setInterval(() => {
      createSuperSparkle();
    }, 220);
  }
}

function triggerLandingBurst() {
  if (!statusAvatarCanvas || !statusAvatarBurst) return;

  clearLandingTimer();
  statusAvatarCanvas.classList.remove("is-landing");
  statusAvatarBurst.classList.remove("is-active");
  void statusAvatarCanvas.offsetWidth;
  statusAvatarCanvas.classList.add("is-landing");
  statusAvatarBurst.classList.add("is-active");

  auraLandingTimer = setTimeout(() => {
    statusAvatarCanvas.classList.remove("is-landing");
    statusAvatarBurst.classList.remove("is-active");
  }, 950);
}

function applyAuraVisualState(stateKey) {
  if (!statusAvatarCanvas) return;

  statusAvatarCanvas.classList.remove("is-idle", "is-combo", "is-fever", "is-super", "is-awake");
  statusAvatarCanvas.classList.add(`is-${stateKey}`);

  if (stateKey === "fever" || stateKey === "super") {
    statusAvatarCanvas.classList.add("is-awake");
  }

  updateSuperSparkleLoop();
}

function setAuraState(stateKey) {
  let label = AURA_STATE.idle;

  if (stateKey === "combo") {
    label = AURA_STATE.combo;
  } else if (stateKey === "fever") {
    label = AURA_STATE.fever;
  } else if (stateKey === "super") {
    label = AURA_STATE.super;
  }

  if (statAura) statAura.textContent = label;

  const previousState = currentAuraState;
  currentAuraState = stateKey || "idle";

  if ((previousState === "fever" || previousState === "super") && stateKey !== "fever" && stateKey !== "super") {
    triggerLandingBurst();
  }

  applyAuraVisualState(currentAuraState);
}

function stopAuraCompletely() {
  currentAuraState = "idle";
  clearLandingTimer();
  clearSparkleTimer();

  if (statusAvatarCanvas) {
    statusAvatarCanvas.classList.remove("is-combo", "is-fever", "is-super", "is-awake", "is-landing");
    statusAvatarCanvas.classList.add("is-idle", "is-breathing");
    statusAvatarCanvas.querySelectorAll(".status-super-sparkle").forEach((el) => el.remove());
  }

  if (statusAvatarBurst) statusAvatarBurst.classList.remove("is-active");
  if (statAura) statAura.textContent = AURA_STATE.idle;
}

function updateAuraByCombo() {
  if (!running) {
    stopAuraCompletely();
    return;
  }

  if (combo >= 10) {
    setAuraState("super");
  } else if (combo >= 5) {
    setAuraState("fever");
  } else if (combo >= 2) {
    setAuraState("combo");
  } else {
    setAuraState("idle");
  }
}

function renderRight() {
  const modeCfg = getModeConfig();

  if (statGameMode) statGameMode.textContent = modeCfg.label;
  if (statDifficulty) statDifficulty.textContent = modeCfg.difficulty;
  if (statMode) {
    statMode.textContent =
      selectedGameMode === "practice"
        ? OPERATION_META[selectedPracticeOperation].label
        : "Mixed";
  }

  if (hudMode) hudMode.textContent = modeCfg.label;
  if (hudOperation) {
    hudOperation.textContent =
      selectedGameMode === "practice"
        ? OPERATION_META[selectedPracticeOperation].label
        : "Mixed";
  }
}

function renderModeTiles() {
  if (!gameModeTiles) return;
  gameModeTiles.innerHTML = "";

  Object.values(GAME_MODES).forEach((mode) => {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `
      <div class="k">Mode</div>
      <div class="v">${mode.label}</div>
      <div class="sub" style="margin-top:8px">${mode.desc}</div>
      <div class="sub" style="margin-top:10px"><b>${mode.reward} star${mode.reward > 1 ? "s" : ""}</b> per correct answer</div>
    `;
    tile.addEventListener("click", () => {
      selectedGameMode = mode.key;
      goSetupScreen();
    });
    gameModeTiles.appendChild(tile);
  });

  if (modeBandSummary) {
    modeBandSummary.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <span class="modeFlag"><span class="modeMark"></span>New Mode Structure</span>
        <b>Practice / Classic / Challenge</b>
      </div>
      <div class="sub">Classic and Challenge adapt to your mistakes automatically.</div>
    `;
  }
}

function renderPracticeOperations() {
  if (!practiceOpSeg) return;
  practiceOpSeg.innerHTML = "";

  ["add", "sub", "mul", "div"].forEach((key) => {
    const btn = document.createElement("button");
    btn.className = "btn " + (selectedPracticeOperation === key ? "" : "secondary");
    btn.textContent = OPERATION_META[key].label;
    btn.addEventListener("click", () => {
      selectedPracticeOperation = key;
      renderPracticeOperations();
      renderSetupScreen();
      renderRight();
    });
    practiceOpSeg.appendChild(btn);
  });
}

function getSetupSummary() {
  if (selectedGameMode === "practice") {
    return {
      reward: "1 star / correct",
      rule: `${OPERATION_META[selectedPracticeOperation].label} only`,
      difficulty: "Easy → Medium by combo",
      range:
        selectedPracticeOperation === "mul" || selectedPracticeOperation === "div"
          ? "1 ~ 9"
          : "1 ~ 20",
      hint: "Practice lets you focus on one operation. Combo starts the wind effect, Fever awakens the avatar.",
    };
  }

  if (selectedGameMode === "classic") {
    return {
      reward: "3 stars / correct",
      rule: "Mixed operations + mistake-weighted selection",
      difficulty: "Adaptive",
      range: "1-digit → 2-digit progression",
      hint: "Classic automatically mixes + - × ÷ and leans toward the types you miss more often.",
    };
  }

  return {
    reward: "3 stars / correct",
    rule: "Mixed operations + harder adaptive flow",
    difficulty: "Hard Adaptive",
    range: "Always under 100",
    hint: "Challenge stays within two-digit numbers but becomes denser and trickier than Practice.",
  };
}

function renderSetupScreen() {
  const modeCfg = getModeConfig();
  const summary = getSetupSummary();

  if (modeBandNow) {
    modeBandNow.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <span class="modeFlag"><span class="modeMark"></span>${modeCfg.label}</span>
        <b>${modeCfg.reward} star${modeCfg.reward > 1 ? "s" : ""} per correct</b>
      </div>
      <div class="sub">Key is consumed at game start.</div>
    `;
  }

  if (practiceOperationWrap) {
    practiceOperationWrap.style.display = selectedGameMode === "practice" ? "" : "none";
  }

  renderPracticeOperations();

  if (setupRewardText) setupRewardText.textContent = summary.reward;
  if (setupRuleText) setupRuleText.textContent = summary.rule;
  if (setupDifficultyText) setupDifficultyText.textContent = summary.difficulty;
  if (setupRangeText) setupRangeText.textContent = summary.range;
  if (setupHint) setupHint.textContent = summary.hint;
}

function goSetupScreen() {
  if (leftTitle) leftTitle.textContent = "Configure Mode";
  if (leftSub) leftSub.textContent = "Review the rules before starting.";
  renderSetupScreen();
  renderRight();
  show(screenSetup);
}

function goPlayScreen() {
  if (leftTitle) leftTitle.textContent = "Play";
  if (leftSub) leftSub.textContent = "Type your answer quickly.";
  show(screenPlay);

  timeLeft = 60;
  goal = selectedGameMode === "challenge" ? 28 : 25;

  const modeLabel = getModeConfig().label;
  const opLabel =
    selectedGameMode === "practice" ? OPERATION_META[selectedPracticeOperation].label : "Mixed";
  if (playDesc) playDesc.textContent = `${modeLabel} · ${opLabel} · 60s`;

  resetGameUI();
  renderRight();
  renderTopStatus();
}

function updateTimerUI() {
  const total = 60;
  const safeTimeLeft = clamp(Number(timeLeft) || 0, 0, total);
  const pct = clamp(safeTimeLeft / total, 0, 1);
  const deg = Math.floor(pct * 360);

  if (timeLeftEl) timeLeftEl.textContent = String(safeTimeLeft);
  if (timerRing) {
    timerRing.style.background = `conic-gradient(var(--play-good, #36e2a3) ${deg}deg, rgba(255,255,255,.15) 0deg)`;
  }
}

function updateFeverUI() {
  let text = "Fever Ready";
  let active = false;

  if (combo >= 10) {
    text = "GOLD FEVER";
    active = true;
  } else if (combo >= 5) {
    text = "FEVER MODE";
    active = true;
  } else if (combo >= 2) {
    text = `Combo x${combo}`;
  }

  if (feverText) feverText.textContent = text;
  if (feverPill) feverPill.classList.toggle("active", active);
  updateAuraByCombo();
}

function resetGameUI() {
  score = 0;
  correct = 0;
  wrong = 0;
  earnedStars = 0;
  asked = 0;
  combo = 0;
  bestCombo = 0;
  wrongStats = { add: 0, sub: 0, mul: 0, div: 0 };

  runStartedOnServer = false;
  runSaved = false;
  running = false;

  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }

  timeLeft = 60;

  if (scoreEl) scoreEl.textContent = "0";
  if (correctEl) correctEl.textContent = "0";
  if (earnedStarsEl) earnedStarsEl.textContent = "0";
  if (comboCountEl) comboCountEl.textContent = "0";
  if (progressFill) progressFill.style.width = "0%";

  if (mathText) mathText.textContent = "Press start!";
  if (answerInput) {
    answerInput.value = "";
    answerInput.disabled = true;
  }

  if (btnSubmit) btnSubmit.disabled = true;
  if (btnStart) {
    btnStart.disabled = false;
    btnStart.textContent = "Start";
  }

  setMessage("Press start 🙂");
  updateTimerUI();
  stopAuraCompletely();
  updateFeverUI();
}

function weightedRandomOperation() {
  const baseWeights = {
    add: 1,
    sub: 1,
    mul: 1,
    div: 1,
  };

  Object.keys(wrongStats).forEach((key) => {
    baseWeights[key] += wrongStats[key] * 1.35;
  });

  if (selectedGameMode === "challenge") {
    baseWeights.mul += 0.9;
    baseWeights.div += 0.9;
    baseWeights.sub += 0.3;
  }

  const totalWeight = Object.values(baseWeights).reduce((acc, cur) => acc + cur, 0);
  let roll = Math.random() * totalWeight;

  for (const key of Object.keys(baseWeights)) {
    roll -= baseWeights[key];
    if (roll <= 0) return key;
  }

  return "add";
}

function buildAddQuestion(level) {
  if (selectedGameMode === "practice") {
    const max = level <= 1 ? 9 : level === 2 ? 20 : 30;
    const a = randInt(1, max);
    const b = randInt(1, max);
    return { a, b, answer: a + b, op: "add" };
  }

  if (selectedGameMode === "classic") {
    const ranges = [[1, 9], [5, 20], [10, 35], [20, 60]];
    const [min, max] = ranges[clamp(level - 1, 0, ranges.length - 1)];
    const a = randInt(min, max);
    const b = randInt(min, max);
    return { a, b, answer: a + b, op: "add" };
  }

  const ranges = [[8, 25], [12, 35], [20, 49]];
  const [min, max] = ranges[clamp(level - 1, 0, ranges.length - 1)];
  const a = randInt(min, max);
  const b = randInt(min, max);
  return { a, b, answer: a + b, op: "add" };
}

function buildSubQuestion(level) {
  if (selectedGameMode === "practice") {
    const max = level <= 1 ? 10 : level === 2 ? 20 : 30;
    let a = randInt(2, max);
    let b = randInt(1, max - 1);
    if (b > a) [a, b] = [b, a];
    return { a, b, answer: a - b, op: "sub" };
  }

  if (selectedGameMode === "classic") {
    const ranges = [[3, 12], [8, 30], [15, 55], [30, 80]];
    const [min, max] = ranges[clamp(level - 1, 0, ranges.length - 1)];
    let a = randInt(min, max);
    let b = randInt(min - 1 > 1 ? min - 1 : 1, max - 1);
    if (b > a) [a, b] = [b, a];
    if (a === b) a += 1;
    return { a, b, answer: a - b, op: "sub" };
  }

  const ranges = [[10, 35], [20, 60], [30, 90]];
  const [min, max] = ranges[clamp(level - 1, 0, ranges.length - 1)];
  let a = randInt(min, max);
  let b = randInt(1, max - 5);
  if (b > a) [a, b] = [b, a];
  if (a === b) a += 1;
  if (a > 99) a = 99;
  return { a, b, answer: a - b, op: "sub" };
}

function buildMulQuestion(level) {
  if (selectedGameMode === "practice") {
    const max = level <= 1 ? 5 : level === 2 ? 7 : 9;
    const a = randInt(1, max);
    const b = randInt(1, max);
    return { a, b, answer: a * b, op: "mul" };
  }

  if (selectedGameMode === "classic") {
    const ranges = [[2, 5], [2, 7], [3, 9], [4, 9]];
    const [min, max] = ranges[clamp(level - 1, 0, ranges.length - 1)];
    const a = randInt(min, max);
    const b = randInt(min, max);
    return { a, b, answer: a * b, op: "mul" };
  }

  const ranges = [[3, 7], [4, 8], [5, 9]];
  const [min, max] = ranges[clamp(level - 1, 0, ranges.length - 1)];
  const a = randInt(min, max);
  const b = randInt(min, max);
  return { a, b, answer: a * b, op: "mul" };
}

function buildDivQuestion(level) {
  if (selectedGameMode === "practice") {
    const max = level <= 1 ? 5 : level === 2 ? 7 : 9;
    const divisor = randInt(1, max);
    const quotient = randInt(1, max);
    const a = divisor * quotient;
    return { a, b: divisor, answer: quotient, op: "div" };
  }

  if (selectedGameMode === "classic") {
    const ranges = [[2, 5], [2, 7], [3, 9], [4, 9]];
    const [min, max] = ranges[clamp(level - 1, 0, ranges.length - 1)];
    const divisor = randInt(min, max);
    const quotient = randInt(min, max);
    const a = divisor * quotient;
    return { a, b: divisor, answer: quotient, op: "div" };
  }

  const ranges = [[3, 6], [4, 8], [5, 9]];
  const [min, max] = ranges[clamp(level - 1, 0, ranges.length - 1)];
  const divisor = randInt(min, max);
  const quotient = randInt(min, max);
  const a = divisor * quotient;
  return { a, b: divisor, answer: quotient, op: "div" };
}

function getAdaptiveDifficultyLevel() {
  if (selectedGameMode === "practice") {
    if (combo >= 8) return 3;
    if (combo >= 4) return 2;
    return 1;
  }

  if (selectedGameMode === "classic") {
    let level = 1;
    if (correct >= 4) level = 2;
    if (correct >= 9) level = 3;
    if (correct >= 15) level = 4;
    if (combo >= 8) level += 1;
    return clamp(level, 1, 4);
  }

  let level = 1;
  if (correct >= 3) level = 2;
  if (correct >= 8) level = 3;
  if (combo >= 8) level += 1;
  return clamp(level, 1, 3);
}

function nextQuestion() {
  const level = getAdaptiveDifficultyLevel();

  let opKey = "add";
  if (selectedGameMode === "practice") {
    opKey = selectedPracticeOperation;
  } else {
    opKey = weightedRandomOperation();
  }

  let q;
  if (opKey === "add") q = buildAddQuestion(level);
  if (opKey === "sub") q = buildSubQuestion(level);
  if (opKey === "mul") q = buildMulQuestion(level);
  if (opKey === "div") q = buildDivQuestion(level);

  questionA = q.a;
  questionB = q.b;
  currentAnswer = q.answer;
  currentOperation = q.op;

  const sign = OPERATION_META[currentOperation].sign;
  if (mathText) mathText.textContent = `${questionA} ${sign} ${questionB} = ?`;

  const currentOpLabel =
    selectedGameMode === "practice"
      ? OPERATION_META[selectedPracticeOperation].label
      : OPERATION_META[currentOperation].label;

  if (hudOperation) hudOperation.textContent = currentOpLabel;
  if (statMode) statMode.textContent = currentOpLabel;

  if (answerInput) {
    answerInput.value = "";
    answerInput.focus();
  }
}

function getFeverStarBonus(comboCount) {
  if (comboCount >= 10) return 2;
  if (comboCount >= 5) return 1;
  return 0;
}

function createFloatingGain(text) {
  if (!liveEffects) return;
  const el = document.createElement("div");
  el.className = "floatingGain";
  el.textContent = text;
  liveEffects.appendChild(el);
  setTimeout(() => el.remove(), 1400);
}

function createSparkBurst() {
  if (!liveEffects) return;
  for (let i = 0; i < 10; i += 1) {
    const spark = document.createElement("span");
    spark.className = "spark";
    spark.style.left = `${44 + Math.random() * 12}%`;
    spark.style.top = `${42 + Math.random() * 14}%`;
    spark.style.setProperty("--dx", `${(Math.random() - 0.5) * 180}px`);
    spark.style.setProperty("--dy", `${(Math.random() - 0.5) * 140}px`);
    liveEffects.appendChild(spark);
    setTimeout(() => spark.remove(), 900);
  }
}

function burstRewardConfetti() {
  if (!rewardConfetti) return;
  rewardConfetti.innerHTML = "";

  const colors = ["#ffd76a", "#7ea8ff", "#5ce1c2", "#ff7aa8", "#ffffff"];

  for (let i = 0; i < 36; i += 1) {
    const piece = document.createElement("span");
    piece.className = "rewardPiece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = `${2.2 + Math.random() * 1.2}s`;
    rewardConfetti.appendChild(piece);
  }
}

function showRewardOverlay(amount, subtitle) {
  if (!rewardOverlay || !rewardTitle || !rewardAmount || !rewardSub) return;
  rewardTitle.textContent = "Stars Earned";
  rewardAmount.textContent = `+${amount}`;
  rewardSub.textContent = subtitle;
  burstRewardConfetti();
  rewardOverlay.classList.add("show");

  setTimeout(() => {
    rewardOverlay.classList.remove("show");
    if (rewardConfetti) rewardConfetti.innerHTML = "";
  }, 2400);
}

function openKeyExhaustedModal() {
  if (!keyExhaustedModal) return;
  keyExhaustedModal.classList.add("on");
}

function closeKeyExhaustedModal() {
  if (!keyExhaustedModal) return;
  keyExhaustedModal.classList.remove("on");
}

function buildFinalizePayload(reason) {
  return {
    reason,
    earned_stars: earnedStars,
    correct_count: correct,
    wrong_count: wrong,
    score,
    best_combo: bestCombo,
    game_mode: selectedGameMode,
    operation: selectedGameMode === "practice" ? selectedPracticeOperation : "mixed",
  };
}

async function startRunOnServer() {
  const response = await fetch(PAGE_CFG.startRunUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken"),
    },
    body: JSON.stringify({
      game_mode: selectedGameMode,
      operation: selectedGameMode === "practice" ? selectedPracticeOperation : "mixed",
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.message || data.error || "Failed to start run.");
  }

  runStartedOnServer = true;
  remainingKeys = Number(data.remaining_keys ?? remainingKeys);
  totalStars = Number(data.total_stars ?? totalStars);
  renderTopStatus();
}

async function startGame() {
  if (running || finalizing) return;

  if (remainingKeys <= 0) {
    setMessage("No keys left today.", "bad");
    openKeyExhaustedModal();
    return;
  }

  if (btnStart) {
    btnStart.disabled = true;
    btnStart.textContent = "Starting...";
  }

  try {
    await startRunOnServer();
  } catch (error) {
    setMessage(error.message || "Failed to start run.", "bad");
    if (btnStart) {
      btnStart.disabled = false;
      btnStart.textContent = "Start";
    }
    return;
  }

  running = true;
  leavingInProgress = false;
  runSaved = false;

  timeLeft = 60;
  goal = selectedGameMode === "challenge" ? 28 : 25;

  score = 0;
  correct = 0;
  wrong = 0;
  earnedStars = 0;
  asked = 0;
  combo = 0;
  bestCombo = 0;
  wrongStats = { add: 0, sub: 0, mul: 0, div: 0 };

  if (scoreEl) scoreEl.textContent = "0";
  if (correctEl) correctEl.textContent = "0";
  if (earnedStarsEl) earnedStarsEl.textContent = "0";
  if (comboCountEl) comboCountEl.textContent = "0";
  if (progressFill) progressFill.style.width = "0%";

  if (answerInput) answerInput.disabled = false;
  if (btnSubmit) btnSubmit.disabled = false;
  if (btnStart) {
    btnStart.disabled = true;
    btnStart.textContent = "Running";
  }

  updateTimerUI();
  updateFeverUI();
  setMessage("Game started! Build combo to awaken the wind aura.");
  nextQuestion();

  if (timerId) clearInterval(timerId);
  timerId = setInterval(() => {
    const nextTime = clamp(timeLeft - 1, 0, 60);
    timeLeft = nextTime;
    updateTimerUI();

    if (nextTime <= 0) {
      finalizeRun("timeout");
    }
  }, 1000);
}

function submitAnswer() {
  if (!running || finalizing || !answerInput) return;

  const val = answerInput.value.trim();
  if (val === "") {
    setMessage("Type an answer 🙂");
    answerInput.focus();
    return;
  }

  asked += 1;

  if (Number(val) === currentAnswer) {
    correct += 1;
    combo += 1;
    bestCombo = Math.max(bestCombo, combo);

    const baseStarGain = getCurrentRewardPerCorrect();
    const feverStarBonus = getFeverStarBonus(combo);
    const totalStarGain = baseStarGain + feverStarBonus;

    score += 10 + combo;
    earnedStars += totalStarGain;

    let text = `Correct! +${baseStarGain} stars`;
    if (feverStarBonus > 0) text += ` · Fever +${feverStarBonus}`;
    if (combo >= 2) text += ` · Combo x${combo}`;

    setMessage(text, "good");
    createFloatingGain(`+${totalStarGain} ★`);
    createSparkBurst();
  } else {
    wrong += 1;
    wrongStats[currentOperation] += 1;
    combo = 0;
    score = Math.max(0, score - 3);
    setMessage(`Wrong! Correct answer: ${currentAnswer}`, "bad");
  }

  if (scoreEl) scoreEl.textContent = String(score);
  if (correctEl) correctEl.textContent = String(correct);
  if (earnedStarsEl) earnedStarsEl.textContent = String(earnedStars);
  if (comboCountEl) comboCountEl.textContent = String(combo);

  const pct = clamp((asked / goal) * 100, 0, 100);
  if (progressFill) progressFill.style.width = `${pct}%`;

  updateFeverUI();

  if (running) {
    nextQuestion();
  }
}

async function finalizeRun(reason, options = {}) {
  const { silent = false, navigateTo = null } = options;

  if (finalizing || !runStartedOnServer || runSaved) {
    if (navigateTo) window.location.href = navigateTo;
    return;
  }

  finalizing = true;
  running = false;
  timeLeft = clamp(timeLeft, 0, 60);

  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }

  updateTimerUI();
  stopAuraCompletely();

  if (answerInput) answerInput.disabled = true;
  if (btnSubmit) btnSubmit.disabled = true;
  if (btnStart) {
    btnStart.disabled = false;
    btnStart.textContent = "Start";
  }
  if (btnReset) btnReset.disabled = true;

  const total = correct + wrong;
  const acc = total === 0 ? 0 : Math.round((correct / total) * 100);

  try {
    const response = await fetch(PAGE_CFG.finalizeRunUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: JSON.stringify(buildFinalizePayload(reason)),
      keepalive: reason === "leave",
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      if (!silent) setMessage(data.message || data.error || "Failed to save run result.", "bad");
      finalizing = false;
      if (btnReset) btnReset.disabled = false;
      if (navigateTo) window.location.href = navigateTo;
      return;
    }

    runSaved = true;
    runStartedOnServer = false;

    totalStars = Number(data.total_stars ?? totalStars);
    remainingKeys = Number(data.remaining_keys ?? remainingKeys);
    renderTopStatus();

    if (!silent) {
      if (rCorrect) rCorrect.textContent = String(correct);
      if (rWrong) rWrong.textContent = String(wrong);
      if (rAcc) rAcc.textContent = `${acc}%`;
      if (rStars) rStars.textContent = String(earnedStars);
      if (rCombo) rCombo.textContent = String(bestCombo);
      if (rMode) rMode.textContent = getModeConfig().label;

      if (reason === "reset") {
        if (rText) rText.textContent = `Run reset. ${earnedStars} stars saved. 1 key already used.`;
      } else if (reason === "leave") {
        if (rText) rText.textContent = `Run ended because you left the game. ${earnedStars} stars saved.`;
      } else if (reason === "timeout") {
        if (rText) rText.textContent = `Time up. ${earnedStars} stars saved.`;
      } else {
        if (rText) rText.textContent = `Run ended. ${earnedStars} stars saved.`;
      }

      showRewardOverlay(earnedStars, `${earnedStars} stars earned this run`);
      setTimeout(() => {
        if (modal) modal.classList.add("on");
      }, 260);

      resetGameUI();
    }
  } catch (error) {
    if (!silent) setMessage("Network error while saving run.", "bad");
  } finally {
    finalizing = false;
    if (btnReset) btnReset.disabled = false;
    if (navigateTo) window.location.href = navigateTo;
  }
}

function finalizeRunOnUnload() {
  if (!runStartedOnServer || runSaved || leavingInProgress) return;
  leavingInProgress = true;
  running = false;

  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }

  stopAuraCompletely();

  const payload = JSON.stringify(buildFinalizePayload("leave"));

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(PAGE_CFG.finalizeRunUrl, blob);
    } else {
      fetch(PAGE_CFG.finalizeRunUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: payload,
        keepalive: true,
      });
    }
    runSaved = true;
    runStartedOnServer = false;
  } catch (error) {}
}

function closeModal() {
  if (modal) modal.classList.remove("on");
}

function isNavigationElement(el) {
  if (!el) return false;

  const tag = el.tagName ? el.tagName.toLowerCase() : "";
  if (tag === "a") {
    const href = el.getAttribute("href") || "";
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return false;
    return true;
  }

  if (tag === "button") {
    const href = el.getAttribute("data-href");
    return Boolean(href);
  }

  return false;
}

function getNavigationTarget(el) {
  if (!el) return null;
  const tag = el.tagName ? el.tagName.toLowerCase() : "";
  if (tag === "a") return el.href;
  if (tag === "button") return el.getAttribute("data-href");
  return null;
}

function bindLeaveProtection() {
  document.addEventListener("click", async (e) => {
    const navEl = e.target.closest("a, button");
    if (!navEl) return;

    if (navEl.id === "btnStart" || navEl.id === "btnSubmit" || navEl.id === "btnReset") return;
    if (!isNavigationElement(navEl)) return;

    const targetUrl = getNavigationTarget(navEl);
    if (!targetUrl) return;

    if (runStartedOnServer && !runSaved && !finalizing) {
      e.preventDefault();
      e.stopPropagation();
      await finalizeRun("leave", { silent: true, navigateTo: targetUrl });
    }
  });

  window.addEventListener("pagehide", finalizeRunOnUnload);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") finalizeRunOnUnload();
  });
  window.addEventListener("beforeunload", finalizeRunOnUnload);
}

function forceWebp(url) {
  if (!url) return "";
  const cleanUrl = String(url).trim();
  if (!cleanUrl) return "";

  const parts = cleanUrl.split("?");
  const pathOnly = parts[0];
  const query = parts.length > 1 ? `?${parts.slice(1).join("?")}` : "";

  if (/\.webp$/i.test(pathOnly)) return `${pathOnly}${query}`;
  if (/\.(png|jpg|jpeg|gif)$/i.test(pathOnly)) {
    return `${pathOnly.replace(/\.(png|jpg|jpeg|gif)$/i, ".webp")}${query}`;
  }
  return `${pathOnly}${query}`;
}

function avatarBaseSet(gender) {
  if (!playPageRoot) return {};

  if (gender === "female") {
    return {
      body: forceWebp(playPageRoot.dataset.baseBodyFemale || ""),
      head: forceWebp(playPageRoot.dataset.baseHeadFemale || ""),
      rear_hair: forceWebp(playPageRoot.dataset.baseHairBackFemale || ""),
      front_hair: forceWebp(playPageRoot.dataset.baseHairFrontFemale || ""),
      eyes: forceWebp(playPageRoot.dataset.baseEyesFemale || ""),
      eyebrow: forceWebp(playPageRoot.dataset.baseEyebrowFemale || ""),
      mouth: forceWebp(playPageRoot.dataset.baseMouthFemale || ""),
    };
  }

  return {
    body: forceWebp(playPageRoot.dataset.baseBodyMale || ""),
    head: forceWebp(playPageRoot.dataset.baseHeadMale || ""),
    rear_hair: forceWebp(playPageRoot.dataset.baseHairBackMale || ""),
    front_hair: forceWebp(playPageRoot.dataset.baseHairFrontMale || ""),
    eyes: forceWebp(playPageRoot.dataset.baseEyesMale || ""),
    eyebrow: forceWebp(playPageRoot.dataset.baseEyebrowMale || ""),
    mouth: forceWebp(playPageRoot.dataset.baseMouthMale || ""),
  };
}

function createAvatarLayer(src, className, altText = "") {
  if (!src) return null;
  const img = document.createElement("img");
  img.className = `status-avatar-layer ${className}`;
  img.src = forceWebp(src);
  img.alt = altText;
  img.loading = "eager";
  img.decoding = "async";
  return img;
}

function renderStatusAvatar() {
  if (!statusAvatarCanvas) return;

  const oldStack = statusAvatarCanvas.querySelector(".status-avatar-stack");
  if (oldStack) oldStack.remove();

  if (statusAvatarGroundAuraImg && playPageRoot?.dataset.windAuraUrl) {
    statusAvatarGroundAuraImg.src = playPageRoot.dataset.windAuraUrl;
  }

  if (!playAvatarData || !playAvatarData.enabled) {
    stopAuraCompletely();
    return;
  }

  const stack = document.createElement("div");
  stack.className = "status-avatar-stack";

  const gender = playAvatarData.gender || "male";
  const base = avatarBaseSet(gender);

  const bodyLayer = createAvatarLayer(base.body, "status-avatar-layer-body", "Avatar body");
  const rearHairLayer = createAvatarLayer(base.rear_hair, "status-avatar-layer-hair-rear", "Rear hair");
  const clothLayer = playAvatarData.cloth_image_url
    ? createAvatarLayer(playAvatarData.cloth_image_url, "status-avatar-layer-cloth", "Cloth")
    : null;
  const headLayer = createAvatarLayer(base.head, "status-avatar-layer-head", "Avatar head");
  const eyebrowLayer = createAvatarLayer(base.eyebrow, "status-avatar-layer-eyebrow", "Eyebrow");
  const eyesLayer = createAvatarLayer(base.eyes, "status-avatar-layer-eyes", "Eyes");
  const mouthLayer = createAvatarLayer(base.mouth, "status-avatar-layer-mouth", "Mouth");
  const frontHairLayer = createAvatarLayer(base.front_hair, "status-avatar-layer-hair-front", "Front hair");
  const shoesLayer = playAvatarData.shoes_image_url
    ? createAvatarLayer(playAvatarData.shoes_image_url, "status-avatar-layer-shoes", "Shoes")
    : null;
  const hatLayer = playAvatarData.hat_image_url
    ? createAvatarLayer(playAvatarData.hat_image_url, "status-avatar-layer-hat", "Hat")
    : null;

  if (bodyLayer) stack.appendChild(bodyLayer);
  if (shoesLayer) stack.appendChild(shoesLayer);

  const auraLayer = document.createElement("div");
  auraLayer.className = "status-avatar-foot-aura";
  auraLayer.setAttribute("aria-hidden", "true");
  auraLayer.innerHTML = `<img class="status-avatar-foot-aura-img" src="${playPageRoot?.dataset.windAuraUrl || ""}" alt="">`;
  stack.appendChild(auraLayer);

  if (rearHairLayer) stack.appendChild(rearHairLayer);
  if (clothLayer) stack.appendChild(clothLayer);
  if (headLayer) stack.appendChild(headLayer);
  if (eyebrowLayer) stack.appendChild(eyebrowLayer);
  if (eyesLayer) stack.appendChild(eyesLayer);
  if (mouthLayer) stack.appendChild(mouthLayer);
  if (frontHairLayer) stack.appendChild(frontHairLayer);
  if (hatLayer) stack.appendChild(hatLayer);

  statusAvatarCanvas.appendChild(stack);
  stopAuraCompletely();
}

function parsePlayAvatarData() {
  if (!playPageRoot) return;
  try {
    playAvatarData = JSON.parse(playPageRoot.dataset.playAvatarJson || "{}");
  } catch (e) {
    playAvatarData = {
      enabled: false,
      gender: "male",
      hat_image_url: "",
      cloth_image_url: "",
      shoes_image_url: "",
      active_effect: "",
      active_set_code: "",
    };
  }
}

if (btnBackToModes) {
  btnBackToModes.addEventListener("click", () => {
    if (leftTitle) leftTitle.textContent = "Choose Mode";
    if (leftSub) leftSub.textContent = "Pick Practice, Classic, or Challenge.";
    show(screenSelect);
    renderRight();
  });
}

if (btnGoPlay) btnGoPlay.addEventListener("click", goPlayScreen);

if (btnBackToSetup) {
  btnBackToSetup.addEventListener("click", () => {
    if (leftTitle) leftTitle.textContent = "Configure Mode";
    if (leftSub) leftSub.textContent = "Review the rules before starting.";
    show(screenSetup);
  });
}

if (btnStart) btnStart.addEventListener("click", startGame);

if (btnReset) {
  btnReset.addEventListener("click", () => {
    if (runStartedOnServer) {
      finalizeRun("reset");
    } else {
      resetGameUI();
    }
  });
}

if (btnSubmit) btnSubmit.addEventListener("click", submitAnswer);

if (answerInput) {
  answerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitAnswer();
    }
  });
}

if (btnClose) btnClose.addEventListener("click", closeModal);

if (btnAgain) {
  btnAgain.addEventListener("click", () => {
    closeModal();
    goPlayScreen();
  });
}

if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
}

if (btnKeyModalClose) btnKeyModalClose.addEventListener("click", closeKeyExhaustedModal);
if (btnLater) btnLater.addEventListener("click", closeKeyExhaustedModal);

if (keyExhaustedModal) {
  keyExhaustedModal.addEventListener("click", (e) => {
    if (e.target === keyExhaustedModal) closeKeyExhaustedModal();
  });
}

function init() {
  parsePlayAvatarData();
  renderStatusAvatar();
  renderTopStatus();
  renderRight();
  renderModeTiles();
  renderSetupScreen();
  stopAuraCompletely();
  show(screenSelect);
  bindLeaveProtection();
}

init();