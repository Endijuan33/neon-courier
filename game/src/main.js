import { FIXED_STEP, TUNING, COLORS, PARCEL_TYPES } from './config.js';
import { seedFromQuery } from './random.js';
import { createInput } from './input.js';
import { createWorld, updateWorld, collectParcel, matchingDelivery, collectPowerups, burst, popup } from './world.js';
import { createDrone, moveDrone, startDash, hitDrone, safeRespawn } from './drone.js';
import { createTraffic, updateTraffic, touchingTraffic } from './traffic.js';
import { createAudio } from './audio.js';
import { render, menuButtons } from './render.js';
import { applyScreenshotState } from './shots.js';

const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d', { alpha: false });
const input = createInput(canvas);
const audio = createAudio();
const seed = seedFromQuery(location.search);
let storedBest = 0;
try { storedBest = Math.max(0, Number(localStorage.getItem('neon-courier-best')) || 0); } catch {}

function createRun() {
  const player = createDrone();
  const world = createWorld(seed);
  createTraffic(world, player, 1);
  return {
    mode: 'title', player, world, seed, frozen: false,
    score: 0, best: storedBest, combo: 1, maxCombo: 1, shift: 1,
    delivered: 0, totalDelivered: 0, elapsed: 0,
    banner: 'SHIFT 01 · CITY IS YOURS', bannerTime: 3, shiftBonus: 0,
  };
}

let run = createRun();
applyScreenshotState(run, location.search);
let lastMenuKey = '';

function announce(text) { document.getElementById('status').textContent = text; }

function saveBest() {
  run.best = Math.max(run.best, run.score);
  if (!run.frozen && run.best > storedBest) {
    storedBest = run.best;
    try { localStorage.setItem('neon-courier-best', String(storedBest)); } catch {}
  }
}

function restart() {
  audio.unlock(); input.clear();
  run = createRun(); run.mode = 'playing';
  audio.setActive(true); audio.play('start');
  announce('Shift one started. Three lives. Collect a parcel and match its pad.');
}

function pause() {
  if (run.mode !== 'playing') return;
  run.mode = 'paused'; audio.setActive(false); input.clear();
  announce('Paused. Press P or Enter to resume.');
}

function resume() {
  run.mode = 'playing'; run.frozen = false; input.clear(); audio.setActive(true);
  announce('Flight resumed.');
}

function nextShift() {
  run.shift++; run.delivered = 0; run.mode = 'playing'; run.frozen = false;
  run.world.parcels = []; run.world.powerups = [];
  run.world.parcelTimer = 0.1; run.world.powerTimer = 4;
  safeRespawn(run.player, run.world);
  createTraffic(run.world, run.player, run.shift);
  run.banner = `SHIFT ${String(run.shift).padStart(2, '0')} · TRAFFIC INCREASED`;
  run.bannerTime = 3; input.clear(); audio.setActive(true); audio.play('start');
  announce(`Shift ${run.shift}. More and faster traffic.`);
}

function performAction(action) {
  audio.unlock();
  if (action === 'start' || action === 'restart') restart();
  if (action === 'resume') resume();
  if (action === 'next') nextShift();
  if (action === 'pause') pause();
  if (action === 'mute') { audio.toggle(); announce(audio.muted ? 'Sound muted.' : 'Sound on.'); }
  if (action === 'title') {
    run = createRun(); input.clear(); audio.setActive(false); announce('Title screen.');
  }
}

function updateMenuElements() {
  const buttons = menuButtons(run, audio);
  const key = buttons.map(b => `${b.action}:${b.label}`).join('|');
  if (key === lastMenuKey) return;
  lastMenuKey = key;
  const container = document.getElementById('actions');
  container.replaceChildren();
  for (const button of buttons) {
    const element = document.createElement('button');
    element.textContent = button.label; element.setAttribute('aria-label', button.label);
    element.style.left = `${button.x / 12.8}%`; element.style.top = `${button.y / 7.2}%`;
    element.style.width = `${button.w / 12.8}%`; element.style.height = `${button.h / 7.2}%`;
    element.addEventListener('click', () => { performAction(button.action); canvas.focus(); });
    container.append(element);
  }
}

function handleControls() {
  if (input.consume('KeyM')) performAction('mute');
  if (input.consume('KeyR')) { restart(); return; }
  if (input.consume('KeyP')) {
    if (run.mode === 'playing') pause();
    else if (run.mode === 'paused') resume();
  }
  if (input.consume('Enter')) {
    if (run.mode === 'title' || run.mode === 'game-over') restart();
    else if (run.mode === 'paused') resume();
    else if (run.mode === 'shift-complete') nextShift();
  }
  if (run.mode === 'playing' && !run.frozen && input.consume('Space', 'ShiftLeft', 'ShiftRight')) {
    if (startDash(run.player, input.movement(), run.world)) audio.play('dash');
  }
  if (input.pointer.clicked) {
    const button = menuButtons(run, audio).find(b => input.pointer.x >= b.x && input.pointer.x <= b.x + b.w && input.pointer.y >= b.y && input.pointer.y <= b.y + b.h);
    if (button) performAction(button.action);
  }
}

