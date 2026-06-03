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

/**
 * お邪魔ブロックを下からせり上げ（ランダム列に配置）
 * @param {number} count 送るブロック数
 */
export function addGarbageFromBottom(board, count) {
  for (let i = 0; i < count; i++) {
    const col = Math.floor(Math.random() * COLS);
    // 最下段が埋まっていれば1段上に押し上げ
    if (board.grid[ROWS - 1][col] !== CELL_EMPTY) {
      for (let y = ROWS - 1; y > 0; y--) {
        board.grid[y][col] = board.grid[y - 1][col];
        board.garbageHp[y][col] = board.garbageHp[y - 1][col];
      }
      board.grid[0][col] = CELL_GARBAGE;
      board.garbageHp[0][col] = GARBAGE_HP;
    } else {
      board.grid[ROWS - 1][col] = CELL_GARBAGE;
      board.garbageHp[ROWS - 1][col] = GARBAGE_HP;
    }
  }
}

/** スポーン位置にブロックが重なるか（ゲームオーバー判定） */
export function isBlockedAtSpawn(board, blocks, px, py) {
  return collides(board, blocks, px, py);
}
