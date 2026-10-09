import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, ldNodes, siteVersion, listPages, meta, canonical, h1s, refs } from './lib/site.mjs';
import { baselineFor } from './lib/baseline.mjs';
import { PAGES, page } from '../scripts/pages.mjs';
import {
  renderHeader, renderPathLine, renderFooter, breadcrumbLd, applyShell, THEME_INIT, STYLES, FONTS,
} from '../scripts/shell.mjs';

test('the manifest lists every published page exactly once', () => {
  assert.deepEqual(PAGES.map((p) => p.file).sort(), listPages());
});

test('header marks the current section in both nav lists', () => {
  const html = renderHeader(page('compare/k9s/index.html'));
  assert.equal((html.match(/aria-current="page"/g) ?? []).length, 2);
  assert.match(html, /<a href="\/compare\/" aria-current="page">/);
});

test('header marks nothing on the homepage', () => {
  assert.doesNotMatch(renderHeader(page('index.html')), /aria-current/);
});

test('path line renders crumbs, the last one as the current page', () => {
  assert.equal(
    renderPathLine(page('compare/k9s/index.html')),
    '<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="/">srelens</a></li><li><a href="/compare/">compare</a></li><li><span aria-current="page">k9s</span></li></ol></nav>',
  );
});

test('BreadcrumbList uses absolute URLs and keeps existing names', () => {
  assert.deepEqual(breadcrumbLd(page('faq/index.html')).itemListElement, [
    { '@type': 'ListItem', position: 1, name: 'srelens', item: 'https://srelens.com/' },
    { '@type': 'ListItem', position: 2, name: 'FAQ', item: 'https://srelens.com/faq/' },
  ]);
});

test('footer links every section and carries the version', () => {
  const html = renderFooter('0.15.0');
  for (const href of ['/features/', '/tui/', '/mcp/', '/download/', '/docs/', '/docs/tui/', '/guides/', '/faq/', '/compare/', '/security/', '/architecture/']) {
    assert.ok(html.includes(`href="${href}"`), href);
  }
  assert.match(html, /<span data-version>v0\.15\.0<\/span>/);
});

test('applyShell swaps head links and is idempotent', () => {
  const p = page('features/index.html');
  const once = applyShell(read(p.file), p, '0.15.0');
  assert.ok(once.includes(STYLES) && once.includes(FONTS) && once.includes(THEME_INIT));
  assert.doesNotMatch(once, /\/(styles|enterprise)\.css/);
  assert.equal(applyShell(once, p, '0.15.0'), once);
});

// Minimal page skeleton for applyShell unit tests (404.html has no crumbs and no OG card, so it needs neither a path line nor a canonical link).
const doc = (body) => `<head></head><body><header class="site-header"></header><main id="main">${body}</main><script src="/main.js" defer></script></body>`;

test('applyShell turns a short H1 gradient phrase into the accent and drops the rest', () => {
  const html = applyShell(doc('<h1 class="display">The terminal control room <br><span class="grad">for Kubernetes.</span></h1><h2>A <span class="grad">long gradient phrase here.</span></h2>'), page('404.html'), '0.15.0');
  assert.match(html, /<span class="accent">for Kubernetes\.<\/span>/);
  assert.match(html, /<h2>A long gradient phrase here\.<\/h2>/);
});

