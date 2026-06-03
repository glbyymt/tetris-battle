/**
 * プレイヤーごとの入力（キーボード + ゲームパッド）
 * 左右は押し続けで連続移動（DAS/ARR）
 */

const KEY_BINDINGS = [
  { left: "ArrowLeft", right: "ArrowRight", down: "ArrowDown", rotate: " " },
  { left: "a", right: "d", down: "s", rotate: "q" },
  { left: "j", right: "l", down: "k", rotate: "u" },
  { left: "f", right: "h", down: "g", rotate: "r" },
];

const DAS_DELAY_MS = 170;
const ARR_INTERVAL_MS = 50;
const SOFT_DROP_MS = 50;

export function createInputManager(playerCount, callbacks) {
  const held = Array.from({ length: playerCount }, () => ({
    left: false,
    right: false,
    down: false,
    rotatePressed: false,
    rotateConsumed: false,
    dasLeft: 0,
    dasRight: 0,
    arrLeft: 0,
    arrRight: 0,
    softDropTimer: 0,
    movedOnceLeft: false,
    movedOnceRight: false,
  }));

  function matchBinding(key, field) {
    const k = key.length === 1 ? key.toLowerCase() : key;
    for (let i = 0; i < playerCount && i < KEY_BINDINGS.length; i++) {
      const b = KEY_BINDINGS[i];
      const target = field === "rotate" && b.rotate === " " ? " " : b[field];
      const cmp = target === " " ? key : k;
      if (cmp === target || (field === "rotate" && key === " " && b.rotate === " ")) {
        return i;
      }
    }
    return -1;
  }

  function handleKeyDown(e) {
    if (e.repeat) return;
    const key = e.key;
    if ([" ", "ArrowLeft", "ArrowRight", "ArrowDown"].includes(key)) {
      e.preventDefault();
    }
    const k = key.length === 1 ? key.toLowerCase() : key;

    const piLeft = matchBinding(k, "left");
    if (piLeft >= 0) {
      const s = held[piLeft];
      if (!s.left) {
        s.left = true;
        s.dasLeft = 0;
        s.arrLeft = 0;
        s.movedOnceLeft = false;
        callbacks.onMove(piLeft, -1, 0);
        s.movedOnceLeft = true;
      }
    }

    const piRight = matchBinding(k, "right");
    if (piRight >= 0) {
      const s = held[piRight];
      if (!s.right) {
        s.right = true;
        s.dasRight = 0;
        s.arrRight = 0;
        s.movedOnceRight = false;
        callbacks.onMove(piRight, 1, 0);
        s.movedOnceRight = true;
      }
    }

    const piDown = matchBinding(k, "down");
    if (piDown >= 0) held[piDown].down = true;

    const piRot = matchBinding(key === " " ? " " : k, "rotate");
    if (piRot >= 0) {
      const s = held[piRot];
      if (!s.rotatePressed) {
        s.rotatePressed = true;
        s.rotateConsumed = false;
        callbacks.onRotate(piRot);
        s.rotateConsumed = true;
      }
    }
  }

  function handleKeyUp(e) {
    const key = e.key;
    const k = key.length === 1 ? key.toLowerCase() : key;

    const piLeft = matchBinding(k, "left");
    if (piLeft >= 0) {
      held[piLeft].left = false;
      held[piLeft].dasLeft = 0;
      held[piLeft].arrLeft = 0;
    }
    const piRight = matchBinding(k, "right");
    if (piRight >= 0) {
      held[piRight].right = false;
      held[piRight].dasRight = 0;
      held[piRight].arrRight = 0;
    }
    const piDown = matchBinding(k, "down");
    if (piDown >= 0) held[piDown].down = false;
    const piRot = matchBinding(key === " " ? " " : k, "rotate");
    if (piRot >= 0) held[piRot].rotatePressed = false;
  }

  function readGamepad(playerIndex, state) {
    const pads = navigator.getGamepads?.() ?? [];
    const pad = pads[playerIndex];
    if (!pad) return;

    const axisX = pad.axes[0] ?? 0;
    const axisY = pad.axes[1] ?? 0;
    const btnA = pad.buttons[0]?.pressed;
    const dpadLeft = pad.buttons[14]?.pressed;
    const dpadRight = pad.buttons[15]?.pressed;
    const dpadDown = pad.buttons[13]?.pressed;

    if (axisX < -0.5 || dpadLeft) {
      if (!state.left) {
        state.left = true;
        callbacks.onMove(playerIndex, -1, 0);
      }
    } else if (axisX >= -0.3 && !dpadLeft) {
      state.left = false;
      state.dasLeft = 0;
      state.arrLeft = 0;
    }

    if (axisX > 0.5 || dpadRight) {
      if (!state.right) {
        state.right = true;
        callbacks.onMove(playerIndex, 1, 0);
      }
    } else if (axisX <= 0.3 && !dpadRight) {
      state.right = false;
      state.dasRight = 0;
      state.arrRight = 0;
    }

    if (axisY > 0.5 || dpadDown) {
      state.down = true;
    } else {
      state.down = false;
    }

    if (btnA && !state.rotateConsumed) {
      callbacks.onRotate(playerIndex);
      state.rotateConsumed = true;
    }
    if (!btnA) state.rotateConsumed = false;
  }

  function update(dt, playerCountActive) {
    for (let i = 0; i < playerCountActive; i++) {
      const state = held[i];
      readGamepad(i, state);

      if (state.left) {
        state.dasLeft += dt;
        if (state.dasLeft >= DAS_DELAY_MS) {
          state.arrLeft += dt;
          while (state.arrLeft >= ARR_INTERVAL_MS) {
            state.arrLeft -= ARR_INTERVAL_MS;
            callbacks.onMove(i, -1, 0);
          }
        }
      }

      if (state.right) {
        state.dasRight += dt;
        if (state.dasRight >= DAS_DELAY_MS) {
          state.arrRight += dt;
          while (state.arrRight >= ARR_INTERVAL_MS) {
            state.arrRight -= ARR_INTERVAL_MS;
            callbacks.onMove(i, 1, 0);
          }
        }
      }

      if (state.down) {
        state.softDropTimer += dt;
        while (state.softDropTimer >= SOFT_DROP_MS) {
          state.softDropTimer -= SOFT_DROP_MS;
          callbacks.onSoftDrop(i);
        }
      } else {
        state.softDropTimer = 0;
      }
    }
  }

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

  return {
    update,
    destroy() {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    },
  };
}
