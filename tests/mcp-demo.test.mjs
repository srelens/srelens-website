import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/site.mjs';
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
