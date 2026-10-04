import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, ldNodes, text } from './lib/site.mjs';

const html = read('faq/index.html');
const faq = ldNodes(html).find((n) => n['@type'] === 'FAQPage');

// The visible questions and answers, in page order.
// (The header's "menu" disclosure is also a <details>; the FAQ ones are the plain ones with a .faq-a answer.)
const visible = [...html.matchAll(/<details(?: open)?>\s*<summary>([^<]*)<\/summary>\s*<div class="faq-a">([\s\S]*?)<\/div>\s*<\/details>/g)]
  .map((m) => ({ question: text(m[1]), answer: text(m[2]) }));

// C07 (claims check): "40+ kinds" is reworded, exactly as on the homepage FAQ.
const C07 = 'resource browsing across 35 built-in kinds plus any CRD';

test('every FAQPage question is a visible question, in the same order', () => {
  assert.equal(visible.length, 9);
  assert.deepEqual(faq.mainEntity.map((q) => q.name), visible.map((v) => v.question));
});

test('the first answer is open and the rest are closed, as native details', () => {
  assert.equal((html.match(/<details open>/g) ?? []).length, 1);
  assert.match(html, /<details open>\s*<summary>What is srelens\?<\/summary>/);
});

test('C07: the "What is srelens?" answer says 35 built-in kinds plus any CRD, visibly and in the FAQPage', () => {
  assert.ok(faq.mainEntity[0].acceptedAnswer.text.includes(C07), 'FAQPage answer');
  assert.ok(visible[0].answer.includes(C07), 'visible answer');
  assert.ok(read('index.html').includes(C07), 'same sentence as the homepage FAQ');
});

test('nothing on the FAQ page still says "40+"', () => assert.doesNotMatch(html, /40\+/));
