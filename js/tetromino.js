/** 標準7種テトリミノ（相対座標、回転0） */
const SHAPES = {
  I: [[0, 0], [1, 0], [2, 0], [3, 0]],
  O: [[0, 0], [1, 0], [0, 1], [1, 1]],
  T: [[1, 0], [0, 1], [1, 1], [2, 1]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]],
  Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
  J: [[0, 0], [0, 1], [1, 1], [2, 1]],
  L: [[2, 0], [0, 1], [1, 1], [2, 1]],
};

export const PIECE_TYPES = Object.keys(SHAPES);
export const PIECE_COLORS = {
  I: "#00f0f0",
  O: "#f0f000",
  T: "#a000f0",
  S: "#00f000",
  Z: "#f00000",
  J: "#0000f0",
  L: "#f0a000",
};

/** 完全ランダムで次のピース種別を返す */
export function randomPieceType() {
  return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
}

function rotatePoint(x, y) {
  return [-y, x];
}

/** 時計回りに90度回転したブロック座標 */
export function getBlocks(type, rotation) {
  let blocks = SHAPES[type].map(([x, y]) => [x, y]);
  for (let r = 0; r < rotation % 4; r++) {
    blocks = blocks.map(([x, y]) => rotatePoint(x, y));
  }
  return blocks;
}

/** スポーン位置（フィールド中央上） */
export function getSpawnPosition(type) {
  const blocks = getBlocks(type, 0);
  const maxX = Math.max(...blocks.map(([x]) => x));
  const minX = Math.min(...blocks.map(([x]) => x));
  const width = maxX - minX + 1;
  const x = Math.floor((12 - width) / 2) - minX;
  const y = 0;
  return { x, y };
}
