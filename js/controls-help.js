import { KEY_BINDINGS } from "./input.js";

const KEY_DISPLAY = {
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowDown: "↓",
  ArrowUp: "↑",
  " ": "スペース",
};

/** @param {string} key */
function formatKey(key) {
  if (KEY_DISPLAY[key]) return KEY_DISPLAY[key];
  return key.length === 1 ? key.toUpperCase() : key;
}

function buildPlayerTable(playerIndex) {
  const b = KEY_BINDINGS[playerIndex];
  const n = playerIndex + 1;
  return `
    <div class="controls-help-player">
      <h3>プレイヤー ${n}</h3>
      <table class="controls-help-table">
        <tbody>
          <tr><th>左移動</th><td>${formatKey(b.left)}</td></tr>
          <tr><th>右移動</th><td>${formatKey(b.right)}</td></tr>
          <tr><th>高速落下</th><td>${formatKey(b.down)}</td></tr>
          <tr><th>ハードドロップ</th><td>${formatKey(b.up)}</td></tr>
          <tr><th>回転</th><td>${formatKey(b.rotate)}</td></tr>
        </tbody>
      </table>
    </div>
  `;
}

/**
 * @param {boolean} isMobile
 */
export function buildControlsHelpHtml(isMobile) {
  const playerCount = isMobile ? 1 : KEY_BINDINGS.length;
  let playersHtml = "";
  for (let i = 0; i < playerCount; i++) {
    playersHtml += buildPlayerTable(i);
  }

  const gamepadHtml = isMobile
    ? ""
    : `
    <div class="controls-help-block">
      <h3>ゲームパッド（2〜4人プレイ）</h3>
      <table class="controls-help-table">
        <tbody>
          <tr><th>左右移動</th><td>左スティック左右 / 十字キー左右</td></tr>
          <tr><th>高速落下</th><td>左スティック下 / 十字キー下</td></tr>
          <tr><th>ハードドロップ</th><td>左スティック上 / 十字キー上</td></tr>
          <tr><th>回転</th><td>A ボタン（ボタン0）</td></tr>
        </tbody>
      </table>
      <p class="controls-help-note">コントローラー番号 0 がプレイヤー1、1 がプレイヤー2 … に対応します。</p>
    </div>
  `;

  const mobileHtml = isMobile
    ? `
    <div class="controls-help-block">
      <h3>スマホ（ソフトキー）</h3>
      <table class="controls-help-table">
        <tbody>
          <tr><th>左右移動</th><td>◀ / ▶（押し続け可）</td></tr>
          <tr><th>高速落下</th><td>▼（押し続け可）</td></tr>
          <tr><th>ハードドロップ</th><td>一括落下</td></tr>
          <tr><th>回転</th><td>回転</td></tr>
        </tbody>
      </table>
      <p class="controls-help-note">スマホでは1人用のみプレイできます。</p>
    </div>
  `
    : "";

  return `
    <div class="controls-help-block">
      <h3>共通</h3>
      <ul class="controls-help-list">
        <li>左右キーは<strong>押し続けると連続移動</strong>します。</li>
        <li>着地後 <strong>0.2秒間</strong>、左右移動・回転で位置を調整できます。</li>
        <li>ホールド（キープ）機能はありません。</li>
      </ul>
    </div>
    ${playersHtml}
    ${gamepadHtml}
    ${mobileHtml}
  `;
}

const SCROLL_STEP = 72;
const SWIPE_THRESHOLD = 24;

/**
 * @param {{ scrollEl: HTMLElement, contentEl: HTMLElement, isMobile: boolean, onBack: () => void }} options
 */
export function createControlsHelp({ scrollEl, contentEl, isMobile, onBack }) {
  contentEl.innerHTML = buildControlsHelpHtml(isMobile);

  let active = false;
  let touchStartY = 0;
  /** @type {number | null} */
  let gamepadInterval = null;
  const gamepadConsumed = new Set();

  function scrollBy(delta) {
    scrollEl.scrollBy({ top: delta, behavior: "smooth" });
  }

  function handleScrollInput(key) {
    if (key === "ArrowUp") {
      scrollBy(-SCROLL_STEP);
      return true;
    }
    if (key === "ArrowDown") {
      scrollBy(SCROLL_STEP);
      return true;
    }
    return false;
  }

  function onKeyDown(e) {
    if (!active) return;
    if (handleScrollInput(e.key)) {
      e.preventDefault();
      return;
    }
    onBack();
  }

  function onTouchStart(e) {
    if (!active || e.touches.length !== 1) return;
    touchStartY = e.touches[0].clientY;
  }

  function onTouchMove(e) {
    if (!active || e.touches.length !== 1) return;
    const dy = touchStartY - e.touches[0].clientY;
    if (Math.abs(dy) < SWIPE_THRESHOLD) return;
    scrollEl.scrollTop += dy;
    touchStartY = e.touches[0].clientY;
  }

  function pollGamepad() {
    if (!active) return;
    const pads = navigator.getGamepads?.() ?? [];
    for (let i = 0; i < pads.length; i++) {
      const pad = pads[i];
      if (!pad) continue;

      const dpadUp = pad.buttons[12]?.pressed;
      const dpadDown = pad.buttons[13]?.pressed;
      const axisY = pad.axes[1] ?? 0;

      if (dpadUp || axisY < -0.5) {
        if (!gamepadConsumed.has(`${i}-up`)) {
          scrollBy(-SCROLL_STEP);
          gamepadConsumed.add(`${i}-up`);
        }
      } else {
        gamepadConsumed.delete(`${i}-up`);
      }

      if (dpadDown || axisY > 0.5) {
        if (!gamepadConsumed.has(`${i}-down`)) {
          scrollBy(SCROLL_STEP);
          gamepadConsumed.add(`${i}-down`);
        }
      } else {
        gamepadConsumed.delete(`${i}-down`);
      }

      for (let bi = 0; bi < pad.buttons.length; bi++) {
        if (bi === 12 || bi === 13) continue;
        if (pad.buttons[bi]?.pressed) {
          if (!gamepadConsumed.has(`${i}-btn-${bi}`)) {
            gamepadConsumed.add(`${i}-btn-${bi}`);
            onBack();
            return;
          }
        } else {
          gamepadConsumed.delete(`${i}-btn-${bi}`);
        }
      }
    }
  }

  window.addEventListener("keydown", onKeyDown);
  scrollEl.addEventListener("touchstart", onTouchStart, { passive: true });
  scrollEl.addEventListener("touchmove", onTouchMove, { passive: true });

  return {
    show() {
      active = true;
      gamepadConsumed.clear();
      scrollEl.scrollTop = 0;
      if (!gamepadInterval) {
        gamepadInterval = setInterval(pollGamepad, 80);
      }
    },
    hide() {
      active = false;
      gamepadConsumed.clear();
    },
    destroy() {
      this.hide();
      if (gamepadInterval) {
        clearInterval(gamepadInterval);
        gamepadInterval = null;
      }
      window.removeEventListener("keydown", onKeyDown);
      scrollEl.removeEventListener("touchstart", onTouchStart);
      scrollEl.removeEventListener("touchmove", onTouchMove);
    },
  };
}
