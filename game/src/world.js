import { CITY, COLORS, PARCEL_TYPES, TUNING } from './config.js';
import { createRandom } from './random.js';

export function circleHitsBarrier(x, y, radius, barrier) {
  const nearestX = Math.max(barrier.x, Math.min(x, barrier.x + barrier.w));
  const nearestY = Math.max(barrier.y, Math.min(y, barrier.y + barrier.h));
  return Math.hypot(x - nearestX, y - nearestY) < radius;
}

export function isOpen(world, x, y, radius = 20) {
  return x >= CITY.left + radius && x <= CITY.right - radius &&
    y >= CITY.top + radius && y <= CITY.bottom - radius &&
    !world.barriers.some(barrier => circleHitsBarrier(x, y, radius, barrier));
}

export function createWorld(seed = 1) {
  const world = {
    random: createRandom(seed), effectsRandom: createRandom(seed ^ 0xf097),
    time: 0, nextId: 1, parcelTimer: TUNING.parcelInterval, powerTimer: 9,
    parcels: [], powerups: [], particles: [], popups: [], rings: [], traffic: [],
    slow: 0, magnet: 0, shake: 0,
    pads: [
      { x: 128, y: 208, type: 0 },
      { x: 1152, y: 208, type: 1 },
      { x: 1152, y: 560, type: 2 },
    ],
    barriers: [
      { x: 288, y: 240, w: 144, h: 80, name: 'HAB / 01' },
      { x: 528, y: 168, w: 176, h: 88, name: 'RELAY / 02' },
      { x: 848, y: 264, w: 136, h: 88, name: 'HAB / 03' },
      { x: 352, y: 488, w: 176, h: 80, name: 'DEPOT / 04' },
      { x: 640, y: 424, w: 136, h: 112, name: 'CORE / 05' },
      { x: 944, y: 464, w: 80, h: 128, name: 'HAB / 06' },
    ],
  };
  // The first job is close and the path to its pad is unobstructed.
  world.parcels.push({ id: world.nextId++, x: 360, y: 400, type: 0, age: 0 });
  spawnParcel(world, { x: 752, y: 336, type: 1 });
  spawnParcel(world, { x: 1088, y: 400, type: 2 });
  return world;
}

export function findSpawnPosition(world, player, radius = 28) {
  for (let attempt = 0; attempt < 150; attempt++) {
    const x = 88 + Math.floor(world.random() * 28) * CITY.grid;
    const y = 176 + Math.floor(world.random() * 11) * CITY.grid;
    if (!isOpen(world, x, y, radius)) continue;
    if (world.pads.some(p => Math.hypot(p.x - x, p.y - y) < 76)) continue;
    if (world.parcels.some(p => Math.hypot(p.x - x, p.y - y) < 60)) continue;
    if (world.powerups.some(p => Math.hypot(p.x - x, p.y - y) < 60)) continue;
    if (player && Math.hypot(player.x - x, player.y - y) < 150) continue;
    return { x, y };
  }
  return { x: 568, y: 352 };
}

export function spawnParcel(world, fixed = null) {
  if (world.parcels.length >= TUNING.parcelLimit) return;
  const spot = fixed || findSpawnPosition(world);
  world.parcels.push({
    id: world.nextId++, ...spot,
    type: spot.type ?? Math.floor(world.random() * PARCEL_TYPES.length), age: 0,
  });
}

export function spawnPowerup(world, player) {
  if (world.powerups.length >= 2) return;
  const kind = ['SHIELD', 'SLOW', 'MAGNET'][Math.floor(world.random() * 3)];
  world.powerups.push({ ...findSpawnPosition(world, player), kind, age: 0, id: world.nextId++ });
}

