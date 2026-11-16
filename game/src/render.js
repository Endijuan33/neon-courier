import { VIEW, CITY, COLORS as C, PARCEL_TYPES, TUNING } from './config.js';

const FONT = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const MONO = 'ui-monospace, "DejaVu Sans Mono", monospace';

function text(ctx, value, x, y, size = 16, color = C.white, weight = 500, align = 'left', mono = false) {
  ctx.fillStyle = color; ctx.font = `${weight} ${size}px ${mono ? MONO : FONT}`;
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(value, x, y);
}

function box(ctx, x, y, w, h, fill, stroke = null, radius = 8) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

function line(ctx, x1, y1, x2, y2, color, width = 1) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}

function circle(ctx, x, y, radius, fill, stroke = null, width = 1) {
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}

function glow(ctx, x, y, radius, color, alpha = 0.13) {
  ctx.save(); ctx.globalAlpha *= alpha;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color); gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2); ctx.restore();
}

function arrow(ctx, x, y, angle, color, size = 8) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.beginPath(); ctx.moveTo(-size, -size * 0.6); ctx.lineTo(0, 0); ctx.lineTo(-size, size * 0.6);
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
}

export function drawDrone(ctx, x, y, angle, scale = 1, color = C.cyan, enemy = false) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
  ctx.shadowColor = color; ctx.shadowBlur = enemy ? 8 : 12;
  for (const [dx, dy] of [[-12, -13], [12, -13], [-12, 13], [12, 13]]) {
    line(ctx, 0, 0, dx, dy, color, 2);
    circle(ctx, dx, dy, 5, '#0c182a', color, 1.5);
    line(ctx, dx - 3, dy, dx + 3, dy, color, 1);
  }
  ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(2, -8); ctx.lineTo(-10, -6);
  ctx.lineTo(-13, 0); ctx.lineTo(-10, 6); ctx.lineTo(2, 8); ctx.closePath();
  ctx.fillStyle = enemy ? '#742338' : '#134751'; ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 1.7; ctx.stroke();
  ctx.shadowBlur = 0;
  box(ctx, -2, -3, 8, 6, color, null, 2);
  line(ctx, -19, -4, -12, -4, color, 2); line(ctx, -19, 4, -12, 4, color, 2);
  ctx.restore();
}

export function drawParcel(ctx, x, y, type, scale = 1, time = 0) {
  const info = PARCEL_TYPES[type];
  const bob = Math.sin(time * 2.6 + x * 0.01) * 3;
  glow(ctx, x, y + bob, 46 * scale, info.color, 0.16);
  ctx.save(); ctx.translate(x, y + bob); ctx.scale(scale, scale);
  ctx.shadowColor = info.color; ctx.shadowBlur = 12;
  if (type === 0) {
    ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(13, 0); ctx.lineTo(0, 13); ctx.lineTo(-13, 0); ctx.closePath();
  } else if (type === 1) {
    ctx.beginPath(); ctx.roundRect(-11, -11, 22, 22, 3);
  } else {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * i;
      if (i === 0) ctx.moveTo(Math.cos(a) * 13, Math.sin(a) * 13);
      else ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13);
    }
    ctx.closePath();
  }
  ctx.fillStyle = info.color; ctx.globalAlpha *= 0.15; ctx.fill(); ctx.globalAlpha /= 0.15;
  ctx.strokeStyle = info.color; ctx.lineWidth = 2; ctx.stroke(); ctx.shadowBlur = 0;
  text(ctx, info.symbol, 0, 4, 11, info.color, 800, 'center', true);
  ctx.restore();
}

