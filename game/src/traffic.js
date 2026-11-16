import { CITY, TUNING } from './config.js';
import { findSpawnPosition, isOpen } from './world.js';

function turnToward(current, target, maximum) {
  const difference = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + Math.max(-maximum, Math.min(maximum, difference));
}

export function createTraffic(world, player, shift) {
  world.traffic = [];
  const count = Math.min(19, TUNING.trafficStart + (shift - 1) * 2);
  for (let i = 0; i < count; i++) {
    let spot = findSpawnPosition(world, player, 28);
    // Keep the opening wave separated; traffic should be readable individually.
    for (let attempt = 0; attempt < 20 && world.traffic.some(drone =>
      Math.hypot(drone.x - spot.x, drone.y - spot.y) < 65); attempt++) {
      spot = findSpawnPosition(world, player, 28);
    }
    const target = findSpawnPosition(world);
    world.traffic.push({
      id: world.nextId++, ...spot, angle: world.random() * Math.PI * 2,
      target, chasing: false, speed: TUNING.trafficSpeed + (shift - 1) * TUNING.trafficIncrease + world.random() * 18,
      patrolTimer: 2 + world.random() * 3, trail: [], trailTimer: 0,
    });
  }
}

export function updateTraffic(world, player, dt) {
  for (const drone of world.traffic) {
    const distance = Math.hypot(player.x - drone.x, player.y - drone.y);
    drone.chasing = distance < TUNING.chaseRange && player.invulnerable <= 0;
    drone.patrolTimer -= dt;
    if (drone.patrolTimer <= 0 || Math.hypot(drone.x - drone.target.x, drone.y - drone.target.y) < 35) {
      drone.target = findSpawnPosition(world);
      drone.patrolTimer = 2 + world.random() * 3;
    }
    const target = drone.chasing ? player : drone.target;
    const desired = Math.atan2(target.y - drone.y, target.x - drone.x);
    drone.angle = turnToward(drone.angle, desired, TUNING.turnRate * dt);
    const speed = drone.speed * (world.slow > 0 ? 0.5 : 1) * (drone.chasing ? 1.18 : 1);
    const lookX = drone.x + Math.cos(drone.angle) * 38;
    const lookY = drone.y + Math.sin(drone.angle) * 38;
    if (!isOpen(world, lookX, lookY, TUNING.trafficRadius)) {
      const left = drone.angle + Math.PI / 2, right = drone.angle - Math.PI / 2;
      const clearLeft = isOpen(world, drone.x + Math.cos(left) * 42, drone.y + Math.sin(left) * 42, TUNING.trafficRadius);
      drone.angle += (clearLeft ? 1 : -1) * dt * 5;
    }
    const x = drone.x + Math.cos(drone.angle) * speed * dt;
    const y = drone.y + Math.sin(drone.angle) * speed * dt;
    if (isOpen(world, x, y, TUNING.trafficRadius)) { drone.x = x; drone.y = y; }
    else {
      drone.angle += dt * 7;
      drone.patrolTimer = Math.min(drone.patrolTimer, 0.4);
    }
    drone.x = Math.max(CITY.left + 16, Math.min(CITY.right - 16, drone.x));
    drone.y = Math.max(CITY.top + 16, Math.min(CITY.bottom - 16, drone.y));
    drone.trailTimer -= dt;
    if (drone.trailTimer <= 0) {
      drone.trail.push({ x: drone.x, y: drone.y, life: 0.3 });
      drone.trailTimer = 0.07;
    }
    for (const point of drone.trail) point.life -= dt;
    drone.trail = drone.trail.filter(point => point.life > 0);
  }
}

export function touchingTraffic(world, player) {
  return world.traffic.find(drone => Math.hypot(drone.x - player.x, drone.y - player.y) <
    TUNING.playerRadius + TUNING.trafficRadius - 3) || null;
}
