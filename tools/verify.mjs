import assert from 'node:assert/strict';
import { readdirSync, readFileSync, lstatSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRandom } from '../game/src/random.js';
import { TUNING, FIXED_STEP, CITY } from '../game/src/config.js';
import { createWorld, isOpen, collectParcel, matchingDelivery, collectPowerups, updateWorld, spawnParcel } from '../game/src/world.js';
import { createDrone, moveDrone, startDash, hitDrone } from '../game/src/drone.js';
import { createTraffic, updateTraffic } from '../game/src/traffic.js';
import { applyScreenshotState } from '../game/src/shots.js';
import { render } from '../game/src/render.js';

const root = resolve(new URL('..', import.meta.url).pathname);
const passed = [];
function check(name, task) { task(); passed.push(name); console.log(`PASS ${name}`); }

check('seeded simulation repeats exactly', () => {
  function simulate() {
    const world = createWorld(1), player = createDrone(); createTraffic(world, player, 2);
    for (let i = 0; i < 1200; i++) {
      updateWorld(world, player, 2, FIXED_STEP);
      updateTraffic(world, player, FIXED_STEP);
    }
    return JSON.stringify({ parcels: world.parcels, traffic: world.traffic, powerups: world.powerups });
  }
  assert.equal(simulate(), simulate());
  const a = createRandom(1), b = createRandom(2);
  assert.notEqual(a(), b());
});

check('parcel pickup and matching-pad delivery require physical proximity', () => {
  const world = createWorld(1), player = createDrone();
  assert.equal(collectParcel(world, player), null);
  player.x = 360; assert.equal(collectParcel(world, player).type, 0);
  assert.equal(world.parcels.length, 2);
  assert.equal(collectParcel(world, player), null);
  player.x = world.pads[1].x; player.y = world.pads[1].y;
  assert.equal(matchingDelivery(world, player), null);
  player.x = world.pads[0].x; player.y = world.pads[0].y;
  assert.equal(matchingDelivery(world, player).type, 0);
});

check('dash stops at buildings, covers distance, and respects cooldown', () => {
  const world = createWorld(1), player = createDrone();
  player.x = 260; player.y = 280;
  assert.equal(startDash(player, { x: 1, y: 0 }, world), true);
  assert.equal(startDash(player, { x: 1, y: 0 }, world), false);
  for (let i = 0; i < 30; i++) moveDrone(player, { x: 1, y: 0 }, world, FIXED_STEP);
  assert(player.x <= 288 - TUNING.playerRadius + 0.1);
  assert(isOpen(world, player.x, player.y, TUNING.playerRadius));
  player.x = 240; player.y = 400; player.cooldown = 0;
  startDash(player, { x: 1, y: 0 }, world);
  for (let i = 0; i < 20; i++) moveDrone(player, { x: 1, y: 0 }, world, FIXED_STEP);
  assert(player.x > 360);
});

check('damage, grace, dash immunity, shield save, and dropped cargo', () => {
  const world = createWorld(1), player = createDrone(), traffic = { x: 359, y: 400 };
  player.x = 360; collectParcel(world, player); player.invulnerable = 0;
  player.shield = true;
  assert.equal(hitDrone(player, world, traffic), 'shield');
  assert.equal(player.lives, 3); assert.equal(player.shield, false); assert(player.cargo);
  assert.equal(hitDrone(player, world, traffic), 'immune');
  player.invulnerable = 0; player.dash = 0.1;
  assert.equal(hitDrone(player, world, traffic), 'immune');
  player.dash = 0;
  assert.equal(hitDrone(player, world, traffic), 'hit');
  assert.equal(player.lives, 2); assert.equal(player.cargo, null);
  assert.equal(collectParcel(world, player), null);
  assert(world.shake > 0); assert(world.particles.length > 0);
});

check('power-up timers and magnet obey walls', () => {
  const world = createWorld(1), player = createDrone(); player.x = 360; player.y = 400;
  for (const kind of ['SHIELD', 'SLOW', 'MAGNET']) {
    world.powerups.push({ x: player.x, y: player.y, kind, age: 0 });
    assert.equal(collectPowerups(world, player).kind, kind);
  }
  assert(player.shield); assert.equal(world.slow, 6); assert.equal(world.magnet, 6);
  world.parcels = [{ x: 420, y: 400, type: 1, age: 0 }];
  updateWorld(world, player, 1, 0.1); assert(world.parcels[0].x < 420);
  world.parcels = [{ x: 360, y: 228, type: 1, age: 0 }]; player.y = 350;
  updateWorld(world, player, 1, 0.1); assert.equal(world.parcels[0].y, 228);
  world.parcelTimer = 100; world.powerTimer = 100;
  for (let i = 0; i < 720; i++) updateWorld(world, player, 1, FIXED_STEP);
  assert.equal(world.slow, 0); assert.equal(world.magnet, 0);
});

