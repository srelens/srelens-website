import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, listPages, read, canonical, attr, sitemapUrls } from './lib/site.mjs';
import { PAGES } from '../scripts/pages.mjs';

// Bump with the sitemap when the PR opens on a later date.
const LASTMOD = '2026-10-05';
const LLMS = ['llms.txt', 'llms-full.txt'];

test('sitemap lists exactly the canonical of every published page except 404 and mirrors', () => {
  const mirrors = new Set(PAGES.filter((p) => p.mirrorOf).map((p) => p.file));
  const expected = listPages()
    .filter((f) => f !== '404.html' && !mirrors.has(f))
    .map((f) => canonical(read(f)))
    .sort();
  assert.deepEqual([...sitemapUrls()].sort(), expected);
});

test('sitemap lastmod is the redesign date on every URL', () => {
  const dates = [...read('sitemap.xml').matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
  assert.equal(dates.length, sitemapUrls().length);
  for (const d of dates) assert.equal(d, LASTMOD);
});

test('vercel.json agrees with trailing-slash canonicals', () => {
  assert.equal(JSON.parse(read('vercel.json')).trailingSlash, true);
});

test('_headers caches site.css like the old stylesheet', () => {
  assert.match(read('_headers'), /^\/site\.css\n\s+Cache-Control: public, max-age=86400$/m);
});

test('llms files carry no stale version and list the TUI pages', () => {
  for (const file of LLMS) {
    const body = read(file);
    assert.doesNotMatch(body, /\b0\.3\.0\b/, file);
    for (const url of ['https://srelens.com/tui/', 'https://srelens.com/docs/tui/']) {
      assert.ok(body.includes(url), `${file} lists ${url}`);
    }
  }
});

// Claim fixes approved in docs/superpowers/plans/2026-10-02-tui-claims-check.md (## Decisions 1 and 2).
test('C07: llms files count 35 built-in kinds plus any CRD, not 40+', () => {
  for (const file of LLMS) {
    const body = read(file);
    assert.doesNotMatch(body, /40\+/, file);
    assert.ok(body.includes('Resource browser covering 35 built-in Kubernetes kinds plus any CRD: workloads'), file);
  }
});

test('C02: llms files say in-memory Informer cache, with no 0ms', () => {
  for (const file of LLMS) {
    const body = read(file);
    assert.doesNotMatch(body, /0ms/, file);
    assert.ok(body.includes('features an in-memory Informer cache, deep Helm inspection'), file);
    assert.ok(body.includes('in-memory Informer cache (instant screen switching for views already opened)'), file);
  }
});

test('C09: llms files list only the platforms that ship', () => {
  const status = '- Status: available — desktop installers on GitHub Releases for macOS (Apple Silicon + Intel), '
    + 'Windows (x64), and Linux (x86_64); srelens-tui CLI archives for macOS (Apple Silicon + Intel), '
    + 'Windows (x64), and Linux (x86_64 + aarch64, glibc and static musl); '
    + 'srelens-tui also installable via Homebrew (`brew install srelens/tap/srelens-tui`)';
  for (const file of LLMS) {
    const body = read(file);
    assert.doesNotMatch(body, /ARM64/, file);
    assert.ok(body.includes(status), file);
  }
});

test('C29: llms files say srelens-tui uses local kubectl and helm', () => {
  const answer = '- Does srelens replace kubectl? No — it complements it. srelens talks to the Kubernetes API '
    + "directly through kube-rs and doesn't need kubectl for that; srelens-tui uses your local kubectl for pod "
    + 'and node shells and your local helm for rollbacks. It is a workspace for investigation and operations, '
    + 'not a scripting/automation tool.';
  for (const file of LLMS) assert.ok(read(file).includes(answer), file);
});

// llms-full.txt screenshot inventory and demo-cluster description.
const full = () => read('llms-full.txt');
const SHOT_URL = /https:\/\/srelens\.com\/assets\/shots\/([\w-]+\.webp)/g;
// Entries whose images did not change in the redesign keep their old descriptions.
const UNCHANGED_SHOTS = new Set(['dark-mcp', 'dark-port-forwards']);

test('every screenshot URL in the llms files exists on disk and none is a TUI image', () => {
  for (const file of LLMS) {
    for (const [, name] of read(file).matchAll(SHOT_URL)) {
      assert.ok(existsSync(join(ROOT, 'assets', 'shots', name)), `${file}: ${name} is missing`);
      assert.doesNotMatch(name, /^tui-/, `${file}: ${name} is now a text capture`);
    }
  }
});

test('the inventory lists the delete confirmation, the Helm diff and the topology views', () => {
  for (const name of ['dark-confirm-delete', 'dark-helm-detail', 'dark-topology']) {
    assert.ok(full().includes(`https://srelens.com/assets/shots/${name}.webp`), name);
  }
});

test('each inventory description is the alt text of the matching features-page screenshot', () => {
  const alts = new Map();
  for (const [tag] of read('features/index.html').matchAll(/<img\s[^>]*class="shot-dark"[^>]*>/g)) {
    alts.set(attr(tag, 'src').split('/').pop().replace('.webp', ''), attr(tag, 'alt'));
  }
  let checked = 0;
  for (const [, desc, name] of full().matchAll(/^- (.+?) — https:\/\/srelens\.com\/assets\/shots\/([\w-]+)\.webp$/gm)) {
    if (UNCHANGED_SHOTS.has(name)) continue;
    const alt = alts.get(name);
    assert.ok(alt, `${name} has no alt on /features/`);
    const expected = alt.replace(/^srelens /, '');
    assert.equal(desc, expected[0].toUpperCase() + expected.slice(1), name);
    checked += 1;
  }
  assert.equal(checked, alts.size - UNCHANGED_SHOTS.size);
});

test('llms files describe no stale demo cluster', () => {
  for (const file of LLMS) {
    const body = read(file);
    assert.doesNotMatch(body, /drawer/i, file);
    assert.doesNotMatch(body, /legacy-adapter/, file);
    assert.doesNotMatch(body, /v1\.35/, file);
  }
});

test('the demo cluster paragraph matches the demo files and the captures', () => {
  const demo = full().split('## Demo environment used for screenshots')[1];
  assert.ok(demo, 'section exists');
  for (const needle of [
    'v1.36.1', 'ledger-worker', 'podinfo', 'two revisions', 'Argo CD', 'guestbook', 'MetalLB', 'FRR', 'kwok',
  ]) assert.ok(demo.includes(needle), `demo paragraph mentions ${needle}`);
});

test('both llms files list every page in the sitemap', () => {
  const locs = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  for (const file of LLMS) {
    const body = read(file);
    for (const loc of locs) assert.ok(body.includes(`: ${loc}\n`), `${file} lists ${loc}`);
  }
});