export function drawGrid(ctx, world) {
  ctx.fillStyle = C.background; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const background = ctx.createLinearGradient(0, CITY.top, 0, CITY.bottom);
  background.addColorStop(0, '#0b1327'); background.addColorStop(1, '#090f20');
  box(ctx, CITY.left, CITY.top, CITY.right - CITY.left, CITY.bottom - CITY.top, background, '#26314a', 12);
  ctx.save();
  ctx.beginPath(); ctx.roundRect(CITY.left, CITY.top, CITY.right - CITY.left, CITY.bottom - CITY.top, 12); ctx.clip();
  for (let x = CITY.left; x <= CITY.right; x += CITY.grid) line(ctx, x, CITY.top, x, CITY.bottom, '#17243b');
  for (let y = CITY.top; y <= CITY.bottom; y += CITY.grid) line(ctx, CITY.left, y, CITY.right, y, '#17243b');
  for (let x = 88; x < CITY.right; x += 160) {
    for (let y = 176; y < CITY.bottom; y += 80) {
      line(ctx, x - 3, y, x + 3, y, '#2c3a53'); line(ctx, x, y - 3, x, y + 3, '#2c3a53');
    }
  }
  // The broad avenues stay understated so traffic and cargo stay legible.
  ctx.setLineDash([10, 18]);
  line(ctx, 64, 400, 1216, 400, '#2a3650', 1);
  line(ctx, 800, 150, 800, 610, '#2a3650', 1);
  ctx.setLineDash([]);
  glow(ctx, 128, 208, 150, C.magenta, 0.065);
  glow(ctx, 1152, 208, 150, C.yellow, 0.05);
  glow(ctx, 1152, 560, 160, C.cyan, 0.07);
  const sweep = CITY.left + ((world.time * 32) % (CITY.right - CITY.left));
  line(ctx, sweep, CITY.top, sweep, CITY.bottom, '#5cf3ed06', 24);
  ctx.restore();
  text(ctx, 'SECTOR 07 / AFTER HOURS', 48, 117, 12, C.muted, 600, 'left', true);
  text(ctx, `AIR TRAFFIC / ${String(world.traffic.length).padStart(2, '0')} ACTIVE`, 1232, 117, 12, C.muted, 600, 'right', true);
}

function drawBarrier(ctx, barrier, index) {
  const { x, y, w, h } = barrier;
  box(ctx, x + 5, y + 7, w, h, '#020611', null, 5);
  box(ctx, x, y, w, h, '#111c32', '#344360', 5);
  box(ctx, x + 6, y + 6, w - 12, h - 12, '#142038', '#233552', 3);
  const accent = index % 2 === 0 ? '#456c99' : '#674a81';
  line(ctx, x + 12, y, x + w - 12, y, accent, 2);
  for (let wx = x + 15; wx < x + w - 14; wx += 20) {
    for (let wy = y + 19; wy < y + h - 25; wy += 17) {
      box(ctx, wx, wy, 9, 4, ((wx + wy) % 3) === 0 ? '#436986' : '#263d57', null, 1);
    }
  }
  text(ctx, barrier.name, x + 12, y + h - 12, 10, '#7790b0', 600, 'left', true);
  line(ctx, x + w - 13, y + h - 18, x + w - 6, y + h - 18, accent, 2);
}

export function drawPad(ctx, pad, active, time) {
  const info = PARCEL_TYPES[pad.type];
  glow(ctx, pad.x, pad.y, active ? 110 : 65, info.color, active ? 0.19 : 0.08);
  ctx.save(); ctx.translate(pad.x, pad.y);
  box(ctx, -32, -32, 64, 64, '#0c1628', info.color + (active ? 'ee' : '66'), 12);
  box(ctx, -25, -25, 50, 50, null, info.color + '35', 8);
  for (const [x, y, dx, dy] of [[-34, -34, 1, 1], [34, -34, -1, 1], [-34, 34, 1, -1], [34, 34, -1, -1]]) {
    line(ctx, x, y, x + dx * 12, y, info.color, 2); line(ctx, x, y, x, y + dy * 12, info.color, 2);
  }
  if (active) {
    const radius = 40 + Math.sin(time * 4) * 4;
    circle(ctx, 0, 0, radius, null, info.color + 'aa', 1.5);
    ctx.save(); ctx.rotate(time * 0.4);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2); arrow(ctx, -45, 0, 0, info.color, 7);
    }
    ctx.restore();
  }
  text(ctx, info.symbol, 0, 10, 29, info.color, 700, 'center', true);
  text(ctx, active ? 'DELIVER HERE' : `${info.name} / DROP`, 0, 57, 11, info.color, 700, 'center', true);
  ctx.restore();
}

