import { GameSession } from "./game.js";
import { SUB_MODE } from "./modes.js";
import { TIME_ATTACK_LIMIT_SEC, BATTLE_LIMIT_SEC } from "./constants.js";
import { isMobileDevice } from "./device.js";
import { startFinishMusic, stopFinishMusic } from "./audio.js";
import { createControlsHelp } from "./controls-help.js";

const IS_MOBILE = isMobileDevice();

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
const gameEndOverlay = document.getElementById("game-end-overlay");
const gameEndTitle = document.getElementById("game-end-title");
const titleMainSection = document.getElementById("title-main-section");
const controlsHelpSection = document.getElementById("controls-help-section");
const controlsHelpScroll = document.getElementById("controls-help-scroll");
const controlsHelpContent = document.getElementById("controls-help-content");

const controlsHelp = createControlsHelp({
  scrollEl: controlsHelpScroll,
  contentEl: controlsHelpContent,
  isMobile: IS_MOBILE,
  onBack: hideControlsHelp,
});

const MODE_NAMES = {
  [SUB_MODE.TIME_ATTACK]: "タイムアタック",
  [SUB_MODE.BATTLE]: "対戦モード",
  [SUB_MODE.SUDDEN_DEATH]: "サドンデス",
};

/** @param {number} playerCount */
function getSubModesForPlayers(playerCount) {
  const modes = [{ id: SUB_MODE.TIME_ATTACK, label: "タイムアタック" }];
  if (!IS_MOBILE && playerCount >= 2) {
    modes.push({ id: SUB_MODE.BATTLE, label: "対戦モード" });
  }
  if (playerCount <= 4) {
    modes.push({ id: SUB_MODE.SUDDEN_DEATH, label: "サドンデス" });
  }
  return modes;
}

let selectedPlayers = 1;
let selectedSubMode = SUB_MODE.TIME_ATTACK;
let session = null;
let timerInterval = null;
/** @type {(() => void) | null} */
let gameEndCleanup = null;
/** @type {object | null} */
let pendingResults = null;

function setupMobileUi() {
  if (!IS_MOBILE) return;
  document.body.classList.add("is-mobile");
  document.querySelectorAll(".mode-btn[data-players]:not([data-players='1'])").forEach((btn) => {
    btn.classList.add("hidden");
  });
  const mobileHint = document.getElementById("mobile-mode-hint");
  if (mobileHint) mobileHint.classList.remove("hidden");
}

setupMobileUi();

function showScreen(name) {
  Object.values(screens).forEach((el) => el.classList.remove("active"));
  screens[name].classList.add("active");
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function hideGameEndOverlay() {
  stopFinishMusic();
  gameEndCleanup?.();
  gameEndCleanup = null;
  pendingResults = null;
  gameEndOverlay?.classList.add("hidden");
  gameEndOverlay?.classList.remove("active");
  document.querySelectorAll(".player-panel.winner").forEach((el) => {
    el.classList.remove("winner");
  });
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

function showControlsHelp() {
  titleMainSection?.classList.add("hidden");
  subModeSection.classList.add("hidden");
  controlsHelpSection?.classList.remove("hidden");
  controlsHelp.show();
}

function hideControlsHelp() {
  controlsHelp.hide();
  controlsHelpSection?.classList.add("hidden");
  titleMainSection?.classList.remove("hidden");
}

function showSubModeSelection(playerCount) {
  hideControlsHelp();
  subModeHint.textContent = `${playerCount}人プレイのサブモードを選んでください`;
  renderSubModeButtons(playerCount);
  subModeSection.classList.remove("hidden");
  titleMainSection?.classList.add("hidden");
}

function startGame(playerCount, subMode) {
  if (session) {
    session.unmount();
    session = null;
  }
  clearInterval(timerInterval);
  hideGameEndOverlay();
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
    onEnd: showGameEndOverlay,
    useTouchControls: IS_MOBILE,
  });
  session.mount(gameBoards);

  if (limitSec != null) {
    timerInterval = setInterval(() => {
      const rem = session?.getRemainingTimeSec();
      if (rem != null) gameTimer.textContent = formatTime(rem);
    }, 200);
  }
}

function showGameEndOverlay(results) {
  clearInterval(timerInterval);
  pendingResults = results;

  const isSinglePlayer = results.playerCount === 1;
  if (isSinglePlayer) {
    gameEndTitle.textContent = "GAME OVER";
    gameEndTitle.classList.add("is-game-over");
  } else {
    const winner = results.players[0];
    gameEndTitle.textContent = `${winner.name} Win`;
    gameEndTitle.classList.remove("is-game-over");
    const panel = document.querySelector(
      `.player-panel[data-player="${winner.index}"]`
    );
    panel?.classList.add("winner");
  }

  document.getElementById("touch-controls")?.classList.add("hidden");
  gameEndOverlay?.classList.remove("hidden");
  gameEndOverlay?.classList.add("active");
  startFinishMusic();

  let advanced = false;

  const advance = () => {
    if (advanced) return;
    advanced = true;
    const data = pendingResults;
    hideGameEndOverlay();
    if (data) showResults(data);
  };

  const onKeyDown = () => advance();
  const onPointerDown = () => advance();

  const gamepadInterval = setInterval(() => {
    const pads = navigator.getGamepads?.() ?? [];
    for (const pad of pads) {
      if (!pad) continue;
      for (const btn of pad.buttons) {
        if (btn.pressed) {
          advance();
          return;
        }
      }
    }
  }, 100);

  window.addEventListener("keydown", onKeyDown);
  gameEndOverlay?.addEventListener("pointerdown", onPointerDown);

  gameEndCleanup = () => {
    window.removeEventListener("keydown", onKeyDown);
    gameEndOverlay?.removeEventListener("pointerdown", onPointerDown);
    clearInterval(gamepadInterval);
  };
}

function showResults(results) {
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
  if (IS_MOBILE && btn.dataset.players !== "1") return;
  selectedPlayers = parseInt(btn.dataset.players, 10);
  showSubModeSelection(selectedPlayers);
});

document.getElementById("back-to-main").addEventListener("click", resetTitleSubMode);

function resetTitleSubMode() {
  hideControlsHelp();
  subModeSection.classList.add("hidden");
  titleMainSection?.classList.remove("hidden");
}

document.getElementById("btn-show-controls")?.addEventListener("click", showControlsHelp);
document.getElementById("back-from-controls")?.addEventListener("click", hideControlsHelp);

document.getElementById("btn-back-title").addEventListener("click", () => {
  hideGameEndOverlay();
  resetTitleSubMode();
  showScreen("title");
});