check('slow halves traffic movement and shifts increase challenge', () => {
  function distance(slow) {
    const world = createWorld(1), player = createDrone(); createTraffic(world, player, 1);
    const traffic = world.traffic[0]; traffic.x = 600; traffic.y = 360;
    traffic.angle = 0; traffic.target = { x: 1100, y: 360 }; traffic.patrolTimer = 10;
    world.traffic = [traffic]; world.slow = slow;
    updateTraffic(world, player, 0.1); return traffic.x - 600;
  }
  assert(Math.abs(distance(6) * 2 - distance(0)) < 1e-8);
  const world = createWorld(1), player = createDrone(); createTraffic(world, player, 1);
  const before = world.traffic.map(d => d.speed); assert.equal(before.length, 5);
  createTraffic(world, player, 2); assert.equal(world.traffic.length, 7);
  assert(world.traffic.every(d => d.speed >= TUNING.trafficSpeed + TUNING.trafficIncrease));
  for (let i = 0; i < 50; i++) spawnParcel(world);
  assert.equal(world.parcels.length, TUNING.parcelLimit);
});

// This exercises main.js and input.js together in Node. These are synthetic events,
// not browser input, and the drawing context below validates calls without making images.
let virtualTime = 0, queuedFrame = null, drawCalls = 0;
const storage = new Map();
const canvasContext = new Proxy({ globalAlpha: 1 }, {
  get(target, key) {
    if (key in target) return target[key];
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
    return (...args) => {
      for (const value of args) if (typeof value === 'number') assert(Number.isFinite(value), `finite canvas argument: ${String(key)}`);
      drawCalls++;
    };
  },
});
class Element extends EventTarget {
  constructor() { super(); this.style = {}; this.children = []; this.textContent = ''; }
  focus() {}
  setAttribute() {}
  replaceChildren() { this.children = []; }
  append(element) { this.children.push(element); }
}
const canvas = new Element(); canvas.width = 1280; canvas.height = 720;
canvas.getContext = () => canvasContext;
canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1280, height: 720 });
const elements = { canvas, actions: new Element(), status: new Element() };
globalThis.window = new EventTarget();
globalThis.document = Object.assign(new EventTarget(), {
  getElementById: id => elements[id], createElement: () => new Element(), hidden: false,
});
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
globalThis.location = { search: '?seed=1' };
globalThis.performance = { now: () => virtualTime };
globalThis.requestAnimationFrame = callback => { queuedFrame = callback; };
await import('../game/src/main.js');
const state = () => window.neonCourier.inspect();
const down = new Set();
function key(code, type) {
  const event = new Event(type, { cancelable: true });
  Object.defineProperties(event, { code: { value: code }, repeat: { value: false } });
  window.dispatchEvent(event);
  if (type === 'keydown') down.add(code); else down.delete(code);
}
function frames(count) {
  for (let i = 0; i < count; i++) { virtualTime += 1000 / 60; const callback = queuedFrame; queuedFrame = null; callback(virtualTime); }
}
function tap(code) { key(code, 'keydown'); frames(1); key(code, 'keyup'); frames(1); }
function hold(code, count) { key(code, 'keydown'); frames(count); key(code, 'keyup'); frames(8); }
function release() { for (const code of [...down]) key(code, 'keyup'); }
function steer(x, y, tolerance = 14, maximum = 360) {
  for (let i = 0; i < maximum; i++) {
    const current = state().player;
    if (state().mode !== 'playing') break;
    const dx = x - current.x, dy = y - current.y;
    if (Math.hypot(dx, dy) <= tolerance) { release(); frames(8); return; }
    const needed = new Set();
    if (Math.abs(dx) > 7) needed.add(dx > 0 ? 'KeyD' : 'KeyA');
    if (Math.abs(dy) > 7) needed.add(dy > 0 ? 'KeyS' : 'KeyW');
    for (const code of [...down]) if (!needed.has(code)) key(code, 'keyup');
    for (const code of needed) if (!down.has(code)) key(code, 'keydown');
    frames(1);
  }
  release();
  assert.fail(`Could not steer to ${x},${y}; at ${JSON.stringify(state().player)}`);
}