function drawPowerup(ctx, power, time) {
  const bob = Math.sin(time * 3 + power.x) * 3;
  ctx.save(); ctx.translate(power.x, power.y + bob);
  glow(ctx, 0, 0, 50, C.cyan, 0.1);
  box(ctx, -16, -16, 32, 32, '#0a272d', C.cyan, 8);
  if (power.kind === 'SHIELD') {
    ctx.beginPath(); ctx.moveTo(-7, -7); ctx.lineTo(7, -7); ctx.lineTo(7, 1); ctx.lineTo(0, 9); ctx.lineTo(-7, 1); ctx.closePath();
    ctx.strokeStyle = C.cyan; ctx.lineWidth = 2; ctx.stroke();
  } else if (power.kind === 'SLOW') {
    circle(ctx, 0, 0, 8, null, C.cyan, 1.5); line(ctx, 0, 0, 0, -5, C.cyan, 2); line(ctx, 0, 0, 5, 3, C.cyan, 2);
  } else {
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI); ctx.lineTo(-8, -6); ctx.moveTo(8, 0); ctx.lineTo(8, -6);
    ctx.strokeStyle = C.cyan; ctx.lineWidth = 3; ctx.stroke();
  }
  text(ctx, power.kind, 0, 32, 10, C.cyan, 700, 'center', true);
  ctx.restore();
}

function drawTraffic(ctx, drone, slow) {
  const color = slow ? '#b282ff' : drone.chasing ? C.red : C.orange;
  for (const p of drone.trail) {
    ctx.save(); ctx.globalAlpha = p.life * 0.45; circle(ctx, p.x, p.y, 4, color); ctx.restore();
  }
  glow(ctx, drone.x, drone.y, 40, color, 0.1);
  drawDrone(ctx, drone.x, drone.y, drone.angle, 0.9, color, true);
  if (drone.chasing) {
    text(ctx, '!', drone.x, drone.y - 27, 14, C.red, 900, 'center', true);
  }
}

function drawPlayer(ctx, drone, world) {
  for (const p of drone.trail) {
    ctx.save(); ctx.globalAlpha = Math.max(0, p.life * (p.dash ? 0.8 : 0.4));
    if (p.dash) {
      // A narrow ribbon keeps the courier silhouette clear during a long dash.
      line(ctx, p.x - Math.cos(p.angle) * 14, p.y - Math.sin(p.angle) * 14,
        p.x + Math.cos(p.angle) * 6, p.y + Math.sin(p.angle) * 6, C.cyan, 5);
    }
    else circle(ctx, p.x, p.y, 5, C.cyan);
    ctx.restore();
  }
  if (world.magnet > 0) {
    circle(ctx, drone.x, drone.y, TUNING.magnetRange, null, '#5cf3ed20');
    ctx.save(); ctx.setLineDash([3, 18]); circle(ctx, drone.x, drone.y, 68, null, '#5cf3ed65'); ctx.restore();
  }
  if (drone.dash > 0) {
    for (let i = -1; i <= 1; i++) {
      const nx = Math.cos(drone.angle + Math.PI / 2) * i * 18;
      const ny = Math.sin(drone.angle + Math.PI / 2) * i * 18;
      line(ctx, drone.x + nx - Math.cos(drone.angle) * 65, drone.y + ny - Math.sin(drone.angle) * 65,
        drone.x + nx - Math.cos(drone.angle) * 24, drone.y + ny - Math.sin(drone.angle) * 24, '#5cf3ed99', 2);
    }
  }
  if (drone.shield) {
    glow(ctx, drone.x, drone.y, 65, C.cyan, 0.15);
    circle(ctx, drone.x, drone.y, 30, '#5cf3ed09', C.cyan + 'aa', 1.5);
    circle(ctx, drone.x, drone.y, 34, null, C.cyan + '35');
  }
  const blink = drone.invulnerable > 0 && Math.floor(world.time * 12) % 2 === 0;
  ctx.save(); if (blink) ctx.globalAlpha = 0.48;
  glow(ctx, drone.x, drone.y, 58, C.cyan, 0.16);
  if (drone.cargo) {
    line(ctx, drone.x, drone.y + 8, drone.x, drone.y + 24, PARCEL_TYPES[drone.cargo.type].color + 'aa');
    drawParcel(ctx, drone.x, drone.y + 31, drone.cargo.type, 0.7, 0);
  }
  drawDrone(ctx, drone.x, drone.y, drone.angle, 1.1); ctx.restore();
  text(ctx, 'YOU', drone.x, drone.y - 40, 10, C.cyan, 800, 'center', true);
}

