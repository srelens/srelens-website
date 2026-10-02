import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listPages, read } from './lib/site.mjs';

test('docs/tui.html is an exact copy of docs/tui/index.html', () => {
  assert.equal(read('docs/tui.html'), read('docs/tui/index.html'));
});

test('no page redirects with a meta refresh', () => {
  for (const file of listPages()) {
    assert.doesNotMatch(read(file), /http-equiv=["']?refresh/i, file);
  }
});
