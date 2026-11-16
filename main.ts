import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The hand-in is a static, self-contained game and its unmodified browser captures.
const sourceRoot = fileURLToPath(new URL('.', import.meta.url));
const outputRoot = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
if (outputRoot === resolve(sourceRoot) || resolve(sourceRoot).startsWith(outputRoot + '/')) {
  throw new Error('The output directory must be separate from the source repository.');
}
mkdirSync(outputRoot, { recursive: true });
for (const folder of ['game', 'screenshots']) {
  // Replacing each artifact folder prevents a previous build leaving stale files behind.
  rmSync(join(outputRoot, folder), { recursive: true, force: true });
  cpSync(join(sourceRoot, folder), join(outputRoot, folder), { recursive: true });
}
const dossier = buildDossier(outputRoot, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputRoot, 'dossier.json'), dossier);