check('entrypoint: title → Enter → movement → pickup → score and combo', () => {
  frames(1); assert.equal(state().mode, 'title');
  tap('Enter'); assert.equal(state().mode, 'playing'); assert.equal(state().player.lives, 3);
  hold('KeyD', 28); assert(state().player.x > 330); assert.equal(state().player.cargo.type, 0);
  steer(210, 400); steer(210, 208); steer(128, 208);
  assert(state().score >= 100); assert.equal(state().delivered, 1); assert.equal(state().combo, 2);
  assert.equal(state().player.cargo, null);
  assert.equal(storage.get('neon-courier-best'), String(state().score));
  console.log(`  observed score=${state().score}, deliveries=${state().delivered}, combo=${state().combo}`);
});

check('entrypoint: pause freezes world, keyboard resume, dash, and mute', () => {
  tap('KeyP'); assert.equal(state().mode, 'paused'); const time = state().world.time;
  hold('ArrowRight', 60); assert.equal(state().world.time, time);
  tap('KeyP'); assert.equal(state().mode, 'playing');
  key('KeyD', 'keydown'); tap('Space'); assert(state().player.cooldown > 0); release();
  const muted = state().audio.muted; tap('KeyM'); assert.equal(state().audio.muted, !muted);
  tap('KeyM');
});

check('entrypoint: actual traffic collision resets combo, ends run, and R restarts', () => {
  steer(210, 208); steer(210, 400); steer(568, 400);
  let firstHit = null;
  for (let i = 0; i < 18000 && state().mode === 'playing'; i++) {
    const current = state();
    const target = current.world.traffic.reduce((a, b) => Math.hypot(b.x - current.player.x, b.y - current.player.y) < Math.hypot(a.x - current.player.x, a.y - current.player.y) ? b : a);
    const dx = target.x - current.player.x, dy = target.y - current.player.y;
    const needed = new Set();
    if (Math.abs(dx) > 8) needed.add(dx > 0 ? 'KeyD' : 'KeyA');
    if (Math.abs(dy) > 8) needed.add(dy > 0 ? 'KeyS' : 'KeyW');
    for (const code of [...down]) if (!needed.has(code)) key(code, 'keyup');
    for (const code of needed) if (!down.has(code)) key(code, 'keydown');
    frames(1);
    if (!firstHit && state().player.lives < 3) {
      firstHit = state().player.lives; assert.equal(state().combo, 1);
    }
  }
  release(); assert.equal(firstHit, 2); assert.equal(state().mode, 'game-over'); assert.equal(state().player.lives, 0);
  const score = state().score; tap('KeyR');
  assert.equal(state().mode, 'playing'); assert.equal(state().player.lives, 3); assert.equal(state().score, 0);
  assert(state().best >= score);
  console.log(`  observed lives 3→2→0, game-over, R→playing with score 0 and lives 3`);
});

check('every screenshot mode freezes reproducibly and executes its renderer', () => {
  for (const shot of ['start', 'play', 'end']) {
    function fixture() {
      const world = createWorld(1), player = createDrone(); createTraffic(world, player, 1);
      const run = { world, player, mode: 'title', score: 0, best: 0, shift: 1, combo: 1,
        delivered: 0, totalDelivered: 0, elapsed: 0, maxCombo: 1 };
      assert(applyScreenshotState(run, `?shot=${shot}&seed=1`));
      assert.equal(run.frozen, true);
      render(canvasContext, run, { pointer: { x: -1, y: -1 } }, { muted: false });
      return JSON.stringify(run, (key, value) => typeof value === 'function' ? undefined : value);
    }
    assert.equal(fixture(), fixture());
  }
});

// A courier autopilot supplies only synthetic keyboard events. The state remains read-only.
function route(current, target) {
  const spacing = 16, left = 64, top = 152, cols = 73, rows = 29;
  const cell = (x, y) => [Math.max(0, Math.min(cols - 1, Math.round((x - left) / spacing))), Math.max(0, Math.min(rows - 1, Math.round((y - top) / spacing)))];
  const [sx, sy] = cell(current.player.x, current.player.y), [tx, ty] = cell(target.x, target.y);
  const start = sy * cols + sx, end = ty * cols + tx;
  const queue = [start], parent = new Map([[start, -1]]);
  function open(cx, cy) {
    const x = left + cx * spacing, y = top + cy * spacing;
    if (!isOpen(current.world, x, y, 19)) return false;
    if (current.player.invulnerable <= 0 && current.player.cooldown > 0.1 && current.world.traffic.some(drone => Math.hypot(drone.x - x, drone.y - y) < 55)) return false;
    return true;
  }
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head]; if (id === end) break;
    const cx = id % cols, cy = Math.floor(id / cols);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy, next = ny * cols + nx;
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows || parent.has(next)) continue;
      if (!open(nx, ny)) continue;
      parent.set(next, id); queue.push(next);
    }
  }
  if (!parent.has(end)) return [];
  const ids = []; let at = end;
  while (at !== start) { ids.push(at); at = parent.get(at); }
  ids.reverse();
  return ids.map(id => ({ x: left + (id % cols) * spacing, y: top + Math.floor(id / cols) * spacing }));
}