function deliver(pad) {
  const quick = run.world.time - run.player.cargo.pickedAt < TUNING.expressSeconds;
  const points = (TUNING.basePoints + (quick ? TUNING.expressBonus : 0)) * run.combo;
  run.score += points; run.delivered++; run.totalDelivered++;
  burst(run.world, pad.x, pad.y, PARCEL_TYPES[pad.type].color, 48, 210);
  popup(run.world, pad.x, pad.y - 42, `+${points}`, PARCEL_TYPES[pad.type].color);
  run.player.cargo = null;
  run.combo = Math.min(TUNING.comboLimit, run.combo + 1);
  run.maxCombo = Math.max(run.maxCombo, run.combo);
  run.banner = `${quick ? 'EXPRESS ' : ''}DELIVERY +${points} · COMBO ×${run.combo}`;
  run.bannerTime = 2.2; audio.play('delivery'); saveBest();
  announce(`Delivery ${run.delivered} of ten. Score ${run.score}. Combo ${run.combo}.`);
  if (run.delivered === TUNING.shiftDeliveries) {
    run.shiftBonus = TUNING.shiftBonus * run.shift;
    run.score += run.shiftBonus; saveBest();
    run.mode = 'shift-complete'; audio.setActive(false); audio.play('shift');
    announce(`Shift complete. Bonus ${run.shiftBonus}. Enter for the next shift.`);
  }
}

function updatePlaying(dt) {
  run.elapsed += dt;
  run.bannerTime = Math.max(0, run.bannerTime - dt);
  updateWorld(run.world, run.player, run.shift, dt);
  moveDrone(run.player, input.movement(), run.world, dt);
  updateTraffic(run.world, run.player, dt);
  const collision = touchingTraffic(run.world, run.player);
  if (collision) {
    const result = hitDrone(run.player, run.world, collision);
    if (result === 'hit') {
      run.combo = 1; audio.play('hit');
      announce(`Hit. ${run.player.lives} lives remain. Combo reset.`);
      if (run.player.lives <= 0) {
        run.mode = 'game-over'; saveBest(); audio.setActive(false); audio.play('over');
        announce(`Game over. Final score ${run.score}. Press R to restart.`);
        return;
      }
    } else if (result === 'shield') audio.play('shield');
  }
  run.player.pickupLock = Math.max(0, run.player.pickupLock - dt);
  if (!run.player.pickupLock && collectParcel(run.world, run.player)) audio.play('pickup');
  if (collectPowerups(run.world, run.player)) audio.play('power');
  const pad = matchingDelivery(run.world, run.player);
  if (pad) deliver(pad);
}

// Read-only diagnostics let a browser play-test observe the real simulation.
window.neonCourier = Object.freeze({
  inspect() {
    return {
      mode: run.mode, frozen: run.frozen, score: run.score, best: run.best,
      combo: run.combo, maxCombo: run.maxCombo, shift: run.shift,
      delivered: run.delivered, totalDelivered: run.totalDelivered, elapsed: run.elapsed,
      player: { x: run.player.x, y: run.player.y, lives: run.player.lives,
        cargo: run.player.cargo ? { type: run.player.cargo.type } : null,
        cooldown: run.player.cooldown, dash: run.player.dash, shield: run.player.shield,
        invulnerable: run.player.invulnerable },
      world: { time: run.world.time, slow: run.world.slow, magnet: run.world.magnet,
        pads: run.world.pads.map(p => ({ ...p })), parcels: run.world.parcels.map(p => ({ ...p })),
        powerups: run.world.powerups.map(p => ({ ...p })), barriers: run.world.barriers.map(p => ({ ...p })),
        traffic: run.world.traffic.map(p => ({ x: p.x, y: p.y, chasing: p.chasing, speed: p.speed })) },
      audio: audio.inspect(),
    };
  },
});

window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
let previous = performance.now(), accumulator = 0;
function frame(now) {
  const elapsed = Math.min(0.1, Math.max(0, (now - previous) / 1000));
  previous = now;
  handleControls();
  if (run.mode === 'playing' && !run.frozen) {
    accumulator += elapsed;
    while (accumulator >= FIXED_STEP) {
      if (run.mode === 'playing') updatePlaying(FIXED_STEP);
      accumulator -= FIXED_STEP;
    }
  } else accumulator = 0;
  audio.tick();
  updateMenuElements();
  render(context, run, input, audio);
  input.endFrame();
  requestAnimationFrame(frame);
}
canvas.focus(); updateMenuElements(); requestAnimationFrame(frame);