function drawParticles(ctx, world) {
  for (const ring of world.rings) {
    ctx.save(); ctx.globalAlpha = ring.life / ring.maxLife * 0.65;
    circle(ctx, ring.x, ring.y, (1 - ring.life / ring.maxLife) * 65 + 10, null, ring.color, 2); ctx.restore();
  }
  for (const p of world.particles) {
    ctx.save(); ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    line(ctx, p.x, p.y, p.x - p.vx * 0.025, p.y - p.vy * 0.025, p.color, p.size); ctx.restore();
  }
  for (const p of world.popups) {
    ctx.save(); ctx.globalAlpha = Math.min(1, p.life * 2);
    ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
    text(ctx, p.text, p.x, p.y, 18, p.color, 800, 'center', true); ctx.restore();
  }
}

export function drawCity(ctx, run) {
  const { world, player } = run;
  drawGrid(ctx, world);
  ctx.save();
  const shake = world.shake;
  if (shake) ctx.translate(Math.sin(world.time * 173) * shake, Math.cos(world.time * 139) * shake * 0.6);
  for (const pad of world.pads) drawPad(ctx, pad, player.cargo?.type === pad.type, world.time);
  world.barriers.forEach((b, i) => drawBarrier(ctx, b, i));
  for (const parcel of world.parcels) drawParcel(ctx, parcel.x, parcel.y, parcel.type, 1, world.time);
  for (const power of world.powerups) drawPowerup(ctx, power, world.time);
  for (const drone of world.traffic) drawTraffic(ctx, drone, world.slow > 0);
  drawPlayer(ctx, player, world);
  drawParticles(ctx, world); ctx.restore();
}

function drawDashBar(ctx, drone, x, y, w = 142) {
  const fraction = Math.max(0, 1 - drone.cooldown / TUNING.dashCooldown);
  text(ctx, 'DASH', x, y - 12, 11, C.muted, 700, 'left', true);
  text(ctx, drone.cooldown <= 0 ? 'READY' : `${drone.cooldown.toFixed(1)}s`, x + w, y - 12, 11, drone.cooldown <= 0 ? C.cyan : C.muted, 700, 'right', true);
  box(ctx, x, y, w, 6, '#24334b', null, 3);
  if (fraction > 0) box(ctx, x, y, w * fraction, 6, C.cyan, null, 3);
}

