import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, text, decode, ids } from './lib/site.mjs';

// Task 15: the long-form pages (docs, TUI docs, guides, security, architecture) on the design system,
// plus every approved claim fix (docs/superpowers/plans/2026-10-02-tui-claims-check.md, Decisions 1 and 2)
// that appears on them. Row ids (B28, C11, ...) refer to that file.

const FILES = [
  'docs/index.html', 'docs/tui/index.html', 'guides/index.html', 'guides/crashloopbackoff/index.html',
  'guides/oomkilled/index.html', 'guides/failed-deployment/index.html', 'security/index.html', 'architecture/index.html',
];
const css = read('site.css');
const pages = new Map(FILES.map((f) => [f, read(f)]));
const tui = pages.get('docs/tui/index.html');
const docs = pages.get('docs/index.html');
const mainOf = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>'));
// The generated terminal captures (<pre class="tui">) are real product output, not page copy: prose checks skip them.
const bare = (html) => html.replace(/<pre class="tui"[\s\S]*?<\/pre>/g, '');
const prose = (html) => text(bare(mainOf(html)));
// Compare markup without caring how a page wraps or indents it.
const squash = (s) => s.replace(/\s+/g, ' ').replace(/> </g, '><');
// Failure messages name what was found; they never dump a whole page.
const never = (html, re, label) => {
  const m = html.match(re);
  assert.ok(!m, `${label}: found "${m?.[0]}"`);
};
const has = (html, snippet) => assert.ok(squash(html).includes(squash(snippet)), `missing: ${snippet}`);
// The text of every code block on a page, so a test does not care how a block is highlighted.
const codeOf = (html) => [...mainOf(html).matchAll(/<pre[^>]*><code>([\s\S]*?)<\/code><\/pre>/g)].map((m) => decode(m[1].replace(/<[^>]+>/g, ''))).join('\n');
const hasCode = (html, snippet) => assert.ok(squash(codeOf(html)).includes(squash(snippet)), `missing in a code block: ${snippet}`);
const classesIn = (html) => {
  const used = new Set();
  for (const m of html.matchAll(/\sclass="([^"]*)"/g)) m[1].split(/\s+/).filter(Boolean).forEach((c) => used.add(c));
  return used;
};
const h2s = (html) => [...mainOf(html).matchAll(/<h2(?:\s+id="([^"]+)")?[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => ({ id: m[1] ?? null, title: text(m[2]) }));
const tocOf = (html) => [...html.match(/<aside class="content-nav"[\s\S]*?<\/aside>/)[0].matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);

// ---- shared ----------------------------------------------------------------------------------

test('every class used in <main> of the long-form pages is styled in site.css', () => {
  const styled = new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));
  for (const [file, html] of pages) {
    const unstyled = [...classesIn(mainOf(html))].filter((c) => !styled.has(c));
    assert.deepEqual(unstyled, [], `${file}: classes with no rule in site.css`);
  }
});

test('each long-form page has one H1, and any accent is on the H1 only and four words or fewer', () => {
  for (const [file, html] of pages) {
    const h1s = [...html.matchAll(/<h1[\s>][\s\S]*?<\/h1>/g)].map((m) => m[0]);
    assert.equal(h1s.length, 1, `${file}: one h1`);
    const accents = [...h1s[0].matchAll(/<span class="accent">([\s\S]*?)<\/span>/g)].map((m) => text(m[1]));
    assert.ok(accents.length <= 1, `${file}: at most one accent`);
    for (const a of accents) assert.ok(a.split(/\s+/).length <= 4, `${file}: accent "${a}"`);
    assert.equal((mainOf(html).match(/class="accent"/g) ?? []).length, accents.length, `${file}: accent only on the H1`);
  }
});

test('every page with a table of contents lays it out as .content-shell: sticky .content-nav beside .prose', () => {
  for (const [file, html] of pages) {
    if (file === 'guides/index.html') continue;
    assert.ok(/<div class="wrap content-shell">\s*<aside class="content-nav" aria-label="[^"]+">[\s\S]*?<\/aside>\s*<article class="prose">/.test(mainOf(html)), file);
  }
});

