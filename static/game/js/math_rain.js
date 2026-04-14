const PAGE_CFG = JSON.parse(
  document.getElementById("math-rain-config")?.textContent || "{}"
);

const gameArea = document.getElementById("gameArea");

const heartsBarEl = document.getElementById("heartsBar");
const levelEl = document.getElementById("level");
const clearedEl = document.getElementById("cleared");
const nextLevelCountEl = document.getElementById("nextLevelCount");
const highScoreEl = document.getElementById("highScore");

const answerInput = document.getElementById("answerInput");
const submitBtn = document.getElementById("submitBtn");

const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const startOverlayBtn = document.getElementById("startOverlayBtn");
const restartBtnOverlay = document.getElementById("restartBtnOverlay");

const startOverlay = document.getElementById("startOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");

const finalClearedEl = document.getElementById("finalCleared");
const finalStarsEl = document.getElementById("finalStars");
const finalLevelEl = document.getElementById("finalLevel");
const finalHighScoreEl = document.getElementById("finalHighScore");

const messageEl = document.getElementById("message");
const starRewardEl = document.getElementById("starReward");
const selectedOpEl = document.getElementById("selectedOp");

const levelIntroEl = document.getElementById("levelIntro");
const levelIntroTextEl = document.getElementById("levelIntroText");

const opButtons = document.querySelectorAll(".op-btn");

const navStarCountEl = document.getElementById("navStarCount");
const navKeyCountEl = document.getElementById("navKeyCount");

const HIGH_SCORE_KEY = "math_rain_high_score_v10";

let selectedOp = "+";

let equations = [];
let totalStars = getInitialNavValue(navStarCountEl, PAGE_CFG.initialStars || 0);
let remainingKeys = getInitialNavValue(navKeyCountEl, PAGE_CFG.initialKeys || 0);
let hearts = 5;
let level = 1;
let cleared = 0;
let runEarnedStars = 0;
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
let leavingPage = false;

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

function saveHighScore() {
  if (cleared > highScore) {
    highScore = cleared;
    localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
  }
}

function showMessage(text, good = true) {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.style.color = good ? "#ffe08d" : "#ff9f9f";
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

function syncNavResources() {
  if (navStarCountEl) navStarCountEl.textContent = String(totalStars);
  if (navKeyCountEl) navKeyCountEl.textContent = String(remainingKeys);
}

function updateUI() {
  if (levelEl) levelEl.textContent = String(level);
  if (clearedEl) clearedEl.textContent = String(cleared);
  if (nextLevelCountEl) nextLevelCountEl.textContent = String(getRemainingToNextLevel());
  if (highScoreEl) highScoreEl.textContent = String(highScore);
  if (starRewardEl) starRewardEl.textContent = String(getBaseReward());
  if (selectedOpEl) selectedOpEl.textContent = selectedOp === "mixed" ? "Mixed" : selectedOp;
  renderHearts();
  syncNavResources();
}

function setOperation(op) {
  if (gameRunning) return;
  selectedOp = op;
  opButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.op === op);
  });
  updateUI();
  showMessage(`Operation selected: ${op === "mixed" ? "Mixed" : op}`);
}

function getLevelTarget(levelNumber) {
  if (levelNumber === 1) return 8;
  if (levelNumber === 2) return 18;
  if (levelNumber === 3) return 30;
  if (levelNumber === 4) return 44;
  return 60 + (levelNumber - 4) * 16;
}

function getRemainingToNextLevel() {
  return Math.max(0, getLevelTarget(level) - cleared);
}

function getBaseReward() {
  if (selectedOp === "mixed") return level >= 3 ? 2 : 1;
  return 1;
}

function getSpawnDelay() {
  if (level >= 5) return 720;
  if (level === 4) return 820;
  if (level === 3) return 930;
  if (level === 2) return 1080;
  return 1280;
}

function getFallSpeed(type = "normal") {
  let speed = 54;
  if (level === 2) speed = 68;
  else if (level === 3) speed = 82;
  else if (level === 4) speed = 96;
  else if (level >= 5) speed = 108;

  if (type === "bomb") speed += 8;
  if (type === "ringwing") speed -= 6;

  return speed + randomInt(-5, 8);
}

function getOperationPool() {
  if (selectedOp === "mixed") return ["+", "-", "*", "/"];
  return [selectedOp];
}

