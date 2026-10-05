// Render 1200x630 Open Graph cards with headless Chrome from scripts/og-card.html.
// Serve the repo first:  npx --yes http-server . -p 8080 -c-1 --silent
//   node scripts/og-cards.mjs [http://localhost:8080]
// Chrome runs with a throwaway profile, never the user's own.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, read, h1s, canonical } from '../tests/lib/site.mjs';
import { PAGES } from './pages.mjs';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const base = process.argv[2] ?? 'http://localhost:8080';
const profile = mkdtempSync(join(tmpdir(), 'og-cards-'));

try {
  for (const p of PAGES.filter((entry) => entry.ogCard)) {
    const html = read(p.file);
    const path = `srelens.com${new URL(canonical(html)).pathname}`;
    const url = `${base}/scripts/og-card.html?path=${encodeURIComponent(path)}&title=${encodeURIComponent(h1s(html)[0])}`;
    execFileSync(CHROME, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=1200,630', `--user-data-dir=${profile}`,
      '--virtual-time-budget=5000', `--screenshot=${join(ROOT, 'assets', 'og', p.ogCard)}`, url,
    ], { stdio: 'ignore' });
    console.log(`og card: assets/og/${p.ogCard}`);
  }
} finally {
  rmSync(profile, { recursive: true, force: true });
}
