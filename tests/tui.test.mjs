import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, read, text } from './lib/site.mjs';
import { captureHtml } from '../scripts/embed-captures.mjs';

const html = read('tui/index.html');
// Prose checks must never be satisfied (or tripped) by the generated terminal capture.
const bare = html.replace(/<pre class="tui"[\s\S]*?<\/pre>/g, '');
const main = bare.slice(bare.indexOf('<main'), bare.indexOf('</main>'));
const sectionOf = (id) => {
  const from = html.indexOf(`id="${id}"`);
  assert.ok(from > 0, `#${id} exists`);
  return html.slice(from, html.indexOf('</section>', from));
};

// ---- structure -------------------------------------------------------------------------------

test('the hero shows the real capture and the install command', () => {
  const hero = html.slice(html.indexOf('<section class="page-hero">'), html.indexOf('</section>', html.indexOf('<section class="page-hero">')));
  assert.ok(hero.includes(`<!-- capture:pods:start -->${captureHtml('pods')}<!-- capture:pods:end -->`));
  assert.ok(hero.includes('data-copy="brew install srelens/tap/srelens-tui"'));
});

test('the hero keeps its One-Line Install eyebrow and h2 above the command row (ruling 1)', () => {
  const hero = html.slice(html.indexOf('<section class="page-hero">'), html.indexOf('</section>', html.indexOf('<section class="page-hero">')));
  const eyebrow = hero.indexOf('One-Line Install');
  const h2 = hero.indexOf('<h2>Install via Homebrew or Shell Script</h2>');
  assert.ok(eyebrow > 0 && h2 > eyebrow && hero.indexOf('class="cmd"') > h2);
  assert.ok(hero.includes('<a class="btn btn-primary" href="/download/#tui">Install srelens-tui</a>'));
  assert.ok(hero.includes('<a class="btn btn-ghost" href="/docs/tui/">Read Documentation</a>'));
});

test('the hero carries the capture caption and never claims CrashLoopBackOff (pods show the phase)', () => {
  assert.ok(html.includes('<figcaption>text capture · srelens-tui v0.15.0 on the srelens-demo kind cluster · select it</figcaption>'));
  // The shared footer links the CrashLoopBackOff guide; that is a page title, not a claim about the TUI.
  assert.doesNotMatch(bare.replace(/<footer class="site-footer">[\s\S]*?<\/footer>/, ''), /CrashLoopBackOff/);
});

test('the startup feature guide is a text capture after the hero (it replaced the banner screenshot)', () => {
  const heroEnd = html.indexOf('</section>', html.indexOf('<section class="page-hero">'));
  assert.ok(html.indexOf('<!-- capture:features:start -->') > heroEnd);
  assert.ok(!html.includes('/assets/shots/tui-banner.webp'));
});

test('stats are a stat grid of two cards that survive the claims check (C02, C04)', () => {
  const grid = main.slice(main.indexOf('<div class="stat-grid">'));
  const cards = [...grid.slice(0, grid.indexOf('</section>')).matchAll(/<article class="stat">[\s\S]*?<\/article>/g)].map((m) => m[0]);
  assert.deepEqual(cards, [
    '<article class="stat"><p class="stat-value">20</p><h3>Warm watches</h3><p>Views you have already opened render from the in-memory cache while up to 20 watch streams stay warm.</p></article>',
    '<article class="stat"><p class="stat-value">Rust</p><h3>Rust core</h3><p>Built with Ratatui &amp; kube-rs. No Node, no webviews.</p></article>',
  ]);
});

test('keybindings are keymap tables with <kbd> keys', () => {
  const section = html.slice(html.indexOf('id="keybindings"'));
  const grid = section.slice(0, section.indexOf('</section>'));
  assert.match(grid, /<div class="keymap-grid">/);
  assert.ok((grid.match(/<div class="keymap">/g) ?? []).length >= 2);
  assert.doesNotMatch(grid, /<td><code>/, 'keys use <kbd>, not <code>');
});

