// The shared page shell: head links, header, path line, footer and BreadcrumbList.
// Pure functions; scripts/apply-shell.mjs writes the results into the pages.
import { ORIGIN, ldNodes, text } from '../tests/lib/site.mjs';

export const NAV = ['/features/', '/tui/', '/mcp/', '/compare/', '/docs/', '/download/', '/faq/'];

export const FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap">';
export const STYLES = '<link rel="stylesheet" href="/site.css?v=1">';
export const THEME_COLOR = '<meta name="theme-color" content="#0f0d14">';
export const THEME_INIT = `<script>
    (function () {
      var t = null;
      try { var m = location.search.match(/[?&]theme=(light|dark)/); if (m) t = m[1]; } catch (e) {}
      try { if (!t) t = localStorage.getItem("theme"); } catch (e) {}
      if (t !== "light" && t !== "dark") {
        t = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      }
      document.documentElement.setAttribute("data-theme", t);
    })();
  </script>`;

const MOON = '<svg class="moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
const SUN = '<svg class="sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
const BRAND = '<a class="brand" href="/"><img src="/assets/logo-mark.svg" alt="" width="24" height="24"><span>srelens</span></a>';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function navList(current, cls) {
  const items = NAV.map((href) => {
    const cur = href === current ? ' aria-current="page"' : '';
    return `<li><a href="${href}"${cur}><span class="slash" aria-hidden="true">/</span>${href.slice(1, -1)}</a></li>`;
  });
  return `<ul class="${cls}">${items.join('')}</ul>`;
}

export function renderHeader(page) {
  return [
    '<header class="site-header">',
    '<div class="wrap nav">',
    BRAND,
    '<nav class="nav-main" aria-label="Main">',
    navList(page.nav, 'nav-links'),
    `<details class="nav-menu"><summary>menu</summary>${navList(page.nav, 'nav-menu-list')}</details>`,
    '</nav>',
    `<button class="theme-toggle" type="button" aria-label="Toggle light/dark theme">${MOON}${SUN}</button>`,
    '<a class="nav-cta" href="https://github.com/srelens/srelens" rel="noopener">github <span aria-hidden="true">↗</span></a>',
    '</div>',
    '</header>',
  ].join('\n');
}

