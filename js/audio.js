const BGM_PATH = "music/gaming-music.mp3";

/** @type {HTMLAudioElement | null} */
let bgm = null;

function getBgm() {
  if (!bgm) {
    bgm = new Audio(BGM_PATH);
    bgm.loop = true;
  }
  return bgm;
}

/** ゲーム中BGMをループ再生（ゲーム開始時） */
export function startGameMusic() {
  const audio = getBgm();
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

/** ゲーム中BGMを停止（ゲーム終了時） */
export function stopGameMusic() {
  if (!bgm) return;
  bgm.pause();
  bgm.currentTime = 0;
}
