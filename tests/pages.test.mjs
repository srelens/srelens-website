import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, text, meta } from './lib/site.mjs';

// Task 13: /features/, /mcp/ and /download/ on the design system, plus the approved claim fixes
// (docs/superpowers/plans/2026-10-02-tui-claims-check.md, Decisions 1 and 2) that appear on them.

const features = read('features/index.html');
const mcp = read('mcp/index.html');
const download = read('download/index.html');
const css = read('site.css');
const mainOf = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>'));
const sectionOf = (html, id) => {
  const from = html.indexOf(`id="${id}"`);
  assert.ok(from > 0, `#${id} exists`);
  return html.slice(from, html.indexOf('</section>', from));
};

// ---- shared ----------------------------------------------------------------------------------

test('every class used in <main> of the three pages is styled in site.css (or is a JS hook)', () => {
  const styled = new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));
  const hooks = new Set(['hero-shot']); // main.js: the screenshot zoom looks for it, nothing to style
  for (const [file, html] of [['features', features], ['mcp', mcp], ['download', download]]) {
    const used = new Set();
    for (const m of mainOf(html).matchAll(/\sclass="([^"]*)"/g)) m[1].split(/\s+/).filter(Boolean).forEach((c) => used.add(c));
    const unstyled = [...used].filter((c) => !styled.has(c) && !hooks.has(c));
    assert.deepEqual(unstyled, [], `${file}: classes with no rule in site.css`);
  }
});

test('each page has one H1 with one accent phrase of four words or fewer', () => {
  for (const [file, html] of [['features', features], ['mcp', mcp], ['download', download]]) {
    const h1s = [...html.matchAll(/<h1[\s>][\s\S]*?<\/h1>/g)].map((m) => m[0]);
    assert.equal(h1s.length, 1, `${file}: one h1`);
    const accents = [...h1s[0].matchAll(/<span class="accent">([\s\S]*?)<\/span>/g)].map((m) => text(m[1]));
    assert.equal(accents.length, 1, `${file}: one accent`);
    assert.ok(accents[0].split(/\s+/).length <= 4, `${file}: accent "${accents[0]}"`);
    assert.equal((mainOf(html).match(/class="accent"/g) ?? []).length, 1, `${file}: accent only on the H1`);
  }
});

// ---- /features/ ------------------------------------------------------------------------------

const FEATURE_SHOTS = [
  'pods', 'pod-detail', 'yaml', 'terminal', 'logs', 'nodes', 'overview',
  'namespaces', 'events', 'deployments', 'services', 'port-forwards', 'helm', 'mcp',
  'confirm-delete', 'helm-detail', 'topology',
];

test('/features/ has 17 numbered rows, each with the current dark and light screenshot', () => {
  const rows = [...mainOf(features).matchAll(/<div class="feature-row">([\s\S]*?)<\/figure>/g)].map((m) => m[1]);
  assert.equal(rows.length, FEATURE_SHOTS.length);
  rows.forEach((row, i) => {
    assert.ok(row.includes(`<span class="fr-num">/ ${String(i + 1).padStart(2, '0')}</span>`), `row ${i + 1} number`);
    for (const mode of ['dark', 'light']) {
      const img = row.match(new RegExp(`<img class="shot-${mode}" src="/assets/shots/${mode}-${FEATURE_SHOTS[i]}\\.webp"[^>]*>`));
      assert.ok(img, `row ${i + 1} ${mode} image`);
      assert.match(img[0], /width="2400" height="1461"/);
      assert.match(img[0], /alt="[^"]{20,}"/, `row ${i + 1} ${mode} alt text`);
    }
  });
});

// Task 20 review: only deletes are shown confirming (row /04 says shell commands are not gated),
// and the Helm diff needs a revision before the current one (ReleasePane.tsx previous = revision - 1).
test('/features/ claims a confirmation for deletes only, and a Helm diff only from the second revision', () => {
  const main = mainOf(features);
  assert.doesNotMatch(main, /Destructive actions ask first/);
  assert.match(main, /<h3>Deletes name their target first<\/h3>/);
  assert.match(main, /once a release has a second revision/);
});

test('/features/ shows no key or :command (B73), so nothing there needs a binding fix', () => {
  assert.doesNotMatch(mainOf(features), /<kbd|⌘|Ctrl|Shift|<code>:[a-z]/);
});

// ---- /mcp/ -----------------------------------------------------------------------------------

