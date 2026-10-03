import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, text, meta, ldNodes } from './lib/site.mjs';

// Task 14: /compare/ and the six comparison guides on the design system, plus the approved claim
// fix (docs/superpowers/plans/2026-10-02-tui-claims-check.md, row C02) that appears on /compare/k9s/.

const HUB = 'compare/index.html';
const GUIDES = ['lens', 'headlamp', 'k9s', 'freelens', 'aptakube', 'kubernetes-dashboard'];
const FILES = [HUB, ...GUIDES.map((g) => `compare/${g}/index.html`)];
const css = read('site.css');
const pages = new Map(FILES.map((f) => [f, read(f)]));
const mainOf = (html) => html.slice(html.indexOf('<main'), html.indexOf('</main>'));
const classesIn = (html) => {
  const used = new Set();
  for (const m of html.matchAll(/\sclass="([^"]*)"/g)) m[1].split(/\s+/).filter(Boolean).forEach((c) => used.add(c));
  return used;
};

// ---- shared ----------------------------------------------------------------------------------

test('every class used in <main> of the seven compare pages is styled in site.css', () => {
  const styled = new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));
  for (const [file, html] of pages) {
    const unstyled = [...classesIn(mainOf(html))].filter((c) => !styled.has(c));
    assert.deepEqual(unstyled, [], `${file}: classes with no rule in site.css`);
  }
});

// The shell accents a gradient phrase of four words or fewer and unwraps longer ones; nothing is added by hand.
const ACCENTS = new Map([
  [HUB, 'without the sales fog.'],
  ['compare/freelens/index.html', 'two open-source Kubernetes IDEs.'],
  ['compare/kubernetes-dashboard/index.html', 'What should replace it?'],
]);

test('each compare page has one H1; the three short gradient phrases are its only accent, four words or fewer', () => {
  for (const [file, html] of pages) {
    const h1s = [...html.matchAll(/<h1[\s>][\s\S]*?<\/h1>/g)].map((m) => m[0]);
    assert.equal(h1s.length, 1, `${file}: one h1`);
    const accents = [...h1s[0].matchAll(/<span class="accent">([\s\S]*?)<\/span>/g)].map((m) => text(m[1]));
    assert.deepEqual(accents, ACCENTS.has(file) ? [ACCENTS.get(file)] : [], `${file}: accent phrase`);
    for (const a of accents) assert.ok(a.split(/\s+/).length <= 4, `${file}: accent "${a}"`);
    assert.equal((mainOf(html).match(/class="accent"/g) ?? []).length, accents.length, `${file}: accent only on the H1`);
  }
});

test('comparison tables scroll inside .compare-scroll, and every header cell says what it heads', () => {
  for (const [file, html] of pages) {
    const tables = [...mainOf(html).matchAll(/<table>[\s\S]*?<\/table>/g)].map((m) => m[0]);
    assert.ok(tables.length >= 1, `${file}: has a table`);
    assert.equal((mainOf(html).match(/<div class="compare-scroll"><table>/g) ?? []).length, tables.length, `${file}: every table sits in .compare-scroll`);
    for (const table of tables) {
      assert.doesNotMatch(table, /<th(?![^>]*\sscope="(?:col|row)")[\s>]/, `${file}: a <th> has no scope`);
      const head = table.match(/<thead>([\s\S]*?)<\/thead>/)[1];
      const body = table.match(/<tbody>([\s\S]*?)<\/tbody>/)[1];
      assert.doesNotMatch(head, /scope="row"/, `${file}: header row cells are columns`);
      for (const row of body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) assert.match(row[1], /^\s*<th scope="row">/, `${file}: first cell of a body row is its row header`);
    }
  }
});