test('every <pre> is a .codeblock (terminal font, scrolls in its box) and each copy button copies exactly its code', () => {
  for (const [file, html] of pages) {
    const body = bare(mainOf(html));
    const pres = (body.match(/<pre[\s>]/g) ?? []).length;
    const blocks = [...body.matchAll(/<div class="codeblock">([\s\S]*?)<\/div>/g)].map((m) => m[1]);
    assert.equal(blocks.length, pres, `${file}: every <pre> sits in a .codeblock`);
    for (const block of blocks) {
      const code = block.match(/<pre[^>]*><code>([\s\S]*?)<\/code><\/pre>/);
      assert.ok(code, `${file}: pre > code`);
      const btn = block.match(/<button class="copy-btn" type="button" data-copy=(?:"([^"]*)"|'([^']*)')>copy<\/button>/);
      if (btn) assert.equal(decode(btn[1] ?? btn[2]), decode(code[1].replace(/<[^>]+>/g, '')), `${file}: copy payload`);
    }
  }
});

test('tables keep their header row and name each column (scope="col")', () => {
  for (const [file, html] of pages) {
    for (const table of mainOf(html).matchAll(/<table>[\s\S]*?<\/table>/g)) {
      assert.ok(table[0].includes('<thead>'), `${file}: table has a thead`);
      never(table[0], /<th(?![^>]*\sscope="col")[\s>]/, `${file}: a <th> has no scope`);
    }
  }
});

test('the guides index keeps the spacing its inline margin-top: 42px used to carry', () => {
  assert.ok(/\.guide-grid \+ \.operator-callout \{ margin-top: 42px; \}/.test(css), 'site.css has the rule');
});

test('in prose the copy button is a column beside the code, so it never covers the first line of a long command', () => {
  assert.ok(/\.prose \.codeblock \{[^}]*display: grid;[^}]*grid-template-columns: minmax\(0, 1fr\) auto;/.test(css), 'two-column code block');
  assert.ok(/\.prose \.codeblock \.copy-btn \{[^}]*position: static;/.test(css), 'button leaves the absolute position');
});

// ---- /docs/tui/ structure --------------------------------------------------------------------

const TUI_TOC = [
  'overview', 'install', 'cli-usage', 'command-palette', 'keybindings', 'ai-assistant', 'argocd-gitops', 'pod-operations',
  'helm-inspector', 'gpu-fleet', 'bgp-dashboard', 'log-streamer', 'resource-tree', 'debug-shells', 'node-ssh', 'tui-mcp',
  'crd-support', 'troubleshooting',
];

test('/docs/tui/ keeps its 18-entry table of contents, in document order (the scrollspy walks it top to bottom)', () => {
  assert.deepEqual(tocOf(tui), TUI_TOC);
  assert.deepEqual(h2s(tui).map((h) => h.id), TUI_TOC);
});

test('/docs/tui/ keeps two real screenshots as images; the other ten are text captures (Task 21, then the Argo config screen)', () => {
  const shots = [...mainOf(tui).matchAll(/<figure class="shot">\s*<img src="([^"]+)" width="(\d+)" height="(\d+)" alt="([^"]{10,})">\s*<\/figure>/g)];
  assert.deepEqual(shots.map((m) => m[1].replace('/assets/shots/', '')), ['tui-assistant.webp', 'argocd-hub-spoke.png']);
  assert.equal((mainOf(tui).match(/<figure class="tui-figure">/g) ?? []).length, 10);
});

// ---- /docs/tui/ claim fixes ------------------------------------------------------------------

