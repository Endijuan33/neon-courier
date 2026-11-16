import { CITY, COLORS, TUNING } from './config.js';
import { isOpen, burst, popup } from './world.js';

export function createDrone() {
  return {
    x: 240, y: 400, vx: 0, vy: 0, angle: 0,
    direction: { x: 1, y: 0 }, lives: 3, shield: false, cargo: null,
    invulnerable: TUNING.startGrace, dash: 0, cooldown: 0, pickupLock: 0, trail: [], trailTimer: 0,
  };
}

export function startDash(drone, movement, world) {
  if (drone.cooldown > 0) return false;
  if (movement.x || movement.y) drone.direction = { ...movement };
  drone.dash = TUNING.dashDuration;
  drone.cooldown = TUNING.dashCooldown;
  burst(world, drone.x, drone.y, COLORS.cyan, 9, 80);
  return true;
}

export function moveDrone(drone, movement, world, dt) {
  drone.cooldown = Math.max(0, drone.cooldown - dt);
  drone.invulnerable = Math.max(0, drone.invulnerable - dt);
  const dashing = drone.dash > 0;
  if (!dashing && (movement.x || movement.y)) drone.direction = { ...movement };
  const direction = dashing ? drone.direction : movement;
  const speed = dashing ? TUNING.dashSpeed : TUNING.speed;
  const response = dashing ? 1 : 1 - Math.exp(-TUNING.acceleration * dt);
  drone.vx += (direction.x * speed - drone.vx) * response;
  drone.vy += (direction.y * speed - drone.vy) * response;
  if (Math.hypot(drone.vx, drone.vy) > 6) drone.angle = Math.atan2(drone.vy, drone.vx);
  // Small swept steps keep a dash from tunnelling through a narrow wall.
  const steps = Math.max(1, Math.ceil(Math.hypot(drone.vx, drone.vy) * dt / 5));
  for (let i = 0; i < steps; i++) {
    const nextX = drone.x + drone.vx * dt / steps;
    if (isOpen(world, nextX, drone.y, TUNING.playerRadius)) drone.x = nextX;
    else drone.vx = 0;
    const nextY = drone.y + drone.vy * dt / steps;
    if (isOpen(world, drone.x, nextY, TUNING.playerRadius)) drone.y = nextY;
    else drone.vy = 0;
  }
  drone.dash = Math.max(0, drone.dash - dt);
  drone.trailTimer -= dt;
  if (drone.trailTimer <= 0) {
    drone.trail.push({ x: drone.x, y: drone.y, angle: drone.angle, life: dashing ? 0.4 : 0.26, dash: dashing });
    drone.trailTimer = dashing ? 0.012 : 0.028;
  }
  for (const point of drone.trail) point.life -= dt;
  drone.trail = drone.trail.filter(point => point.life > 0);
}

export function hitDrone(drone, world, traffic) {
  if (drone.invulnerable > 0 || drone.dash > 0) return 'immune';
  drone.invulnerable = TUNING.hitGrace;
  const dx = drone.x - traffic.x, dy = drone.y - traffic.y;
  const length = Math.hypot(dx, dy) || 1;
  drone.vx = dx / length * 170; drone.vy = dy / length * 170;
  if (drone.shield) {
    drone.shield = false;
    burst(world, drone.x, drone.y, COLORS.cyan, 32, 200);
    popup(world, drone.x, drone.y - 30, 'SHIELD SAVE', COLORS.cyan);
    return 'shield';
  }
  drone.lives--;
  drone.pickupLock = TUNING.droppedPickupDelay;
  world.shake = 9;
  burst(world, drone.x, drone.y, COLORS.red, 42, 230);
  popup(world, drone.x, drone.y - 28, 'HIT · COMBO LOST', COLORS.red);
  if (drone.cargo) {
    world.parcels.push({ ...drone.cargo, x: drone.x, y: drone.y, age: 0 });
    drone.cargo = null;
  }
  return 'hit';
}

export function safeRespawn(drone, world) {
  drone.x = CITY.left + 192; drone.y = 400;
  drone.vx = 0; drone.vy = 0; drone.dash = 0; drone.cooldown = 0;
  drone.invulnerable = TUNING.startGrace; drone.trail = [];
  drone.pickupLock = 0;
}