export function drawHUD(ctx, run, audio) {
  box(ctx, 0, 0, 1280, 91, '#0b1122', null, 0);
  line(ctx, 48, 90, 1232, 90, '#2b3751');
  const columns = [48, 264, 452, 630, 824, 958];
  const labels = ['SCORE', 'BEST', 'COMBO', 'LIVES', 'SHIFT', 'DELIVERIES'];
  labels.forEach((value, i) => text(ctx, value, columns[i], 30, 11, C.muted, 700, 'left', true));
  text(ctx, String(run.score).padStart(6, '0'), 48, 69, 34, C.white, 750, 'left', true);
  text(ctx, String(run.best).padStart(6, '0'), 264, 67, 26, '#a1b5d0', 500, 'left', true);
  text(ctx, `×${run.combo}`, 452, 69, 34, run.combo >= 3 ? C.yellow : C.cyan, 700, 'left', true);
  if (run.combo >= 3) text(ctx, 'HOT', 526, 63, 10, C.yellow, 800, 'left', true);
  for (let i = 0; i < 3; i++) drawDrone(ctx, 647 + i * 44, 58, 0, 0.7, i < run.player.lives ? C.cyan : '#2d3a50');
  text(ctx, String(run.shift).padStart(2, '0'), 824, 69, 34, C.white, 600, 'left', true);
  text(ctx, `${String(run.delivered).padStart(2, '0')}/10`, 958, 64, 26, C.white, 600, 'left', true);
  for (let i = 0; i < 10; i++) box(ctx, 958 + i * 11, 74, 8, 3, i < run.delivered ? C.cyan : '#2b3850', null, 1);
  text(ctx, audio.muted ? 'OFF' : 'SFX', 1195, 60, 10, audio.muted ? C.muted : C.cyan, 700, 'center', true);
  text(ctx, 'P', 1133, 63, 14, C.muted, 700, 'center', true);
  text(ctx, 'M', 1195, 34, 13, C.muted, 700, 'center', true);
  line(ctx, 48, 641, 1232, 641, '#27344c');
  let mission = 'COLLECT A PARCEL';
  let description = 'Match its letter & color to a drop-pad. Deliver 10 to finish the shift.';
  let color = C.cyan;
  if (run.player.cargo) {
    const parcel = PARCEL_TYPES[run.player.cargo.type]; color = parcel.color;
    mission = `CARGO ${parcel.symbol} · ${parcel.name} → MATCHING PAD`;
    description = 'Follow the glowing destination. Dash through traffic. Keep the combo alive.';
  }
  box(ctx, 48, 656, 4, 40, color, null, 2);
  text(ctx, mission, 65, 669, 13, color, 750, 'left', true);
  text(ctx, description, 65, 692, 12, C.muted, 500);
  let statusX = 760;
  const statuses = [];
  if (run.player.shield) statuses.push(['SHIELD', null]);
  if (run.world.slow > 0) statuses.push(['SLOW', run.world.slow]);
  if (run.world.magnet > 0) statuses.push(['MAGNET', run.world.magnet]);
  statuses.forEach(([name, seconds]) => {
    box(ctx, statusX, 659, 94, 35, '#102c32', '#25575d', 6);
    text(ctx, name, statusX + 47, 673, 10, C.cyan, 700, 'center', true);
    text(ctx, seconds === null ? '1 HIT' : `${seconds.toFixed(1)}s`, statusX + 47, 687, 10, C.muted, 600, 'center', true);
    statusX += 103;
  });
  drawDashBar(ctx, run.player, 1090, 681);
  if (run.bannerTime > 0 && run.mode === 'playing') {
    const width = 408;
    box(ctx, 640 - width / 2, 102, width, 28, '#112333', '#2c5360', 6);
    text(ctx, run.banner, 640, 121, 12, C.cyan, 750, 'center', true);
  }
  if (run.mode === 'playing' && !run.frozen && run.elapsed < 7) {
    box(ctx, 69, 433, 240, 33, '#0b1d30eb', '#2b5362', 6);
    text(ctx, 'WASD / ARROWS → FIRST PARCEL', 189, 454, 11, C.cyan, 700, 'center', true);
  }
}

function drawKey(ctx, label, x, y, w = 34) {
  box(ctx, x, y, w, 30, '#15213a', '#3a4760', 5);
  text(ctx, label, x + w / 2, y + 21, 12, '#d4e3f7', 650, 'center', true);
}