test('/mcp/ lays its client configs out in a compare-grid with no inline styling', () => {
  const setup = sectionOf(mcp, 'setup');
  assert.ok(setup.includes('<div class="compare-grid">'));
  assert.equal((setup.match(/<div class="verdict">/g) ?? []).length, 5);
  const hero = mcp.slice(mcp.indexOf('<section class="page-hero">'), mcp.indexOf('</section>', mcp.indexOf('<section class="page-hero">')));
  assert.ok(hero.includes('<div class="hero-actions">'), 'hero actions are plain flex, no justify override');
});

test('/mcp/ code blocks are <pre><code> inside .codeblock, so they take the terminal font', () => {
  const blocks = [...mainOf(mcp).matchAll(/<div class="codeblock">([\s\S]*?)<\/div>/g)].map((m) => m[1]);
  assert.equal(blocks.length, 5);
  for (const block of blocks) assert.match(block, /<pre[^>]*><code>[\s\S]*<\/code><\/pre>/);
  assert.match(css, /\.codeblock pre code \{ font: inherit;/);
});

test('/mcp/ keeps the screenshot, its caption and the example tool call', () => {
  assert.ok(mcp.includes('<p class="shot-cap">real screenshot · the MCP panel in srelens settings, server listening on loopback</p>'));
  const example = sectionOf(mcp, 'example');
  assert.match(example, /<div class="mini" aria-label="Example MCP tool call">\s*<div class="mini-bar">[\s\S]*<div class="mini-body">\s*<pre[^>]*>/);
});

test('/mcp/ gives the MCP flags per binary and says where the server runs (C34)', () => {
  const answers = sectionOf(mcp, 'answers');
  assert.ok(answers.includes('<p>No. By default, the server runs in safe read-only mode with sensitive data masked. Mutating actions require the server to be launched with <code>--mcp-allow-destructive</code> (<code>--allow-destructive</code> for <code>srelens-tui mcp</code>) <em>and</em> the agent must explicitly provide <code>"_confirm": true</code> in its tool call arguments. Reading plaintext Secrets requires launching with <code>--mcp-allow-sensitive-reads</code> (<code>--allow-sensitive-reads</code> for <code>srelens-tui mcp</code>).</p>'));
  assert.ok(answers.includes('<p>No. srelens connects to clusters directly with your local kubeconfig credentials. The MCP server runs locally, either inside the app or as a local <code>srelens</code> or <code>srelens-tui mcp</code> process, with no srelens cloud relay between an agent and your API servers.</p>'));
  assert.doesNotMatch(mcp, /part of the local app process/);
});

test('/mcp/ never attaches a --mcp-allow-* flag to `srelens-tui mcp` (B69, B70, C34)', () => {
  // `srelens-tui mcp --mcp-allow-*` exits 2 on v0.15.0; the subcommand spells them --allow-*.
  assert.doesNotMatch(text(mcp), /srelens-tui mcp\s+--mcp-allow-/, 'prose');
  for (const m of mcp.matchAll(/data-copy=(?:"([^"]*)"|'([^']*)')/g)) {
    assert.doesNotMatch(m[1] ?? m[2], /srelens-tui[\s\S]*--mcp-allow-/, 'copy button payload');
  }
  for (const m of mcp.matchAll(/"args":\s*\[([^\]]*)\]/g)) assert.doesNotMatch(m[1], /--mcp-allow-/, 'client config args');
  // The desktop binary keeps its own spelling: every --mcp-allow-* mention is paired with the subcommand one.
  const pairs = [...mainOf(mcp).matchAll(/<code>--mcp-allow-([a-z-]+)<\/code>(?: <em>and<\/em>)?/g)];
  assert.ok(pairs.length >= 1);
  for (const [, name] of pairs) assert.ok(mcp.includes(`<code>--allow-${name}</code> for <code>srelens-tui mcp</code>`), `--allow-${name} is given for srelens-tui mcp`);
});

// ---- /download/ ------------------------------------------------------------------------------

test('/download/ keeps every [data-asset] button with its template and release fallback href', () => {
  const links = [...download.matchAll(/<a [^>]*data-asset="([^"]+)"[^>]*>/g)].map((m) => ({ tag: m[0], template: m[1] }));
  assert.equal(links.length, 12);
  for (const { tag, template } of links) {
    const name = template.replace('{v}', '0.15.0');
    assert.ok(tag.includes(`href="https://github.com/srelens/srelens/releases/download/srelens-v0.15.0/${name}"`), template);
    assert.ok(tag.includes('rel="noopener"'), template);
  }
  assert.deepEqual(links.map((l) => l.template).filter((t) => t.startsWith('srelens-tui-')), [
    'srelens-tui-{v}-aarch64-apple-darwin.tar.gz', 'srelens-tui-{v}-x86_64-apple-darwin.tar.gz',
    'srelens-tui-{v}-x86_64-unknown-linux-gnu.tar.gz', 'srelens-tui-{v}-aarch64-unknown-linux-gnu.tar.gz',
    'srelens-tui-{v}-x86_64-pc-windows-msvc.zip',
  ]);
});