test('/docs/tui/ MCP: every client config and command uses the subcommand spelling --allow-* (B69, B70)', () => {
  // `srelens-tui mcp --mcp-allow-*` exits 2 on v0.15.0; only the top-level --mcp-stdio form takes --mcp-allow-*.
  never(tui, /--mcp-allow-/, 'the page');
  const configs = [...codeOf(tui).matchAll(/"args":\s*\[([^\]]*)\]/g)].map((m) => JSON.parse(`[${m[1]}]`));
  assert.equal(configs.length, 4, 'Cursor, Claude Desktop, Gemini / Antigravity and generic client configs');
  for (const args of configs) assert.deepEqual(args, ['mcp', '--allow-sensitive-reads', '--allow-destructive']);
  hasCode(tui, '# Allow reading sensitive Secret data in plaintext\nsrelens-tui mcp --allow-sensitive-reads');
  hasCode(tui, '# Allow mutating and destructive operations\nsrelens-tui mcp --allow-destructive');
  hasCode(tui, '# Full access (sensitive reads + destructive mutations)\nsrelens-tui mcp --allow-sensitive-reads --allow-destructive');
  hasCode(tui, 'claude mcp add srelens -- srelens-tui mcp --allow-sensitive-reads --allow-destructive');
  const copied = [...tui.matchAll(/data-copy=(?:"([^"]*)"|'([^']*)')/g)].map((m) => decode(m[1] ?? m[2]));
  assert.ok(copied.length >= 5, 'the config blocks carry copy buttons');
  for (const payload of copied) never(payload, /--mcp-allow-/, 'copy button payload');
});

test('/docs/tui/ MCP flag descriptions say what the flags really gate (C24)', () => {
  has(tui, '<code>--allow-sensitive-reads</code>: Allows the MCP server to run reads that return secret or host-level material, such as Secret contents (<code>k8s.getSecret</code>), node SSH diagnostics, and pod connection data.');
  has(tui, '<code>--allow-destructive</code>: Allows the MCP server to execute mutating/destructive operations (e.g. scaling workloads, rollout restarts, deleting resources, applying manifests, installing plugins).');
  never(prose(tui), /pod environment variables/, 'C24');
});

test('/docs/tui/ says 100+ tools, not 80+ (C06), and the safe-by-default sentence stays (C32)', () => {
  assert.ok(prose(tui).includes('exposing 100+ cluster tools (Kubernetes, Helm, toolbox and server tools) to AI agents (Cursor, Claude, Gemini, and custom agents).'));
  assert.ok(prose(tui).includes('By default, srelens-tui mcp runs in safe read-only mode: queries execute immediately, Secrets are masked, and mutating tools are blocked.'));
});

test('/docs/tui/ keybinding tables carry the verified keys (B06, B12, B23, B28, B29, B38, C26, C17)', () => {
  has(tui, '<tr><td><code>q</code></td><td>Close the help modal or leave a sub-view (quit with <code>:q</code> or <code>Ctrl+C</code>)</td></tr>');
  has(tui, '<tr><td><code>s</code></td><td>Open interactive container shell (tries <code>/bin/sh</code>, then <code>bash</code>)</td></tr>');
  has(tui, '<tr><td><code>s</code></td><td>Launch root node debug shell (from the Nodes view)</td></tr>');
  has(tui, '<tr><td><code>f</code> / <code>Shift + F</code></td><td>Open the port forward dialog for the selected pod or service (<code>Shift + F</code> closes an active forward)</td></tr>');
  has(tui, '<tr><td><code>c</code></td><td>Copy the loaded log lines to the clipboard</td></tr>\n<tr><td><code>s</code></td><td>Save the log buffer to a file in the system temp directory</td></tr>');
  has(tui, '<tr><td><code>/</code></td><td>Search log lines (case-insensitive; matches are highlighted, <code>n</code> / <code>N</code> jump between them)</td></tr>');
  never(prose(tui), /Quit or exit current subview|Switch container in multi-container|Filter log lines in real-time|auto-detects/, 'old wording');
});