export function burst(world, x, y, color, count = 22, speed = 130) {
  for (let i = 0; i < count; i++) {
    const angle = world.effectsRandom() * Math.PI * 2;
    const velocity = speed * (0.3 + world.effectsRandom());
    const life = 0.35 + world.effectsRandom() * 0.6;
    world.particles.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity,
      life, maxLife: life, color, size: 1.5 + world.effectsRandom() * 3 });
  }
  world.rings.push({ x, y, color, life: 0.6, maxLife: 0.6 });
  if (world.particles.length > 380) world.particles.splice(0, world.particles.length - 380);
}

export function popup(world, x, y, text, color = COLORS.white) {
  world.popups.push({ x, y, text, color, life: 1.3 });
  if (world.popups.length > 24) world.popups.shift();
}

export function updateEffects(world, dt) {
  world.shake = Math.max(0, world.shake - dt * 20);
  for (const p of world.particles) {
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= Math.exp(-dt * 2); p.vy *= Math.exp(-dt * 2);
  }
  for (const p of world.popups) { p.life -= dt; p.y -= dt * 28; }
  for (const ring of world.rings) ring.life -= dt;
  world.particles = world.particles.filter(p => p.life > 0);
  world.popups = world.popups.filter(p => p.life > 0);
  world.rings = world.rings.filter(p => p.life > 0);
}

export function updateWorld(world, player, shift, dt) {
  world.time += dt;
  world.slow = Math.max(0, world.slow - dt);
  world.magnet = Math.max(0, world.magnet - dt);
  world.parcelTimer -= dt;
  world.powerTimer -= dt;
  if (world.parcelTimer <= 0) {
    spawnParcel(world);
    world.parcelTimer = Math.max(1.4, TUNING.parcelInterval - (shift - 1) * 0.3);
  }
  if (world.powerTimer <= 0) {
    spawnPowerup(world, player);
    world.powerTimer = Math.max(8, TUNING.powerInterval - shift * 0.4);
  }
  for (const parcel of world.parcels) {
    parcel.age += dt;
    if (world.magnet > 0 && !player.cargo) {
      const dx = player.x - parcel.x, dy = player.y - parcel.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 1 && distance < TUNING.magnetRange) {
        const step = Math.min(distance, 145 * dt);
        const x = parcel.x + dx / distance * step, y = parcel.y + dy / distance * step;
        if (isOpen(world, x, y, 12)) { parcel.x = x; parcel.y = y; }
      }
    }
  }
  for (const power of world.powerups) power.age += dt;
  world.powerups = world.powerups.filter(power => power.age < 16);
  updateEffects(world, dt);
}

export function collectParcel(world, player) {
  if (player.cargo || player.pickupLock > 0) return null;
  const index = world.parcels.findIndex(p => Math.hypot(player.x - p.x, player.y - p.y) < TUNING.pickupRadius);
  if (index < 0) return null;
  const parcel = world.parcels.splice(index, 1)[0];
  player.cargo = { ...parcel, pickedAt: world.time };
  burst(world, player.x, player.y, PARCEL_TYPES[parcel.type].color);
  popup(world, player.x, player.y - 30, 'PICKUP', PARCEL_TYPES[parcel.type].color);
  return parcel;
}

export function matchingDelivery(world, player) {
  if (!player.cargo) return null;
  return world.pads.find(p => p.type === player.cargo.type &&
    Math.hypot(player.x - p.x, player.y - p.y) < TUNING.deliveryRadius) || null;
}

export function collectPowerups(world, player) {
  const index = world.powerups.findIndex(p => Math.hypot(player.x - p.x, player.y - p.y) < 30);
  if (index < 0) return null;
  const power = world.powerups.splice(index, 1)[0];
  if (power.kind === 'SHIELD') player.shield = true;
  if (power.kind === 'SLOW') world.slow = TUNING.powerDuration;
  if (power.kind === 'MAGNET') world.magnet = TUNING.powerDuration;
  burst(world, player.x, player.y, COLORS.cyan, 28);
  popup(world, player.x, player.y - 28, power.kind, COLORS.cyan);
  return power;
}
