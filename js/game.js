import {
  TIME_ATTACK_LIMIT_SEC,
  BATTLE_LIMIT_SEC,
  TIME_UP_DISPLAY_MS,
  LOCK_DELAY_MS,
} from "./constants.js";
import { SUB_MODE, applyLineClear } from "./modes.js";
import {
  createPlayer,
  spawnPiece,
  tryMove,
  tryRotate,
  softDrop,
  hardDrop,
  canMoveDown,
  lockCurrentPiece,
  updateDropSpeed,
  finishLineClearAnim,
  tickLineClearAnim,
  isInputLocked,
} from "./player.js";
import { COLS, ROWS } from "./constants.js";
import {
  drawBoard,
  drawNext,
  setupCanvas,
  CELL_SIZE,
  NEXT_CELL_SIZE,
  NEXT_COLS,
  NEXT_ROWS,
  computeMobileCellSizes,
} from "./render.js";
import { createInputManager } from "./input.js";

export class GameSession {
  constructor({ playerCount, subMode, onEnd, useTouchControls = false }) {
    this.playerCount = playerCount;
    this.subMode = subMode;
    this.onEnd = onEnd;
    this.useTouchControls = useTouchControls && playerCount === 1;
    this.players = Array.from({ length: playerCount }, (_, i) =>
      createPlayer(i)
    );
    this.running = false;
    this.phase = "playing";
    this.timeUpElapsed = 0;
    this.elapsedMs = 0;
    this.timeLimitMs = this.getTimeLimitMs(subMode);
    this.rafId = null;
    this.lastTs = 0;
    this.input = null;
    this.dom = {};
    this.cellSize = CELL_SIZE;
    this.nextCellSize = NEXT_CELL_SIZE;
    this._onViewportResize = null;
  }

  getTimeLimitMs(subMode) {
    if (subMode === SUB_MODE.TIME_ATTACK) {
      return TIME_ATTACK_LIMIT_SEC * 1000;
    }
    if (subMode === SUB_MODE.BATTLE) {
      return BATTLE_LIMIT_SEC * 1000;
    }
    return null;
  }

  applyMobileCellSizes() {
    const { cellSize, nextCellSize } = computeMobileCellSizes();
    if (
      cellSize === this.cellSize &&
      nextCellSize === this.nextCellSize
    ) {
      return;
    }
    this.cellSize = cellSize;
    this.nextCellSize = nextCellSize;
    for (let i = 0; i < this.playerCount; i++) {
      const { canvas } = this.dom.canvases[i];
      setupCanvas(canvas, COLS, ROWS, this.cellSize);
      const { canvas: nextCanvas } = this.dom.nextCanvases[i];
      setupCanvas(nextCanvas, NEXT_COLS, NEXT_ROWS, this.nextCellSize);
    }
  }