function makeLevelPattern(op) {
  const roll = Math.random();

  if (level === 1) {
    return { kind: "two", size: "one-one", op };
  }

  if (level === 2) {
    if (roll < 0.82) return { kind: "two", size: "one-one", op };
    return { kind: "two", size: "two-one", op };
  }

  if (level === 3) {
    if (roll < 0.65) return { kind: "two", size: "one-one", op };
    if (roll < 0.88) return { kind: "two", size: "two-one", op };
    return { kind: "three", size: "one-one-one", op };
  }

  if (roll < 0.35) return { kind: "two", size: "one-one", op };
  if (roll < 0.60) return { kind: "two", size: "two-one", op };
  if (roll < 0.78) return { kind: "three", size: "one-one-one", op };
  return { kind: "two", size: "two-two", op };
}

function randOneDigit() {
  return randomInt(1, 9);
}

function randTwoDigit() {
  return randomInt(10, 49);
}

function buildTwoTermQuestion(op, size) {
  let a = 1;
  let b = 1;

  if (size === "one-one") {
    a = randOneDigit();
    b = randOneDigit();
  } else if (size === "two-one") {
    a = randTwoDigit();
    b = randOneDigit();
  } else {
    a = randTwoDigit();
    b = randTwoDigit();
  }

  if (op === "+") {
    return { text: `${a}+${b}`, answer: a + b };
  }

  if (op === "-") {
    if (b > a) [a, b] = [b, a];
    if (a === b) a += 1;
    return { text: `${a}-${b}`, answer: a - b };
  }

  if (op === "*") {
    if (size === "two-two") {
      a = randomInt(10, 15);
      b = randomInt(10, 15);
    } else if (size === "two-one") {
      a = randomInt(10, 19);
      b = randomInt(2, 9);
    } else {
      a = randomInt(2, 9);
      b = randomInt(2, 9);
    }
    return { text: `${a}×${b}`, answer: a * b };
  }

  let divisor = 2;
  let quotient = 2;
  if (size === "two-two") {
    divisor = randomInt(10, 15);
    quotient = randomInt(2, 5);
  } else if (size === "two-one") {
    divisor = randomInt(2, 9);
    quotient = randomInt(10, 19);
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

  if (op === "+") {
    return { text: `${a}+${b}+${c}`, answer: a + b + c };
  }
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

  return {
    type: "normal",
    text: built.text,
    answer: built.answer
  };
}

function buildBomb() {
  const base = buildNormalEquation();
  return {
    type: "bomb",
    text: `💣 ${base.text}`,
    answer: base.answer
  };
}

function buildRingWing() {
  const base = buildNormalEquation();
  return {
    type: "ringwing",
    text: `${base.text}`,
    answer: base.answer
  };
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

  const widthGuess = data.type === "ringwing" ? 138 : data.type === "bomb" ? 128 : 110;
  const left = randomInt(12, Math.max(12, gameArea.clientWidth - widthGuess - 12));

  el.style.left = `${left}px`;
  el.style.top = `-18px`;

  gameArea.appendChild(el);

  equations.push({
    ...data,
    el,
    x: left,
    y: -18,
    height: 50,
    speed: getFallSpeed(data.type)
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
  if (levelIntroTextEl) levelIntroTextEl.textContent = `LEVEL ${levelNumber}`;
  if (levelIntroEl) levelIntroEl.classList.remove("hidden");

  setTimeout(() => {
    if (levelIntroEl) levelIntroEl.classList.add("hidden");
    isLevelIntroShowing = false;
    if (callback) callback();
  }, 1100);
}

function maybeQueueLevelTransition() {
  if (levelTransitionPending) return;
  if (cleared >= getLevelTarget(level)) {
    levelTransitionPending = true;
    clearInterval(spawnTimer);
    showMessage(`Level ${level} complete! Clear the screen...`);
    updateUI();
  }
}

function maybeStartPendingLevel() {
  if (!levelTransitionPending || equations.length > 0 || !gameRunning) return;

  level += 1;
  levelTransitionPending = false;
  updateUI();
  showMessage(`Welcome to Level ${level}!`);

  showLevelIntro(level, () => {
    if (!gameRunning) return;
    spawnEquation();
    restartSpawnTimer();
  });
}

function getRewardForHit() {
  return getBaseReward();
}

function rewardCurrentHit(item) {
  const reward = getRewardForHit();
  runEarnedStars += reward;
  cleared += 1;
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
  showMessage("Correct!");

  setTimeout(() => {
    if (item.el && item.el.parentNode) item.el.remove();
    maybeStartPendingLevel();
  }, 180);
}

function handleCorrectRingWing(item) {
  removeEquationByRef(item);
  item.el.classList.add("hit");
  gameArea.appendChild(item.el);
  showFloatText("MAGIC CLEAR!", item.x - 4, item.y, "ring");

  setTimeout(() => {
    if (item.el && item.el.parentNode) item.el.remove();
    clearAllCurrentEquations();
  }, 120);

  showMessage("Angel clear! All current blocks removed.");
}

function handleCorrectBomb(item) {
  removeEquationByRef(item);
  item.el.classList.add("hit");
  gameArea.appendChild(item.el);

  hearts = Math.max(0, hearts - 1);
  showFloatText("-1 ♥", item.x + 8, item.y, "bad");
  showMessage("Bomb hit! -1 heart.", false);
  updateUI();

  setTimeout(() => {
    if (item.el && item.el.parentNode) item.el.remove();
    maybeStartPendingLevel();
    if (hearts <= 0) endGame();
  }, 180);
}

function submitAnswer() {
  if (!gameRunning || isLevelIntroShowing) {
    showMessage("Wait a moment.", false);
    return;
  }

  const raw = answerInput.value.trim();
  if (!raw) {
    showMessage("Type an answer.", false);
    return;
  }

  const value = Number(raw);
  if (Number.isNaN(value)) {
    showMessage("Invalid answer.", false);
    return;
  }

  const item = equations.find((eq) => eq.answer === value);

  if (!item) {
    showMessage("No matching answer on screen.", false);
    answerInput.value = "";
    answerInput.focus();
    return;
  }

  if (item.type === "ringwing") handleCorrectRingWing(item);
  else if (item.type === "bomb") handleCorrectBomb(item);
  else handleCorrectNormal(item);

  answerInput.value = "";
  answerInput.focus();
}

function handleGroundHit(item) {
  if (!gameRunning) return;

  removeEquationByRef(item);
  item.el.classList.add("miss");
  gameArea.appendChild(item.el);

  if (item.type === "bomb") {
    showMessage("Bomb disappeared. No damage.");
  } else if (item.type === "ringwing") {
    hearts = Math.max(0, hearts - 1);
    showFloatText("-1 ♥", item.x + 12, item.y, "bad");
    showMessage("Angel escaped! -1 heart.", false);
  } else {
    hearts = Math.max(0, hearts - 1);
    showFloatText("-1 ♥", item.x + 12, item.y, "bad");
    showMessage("Missed one! -1 heart.", false);
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
    const groundY = gameArea.clientHeight - 78;

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
      operation: currentOperationKey(),
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.message || data.error || "Failed to start run.");
  }

  runStartedOnServer = true;
  remainingKeys = Number(data.remaining_keys ?? remainingKeys);
  totalStars = Number(data.total_stars ?? totalStars);
  syncNavResources();
}

function buildFinalizePayload(reason) {
  return JSON.stringify({
    reason,
    earned_stars: runEarnedStars,
    gained_stars: runEarnedStars,
    correct_count: cleared,
    correct: cleared,
    score: cleared,
    game_mode: "math_rain",
    operation: currentOperationKey(),
  });
}

async function finalizeRun(reason, options = {}) {
  const { silent = false, keepalive = false } = options;

  if (finalizing || runSaved || !runStartedOnServer) {
    if (!silent && gameOverOverlay && reason === "game_over") {
      if (finalClearedEl) finalClearedEl.textContent = String(cleared);
      if (finalStarsEl) finalStarsEl.textContent = String(runEarnedStars);
      if (finalLevelEl) finalLevelEl.textContent = String(level);
      if (finalHighScoreEl) finalHighScoreEl.textContent = String(highScore);
      gameOverOverlay.classList.add("show");
    }
    return;
  }

  finalizing = true;
  gameRunning = false;

  clearInterval(spawnTimer);
  cancelAnimationFrame(animationId);
  clearAllEquationsNow();
  setOperationButtonsDisabled(false);

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

      const data = await response.json();
      if (response.ok && data.ok) {
        runSaved = true;
        runStartedOnServer = false;
        remainingKeys = Number(data.remaining_keys ?? remainingKeys);
        totalStars = Number(data.total_stars ?? totalStars);
      }
    } catch (error) {}
  }

  if (!runSaved && keepalive && navigator.sendBeacon && PAGE_CFG.finalizeRunUrl) {
    try {
      const blob = new Blob([buildFinalizePayload(reason)], {
        type: "application/json"
      });
      const sent = navigator.sendBeacon(PAGE_CFG.finalizeRunUrl, blob);
      if (sent) {
        runSaved = true;
        runStartedOnServer = false;
      }
    } catch (error) {}
  }


  saveHighScore();
  updateUI();

  if (!silent) {
    if (finalClearedEl) finalClearedEl.textContent = String(cleared);
    if (finalStarsEl) finalStarsEl.textContent = String(runEarnedStars);
    if (finalLevelEl) finalLevelEl.textContent = String(level);
    if (finalHighScoreEl) finalHighScoreEl.textContent = String(highScore);

    if (reason === "game_over" && gameOverOverlay) {
      gameOverOverlay.classList.add("show");
      showMessage("Game over.", false);
    } else if (reason === "reset") {
      showMessage("Run settled and reset.", true);
    }
  }

  finalizing = false;
}

