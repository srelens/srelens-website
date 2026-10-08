import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, read, listPages } from './lib/site.mjs';
import { PROMPT, parseTranscript, renderMcpDemo, embedMcpDemo } from '../scripts/embed-mcp-demo.mjs';

const fixture = readFileSync(join(ROOT, 'tests/fixtures/mcp-demo.fixture.jsonl'), 'utf8');

test('parseTranscript pairs each tools/call with its response by id', () => {
  const { server, calls } = parseTranscript(fixture);
  assert.deepEqual(server, { name: 'srelens', version: '0.15.0' });
  assert.deepEqual(calls.map((c) => [c.id, c.tool, c.args.context ?? null]), [[3, 'k8s.listContexts', null], [4, 'k8s.listDeployments', 'kind-a'], [5, 'k8s.listDeployments', 'kind-b']]);
  assert.equal(calls[1].result.deployments[0].ready, '2/3');
  assert.equal(calls[2].result, null);
  assert.equal(calls[2].error, 'context kind-b: connection refused');
});

test('renderMcpDemo shows the prompt, every tool call in order, and a row per deployment', () => {
  const html = renderMcpDemo(fixture, '0.15.0');
  assert.ok(html.includes(PROMPT), 'prompt');
  const calls = [...html.matchAll(/<span class="mcp-call">→ ([\w.]+)<\/span>([^\n<]*)/g)].map((m) => `${m[1]}${m[2]}`.trim());
  assert.deepEqual(calls, ['k8s.listContexts', 'k8s.listDeployments  kind-a  default', 'k8s.listDeployments  kind-b  default']);
  assert.match(html, /<tr><td>kind-a<\/td><td>web&lt;x&gt;&amp;y<\/td><td>2\/3<\/td><td>1<\/td><td>2<\/td><td>5m<\/td><\/tr>/);
});

test('renderMcpDemo shows a failed call as an error row, never hides it', () => {
  assert.match(renderMcpDemo(fixture, '0.15.0'), /<tr class="mcp-error"><td>kind-b<\/td><td colspan="5">error: context kind-b: connection refused<\/td><\/tr>/);
});

test('renderMcpDemo labels its table and code for assistive technology and names the version it ran', () => {
  const html = renderMcpDemo(fixture, '0.15.0');
  assert.match(html, /<div class="mini-bar">mcp · srelens — agent session<\/div>\s*<div class="mini-body">\s*<pre tabindex="0" role="group" aria-label="mcp · srelens — agent session">/);
  assert.match(html, /<caption>Deployments in <code>default<\/code>, by cluster<\/caption>/);
  assert.equal((html.match(/<th scope="col">/g) ?? []).length, 6);
  assert.match(html, /<figcaption>Real tool calls and results: srelens-tui v0\.15\.0 --mcp-stdio, three local kind clusters\./);
});

test('embedMcpDemo replaces only the marked block and is idempotent', () => {
  const page = 'a<!-- mcp-demo:start -->old<!-- mcp-demo:end -->b';
  const once = embedMcpDemo(page, 'NEW $& $1');
  assert.equal(once, 'a<!-- mcp-demo:start -->NEW $& $1<!-- mcp-demo:end -->b');
  assert.equal(embedMcpDemo(once, 'NEW $& $1'), once);
  assert.throws(() => embedMcpDemo('no markers', 'x'), /mcp-demo markers/);
});

const transcriptPath = join(ROOT, 'assets/captures/mcp-rollouts.jsonl');
const CONTEXTS = ['kind-demo-eu', 'kind-demo-us', 'kind-demo-ap'];

test('the committed transcript is one real session: initialize, listContexts, then listDeployments per demo cluster', () => {
  const { server, calls } = parseTranscript(readFileSync(transcriptPath, 'utf8'));
  assert.equal(server?.name, 'srelens');
  assert.equal(calls[0].tool, 'k8s.listContexts');
  assert.deepEqual(calls[0].result.contexts.map((c) => c.name).sort(), [...CONTEXTS].sort());
  const deps = calls.filter((c) => c.tool === 'k8s.listDeployments');
  assert.deepEqual(deps.map((c) => [c.args.context, c.args.namespace]), CONTEXTS.map((c) => [c, 'default']));
  for (const c of deps) assert.ok(c.result?.deployments?.length, `${c.args.context} returned deployments`);
});

test('the transcript tells the rollout story the page describes', () => {
  const { calls } = parseTranscript(readFileSync(transcriptPath, 'utf8'));
  const by = (ctx, name) => calls.find((c) => c.args.context === ctx)?.result.deployments.find((d) => d.name === name);
  for (const ctx of ['kind-demo-eu', 'kind-demo-us']) assert.equal(by(ctx, 'checkout').upToDate, 3, `${ctx} checkout rolled out`);
  assert.ok(by('kind-demo-ap', 'checkout').upToDate < 3, 'ap checkout rollout is stuck');
  assert.equal(by('kind-demo-us', 'ledger').ready, '1/2', 'us ledger has an unavailable replica');
});

test('the transcript comes from srelens-tui 0.15.0', () => {
  assert.match(readFileSync(join(ROOT, 'assets/captures/mcp-rollouts.version'), 'utf8'), /\bv?0\.15\.0\b/);
});

const home = read('index.html');

test('the homepage section right after the hero is "Talk to your clusters"', () => {
  const heroEnd = home.indexOf('</section>', home.indexOf('<section class="hero">'));
  const next = home.slice(heroEnd).match(/<section class="section" id="([\w-]+)">/);
  assert.equal(next?.[1], 'talk-to-your-clusters');
  assert.match(home, /<h2>The Kubernetes kernel for AI\.<\/h2>/);
});

test('the committed panel is exactly the render of the committed transcript', () => {
  const transcript = readFileSync(join(ROOT, 'assets/captures/mcp-rollouts.jsonl'), 'utf8');
  const version = readFileSync(join(ROOT, 'assets/captures/mcp-rollouts.version'), 'utf8').match(/\d+\.\d+\.\d+/)[0];
  const block = home.slice(home.indexOf('<!-- mcp-demo:start -->') + '<!-- mcp-demo:start -->'.length, home.indexOf('<!-- mcp-demo:end -->'));
  assert.equal(block, renderMcpDemo(transcript, version));
});

test('the table caption does not draw its <code> as a light chip inside the dark terminal', () => {
  assert.match(read('site.css'), /\.mcp-table caption code \{[^}]*background: none;[^}]*border: 0;/);
});

test('/mcp/ calls srelens the Kubernetes kernel for AI', () => {
  assert.match(read('mcp/index.html'), /srelens is the Kubernetes kernel for AI: your agents use it so you don’t have to\./);
});

test('no page and no llms file names srectl before the release that ships it', () => {
  for (const file of [...listPages(), 'llms.txt', 'llms-full.txt']) assert.doesNotMatch(read(file), /srectl/i, file);
});