test('/docs/tui/ command table: real aliases and descriptions (B48, B58, C14, C19, C27)', () => {
  has(tui, '<td><code>:peering</code>, <code>:peers</code></td>');
  has(tui, '<tr><td><code>:pf</code></td><td><code>:portforwards</code></td><td>Manage active background port forwards with byte counters</td></tr>');
  has(tui, '<td>List Secrets with values masked</td>');
  has(tui, '<td>Configure AI provider, API key, model, endpoint, max tokens and timeout</td>');
  has(tui, 'Press <code>:</code> and type <code>:config</code> to open the TUI configuration screen:');
  never(tui, /:bgp-peers|:port-forwards/, 'unrecognised aliases');
});

test('/docs/tui/ AI section: estimated tokens, real providers and the shipped slash commands (C05, C08, B65, B67)', () => {
  assert.ok(prose(tui).includes('The AI assistant drawer provides in-process conversational diagnosis with an estimated token count per reply and direct Kubernetes MCP tool execution.'));
  has(tui, '<li><strong>Anthropic Claude:</strong> default model <code>claude-3-7-sonnet-20250219</code>; any Claude model ID can be set.</li>\n<li><strong>OpenAI:</strong> default model <code>gpt-4o</code>; any chat model ID can be set.</li>\n<li><strong>Google Gemini:</strong> default model <code>gemini-2.5-flash</code>; any Gemini model ID can be set.</li>\n<li><strong>OpenAI-compatible / Ollama (local):</strong> defaults to <code>http://localhost:11434/v1</code> and <code>llama3.2</code>; point it at any OpenAI-compatible endpoint.</li>');
  has(tui, '<tr><td><code>/endpoints</code></td><td>Debugs a Service with no ready endpoints: selector vs labels, readiness probes, targetPort and EndpointSlices</td></tr>');
  assert.deepEqual([...mainOf(tui).matchAll(/<td><code>(\/[a-z]+)<\/code><\/td>/g)].map((m) => m[1]), ['/crashloop', '/oom', '/rollout', '/endpoints', '/caveman']);
});

test('/docs/tui/ overview and sections: instant for opened views, Helm, rollback, BGP, logs, tree (C02, C11, C12, C13, C16, C17, C20, C14)', () => {
  assert.ok(prose(tui).includes('it delivers instant view switching for opened views via an in-memory Informer cache'));
  has(tui, 'Press <code>Enter</code> on any Helm release to launch the 5-tab Helm Inspector. Reading releases does not need the <code>helm</code> CLI; rollback calls your local <code>helm</code>.');
  has(tui, '<li><strong>Three Diff Modes:</strong> Compare user values vs. computed values or chart defaults, or diff the current release vs. the prior revision (<code>m</code> cycles the mode).</li>');
  has(tui, '<li><strong>Safe Rollback (<code>r</code>):</strong> Select any prior revision and press <code>r</code> to trigger a confirmation-gated rollback.</li>');
  has(tui, '<li><strong>MetalLB:</strong> Inspects <code>BGPPeer</code> and <code>IPAddressPool</code> resources.</li>');
  has(tui, '<li><strong>Calico:</strong> Discovers <code>BGPPeer</code> resources.</li>');
  has(tui, '<li><strong>Severity Highlighting:</strong> Colors error and fatal lines red, warnings yellow, and debug lines dim.</li>');
  assert.ok(prose(tui).includes('to visualize the complete owner-reference hierarchy tree from Ingress down to Pods, plus ConfigMaps, Secrets, PVCs and Nodes.'));
  has(tui, '<li><strong>Port Forwarding (<code>Shift + F</code>):</strong> Quick port forwarding with byte counters.</li>');
  never(prose(tui), /sub-millisecond|3-Way|RBAC-preflighted|throughput|and HPAs|BGPAdvertisement|BGPConfiguration/, 'old claim');
});

