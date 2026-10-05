import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { ROOT, listPages, read } from './lib/site.mjs';

test('docs/tui.html is an exact copy of docs/tui/index.html', () => {
  assert.equal(read('docs/tui.html'), read('docs/tui/index.html'));
});

test('no page redirects with a meta refresh', () => {
  for (const file of listPages()) {
    assert.doesNotMatch(read(file), /http-equiv=["']?refresh/i, file);
  }
});

// A JS redirect: assigning to location (or location.href), or calling location.replace/assign.
// Reading location.pathname or location.search, and setting location.hash, are not redirects.
const JS_REDIRECT = /\blocation(?:\.href)?\s*=(?!=)|\blocation\.(?:replace|assign)\s*\(/;

const publishedScripts = () => execFileSync('git', ['ls-files', '*.js', '*.mjs', '*.cjs'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n').filter((f) => f && !/^(?:tests|scripts)\//.test(f));

// The one allowed statement: when <dialog> is unsupported, the walkthrough button (a click, never a page load)
// opens the MP4 itself. It redirects nobody and no URL changes meaning.
const ALLOWED_NAVIGATION = ['window.location.href = "/assets/media/srelens-product-tour.mp4";'];

test('the allowed navigation is still in main.js (drop the allowance when it goes)', () => {
  for (const statement of ALLOWED_NAVIGATION) assert.equal(read('main.js').split(statement).length - 1, 1, statement);
});

test('no page or published script redirects with JavaScript', () => {
  const scripts = publishedScripts();
  assert.ok(scripts.includes('main.js'), 'main.js is scanned');
  const hits = [];
  for (const file of [...listPages(), ...scripts]) {
    read(file).split('\n').forEach((line, i) => {
      if (JS_REDIRECT.test(line) && !ALLOWED_NAVIGATION.includes(line.trim())) hits.push(`${file}:${i + 1}: ${line.trim().slice(0, 100)}`);
    });
  }
  assert.deepEqual(hits, []);
});
