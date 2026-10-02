import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listPages, read } from './lib/site.mjs';
import { captureHtml, markers, embedCaptures } from '../scripts/embed-captures.mjs';

test('embedCaptures fills an empty marker pair', () => {
  const html = '<pre class="tui"><!-- capture:fixture:start --><!-- capture:fixture:end --></pre>';
  assert.equal(
    embedCaptures(html, () => '<span style="color:#4ade80">ok</span>'),
    '<pre class="tui"><!-- capture:fixture:start --><span style="color:#4ade80">ok</span><!-- capture:fixture:end --></pre>',
  );
});

test('embedCaptures replaces stale content and is idempotent', () => {
  const render = () => 'new';
  const stale = '<!-- capture:fixture:start -->old<!-- capture:fixture:end -->';
  const once = embedCaptures(stale, render);
  assert.equal(once, '<!-- capture:fixture:start -->new<!-- capture:fixture:end -->');
  assert.equal(embedCaptures(once, render), once);
});

for (const file of listPages()) {
  for (const { name, inner } of markers(read(file))) {
    test(`${file}: capture "${name}" matches assets/captures/${name}.ansi`, () => {
      assert.equal(inner, captureHtml(name));
    });
  }
}
