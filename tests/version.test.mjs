import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listPages, read, ldNodes, siteVersion } from './lib/site.mjs';

// Bump with each stable release (tag srelens-vX.Y.Z), together with the pages.
const RELEASE = '0.15.0';

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

test('no page links to a Windows ARM64 srelens-tui archive (never shipped)', () => {
  for (const file of listPages()) {
    assert.ok(!read(file).includes('aarch64-pc-windows-msvc'), file);
  }
});
