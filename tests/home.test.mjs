import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, ldNodes, text } from './lib/site.mjs';
import { captureHtml } from '../scripts/embed-captures.mjs';

const html = read('index.html');

test('the H1 carries exactly one accent phrase: "control room"', () => {
  const h1 = html.match(/<h1[\s\S]*?<\/h1>/)[0];
  assert.equal((h1.match(/class="accent"/g) ?? []).length, 1);
  assert.match(h1, /<span class="accent">control room<\/span>/);
});

test('mode switch: a tablist hidden until JS runs, two tabs wired to two panels', () => {
  assert.match(html, /<div class="mode-tabs" role="tablist" aria-label="Choose an app" hidden>/);
  for (const mode of ['desktop', 'terminal']) {
    assert.match(html, new RegExp(`id="mode-tab-${mode}"[^>]*role="tab"[^>]*aria-controls="mode-${mode}"[^>]*data-mode-tab="${mode}"`));
    assert.match(html, new RegExp(`id="mode-${mode}"[^>]*role="tabpanel"[^>]*aria-labelledby="mode-tab-${mode}"[^>]*data-mode-panel="${mode}"`));
  }
});

test('without JavaScript both panels render and each carries its own label', () => {
  for (const mode of ['desktop', 'terminal']) {
    const panel = html.match(new RegExp(`<div class="mode-panel" id="mode-${mode}"[^>]*>\\s*<p class="mode-label">${mode}</p>`));
    assert.ok(panel, `${mode} panel with label`);
    assert.doesNotMatch(panel[0], /\shidden[\s>]/, `${mode} panel is not hidden in the markup`);
  }
});

test('the terminal panel embeds the real pods capture', () => {
  assert.ok(html.includes(`<!-- capture:pods:start -->${captureHtml('pods')}<!-- capture:pods:end -->`));
});

test('the terminal caption and label never claim CrashLoopBackOff (v0.15.0 shows the pod phase)', () => {
  const figure = html.match(/<figure class="tui-figure">[\s\S]*?<\/figure>/)[0];
  const outsideCapture = figure.replace(/<pre class="tui"[^>]*>[\s\S]*?<\/pre>/, (pre) => pre.match(/<pre[^>]*>/)[0]);
  assert.doesNotMatch(outsideCapture, /CrashLoopBackOff/);
  assert.match(outsideCapture, /<figcaption>text capture · srelens-tui v0\.15\.0 on the same cluster · select it<\/figcaption>/);
});

test('the incident drill sits in #workflow, before #features', () => {
  const workflow = html.indexOf('id="workflow"');
  const drill = html.indexOf('class="slo-strip incident-drill"');
  assert.ok(workflow > 0 && drill > workflow && drill < html.indexOf('id="features"'));
});

test('the hero keeps the download, terminal and GitHub actions', () => {
  const hero = html.slice(html.indexOf('<section class="hero">'), html.indexOf('</section>', html.indexOf('id="mode-terminal"')));
  for (const href of ['/download/', '/download/#tui', 'https://github.com/srelens/srelens']) assert.ok(hero.includes(`href="${href}"`), href);
  assert.ok(hero.includes('data-copy="brew install srelens/tap/srelens-tui"'));
});

test('the desktop panel keeps both real screenshots and the walkthrough trigger', () => {
  const desktop = html.match(/<div class="mode-panel" id="mode-desktop"[\s\S]*?<div class="mode-panel" id="mode-terminal"/)[0];
  assert.match(desktop, /<img class="shot-dark" src="\/assets\/shots\/dark-overview\.webp"[^>]*fetchpriority="high"/);
  assert.match(desktop, /<img class="shot-light" src="\/assets\/shots\/light-overview\.webp"/);
  assert.match(desktop, /<button class="tour-play" type="button" data-tour-open/);
  assert.match(desktop, /<button class="text-action" type="button" data-tour-open>play walkthrough<\/button>/);
});

// ---- Verified keycaps (claims check, Decision 4). Cells without a verified binding carry no keys row;
// the row is the LAST child so kickers and headings line up across a row and the keycaps sit at the bottom. ----
const KEYS = {
  '35 resource kinds + CRDs': null,
  'Streaming watches': null,
  'Command palette': '<p class="keys"><kbd>⌘K</kbd> desktop · tui <kbd>:</kbd></p>',
  'Helm &amp; CRDs': '<p class="keys">tui <kbd>:helm</kbd> <kbd>:crds</kbd></p>',
  'Cluster usage': '<p class="keys">tui <kbd>:top</kbd> <kbd>:overview</kbd></p>',
  'Safe cluster actions': '<p class="keys">tui <kbd>Ctrl</kbd>+<kbd>s</kbd> scale · <kbd>Ctrl</kbd>+<kbd>r</kbd> restart · <kbd>Ctrl</kbd>+<kbd>d</kbd> delete</p>',
  'Multi-kubeconfig': '<p class="keys">tui <kbd>F1</kbd>-<kbd>F10</kbd> switch · <kbd>Ctrl</kbd>+<kbd>x</kbd> picker</p>',
  'Browser-style tabs': '<p class="keys"><kbd>⌘W</kbd> close tab (macOS)</p>',
  'Local-first': null,
  'srelens-tui in your shell': '<p class="keys"><kbd>l</kbd> logs · <kbd>s</kbd> shell · <kbd>t</kbd> tree · <kbd>Tab</kbd> assistant</p>',
};
const cells = [...html.matchAll(/<article class="bento-cell">([\s\S]*?)<\/article>/g)].map((m) => m[1].trim());