test('every key cell is only <kbd> keys, and the verified bindings are what is listed (B06, B23, B28, B29)', () => {
  const maps = [...sectionOf('keybindings').matchAll(/<div class="keymap">([\s\S]*?)<\/table>/g)].map((m) => m[1]);
  assert.equal(maps.length, 2);
  const keysOf = (map) => [...map.matchAll(/<tr><td>(.*?)<\/td><td>/g)].map((m) => m[1]);
  for (const cell of maps.flatMap(keysOf)) assert.match(cell, /^<kbd>[^<]+<\/kbd>(?: [+/] <kbd>[^<]+<\/kbd>)*$/, cell);
  assert.deepEqual(keysOf(maps[0]).map(text), [':', '/', 'Tab', 'Esc', '?', 'q']);
  // Shift + D (debug container) is not in v0.15.0 and Shift + N is really `s` on the Nodes view.
  assert.deepEqual(keysOf(maps[1]).map(text), ['Enter', 'l', 's', 's', 'f / Shift + F', 't', 'd / y']);
});

test('the keymap rows carry the approved wording (B06, B23, B29, C26)', () => {
  for (const row of [
    '<tr><td><kbd>q</kbd></td><td>Close help, dialogs and sub-views (quit with <code>:q</code> or <kbd>Ctrl</kbd>+<kbd>C</kbd>)</td></tr>',
    '<tr><td><kbd>s</kbd></td><td>Open container shell (sh ➔ bash)</td></tr>',
    '<tr><td><kbd>s</kbd></td><td>Open privileged node shell (from the Nodes view)</td></tr>',
    '<tr><td><kbd>f</kbd> / <kbd>Shift</kbd> + <kbd>F</kbd></td><td>Start background port forward (Shift closes an active one)</td></tr>',
  ]) assert.ok(html.includes(row), row);
});

test('every feature row keeps its id, its heading id and its anchor link', () => {
  const rows = [
    ['ai-assistant', 'ai'], ['headless-mcp-server', 'tui-mcp'], ['argocd-gitops', 'argocd'], ['cluster-overview', 'overview'],
    ['pod-operations', 'pods'], ['helm-inspector', 'helm'], ['gpu-fleet', 'gpuinfo'], ['bgp-dashboard', 'bgp'],
    ['log-streamer', 'logs'], ['resource-tree', 'hierarchy-tree'],
  ];
  for (const [row, heading] of rows) {
    assert.ok(html.includes(`<div class="feature-row" id="${row}">`), `feature row #${row}`);
    assert.ok(html.includes(`<h3 id="${heading}"><a href="#${row}" class="anchor-link">`), `#${heading} links to #${row}`);
  }
});

test('every in-page #anchor-link targets an id that exists', () => {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const links = [...main.matchAll(/<a [^>]*class="[^"]*anchor-link[^"]*"[^>]*>/g)].map((m) => m[0].match(/href="#([^"]+)"/)[1]);
  assert.ok(links.length >= 14, `found ${links.length} anchor links`);
  for (const id of links) assert.ok(ids.has(id), `#${id}`);
});

test('the MCP feature stacks its two screenshots in a shot-stack', () => {
  const row = html.slice(html.indexOf('id="headless-mcp-server"'), html.indexOf('id="argocd-gitops"'));
  const stack = row.slice(row.indexOf('<div class="shot-stack">'));
  assert.equal((stack.match(/<figure class="shot">/g) ?? []).length, 2);
  assert.ok(stack.includes('/assets/shots/tui-mcp-agent.png') && stack.includes('/assets/shots/tui-mcp-tools.png'));
});

