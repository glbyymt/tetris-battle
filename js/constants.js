/** フィールドサイズ（要件: 横12 × 縦24） */
export const COLS = 12;
export const ROWS = 24;

/** タイムアタック制限時間（秒） */
export const TIME_ATTACK_LIMIT_SEC = 5 * 60;

/** 対戦モード制限時間（秒） */
export const BATTLE_LIMIT_SEC = 10 * 60;

/** TIME UP 表示後、結果画面へ遷移するまでの待機（ミリ秒） */
export const TIME_UP_DISPLAY_MS = 3000;

/** ライン消去の点滅アニメーション時間（ミリ秒） */
export const LINE_CLEAR_ANIM_MS = 800;

/** ライン消去点滅の切り替え間隔（ミリ秒） */
export const LINE_CLEAR_BLINK_MS = 100;

/** 落下間隔の下限（ミリ秒） */
export const MIN_DROP_MS = 80;

/** 初期落下間隔（ミリ秒） */
export const INITIAL_DROP_MS = 1000;

/** 落下速度が上がる間隔（ミリ秒ごとに短縮） */
export const SPEED_UP_INTERVAL_MS = 15000;
export const SPEED_UP_AMOUNT_MS = 80;

/** ゴーストピースの不透明度 */
export const GHOST_ALPHA = 0.4;

/** セル種別 */
export const CELL_EMPTY = 0;
export const CELL_GARBAGE = 8;

/** タイムアタックの得点（列数 → 点数） */
export const TIME_ATTACK_SCORES = {
  1: 100,
  2: 225,
  3: 350,
  4: 500,
};

/** 対戦モードのお邪魔ブロック送信数（列数 → 個数） */
export const BATTLE_GARBAGE_SEND = {
  1: 2,
  2: 4,
  3: 6,
  4: 8,
};

/** お邪魔ブロックの耐久（2回のライン消去で消える） */
export const GARBAGE_HP = 2;
