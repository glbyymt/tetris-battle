const BGM_PATH = "music/gaming-music.mp3";
const FINISH_PATH = "music/game-finish.mp3";

/** @type {HTMLAudioElement | null} */
let bgm = null;
/** @type {HTMLAudioElement | null} */
let finishMusic = null;

function getBgm() {
  if (!bgm) {
    bgm = new Audio(BGM_PATH);
    bgm.loop = true;
  }
  return bgm;
}

function getFinishMusic() {
  if (!finishMusic) {
    finishMusic = new Audio(FINISH_PATH);
    finishMusic.loop = false;
  }
  return finishMusic;
}

/** ゲーム中BGMをループ再生（ゲーム開始時） */
export function startGameMusic() {
  stopFinishMusic();
  const audio = getBgm();
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

/** ゲーム中BGMを停止 */
export function stopGameMusic() {
  if (!bgm) return;
  bgm.pause();
  bgm.currentTime = 0;
}

/** ゲーム終了演出用BGMを1回再生 */
export function startFinishMusic() {
  stopGameMusic();
  const audio = getFinishMusic();
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

/** ゲーム終了演出用BGMを停止 */
export function stopFinishMusic() {
  if (!finishMusic) return;
  finishMusic.pause();
  finishMusic.currentTime = 0;
}
