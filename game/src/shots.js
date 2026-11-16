import { COLORS, PARCEL_TYPES } from './config.js';
import { burst, popup } from './world.js';

export function applyScreenshotState(run, search) {
  const shot = new URLSearchParams(search).get('shot');
  if (!['start', 'play', 'end'].includes(shot)) return false;
  run.frozen = true;
  run.best = 12850;
  run.world.time = 24;
  run.player.invulnerable = 0;
  run.player.pickupLock = 0;
  if (shot === 'start') return true;
  run.mode = shot === 'play' ? 'playing' : 'game-over';
  run.score = shot === 'play' ? 7450 : 12850;
  run.combo = shot === 'play' ? 5 : 1;
  run.shift = shot === 'play' ? 2 : 3;
  run.delivered = shot === 'play' ? 7 : 4;
  run.totalDelivered = shot === 'play' ? 17 : 24;
  run.elapsed = shot === 'play' ? 92 : 164;
  run.maxCombo = 6;
  run.player.lives = shot === 'play' ? 2 : 0;
  run.player.x = 818; run.player.y = 396;
  run.player.angle = -0.15;
  run.player.direction = { x: Math.cos(-0.15), y: Math.sin(-0.15) };
  run.player.cargo = { type: 2, pickedAt: 21, x: 818, y: 396, id: 501 };
  run.player.shield = shot === 'play';
  run.player.dash = 0.1; run.player.cooldown = 1.1;
  run.world.magnet = 4.2;
  run.world.parcels = [
    { x: 248, y: 360, type: 0, id: 101, age: 8 },
    { x: 568, y: 352, type: 1, id: 102, age: 4 },
    { x: 872, y: 552, type: 2, id: 103, age: 7 },
    { x: 1080, y: 384, type: 1, id: 104, age: 5 },
    { x: 584, y: 592, type: 0, id: 105, age: 3 },
  ];
  run.world.powerups = [{ x: 488, y: 432, kind: 'SLOW', age: 3, id: 202 }];
  run.world.traffic = [
    [448, 376, 0.12, true], [1008, 384, 2.8, true], [744, 296, 1.7, true],
    [264, 576, -0.3, false], [1080, 168, 2.2, false], [824, 592, -2.4, false], [560, 424, 0.5, false],
  ].map(([x, y, angle, chasing], i) => ({
    x, y, angle, chasing, speed: 100, id: i + 300, target: { x: 1000, y: 400 }, patrolTimer: 3,
    trail: Array.from({ length: 6 }, (_, n) => ({ x: x - Math.cos(angle) * n * 9, y: y - Math.sin(angle) * n * 9, life: 0.3 - n * 0.04 })),
  }));
  run.player.trail = Array.from({ length: 16 }, (_, i) => ({
    x: 818 - i * 9, y: 396 + i * 2, angle: -0.15, life: 0.4 - i * 0.02, dash: true,
  }));
  burst(run.world, 748, 406, PARCEL_TYPES[2].color, 30, 170);
  for (const particle of run.world.particles) { particle.x += particle.vx * 0.18; particle.y += particle.vy * 0.18; }
  popup(run.world, 128, 258, '+500', COLORS.magenta);
  run.banner = 'PERFECT DELIVERY · COMBO ×5'; run.bannerTime = 2;
  if (shot === 'end') { run.player.cargo = null; run.player.shield = false; run.player.dash = 0; }
  return true;
}
