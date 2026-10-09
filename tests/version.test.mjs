import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, listPages, read, ldNodes, siteVersion } from './lib/site.mjs';

// Bump with each stable release (tag srelens-vX.Y.Z), together with the pages.
const RELEASE = '0.16.0';

const ASSETS = new Set(readFileSync(join(ROOT, 'tests/fixtures/release-v0.16.0-assets.txt'), 'utf8').split(/\r?\n/).filter(Boolean));

test('the homepage declares the current release', () => {
  assert.equal(siteVersion(), RELEASE);
});

test('every softwareVersion and data-version fallback agrees', () => {
  for (const file of listPages()) {
    const html = read(file);
    for (const node of ldNodes(html)) {
      if ('softwareVersion' in node) assert.equal(node.softwareVersion, RELEASE, `${file} JSON-LD`);
    }
    for (const m of html.matchAll(/<span data-version>([^<]*)<\/span>/g)) {
      assert.equal(m[1], `v${RELEASE}`, `${file} data-version`);
    }
  }
});

test('fallback download links point at the same release', () => {
  for (const file of listPages()) {
    for (const m of read(file).matchAll(/releases\/download\/srelens-v(\d+\.\d+\.\d+)\/([^"]+)"/g)) {
      assert.equal(m[1], RELEASE, `${file}: ${m[2]}`);
      assert.ok(!m[2].includes('0.3.0'), `${file}: asset name ${m[2]} still says 0.3.0`);
    }
  }
});

test('every release download link names an asset that v0.16.0 really published', () => {
  for (const file of [...listPages(), 'llms.txt', 'llms-full.txt']) {
    for (const m of read(file).matchAll(/releases\/download\/srelens-v(\d+\.\d+\.\d+)\/([^"'\s)<]+)/g)) {
      assert.equal(m[1], RELEASE, `${file}: ${m[2]}`);
      assert.ok(ASSETS.has(m[2]), `${file}: ${m[2]} is not an asset of srelens-v${RELEASE}`);
    }
  }
});

// main.js rewrites each [data-asset] link to its template with {v} swapped for the latest release, so a template that names no
// real asset becomes a dead link the day it runs. Every page is checked, not only /download/ (Task 3 review).
test('every data-asset template on every page names an asset that v0.16.0 really published', () => {
  let templates = 0;
  for (const file of listPages()) {
    for (const m of read(file).matchAll(/data-asset="([^"]+)"/g)) {
      templates += 1;
      const name = m[1].replace('{v}', RELEASE);
      assert.ok(ASSETS.has(name), `${file}: data-asset="${m[1]}" becomes ${name}, which srelens-v${RELEASE} did not publish`);
    }
  }
  assert.ok(templates >= 24, `found only ${templates} data-asset templates`);
});

test('terminal archives on the site are srectl, not the srelens-tui bridge', () => {
  for (const file of listPages()) assert.doesNotMatch(read(file), /releases\/download\/[^"]*\/srelens-tui-/, file);
});

test('no page links to a Windows ARM64 srelens-tui archive (never shipped)', () => {
  for (const file of listPages()) {
    assert.ok(!read(file).includes('aarch64-pc-windows-msvc'), file);
  }
});