test('#everything has the ten cells, in order', () => {
  assert.deepEqual(cells.map((c) => c.match(/<h3>([\s\S]*?)<\/h3>/)[1]), Object.keys(KEYS));
});

for (const [heading, keys] of Object.entries(KEYS)) {
  test(`bento cell "${heading}": ${keys ? 'keys row is the last child' : 'no keys row'}`, () => {
    const cell = cells.find((c) => c.includes(`<h3>${heading}</h3>`));
    assert.ok(cell, `a cell headed "${heading}"`);
    if (keys) {
      assert.ok(cell.endsWith(keys), `ends with ${keys}`);
      assert.ok(cell.startsWith('<span class="kicker">'), 'the kicker stays first');
      assert.equal((cell.match(/class="keys"/g) ?? []).length, 1, 'exactly one keys row');
    } else assert.doesNotMatch(cell, /class="keys"/);
  });
}

// The keys row is a <p>, so `.bento-cell p` (0,1,1) would set it to 15px; the more specific rule must win.
// Declaration block of a standalone rule that starts a line, e.g. rule('.bento-cell .keys'); null when absent.
const rule = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return read('site.css').match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? null;
};

test('.bento-cell .keys is sized 11px and out-specifies .bento-cell p', () => {
  const body = rule('.bento-cell .keys');
  assert.ok(body, '.bento-cell .keys rule exists');
  assert.match(body, /font-size:\s*11px/);
  assert.match(body, /color:\s*var\(--muted\)/);
});

test('bento cells are flex columns and the keys row is pushed to the bottom', () => {
  const cell = rule('.bento-cell');
  assert.ok(cell, 'standalone .bento-cell rule exists');
  assert.match(cell, /display:\s*flex/);
  assert.match(cell, /flex-direction:\s*column/);
  assert.match(cell, /gap:\s*8px/);
  const keysRule = rule('.bento-cell .keys');
  assert.ok(keysRule, '.bento-cell .keys rule exists');
  assert.match(keysRule, /margin:\s*auto 0 0/);
  assert.match(keysRule, /padding-top:\s*4px/);
});

// ---- Single-character shortcuts must be discoverable and scoped (WCAG 2.1.4); main.test.mjs covers the scoping. ----
test('the mode tabs declare their single-key shortcuts', () => {
  assert.match(html, /id="mode-tab-desktop"[^>]*aria-keyshortcuts="1"/);
  assert.match(html, /id="mode-tab-terminal"[^>]*aria-keyshortcuts="2"/);
});

// ---- Approved copy fixes (claims check C02, C07). Nothing on this page may still say "0ms" or "40+". ----
test('the page no longer claims "0ms" or "40+" anywhere, including structured data', () => {
  assert.doesNotMatch(html, /0ms/);
  assert.doesNotMatch(html, /40\+/);
});

test('JSON-LD feature list carries the reworded kinds and cache lines', () => {
  const app = ldNodes(html).find((n) => n['@type'] === 'SoftwareApplication');
  assert.ok(app.featureList.includes('Resource browser covering 35 built-in Kubernetes resource kinds plus custom resources'));
  assert.ok(app.featureList.includes('Live streaming resource watches and an in-memory Informer cache'));
});

test('bento and FAQ copy use the verified numbers', () => {
  assert.ok(html.includes('<h3>35 resource kinds + CRDs</h3>'));
  assert.ok(html.includes('<p>Standalone pure-Rust Ratatui interface with an in-memory Informer cache, deep Helm values diff, live topology, and embedded AI over SSH or locally.</p>'));
  assert.match(text(html), /resource browsing across 35 built-in kinds plus any CRD, live watches/);
});

// ---- Layout guard. At 390px the nowrap `brew install …` command (min-content 410px) stretched an auto grid
// column past the 358px panel and gave the page 51px of horizontal scroll. The panel's column must be able to shrink. ----
test('.mode-panel pins its single grid column to the panel width so the install command cannot widen the page', () => {
  const css = read('site.css');
  const rule = css.match(/\.mode-panel\s*\{([^}]*)\}/);
  assert.ok(rule, '.mode-panel rule exists');
  assert.match(rule[1], /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});