async function startGame() {
  if (gameRunning) return;

  if (remainingKeys <= 0 && !PAGE_CFG.startRunUrl) {
    showMessage("No keys left.", false);
    return;
  }

  clearInterval(spawnTimer);
  cancelAnimationFrame(animationId);
  clearAllEquationsNow();

  if (PAGE_CFG.startRunUrl) {
    try {
      await startRunOnServer();
    } catch (error) {
      showMessage(error.message || "Failed to start.", false);
      return;
    }
  } else {
    if (remainingKeys <= 0) {
      showMessage("No keys left.", false);
      return;
    }
    remainingKeys -= 1;
    syncNavResources();
  }

  runEarnedStars = 0;
  hearts = 5;
  level = 1;
  cleared = 0;
  lastTimestamp = 0;
  gameRunning = true;
  isLevelIntroShowing = false;
  levelTransitionPending = false;
  runSaved = false;
  finalizing = false;

  setOperationButtonsDisabled(true);

  if (startOverlay) startOverlay.classList.remove("show");
  if (gameOverOverlay) gameOverOverlay.classList.remove("show");

  updateUI();
  answerInput.value = "";
  answerInput.focus();

  showLevelIntro(1, () => {
    if (!gameRunning) return;
    spawnEquation();
    restartSpawnTimer();
  });

  animationId = requestAnimationFrame(gameLoop);
  showMessage("Game started!");
}

