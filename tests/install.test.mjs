import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read } from './lib/site.mjs';

const sh = read('install.sh');

test('the served installer installs srectl and still handles releases cut before the rename', () => {
  assert.match(sh, /^BIN="srectl"$/m);
  assert.match(sh, /srelens-tui-\$version-\$target\.tar\.gz/, 'pre-rename releases publish srelens-tui archives');
  assert.match(sh, /brew install srelens\/tap\/\$BIN/);
});

test('the capture scripts install from the repo installer and run srectl at 0.16.0', () => {
  for (const file of ['scripts/demo/capture.sh', 'scripts/demo/capture-all.sh', 'scripts/demo/mcp-demo.sh']) {
    const s = read(file);
    assert.doesNotMatch(s, /curl[^\n]*srelens\.com\/install\.sh/, `${file} must not fetch the live installer`);
    assert.match(s, /sh \/work\/install\.sh --version "\$VERSION"/, `${file} uses the repo installer`);
    assert.match(s, /VERSION="\$\{VERSION:-0\.16\.0\}"/, `${file} defaults to 0.16.0`);
    assert.doesNotMatch(s, /\bsrelens-tui\b/, `${file} still runs srelens-tui`);
  }
});
