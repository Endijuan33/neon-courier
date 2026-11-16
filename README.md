# NEON COURIER

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Endijuan33/neon-courier/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Endijuan33/neon-courier/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A neon arcade courier game. Fly a drone through a midnight city, collect luminous parcels, and deliver them to matching pads. Ten deliveries finish a shift. Build a combo, slip through traffic with a dash, and survive increasingly busy streets with three lives.

Run `node serve.ts` with Node.js 22.18 or later, then open **http://localhost:8080** in a desktop browser. No installation, build step, external assets, or game network requests.

**Controls:** WASD or arrows to fly; Space or Shift to dash; Enter to start/continue; P to pause; R to restart; M to mute. Menu buttons also accept mouse clicks.

**Power-ups:** Shield absorbs one collision, Slow halves traffic speed for six seconds, and Magnet draws nearby parcels toward the drone for six seconds. A hit resets your combo and drops your cargo. Dashing avoids traffic, but cannot pass through buildings.

Each delivery earns 100 × your current combo; a delivery within eight seconds of pickup adds 25 × combo. Combos rise to ×8, and completing a shift awards 500 × shift number. Shift breaks wait for you to continue.

Create the entry artifact with `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`. The entrypoint copies the game and real browser screenshots and writes the dossier using the unchanged make.fun kit library.

All art is drawn on canvas. Oscillators generate all sound, including the quiet bass pulse. Best score and mute preference are stored locally when storage is available. MIT licensed.

Run `node tools/verify.mjs` for deterministic simulation checks, synthetic keyboard integration, module parsing, and file limits. These checks do not render browser images. With Playwright installed in the testing environment, `node tools/browser-check.mjs` serves the game, captures the three unedited JPEGs, uses real browser key input, and verifies two dossier builds. Set `CHROMIUM_PATH` if the browser executable is in a custom location.

Build-session limitation: this sandbox denied localhost listening and Chromium socket operations (`EPERM`). The 12 simulation checks passed, including shift completion and restart. Real browser play-testing, screenshots, and dossier determinism remain unverified until the browser runner succeeds. No substitute screenshots or dossier were created.