async function resetGame() {
  if (gameRunning && runStartedOnServer && !runSaved) {
    await finalizeRun("reset", { silent: true });
  }

  clearInterval(spawnTimer);
  cancelAnimationFrame(animationId);
  clearAllEquationsNow();

  hearts = 5;
  level = 1;
  cleared = 0;
  runEarnedStars = 0;
  gameRunning = false;
  lastTimestamp = 0;
  isLevelIntroShowing = false;
  levelTransitionPending = false;
  finalizing = false;

  setOperationButtonsDisabled(false);

  if (levelIntroEl) levelIntroEl.classList.add("hidden");
  if (startOverlay) startOverlay.classList.add("show");
  if (gameOverOverlay) gameOverOverlay.classList.remove("show");

  updateUI();
  showMessage("Ready.");
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
      leavingPage = true;
      await finalizeRun("leave", { silent: true, keepalive: true });
      window.location.href = href;
    });
  });

  window.addEventListener("pagehide", () => {
    if (!gameRunning || runSaved || finalizing) return;
    finalizeRun("leave", { silent: true, keepalive: true });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden") return;
    if (!gameRunning || runSaved || finalizing) return;
    finalizeRun("leave", { silent: true, keepalive: true });
  });

  window.addEventListener("beforeunload", () => {
    if (!gameRunning || runSaved || finalizing) return;
    finalizeRun("leave", { silent: true, keepalive: true });
  });
}

opButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    setOperation(btn.dataset.op);
  });
});

submitBtn.addEventListener("click", submitAnswer);

answerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitAnswer();
});

startBtn.addEventListener("click", startGame);
startOverlayBtn.addEventListener("click", startGame);
restartBtnOverlay.addEventListener("click", startGame);
resetBtn.addEventListener("click", resetGame);

setOperationButtonsDisabled(false);
setOperation("+");
updateUI();
bindLeaveSettlement();