import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, ldNodes, text, listPages } from './lib/site.mjs';

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

// ---- Owner copy fixes (Devesh 2026-10-05, C13): the FAQPage JSON-LD is the visible text, word for word ----
test('C13: every FAQPage answer equals its visible answer (tags stripped, entities decoded, whitespace collapsed)', () => {
  assert.equal(faq.mainEntity.length, visible.length);
  faq.mainEntity.forEach((q, i) => assert.equal(q.acceptedAnswer.text, visible[i].answer, q.name));
});

test('C13: /faq/ is the only page with FAQPage JSON-LD (a second one needs the same visible-text check)', () => {
  const withFaq = listPages().filter((file) => ldNodes(read(file)).some((n) => n['@type'] === 'FAQPage'));
  assert.deepEqual(withFaq, ['faq/index.html']);
});

// Devesh 2026-10-09: v0.16.0 re-check (privacy), controller ruling. "runs entirely on your machine" / "Nowhere" stopped being literal:
// github.rolloutCause (crates/registry/src/github.rs:539, registered at lib.rs:585-587, in the desktop registry that `srelens` and
// `srectl mcp` both build) sends an Argo app's repository and commit SHAs to api.github.com when you or an agent call it (github.rs:307-346).
// The cluster credentials still go only to the clusters. The same answer is on /faq/ (visible and JSON-LD), the homepage FAQ and both llms files.
const CREDENTIALS_ANSWER = "Nowhere. srelens runs on your machine and connects to clusters directly using the credentials in your local kubeconfig files. There's no intermediary cloud service between the app and your API servers. Some tools do reach the internet when you or an agent call them, such as a GitHub commit lookup for an Argo CD sync, which sends the repository and commit SHAs to api.github.com; your cluster credentials are not part of it.";
const DATA_ANSWER = 'Nowhere by default — the app runs locally and talks directly to your clusters. Some tools reach the internet when you or an agent call them, such as a GitHub commit lookup for an Argo CD sync, which sends the repository and commit SHAs to api.github.com.';

test('v0.16.0 privacy: the credentials answer names the internet-reaching tools on /faq/ (visible and FAQPage) and the homepage', () => {
  const q = 'Where do my cluster credentials go?';
  assert.equal(visible.find((v) => v.question === q).answer, CREDENTIALS_ANSWER, '/faq/ visible');
  assert.equal(faq.mainEntity.find((e) => e.name === q).acceptedAnswer.text, CREDENTIALS_ANSWER, '/faq/ FAQPage');
  assert.ok(text(read('index.html')).includes(CREDENTIALS_ANSWER), 'homepage FAQ');
  for (const [file, page] of [['faq/index.html', html], ['index.html', read('index.html')]]) assert.doesNotMatch(page, /runs entirely on your machine/, file);
});

test('v0.16.0 privacy: both llms files answer "where does cluster data go" with the same exception', () => {
  for (const file of ['llms.txt', 'llms-full.txt']) {
    const body = read(file);
    assert.ok(body.includes(`- Where does cluster data go? ${DATA_ANSWER}\n`), file);
    assert.doesNotMatch(body, /Where does cluster data go\? Nowhere —/, file);
  }
});
