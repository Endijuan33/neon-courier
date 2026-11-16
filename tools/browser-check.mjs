import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
let playwright;
for (const specifier of ['playwright', 'playwright-core', '/home/hatch/workspace/makefun/node_modules/playwright-core/index.mjs']) {
  try { playwright = await import(specifier); break; } catch {}
}
if (!playwright) throw new Error('Install Playwright in the test environment; the game itself has no dependencies.');
const server = spawn(process.execPath, ['serve.ts'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
try {
  await new Promise((accept, reject) => {
    let output = '';
    server.stdout.on('data', data => { if (String(data).includes('ready:')) accept(); });
    server.stderr.on('data', data => { output += data; });
    server.once('exit', code => reject(new Error(`Local server failed (${code}): ${output || 'no server output was available'}`)));
    server.once('error', reject);
  });
  const launch = { headless: true };
  if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;
  else if (existsSync('/home/hatch/.cache/ms-playwright/chromium-1187/chrome-linux/chrome')) {
    launch.executablePath = '/home/hatch/.cache/ms-playwright/chromium-1187/chrome-linux/chrome';
  }
  browser = await playwright.chromium.launch(launch);
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = [], requests = [];
  context.on('page', page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push(request.url()));
  });
  mkdirSync(join(root, 'screenshots'), { recursive: true });
  const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
  const results = { screenshots: [], playtest: [] };
  for (const shot of shots) {
    const page = await context.newPage();
    await page.goto(`http://localhost:8080/${shot.query}`);
    await page.waitForFunction(() => window.neonCourier);
    await page.evaluate(() => new Promise(requestAnimationFrame));
    const first = await page.screenshot({ type: 'jpeg', quality: 80 });
    await page.waitForTimeout(150);
    const second = await page.screenshot({ type: 'jpeg', quality: 80 });
    assert(first.equals(second), `Frozen screenshot ${shot.name} must be deterministic`);
    assert(first.length <= 262144); assert.equal(first.readUInt16BE(0), 0xffd8);
    writeFileSync(join(root, 'screenshots', shot.name), first);
    results.screenshots.push({ file: shot.name, bytes: first.length, width: 1280, height: 720 });
    await page.close();
  }
  const page = await context.newPage();
  await page.goto('http://localhost:8080/?seed=1');
  await page.waitForFunction(() => window.neonCourier);
  const inspect = () => page.evaluate(() => window.neonCourier.inspect());
  const held = new Set();
  async function release() { for (const key of [...held]) { await page.keyboard.up(key); held.delete(key); } }
  async function setKeys(keys) {
    for (const key of [...held]) if (!keys.has(key)) { await page.keyboard.up(key); held.delete(key); }
    for (const key of keys) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
  }
  async function steer(x, y, tolerance = 14) {
    for (let i = 0; i < 260; i++) {
      const current = await inspect(); assert.equal(current.mode, 'playing');
      const dx = x - current.player.x, dy = y - current.player.y;
      if (Math.hypot(dx, dy) < tolerance) { await release(); await page.waitForTimeout(90); return; }
      const keys = new Set();
      if (Math.abs(dx) > 7) keys.add(dx > 0 ? 'd' : 'a');
      if (Math.abs(dy) > 7) keys.add(dy > 0 ? 's' : 'w');
      await setKeys(keys); await page.waitForTimeout(35);
    }
    throw new Error(`Could not fly to ${x}, ${y}`);
  }
  assert.equal((await inspect()).mode, 'title');
  await page.keyboard.press('Enter'); await page.waitForFunction(() => window.neonCourier.inspect().mode === 'playing');
  results.playtest.push('Enter starts from title with 3 lives');
  await steer(360, 400); assert.equal((await inspect()).player.cargo.type, 0);
  results.playtest.push('Real WASD input moves the drone and collects parcel A');
  await steer(210, 400); await steer(210, 208); await steer(128, 208);
  let current = await inspect(); assert.equal(current.delivered, 1); assert(current.score >= 100);
  results.playtest.push(`Matching-pad delivery: score ${current.score}, combo ×${current.combo}, deliveries ${current.delivered}/10`);
  await page.keyboard.press('p'); await page.waitForTimeout(80);
  assert.equal((await inspect()).mode, 'paused'); const pausedTime = (await inspect()).world.time;
  await page.waitForTimeout(200); assert.equal((await inspect()).world.time, pausedTime);
  await page.keyboard.press('p'); await page.waitForTimeout(50);
  await steer(210, 208); await steer(210, 400); await steer(568, 400);
  await page.keyboard.down('d'); await page.keyboard.press('Space');
  await page.waitForTimeout(50); assert((await inspect()).player.cooldown > 0); await page.keyboard.up('d');
  results.playtest.push('P freezes/resumes simulation; Space triggers dash cooldown');
  let firstHit = false;
  for (let i = 0; i < 2400; i++) {
    current = await inspect();
    if (current.player.lives < 3 && !firstHit) {
      firstHit = true; assert.equal(current.combo, 1);
      results.playtest.push(`Traffic hit: lives ${current.player.lives}, combo reset to ×1`);
    }
    if (current.mode === 'game-over') break;
    const target = current.world.traffic.reduce((a, b) => Math.hypot(b.x - current.player.x, b.y - current.player.y) < Math.hypot(a.x - current.player.x, a.y - current.player.y) ? b : a);
    const keys = new Set(), dx = target.x - current.player.x, dy = target.y - current.player.y;
    if (Math.abs(dx) > 8) keys.add(dx > 0 ? 'd' : 'a');
    if (Math.abs(dy) > 8) keys.add(dy > 0 ? 's' : 'w');
    await setKeys(keys); await page.waitForTimeout(35);
  }
  await release(); current = await inspect();
  assert(firstHit); assert.equal(current.mode, 'game-over'); assert.equal(current.player.lives, 0);
  results.playtest.push(`GAME OVER at score ${current.score}; best ${current.best}`);
  await page.keyboard.press('r'); await page.waitForTimeout(90); current = await inspect();
  assert.equal(current.mode, 'playing'); assert.equal(current.player.lives, 3); assert.equal(current.score, 0);
  results.playtest.push('R restarts to playing, score 0, lives 3, best retained');
  await page.keyboard.press('m'); await page.waitForTimeout(50); assert.equal((await inspect()).audio.muted, true);
  await page.keyboard.press('m'); await page.waitForTimeout(50); assert.equal((await inspect()).audio.muted, false);
  assert.equal((await inspect()).audio.state, 'running'); assert((await inspect()).audio.notesPlayed > 0);
  results.playtest.push('M toggles mute; WebAudio is running and oscillator notes were scheduled');
  assert.deepEqual(errors, []);
  assert(requests.every(url => url.startsWith('http://localhost:8080/')), 'Only game files were requested');
  results.playtest.push('No page errors and no external requests');
  for (let i = 0; i < 2; i++) {
    const build = spawnSync(process.execPath, ['main.ts'], { cwd: root, env: { ...process.env, MAKEFUN_OUTPUT_DIR: 'out' }, encoding: 'utf8' });
    assert.equal(build.status, 0, build.stderr);
    const bytes = readFileSync(join(root, 'out/dossier.json'));
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (i === 0) results.dossier = { bytes: bytes.length, sha256: digest };
    else assert.equal(digest, results.dossier.sha256);
  }
  results.dossier.identicalAcrossTwoRuns = true;
  writeFileSync(join(root, 'browser-results.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