test('/docs/tui/ pod bullets no longer promise a Shift + D key (B28), and the shells section is honest (B28, B29, C26)', () => {
  const pods = mainOf(tui).match(/<h2 id="pod-operations">[\s\S]*?<h2 id="helm-inspector">/)[0];
  never(pods, /Debug Containers/, 'pod bullets');
  has(tui, '<li><strong>Container Shell (<code>s</code>):</strong> Drops straight into a container shell, trying <code>/bin/sh</code>, <code>sh</code>, <code>bash</code> and <code>/bin/bash</code> in turn.</li>');
  has(tui, '<li><strong>Ephemeral Debug Containers (MCP):</strong> MCP clients that launch <code>srelens-tui mcp --allow-destructive</code> can attach an ephemeral debug container to a distroless pod without restarting it (<code>k8s.debugPod</code>).</li>');
  has(tui, '<li><strong>Privileged Node Shell (<code>s</code> on the Nodes view):</strong> Runs <code>kubectl debug node/&lt;name&gt;</code> to open a root shell with the node\'s host namespaces and filesystem reachable. Requires <code>kubectl</code> on your PATH.</li>');
});

test('/docs/tui/ node SSH: the TUI key is S, status / journal / restart are assistant and MCP tools (B29, C23)', () => {
  has(tui, '<code>srelens-tui</code> hands authentication to your system <code>ssh</code>, which offers agent identities first and then the standard keys in <code>~/.ssh/</code>:');
  has(tui, '<li><strong>Interactive Node SSH (<code>S</code> on the Nodes view):</strong> Opens an interactive <code>ssh</code> session to the node after you confirm the destination (InternalIP, then ExternalIP).</li>');
  has(tui, '<li><strong>Systemd Status (assistant / MCP, needs <code>--allow-sensitive-reads</code>):</strong> Check system service states (<code>systemctl status &lt;service&gt;</code>) without an operational kubelet.</li>');
  has(tui, '<li><strong>Journal Logs (assistant / MCP, needs <code>--allow-sensitive-reads</code>):</strong> Retrieve systemd journal logs (<code>journalctl -u &lt;service&gt;</code>, with <code>--since</code> and <code>--grep</code> filters).</li>');
  has(tui, '<li><strong>Guarded Restarts (MCP, needs <code>--allow-destructive</code>):</strong> Restart a system service such as <code>kubelet</code> or <code>rke2-server</code> from an MCP client that launches <code>srelens-tui mcp --allow-destructive</code>.</li>');
  never(prose(tui), /negotiates SSH authentication automatically|Stream systemd journal|Safely trigger controlled service restarts/, 'old SSH claim');
});

test('/docs/tui/ keeps the rows marked keep: ArgoCD hub and spoke (C33), GPU models (C30)', () => {
  assert.ok(prose(tui).includes('Reads cluster registration secrets (labeled argocd.argoproj.io/secret-type: cluster) from the hub cluster.'));
  assert.ok(prose(tui).includes('Running :argo on a spoke cluster shows only applications deployed to that target.'));
  assert.ok(prose(tui).includes('Automatically detects hardware accelerator classes (H100, A100, L4, T4, Tesla).'));
});

test('/docs/tui/ and /docs/ never say the TUI pods table shows CrashLoopBackOff (D2)', () => {
  // The Kubernetes state is a pod phase of Running with READY 0/1 in the TUI; the only mention left is the /crashloop playbook.
  assert.equal((prose(tui).match(/CrashLoopBackOff/g) ?? []).length, 1);
  has(tui, '<tr><td><code>/crashloop</code></td><td>Automated CrashLoopBackOff analysis: pulls exit codes, crash logs, and event cascades</td></tr>');
  never(prose(docs), /CrashLoopBackOff/, '/docs/');
});

// ---- /docs/ claim fixes ----------------------------------------------------------------------

