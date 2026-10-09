// Apply the shared shell to pages and refresh mirrors.
//   node scripts/apply-shell.mjs index.html tui/index.html
//   node scripts/apply-shell.mjs --all
import { copyFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, read, siteVersion } from '../tests/lib/site.mjs';
import { PAGES, page } from './pages.mjs';
import { applyShell } from './shell.mjs';

const args = process.argv.slice(2);
const files = args.includes('--all') ? PAGES.map((p) => p.file) : args;
if (!files.length) {
  console.error('usage: node scripts/apply-shell.mjs <page.html…> | --all');
  process.exit(1);
}
const version = siteVersion();
for (const file of files) {
  const entry = page(file);
  if (!entry) throw new Error(`${file} is not in scripts/pages.mjs`);
  if (entry.mirrorOf) continue;
  writeFileSync(join(ROOT, file), applyShell(read(file), entry, version));
  console.log(`shell applied: ${file}`);
}
for (const mirror of PAGES.filter((p) => p.mirrorOf && (files.includes(p.file) || files.includes(p.mirrorOf)))) {
  copyFileSync(join(ROOT, mirror.mirrorOf), join(ROOT, mirror.file));
  console.log(`mirrored: ${mirror.mirrorOf} -> ${mirror.file}`);
}
