import { GameSession } from "./game.js";
import { SUB_MODE } from "./modes.js";
import { TIME_ATTACK_LIMIT_SEC, BATTLE_LIMIT_SEC } from "./constants.js";

const screens = {
  title: document.getElementById("screen-title"),
  game: document.getElementById("screen-game"),
  result: document.getElementById("screen-result"),
};

const subModeSection = document.getElementById("sub-mode-section");
const subModeHint = document.getElementById("sub-mode-hint");
const subModeButtons = document.getElementById("sub-mode-buttons");
const mainModeButtons = document.getElementById("main-mode-buttons");
const gameBoards = document.getElementById("game-boards");
const gameModeLabel = document.getElementById("game-mode-label");
const gameTimer = document.getElementById("game-timer");
const resultList = document.getElementById("result-list");

const MODE_NAMES = {
  [SUB_MODE.TIME_ATTACK]: "タイムアタック",
  [SUB_MODE.BATTLE]: "対戦モード",
  [SUB_MODE.SUDDEN_DEATH]: "サドンデス",
};

/** @param {number} playerCount */
function getSubModesForPlayers(playerCount) {
  const modes = [{ id: SUB_MODE.TIME_ATTACK, label: "タイムアタック" }];
  if (playerCount >= 2) {
    modes.push({ id: SUB_MODE.BATTLE, label: "対戦モード" });
  }
  if (playerCount <= 3) {
    modes.push({ id: SUB_MODE.SUDDEN_DEATH, label: "サドンデス" });
  }
  return modes;
}

let selectedPlayers = 1;
let selectedSubMode = SUB_MODE.TIME_ATTACK;
let session = null;
let timerInterval = null;

function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.remove("active"));
  screens[name].classList.add("active");
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function renderSubModeButtons(playerCount) {
  subModeButtons.innerHTML = "";
  for (const mode of getSubModesForPlayers(playerCount)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn sub-mode-btn";
    btn.dataset.subMode = mode.id;
    btn.textContent = mode.label;
    btn.addEventListener("click", () => {
      selectedSubMode = mode.id;
      startGame(selectedPlayers, selectedSubMode);
      resetTitleSubMode();
    });
    subModeButtons.appendChild(btn);
  }
}

function showSubModeSelection(playerCount) {
  subModeHint.textContent = `${playerCount}人プレイのサブモードを選んでください`;
  renderSubModeButtons(playerCount);
  subModeSection.classList.remove("hidden");
  document
    .querySelector("#screen-title .mode-section:first-of-type")
    .classList.add("hidden");
}

function startGame(playerCount, subMode) {
  if (session) {
    session.unmount();
    session = null;
  }
  clearInterval(timerInterval);
  document.getElementById("time-up-overlay")?.classList.remove("active");

  gameModeLabel.textContent = `${playerCount}人プレイ / ${MODE_NAMES[subMode]}`;

  const limitSec =
    subMode === SUB_MODE.TIME_ATTACK
      ? TIME_ATTACK_LIMIT_SEC
      : subMode === SUB_MODE.BATTLE
        ? BATTLE_LIMIT_SEC
        : null;

  if (limitSec != null) {
    gameTimer.classList.remove("hidden");
    gameTimer.textContent = formatTime(limitSec);
  } else {
    gameTimer.classList.add("hidden");
  }

  showScreen("game");

  session = new GameSession({
    playerCount,
    subMode,
    onEnd: showResults,
  });
  session.mount(gameBoards);

  if (limitSec != null) {
    timerInterval = setInterval(() => {
      const rem = session?.getRemainingTimeSec();
      if (rem != null) gameTimer.textContent = formatTime(rem);
    }, 200);
  }
}

function showResults(results) {
  clearInterval(timerInterval);
  session?.unmount();
  session = null;

  resultList.innerHTML = "";
  for (const p of results.players) {
    const card = document.createElement("div");
    card.className = `result-card rank-${p.rank}`;
    const scoreLine =
      results.subMode === SUB_MODE.TIME_ATTACK
        ? `<div class="result-detail">スコア: ${p.score} 点</div>`
        : "";
    card.innerHTML = `
      <div class="result-rank">${p.rank}</div>
      <div class="result-name">${p.name}</div>
      <div class="result-detail">プレイ時間: ${formatTime(results.playTimeSec)}</div>
      <div class="result-detail">消したラインの総数: ${p.linesCleared} 行</div>
      ${scoreLine}
    `;
    resultList.appendChild(card);
  }

  showScreen("result");
}

mainModeButtons.addEventListener("click", (e) => {
  const btn = e.target.closest(".mode-btn");
  if (!btn) return;
  selectedPlayers = parseInt(btn.dataset.players, 10);
  showSubModeSelection(selectedPlayers);
});

document.getElementById("back-to-main").addEventListener("click", resetTitleSubMode);

function resetTitleSubMode() {
  subModeSection.classList.add("hidden");
  document
    .querySelector("#screen-title .mode-section:first-of-type")
    .classList.remove("hidden");
}

document.getElementById("btn-back-title").addEventListener("click", () => {
  resetTitleSubMode();
  showScreen("title");
});