test('/docs/ TUI section carries the approved wording (B28, B29, B65, C02, C06, C11, C12, C14, C26)', () => {
  has(docs, '<li><strong>Tab 2 — Values Diff:</strong> Built-in diff engine compares <em>User-Supplied Values</em> against <em>Computed All-Values</em>, chart defaults, or the previous release revision (press <code>m</code> to cycle).</li>');
  has(docs, 'Press <strong>Enter</strong> on any release to launch the 5-tab Deep Helm Inspector. Reading releases does not need the <code>helm</code> CLI; rollback calls your local <code>helm</code>:');
  has(docs, '<li><strong>Built-in Slash Commands:</strong> Run quick investigation macros like <code>/crashloop</code>, <code>/oom</code>, <code>/rollout</code>, or <code>/endpoints</code> to trigger standardized diagnostic workflows.</li>');
  has(docs, '<li><strong>Node SSH &amp; Out-of-Band Recovery (<a href="/docs/tui/#node-ssh"><code>S</code> on the Nodes view</a>):</strong>');
  has(docs, '<li><strong>Headless MCP Server (<a href="/docs/tui/#tui-mcp"><code>srelens-tui mcp</code></a>):</strong> Expose 100+ cluster tools to Cursor, Claude, and Gemini over stdio with explicit mutation consent gates.</li>');
  has(docs, '<li><strong>Instant Shells &amp; Deep Debugging:</strong> Press <code>s</code> to drop into a container shell, trying <code>/bin/sh</code>, then <code>bash</code>, through your local <code>kubectl</code>. Open a privileged node shell with <code>s</code> on the Nodes view. MCP clients that launch <code>srelens-tui mcp --allow-destructive</code> can attach ephemeral debug containers to distroless pods (<code>k8s.debugPod</code>). External interactive sessions run on an alternate screen with zero terminal debris on exit.</li>');
  has(docs, 'Manage background port-forwards with live byte counters and automatic reconnects (<code>:pf</code>).');
  has(docs, 'Instant view switching for opened views, powered by an in-memory Informer cache,');
});

test('/docs/ keybinding table: no Shift + D / Shift + N; node shell is s on Nodes; shell and log rows are accurate (B28, B29, B38, C26)', () => {
  has(docs, '<tr><td><code>s</code></td><td>Workloads / Pods</td><td>Open container shell (tries <code>/bin/sh</code>, then <code>bash</code>)</td></tr>');
  has(docs, '<tr><td><code>s</code></td><td>Nodes</td><td>Launch root node debug shell</td></tr>');
  has(docs, '<tr><td><code>c</code> / <code>p</code></td><td>Logs</td><td>Copy loaded log lines / Toggle previous (crashed) logs</td></tr>');
  never(docs, /Inject ephemeral debug container|Switch container/, 'old key rows');
});

// ---- every long-form page --------------------------------------------------------------------

test('no long-form page keeps a claim the owner rejected (B28, B29, B65, B67, C02, C06, C11)', () => {
  for (const [file, html] of pages) {
    never(html, /Shift \+ [DN]\b/, `${file}: Shift + D / Shift + N`);
    never(html, /<code>\/(?:network|explain|logs|playbook)<\/code>/, `${file}: slash command that does not exist at v0.15.0`);
    never(html, /\b0ms\b|sub-millisecond/i, `${file}: unmeasured latency`);
    never(html, /\b80\+/, `${file}: 80+`);
    never(html, /3-way/i, `${file}: 3-way diff`);
    never(text(html), /srelens-tui mcp\s+--mcp-allow-/, `${file}: --mcp-allow-* after srelens-tui mcp`);
    never(prose(html), /(?:\/bin\/)?bash (?:to|➔) (?:\/bin\/)?sh\b/, `${file}: bash then sh`);
  }
});

// ---- guides, architecture ---------------------------------------------------------------------

const GUIDES = { 'guides/crashloopbackoff/index.html': 6, 'guides/oomkilled/index.html': 5, 'guides/failed-deployment/index.html': 6 };

test('each guide keeps its numbered steps in order, and its contents list the anchored steps in document order', () => {
  for (const [file, steps] of Object.entries(GUIDES)) {
    const html = pages.get(file);
    const headings = h2s(html);
    assert.equal(headings.length, steps, `${file}: step count`);
    headings.forEach((h, i) => assert.ok(h.title.startsWith(`${i + 1}. `), `${file}: step ${i + 1} is "${h.title}"`));
    const toc = tocOf(html);
    assert.deepEqual(toc, headings.filter((h) => h.id).map((h) => h.id), `${file}: contents`);
    for (const id of toc) assert.ok(ids(html).has(id), `${file}: #${id}`);
  }
});

