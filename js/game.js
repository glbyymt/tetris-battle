import { TIME_ATTACK_LIMIT_SEC } from "./constants.js";
import { SUB_MODE, applyLineClear } from "./modes.js";
import {
  createPlayer,
  spawnPiece,
  tryMove,
  tryRotate,
  softDrop,
  lockCurrentPiece,
  updateDropSpeed,
} from "./player.js";
import { drawBoard, drawNext, setupCanvas, CELL_SIZE, NEXT_CELL_SIZE } from "./render.js";
import { createInputManager } from "./input.js";

export class GameSession {
  constructor({ playerCount, subMode, onEnd }) {
    this.playerCount = playerCount;
    this.subMode = subMode;
    this.onEnd = onEnd;
    this.players = Array.from({ length: playerCount }, (_, i) =>
      createPlayer(i)
    );
    this.running = false;
    this.elapsedMs = 0;
    this.timeLimitMs =
      subMode === SUB_MODE.TIME_ATTACK ? TIME_ATTACK_LIMIT_SEC * 1000 : null;
    this.rafId = null;
    this.lastTs = 0;
    this.input = null;
    this.dom = {};
  }

  mount(container) {
    container.innerHTML = "";
    this.dom.panels = [];
    this.dom.canvases = [];
    this.dom.nextCanvases = [];
    this.dom.stats = [];

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
      const mainCtx = setupCanvas(main, 12, 24, CELL_SIZE);

      const nextWrap = document.createElement("div");
      const nextLabel = document.createElement("div");
      nextLabel.className = "next-label";
      nextLabel.textContent = "NEXT";
      const next = document.createElement("canvas");
      next.className = "canvas-next";
      const nextCtx = setupCanvas(next, 4, 4, NEXT_CELL_SIZE);
      nextWrap.append(nextLabel, next);

      wrap.append(main, nextWrap);
      panel.append(label, stats, wrap);
      container.appendChild(panel);

      this.dom.panels.push(panel);
      this.dom.canvases.push({ canvas: main, ctx: mainCtx });
      this.dom.nextCanvases.push({ canvas: next, ctx: nextCtx });
      this.dom.stats.push(stats);
    }

    for (const p of this.players) {
      spawnPiece(p);
    }

    this.input = createInputManager(
      this.playerCount,
      this.createInputCallbacks()
    );
    this.running = true;
    this.lastTs = performance.now();
    this.rafId = requestAnimationFrame((ts) => this.loop(ts));
  }

  createInputCallbacks() {
    const self = this;
    return {
      onMove(i, dx, dy) {
        const p = self.players[i];
        if (!p || p.gameOver) return;
        tryMove(p, dx, dy);
      },
      onSoftDrop(i) {
        const p = self.players[i];
        if (!p || p.gameOver) return;
        if (softDrop(p)) p.dropTimer = 0;
      },
      onRotate(i) {
        const p = self.players[i];
        if (!p || p.gameOver) return;
        tryRotate(p);
      },
    };
  }

  unmount() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.input?.destroy();
  }

  loop(ts) {
    if (!this.running) return;
    const dt = Math.min(ts - this.lastTs, 50);
    this.lastTs = ts;
    this.elapsedMs += dt;

    if (this.timeLimitMs != null && this.elapsedMs >= this.timeLimitMs) {
      for (const p of this.players) {
        if (!p.gameOver) p.gameOver = true;
      }
    }

    for (const p of this.players) {
      updateDropSpeed(p, this.elapsedMs);
    }

    this.input.update(dt, this.playerCount);
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

  updateGravity(dt) {
    for (const p of this.players) {
      if (p.gameOver || !p.current) continue;
      p.dropTimer += dt;
      if (p.dropTimer >= p.dropInterval) {
        p.dropTimer = 0;
        if (!softDrop(p)) {
          const { clearedLines } = lockCurrentPiece(p);
          applyLineClear(p, clearedLines, this.subMode, this.players);
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
      drawBoard(ctx, p.board, p, CELL_SIZE);
      drawNext(nextCtx, p.nextType, NEXT_CELL_SIZE);

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
    if (this.timeLimitMs != null && this.elapsedMs >= this.timeLimitMs) {
      return true;
    }
    if (this.subMode === SUB_MODE.BATTLE) {
      const alive = this.players.filter((p) => !p.gameOver);
      return alive.length <= 1;
    }
    if (this.playerCount === 1) {
      return this.players[0].gameOver;
    }
    return this.players.every((p) => p.gameOver);
  }

  buildResults() {
    const playTimeSec = Math.floor(this.elapsedMs / 1000);
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