  mount(container) {
    container.innerHTML = "";
    this.dom.panels = [];
    this.dom.canvases = [];
    this.dom.nextCanvases = [];
    this.dom.stats = [];
    this.cellSize = CELL_SIZE;
    this.nextCellSize = NEXT_CELL_SIZE;

    const touchControlsEl = document.getElementById("touch-controls");
    if (this.useTouchControls) {
      touchControlsEl?.classList.remove("hidden");
      document.getElementById("controls-hint-desktop")?.classList.add("hidden");
      document.getElementById("controls-hint-touch")?.classList.add("hidden");
      const sizes = computeMobileCellSizes();
      this.cellSize = sizes.cellSize;
      this.nextCellSize = sizes.nextCellSize;
    }

    for (let i = 0; i < this.playerCount; i++) {
      const panel = document.createElement("div");
      panel.className = "player-panel";
      panel.dataset.player = String(i);

      const label = document.createElement("div");
      label.className = "player-label";
      label.textContent = `プレイヤー ${i + 1}`;

      const stats = document.createElement("div");
      stats.className = "player-stats";
      stats.innerHTML = `<span class="stat-score">SCORE: 0</span><span class="stat-lines">LINES: 0</span>`;

      const wrap = document.createElement("div");
      wrap.className = "player-canvas-wrap";

      const main = document.createElement("canvas");
      main.className = "canvas-main";
      const mainCtx = setupCanvas(main, COLS, ROWS, this.cellSize);

      const nextWrap = document.createElement("div");
      const nextLabel = document.createElement("div");
      nextLabel.className = "next-label";
      nextLabel.textContent = "NEXT";
      const next = document.createElement("canvas");
      next.className = "canvas-next";
      const nextCtx = setupCanvas(next, NEXT_COLS, NEXT_ROWS, this.nextCellSize);
      nextWrap.append(nextLabel, next);

      wrap.append(main, nextWrap);
      panel.append(label, stats, wrap);
      container.appendChild(panel);

      this.dom.panels.push(panel);
      this.dom.canvases.push({ canvas: main, ctx: mainCtx });
      this.dom.nextCanvases.push({ canvas: next, ctx: nextCtx });
      this.dom.stats.push(stats);
    }

    this.dom.timeUpOverlay = document.getElementById("time-up-overlay");

    for (const p of this.players) {
      spawnPiece(p);
    }

    if (this.useTouchControls) {
      this._onViewportResize = () => {
        if (!this.running) return;
        this.applyMobileCellSizes();
        this.render();
      };
      window.visualViewport?.addEventListener("resize", this._onViewportResize);
      window.addEventListener("orientationchange", this._onViewportResize);
      requestAnimationFrame(() => {
        if (!this.running) return;
        this.applyMobileCellSizes();
        this.render();
      });
    }

    this.input = createInputManager(this.playerCount, this.createInputCallbacks(), {
      touchControlsEl: this.useTouchControls ? touchControlsEl : null,
    });
    this.running = true;
    this.phase = "playing";
    this.timeUpElapsed = 0;
    this.lastTs = performance.now();
    this.rafId = requestAnimationFrame((ts) => this.loop(ts));
  }

  createInputCallbacks() {
    const self = this;
    return {
      onMove(i, dx, dy) {
        const p = self.players[i];
        if (!p || isInputLocked(p)) return;
        tryMove(p, dx, dy);
      },
      onSoftDrop(i) {
        const p = self.players[i];
        if (!p || isInputLocked(p)) return;
        if (softDrop(p)) p.dropTimer = 0;
      },
      onRotate(i) {
        const p = self.players[i];
        if (!p || isInputLocked(p)) return;
        tryRotate(p);
      },
      onHardDrop(i) {
        const p = self.players[i];
        if (!p || isInputLocked(p)) return;
        hardDrop(p);
      },
    };
  }