test('the compare table scrolls inside its own box with scoped headers', () => {
  const section = sectionOf('compare');
  assert.match(section, /<div class="compare-scroll">\s*<table>/);
  assert.equal((section.match(/<th scope="col"/g) ?? []).length, 5);
  assert.ok(section.includes('<th scope="col" class="srelens">srelens-tui</th>'));
  const rows = [...section.matchAll(/<tr>\s*(<th scope="row">[\s\S]*?)<\/tr>/g)].map((m) => m[1]);
  assert.equal(rows.length, 7, 'Idle Memory Consumption (C03) is gone, the other seven rows stay');
  for (const row of rows) assert.equal((row.match(/<td/g) ?? []).length, 4);
  assert.deepEqual(rows.map((r) => text(r.match(/<th scope="row">([\s\S]*?)<\/th>/)[1])), [
    'Core Runtime', 'Informer Cache Speed', 'In-Process AI Assistant', 'BGP Peering Dashboard',
    'Deep Helm 3 Values Diff', 'Resource Hierarchy Tree', 'Ephemeral Debug Containers',
  ]);
});

test('the compare table carries the approved cells (B28, C02, C11, C21)', () => {
  const section = sectionOf('compare');
  const cells = [
    '<td>Instant for opened views (in-memory cache)</td>', // C02
    '<td>Live watches (Rust)</td>',                        // C02
    '<td>✓ Built-in values diff &amp; rollback</td>',      // C11
    '<td>✕ TUI only</td>',                                 // C21
    '<td>✓ Via MCP with <code>--allow-destructive</code> (<code>k8s.debugPod</code>)</td>', // B28
  ];
  for (const cell of cells) assert.ok(section.includes(cell), cell);
});

