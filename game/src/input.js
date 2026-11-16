const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight', 'Enter', 'KeyP', 'KeyR', 'KeyM']);

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const pointer = { x: -1, y: -1, clicked: false };
  const removers = [];
  const on = (target, name, listener) => {
    target.addEventListener(name, listener);
    removers.push(() => target.removeEventListener(name, listener));
  };
  on(window, 'keydown', event => {
    if (!GAME_KEYS.has(event.code)) return;
    event.preventDefault();
    if (!held.has(event.code) && !event.repeat) pressed.add(event.code);
    held.add(event.code);
  });
  on(window, 'keyup', event => {
    if (GAME_KEYS.has(event.code)) event.preventDefault();
    held.delete(event.code);
  });
  on(window, 'blur', () => { held.clear(); pressed.clear(); });
  on(canvas, 'pointermove', event => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) * canvas.width / rect.width;
    pointer.y = (event.clientY - rect.top) * canvas.height / rect.height;
  });
  on(canvas, 'pointerdown', event => {
    if (event.button !== 0) return;
    pointer.clicked = true; canvas.focus();
  });
  on(canvas, 'pointerleave', () => { pointer.x = -1; pointer.y = -1; });
  return {
    pointer,
    movement() {
      let x = Number(held.has('KeyD') || held.has('ArrowRight')) - Number(held.has('KeyA') || held.has('ArrowLeft'));
      let y = Number(held.has('KeyS') || held.has('ArrowDown')) - Number(held.has('KeyW') || held.has('ArrowUp'));
      const length = Math.hypot(x, y);
      if (length) { x /= length; y /= length; }
      return { x, y };
    },
    consume(...keys) {
      const active = keys.some(key => pressed.has(key));
      for (const key of keys) pressed.delete(key);
      return active;
    },
    endFrame() { pressed.clear(); pointer.clicked = false; },
    clear() { held.clear(); pressed.clear(); pointer.clicked = false; },
    destroy() { for (const remove of removers) remove(); },
  };
}
