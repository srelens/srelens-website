import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { ROOT, read, listPages } from './lib/site.mjs';
import { PROMPT, PANEL_PAGES, parseTranscript, renderMcpDemo, embedMcpDemo, embedPanelPages } from '../scripts/embed-mcp-demo.mjs';

const fixture = readFileSync(join(ROOT, 'tests/fixtures/mcp-demo.fixture.jsonl'), 'utf8');
const transcriptPath = join(ROOT, 'assets/captures/mcp-rollouts.jsonl');

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
  assert.match(html, /<tr class="mcp-warn"><td>kind-a<\/td><td>web&lt;x&gt;&amp;y<\/td><td>2\/3<\/td><td>1<\/td><td>2<\/td><td>5m<\/td><\/tr>/);
});

test('renderMcpDemo flags a deployment that is not fully rolled out with mcp-warn, and only that one', () => {
  const rows = (html) => [...html.matchAll(/<tr( class="mcp-warn")?><td>([\w-]+)<\/td><td>([\w&;]+)<\/td>/g)].map((m) => [m[2], m[3], Boolean(m[1])]);
  assert.deepEqual(rows(renderMcpDemo(fixture, '0.15.0')), [['kind-a', 'web&lt;x&gt;&amp;y', true]]);
  const committed = rows(renderMcpDemo(readFileSync(transcriptPath, 'utf8'), '0.15.0'));
  assert.deepEqual(committed.filter((r) => r[2]).map((r) => `${r[0]} ${r[1]}`), ['kind-demo-us ledger', 'kind-demo-ap checkout']);
  assert.equal(committed.length, 7);
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

test('the figcaption says other clients can make the same calls, not that they do (a script sent this session)', () => {
  const caption = renderMcpDemo(fixture, '0.15.0').match(/<figcaption>[^\n]*<\/figcaption>/)[0];
  assert.ok(caption.endsWith('can make the same calls.</figcaption>'), caption);
  assert.ok(!caption.includes(' makes the same calls'), caption);
});

test('embedMcpDemo replaces only the marked block and is idempotent', () => {
  const page = 'a<!-- mcp-demo:start -->old<!-- mcp-demo:end -->b';
  const once = embedMcpDemo(page, 'NEW $& $1');
  assert.equal(once, 'a<!-- mcp-demo:start -->NEW $& $1<!-- mcp-demo:end -->b');
  assert.equal(embedMcpDemo(once, 'NEW $& $1'), once);
  assert.throws(() => embedMcpDemo('no markers', 'x'), /mcp-demo markers/);
});

const CONTEXTS = ['kind-demo-eu', 'kind-demo-us', 'kind-demo-ap'];

test('the committed transcript is one real session: initialize, listContexts, then listDeployments per demo cluster', () => {
  const { server, calls } = parseTranscript(readFileSync(transcriptPath, 'utf8'));
  assert.equal(server?.name, 'srelens');
  const recorded = readFileSync(join(ROOT, 'assets/captures/mcp-rollouts.version'), 'utf8').match(/\d+\.\d+\.\d+/)[0];
  assert.equal(server?.version, recorded, 'the server in the transcript is the version the capture is labelled with');
  assert.equal(recorded, '0.15.0');
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
  // The kernel line is the H1 since 2026-10-09, so this section's H2 is the plain ask, not a repeat of it.
  assert.match(home, /<h2>Talk to your clusters\.<\/h2>/);
});

// One recorded session, one rendered block, shown wherever the page talks about MCP.
test('the panel pages are the homepage, /features/, /mcp/ and /tui/', () => {
  assert.deepEqual(PANEL_PAGES, ['index.html', 'features/index.html', 'mcp/index.html', 'tui/index.html']);
});

const MARKERS = ['<!-- mcp-demo:start -->', '<!-- mcp-demo:end -->'];

test('the mcp-demo markers sit once on each panel page and on no other page', () => {
  for (const file of listPages()) {
    for (const marker of MARKERS) {
      assert.equal(read(file).split(marker).length - 1, PANEL_PAGES.includes(file) ? 1 : 0, `${file}: ${marker}`);
    }
  }
});

for (const file of PANEL_PAGES) {
  test(`${file}: the committed panel is exactly the render of the committed transcript`, () => {
    const transcript = readFileSync(join(ROOT, 'assets/captures/mcp-rollouts.jsonl'), 'utf8');
    const version = readFileSync(join(ROOT, 'assets/captures/mcp-rollouts.version'), 'utf8').match(/\d+\.\d+\.\d+/)[0];
    const page = read(file);
    const block = page.slice(page.indexOf(MARKERS[0]) + MARKERS[0].length, page.indexOf(MARKERS[1]));
    assert.equal(block, renderMcpDemo(transcript, version));
  });
}

// A scratch site: the transcript and one stale page per panel page.
function scratchSite(pages) {
  const dir = mkdtempSync(join(tmpdir(), 'mcp-demo-'));
  mkdirSync(join(dir, 'assets/captures'), { recursive: true });
  writeFileSync(join(dir, 'assets/captures/mcp-rollouts.jsonl'), fixture);
  writeFileSync(join(dir, 'assets/captures/mcp-rollouts.version'), 'srelens-tui v0.15.0\n');
  for (const [page, html] of Object.entries(pages)) {
    mkdirSync(dirname(join(dir, page)), { recursive: true });
    writeFileSync(join(dir, page), html);
  }
  return dir;
}

test('embedPanelPages writes the one render into every panel page, and a second run changes nothing', () => {
  const stale = (page) => `<main>${page}${MARKERS[0]}stale${MARKERS[1]}</main>`;
  const dir = scratchSite(Object.fromEntries(PANEL_PAGES.map((p) => [p, stale(p)])));
  try {
    assert.deepEqual(embedPanelPages(dir), PANEL_PAGES);
    const block = renderMcpDemo(fixture, '0.15.0');
    for (const page of PANEL_PAGES) assert.equal(readFileSync(join(dir, page), 'utf8'), `<main>${page}${MARKERS[0]}${block}${MARKERS[1]}</main>`);
    assert.deepEqual(embedPanelPages(dir), [], 'nothing left to change');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('embedPanelPages names the page that lost its markers', () => {
  const dir = scratchSite(Object.fromEntries(PANEL_PAGES.map((p) => [p, p === 'mcp/index.html' ? '<main>no markers</main>' : `${MARKERS[0]}x${MARKERS[1]}`])));
  try {
    assert.throws(() => embedPanelPages(dir), /mcp\/index\.html: no mcp-demo markers/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the table caption does not draw its <code> as a light chip inside the dark terminal', () => {
  assert.match(read('site.css'), /\.mcp-table caption code \{[^}]*background: none;[^}]*border: 0;/);
});

test('a focused panel keeps its whole outline: .mini clips overflow, so the ring is drawn inside', () => {
  assert.match(read('site.css'), /\.mini :focus-visible \{ outline-offset: -2px; \}/);
});

test('a deployment row that is not rolled out is styled with the terminal warning token', () => {
  assert.match(read('site.css'), /\.mcp-warn td \{ color: var\(--term-warn\); \}/);
});

test('/mcp/ calls srelens the Kubernetes kernel for AI', () => {
  assert.match(read('mcp/index.html'), /srelens is the Kubernetes kernel for AI: your agents use it so you don’t have to\./);
});