  unmount() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.input?.destroy();
    this.hideTimeUpOverlay();
    if (this.useTouchControls) {
      document.getElementById("touch-controls")?.classList.add("hidden");
      document.getElementById("controls-hint-desktop")?.classList.remove("hidden");
      if (this._onViewportResize) {
        window.visualViewport?.removeEventListener(
          "resize",
          this._onViewportResize
        );
        window.removeEventListener("orientationchange", this._onViewportResize);
        this._onViewportResize = null;
      }
    }
  }

  showTimeUpOverlay() {
    this.dom.timeUpOverlay?.classList.add("active");
  }

  hideTimeUpOverlay() {
    this.dom.timeUpOverlay?.classList.remove("active");
  }

  loop(ts) {
    if (!this.running) return;
    const dt = Math.min(ts - this.lastTs, 50);
    this.lastTs = ts;

    if (this.phase === "time-up") {
      this.timeUpElapsed += dt;
      this.render();
      this.updateStatsDom();
      if (this.timeUpElapsed >= TIME_UP_DISPLAY_MS) {
        this.running = false;
        this.hideTimeUpOverlay();
        this.onEnd(this.buildResults());
        return;
      }
      this.rafId = requestAnimationFrame((t) => this.loop(t));
      return;
    }

    this.elapsedMs += dt;

    if (
      this.timeLimitMs != null &&
      this.elapsedMs >= this.timeLimitMs &&
      this.phase === "playing"
    ) {
      this.phase = "time-up";
      this.timeUpElapsed = 0;
      this.showTimeUpOverlay();
      this.render();
      this.updateStatsDom();
      this.rafId = requestAnimationFrame((t) => this.loop(t));
      return;
    }

    for (const p of this.players) {
      updateDropSpeed(p, this.elapsedMs);
    }

    this.input.update(dt, this.playerCount);
    this.updateLineClearAnimations(dt);
    this.updateGravity(dt);
    this.render();
    this.updateStatsDom();

    if (this.checkGameEnd()) {
      this.running = false;
      this.onEnd(this.buildResults());
      return;
    }

    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  updateLineClearAnimations(dt) {
    for (const p of this.players) {
      if (!p.lineClearAnim) continue;
      if (!tickLineClearAnim(p, dt)) continue;

      const { clearedLines } = finishLineClearAnim(p);
      applyLineClear(p, clearedLines, this.subMode, this.players);
      spawnPiece(p);
    }
  }

  updateGravity(dt) {
    for (const p of this.players) {
      if (p.gameOver || p.lineClearAnim) continue;

      if (!p.current) continue;

      if (canMoveDown(p)) {
        p.lockDelay = 0;
        p.dropTimer += dt;
        if (p.dropTimer >= p.dropInterval) {
          p.dropTimer = 0;
          softDrop(p);
        }
      } else {
        p.lockDelay += dt;
        if (p.lockDelay >= LOCK_DELAY_MS) {
          p.lockDelay = 0;
          const lockResult = lockCurrentPiece(p);
          if (lockResult.pendingLineClear) continue;
          applyLineClear(p, lockResult.clearedLines, this.subMode, this.players);
          spawnPiece(p);
        }
      }
    }
  }

  render() {
    for (let i = 0; i < this.playerCount; i++) {
      const p = this.players[i];
      const { ctx } = this.dom.canvases[i];
      const { ctx: nextCtx } = this.dom.nextCanvases[i];
      drawBoard(ctx, p.board, p, this.cellSize);
      drawNext(nextCtx, p.nextType, this.nextCellSize);

      const panel = this.dom.panels[i];
      panel.classList.toggle("game-over", p.gameOver);
    }
  }

  updateStatsDom() {
    for (let i = 0; i < this.playerCount; i++) {
      const p = this.players[i];
      const el = this.dom.stats[i];
      const scoreLabel =
        this.subMode === SUB_MODE.TIME_ATTACK ? `SCORE: ${p.score}` : "";
      el.innerHTML = `${scoreLabel ? `<span>${scoreLabel}</span>` : ""}<span>LINES: ${p.linesCleared}</span>`;
    }
  }

  checkGameEnd() {
    if (
      this.subMode === SUB_MODE.BATTLE ||
      (this.subMode === SUB_MODE.SUDDEN_DEATH && this.playerCount > 1)
    ) {
      const alive = this.players.filter((p) => !p.gameOver);
      return alive.length <= 1;
    }
    if (this.playerCount === 1) {
      return this.players[0].gameOver;
    }
    return this.players.every((p) => p.gameOver);
  }

  buildResults() {
    const playTimeSec = Math.floor(
      Math.min(this.elapsedMs, this.timeLimitMs ?? this.elapsedMs) / 1000
    );
    const ranked = [...this.players]
      .map((p) => ({
        index: p.index,
        name: `プレイヤー ${p.index + 1}`,
        linesCleared: p.linesCleared,
        score: p.score,
        gameOver: p.gameOver,
      }))
      .sort((a, b) => {
        if (this.subMode === SUB_MODE.TIME_ATTACK) {
          return b.score - a.score;
        }
        if (a.gameOver !== b.gameOver) return a.gameOver ? 1 : -1;
        return b.linesCleared - a.linesCleared;
      });

    return {
      playTimeSec,
      players: ranked.map((p, rank) => ({ ...p, rank: rank + 1 })),
      subMode: this.subMode,
    };
  }

  getRemainingTimeSec() {
    if (this.timeLimitMs == null) return null;
    return Math.max(0, Math.ceil((this.timeLimitMs - this.elapsedMs) / 1000));
  }
}
