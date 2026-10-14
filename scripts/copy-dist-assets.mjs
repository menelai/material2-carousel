import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist', 'carousel');

if (!existsSync(dist)) {
  console.error(`Build output not found at "${dist}". Run "ng build carousel" first.`);
  process.exit(1);
}

for (const file of ['LICENSE', 'README.md']) {
  const source = join(root, file);
  if (existsSync(source)) {
    copyFileSync(source, join(dist, file));
    console.log(`Copied ${file} -> dist/carousel/`);
  }
}