test('the scrolling table keeps its first column in view and the verdict cards stack on a phone', () => {
  assert.match(css, /\.compare-scroll \{ overflow-x: auto;/);
  assert.match(css, /\.compare-scroll tbody th \{ position: sticky; left: 0;/);
  assert.match(css, /@media \(max-width: 760px\) \{ \.verdict-grid \{ grid-template-columns: minmax\(0, 1fr\); \} \}/);
});

// ---- /compare/ hub ---------------------------------------------------------------------------

test('/compare/ cards link each of the six guides, in order, and the quick table lists all six tools', () => {
  const html = pages.get(HUB);
  const hrefs = [...mainOf(html).matchAll(/<a class="compare-card" href="([^"]+)">/g)].map((m) => m[1]);
  assert.deepEqual(hrefs, GUIDES.map((g) => `/compare/${g}/`));
  const rows = [...mainOf(html).matchAll(/<tbody>([\s\S]*?)<\/tbody>/g)][0][1].match(/<tr>/g);
  assert.equal(rows.length, 6);
});

// ---- the six guides --------------------------------------------------------------------------

test('each guide keeps its two verdict cards (srelens first) and the sources and related links', () => {
  for (const g of GUIDES) {
    const html = mainOf(pages.get(`compare/${g}/index.html`));
    const verdicts = [...html.matchAll(/<article class="(verdict[^"]*)">/g)].map((m) => m[1]);
    assert.deepEqual(verdicts, ['verdict srelens-pick', 'verdict'], g);
    assert.ok(html.includes('<div class="verdict-grid">'), `${g}: verdict grid`);
    assert.ok(html.includes('<p class="source-note">Sources checked:'), `${g}: sources note`);
    assert.equal((html.match(/<div class="related-comparisons">/g) ?? []).length, 1, `${g}: related comparisons`);
    assert.doesNotMatch(html, /<section[^>]*class="section"[^>]*style=/, `${g}: no inline padding override`);
  }
});

// ---- /compare/k9s/: the "0ms" Informer cache claim (C02) -------------------------------------

test('/compare/k9s/ no longer claims "0ms" anywhere: body, meta tags or structured data', () => {
  const html = pages.get('compare/k9s/index.html');
  assert.doesNotMatch(html, /\b0ms\b/i);
  for (const key of ['description', 'og:description', 'twitter:description']) assert.doesNotMatch(meta(html, key) ?? '', /0ms/, key);
  assert.doesNotMatch(JSON.stringify(ldNodes(html)), /0ms/);
});

test('/compare/k9s/ says "in-memory Informer cache" with the approved wording at every spot that said "0ms" (C02)', () => {
  const html = pages.get('compare/k9s/index.html');
  const body = text(mainOf(html));
  assert.equal(
    meta(html, 'description'),
    'Compare srelens and K9s: srelens offers both a multi-tab desktop workspace and a standalone pure-Rust terminal UI (srelens-tui) with an in-memory Informer cache, deep Helm values diff, and built-in AI MCP, compared to K9s.',
  );
  for (const sentence of [
    // hero lede
    'srelens gives operators both a multi-tab desktop workspace and an ultra-fast, pure-Rust terminal UI (srelens-tui) featuring an in-memory Informer cache, deep Helm values diff, live topology, and embedded AI.',
    // "Choose srelens when" bullet
    'You want instant screen switching for views already opened, with an in-memory Informer cache.',
    // table, "Investigation model" and "Caching & Speed" rows
    'Desktop tabs plus split terminal views with an in-memory Informer cache',
    'In-memory Informer cache (instant screen switching for views already opened) + streaming watches',
    // "Does srelens replace K9s?" and "Which is better over SSH?"
    'Because srelens provides both srelens-tui (pure-Rust, in-memory Informer cache, deep Helm diffs, topology flow, GPU VRAM tracking, and embedded AI) and the desktop GUI,',
    'in minimal cloud bastions, with instant navigation between cluster views already opened.',
  ]) assert.ok(body.includes(sentence), sentence);
});

// ---- fix round 1 -----------------------------------------------------------------------------

test('the old per-guide footer disclaimers that the canonical footer does not cover stay on the page (Aptakube)', () => {
  // The canonical footer names Mirantis (Lens) and the Freelens project only; the Aptakube guide's old footer said
  // "not affiliated with Aptakube", so that sentence now lives in <main>, right after the sources note.
  const main = mainOf(pages.get('compare/aptakube/index.html'));
  assert.match(main, /<p class="source-note">Sources checked:[^]*?<\/p>\s*<p class="source-note">srelens is not affiliated with Aptakube\.<\/p>/);
  assert.ok(text(main).includes('not affiliated with Aptakube'));
});

test('the table corner cell is pinned with the row labels, so a column header never slides over them', () => {
  assert.match(css, /\.compare-scroll thead th:first-child \{ position: sticky; left: 0; z-index: 1; \}/);
  assert.match(css, /\.compare-scroll thead th \{[^}]*background: var\(--sunk\)/);
});
