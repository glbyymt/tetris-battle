import { TIME_ATTACK_SCORES, BATTLE_GARBAGE_PATTERN } from "./constants.js";
import { addGarbageRowsFromBottom, isBlockedAtSpawn } from "./board.js";
import { getBlocks } from "./tetromino.js";

export const SUB_MODE = {
  TIME_ATTACK: "time-attack",
  BATTLE: "battle",
  SUDDEN_DEATH: "sudden-death",
};

export function applyLineClear(player, clearedLines, subMode, allPlayers) {
  if (clearedLines <= 0) return;

  player.linesCleared += clearedLines;

  if (subMode === SUB_MODE.TIME_ATTACK) {
    const points = TIME_ATTACK_SCORES[clearedLines] ?? 0;
    player.score += points;
  } else if (subMode === SUB_MODE.BATTLE) {
    const pattern = BATTLE_GARBAGE_PATTERN[clearedLines];
    for (const other of allPlayers) {
      if (other.index !== player.index && !other.gameOver && pattern) {
        addGarbageRowsFromBottom(other.board, pattern.rows, pattern.holes);
        if (other.current) {
          const blocks = getBlocks(other.current, other.rotation);
          if (isBlockedAtSpawn(other.board, blocks, other.x, other.y)) {
            other.gameOver = true;
            other.current = null;
          }
        }
      }
    }
  }
}
