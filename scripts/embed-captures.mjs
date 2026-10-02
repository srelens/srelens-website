// Fill <!-- capture:NAME:start --> … <!-- capture:NAME:end --> markers in the pages
// with the converted contents of assets/captures/NAME.ansi.
//   node scripts/embed-captures.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, listPages, read } from '../tests/lib/site.mjs';
import { ansiToHtml } from './ansi-to-html.mjs';

const MARKER = /<!-- capture:([a-z0-9-]+):start -->([\s\S]*?)<!-- capture:\1:end -->/g;

export const captureHtml = (name) =>
  ansiToHtml(readFileSync(join(ROOT, 'assets', 'captures', `${name}.ansi`), 'utf8'));

export const markers = (html) => [...html.matchAll(MARKER)].map((m) => ({ name: m[1], inner: m[2] }));

export const embedCaptures = (html, render = captureHtml) =>
  html.replace(MARKER, (_, name) => `<!-- capture:${name}:start -->${render(name)}<!-- capture:${name}:end -->`);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const file of listPages()) {
    const html = read(file);
    const next = embedCaptures(html);
    if (next !== html) {
      writeFileSync(join(ROOT, file), next);
      console.log(`captures embedded: ${file}`);
    }
  }
}
