// Zero-dependency helpers for reading the static site from tests and scripts.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const ORIGIN = 'https://srelens.com';

// Meta tags whose values are tracked against the baseline.
export const SEO_META = [
  'description', 'robots',
  'og:type', 'og:url', 'og:site_name', 'og:title', 'og:description',
  'og:image', 'og:image:width', 'og:image:height', 'og:image:alt', 'og:locale',
  'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image',
];

// Paths that are never part of the published site (see _config.yml).
const UNPUBLISHED = new Set(['tests', 'scripts', 'assets', 'node_modules', 'docs/superpowers']);

export function listPages() {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(join(ROOT, dir))) {
      const rel = dir ? `${dir}/${name}` : name;
      if (name.startsWith('.') || UNPUBLISHED.has(rel)) continue;
      if (statSync(join(ROOT, rel)).isDirectory()) walk(rel);
      else if (name.endsWith('.html')) out.push(rel);
    }
  };
  walk('');
  return out.sort();
}

// Git may check files out with CRLF (core.autocrlf=true); the repo stores LF.
export const read = (rel) => readFileSync(join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

export function fileForPath(urlPath) {
  const path = urlPath.split('#')[0].split('?')[0];
  return path.endsWith('/') ? `${path.slice(1)}index.html` : path.slice(1);
}

export function urlForFile(rel) {
  if (rel === 'index.html') return `${ORIGIN}/`;
  if (rel.endsWith('/index.html')) return `${ORIGIN}/${rel.slice(0, -'index.html'.length)}`;
  return `${ORIGIN}/${rel}`;
}

export const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

export const text = (html) => decode(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ''))
  .replace(/\s+/g, ' ').trim();

export function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)')`));
  return m ? decode(m[1] ?? m[2]) : null;
}

export function title(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/);
  return m ? text(m[1]) : null;
}

export function meta(html, key) {
  for (const [tag] of html.matchAll(/<meta\s[^>]*>/g)) {
    if (attr(tag, 'name') === key || attr(tag, 'property') === key) return attr(tag, 'content');
  }
  return null;
}

export function canonical(html) {
  for (const [tag] of html.matchAll(/<link\s[^>]*>/g)) {
    if (attr(tag, 'rel') === 'canonical') return attr(tag, 'href');
  }
  return null;
}

export const h1s = (html) => [...html.matchAll(/<h1[\s>][\s\S]*?<\/h1>/g)].map((m) => text(m[0]));
export const headings = (html) => [...html.matchAll(/<h([23])[\s>][\s\S]*?<\/h\1>/g)].map((m) => text(m[0]));

export const jsonLd = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map((m) => JSON.parse(m[1]));
export const ldNodes = (html) => jsonLd(html).flatMap((j) => j['@graph'] ?? [j]);

export const ids = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
export const refs = (html) => [...html.matchAll(/\s(?:href|src|poster)="([^"]+)"/g)].map((m) => decode(m[1]));
export const isInternal = (ref) => ref.startsWith('/') && !ref.startsWith('//');

// Internal links to pages (not assets), without fragments or queries.
export const pageLinks = (html) => [...new Set(refs(html)
  .filter(isInternal)
  .map((r) => r.split('#')[0].split('?')[0])
  .filter((p) => p === '/' || p.endsWith('/') || p.endsWith('.html')))].sort();

export const sitemapUrls = () => [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

// The current release, as declared by the homepage SoftwareApplication JSON-LD.
export function siteVersion() {
  const app = ldNodes(read('index.html')).find((n) => n['@type'] === 'SoftwareApplication');
  return app.softwareVersion;
}
