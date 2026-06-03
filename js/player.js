import {
  INITIAL_DROP_MS,
  MIN_DROP_MS,
  SPEED_UP_INTERVAL_MS,
  SPEED_UP_AMOUNT_MS,
  LINE_CLEAR_ANIM_MS,
  LINE_CLEAR_BLINK_MS,
} from "./constants.js";
import {
  createBoard,
  collides,
  getGhostY,
  lockPiece,
  clearLines,
  getFullRowIndices,
  isBlockedAtSpawn,
} from "./board.js";
import { randomPieceType, getBlocks, getSpawnPosition } from "./tetromino.js";

export function createPlayer(index) {
  return {
    index,
    board: createBoard(),
    current: null,
    nextType: randomPieceType(),
    rotation: 0,
    x: 0,
    y: 0,
    score: 0,
    linesCleared: 0,
    gameOver: false,
    dropInterval: INITIAL_DROP_MS,
    dropTimer: 0,
    lockDelay: 0,
    lastSpeedUpAt: 0,
    /** @type {{ rows: number[], elapsed: number, visible: boolean } | null} */
    lineClearAnim: null,
  };
}

export function spawnPiece(player) {
  const type = player.nextType;
  player.nextType = randomPieceType();
  const spawn = getSpawnPosition(type);
  player.current = type;
  player.rotation = 0;
  player.x = spawn.x;
  player.y = spawn.y;

  const blocks = getBlocks(type, 0);
  if (isBlockedAtSpawn(player.board, blocks, player.x, player.y)) {
    player.gameOver = true;
    player.current = null;
    return false;
  }
  return true;
}

export function getCurrentBlocks(player) {
  if (!player.current) return [];
  return getBlocks(player.current, player.rotation);
}

export function isInputLocked(player) {
  return player.gameOver || player.lineClearAnim != null;
}

export function tryMove(player, dx, dy) {
  if (isInputLocked(player) || !player.current) return false;
  const blocks = getCurrentBlocks(player);
  if (!collides(player.board, blocks, player.x + dx, player.y + dy)) {
    player.x += dx;
    player.y += dy;
    return true;
  }
  return false;
}

export function tryRotate(player) {
  if (isInputLocked(player) || !player.current) return false;
  const newRot = (player.rotation + 1) % 4;
  const blocks = getBlocks(player.current, newRot);
  // 簡易ウォールキック: 左右に1マスずらして試行
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collides(player.board, blocks, player.x + kick, player.y)) {
      player.rotation = newRot;
      player.x += kick;
      return true;
    }
  }
  return false;
}

export function softDrop(player) {
  return tryMove(player, 0, 1);
}

export function lockCurrentPiece(player) {
  if (!player.current) return { pendingLineClear: false, clearedLines: 0 };
  const blocks = getCurrentBlocks(player);
  lockPiece(player.board, player.current, blocks, player.x, player.y);
  player.current = null;

  const fullRows = getFullRowIndices(player.board);
  if (fullRows.length > 0) {
    player.lineClearAnim = { rows: fullRows, elapsed: 0, visible: true };
    return { pendingLineClear: true, clearedLines: 0 };
  }
  return { pendingLineClear: false, clearedLines: 0 };
}

export function finishLineClearAnim(player) {
  if (!player.lineClearAnim) return { clearedLines: 0 };
  player.lineClearAnim = null;
  return clearLines(player.board);
}

/** @returns {boolean} アニメーションが完了したら true */
export function tickLineClearAnim(player, dt) {
  const anim = player.lineClearAnim;
  if (!anim) return false;

  anim.elapsed += dt;
  anim.visible = Math.floor(anim.elapsed / LINE_CLEAR_BLINK_MS) % 2 === 0;
  return anim.elapsed >= LINE_CLEAR_ANIM_MS;
}

export function updateDropSpeed(player, elapsedMs) {
  const steps = Math.floor(elapsedMs / SPEED_UP_INTERVAL_MS);
  const target = Math.max(
    MIN_DROP_MS,
    INITIAL_DROP_MS - steps * SPEED_UP_AMOUNT_MS
  );
  player.dropInterval = target;
}

export function getGhostPosition(player) {
  if (!player.current) return null;
  const blocks = getCurrentBlocks(player);
  const ghostY = getGhostY(player.board, blocks, player.x, player.y);
  return { blocks, x: player.x, y: ghostY };
}