export function menuButtons(run, audio) {
  const mute = { action: 'mute', label: audio.muted ? 'Unmute sound (M)' : 'Mute sound (M)', x: 1172, y: 15, w: 46, h: 58, quiet: true };
  if (run.mode === 'title') return [
    { action: 'start', label: 'Start shift', x: 80, y: 400, w: 296, h: 58, primary: true },
    { ...mute, x: 1146, y: 31, w: 70, h: 35 },
  ];
  if (run.mode === 'playing') return [
    { action: 'pause', label: 'Pause (P)', x: 1111, y: 22, w: 44, h: 51, quiet: true }, mute,
  ];
  const action = run.mode === 'paused' ? 'resume' : run.mode === 'shift-complete' ? 'next' : 'restart';
  const label = run.mode === 'paused' ? 'Resume flight' : run.mode === 'shift-complete' ? 'Next shift' : 'Restart run';
  return [
    { action, label, x: 445, y: 503, w: 390, h: 56, primary: true },
    { action: 'title', label: 'Back to title', x: 520, y: 580, w: 240, h: 33, secondary: true }, mute,
  ];
}

function drawButton(ctx, button, pointer, shortcut = '') {
  if (button.quiet) return;
  const hover = pointer.x >= button.x && pointer.x <= button.x + button.w && pointer.y >= button.y && pointer.y <= button.y + button.h;
  if (button.secondary) {
    text(ctx, button.label.toUpperCase(), button.x + button.w / 2, button.y + 23, 12, hover ? C.white : C.muted, 650, 'center', true);
    return;
  }
  glow(ctx, button.x + button.w / 2, button.y + button.h / 2, 170, C.cyan, 0.05);
  box(ctx, button.x, button.y, button.w, button.h, hover ? '#a5fff8' : C.cyan, null, 8);
  text(ctx, button.label.toUpperCase(), button.x + 24, button.y + 36, 16, '#092127', 800, 'left', true);
  text(ctx, shortcut || 'ENTER ↵', button.x + button.w - 22, button.y + 35, 11, '#20535a', 700, 'right', true);
}