export function renderPathLine(page) {
  if (!page.crumbs) return '';
  const last = page.crumbs.length - 1;
  const items = page.crumbs.map(([label, href], i) => (i === last
    ? `<li><span aria-current="page">${esc(label)}</span></li>`
    : `<li><a href="${href}">${esc(label)}</a></li>`));
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items.join('')}</ol></nav>`;
}

export function breadcrumbLd(page) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: page.crumbs.map(([label, href, ldName], i) => ({
      '@type': 'ListItem', position: i + 1, name: ldName ?? label, item: `${ORIGIN}${href}`,
    })),
  };
}

const FOOTER_GROUPS = [
  ['product', [['/features/', 'features'], ['/tui/', 'tui'], ['/mcp/', 'mcp'], ['/download/', 'download']]],
  ['learn', [['/docs/', 'docs'], ['/docs/tui/', 'tui docs'], ['/guides/', 'sre guides'], ['/faq/', 'faq']]],
  ['compare', [['/compare/', 'all comparisons'], ['/compare/lens/', 'lens'], ['/compare/k9s/', 'k9s'], ['/compare/headlamp/', 'headlamp'], ['/compare/freelens/', 'freelens'], ['/compare/aptakube/', 'aptakube'], ['/compare/kubernetes-dashboard/', 'kubernetes dashboard']]],
  ['project', [['/security/', 'security'], ['/architecture/', 'architecture'], ['https://github.com/srelens/srelens', 'github'], ['https://github.com/srelens/srelens/releases', 'releases']]],
];

export function renderFooter(version) {
  const cols = FOOTER_GROUPS.map(([name, links]) => {
    const items = links.map(([href, label]) => `<li><a href="${href}"${href.startsWith('http') ? ' rel="noopener"' : ''}>${esc(label)}</a></li>`);
    return `<div class="footer-col"><p class="footer-h">${name}</p><ul>${items.join('')}</ul></div>`;
  });
  return [
    '<footer class="site-footer">',
    '<div class="wrap footer-grid">',
    '<div class="footer-brand">',
    BRAND,
    '<p class="footer-tag">The Kubernetes control room · built with Rust &amp; Tauri</p>',
    `<p class="footer-version">latest <span data-version>v${version}</span> · MIT</p>`,
    '</div>',
    `<nav class="footer-cols" aria-label="Footer">${cols.join('')}</nav>`,
    '</div>',
    '<div class="wrap footer-meta">',
    '<span>© <span id="year">2026</span> srelens. All rights reserved.</span>',
    '<span>Independently developed · not affiliated with Mirantis (Lens) or the Freelens project</span>',
    '</div>',
    '</footer>',
  ].join('\n');
}

function replaceOne(html, pattern, replacement, what) {
  if (!pattern.test(html)) throw new Error(`applyShell: no ${what} found`);
  return html.replace(pattern, replacement);
}

export function applyShell(html, page, version) {
  let out = html;

  // head
  out = out.replace(/<link\b[^>]*fonts\.googleapis\.com\/css2[^>]*>/, FONTS);
  out = out.replace(/<link\b[^>]*href="\/(?:styles|enterprise|site)\.css[^"]*"[^>]*>(?:\s*<link\b[^>]*href="\/(?:styles|enterprise|site)\.css[^"]*"[^>]*>)*/, STYLES);
  out = out.replace(/<script>\s*\(function\s*\(\)\s*\{\s*var t\s*=\s*null;[\s\S]*?<\/script>/, THEME_INIT);
  out = out.replace(/<meta name="theme-color" content="[^"]*">/, THEME_COLOR);
  out = out.replace(/<script src="\/main\.js\?[^"]*" defer><\/script>/, '<script src="/main.js" defer></script>');

  // old decorative layers and classes; an attribute left with no classes is removed entirely
  out = out.replace(/\s*<div class="(?:bg-aurora|bg-grid|band-glow)" aria-hidden="true"><\/div>/g, '');
  out = out.replace(/(\s)class="([^"]*)"/g, (m, ws, cls) => {
    const all = cls.split(/\s+/).filter(Boolean);
    const kept = all.filter((c) => c !== 'reveal');
    if (!kept.length) return '';
    return kept.length === all.length ? m : `${ws}class="${kept.join(' ')}"`;
  });

  // gradient spans: a short H1 phrase becomes the accent, everything else is plain text
  out = out.replace(/(<h1[\s>][\s\S]*?<\/h1>)|<span class="grad">([\s\S]*?)<\/span>/g, (m, h1, inner) => {
    if (h1) {
      return h1.replace(/<span class="grad">([\s\S]*?)<\/span>/, (s, t) => (text(t).split(/\s+/).length <= 4 ? `<span class="accent">${t}</span>` : t));
    }
    return inner;
  });

  // eyebrow tick inside an id'd section becomes that section's permalink: at most one per section, ever
  out = out.replace(/(<section\b[^>]*\sid="([^"]+)"[^>]*>)([\s\S]*?)(?=<section\b|<\/main>)/g, (m, open, id, body) => (
    body.includes('class="section-label')
      ? m
      : open + body.replace('<span class="tick">●</span>', `<a class="section-label anchor-link" href="#${id}">#${id}</a> ·`)
  ));

  // skip link and its target
  if (!out.includes('class="skip-link"')) out = out.replace(/<body([^>]*)>/, '<body$1>\n  <a class="skip-link" href="#main">Skip to content</a>');
  out = out.replace(/<main(?![^>]*\sid=)([^>]*)>/, '<main id="main"$1>');

  // header, path line, footer
  out = replaceOne(out, /<header class="site-header">[\s\S]*?<\/header>/, renderHeader(page), 'site header');
  if (page.crumbs) out = replaceOne(out, /<(nav|div) class="crumbs"[^>]*>[\s\S]*?<\/\1>/, renderPathLine(page), 'crumbs');
  if (/<footer class="site-footer">/.test(out)) {
    out = out.replace(/<footer class="site-footer">[\s\S]*?<\/footer>/, renderFooter(version));
  } else {
    out = replaceOne(out, /(\s*)<script src="\/main\.js" defer><\/script>/, `\n  ${renderFooter(version)}$1<script src="/main.js" defer></script>`, 'main.js script');
  }

  // breadcrumb structured data for pages that have none
  if (page.crumbs && !ldNodes(out).some((n) => n['@type'] === 'BreadcrumbList')) {
    out = out.replace('</head>', `  <script type="application/ld+json">\n${JSON.stringify(breadcrumbLd(page), null, 2)}\n  </script>\n</head>`);
  }
  return out;
}