test('the guides index links the three guides in order, each as a card', () => {
  const cards = [...mainOf(pages.get('guides/index.html')).matchAll(/<a class="guide-card" href="([^"]+)">/g)].map((m) => m[1]);
  assert.deepEqual(cards, ['/guides/crashloopbackoff/', '/guides/oomkilled/', '/guides/failed-deployment/']);
});

test('the architecture plate keeps its flow: six nodes, three arrows, the last row of three', () => {
  const html = mainOf(pages.get('architecture/index.html'));
  const plate = html.match(/<div class="architecture-plate" role="img" aria-label="([^"]+)">([\s\S]*?)<h2>The capability registry<\/h2>/);
  assert.ok(plate, 'plate with an accessible label');
  assert.equal((plate[2].match(/class="architecture-node"/g) ?? []).length, 6);
  assert.equal((plate[2].match(/class="architecture-arrow"/g) ?? []).length, 3);
  assert.ok(/<div class="architecture-split">(?:\s*<div class="architecture-node">[\s\S]*?<\/div>){3}\s*<\/div>/.test(plate[2]), 'last row of three');
});

// ---- Owner copy fixes (Devesh 2026-10-05) ----------------------------------------------------------

test('B6: /docs/tui/ (and its mirror) promise no timer countdowns; the timers are configured values', () => {
  const timers = '<li><strong>Timers &amp; Metrics:</strong> Configured hold and keep-alive timers (defaults are labelled as such), and received/advertised route counts.</li>';
  for (const html of [tui, read('docs/tui.html')]) {
    never(prose(html), /countdown|real-time keep-alive/i, 'BGP timers');
    has(html, timers);
  }
});

// C12: items on /docs/ that the v0.15.0 source does not back. Source citations are in the claims-check decisions.
test('C12: /docs/ drops or rewrites the TUI phrases the source does not confirm', () => {
  never(prose(docs), /smart shell detection|negotiates keys via SSH agent|diagnostic lookups with confirmation gates|failing system services|sparklines/, 'unverified phrase');
  has(docs, 'interactive logs with hanging indent, automatic shell fallback, and embedded AI diagnostics—right in your terminal.');
  has(docs, "<li><strong>Model Context Protocol (MCP) Tools:</strong> Integrated with srelens's native MCP tool registry, allowing the AI to safely query cluster APIs and run diagnostic lookups. Tools that change the cluster are blocked in the assistant.</li>");
  has(docs, '<li><strong>Node SSH &amp; Out-of-Band Recovery (<a href="/docs/tui/#node-ssh"><code>S</code> on the Nodes view</a>):</strong> Open an interactive SSH session to triage unready nodes when the Kubernetes API cannot schedule debug pods. The AI assistant can also read service status and journal logs for services such as <code>kubelet</code>, <code>containerd</code> and <code>rke2-server</code>. Auto-resolves InternalIP and hands authentication to your system <code>ssh</code>, which offers agent identities first and then the standard keys in <code>~/.ssh/</code>.</li>');
});

test('C12: /docs/ keybinding table scopes Shift + F and m to the views that handle them', () => {
  // Shift + F: Pods and Services tables, plus Pod rows of Workloads; it closes an active forward (apps/tui/src/app.rs:4418-4468).
  has(docs, '<tr><td><code>Shift + F</code></td><td>Pods / Services</td><td>Start a background port-forward (closes the active one on the selected row)</td></tr>');
  // m: Pods, Nodes and Pod rows of Workloads open a CPU and memory line-chart panel (app.rs:4557-4609, views/metrics_panel_view.rs).
  has(docs, '<tr><td><code>m</code></td><td>Pods / Nodes</td><td>Open a metrics panel with CPU and memory line charts (5m to 1h)</td></tr>');
});