test('the download cards use the shared dl components and the Linux card describes what it links (C10)', () => {
  const section = sectionOf('download');
  assert.match(section, /<div class="dl-grid">/);
  assert.equal((section.match(/<article class="dl-card">/g) ?? []).length, 3);
  assert.ok(section.includes('<p>x86_64 &amp; ARM64 · glibc builds</p>'));
  assert.ok(section.includes('One self-contained binary per platform. Available on GitHub Releases.'));
  const linux = section.slice(section.indexOf('<h3>Linux</h3>'), section.indexOf('<h3>Windows</h3>'));
  assert.equal((linux.match(/href="[^"]*unknown-linux-gnu\.tar\.gz"/g) ?? []).length, 2);
  assert.doesNotMatch(linux, /musl/);
});

// ---- approved claim decisions ----------------------------------------------------------------

test('no stat or claim survives that Task 7 marked for removal', () => {
  // Exact strings from docs/superpowers/plans/2026-10-02-tui-claims-check.md "## Decisions" (remove rows).
  const REMOVED = [
    // C01: "<15ms startup" has no measurement behind it. Whole card.
    '&lt;15ms', 'Startup Time', 'Instant cold launch with zero Electron runtime.',
    // C03: "<25MB" has no measurement behind it. Card and the whole "Idle Memory Consumption" compare row.
    '&lt;25MB', 'Memory Footprint', 'Lightweight resident memory in high-density multi-pod clusters.',
    'Idle Memory Consumption', '&lt;25 MB', '~45–80 MB', '~120 MB (WebView)',
    // C02: "0ms Informer cache" card sentence. C04: "100% Pure Rust" card heading (now "Rust core").
    'Sub-millisecond view transitions without network roundtrips.', 'Pure Rust Core',
    // B28: Shift + D (debug container key) is not in v0.15.0; B65: /network does not exist.
    'Ephemeral Debug Containers (', 'Attach debug containers with rich troubleshooting tools',
  ];
  for (const claim of REMOVED) assert.ok(!bare.includes(claim), claim);
});

test('rewritten claims are gone from the page, its head and its structured data', () => {
  const GONE = [
    ['C02', /(?<![\d.])0ms/], ['C02', /zero-latency/i], ['C28', /sub-millisecond/i],
    ['C05', /prompt caching/i], ['C05', /\b90%/], ['C05', /token caching/i],
    ['C06', /\b80\+/],
    ['C11', /3-way/i],
    ['C12', /without requiring/i],
    ['C14', /throughput/i],
    ['C15', /storage utilization/i],
    ['C16', /\bHPA\b/],
    ['C17', /FATAL/], ['C17', /filter log lines/i],
    ['C18', /kubectl describe/], ['C18', /confirmation gates/],
    ['C26', /fallback from bash to sh/],
    ['C10', /Static glibc/i], ['C10', /Compiled statically/i],
    ['C21', /Dedicated view/],
    ['B28', /debug containers/], ['B28', /Shift\s*\+\s*D\b/],
    ['B29', /Shift\s*\+\s*N\b/],
    ['B65', /\/network/],
    ['B69', /--mcp-allow-/],
  ];
  const page = text(bare.replace(/<script(?! type="application\/ld\+json")[\s\S]*?<\/script>/g, ''));
  for (const [row, pattern] of GONE) assert.doesNotMatch(page, pattern, `${row}: ${pattern}`);
});

test('the approved copy replaces each reworded claim, exactly', () => {
  const REPLACED = [
    // C28 badge
    // C28 badge, then C10 (owner review 2026-10-05): "pure Rust" becomes "Rust core"
    ['C10', '<span class="dot"></span> Rust core · in-memory watch cache · in-process AI assistant · zero Electron</p>'],
    // B65 /network -> /endpoints
    ['B65', '<li><strong>Incident Playbooks:</strong> Run <code>/crashloop</code>, <code>/oom</code>, <code>/rollout</code>, or <code>/endpoints</code> to diagnose failing workloads with grounded root cause analysis.</li>'],
    // C18
    ['C18', '<li><strong>Tool Badges &amp; Execution:</strong> Transparently runs diagnostic tools (manifest and event reads, log tailing, metrics). Tools that change the cluster are blocked in the assistant; MCP clients can use them by launching <code>srelens-tui mcp --allow-destructive</code>.</li>'],
    // C05
    ['C05', '<li><strong>Multi-Provider &amp; Token Estimates:</strong> Each reply shows an estimated token count and the reply time. Connect Anthropic Claude, OpenAI, Google Gemini, or any OpenAI-compatible endpoint such as local <strong>Ollama</strong>.</li>'],
    // C06
    ['C06', '<li><strong>100+ Native Tools:</strong> Agents invoke high-performance cluster primitives — tailing multi-pod logs, inspecting manifests, querying metrics, and analyzing topology.</li>'],
    // B69 / B70: the subcommand spelling
    ['B69', '<li><strong>Granular Safety Flags:</strong> Gate sensitive reads with <code>--allow-sensitive-reads</code> and mutating actions (scale, restart, apply, delete) with <code>--allow-destructive</code>.</li>'],
    // C15
    ['C15', '<li><strong>Live Resource Gauges:</strong> Real-time visual progress bars for cluster-wide CPU and memory utilization, plus GPU when present.</li>'],
    // C02
    ['C02', '<li><strong>Cached Refresh:</strong> The in-memory Informer cache keeps opened views current from live watches; pod and node metrics refresh about every 4 seconds.</li>'],
    // C26
    ['C26', '<li><strong>Instant Shells (<code>s</code>):</strong> Drops straight into a container shell, trying <code>/bin/sh</code>, then <code>bash</code>, through your local <code>kubectl</code>.</li>'],
    // B29
    ['B29', '<li><strong>Privileged Node Shells (<code>s</code> on Nodes):</strong> Launch a root debug shell on a node with host namespace access via <code>kubectl debug</code>.</li>'],
    // C14
    ['C14', '<li><strong>Background Port Forwarding (<code>Shift + F</code>):</strong> Manage port forwards with live byte counters and automatic reconnection.</li>'],
    // C12
    ['C12', 'Inspect Helm releases across all namespaces directly from your terminal. Releases, history, values and manifests are read from the cluster without the <code>helm</code> CLI; rollback uses your local <code>helm</code>.'],
    // C11
    ['C11', '<li><strong>Three Diff Modes:</strong> Built-in diff engine compares <em>User-Supplied Values</em> against <em>Computed All-Values</em>, chart defaults, or the previous release revision (press <code>m</code> to cycle).</li>'],
    // C17
    ['C17', '<li><strong>Log Severity Highlighting:</strong> Colors error and fatal lines red, warnings yellow, and debug lines dim across all log streams.</li>'],
    ['C17', '<li><strong>Horizontal Panning &amp; Search:</strong> Toggle wrapping off with <code>w</code> for horizontal scrolling (<code>h</code>/<code>l</code> or arrows), and search log lines in real time with <code>/</code> (<code>n</code>/<code>N</code> jump between matches).</li>'],
    // C16
    ['C16', '<li><strong>Full Stack Topology:</strong> Follows relationships from <code>Ingress</code> ➔ <code>Service</code> ➔ <code>Deployment</code> ➔ <code>ReplicaSet</code> ➔ <code>Pods</code>, plus mounted ConfigMaps, Secrets, PVCs and the hosting Node.</li>'],
  ];
  for (const [row, snippet] of REPLACED) assert.ok(html.includes(snippet), `${row}: ${snippet}`);
});

test('the approved prose replaces the lede and the section copy (C02, C05, C11, C28)', () => {
  const prose = text(main);
  for (const [row, sentence] of [
    ['C02/C05', 'Featuring an in-memory Informer cache that redraws views you have already opened without a new request, live streaming watches, BGP network peering dashboards, Helm 3 values diffs, auto-wrapped logs, and an embedded AI assistant with per-reply token estimates.'],
    ['C11', 'Everything you need during on-call incidents: live peering states, instant AI triage playbooks, smart auto-wrapped logs, Helm values diffs, and hierarchy trees.'],
    ['C28', 'Keyboard-optimized table views with in-memory sorting, persistent regex filtering, and deep operational shortcuts.'],
  ]) assert.ok(prose.includes(sentence), `${row}: ${sentence}`);
});

// ---- styles ----------------------------------------------------------------------------------

test('.stat-value is scoped under .stat so ".stat p" cannot shrink or mute it', () => {
  const css = read('site.css');
  const tui = css.slice(css.indexOf('/* ---------- pages: tui ---------- */'));
  assert.match(tui, /^\.stat \.stat-value \{[^}]*font: 600 clamp\(26px, 3vw, 36px\)\/1 var\(--font-mono\)[^}]*color: var\(--ink\)/m);
});

test('.page-hero .wrap pins its single grid column so the wide capture scrolls in its own box instead of widening the page', () => {
  const css = read('site.css');
  const tui = css.slice(css.indexOf('/* ---------- pages: tui ---------- */'));
  assert.match(tui, /^\.page-hero \.wrap \{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/m);
});

test('.page-hero .hero-actions is capped at its column so the nowrap install command cannot widen a phone page', () => {
  const css = read('site.css');
  const tui = css.slice(css.indexOf('/* ---------- pages: tui ---------- */'));
  assert.match(tui, /^\.page-hero \.hero-actions \{[^}]*max-width:\s*100%/m);
});

// ---- Task 21: TUI screenshots that now have a text capture ------------------------------------

const TUI_PAGES = ['tui/index.html', 'docs/tui/index.html'];
const REPLACED = ['tui-overview.webp', 'tui-pods.webp', 'tui-argo.webp', 'tui-helm.webp', 'tui-bgp.webp', 'tui-gpuinfo.webp', 'tui-logs.webp', 'tui-tree.webp', 'tui-banner.webp'];
const KEPT = { 'tui/index.html': ['tui-assistant.webp', 'tui-mcp-agent.png', 'tui-mcp-tools.png'], 'docs/tui/index.html': ['tui-assistant.webp', 'argocd-hub-spoke.png', 'tui-argo-config.png'] };
// Where each capture sits: [text that opens its section, capture name]. The section's first figure is the capture.
const PLACED = {
  'tui/index.html': [['id="cluster-overview"', 'overview'], ['id="pod-operations"', 'pods'], ['id="argocd-gitops"', 'argo'], ['id="helm-inspector"', 'helm-detail'],
    ['id="gpu-fleet"', 'gpu'], ['id="bgp-dashboard"', 'bgp'], ['id="log-streamer"', 'logs'], ['id="resource-tree"', 'tree'], ['<!-- ============ STARTUP FEATURE GUIDE CAPTURE', 'features']],
  'docs/tui/index.html': [['<h2 id="overview">', 'overview'], ['<h2 id="keybindings">', 'help'], ['<h2 id="argocd-gitops">', 'argo'], ['<h2 id="pod-operations">', 'pods'],
    ['<h2 id="helm-inspector">', 'helm-detail'], ['<h2 id="gpu-fleet">', 'gpu'], ['<h2 id="bgp-dashboard">', 'bgp'], ['<h2 id="log-streamer">', 'logs'], ['<h2 id="resource-tree">', 'tree']],
};

for (const file of TUI_PAGES) {
  test(`${file}: TUI screenshots that now have a text capture are replaced`, () => {
    // The whole page, head included: the og:image and the JSON-LD image are the card too (the old shot shows a real cluster).
    const page = read(file);
    for (const image of REPLACED) assert.ok(!page.includes(`/assets/shots/${image}`), `${file} still uses ${image}`);
  });

  test(`${file}: the screenshots without a capture stay images, and every old image file stays published`, () => {
    const page = read(file);
    for (const image of KEPT[file]) assert.ok(page.includes(`/assets/shots/${image}`), `${file} lost ${image}`);
    for (const image of [...REPLACED, ...KEPT[file]]) assert.ok(existsSync(join(ROOT, 'assets', 'shots', image)), `assets/shots/${image} was deleted`);
  });

  test(`${file}: each replaced screenshot is now a tui-figure holding its capture, with a truthful caption`, () => {
    const page = read(file);
    for (const [anchor, name] of PLACED[file]) {
      const from = page.indexOf(anchor);
      assert.ok(from > 0, `${anchor} exists`);
      const section = page.slice(from, page.indexOf('</figure>', from) + '</figure>'.length);
      assert.ok(section.includes(`<!-- capture:${name}:start -->`), `${anchor} holds capture "${name}"`);
      assert.equal((section.match(/<figure/g) ?? []).length, 1, `${anchor}: the capture is the section's first figure`);
      const figure = section.slice(section.indexOf('<figure class="tui-figure">'));
      assert.match(figure, new RegExp(`<figure class="tui-figure">\\s*<pre class="tui" tabindex="0" role="region" aria-label="srelens-tui [^"]+, text capture"><!-- capture:${name}:start -->`), name);
      const caption = figure.match(/<figcaption>([^<]+)<\/figcaption>/)?.[1];
      assert.ok(caption, `${name}: figcaption`);
      assert.match(caption, name === 'gpu'
        ? /^srelens-tui [^·]+ · text capture from v0\.15\.0 · simulated GPU node \(kwok\)$/
        : /^srelens-tui [^·]+ · text capture from v0\.15\.0$/, `${name}: ${caption}`);
      assert.doesNotMatch(figure.replace(/<pre class="tui"[^>]*>[\s\S]*?<\/pre>/, ''), /CrashLoopBackOff/, `${name}: pods show the phase, not CrashLoopBackOff`);
    }
  });
}

test('the GPU capture says the node is simulated', () => {
  for (const file of TUI_PAGES) {
    const page = read(file);
    const i = page.indexOf('<!-- capture:gpu:start -->');
    assert.ok(i > 0, `${file} embeds the gpu capture`);
    const figure = page.slice(i, page.indexOf('</figure>', i));
    assert.match(figure, /simulated GPU node \(kwok\)/);
  }
});

test('120-column captures get the whole row in feature rows, and room around figures in prose', () => {
  const css = read('site.css');
  const tui = css.slice(css.indexOf('/* ---------- pages: tui ---------- */'));
  assert.match(tui, /^\.feature-row:has\(> \.tui-figure\) \{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/m);
  assert.match(tui, /^\.feature-row:has\(> \.tui-figure\) \.feature-narrative \{[^}]*max-width:\s*var\(--measure\)/m);
  assert.match(css, /^\.prose \.tui-figure \{[^}]*margin:\s*24px 0/m);
});

// ---- Task 21 fix round 1: box-drawing alignment -----------------------------------------------

test('.tui draws box and block glyphs in --font-grid, whose first family is not the webfont that lacks them', () => {
  // The Google Fonts JetBrains Mono subsets have no U+2500-25FF. Those glyphs then fall back to another
  // font (Consolas is 0.55em, JetBrains Mono 0.6em), so borders drift. --font-grid starts with a
  // system font that has the glyphs at the same advance as its own letters.
  const css = read('site.css');
  const grid = css.match(/^\s*--font-grid:\s*([^;]+);/m);
  assert.ok(grid, ':root defines --font-grid');
  const first = grid[1].split(',')[0].trim().replace(/^"|"$/g, '');
  assert.ok(first && !/jetbrains|geist/i.test(first), `--font-grid starts with ${first}`);
  const rule = css.match(/^\.tui \{[^}]*\}/m)?.[0];
  assert.ok(rule, '.tui rule exists');
  assert.match(rule, /font:[^;]*var\(--font-grid\)/, '.tui font uses --font-grid');
  assert.doesNotMatch(rule, /var\(--font-term\)/, '.tui no longer uses --font-term');
});

// ---- Review feedback 2026-10-08 (Shubham, /tui/): every capture fits its frame like an image --------
// A capture is 120 columns wide. Its font size comes from the width of the frame it sits in (container query
// units), so the columns fill the frame at any viewport width instead of scrolling sideways or leaving a gap.

const fitCss = read('site.css');
const token = (name) => fitCss.match(new RegExp(`^\\s*--${name}:\\s*([^;]+);`, 'm'))?.[1].trim();
const tuiRule = fitCss.match(/^\.tui \{[^}]*\}/m)?.[0] ?? '';
// The font size the .tui rule asks for, worked out for a frame `frame` px wide: var()s read from site.css, 100cqw = the frame.
const captureFontSize = (frame) => {
  const size = tuiRule.match(/font:\s*500\s+(.+?)\/1\.5\s+var\(--font-grid\)/)?.[1];
  assert.ok(size, '.tui font shorthand is "500 <size>/1.5 var(--font-grid)"');
  const js = size
    .replace(/var\(--([\w-]+)\)/g, (_, name) => `(${token(name)})`)
    .replace(/([\d.]+)cqw/g, (_, n) => `(${n} * ${frame} / 100)`)
    .replace(/([\d.]+)px/g, '$1')
    .replace(/\bcalc\(/g, '(').replace(/\bmin\(/g, 'Math.min(');
  return Function(`"use strict"; return ${js};`)();
};

test('the figure that holds a capture is an inline-size container, so the capture can read its frame width', () => {
  assert.match(fitCss, /^\.tui-figure \{[^}]*container-type:\s*inline-size/m);
});

test('the capture font size is container-relative (cqw) and capped at the old 12.5px', () => {
  assert.match(tuiRule, /font:[^;]*\bmin\(var\(--tui-size\),[^;]*cqw/, '.tui font size is min(cap, a cqw expression)');
  assert.equal(token('tui-size'), '12.5px', 'the cap is today\'s size');
});

test('at any frame width the 120 columns fit the frame, in the widest grid font too, so .tui needs no sideways scroll', () => {
  const [cap, cols, pad, advance] = [parseFloat(token('tui-size')), Number(token('tui-cols')), parseFloat(token('tui-pad-x')), Number(token('tui-advance'))];
  assert.equal(cols, 120, 'tmux captures at -x 120');
  assert.ok(advance >= 0.602 && advance <= 0.62, `--tui-advance ${advance} covers Menlo/DejaVu (0.602em) without leaving a wide gap`);
  assert.match(tuiRule, /padding:\s*16px var\(--tui-pad-x\)/, 'the padding the size is worked out from');
  for (const frame of [320, 358, 390, 600, 706, 900, 1000, 1200, 1600]) {
    const fs = captureFontSize(frame);
    const inner = frame - 2 * pad - 2; // padding and the two 1px borders
    assert.ok(fs > 0 && fs <= cap, `${frame}px frame: ${fs}px`);
    for (const em of [0.586, 0.602]) assert.ok(cols * em * fs <= inner + 0.01, `${frame}px frame: ${cols} columns of ${em}em at ${fs}px are wider than ${inner}px`);
    if (inner < cap * cols * advance) assert.ok(cols * 0.586 * fs >= 0.95 * inner, `${frame}px frame: Cascadia Mono fills at least 95% of the inner width`);
    else assert.equal(fs, cap, `${frame}px frame: a frame wider than the capture needs keeps ${cap}px`);
  }
});

test('the .tui box is no wider than its 120 columns need at the cap, so a wide frame leaves no gap inside the box', () => {
  assert.match(token('tui-max') ?? '', /--tui-size\) \* var\(--tui-cols\) \* var\(--tui-advance\) \+ 2 \* var\(--tui-pad-x\) \+ 2px/);
  assert.match(tuiRule, /width:\s*min\(100%,\s*var\(--tui-max\)\)/);
});

// ---- Owner copy fixes (Devesh 2026-10-05) ----------------------------------------------------------
// v0.15.0: MetalLB and Calico peers read "Configured" with no uptime (crates/kube/src/bgp.rs:1593,1611 and 1746,1762); only
// Cilium live status gives Established and an uptime (bgp.rs:1328-1329, 1380); timers are configured values with "(default)"
// fallbacks (apps/tui/src/views/bgp_view.rs:1107,1111); nothing counts down.

test('B6: the BGP bullets promise no countdowns and no live Established/Active/Idle states', () => {
  assert.doesNotMatch(main, /countdown/i);
  assert.doesNotMatch(main, /<code>Established<\/code>, <code>Active<\/code>, <code>Idle<\/code>/);
  assert.ok(html.includes('<li><strong>Peering Sessions:</strong> BGP neighbors with remote ASN, session state (<code>Established</code> when the CNI reports it, otherwise <code>Configured</code>), and uptime for Cilium.</li>'));
  assert.ok(html.includes('<li><strong>Prefix Announcements:</strong> Track advertised Service VIPs and Pod CIDRs, plus the configured hold and keep-alive timers for each peer.</li>'));
});

// The v0.15.0 TUI overview prints "Nodes: ready/total Ready" (apps/tui/src/views/overview_view.rs:45,142-143, counted at
// apps/tui/src/app.rs:1620) and has no pressure conditions or drilldown; conditions live in the Node inspector only.
test('B7: the cluster overview bullet says node readiness, not pressure conditions or drilldown', () => {
  const overview = sectionOf('cluster-overview');
  assert.doesNotMatch(overview, /MemoryPressure|DiskPressure|PIDPressure/);
  const bullet = overview.match(/<li><strong>Node Fleet Health:<\/strong>[\s\S]*?<\/li>/)?.[0];
  assert.equal(bullet, '<li><strong>Node Fleet Health:</strong> See how many nodes are <code>Ready</code> at a glance.</li>');
});

test('C9: the /tui/ lede and its meta, Open Graph and Twitter descriptions say "fast", not "ultra-fast" or "blazing-fast"', () => {
  assert.doesNotMatch(html, /blazing|ultra-?fast/i);
  assert.ok(text(main).includes('inside a single, fast native binary.'));
});

test('C10: "pure Rust" is gone from the /tui/ body, badge, compare cell and JSON-LD; titles keep "Pure-Rust"', () => {
  const titles = html.match(/<(?:title>|meta (?:property="og:title"|name="twitter:title") content=")srelens-tui — Pure-Rust Terminal UI for Kubernetes/g) ?? [];
  assert.equal(titles.length, 3, 'title, og:title and twitter:title keep "Pure-Rust"');
  const rest = html.replace(/srelens-tui — Pure-Rust Terminal UI for Kubernetes/g, '');
  assert.doesNotMatch(rest, /pure[- ]rust/i);
  assert.ok(html.includes('<td>Rust (kube-rs + Ratatui)</td>'));
});
