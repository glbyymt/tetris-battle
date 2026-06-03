import { COLS, ROWS, GHOST_ALPHA, CELL_GARBAGE } from "./constants.js";
import { PIECE_COLORS, getBlocks } from "./tetromino.js";
import { getGhostPosition, getCurrentBlocks } from "./player.js";

const CELL_COLORS = {
  0: null,
  1: "#00f0f0",
  2: "#f0f000",
  3: "#a000f0",
  4: "#00f000",
  5: "#f00000",
  6: "#0000f0",
  7: "#f0a000",
  8: "#888888",
};

export const CELL_SIZE = 24;
export const NEXT_CELL_SIZE = 16;
export const NEXT_COLS = 4;
export const NEXT_ROWS = 4;

export function setupCanvas(canvas, cols, rows, cellSize) {
  canvas.width = cols * cellSize;
  canvas.height = rows * cellSize;
  return canvas.getContext("2d");
}

function drawCell(ctx, x, y, size, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x * size, y * size, size - 1, size - 1);
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.strokeRect(x * size, y * size, size - 1, size - 1);
  ctx.globalAlpha = 1;
}

export function drawBoard(ctx, board, player, cellSize) {
  const w = COLS * cellSize;
  const h = ROWS * cellSize;
  ctx.clearRect(0, 0, w, h);

  const blinkRows = player.lineClearAnim?.rows;
  const blinkVisible = player.lineClearAnim?.visible ?? true;

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const v = board.grid[y][x];
      if (v !== 0) {
        if (blinkRows?.includes(y) && !blinkVisible) continue;
        const color = CELL_COLORS[v] ?? "#ffffff";
        const alpha =
          v === CELL_GARBAGE && board.garbageHp[y][x] >= 2 ? 0.85 : 1;
        drawCell(ctx, x, y, cellSize, color, alpha);
      }
    }
  }

  const ghost = getGhostPosition(player);
  if (ghost) {
    const color = PIECE_COLORS[player.current];
    for (const [bx, by] of ghost.blocks) {
      drawCell(
        ctx,
        ghost.x + bx,
        ghost.y + by,
        cellSize,
        color,
        GHOST_ALPHA
      );
    }
  }

  if (player.current) {
    const color = PIECE_COLORS[player.current];
    const blocks = getCurrentBlocks(player);
    for (const [bx, by] of blocks) {
      drawCell(ctx, player.x + bx, player.y + by, cellSize, color, 1);
    }
  }
}

export function drawNext(ctx, pieceType, cellSize) {
  const w = NEXT_COLS * cellSize;
  const h = NEXT_ROWS * cellSize;
  ctx.clearRect(0, 0, w, h);
  if (!pieceType) return;

  const blocks = getBlocks(pieceType, 0);
  const color = PIECE_COLORS[pieceType];
  const minX = Math.min(...blocks.map(([x]) => x));
  const minY = Math.min(...blocks.map(([, y]) => y));
  const offsetX = Math.floor((NEXT_COLS - 4) / 2) - minX;
  const offsetY = Math.floor((NEXT_ROWS - 2) / 2) - minY;
  for (const [bx, by] of blocks) {
    drawCell(ctx, offsetX + bx, offsetY + by, cellSize, color, 1);
  }
}