test('applyShell turns an eyebrow tick into a section permalink', () => {
  const html = applyShell(doc('<section class="section" id="workflow"><p class="eyebrow"><span class="tick">●</span> The reliability loop</p></section>'), page('404.html'), '0.15.0');
  assert.match(html, /<p class="eyebrow"><a class="section-label anchor-link" href="#workflow">#workflow<\/a> · The reliability loop<\/p>/);
});

// applyShell must produce the migrated-page contract on every real page, and be idempotent.
for (const p of PAGES.filter((entry) => !entry.mirrorOf)) {
  test(`applyShell on ${p.file}: theme script, main.js, no empty class, idempotent`, () => {
    const once = applyShell(read(p.file), p, '0.15.0');
    assert.ok(once.includes(THEME_INIT), 'theme init script swapped');
    assert.ok(once.includes('<script src="/main.js" defer></script>'), 'main.js normalised');
    assert.doesNotMatch(once, /\sclass=""/, 'no empty class attribute');
    assert.equal(applyShell(once, p, '0.15.0'), once, 'idempotent');
  });
}

// Pages moved to the new design. Each page task adds its pages here first.
const MIGRATED = new Set([
  'index.html', 'tui/index.html', 'features/index.html', 'mcp/index.html', 'download/index.html',
  'compare/index.html', 'compare/lens/index.html', 'compare/headlamp/index.html', 'compare/k9s/index.html',
  'compare/freelens/index.html', 'compare/aptakube/index.html', 'compare/kubernetes-dashboard/index.html',
  'docs/index.html', 'docs/tui/index.html', 'docs/tui.html', 'guides/index.html', 'guides/crashloopbackoff/index.html',
  'guides/oomkilled/index.html', 'guides/failed-deployment/index.html', 'security/index.html', 'architecture/index.html',
  'faq/index.html', '404.html',
]);

const withoutCaptures = (html) => html.replace(/<pre class="tui"[\s\S]*?<\/pre>/g, '');

for (const p of PAGES.filter((entry) => MIGRATED.has(entry.file))) {
  test(`${p.file}: uses the new shell`, () => {
    const html = read(p.file);
    const src = p.mirrorOf ? page(p.mirrorOf) : p;
    assert.ok(html.includes(STYLES), 'links /site.css');
    assert.doesNotMatch(html, /\/(styles|enterprise)\.css/, 'no old stylesheets');
    assert.ok(html.includes(FONTS), 'new font link');
    assert.ok(html.includes(THEME_INIT), 'theme init script');
    assert.ok(html.includes('<script src="/main.js" defer></script>'), 'main.js');
    assert.match(html, /<a class="skip-link" href="#main">/);
    assert.match(html, /<main id="main"/);
    assert.ok(html.includes(renderHeader(src)), 'canonical header');
    assert.ok(html.includes(renderFooter(siteVersion())), 'canonical footer');
    if (src.crumbs) {
      assert.ok(html.includes(renderPathLine(src)), 'path line');
      const crumbs = ldNodes(html).find((n) => n['@type'] === 'BreadcrumbList');
      assert.ok(crumbs, 'BreadcrumbList');
      assert.deepEqual(
        crumbs.itemListElement.map((i) => [i.name.toLowerCase(), i.item]),
        src.crumbs.map(([label, href]) => [label.toLowerCase(), `https://srelens.com${href}`]),
      );
    }
    assert.doesNotMatch(withoutCaptures(html), /\sstyle="/, 'no inline style attributes');
    assert.doesNotMatch(html, /class="[^"]*\b(bg-aurora|bg-grid|band-glow|reveal|grad)\b/, 'no old decorative classes');
  });
}

test('every page is migrated', { todo: MIGRATED.size < PAGES.length }, () => {
  assert.equal(MIGRATED.size, PAGES.length);
});

// The pages as they were before Task 22: no OG/Twitter tags, robots "index, follow".
const preOg = (html) => html
  .replace(/\n\s*<meta (?:property="og:|name="twitter:)[^>]*>/g, '')
  .replace(/(<meta name="robots" content=")[^"]*/, '$1index, follow');

test('applyShell rebuilds the OG set and robots on pages that had none', () => {
  for (const p of PAGES.filter((e) => e.ogCard && !baselineFor(e.file).meta['og:image'])) {
    const now = read(p.file);
    assert.notEqual(preOg(now), now, p.file);
    assert.equal(applyShell(preOg(now), p, '0.15.0'), now, p.file);
  }
});

test('applyShell leaves the 404 noindex', () => {
  const nf = page('404.html');
  assert.match(applyShell(read(nf.file), nf, '0.15.0'), /<meta name="robots" content="noindex">/);
});

test('applyShell swaps tui/ from its old screenshot tags to the card', () => {
  const p = page('tui/index.html');
  const now = read(p.file);
  // Only the meta tags go back: the JSON-LD image is not applyShell's to rewrite.
  const old = now.replace(/(<meta [^>]*content=")https:\/\/srelens\.com\/assets\/og\/og-tui\.png/g, '$1https://srelens.com/assets/shots/tui-overview.webp')
    .replace('content="1200"', 'content="2400"').replace('content="630"', 'content="1461"')
    .replace(/(og:image:alt" content=")[^"]*/, '$1old alt');
  assert.notEqual(old, now);
  assert.equal(applyShell(old, p, '0.15.0'), now);
});

// The compare pages shipped an og:image with no width, height or alt, and the six sub-pages no twitter:image: the card swap
// must add what is missing, once each, in the page's own spacing.
test('applyShell adds the missing dimension, alt and twitter:image tags next to their neighbours, and only once', () => {
  for (const file of ['compare/index.html', 'compare/k9s/index.html']) {
    const p = page(file);
    const bare = read(p.file)
      .replace(/\s*<meta property="og:image:(?:width|height|alt)" content="[^"]*">/g, '')
      .replace(/\s*<meta name="twitter:image" content="[^"]*">/, '');
    assert.equal(meta(bare, 'og:image:width'), null, `${file}: the fixture still has the tags`);
    assert.equal(meta(bare, 'twitter:image'), null, `${file}: the fixture still has twitter:image`);
    const out = applyShell(bare, p, '0.15.0');
    assert.equal(meta(out, 'twitter:image'), `https://srelens.com/assets/og/${p.ogCard}`, file);
    assert.equal(out.match(/name="twitter:image"/g).length, 1, file);
    assert.match(out, /<meta name="twitter:card" content="summary_large_image">(\s*)<meta name="twitter:image" content="[^"]*">/, file);
    assert.equal(meta(out, 'og:image:width'), '1200', file);
    assert.equal(meta(out, 'og:image:height'), '630', file);
    assert.equal(meta(out, 'og:image:alt'), `srelens.com${new URL(canonical(bare)).pathname}: ${h1s(bare)[0]}`, file);
    assert.equal(out.match(/og:image:(?:width|height|alt)"/g).length, 3, file);
    assert.match(out, /<meta property="og:image" content="[^"]*">(\s*)<meta property="og:image:width" content="1200">\1<meta property="og:image:height" content="630">\1<meta property="og:image:alt" content="[^"]*">\1<meta name="twitter:card"/, file);
    assert.equal(applyShell(out, p, '0.15.0'), out, `${file}: not idempotent`);
  }
});

test('applyShell names the missing canonical link instead of failing on an invalid URL', () => {
  const p = page('security/index.html');
  const html = preOg(read(p.file)).replace(/<link rel="canonical" href="[^"]*">/, '');
  assert.throws(() => applyShell(html, p, '0.15.0'), /no canonical link/);
});

// ---- $-patterns in page text must stay literal ($&, $1, $', $` are special in a replacement string) ----

const HOSTILE = "A $& B $1 C $' D $` E";
const asHtml = (s) => s.replace(/&/g, '&amp;');
const swapIn = (html, pattern, inner) => html.replace(pattern, (m, open, close) => open + inner + close);

test('applyShell keeps $-patterns in an H1 literal when it swaps the card on a page that has an OG set', () => {
  const p = page('tui/index.html');
  const html = swapIn(read(p.file), /(<h1[^>]*>)[\s\S]*?(<\/h1>)/, asHtml(HOSTILE));
  const out = applyShell(html, p, '0.15.0');
  assert.equal(meta(out, 'og:image:alt'), `srelens.com/tui/: ${HOSTILE}`);
  assert.equal(out.match(/og:image:alt/g).length, 1);
  assert.equal(h1s(out)[0], HOSTILE);
});

test('applyShell keeps $-patterns in the title, description and H1 literal when it adds the OG set', () => {
  const p = PAGES.find((e) => e.ogCard && !baselineFor(e.file).meta['og:image']);
  let html = preOg(read(p.file));
  html = swapIn(html, /(<title>)[\s\S]*?(<\/title>)/, asHtml(HOSTILE));
  html = swapIn(html, /(<meta name="description" content=")[^"]*(">)/, asHtml(HOSTILE));
  html = swapIn(html, /(<h1[^>]*>)[\s\S]*?(<\/h1>)/, asHtml(HOSTILE));
  const out = applyShell(html, p, '0.15.0');
  for (const key of ['og:title', 'og:description', 'twitter:title', 'twitter:description']) assert.equal(meta(out, key), HOSTILE, key);
  assert.equal(meta(out, 'og:image:alt'), `${new URL(canonical(out)).host}${new URL(canonical(out)).pathname}: ${HOSTILE}`);
  assert.equal(out.match(/<meta property="og:image"/g).length, 1);
});

test('applyShell keeps $-patterns in a crumb literal in the path line and the BreadcrumbList', () => {
  const p = { ...page('security/index.html'), crumbs: [['srelens', '/'], [HOSTILE, '/security/']] };
  const html = read(p.file).replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, (m) => (m.includes('"BreadcrumbList"') ? '' : m));
  assert.ok(!ldNodes(html).some((n) => n['@type'] === 'BreadcrumbList'), 'the page starts with no BreadcrumbList');
  const out = applyShell(html, p, '0.15.0');
  assert.ok(out.includes(renderPathLine(p)), 'path line');
  assert.equal(ldNodes(out).find((n) => n['@type'] === 'BreadcrumbList').itemListElement[1].name, HOSTILE);
});

test('applyShell keeps a $-pattern in the version literal in the footer, inserted or replaced', () => {
  const p = page('404.html');
  const inserted = applyShell(doc(''), p, '1.$&');
  assert.ok(inserted.includes('<span data-version>v1.$&</span>'));
  assert.equal(applyShell(inserted, p, '1.$&'), inserted);
});

// ---- the footer lists every indexable page (spec section 4) ----

test('footer links every indexable page: all published pages except the 404 and mirrors', () => {
  const hrefs = new Set(refs(renderFooter('0.15.0')));
  for (const p of PAGES.filter((e) => e.file !== '404.html' && !e.mirrorOf)) {
    const path = new URL(canonical(read(p.file))).pathname;
    assert.ok(hrefs.has(path), `the footer does not link ${path}`);
  }
});

// Devesh 2026-10-09: the brand line is "the Kubernetes kernel"; no page footer says "control room" any more.
test('every page footer carries the kernel brand line and none says "control room"', () => {
  assert.match(renderFooter('0.15.0'), /<p class="footer-tag">The Kubernetes kernel · built with Rust &amp; Tauri<\/p>/);
  for (const p of PAGES) {
    const footer = read(p.file).match(/<footer class="site-footer">[\s\S]*?<\/footer>/);
    assert.ok(footer, `${p.file} has no footer`);
    assert.doesNotMatch(footer[0], /control room/i, p.file);
    assert.ok(footer[0].includes('<p class="footer-tag">The Kubernetes kernel · built with Rust &amp; Tauri</p>'), p.file);
  }
});

test('footer lists each guide in the learn column under its crumb label', () => {
  const learn = renderFooter('0.15.0').match(/<p class="footer-h">learn<\/p><ul>(.*?)<\/ul>/)[1];
  const guides = PAGES.filter((e) => e.file.startsWith('guides/') && e.file !== 'guides/index.html');
  assert.equal(guides.length, 3);
  for (const p of guides) {
    const [label, href] = p.crumbs.at(-1);
    assert.ok(learn.includes(`<li><a href="${href}">${label}</a></li>`), href);
  }
});