export function drawTitle(ctx, run, input, audio) {
  drawGrid(ctx, run.world);
  ctx.fillStyle = '#070b19a8'; ctx.fillRect(0, 0, 1280, 720);
  glow(ctx, 970, 360, 410, C.cyan, 0.07);
  glow(ctx, 730, 160, 280, C.magenta, 0.08);
  text(ctx, 'N / C', 80, 58, 19, C.cyan, 800, 'left', true);
  text(ctx, 'MIDNIGHT DELIVERY SERVICE', 172, 57, 11, C.muted, 700, 'left', true);
  text(ctx, 'SOUND', 1091, 54, 10, C.muted, 600, 'left', true);
  text(ctx, audio.muted ? '[M] OFF' : '[M] ON', 1210, 54, 11, C.cyan, 700, 'right', true);
  line(ctx, 80, 82, 1200, 82, '#28344b');
  box(ctx, 80, 137, 160, 28, '#241a35', '#624069', 4);
  text(ctx, 'THE CITY NEVER SLEEPS', 160, 155, 10, C.magenta, 750, 'center', true);
  ctx.save(); ctx.shadowColor = C.cyan; ctx.shadowBlur = 23;
  text(ctx, 'NEON', 74, 257, 104, C.cyan, 850); ctx.restore();
  text(ctx, 'COURIER', 74, 339, 82, C.white, 850);
  text(ctx, 'One drone. Ten deliveries. No brakes.', 80, 378, 19, '#afc0d8', 450);
  const start = menuButtons(run, audio)[0]; drawButton(ctx, start, input.pointer);
  text(ctx, 'COLLECT. MATCH. OUTFLY THE CITY.', 80, 491, 11, C.muted, 700, 'left', true);

  // A diagram drawn with the same parcel, pad and drone renderers as the live game.
  ctx.save(); ctx.beginPath(); ctx.roundRect(692, 129, 508, 399, 18); ctx.clip();
  box(ctx, 692, 129, 508, 399, '#0d172b', '#273b55', 18);
  for (let x = 692; x < 1200; x += 32) line(ctx, x, 129, x, 528, '#1a2d44');
  for (let y = 129; y < 528; y += 32) line(ctx, 692, y, 1200, y, '#1a2d44');
  glow(ctx, 980, 350, 210, C.cyan, 0.12);
  drawBarrier(ctx, { x: 719, y: 354, w: 105, h: 90, name: 'SECTOR / 07' }, 0);
  drawBarrier(ctx, { x: 1014, y: 157, w: 110, h: 58, name: 'RELAY' }, 1);
  ctx.setLineDash([6, 8]);
  line(ctx, 798, 230, 944, 230, C.magenta + '90', 2);
  line(ctx, 944, 230, 944, 336, C.magenta + '90', 2);
  line(ctx, 977, 367, 1102, 367, C.magenta + '90', 2);
  line(ctx, 1102, 367, 1102, 427, C.magenta + '90', 2);
  ctx.setLineDash([]);
  arrow(ctx, 898, 230, 0, C.magenta);
  arrow(ctx, 1050, 367, 0, C.magenta);
  drawParcel(ctx, 790, 230, 0, 1.7, 0);
  text(ctx, '01 / PICK UP', 742, 181, 11, C.magenta, 750, 'left', true);
  for (let i = 5; i >= 0; i--) {
    ctx.save(); ctx.globalAlpha = 0.12 - i * 0.014;
    drawDrone(ctx, 920 - i * 19, 331 + i * 9, -0.28, 2.6); ctx.restore();
  }
  drawDrone(ctx, 944, 326, -0.28, 3.1);
  line(ctx, 944, 353, 944, 379, C.magenta, 2);
  drawParcel(ctx, 944, 390, 0, 1.1, 0);
  text(ctx, 'YOU / COURIER 01', 927, 284, 11, C.cyan, 750, 'center', true);
  drawPad(ctx, { x: 1102, y: 446, type: 0 }, true, 1.2);
  drawDrone(ctx, 784, 484, -0.2, 1.2, C.red, true);
  text(ctx, '02 / MATCH & DELIVER', 1009, 522, 10, C.magenta, 750, 'left', true);
  ctx.restore();
  box(ctx, 692, 129, 508, 399, null, '#30435d', 18);
  text(ctx, 'KEEP YOUR COMBO. MAKE YOUR SHIFT.', 946, 556, 12, C.cyan, 750, 'center', true);

  line(ctx, 80, 537, 614, 537, '#28344b');
  drawKey(ctx, 'W', 119, 552); drawKey(ctx, 'A', 80, 588); drawKey(ctx, 'S', 119, 588); drawKey(ctx, 'D', 158, 588);
  text(ctx, 'FLY', 208, 572, 12, C.white, 750, 'left', true);
  text(ctx, 'or arrow keys', 208, 595, 12, C.muted, 450);
  drawKey(ctx, 'SPACE', 343, 552, 77); text(ctx, 'DASH', 436, 572, 12, C.white, 750, 'left', true);
  text(ctx, 'or Shift · 1.6s cooldown', 343, 609, 12, C.muted, 450);
  text(ctx, 'P  PAUSE     R  RESTART     M  MUTE', 80, 646, 11, C.muted, 650, 'left', true);
  text(ctx, 'SHIELD · SLOW · MAGNET / FIND POWER-UPS IN THE CITY', 692, 665, 10, '#6d86a6', 650, 'left', true);
  const chips = [
    ['10', 'DELIVERIES / SHIFT', C.cyan], ['3', 'LIVES / RUN', C.magenta], ['∞', 'NEXT SHIFT HARDER', C.yellow],
  ];
  chips.forEach(([number, label, color], i) => {
    const x = 692 + i * 174;
    text(ctx, number, x, 614, 31, color, 750, 'left', true);
    text(ctx, label, x, 643, 10, C.muted, 650, 'left', true);
  });
  line(ctx, 80, 681, 1200, 681, '#28344b');
  text(ctx, 'NEON COURIER / NIGHT SHIFT ARCADE', 80, 705, 10, '#536987', 600, 'left', true);
  text(ctx, `LOCAL BEST ${String(run.best).padStart(6, '0')}`, 1200, 705, 10, C.muted, 650, 'right', true);
}

