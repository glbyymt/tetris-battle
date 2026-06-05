import {
  COLS,
  ROWS,
  CELL_EMPTY,
  CELL_GARBAGE,
  GARBAGE_HP,
} from "./constants.js";

/**
 * 盤面: grid[y][x] = 0 | 1-7 (色) | 8 (お邪魔)
 * garbageHp[y][x] = お邪魔の残り耐久（通常セルは0）
 */
export function createBoard() {
  const grid = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(CELL_EMPTY)
  );
  const garbageHp = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(0)
  );
  return { grid, garbageHp };
}

export function isEmptyCell(board, x, y) {
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
  return board.grid[y][x] === CELL_EMPTY;
}

export function collides(board, blocks, px, py) {
  for (const [bx, by] of blocks) {
    const x = px + bx;
    const y = py + by;
    if (x < 0 || x >= COLS || y >= ROWS) return true;
    if (y >= 0 && board.grid[y][x] !== CELL_EMPTY) return true;
  }
  return false;
}

/** 落下予測地点のY座標 */
export function getGhostY(board, blocks, px, py) {
  let gy = py;
  while (!collides(board, blocks, px, gy + 1)) {
    gy++;
  }
  return gy;
}

const PIECE_TYPE_TO_CELL = {
  I: 1,
  O: 2,
  T: 3,
  S: 4,
  Z: 5,
  J: 6,
  L: 7,
};

export function lockPiece(board, type, blocks, px, py) {
  const colorIndex = PIECE_TYPE_TO_CELL[type];
  for (const [bx, by] of blocks) {
    const x = px + bx;
    const y = py + by;
    if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
      board.grid[y][x] = colorIndex;
    }
  }
}

function isRowFull(board, y) {
  for (let x = 0; x < COLS; x++) {
    if (board.grid[y][x] === CELL_EMPTY) return false;
  }
  return true;
}

function isRowEmpty(board, y) {
  for (let x = 0; x < COLS; x++) {
    if (board.grid[y][x] !== CELL_EMPTY) return false;
  }
  return true;
}

/** 完成している行のインデックス一覧 */
export function getFullRowIndices(board) {
  const rows = [];
  for (let y = 0; y < ROWS; y++) {
    if (isRowFull(board, y)) rows.push(y);
  }
  return rows;
}

/**
 * 完成したラインを消去。お邪魔は2回のライン消去で消える。
 * @returns {{ clearedLines: number }}
 */
export function clearLines(board) {
  let clearedCount = 0;
  let y = ROWS - 1;
  while (y >= 0) {
    if (!isRowFull(board, y)) {
      y--;
      continue;
    }
    for (let x = 0; x < COLS; x++) {
      const cell = board.grid[y][x];
      if (cell === CELL_GARBAGE) {
        board.garbageHp[y][x]--;
        if (board.garbageHp[y][x] <= 0) {
          board.grid[y][x] = CELL_EMPTY;
          board.garbageHp[y][x] = 0;
        }
      } else if (cell !== CELL_EMPTY) {
        board.grid[y][x] = CELL_EMPTY;
      }
    }
    if (isRowEmpty(board, y)) {
      board.grid.splice(y, 1);
      board.garbageHp.splice(y, 1);
      board.grid.unshift(Array(COLS).fill(CELL_EMPTY));
      board.garbageHp.unshift(Array(COLS).fill(0));
      clearedCount++;
    } else {
      y--;
    }
  }
  return { clearedLines: clearedCount };
}

/** @returns {number[]} 0〜cols-1 から holeCount 個の列インデックス（重複なし） */
function pickRandomHoleColumns(holeCount, cols) {
  const indices = Array.from({ length: cols }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, holeCount);
}

/**
 * お邪魔ブロックを下から行単位でせり上げる
 * @param {number} rowCount せり上げる行数
 * @param {number} holesPerRow 1行あたりの穴の数
 */
export function addGarbageRowsFromBottom(board, rowCount, holesPerRow) {
  if (rowCount <= 0) return;

  const holeCount = Math.min(holesPerRow, COLS - 1);

  for (let r = 0; r < rowCount; r++) {
    board.grid.shift();
    board.garbageHp.shift();

    const holeCols = new Set(pickRandomHoleColumns(holeCount, COLS));
    const newRow = Array(COLS).fill(CELL_GARBAGE);
    const newHp = Array(COLS).fill(GARBAGE_HP);
    for (const x of holeCols) {
      newRow[x] = CELL_EMPTY;
      newHp[x] = 0;
    }
    board.grid.push(newRow);
    board.garbageHp.push(newHp);
  }
}

/** スポーン位置にブロックが重なるか（ゲームオーバー判定） */
export function isBlockedAtSpawn(board, blocks, px, py) {
  return collides(board, blocks, px, py);
}
