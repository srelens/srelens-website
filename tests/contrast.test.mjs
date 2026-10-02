import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, read } from './lib/site.mjs';

test('site.css exists', () => assert.ok(existsSync(join(ROOT, 'site.css'))));

const css = existsSync(join(ROOT, 'site.css')) ? read('site.css') : '';
const block = (selector) => {
  const i = css.indexOf(`${selector} {`);
  assert.ok(i >= 0, `missing ${selector} block`);
  return css.slice(i, css.indexOf('}', i));
};
const tokens = (body) => Object.fromEntries([...body.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\b/gi)].map((m) => [m[1], m[2].toLowerCase()]));
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const PAIRS = [
  ['ink', 'bg'], ['ink', 'surface'], ['muted', 'bg'], ['muted', 'surface'], ['muted', 'sunk'],
  ['brand', 'bg'], ['brand', 'surface'], ['brand', 'sunk'], ['brand-ink', 'brand'], ['hot', 'bg'],
  ['ok', 'bg'], ['ok', 'surface'], ['bad', 'surface'], ['warn', 'surface'],
];
const TERM_PAIRS = ['term-fg', 'term-dim', 'term-ok', 'term-bad', 'term-warn', 'term-key', 'term-brand']
  .flatMap((fg) => [[fg, 'term-bg'], [fg, 'term-raised']]);

for (const theme of ['light', 'dark']) {
  test(`${theme}: text tokens meet 4.5:1`, () => {
    const light = tokens(block(':root'));
    const t = theme === 'light' ? light : { ...light, ...tokens(block(':root[data-theme="dark"]')) };
    for (const [fg, bg] of [...PAIRS, ...TERM_PAIRS]) {
      assert.ok(t[fg] && t[bg], `--${fg} / --${bg} defined`);
      const r = ratio(t[fg], t[bg]);
      assert.ok(r >= 4.5, `--${fg} on --${bg} is ${r.toFixed(2)}:1`);
    }
  });
}

test('the no-JS dark block repeats the dark tokens exactly', () => {
  const m = css.match(/@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme\]\) \{([^}]*)\}/);
  assert.ok(m, 'missing no-JS dark block');
  assert.deepEqual(tokens(m[1]), tokens(block(':root[data-theme="dark"]')));
});