check('entrypoint: ten deliveries award shift bonus and Enter increases traffic', () => {
  let achieved = false;
  for (let attempt = 0; attempt < 5 && !achieved; attempt++) {
    tap('KeyR'); let path = [], targetId = '', nextRoute = 0;
    for (let i = 0; i < 30000 && state().mode === 'playing'; i++) {
      const current = state();
      const target = current.player.cargo ? current.world.pads[current.player.cargo.type] :
        current.world.parcels.reduce((a, b) => !a || Math.hypot(b.x - current.player.x, b.y - current.player.y) < Math.hypot(a.x - current.player.x, a.y - current.player.y) ? b : a, null);
      if (!target) { release(); frames(1); continue; }
      const id = `${target.x}:${target.y}:${current.player.cargo ? 'pad' : 'parcel'}`;
      if (id !== targetId || i >= nextRoute || !path.length) { path = route(current, target); targetId = id; nextRoute = i + 20; }
      while (path.length && Math.hypot(path[0].x - current.player.x, path[0].y - current.player.y) < 10) path.shift();
      const destination = path[0] || (Math.hypot(target.x - current.player.x, target.y - current.player.y) < 40 ? target : null);
      const needed = new Set();
      if (destination) {
        const dx = destination.x - current.player.x, dy = destination.y - current.player.y;
        if (Math.abs(dx) > 4) needed.add(dx > 0 ? 'KeyD' : 'KeyA');
        if (Math.abs(dy) > 4) needed.add(dy > 0 ? 'KeyS' : 'KeyW');
      }
      for (const code of [...down]) if (!needed.has(code)) key(code, 'keyup');
      for (const code of needed) if (!down.has(code)) key(code, 'keydown');
      if (current.player.cooldown <= 0 && needed.size && current.world.traffic.some(drone => Math.hypot(drone.x - current.player.x, drone.y - current.player.y) < 95)) {
        key('Space', 'keydown'); frames(1); key('Space', 'keyup');
      }
      frames(1);
    }
    release();
    if (state().mode === 'shift-complete') {
      achieved = true; assert.equal(state().delivered, 10);
      const completedScore = state().score, oldTraffic = state().world.traffic.length;
      frames(30); assert.equal(state().score, completedScore);
      tap('Enter'); assert.equal(state().mode, 'playing'); assert.equal(state().shift, 2);
      assert.equal(state().delivered, 0); assert.equal(state().world.traffic.length, oldTraffic + 2);
      assert(state().world.traffic.every(drone => drone.speed >= TUNING.trafficSpeed + TUNING.trafficIncrease));
      console.log(`  observed 10/10→shift-complete, score ${completedScore}, Enter→shift 2 with 7 traffic`);
    }
  }
  assert(achieved, 'Keyboard courier reached a shift completion');
});

check('HTML/modules remain offline and all JS parses', () => {
  let entries = 0, bytes = 0;
  function walk(directory) {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name), info = lstatSync(path); entries++;
      assert(!info.isSymbolicLink());
      if (info.isDirectory()) { walk(path); continue; }
      assert(info.isFile()); bytes += info.size;
      const source = readFileSync(path, 'utf8'); assert(!/https?:/.test(source), path);
      if (name.endsWith('.js')) {
        assert.equal(spawnSync(process.execPath, ['--check', path]).status, 0, path);
        for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
          assert(match[1].startsWith('./')); assert(lstatSync(resolve(directory, match[1])).isFile());
        }
      }
    }
  }
  walk(join(root, 'game')); assert(entries <= 993); assert(bytes <= 48 * 1024 * 1024);
  assert(lstatSync(join(root, 'game/index.html')).size <= 1024 * 1024);
  const digest = createHash('sha256').update(readFileSync(join(root, 'vendor/makefun-game.ts'))).digest('hex');
  assert.equal(digest, 'dc67187521b24025ff952f8c231485a6eb92d6d71d29edd2a08154ffb4376129');
  console.log(`  game=${entries} entries, ${bytes} bytes; renderer validated ${drawCalls} drawing calls`);
});

console.log(`${passed.length} checks passed. Simulation and synthetic input only; no browser or screenshot claims.`);
