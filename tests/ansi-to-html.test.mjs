import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ansiToHtml, xterm256 } from '../scripts/ansi-to-html.mjs';

test('plain text is escaped and spacing is kept', () => {
  assert.equal(ansiToHtml('a  <b> & c'), 'a  &lt;b&gt; &amp; c');
});
test('16-color foreground and reset', () => {
  assert.equal(ansiToHtml('\x1b[32mok\x1b[0m done'), '<span style="color:#4ade80">ok</span> done');
});
test('bright colors and bold combine', () => {
  assert.equal(ansiToHtml('\x1b[1;95mSRELENS\x1b[m'), '<span style="color:#f9a8d4;font-weight:700">SRELENS</span>');
});
test('256-color and truecolor', () => {
  assert.equal(xterm256(196), '#ff0000');
  assert.equal(xterm256(244), '#808080');
  assert.equal(ansiToHtml('\x1b[38;5;196mx'), '<span style="color:#ff0000">x</span>');
  assert.equal(ansiToHtml('\x1b[48;2;59;36;112m sel \x1b[0m'), '<span style="background:#3b2470"> sel </span>');
});
test('reverse video swaps foreground and background', () => {
  assert.equal(ansiToHtml('\x1b[7mx'), '<span style="color:var(--term-bg);background:var(--term-fg)">x</span>');
});
test('box-drawing characters pass through', () => {
  assert.equal(ansiToHtml('╭─ Pods [32] ─╮'), '╭─ Pods [32] ─╮');
});
test('non-SGR escapes and carriage returns are dropped', () => {
  assert.equal(ansiToHtml('a\x1b[2Kb\r\nc\x1b]0;title\x07'), 'ab\nc');
});
test('adjacent runs with the same style merge', () => {
  assert.equal(ansiToHtml('\x1b[32ma\x1b[32mb'), '<span style="color:#4ade80">ab</span>');
});
test('trailing blank lines are trimmed', () => {
  assert.equal(ansiToHtml('a\n\n\n'), 'a');
});