test('/download/ keeps its four anchored sections and the x64 Windows CLI card', () => {
  for (const id of ['platforms', 'tui', 'first-run', 'get-started']) {
    assert.match(download, new RegExp(`<section class="section" id="${id}">`), `#${id}`);
  }
  assert.ok(download.includes('<h3>Windows (CLI)</h3>\n            <p>x64 · CLI</p>'));
});

test('/download/ homebrew heading is a plain h2 in a plain section-head', () => {
  const brew = download.slice(download.indexOf('<div class="get-grid">'), download.indexOf('<p class="get-note">'));
  assert.match(brew, /<div class="section-head">[\s\S]*<h2>Install via Homebrew\.<\/h2>/);
});

test('/download/ no longer claims a "0ms Informer cache" (C02)', () => {
  assert.doesNotMatch(download, /\b0ms\b/);
  assert.equal(
    text(sectionOf(download, 'tui').match(/<p class="sub">[\s\S]*?<\/p>/)[0]),
    'Prefer the terminal or working over remote SSH sessions? srelens-tui brings the full srelens control room into a fast Ratatui interface with an in-memory Informer cache, live stream watches, deep Helm values diff, interactive themes, and an embedded AI assistant.',
  );
});

// ---- spots the stripped inline styles used to carry ------------------------------------------

test('the Homebrew and from-source headings sit close to their notes (the old inline margin-bottom: 12px)', () => {
  assert.match(css, /\.get-grid \.section-head \{ margin-bottom: 12px; \}/);
});

test('/mcp/ example: every key line of the JSON body is indented alike, "_confirm" included', () => {
  const pre = sectionOf(mcp, 'example').match(/<div class="mini-body">\s*<pre[^>]*>([\s\S]*?)<\/pre>/)[1];
  const keyed = pre.split('\n').filter((line) => /^\s*<span class="tk-key">"/.test(line));
  assert.equal(keyed.length, 6);
  for (const line of keyed) assert.match(line, /^ {2}<span class="tk-key">"/, line);
});

// ---- Owner copy fixes (Devesh 2026-10-05): the feature rows describe the new UI the screenshots show ----
// The og:image:alt in the head describes og-features.jpg, an old-UI card that is not part of this change, so the
// "drawer" check reads the page after </head>.
const featureCopy = text(mainOf(features));
const afterHead = (html) => html.slice(html.indexOf('</head>'));

test('A1: /features/ row 01 names the crash-looping pod ledger-worker, as the screenshot does', () => {
  assert.doesNotMatch(features, /legacy-adapter/);
  assert.ok(featureCopy.includes('The crash-looping ledger-worker pod shows its restart count climbing in real time.'));
});

test('A2: /features/ row 02 describes the pod page, not a detail drawer', () => {
  assert.doesNotMatch(afterHead(features), /drawer/i);
  assert.doesNotMatch(featureCopy, /without leaving the table/);
  assert.ok(featureCopy.includes('The pod page shows current CPU and memory from the Kubernetes Metrics Server above its properties, conditions, and controller references, with YAML and Events one tab away. See the whole picture of a pod on one page.'));
});

test('A3: /features/ terminal row says "from inside a pod" (the shot shows payments-api)', () => {
  // Not /worker pod/ alone: the delete-confirmation alt text rightly says "the crash-looping ledger-worker pod".
  assert.doesNotMatch(featureCopy, /inside a worker pod/);
  assert.ok(featureCopy.includes('A full interactive terminal, opened as a tab in the workspace. Here it resolves a headless Redis service with nslookup from inside a pod and receives DNS answers straight from the cluster.'));
});

test('A5: /features/ logs row says the stream opens as a tab, not docked', () => {
  assert.ok(featureCopy.includes('Stream logs from any pod or whole workload with container filtering and search, opened as a tab of its own and still running when you switch tabs to check the nodes.'));
});

test('C11: /download/ meta description says "build from source with Cargo", not "install via Cargo"', () => {
  assert.equal(
    meta(download, 'description'),
    'Download srelens free: Kubernetes desktop client and pure-Rust terminal UI (srelens-tui) for macOS, Windows, and Linux — direct from GitHub Releases, or build from source with Cargo.',
  );
  assert.doesNotMatch(download, /install via Cargo/i);
});