function drawResultsPanel(ctx, run, input, audio) {
  ctx.fillStyle = '#040815bd'; ctx.fillRect(0, 91, 1280, 629);
  const complete = run.mode === 'shift-complete', paused = run.mode === 'paused';
  const color = complete ? C.cyan : paused ? C.yellow : C.magenta;
  glow(ctx, 640, 355, 340, color, 0.075);
  box(ctx, 354, 156, 572, 478, '#0d1528f5', '#3a4864', 16);
  line(ctx, 392, 157, 888, 157, color, 3);
  text(ctx, paused ? 'FLIGHT ON HOLD' : complete ? 'ALL PARCELS DELIVERED' : 'COURIER SIGNAL LOST', 640, 207, 11, color, 750, 'center', true);
  text(ctx, paused ? 'PAUSED' : complete ? 'SHIFT COMPLETE' : 'GAME OVER', 640, 274, complete ? 42 : 53, C.white, 850, 'center');
  text(ctx, paused ? 'Take a breath. The city can wait.' : complete ? `Shift ${String(run.shift).padStart(2, '0')} cleared. The next one gets busier.` : 'You kept the city moving. Fly again.', 640, 310, 16, '#a8bdd7', 450, 'center');
  line(ctx, 400, 337, 880, 337, '#293955');
  if (paused) {
    text(ctx, 'WASD / ARROWS', 425, 378, 13, C.cyan, 700, 'left', true);
    text(ctx, 'FLY', 855, 378, 13, C.white, 500, 'right', true);
    text(ctx, 'SPACE / SHIFT', 425, 415, 13, C.cyan, 700, 'left', true);
    text(ctx, 'DASH', 855, 415, 13, C.white, 500, 'right', true);
    text(ctx, 'M · MUTE     R · RESTART', 640, 463, 12, C.muted, 600, 'center', true);
  } else {
    text(ctx, complete ? 'SHIFT BONUS' : 'FINAL SCORE', 429, 370, 11, C.muted, 700, 'left', true);
    text(ctx, complete ? `+${run.shiftBonus}` : String(run.score).padStart(6, '0'), 429, 414, 40, color, 700, 'left', true);
    text(ctx, 'BEST SCORE', 727, 370, 11, C.muted, 700, 'left', true);
    text(ctx, String(run.best).padStart(6, '0'), 727, 410, 26, C.white, 600, 'left', true);
    const minutes = Math.floor(run.elapsed / 60), seconds = Math.floor(run.elapsed % 60);
    text(ctx, `${run.totalDelivered} DELIVERIES`, 429, 459, 12, '#b9cee7', 600, 'left', true);
    text(ctx, `PEAK ×${run.maxCombo}`, 640, 459, 12, '#b9cee7', 600, 'center', true);
    text(ctx, `${minutes}:${String(seconds).padStart(2, '0')} RUN`, 851, 459, 12, '#b9cee7', 600, 'right', true);
    if (!complete && run.score > 0 && run.score >= run.best) {
      box(ctx, 718, 426, 143, 22, '#2b233d', '#635079', 4);
      text(ctx, 'NEW PERSONAL BEST', 789, 441, 9, C.magenta, 800, 'center', true);
    }
  }
  for (const button of menuButtons(run, audio)) drawButton(ctx, button, input.pointer, paused ? 'P / ENTER' : complete ? 'ENTER ↵' : 'R / ENTER');
}

export function render(ctx, run, input, audio) {
  ctx.save(); ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  if (run.mode === 'title') drawTitle(ctx, run, input, audio);
  else {
    drawCity(ctx, run); drawHUD(ctx, run, audio);
    if (run.mode !== 'playing') drawResultsPanel(ctx, run, input, audio);
  }
  ctx.restore();
}
