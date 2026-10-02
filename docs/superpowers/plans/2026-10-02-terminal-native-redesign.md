# srelens.com terminal-native redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle all 23 pages of srelens.com in the terminal-native "Command line" system (direction A) without changing a single URL, while fixing the site's known SEO/AEO gaps.

**Architecture:** The site stays static HTML with one stylesheet (`site.css`, new) and one script (`main.js`). A small set of zero-dependency Node authoring tools under `scripts/` rewrites the shared shell (header, path line, footer, head links, BreadcrumbList) from one page manifest, converts a real `srelens-tui` terminal capture to HTML, and renders Open Graph cards. A zero-dependency `node --test` suite compares every page with a pre-redesign SEO baseline, so lost titles, canonicals, structured data, links, ids or headings fail a test. Pages migrate one group at a time; unmigrated pages keep the old CSS until their task.

**Tech Stack:** HTML, CSS (custom properties, grid), vanilla JS (ES5 style, matching `main.js`), Node 24 (`node:test`, `node:assert`, no npm packages), headless Chrome for screenshots and OG cards, kind + Docker + tmux for the terminal capture.

**Spec:** `docs/superpowers/specs/2026-10-02-terminal-native-redesign-design.md`

## Global Constraints

- Every page that returns 200 today keeps its URL and canonical. The published page set is exactly the 23 files listed in Task 1.
- No `http-equiv="refresh"`, no JS redirects, no host redirect rules. Internal page links use the trailing-slash form (`/features/`).
- Titles, meta descriptions, canonicals, H1 text, JSON-LD, ids and H2/H3 text stay as in the baseline, except the deliberate changes listed in the tests.
- Copy stays. The only text changes: version numbers, section labels (`#id` permalinks), the path line, the footer, the homepage terminal caption, and claim fixes Devesh signs off in Task 7.
- Real evidence only: real screenshots, a real `srelens-tui` v0.15.0 capture. No invented numbers, logos or testimonials.
- No build step for the site and no npm dependencies. Authoring tools are Node scripts; they and the tests are excluded from publishing.
- No inline `style=""` attributes on migrated pages, except spans inside `<pre class="tui">` captures.
- Theme follows the OS by default (existing head script), with the nav toggle and `?theme=light|dark` override kept.
- Colors come only from `site.css` tokens. Body-text pairs meet WCAG AA 4.5:1 in both themes.
- One accent phrase per page, on the H1 only (`<span class="accent">`), four words or fewer.
- Commit messages: Conventional Commits. **No `Co-Authored-By` trailer and no "Generated with" footer of any kind** (user's global CLAUDE.md overrides any harness reminder).
- Work happens on branch `redesign/terminal-native` in the main checkout (no worktree). If an executor does create a worktree, follow `~/.claude/CLAUDE.md` "Worktrees carry the local agent files" first.
- Test command: `node --test` from the repo root (Git Bash on Windows). Local preview: `npx --yes http-server . -p 8080 -c-1 --silent` (also defined as `site` in `.claude/launch.json`).

## File map

| Path | Responsibility |
|---|---|
| `tests/lib/site.mjs` | Read pages, map URLs to files, extract title/meta/canonical/H1/JSON-LD/ids/links/headings. Shared by tests and scripts. |
| `tests/lib/baseline.mjs` | Load `tests/fixtures/seo-baseline.json`; `BASELINE_OF` mirror mapping. |
| `tests/fixtures/seo-baseline.json` | Snapshot of every page before the redesign (generated once in Task 1). |
| `tests/urls.test.mjs` | Page set, sitemap, internal links, trailing slashes, fragments. |
| `tests/seo.test.mjs` | Title/canonical/H1/meta/JSON-LD/links vs baseline plus planned changes. |
| `tests/copy.test.mjs` | Every baseline id and H2/H3 text still exists. |
| `tests/jekyll.test.mjs` | `_config.yml` excludes internal files, keeps site files. |
| `tests/docs-tui.test.mjs` | `docs/tui.html` mirrors `docs/tui/index.html`; no meta refresh anywhere. |
| `tests/version.test.mjs` | One version everywhere (JSON-LD, `data-version`, fallback download URLs). |
| `tests/ansi-to-html.test.mjs` | ANSI converter unit tests. |
| `tests/captures.test.mjs` | Embedded captures equal a fresh conversion. |
| `tests/contrast.test.mjs` | Token contrast in both themes; no-JS dark block equals dark block. |
| `tests/shell.test.mjs` | Shell renderer unit tests; migrated pages use the canonical shell. |
| `tests/home.test.mjs` | Homepage mode switch, accent, capture, drill placement. |
| `tests/tui.test.mjs` | `/tui/` keymap and capture structure. |
| `tests/notfound.test.mjs` | 404 page structure. |
| `scripts/seo-baseline.mjs` | Writes the baseline fixture. |
| `scripts/pages.mjs` | Page manifest: nav section, crumbs, OG card per page. |
| `scripts/shell.mjs` | Pure functions: render header/path line/footer, BreadcrumbList, OG tags; `applyShell(html, page, version)`. |
| `scripts/apply-shell.mjs` | CLI that applies the shell to pages and refreshes the `docs/tui.html` mirror. |
| `scripts/strip-styles.mjs` | CLI that removes inline `style` attributes outside `<pre class="tui">`. |
| `scripts/ansi-to-html.mjs` | ANSI SGR → HTML spans (module + CLI). |
| `scripts/embed-captures.mjs` | Fills `<!-- capture:NAME:start/end -->` markers from `assets/captures/NAME.ansi`. |
| `scripts/demo/kind.yaml`, `scripts/demo/workloads.yaml`, `scripts/demo/capture.sh` | Reproducible `srelens-demo` cluster and capture run. |
| `scripts/og-card.html`, `scripts/og-cards.mjs` | OG card template and renderer. |
| `scripts/screens.mjs` | Review screenshots of every page × 3 widths × 2 themes. |
| `scripts/demo/extras.sh`, `scripts/demo/extras/*` | Helm release, Argo CD app, MetalLB + FRR BGP, kwok GPU node for feature evidence. |
| `scripts/demo/tui-captures.tsv`, `scripts/demo/capture-all.sh` | Every TUI feature capture, run in a container with the published v0.15.0 binary. |
| `scripts/shots/cdp.mjs`, `scripts/shots/views.mjs`, `scripts/shots/desktop-shots.mjs` | Desktop screenshots in web mode over the DevTools Protocol. |
| `tests/shots.test.mjs` | Every desktop view has a 2400×1461 dark/light WebP pair. |
| `assets/captures/pods.ansi` | Raw terminal capture (unpublished source of truth). |
| `site.css` | The whole design system. |
| `main.js` | Progressive enhancement (existing behavior + mode switch + 404 path). |
| `_config.yml` | Jekyll exclude list. |

---

## Phase A — Guards and fixes (no visual change)

### Task 1: Test harness, SEO baseline and URL guards

**Files:**
- Create: `tests/lib/site.mjs`, `tests/lib/baseline.mjs`, `scripts/seo-baseline.mjs`, `tests/fixtures/seo-baseline.json` (generated), `tests/urls.test.mjs`, `tests/seo.test.mjs`, `tests/copy.test.mjs`

**Interfaces:**
- Produces (`tests/lib/site.mjs`): `ROOT: string`, `ORIGIN = 'https://srelens.com'`, `SEO_META: string[]`, `listPages(): string[]`, `read(rel): string` (CRLF normalised to LF), `fileForPath(urlPath): string`, `urlForFile(rel): string`, `decode(s)`, `text(html)`, `attr(tag, name)`, `title(html)`, `meta(html, key)`, `canonical(html)`, `h1s(html): string[]`, `headings(html): string[]`, `jsonLd(html): object[]`, `ldNodes(html): object[]`, `ids(html): Set<string>`, `refs(html): string[]`, `isInternal(ref): boolean`, `pageLinks(html): string[]`, `sitemapUrls(): string[]`, `siteVersion(): string`.
- Produces (`tests/lib/baseline.mjs`): `BASELINE_OF: Record<string,string>`, `baselineFor(file): BaselinePage`, where `BaselinePage = { title, canonical, h1: string[], meta: Record<string,string|null>, jsonLd: object[], pageLinks: string[], ids: string[], headings: string[] }`.

This task only adds guards that pass on today's site. Later tasks add their failing tests first.

- [ ] **Step 1: Write `tests/lib/site.mjs`**

```js
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
  .replace(/&nbsp;/g, '\u00a0').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
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
```

- [ ] **Step 2: Write `scripts/seo-baseline.mjs` and generate the fixture**

```js
// Snapshot the SEO-relevant parts of every page. Run once on the pre-redesign tree:
//   node scripts/seo-baseline.mjs <git-sha>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, SEO_META, listPages, read, title, meta, canonical, h1s, headings, jsonLd, ids, pageLinks,
} from '../tests/lib/site.mjs';

const pages = {};
for (const file of listPages()) {
  const html = read(file);
  pages[file] = {
    title: title(html),
    canonical: canonical(html),
    h1: h1s(html),
    meta: Object.fromEntries(SEO_META.map((key) => [key, meta(html, key)])),
    jsonLd: jsonLd(html),
    pageLinks: pageLinks(html),
    ids: [...ids(html)].sort(),
    headings: headings(html),
  };
}
mkdirSync(join(ROOT, 'tests', 'fixtures'), { recursive: true });
writeFileSync(
  join(ROOT, 'tests', 'fixtures', 'seo-baseline.json'),
  `${JSON.stringify({ source: process.argv[2] ?? 'working tree', pages }, null, 2)}\n`,
);
console.log(`seo baseline written for ${Object.keys(pages).length} pages`);
```

Run: `node scripts/seo-baseline.mjs 5d73669`
Expected: `seo baseline written for 23 pages`. The working tree pages must still equal `main` at `5d73669` (only the spec has been committed on this branch). Check with `git diff --stat 5d73669 -- '*.html' sitemap.xml` → no output.

- [ ] **Step 3: Write `tests/lib/baseline.mjs`**

```js
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './site.mjs';

const pages = JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'seo-baseline.json'), 'utf8')).pages;

// Pages whose expected state is another page's baseline (spec 8.3).
export const BASELINE_OF = {};

export const baselineFor = (file) => pages[BASELINE_OF[file] ?? file];
```

- [ ] **Step 4: Write `tests/urls.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, listPages, read, refs, isInternal, fileForPath, ids, canonical, urlForFile, sitemapUrls,
} from './lib/site.mjs';

const PAGES = listPages();
const EXPECTED_PAGES = [
  '404.html', 'architecture/index.html', 'compare/aptakube/index.html', 'compare/freelens/index.html',
  'compare/headlamp/index.html', 'compare/index.html', 'compare/k9s/index.html',
  'compare/kubernetes-dashboard/index.html', 'compare/lens/index.html', 'docs/index.html', 'docs/tui.html',
  'docs/tui/index.html', 'download/index.html', 'faq/index.html', 'features/index.html',
  'guides/crashloopbackoff/index.html', 'guides/failed-deployment/index.html', 'guides/index.html',
  'guides/oomkilled/index.html', 'index.html', 'mcp/index.html', 'security/index.html', 'tui/index.html',
];
// Published, but deliberately not in the sitemap.
const NOT_IN_SITEMAP = new Set(['404.html', 'docs/tui.html']);

test('the published page set is unchanged', () => {
  assert.deepEqual(PAGES, EXPECTED_PAGES);
});

test('every sitemap URL maps to a page whose canonical is that URL', () => {
  for (const loc of sitemapUrls()) {
    const file = fileForPath(new URL(loc).pathname);
    assert.ok(existsSync(join(ROOT, file)), `${loc} -> ${file} is missing`);
    assert.equal(canonical(read(file)), loc, `${file} canonical`);
  }
});

test('every indexable page is in the sitemap', () => {
  const locs = new Set(sitemapUrls());
  for (const file of PAGES.filter((f) => !NOT_IN_SITEMAP.has(f))) {
    assert.ok(locs.has(urlForFile(file)), `${file} is missing from sitemap.xml`);
  }
});

test('internal links and assets resolve to files', () => {
  for (const file of PAGES) {
    for (const ref of refs(read(file)).filter(isInternal)) {
      const target = fileForPath(ref);
      assert.ok(existsSync(join(ROOT, target)), `${file}: ${ref} -> ${target} is missing`);
    }
  }
});

test('internal page links use the trailing-slash form', () => {
  for (const file of PAGES) {
    for (const ref of refs(read(file)).filter(isInternal)) {
      const path = ref.split('#')[0].split('?')[0];
      const last = path.split('/').pop();
      assert.ok(path.endsWith('/') || last.includes('.'), `${file}: ${ref} should end with /`);
    }
  }
});

test('fragment links resolve to an id on the target page', () => {
  for (const file of PAGES) {
    const html = read(file);
    for (const ref of refs(html)) {
      const hash = ref.indexOf('#');
      if (hash === -1 || ref.length === hash + 1) continue;
      const fragment = decodeURIComponent(ref.slice(hash + 1));
      if (ref.startsWith('#')) {
        assert.ok(ids(html).has(fragment), `${file}: ${ref} has no target`);
      } else if (isInternal(ref)) {
        const target = fileForPath(ref);
        assert.ok(ids(read(target)).has(fragment), `${file}: ${ref} has no target in ${target}`);
      }
    }
  }
});
```

- [ ] **Step 5: Write `tests/seo.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEO_META, listPages, read, title, meta, canonical, h1s, ldNodes, pageLinks } from './lib/site.mjs';
import { baselineFor } from './lib/baseline.mjs';

// ---- Deliberate changes from the spec (section 8). Everything else must match the baseline. ----
// Expected meta values that replace the baseline: { file: { key: value } }.
const META_CHANGES = {};
// Applied to every baseline JSON-LD node before comparison.
const ldChange = (node) => node;

const withoutCrumbs = (nodes) => nodes.filter((n) => n['@type'] !== 'BreadcrumbList');

for (const file of listPages()) {
  const html = read(file);
  const base = baselineFor(file);

  test(`${file}: title, canonical and h1 are unchanged`, () => {
    assert.ok(base, 'page missing from the baseline');
    assert.equal(title(html), base.title);
    assert.equal(canonical(html), base.canonical);
    assert.deepEqual(h1s(html), base.h1);
  });

  test(`${file}: SEO meta tags match the baseline plus planned changes`, () => {
    for (const key of SEO_META) {
      const changes = META_CHANGES[file] ?? {};
      const expected = key in changes ? changes[key] : base.meta[key];
      assert.equal(meta(html, key), expected, key);
    }
  });

  test(`${file}: structured data matches the baseline plus planned changes`, () => {
    const expected = withoutCrumbs(base.jsonLd.flatMap((j) => j['@graph'] ?? [j])).map(ldChange);
    assert.deepEqual(withoutCrumbs(ldNodes(html)), expected);
  });

  test(`${file}: every page linked before is still linked`, () => {
    const now = new Set(pageLinks(html));
    for (const link of base.pageLinks) assert.ok(now.has(link), `lost link to ${link}`);
  });
}
```

- [ ] **Step 6: Write `tests/copy.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listPages, read, ids, headings } from './lib/site.mjs';
import { baselineFor } from './lib/baseline.mjs';

// Headings and ids removed on purpose. Only Task 7 decisions may add entries.
// Format: { 'tui/index.html': ['Heading text', ...] }
const REMOVED_HEADINGS = {};
const REMOVED_IDS = {};

for (const file of listPages()) {
  const html = read(file);
  const base = baselineFor(file);

  test(`${file}: every baseline id still exists`, () => {
    const now = ids(html);
    const removed = new Set(REMOVED_IDS[file] ?? []);
    for (const id of base.ids) if (!removed.has(id)) assert.ok(now.has(id), `lost id "${id}"`);
  });

  test(`${file}: every baseline h2/h3 still exists`, () => {
    const now = new Set(headings(html));
    const removed = new Set(REMOVED_HEADINGS[file] ?? []);
    for (const h of base.headings) if (!removed.has(h)) assert.ok(now.has(h), `lost heading "${h}"`);
  });
}
```

- [ ] **Step 7: Run the suite**

Run: `node --test`
Expected: all tests pass (these are guards on the unchanged site). If a URL test fails, stop and report it: it is a pre-existing broken link that needs its own decision.

- [ ] **Step 8: Commit**

```bash
git add tests scripts/seo-baseline.mjs
git commit -m "test: add SEO baseline and URL guards for the redesign"
```

---

### Task 2: Stop publishing internal files

**Files:**
- Create: `_config.yml`, `tests/jekyll.test.mjs`

- [ ] **Step 1: Write the failing test `tests/jekyll.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, read } from './lib/site.mjs';

const listed = (cfg, path) => new RegExp(`^\\s*-\\s*${path.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}\\s*$`, 'm').test(cfg);

test('_config.yml exists', () => {
  assert.ok(existsSync(join(ROOT, '_config.yml')));
});

test('_config.yml keeps repo-internal files off the site', () => {
  const cfg = read('_config.yml');
  for (const path of ['README.md', 'PRODUCT.md', 'DESIGN.md', 'docs/superpowers', 'tests', 'scripts', 'assets/captures', 'vercel.json']) {
    assert.ok(listed(cfg, path), `${path} should be excluded`);
  }
});

test('_config.yml does not exclude anything the site serves', () => {
  const cfg = read('_config.yml');
  for (const path of ['install.sh', 'llms.txt', 'llms-full.txt', 'robots.txt', 'sitemap.xml', 'CNAME', 'assets', 'site.css', 'main.js', 'docs']) {
    assert.ok(!listed(cfg, path), `${path} must stay published`);
  }
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tests/jekyll.test.mjs`
Expected: FAIL, `_config.yml exists` (ENOENT on read for the others).

- [ ] **Step 3: Write `_config.yml`**

```yaml
# GitHub Pages builds this repo with Jekyll. The pages are plain HTML without
# front matter, so Jekyll copies them unchanged. This list only keeps
# repo-internal files off srelens.com.
exclude:
  - README.md
  - PRODUCT.md
  - DESIGN.md
  - docs/superpowers
  - tests
  - scripts
  - assets/captures
  - vercel.json
```

- [ ] **Step 4: Run the full suite**

Run: `node --test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add _config.yml tests/jekyll.test.mjs
git commit -m "chore: exclude internal docs, tests and scripts from GitHub Pages"
```

Post-merge check (done in Task 25): `/README.md`, `/PRODUCT.md`, `/DESIGN.html`, `/vercel.json` and the July spec URLs return 404; every sitemap URL returns 200.

---

### Task 3: Replace the `/docs/tui.html` redirect with a mirror

**Files:**
- Create: `tests/docs-tui.test.mjs`
- Modify: `tests/lib/baseline.mjs`, `docs/tui.html`

- [ ] **Step 1: Write the failing test `tests/docs-tui.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listPages, read } from './lib/site.mjs';

test('docs/tui.html is an exact copy of docs/tui/index.html', () => {
  assert.equal(read('docs/tui.html'), read('docs/tui/index.html'));
});

test('no page redirects with a meta refresh', () => {
  for (const file of listPages()) {
    assert.doesNotMatch(read(file), /http-equiv=["']?refresh/i, file);
  }
});
```

- [ ] **Step 2: Point the mirror's baseline at its source**

In `tests/lib/baseline.mjs` replace `export const BASELINE_OF = {};` with:

```js
export const BASELINE_OF = { 'docs/tui.html': 'docs/tui/index.html' };
```

- [ ] **Step 3: Run and watch it fail**

Run: `node --test`
Expected: FAIL in `docs-tui.test.mjs` (both tests) and in `seo.test.mjs` / `copy.test.mjs` for `docs/tui.html` (title "Redirecting to…" ≠ docs title).

- [ ] **Step 4: Make the mirror**

Run: `cp docs/tui/index.html docs/tui.html`

- [ ] **Step 5: Run the full suite**

Run: `node --test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/tui.html tests/docs-tui.test.mjs tests/lib/baseline.mjs
git commit -m "fix(seo): serve /docs/tui.html as a canonical mirror instead of a meta refresh"
```

---

### Task 4: One version everywhere (0.3.0 → 0.15.0)

**Files:**
- Create: `tests/version.test.mjs`
- Modify: `tests/seo.test.mjs` (`ldChange`), `index.html`, `tui/index.html`, `compare/index.html`, `download/index.html`, `faq/index.html`, `features/index.html`, `mcp/index.html`, `docs/tui.html` if it contains any (mirror)

- [ ] **Step 1: Write the failing test `tests/version.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listPages, read, ldNodes, siteVersion } from './lib/site.mjs';

// Bump with each stable release (tag srelens-vX.Y.Z), together with the pages.
const RELEASE = '0.15.0';

test('the homepage declares the current release', () => {
  assert.equal(siteVersion(), RELEASE);
});

test('every softwareVersion and data-version fallback agrees', () => {
  for (const file of listPages()) {
    const html = read(file);
    for (const node of ldNodes(html)) {
      if ('softwareVersion' in node) assert.equal(node.softwareVersion, RELEASE, `${file} JSON-LD`);
    }
    for (const m of html.matchAll(/<span data-version>([^<]*)<\/span>/g)) {
      assert.equal(m[1], `v${RELEASE}`, `${file} data-version`);
    }
  }
});

test('fallback download links point at the same release', () => {
  for (const file of listPages()) {
    for (const m of read(file).matchAll(/releases\/download\/srelens-v(\d+\.\d+\.\d+)\/([^"]+)"/g)) {
      assert.equal(m[1], RELEASE, `${file}: ${m[2]}`);
      assert.ok(!m[2].includes('0.3.0'), `${file}: asset name ${m[2]} still says 0.3.0`);
    }
  }
});
```

- [ ] **Step 2: Expect the JSON-LD change in `tests/seo.test.mjs`**

Replace `const ldChange = (node) => node;` with:

```js
const ldChange = (node) => ('softwareVersion' in node ? { ...node, softwareVersion: '0.15.0' } : node);
```

- [ ] **Step 3: Run and watch it fail**

Run: `node --test`
Expected: FAIL in `version.test.mjs` (all three) and `seo.test.mjs` structured data for `index.html` and `tui/index.html`.

- [ ] **Step 4: Confirm the v0.15.0 asset names**

Run: `gh release view srelens-v0.15.0 -R srelens/srelens --json assets -q '.assets[].name'`
Expected: a list including names like `srelens_0.15.0_aarch64.dmg` and `srelens-tui-0.15.0-<target>.tar.gz`. Keep this list open for Step 6.

- [ ] **Step 5: Update the version strings**

```bash
node --input-type=module <<'EOF'
import { readFileSync, writeFileSync } from 'node:fs';
const files = ['index.html', 'tui/index.html', 'compare/index.html', 'download/index.html', 'faq/index.html', 'features/index.html', 'mcp/index.html'];
for (const f of files) {
  const next = readFileSync(f, 'utf8')
    .replace(/"softwareVersion": "0\.3\.0"/g, '"softwareVersion": "0.15.0"')
    .replace(/<span data-version>v0\.3\.0<\/span>/g, '<span data-version>v0.15.0</span>')
    .replace(/releases\/download\/srelens-v0\.3\.0\/([^"]*)/g, (m, asset) => `releases/download/srelens-v0.15.0/${asset.replace(/0\.3\.0/g, '0.15.0')}`);
  writeFileSync(f, next);
}
EOF
cp docs/tui/index.html docs/tui.html
```

- [ ] **Step 6: Check every fallback download URL exists**

```bash
grep -oh 'https://github.com/srelens/srelens/releases/download/[^"]*' download/index.html index.html tui/index.html | sort -u | while read u; do printf '%s %s\n' "$(curl -sIL -o /dev/null -w '%{http_code}' "$u")" "$u"; done
```

Expected: every line starts with `200`. If one returns 404, the asset was renamed: replace that href with the matching name from Step 4 (keep the `data-asset` template unchanged unless its pattern also changed) and re-run.

- [ ] **Step 7: Run the full suite**

Run: `node --test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A index.html tui/index.html compare/index.html download/index.html faq/index.html features/index.html mcp/index.html docs/tui.html tests/version.test.mjs tests/seo.test.mjs
git commit -m "fix(seo): declare v0.15.0 in JSON-LD, version labels and fallback download links"
```

---

## Phase B — Real terminal evidence

### Task 5: ANSI → HTML converter and capture embedding

**Files:**
- Create: `scripts/ansi-to-html.mjs`, `scripts/embed-captures.mjs`, `tests/ansi-to-html.test.mjs`, `tests/captures.test.mjs`

**Interfaces:**
- Produces: `ansiToHtml(input: string): string`, `PALETTE_16: string[]`, `xterm256(n: number): string` from `scripts/ansi-to-html.mjs`; `captureHtml(name: string): string`, `embedCaptures(html: string): string`, `markers(html): {name, inner}[]` from `scripts/embed-captures.mjs`. Marker syntax in pages: `<!-- capture:NAME:start --><!-- capture:NAME:end -->`, source file `assets/captures/NAME.ansi`.

- [ ] **Step 1: Write the failing test `tests/ansi-to-html.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ansiToHtml, xterm256 } from '../scripts/ansi-to-html.mjs';

test('plain text is escaped and spacing is kept', () => {
  assert.equal(ansiToHtml('a  <b> & c'), 'a  &lt;b&gt; &amp; c');
});
test('16-color foreground and reset', () => {
  assert.equal(ansiToHtml('\x1b[32mok\x1b[0m done'), '<span style="color:#4ade80">ok</span> done');
});
test('bright colors and bold combine', () => {
  assert.equal(ansiToHtml('\x1b[1;95mSRELENS\x1b[m'), '<span style="color:#f9a8d4;font-weight:700">SRELENS</span>');
});
test('256-color and truecolor', () => {
  assert.equal(xterm256(196), '#ff0000');
  assert.equal(xterm256(244), '#808080');
  assert.equal(ansiToHtml('\x1b[38;5;196mx'), '<span style="color:#ff0000">x</span>');
  assert.equal(ansiToHtml('\x1b[48;2;59;36;112m sel \x1b[0m'), '<span style="background:#3b2470"> sel </span>');
});
test('reverse video swaps foreground and background', () => {
  assert.equal(ansiToHtml('\x1b[7mx'), '<span style="color:var(--term-bg);background:var(--term-fg)">x</span>');
});
test('box-drawing characters pass through', () => {
  assert.equal(ansiToHtml('╭─ Pods [32] ─╮'), '╭─ Pods [32] ─╮');
});
test('non-SGR escapes and carriage returns are dropped', () => {
  assert.equal(ansiToHtml('a\x1b[2Kb\r\nc\x1b]0;title\x07'), 'ab\nc');
});
test('adjacent runs with the same style merge', () => {
  assert.equal(ansiToHtml('\x1b[32ma\x1b[32mb'), '<span style="color:#4ade80">ab</span>');
});
test('trailing blank lines are trimmed', () => {
  assert.equal(ansiToHtml('a\n\n\n'), 'a');
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `node --test tests/ansi-to-html.test.mjs`
Expected: FAIL with `Cannot find module '.../scripts/ansi-to-html.mjs'`.

- [ ] **Step 3: Write `scripts/ansi-to-html.mjs`**

```js
// Convert terminal output with ANSI SGR escapes (as written by `tmux capture-pane -p -e`)
// into HTML for <pre class="tui">. Colors become inline styles on spans; the terminal
// block is dark in both site themes, so fixed colors are safe.
//   node scripts/ansi-to-html.mjs assets/captures/pods.ansi
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Indexes 0-15, tuned to the site's terminal tokens.
export const PALETTE_16 = [
  '#1d1828', '#f87171', '#4ade80', '#facc15', '#60a5fa', '#f472b6', '#67e8f9', '#d9d3e3',
  '#6b6378', '#fca5a5', '#86efac', '#fde047', '#93c5fd', '#f9a8d4', '#a5f3fc', '#ffffff',
];

const hex = (r, g, b) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function xterm256(n) {
  if (n < 16) return PALETTE_16[n];
  if (n >= 232) { const v = 8 + (n - 232) * 10; return hex(v, v, v); }
  const i = n - 16;
  const steps = [0, 95, 135, 175, 215, 255];
  return hex(steps[Math.floor(i / 36)], steps[Math.floor(i / 6) % 6], steps[i % 6]);
}

const RESET = { fg: null, bg: null, bold: false, dim: false, italic: false, underline: false, reverse: false };

function applySgr(state, codes) {
  const p = codes.length ? codes : [0];
  for (let i = 0; i < p.length; i += 1) {
    const n = p[i];
    if (n === 0) Object.assign(state, RESET);
    else if (n === 1) state.bold = true;
    else if (n === 2) state.dim = true;
    else if (n === 3) state.italic = true;
    else if (n === 4) state.underline = true;
    else if (n === 7) state.reverse = true;
    else if (n === 22) { state.bold = false; state.dim = false; }
    else if (n === 23) state.italic = false;
    else if (n === 24) state.underline = false;
    else if (n === 27) state.reverse = false;
    else if (n >= 30 && n <= 37) state.fg = PALETTE_16[n - 30];
    else if (n === 39) state.fg = null;
    else if (n >= 40 && n <= 47) state.bg = PALETTE_16[n - 40];
    else if (n === 49) state.bg = null;
    else if (n >= 90 && n <= 97) state.fg = PALETTE_16[n - 90 + 8];
    else if (n >= 100 && n <= 107) state.bg = PALETTE_16[n - 100 + 8];
    else if (n === 38 || n === 48) {
      const key = n === 38 ? 'fg' : 'bg';
      if (p[i + 1] === 5) { state[key] = xterm256(p[i + 2]); i += 2; }
      else if (p[i + 1] === 2) { state[key] = hex(p[i + 2], p[i + 3], p[i + 4]); i += 4; }
    }
  }
}

function styleOf(state) {
  let { fg, bg } = state;
  if (state.reverse) [fg, bg] = [bg ?? 'var(--term-bg)', fg ?? 'var(--term-fg)'];
  const parts = [];
  if (fg) parts.push(`color:${fg}`);
  if (bg) parts.push(`background:${bg}`);
  if (state.bold) parts.push('font-weight:700');
  if (state.dim) parts.push('opacity:.7');
  if (state.italic) parts.push('font-style:italic');
  if (state.underline) parts.push('text-decoration:underline');
  return parts.join(';');
}

export function ansiToHtml(input) {
  const state = { ...RESET };
  let out = '';
  let open = '';
  let buf = '';
  const flush = () => {
    if (!buf) return;
    out += open ? `<span style="${open}">${esc(buf)}</span>` : esc(buf);
    buf = '';
  };
  // SGR | other CSI | OSC | carriage return
  const re = /\x1b\[([0-9;]*)m|\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*\x07|\r/g;
  let last = 0;
  let m;
  while ((m = re.exec(input))) {
    buf += input.slice(last, m.index);
    last = re.lastIndex;
    if (m[1] === undefined) continue;
    const next = { ...state };
    applySgr(next, m[1] === '' ? [] : m[1].split(';').map(Number));
    const style = styleOf(next);
    if (style !== open) { flush(); open = style; }
    Object.assign(state, next);
  }
  buf += input.slice(last);
  flush();
  return out.replace(/\n+$/, '');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(`${ansiToHtml(readFileSync(process.argv[2], 'utf8'))}\n`);
}
```

- [ ] **Step 4: Run the converter tests**

Run: `node --test tests/ansi-to-html.test.mjs`
Expected: PASS (9 tests).

- [ ] **Step 5: Write the failing test `tests/captures.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listPages, read } from './lib/site.mjs';
import { captureHtml, markers, embedCaptures } from '../scripts/embed-captures.mjs';

test('embedCaptures fills an empty marker pair', () => {
  const html = '<pre class="tui"><!-- capture:fixture:start --><!-- capture:fixture:end --></pre>';
  assert.equal(
    embedCaptures(html, () => '<span style="color:#4ade80">ok</span>'),
    '<pre class="tui"><!-- capture:fixture:start --><span style="color:#4ade80">ok</span><!-- capture:fixture:end --></pre>',
  );
});

for (const file of listPages()) {
  for (const { name, inner } of markers(read(file))) {
    test(`${file}: capture "${name}" matches assets/captures/${name}.ansi`, () => {
      assert.equal(inner, captureHtml(name));
    });
  }
}
```

- [ ] **Step 6: Run and watch it fail**

Run: `node --test tests/captures.test.mjs`
Expected: FAIL with `Cannot find module '.../scripts/embed-captures.mjs'`.

- [ ] **Step 7: Write `scripts/embed-captures.mjs`**

```js
// Fill <!-- capture:NAME:start --> … <!-- capture:NAME:end --> markers in the pages
// with the converted contents of assets/captures/NAME.ansi.
//   node scripts/embed-captures.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, listPages, read } from '../tests/lib/site.mjs';
import { ansiToHtml } from './ansi-to-html.mjs';

const MARKER = /<!-- capture:([a-z0-9-]+):start -->([\s\S]*?)<!-- capture:\1:end -->/g;

export const captureHtml = (name) =>
  ansiToHtml(readFileSync(join(ROOT, 'assets', 'captures', `${name}.ansi`), 'utf8'));

export const markers = (html) => [...html.matchAll(MARKER)].map((m) => ({ name: m[1], inner: m[2] }));

export const embedCaptures = (html, render = captureHtml) =>
  html.replace(MARKER, (_, name) => `<!-- capture:${name}:start -->${render(name)}<!-- capture:${name}:end -->`);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const file of listPages()) {
    const html = read(file);
    const next = embedCaptures(html);
    if (next !== html) {
      writeFileSync(join(ROOT, file), next);
      console.log(`captures embedded: ${file}`);
    }
  }
}
```

- [ ] **Step 8: Run the full suite**

Run: `node --test`
Expected: PASS (no page has markers yet, so only the fixture test runs from `captures.test.mjs`).

- [ ] **Step 9: Commit**

```bash
git add scripts/ansi-to-html.mjs scripts/embed-captures.mjs tests/ansi-to-html.test.mjs tests/captures.test.mjs
git commit -m "feat(tools): convert ANSI terminal captures to HTML and embed them in pages"
```

---

### Task 6: Capture `srelens-tui` v0.15.0 on the srelens-demo cluster

**Files:**
- Create: `scripts/demo/kind.yaml`, `scripts/demo/workloads.yaml`, `scripts/demo/capture.sh`, `assets/captures/pods.ansi`

This task produces evidence, not code; its check is the capture itself plus the converter test from Task 5. It runs entirely through Docker: the capture runs in a Linux container on the `kind` Docker network, so it works the same on Windows, macOS and Linux.

- [ ] **Step 1: Write `scripts/demo/kind.yaml`**

```yaml
# srelens-demo: 1 control-plane + 2 workers, as described in README.md.
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: srelens-demo
nodes:
  - role: control-plane
  - role: worker
  - role: worker
```

- [ ] **Step 2: Write `scripts/demo/workloads.yaml`**

```yaml
# Demo workloads for screenshots and terminal captures. ledger-worker crash-loops on purpose.
apiVersion: v1
kind: Namespace
metadata: { name: payments }
---
apiVersion: v1
kind: Namespace
metadata: { name: checkout }
---
apiVersion: v1
kind: Namespace
metadata: { name: monitoring }
---
apiVersion: apps/v1
kind: Deployment
metadata: { name: payments-api, namespace: payments }
spec:
  replicas: 2
  selector: { matchLabels: { app: payments-api } }
  template:
    metadata: { labels: { app: payments-api } }
    spec:
      containers:
        - name: api
          image: nginx:1.27-alpine
          resources: { requests: { cpu: 20m, memory: 32Mi }, limits: { memory: 64Mi } }
---
apiVersion: apps/v1
kind: Deployment
metadata: { name: ledger-worker, namespace: payments }
spec:
  replicas: 1
  selector: { matchLabels: { app: ledger-worker } }
  template:
    metadata: { labels: { app: ledger-worker } }
    spec:
      containers:
        - name: worker
          image: busybox:1.36
          command: ["sh", "-c", "echo 'connecting to ledger-db:5432'; sleep 2; echo 'fatal: connection refused' >&2; exit 1"]
---
apiVersion: apps/v1
kind: StatefulSet
metadata: { name: redis, namespace: payments }
spec:
  serviceName: redis
  replicas: 1
  selector: { matchLabels: { app: redis } }
  template:
    metadata: { labels: { app: redis } }
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
---
apiVersion: v1
kind: Service
metadata: { name: redis, namespace: payments }
spec:
  clusterIP: None
  selector: { app: redis }
  ports: [{ port: 6379 }]
---
apiVersion: apps/v1
kind: Deployment
metadata: { name: checkout-web, namespace: checkout }
spec:
  replicas: 2
  selector: { matchLabels: { app: checkout-web } }
  template:
    metadata: { labels: { app: checkout-web } }
    spec:
      containers:
        - name: web
          image: nginx:1.27-alpine
---
apiVersion: batch/v1
kind: CronJob
metadata: { name: cart-sync, namespace: checkout }
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: sync
              image: busybox:1.36
              command: ["sh", "-c", "echo synced 42 carts"]
---
apiVersion: apps/v1
kind: Deployment
metadata: { name: status-exporter, namespace: monitoring }
spec:
  replicas: 1
  selector: { matchLabels: { app: status-exporter } }
  template:
    metadata: { labels: { app: status-exporter } }
    spec:
      containers:
        - name: exporter
          image: nginx:1.27-alpine
```

- [ ] **Step 3: Write `scripts/demo/capture.sh`**

```bash
#!/usr/bin/env bash
# Runs inside an ubuntu:24.04 container on the "kind" Docker network.
# Installs srelens-tui at the pinned version, opens the pods view in tmux and
# writes the colored screen to /work/pods.ansi.
#   JUMP=<n> moves the selection down n rows before capturing.
set -euo pipefail
VERSION="${VERSION:-0.15.0}"
JUMP="${JUMP:-0}"
export DEBIAN_FRONTEND=noninteractive TERM=xterm-256color COLORTERM=truecolor
apt-get update -qq && apt-get install -y -qq tmux curl ca-certificates >/dev/null
curl -fsSL https://srelens.com/install.sh | sh -s -- --version "$VERSION"
export PATH="/usr/local/bin:$HOME/.local/bin:$PATH"
srelens-tui version

tmux new-session -d -s cap -x 100 -y 26 "srelens-tui -A"
sleep 8
tmux send-keys -t cap ':' ; sleep 0.5
tmux send-keys -t cap 'pods' Enter ; sleep 4
for _ in $(seq 1 "$JUMP"); do tmux send-keys -t cap 'j'; sleep 0.15; done
sleep 1
tmux capture-pane -p -e -t cap > /work/pods.ansi
tmux kill-session -t cap
echo "wrote /work/pods.ansi ($(wc -l < /work/pods.ansi) lines)"
```

Before running, confirm the installer's version flag: `grep -n -- '--version' install.sh | head -5`. If the installer expects a `v` prefix, set `VERSION=v0.15.0` in Step 6.

- [ ] **Step 4: Create the cluster and workloads**

```bash
kind create cluster --config scripts/demo/kind.yaml
kubectl --context kind-srelens-demo apply -f scripts/demo/workloads.yaml
kubectl --context kind-srelens-demo apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
kubectl --context kind-srelens-demo -n kube-system patch deployment metrics-server --type=json \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
kubectl --context kind-srelens-demo wait --for=condition=available --timeout=180s -n payments deploy/payments-api
kubectl --context kind-srelens-demo get pods -A
```

Expected: `ledger-worker-…` shows `CrashLoopBackOff` or `Error` with restarts climbing; the rest `Running`. Wait until `ledger-worker` has at least 5 restarts and `kubectl top pods -A` returns numbers (about 2–5 minutes).

- [ ] **Step 5: Export an in-network kubeconfig**

```bash
mkdir -p .superpowers/capture
kind get kubeconfig --name srelens-demo --internal > .superpowers/capture/kubeconfig
cp scripts/demo/capture.sh .superpowers/capture/
```

- [ ] **Step 6: Capture**

```bash
MSYS_NO_PATHCONV=1 docker run --rm --network kind \
  -v "$(pwd -W 2>/dev/null || pwd)/.superpowers/capture:/work" \
  -e KUBECONFIG=/work/kubeconfig -e JUMP=0 \
  ubuntu:24.04 bash /work/capture.sh
```

Expected: `wrote /work/pods.ansi (26 lines)`.

- [ ] **Step 7: Select the crash-looping pod**

Run: `node scripts/ansi-to-html.mjs .superpowers/capture/pods.ansi > .superpowers/capture/pods.html` and open `.superpowers/capture/pods.html` (or `cat -v` the `.ansi`) to find the row index of `ledger-worker-…` relative to the selected first row. Re-run Step 6 with `JUMP=<that index>`. Repeat until the highlighted row is `ledger-worker`.

- [ ] **Step 8: Store the capture**

```bash
mkdir -p assets/captures
cp .superpowers/capture/pods.ansi assets/captures/pods.ansi
node --test
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add scripts/demo assets/captures/pods.ansi
git commit -m "feat(evidence): add srelens-demo cluster scripts and a real srelens-tui pods capture"
```

Keep the cluster running until Task 25; screenshots in later tasks are not re-captured, but the capture may need a retake if Task 7 changes what the hero should show.

---

### Task 7: Verify TUI bindings and claims against v0.15.0 — CHECKPOINT

**Files:**
- Create: `docs/superpowers/plans/2026-10-02-tui-claims-check.md`

No site files change in this task. Its output decides copy in Tasks 11 and 12.

- [ ] **Step 1: Get the released source**

```bash
git -C ../srelens fetch origin --tags
git -C ../srelens rev-parse srelens-v0.15.0
```

Read files with `git -C ../srelens show srelens-v0.15.0:<path>`; do not check out or modify the srelens working tree. Key paths: `apps/tui/src/app.rs` (key handlers), `apps/tui/src/commands.rs` (`:commands`), `apps/tui/src/ui/help.rs` (help text), `apps/tui/src/cli.rs` (flags), `apps/tui/src/ai_skills.rs` (slash commands), `packages/core/src/lib/shortcuts.ts` (desktop shortcuts). If a path differs at the tag, find it with `git -C ../srelens ls-tree -r --name-only srelens-v0.15.0 | grep <name>`.

- [ ] **Step 2: Build the bindings table**

For every key or command that appears on `tui/index.html`, `docs/tui/index.html`, `index.html` (bento `⌘K`), `features/index.html` and `llms*.txt`, record: the binding, where it appears, the handler file:line at the tag, and a verdict (`verified`, `wrong key`, `not in v0.15.0`, `dev-only`). Include at least: `:`, `/`, `l`, `s`, `S`/`h`, `y`, `d`, `e`, `x`, `t`, `c`, `C`, `Ctrl+y`, `f`/`F`, `Ctrl+s`, `Ctrl+d`, `r`, `Tab`, `:ai`, `:helm`, `:argo`, `:bgp`, `:gpuinfo`, `:top`, `:topo`, `:overview`, `:pods`, `:ctx`/`:contexts`, `F1-F10`, `Ctrl+x`, `Shift+D`, `Shift+N`, `Shift+F`, `/crashloop`, `/oom`, `/rollout`, `/network`, `/caveman`, `srelens-tui mcp`, `--mcp-allow-sensitive-reads`, `--mcp-allow-destructive`, and the desktop `⌘K`.

- [ ] **Step 3: Build the claims table**

For each numeric or capability claim on `tui/index.html`, `index.html` and `llms*.txt` (`<15ms` startup, `0ms` informer cache, `<25MB` memory, `100% Pure Rust`, "up to 90%" prompt caching, "80+ native Kubernetes tools", "40+ resource kinds", supported AI providers including Ollama), record the claim, where it appears, the first-party evidence found (file:line, benchmark, test) or "none", and a proposed action (`keep`, `reword: "<exact new text>"`, `remove`).

- [ ] **Step 4: Pick the keycaps for the homepage `#everything` cells**

List which bento cells get a keycap row and the exact verified keys, for example `Command palette: ⌘K (desktop) · : (tui)`. Only verified bindings qualify.

- [ ] **Step 5: Write the report and commit**

Write the three tables to `docs/superpowers/plans/2026-10-02-tui-claims-check.md` and commit:

```bash
git add docs/superpowers/plans/2026-10-02-tui-claims-check.md
git commit -m "docs(plan): verify srelens-tui bindings and claims against v0.15.0"
```

- [ ] **Step 6: STOP — present the report to Devesh**

Show the claims table and every `wrong key` / `not in v0.15.0` row. Wait for an explicit decision per row. Record the decisions in the same file under `## Decisions` (row, decision, exact replacement text) and commit. Tasks 11 and 12 apply only what is recorded there.

---

## Phase C — Design system and shell

### Task 8: `site.css` foundation and contrast test

**Files:**
- Create: `site.css`, `tests/contrast.test.mjs`

**Interfaces:**
- Produces: CSS custom properties used by every later task: `--bg --surface --sunk --line --line-strong --ink --muted --brand --brand-ink --hot --ok --warn --bad --term-bg --term-fg --term-line --term-raised --term-dim --term-ok --term-bad --term-warn --term-key --term-brand --term-border --overlay --evidence-shadow --font-mono --font-body --font-term --wrap --gutter --section-y --measure --r-control --r-card --r-frame --header-h`. Base classes: `.wrap .section .section-head .center .page-hero .eyebrow .tick .lede .sub .accent .display .skip-link .visually-hidden`.

- [ ] **Step 1: Write the failing test `tests/contrast.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, read } from './lib/site.mjs';

test('site.css exists', () => assert.ok(existsSync(join(ROOT, 'site.css'))));

const css = existsSync(join(ROOT, 'site.css')) ? read('site.css') : '';
const block = (selector) => {
  const i = css.indexOf(`${selector} {`);
  assert.ok(i >= 0, `missing ${selector} block`);
  return css.slice(i, css.indexOf('}', i));
};
const tokens = (body) => Object.fromEntries([...body.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\b/gi)].map((m) => [m[1], m[2].toLowerCase()]));
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const PAIRS = [
  ['ink', 'bg'], ['ink', 'surface'], ['muted', 'bg'], ['muted', 'surface'], ['muted', 'sunk'],
  ['brand', 'bg'], ['brand', 'surface'], ['brand', 'sunk'], ['brand-ink', 'brand'], ['hot', 'bg'],
  ['ok', 'bg'], ['ok', 'surface'], ['bad', 'surface'], ['warn', 'surface'],
];
const TERM_PAIRS = ['term-fg', 'term-dim', 'term-ok', 'term-bad', 'term-warn', 'term-key', 'term-brand']
  .flatMap((fg) => [[fg, 'term-bg'], [fg, 'term-raised']]);

for (const theme of ['light', 'dark']) {
  test(`${theme}: text tokens meet 4.5:1`, () => {
    const light = tokens(block(':root'));
    const t = theme === 'light' ? light : { ...light, ...tokens(block(':root[data-theme="dark"]')) };
    for (const [fg, bg] of [...PAIRS, ...TERM_PAIRS]) {
      assert.ok(t[fg] && t[bg], `--${fg} / --${bg} defined`);
      const r = ratio(t[fg], t[bg]);
      assert.ok(r >= 4.5, `--${fg} on --${bg} is ${r.toFixed(2)}:1`);
    }
  });
}

test('the no-JS dark block repeats the dark tokens exactly', () => {
  const m = css.match(/@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme\]\) \{([^}]*)\}/);
  assert.ok(m, 'missing no-JS dark block');
  assert.deepEqual(tokens(m[1]), tokens(block(':root[data-theme="dark"]')));
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `node --test tests/contrast.test.mjs`
Expected: FAIL, `site.css exists`.

- [ ] **Step 3: Write `site.css` (foundation)**

```css
/* ============================================================
   srelens.com · site.css
   Terminal-native design system ("Command line", direction A).
   Spec: docs/superpowers/specs/2026-10-02-terminal-native-redesign-design.md
   Sections: tokens · base · type · layout · shell · components · pages
   ============================================================ */

/* ---------- tokens ---------- */
:root {
  --bg: #fbfafc;
  --surface: #ffffff;
  --sunk: #f3f0f7;
  --line: #e4dfeb;
  --line-strong: #cfc7da;
  --ink: #1b1524;
  --muted: #675d74;
  --brand: #6d44c5;
  --brand-ink: #ffffff;
  --hot: #c2410c;
  --ok: #15803d;
  --warn: #a16207;
  --bad: #b91c1c;
  /* terminal surfaces are dark in both themes */
  --term-bg: #100d16;
  --term-raised: #1d1828;
  --term-line: #2a2433;
  --term-fg: #d9d3e3;
  --term-dim: #8b8398;
  --term-ok: #4ade80;
  --term-bad: #f87171;
  --term-warn: #facc15;
  --term-key: #67e8f9;
  --term-brand: #f472b6;
  --term-border: #7c3aed;
  --overlay: rgba(16, 13, 22, 0.86);
  --evidence-shadow: 0 24px 60px -24px rgba(20, 10, 40, 0.35);

  --font-mono: "Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  --font-body: "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-term: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;

  --wrap: 1200px;
  --gutter: clamp(16px, 4vw, 40px);
  --section-y: clamp(56px, 8vw, 96px);
  --measure: 70ch;
  --r-control: 7px;
  --r-card: 9px;
  --r-frame: 10px;
  --header-h: 56px;
  color-scheme: light;
}

:root[data-theme="dark"] {
  --bg: #0f0d14;
  --surface: #17141e;
  --sunk: #131019;
  --line: #2a2533;
  --line-strong: #3a3346;
  --ink: #ece8f3;
  --muted: #9d94aa;
  --brand: #a78bfa;
  --brand-ink: #140f1f;
  --hot: #fb923c;
  --ok: #4ade80;
  --warn: #facc15;
  --bad: #f87171;
  --evidence-shadow: 0 24px 60px -24px rgba(0, 0, 0, 0.6);
  color-scheme: dark;
}

/* Visitors without JS get no data-theme attribute; follow their OS. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --bg: #0f0d14;
    --surface: #17141e;
    --sunk: #131019;
    --line: #2a2533;
    --line-strong: #3a3346;
    --ink: #ece8f3;
    --muted: #9d94aa;
    --brand: #a78bfa;
    --brand-ink: #140f1f;
    --hot: #fb923c;
    --ok: #4ade80;
    --warn: #facc15;
    --bad: #f87171;
    --evidence-shadow: 0 24px 60px -24px rgba(0, 0, 0, 0.6);
    color-scheme: dark;
  }
}

/* ---------- base ---------- */
*, *::before, *::after { box-sizing: border-box; }
[hidden] { display: none !important; }
html { -webkit-text-size-adjust: 100%; scroll-padding-top: calc(var(--header-h) + 16px); }
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font: 400 17px/1.6 var(--font-body);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
img, video, svg { max-width: 100%; height: auto; }
a { color: var(--brand); text-underline-offset: 3px; text-decoration-thickness: 1px; }
a:hover { text-decoration-thickness: 2px; }
:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 2px; }
::selection { background: color-mix(in srgb, var(--brand) 28%, transparent); }
p { margin: 0 0 1em; }
p:last-child { margin-bottom: 0; }
code, kbd, pre, samp { font-family: var(--font-mono); }
code { font-size: 0.88em; padding: 0.1em 0.35em; border-radius: 5px; background: var(--sunk); border: 1px solid var(--line); }
pre code { padding: 0; background: none; border: 0; }
kbd {
  display: inline-block;
  min-width: 1.7em;
  padding: 1px 6px;
  font: 500 12px/1.6 var(--font-mono);
  text-align: center;
  color: var(--ink);
  background: var(--sunk);
  border: 1px solid var(--line);
  border-bottom-width: 2px;
  border-radius: 5px;
}
hr { border: 0; border-top: 1px solid var(--line); }
table { border-collapse: collapse; }
.skip-link {
  position: absolute; left: 12px; top: -48px; z-index: 100;
  padding: 8px 12px; border-radius: var(--r-control);
  background: var(--brand); color: var(--brand-ink);
  font: 600 14px var(--font-mono); text-decoration: none;
}
.skip-link:focus { top: 12px; }
.visually-hidden {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* ---------- type ---------- */
h1, h2, h3, h4 { margin: 0; font-family: var(--font-mono); font-weight: 600; color: var(--ink); text-wrap: balance; }
h1, .display { font-size: clamp(32px, 4.5vw, 58px); line-height: 1.08; letter-spacing: -0.045em; }
h2 { font-size: clamp(24px, 2.6vw, 32px); line-height: 1.15; letter-spacing: -0.03em; }
h3 { font-size: 16px; line-height: 1.35; letter-spacing: -0.01em; }
.accent { color: var(--hot); }
.lede { font-size: clamp(17px, 1.6vw, 19px); line-height: 1.6; color: var(--muted); max-width: 64ch; }
.sub { color: var(--muted); max-width: 62ch; }
.eyebrow { margin: 0 0 14px; font: 500 12.5px/1.4 var(--font-mono); color: var(--muted); letter-spacing: 0.02em; }
.tick { color: var(--brand); }

/* ---------- layout ---------- */
.wrap { width: 100%; max-width: calc(var(--wrap) + 2 * var(--gutter)); margin-inline: auto; padding-inline: var(--gutter); }
.section { padding-block: var(--section-y); border-top: 1px solid var(--line); }
.page-hero + .section { padding-top: 40px; border-top: 0; }
.section-head { display: grid; gap: 10px; max-width: 760px; margin-bottom: 36px; }
.section-head .eyebrow { margin: 0; }
.section-head.center { margin-inline: auto; text-align: center; justify-items: center; }
.page-hero { padding-block: clamp(40px, 6vw, 72px) clamp(28px, 4vw, 44px); }
.page-hero .wrap { display: grid; gap: 18px; justify-items: start; }
```

- [ ] **Step 4: Run the contrast test**

Run: `node --test tests/contrast.test.mjs`
Expected: PASS (site.css exists, 2 theme tests, no-JS block test).

- [ ] **Step 5: Run the full suite and commit**

Run: `node --test` → PASS. No page links `site.css` yet, so nothing renders differently.

```bash
git add site.css tests/contrast.test.mjs
git commit -m "feat(design): add site.css tokens, base and type with a contrast test"
```

---

### Task 9: Page manifest, shell renderer and shell CSS

**Files:**
- Create: `scripts/pages.mjs`, `scripts/shell.mjs`, `scripts/apply-shell.mjs`, `scripts/strip-styles.mjs`, `tests/shell.test.mjs`
- Modify: `site.css` (append shell section), `main.js:10-17` (theme-color values)

**Interfaces:**
- Consumes: `read`, `text`, `ldNodes`, `siteVersion`, `ORIGIN`, `ROOT` from `tests/lib/site.mjs`.
- Produces (`scripts/pages.mjs`): `PAGES: Page[]`, `page(file): Page`, where `Page = { file: string, nav: string|null, crumbs: [label, href, ldName?][] | null, mirrorOf?: string, ogCard?: string }`.
- Produces (`scripts/shell.mjs`): `NAV: string[]`, `FONTS`, `STYLES`, `THEME_INIT`, `THEME_COLOR` (strings), `renderHeader(page)`, `renderPathLine(page)`, `renderFooter(version)`, `breadcrumbLd(page)`, `applyShell(html, page, version): string`.
- Produces (CLI): `node scripts/apply-shell.mjs <files…> | --all`, `node scripts/strip-styles.mjs <files…>`.

- [ ] **Step 1: Write `scripts/pages.mjs`**

```js
// Every published page. Drives the shared shell (scripts/apply-shell.mjs):
//   nav    - header link marked aria-current (null on / and 404)
//   crumbs - visible path line and BreadcrumbList, root first: [label, href, ldName?].
//            Labels are each page's existing crumb text; ldName keeps the case of an
//            existing BreadcrumbList name.
//   ogCard - Open Graph card rendered by scripts/og-cards.mjs (Task 22)
const root = ['srelens', '/'];
const docs = ['Docs', '/docs/'];
const compare = ['compare', '/compare/', 'Compare'];
const guides = ['SRE guides', '/guides/'];

export const PAGES = [
  { file: 'index.html', nav: null, crumbs: null },
  { file: 'features/index.html', nav: '/features/', crumbs: [root, ['features', '/features/', 'Features']] },
  { file: 'tui/index.html', nav: '/tui/', crumbs: [root, ['tui', '/tui/', 'TUI']], ogCard: 'og-tui.png' },
  { file: 'mcp/index.html', nav: '/mcp/', crumbs: [root, ['mcp', '/mcp/', 'MCP']] },
  { file: 'compare/index.html', nav: '/compare/', crumbs: [root, compare] },
  { file: 'compare/lens/index.html', nav: '/compare/', crumbs: [root, compare, ['lens', '/compare/lens/', 'Lens']] },
  { file: 'compare/headlamp/index.html', nav: '/compare/', crumbs: [root, compare, ['headlamp', '/compare/headlamp/', 'Headlamp']] },
  { file: 'compare/k9s/index.html', nav: '/compare/', crumbs: [root, compare, ['k9s', '/compare/k9s/', 'K9s']] },
  { file: 'compare/freelens/index.html', nav: '/compare/', crumbs: [root, compare, ['freelens', '/compare/freelens/', 'Freelens']] },
  { file: 'compare/aptakube/index.html', nav: '/compare/', crumbs: [root, compare, ['aptakube', '/compare/aptakube/', 'Aptakube']] },
  { file: 'compare/kubernetes-dashboard/index.html', nav: '/compare/', crumbs: [root, compare, ['kubernetes dashboard', '/compare/kubernetes-dashboard/', 'Kubernetes Dashboard']] },
  { file: 'download/index.html', nav: '/download/', crumbs: [root, ['download', '/download/', 'Download']] },
  { file: 'faq/index.html', nav: '/faq/', crumbs: [root, ['faq', '/faq/', 'FAQ']] },
  { file: 'docs/index.html', nav: '/docs/', crumbs: [root, ['Documentation', '/docs/']], ogCard: 'og-docs.png' },
  { file: 'docs/tui/index.html', nav: '/docs/', crumbs: [root, docs, ['Terminal UI (srelens-tui)', '/docs/tui/']], ogCard: 'og-docs-tui.png' },
  { file: 'docs/tui.html', mirrorOf: 'docs/tui/index.html' },
  { file: 'security/index.html', nav: '/docs/', crumbs: [root, docs, ['Security', '/security/']], ogCard: 'og-security.png' },
  { file: 'architecture/index.html', nav: '/docs/', crumbs: [root, docs, ['Architecture', '/architecture/']], ogCard: 'og-architecture.png' },
  { file: 'guides/index.html', nav: '/docs/', crumbs: [root, docs, guides], ogCard: 'og-guides.png' },
  { file: 'guides/crashloopbackoff/index.html', nav: '/docs/', crumbs: [root, guides, ['CrashLoopBackOff', '/guides/crashloopbackoff/']], ogCard: 'og-guides-crashloopbackoff.png' },
  { file: 'guides/oomkilled/index.html', nav: '/docs/', crumbs: [root, guides, ['OOMKilled', '/guides/oomkilled/']], ogCard: 'og-guides-oomkilled.png' },
  { file: 'guides/failed-deployment/index.html', nav: '/docs/', crumbs: [root, guides, ['Failed deployment', '/guides/failed-deployment/']], ogCard: 'og-guides-failed-deployment.png' },
  { file: '404.html', nav: null, crumbs: null },
];

export const page = (file) => PAGES.find((p) => p.file === file);
```

- [ ] **Step 2: Write the failing test `tests/shell.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, ldNodes, siteVersion, listPages } from './lib/site.mjs';
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

// Minimal page skeleton for applyShell unit tests (index.html has no crumbs, so none are needed).
const doc = (body) => `<head></head><body><header class="site-header"></header><main id="main">${body}</main><script src="/main.js" defer></script></body>`;

test('applyShell turns a short H1 gradient phrase into the accent and drops the rest', () => {
  const html = applyShell(doc('<h1 class="display">The terminal control room <br><span class="grad">for Kubernetes.</span></h1><h2>A <span class="grad">long gradient phrase here.</span></h2>'), page('index.html'), '0.15.0');
  assert.match(html, /<span class="accent">for Kubernetes\.<\/span>/);
  assert.match(html, /<h2>A long gradient phrase here\.<\/h2>/);
});

test('applyShell turns an eyebrow tick into a section permalink', () => {
  const html = applyShell(doc('<section class="section" id="workflow"><p class="eyebrow"><span class="tick">●</span> The reliability loop</p></section>'), page('index.html'), '0.15.0');
  assert.match(html, /<p class="eyebrow"><a class="section-label anchor-link" href="#workflow">#workflow<\/a> · The reliability loop<\/p>/);
});

// Pages moved to the new design. Each page task adds its pages here first.
const MIGRATED = new Set([]);

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
```

- [ ] **Step 3: Run and watch it fail**

Run: `node --test tests/shell.test.mjs`
Expected: FAIL with `Cannot find module '.../scripts/shell.mjs'`.

- [ ] **Step 4: Write `scripts/shell.mjs`**

```js
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
  out = out.replace(/<script>\s*\(function \(\) \{\s*var t = null;[\s\S]*?<\/script>/, THEME_INIT);
  out = out.replace(/<meta name="theme-color" content="[^"]*">/, THEME_COLOR);

  // old decorative layers and classes
  out = out.replace(/\s*<div class="(?:bg-aurora|bg-grid|band-glow)" aria-hidden="true"><\/div>/g, '');
  out = out.replace(/class="([^"]*)"/g, (m, cls) => {
    const kept = cls.split(/\s+/).filter((c) => c && c !== 'reveal');
    return kept.length === cls.split(/\s+/).filter(Boolean).length ? m : `class="${kept.join(' ')}"`;
  });

  // gradient spans: a short H1 phrase becomes the accent, everything else is plain text
  out = out.replace(/(<h1[\s>][\s\S]*?<\/h1>)|<span class="grad">([\s\S]*?)<\/span>/g, (m, h1, inner) => {
    if (h1) {
      return h1.replace(/<span class="grad">([\s\S]*?)<\/span>/, (s, t) => (text(t).split(/\s+/).length <= 4 ? `<span class="accent">${t}</span>` : t));
    }
    return inner;
  });

  // eyebrow tick inside an id'd section becomes that section's permalink
  out = out.replace(/(<section\b[^>]*\sid="([^"]+)"[^>]*>)([\s\S]*?)(?=<section\b|<\/main>)/g, (m, open, id, body) => (
    open + body.replace('<span class="tick">●</span>', `<a class="section-label anchor-link" href="#${id}">#${id}</a> ·`)
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
```

- [ ] **Step 5: Write `scripts/apply-shell.mjs`**

```js
// Apply the shared shell to pages and refresh mirrors.
//   node scripts/apply-shell.mjs index.html tui/index.html
//   node scripts/apply-shell.mjs --all
import { copyFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, read, siteVersion } from '../tests/lib/site.mjs';
import { PAGES, page } from './pages.mjs';
import { applyShell } from './shell.mjs';

const args = process.argv.slice(2);
const files = args.includes('--all') ? PAGES.map((p) => p.file) : args;
if (!files.length) {
  console.error('usage: node scripts/apply-shell.mjs <page.html…> | --all');
  process.exit(1);
}
const version = siteVersion();
for (const file of files) {
  const entry = page(file);
  if (!entry) throw new Error(`${file} is not in scripts/pages.mjs`);
  if (entry.mirrorOf) continue;
  writeFileSync(join(ROOT, file), applyShell(read(file), entry, version));
  console.log(`shell applied: ${file}`);
}
for (const mirror of PAGES.filter((p) => p.mirrorOf && (files.includes(p.file) || files.includes(p.mirrorOf)))) {
  copyFileSync(join(ROOT, mirror.mirrorOf), join(ROOT, mirror.file));
  console.log(`mirrored: ${mirror.mirrorOf} -> ${mirror.file}`);
}
```

- [ ] **Step 6: Write `scripts/strip-styles.mjs`**

```js
// Remove inline style attributes from pages, leaving generated terminal captures alone.
//   node scripts/strip-styles.mjs compare/index.html compare/lens/index.html
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, read } from '../tests/lib/site.mjs';

for (const file of process.argv.slice(2)) {
  const parts = read(file).split(/(<pre class="tui"[\s\S]*?<\/pre>)/);
  const next = parts.map((part, i) => (i % 2 ? part : part.replace(/\s+style="[^"]*"/g, ''))).join('');
  writeFileSync(join(ROOT, file), next);
  console.log(`inline styles removed: ${file}`);
}
```

- [ ] **Step 7: Run the shell tests**

Run: `node --test tests/shell.test.mjs`
Expected: PASS (manifest, 8 unit tests; the migrated-pages loop is empty; "every page is migrated" is reported as TODO).

- [ ] **Step 8: Append the shell section to `site.css`**

```css
/* ---------- shell: header ---------- */
.site-header { position: sticky; top: 0; z-index: 50; background: var(--bg); border-bottom: 1px solid var(--line); }
.nav { display: flex; align-items: center; gap: 20px; height: var(--header-h); }
.brand { display: inline-flex; align-items: center; gap: 9px; font: 600 15px var(--font-mono); letter-spacing: -0.01em; color: var(--ink); text-decoration: none; }
.brand img { width: 24px; height: 24px; }
.nav-main { display: flex; align-items: center; flex: 1; min-width: 0; }
.nav-links, .nav-menu-list { margin: 0; padding: 0; list-style: none; }
.nav-links { display: flex; gap: 2px; }
.nav-links a, .nav-menu-list a {
  display: inline-flex; align-items: center; height: 32px; padding: 0 8px;
  border-radius: 6px; font: 500 13px var(--font-mono); color: var(--muted); text-decoration: none;
}
.nav-links a:hover, .nav-menu-list a:hover { color: var(--ink); background: var(--sunk); }
.nav-links a[aria-current="page"], .nav-menu-list a[aria-current="page"] { color: var(--brand); }
.slash { opacity: 0.55; }
.nav-menu { display: none; margin-left: auto; position: relative; }
.nav-menu summary {
  list-style: none; cursor: pointer; padding: 6px 10px;
  font: 500 13px var(--font-mono); color: var(--ink);
  border: 1px solid var(--line); border-radius: var(--r-control);
}
.nav-menu summary::-webkit-details-marker { display: none; }
.nav-menu[open] summary { border-color: var(--line-strong); }
.nav-menu-list {
  position: absolute; right: 0; top: calc(100% + 8px); z-index: 60; display: grid; min-width: 200px; padding: 6px;
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-card);
}
.nav-menu-list a { width: 100%; }
.theme-toggle {
  display: inline-grid; place-items: center; width: 34px; height: 34px; padding: 0; cursor: pointer;
  color: var(--muted); background: transparent; border: 1px solid var(--line); border-radius: var(--r-control);
}
.theme-toggle:hover { color: var(--ink); border-color: var(--line-strong); }
.theme-toggle .sun { display: none; }
[data-theme="dark"] .theme-toggle .sun { display: block; }
[data-theme="dark"] .theme-toggle .moon { display: none; }
.nav-cta { font: 500 13px var(--font-mono); color: var(--muted); text-decoration: none; white-space: nowrap; }
.nav-cta:hover { color: var(--ink); }
@media (max-width: 860px) {
  .nav-links { display: none; }
  .nav-menu { display: block; }
}

/* ---------- shell: path line ---------- */
.crumbs ol { display: flex; flex-wrap: wrap; gap: 0 8px; margin: 0; padding: 0; list-style: none; font: 500 13px/1.5 var(--font-mono); color: var(--muted); }
.crumbs li + li::before { content: "/"; margin-right: 8px; color: var(--line-strong); }
.crumbs a { color: var(--muted); text-decoration: none; }
.crumbs a:hover { color: var(--brand); }
.crumbs [aria-current="page"] { color: var(--ink); }

/* ---------- shell: footer ---------- */
.site-footer { border-top: 1px solid var(--line); background: var(--surface); }
.footer-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2.4fr); gap: 40px; padding-block: 48px 32px; }
.footer-tag { margin: 12px 0 0; font-size: 14px; color: var(--muted); }
.footer-version { margin: 8px 0 0; font: 500 12.5px var(--font-mono); color: var(--muted); }
.footer-cols { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px; }
.footer-h { margin: 0 0 10px; font: 600 12px var(--font-mono); color: var(--ink); }
.footer-col ul { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.footer-col a { font: 400 13.5px var(--font-mono); color: var(--muted); text-decoration: none; }
.footer-col a:hover { color: var(--brand); }
.footer-meta {
  display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 24px; padding-block: 18px 28px;
  border-top: 1px solid var(--line); font: 400 12.5px var(--font-mono); color: var(--muted);
}
@media (max-width: 860px) {
  .footer-grid { grid-template-columns: minmax(0, 1fr); }
  .footer-cols { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
```

- [ ] **Step 9: Update `main.js` theme-color values**

In `syncThemeColor`, replace `"#faf9fe" : "#08060f"` with `"#fbfafc" : "#0f0d14"`.

- [ ] **Step 10: Run the full suite and commit**

Run: `node --test` → PASS.

```bash
git add scripts/pages.mjs scripts/shell.mjs scripts/apply-shell.mjs scripts/strip-styles.mjs tests/shell.test.mjs site.css main.js
git commit -m "feat(design): add page manifest, shared shell renderer and shell styles"
```

---

### Task 10: Shared component styles

**Files:**
- Modify: `site.css` (append components section)

These rules re-skin the class vocabulary every page already uses, plus the new components (section label, keycaps, command block, terminal capture). They take effect page by page as pages switch to `site.css` in Phase D.

- [ ] **Step 1: Append the components section to `site.css`**

```css
/* ---------- components: actions ---------- */
.hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 44px; padding: 0 18px; cursor: pointer; white-space: nowrap;
  border: 1px solid transparent; border-radius: var(--r-control);
  font: 600 14px/1 var(--font-mono); text-decoration: none;
}
.btn-primary { background: var(--brand); color: var(--brand-ink); }
.btn-primary:hover { background: color-mix(in srgb, var(--brand) 86%, var(--ink)); }
.btn-ghost { background: transparent; color: var(--ink); border-color: var(--line-strong); }
.btn-ghost:hover { background: var(--sunk); }
.text-action {
  padding: 0; border: 0; background: none; cursor: pointer;
  font: inherit; color: var(--brand); text-decoration: underline; text-underline-offset: 3px;
}

/* ---------- components: section label (#id permalink inside an eyebrow) ---------- */
.section-label { font: 500 12.5px var(--font-mono); color: var(--brand); text-decoration: none; }
.section-label:hover { text-decoration: underline; }

/* ---------- components: cards ---------- */
.dl-card, .guide-card, .compare-card, .bento-cell, .loop-step, .verdict, .answer, .operator-callout, .keymap, .stat {
  padding: 22px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-card);
}
.keys { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0 0 12px; font: 500 11px var(--font-mono); color: var(--muted); }

/* ---------- components: command block ---------- */
.cmd {
  display: inline-flex; align-items: center; gap: 12px; max-width: 100%; min-height: 46px;
  padding: 6px 6px 6px 16px; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-card);
}
.cmd code { min-width: 0; overflow-x: auto; white-space: nowrap; padding: 0; border: 0; background: none; font: 500 14px var(--font-mono); color: var(--ink); }
.cmd-p { font: 600 14px var(--font-mono); color: var(--ok); }
.copy-btn {
  flex: none; padding: 5px 10px; cursor: pointer;
  font: 500 12px var(--font-mono); color: var(--muted);
  background: var(--sunk); border: 1px solid var(--line); border-radius: 6px;
}
.copy-btn:hover { color: var(--ink); border-color: var(--line-strong); }

/* ---------- components: code blocks (dark in both themes) ---------- */
.codeblock { position: relative; background: var(--term-bg); color: var(--term-fg); border: 1px solid var(--term-line); border-radius: var(--r-card); }
.codeblock pre { margin: 0; padding: 18px 20px; overflow-x: auto; font: 500 13.5px/1.65 var(--font-term); }
.codeblock .c { color: var(--term-dim); }
.codeblock .p { color: var(--term-ok); }
.codeblock .copy-btn { position: absolute; top: 10px; right: 10px; color: var(--term-fg); background: var(--term-raised); border-color: var(--term-line); }

/* ---------- components: terminal capture ---------- */
.tui-figure { display: grid; gap: 10px; margin: 0; min-width: 0; }
.tui {
  margin: 0; padding: 16px 18px; overflow-x: auto; tab-size: 8;
  background: var(--term-bg); color: var(--term-fg);
  border: 1px solid var(--term-line); border-radius: var(--r-frame); box-shadow: var(--evidence-shadow);
  font: 500 12.5px/1.5 var(--font-term);
}
.tui-figure figcaption, .shot-cap { margin: 0; font: 500 12px var(--font-mono); color: var(--muted); }

/* ---------- components: product screenshots ---------- */
.shot {
  position: relative; margin: 0; overflow: hidden; cursor: zoom-in;
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-frame); box-shadow: var(--evidence-shadow);
}
.shot img { display: block; width: 100%; height: auto; }
.shot .shot-light { display: none; }
[data-theme="light"] .shot .shot-light { display: block; }
[data-theme="light"] .shot .shot-dark { display: none; }
@media (prefers-color-scheme: light) {
  :root:not([data-theme]) .shot .shot-light { display: block; }
  :root:not([data-theme]) .shot .shot-dark { display: none; }
}
.band { width: 100%; max-width: calc(var(--wrap) + 2 * var(--gutter)); margin-inline: auto; padding: 24px var(--gutter) 0; }
.band + .shot-cap { max-width: calc(var(--wrap) + 2 * var(--gutter)); margin: 10px auto 0; padding-inline: var(--gutter); }
.shot-dialog { width: min(1600px, calc(100vw - 24px)); max-height: calc(100vh - 24px); padding: 0; background: var(--term-bg); border: 1px solid var(--term-line); border-radius: var(--r-frame); }
.shot-dialog::backdrop { background: rgba(8, 6, 12, 0.8); }
.shot-dialog-close {
  position: absolute; top: 10px; right: 10px; display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; cursor: pointer;
  font: 500 12px var(--font-mono); color: var(--term-fg); background: var(--term-raised); border: 1px solid var(--term-line); border-radius: var(--r-control);
}
.shot-dialog-img { display: block; width: 100%; height: auto; }

/* ---------- components: tables ---------- */
.compare-scroll { overflow-x: auto; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-card); }
.compare-scroll table { width: 100%; min-width: 640px; font-size: 15px; }
.compare-scroll th, .compare-scroll td { padding: 12px 16px; text-align: left; vertical-align: top; border-bottom: 1px solid var(--line); }
.compare-scroll tr:last-child > * { border-bottom: 0; }
.compare-scroll thead th { font: 600 12.5px var(--font-mono); color: var(--muted); background: var(--sunk); }
.compare-scroll thead th.srelens { color: var(--brand); }
.compare-scroll tbody th { position: sticky; left: 0; background: var(--surface); font: 500 13.5px var(--font-mono); color: var(--ink); white-space: nowrap; }
.compare-scroll td.yes::before { content: "✓ "; font-family: var(--font-mono); color: var(--ok); }
.compare-scroll td.no::before { content: "✕ "; font-family: var(--font-mono); color: var(--bad); }

/* ---------- components: meta chips ---------- */
.comparison-meta, .article-meta { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; }
.comparison-meta span, .article-meta span { padding: 3px 9px; font: 500 12px var(--font-mono); color: var(--muted); border: 1px solid var(--line); border-radius: 6px; }

/* ---------- components: final call to action ---------- */
.final {
  display: grid; gap: 16px; justify-items: start;
  padding-block: var(--section-y); padding-inline: max(var(--gutter), calc((100% - var(--wrap)) / 2));
  background: var(--surface); border-top: 1px solid var(--line);
}
.final > .wrap { display: grid; gap: 16px; justify-items: start; max-width: none; padding: 0; }
.final h2, .final .display { font-size: clamp(28px, 3.6vw, 44px); line-height: 1.1; letter-spacing: -0.04em; max-width: 22ch; }
.final p { margin: 0; color: var(--muted); max-width: 60ch; }

/* ---------- components: feature rows and permalinks ---------- */
.feature-rows { display: grid; gap: clamp(40px, 6vw, 72px); }
.feature-row { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: clamp(24px, 4vw, 56px); align-items: center; }
.feature-row .copy, .feature-narrative { display: grid; gap: 12px; align-content: center; }
.feature-row .copy p, .feature-narrative p { margin: 0; color: var(--muted); }
.fr-num, .feature-tag { margin: 0; font: 500 12.5px var(--font-mono); color: var(--brand); }
.feature-row h3 { font-size: clamp(18px, 1.8vw, 22px); line-height: 1.25; letter-spacing: -0.02em; }
.feature-bullets { display: grid; gap: 8px; margin: 4px 0 0; padding-left: 18px; color: var(--muted); font-size: 15.5px; }
.feature-bullets strong { color: var(--ink); font-weight: 600; }
.anchor-link { color: inherit; text-decoration: none; }
.anchor-icon, .heading-anchor { margin-left: 8px; font: 500 0.8em var(--font-mono); color: var(--brand); text-decoration: none; opacity: 0; }
.anchor-link:hover .anchor-icon, .anchor-link:focus-visible .anchor-icon,
h2:hover .heading-anchor, h3:hover .heading-anchor, .heading-anchor:focus-visible { opacity: 1; }
@media (max-width: 860px) { .feature-row { grid-template-columns: minmax(0, 1fr); } }
```

- [ ] **Step 2: Check the stylesheet parses**

Open `http://localhost:8080/site.css` in the preview browser and run in the console:
```js
[...document.styleSheets].length
```
Then load a scratch page: in DevTools console on any page, run
```js
const s = document.createElement('style'); s.textContent = await (await fetch('/site.css')).text(); document.head.append(s); s.sheet.cssRules.length
```
Expected: a number above 150 and no CSS parse warnings in the console.

- [ ] **Step 3: Run the full suite and commit**

Run: `node --test` → PASS (contrast test still passes).

```bash
git add site.css
git commit -m "feat(design): add shared component styles"
```

---

## Phase D — Pages

Every page task follows the same loop: add the pages to `MIGRATED` (and any page test) first, watch the shell test fail, apply the shell, fix the markup, add CSS, then verify in a browser.

**Browser check used by every page task.** Serve the repo (`npx --yes http-server . -p 8080 -c-1 --silent`), open each page with `?theme=light` and `?theme=dark` at widths 1440, 768 and 390, and run in the page:
```js
({ overflowX: document.documentElement.scrollWidth - innerWidth, h1: document.querySelectorAll('h1').length, missingImgs: [...document.images].filter(i => i.complete && !i.naturalWidth).map(i => i.src) })
```
Expected at every size: `overflowX: 0`, `h1: 1`, `missingImgs: []`, and no console errors. Look at each screenshot for overlapping, clipped or unreadable text before committing.

### Task 11: Homepage

**Files:**
- Create: `tests/home.test.mjs`
- Modify: `tests/shell.test.mjs` (`MIGRATED`), `index.html`, `site.css` (append home section), `main.js` (tabs helper, mode switch)

**Interfaces:**
- Consumes: `captureHtml('pods')` from `scripts/embed-captures.mjs`; verified keycaps from `docs/superpowers/plans/2026-10-02-tui-claims-check.md` (`## Decisions`).
- Produces: `bindTabs(tabs, panels, tabAttr, panelAttr) → show(name, focusTab)` inside `main.js`; mode switch markup contract `[data-modes]`, `[data-mode-tab]`, `[data-mode-panel]`.

- [ ] **Step 1: Write the failing test `tests/home.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read } from './lib/site.mjs';
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

test('the terminal panel embeds the real pods capture', () => {
  assert.ok(html.includes(`<!-- capture:pods:start -->${captureHtml('pods')}<!-- capture:pods:end -->`));
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
```

- [ ] **Step 2: Mark the page migrated and watch the tests fail**

In `tests/shell.test.mjs` set `const MIGRATED = new Set(['index.html']);`.
Run: `node --test`
Expected: FAIL in `home.test.mjs` (all) and `shell.test.mjs` (`index.html: uses the new shell`).

- [ ] **Step 3: Apply the shell**

Run: `node scripts/apply-shell.mjs index.html`
Expected: `shell applied: index.html`.

- [ ] **Step 4: Replace the hero**

Replace everything from `<section class="hero">` through the closing `</p>` of the `<p class="shot-cap" …>` line (the old hero, incident drill, `.band` screenshot and caption) with the block below. Move the `<div class="slo-strip incident-drill" …>…</div>` block you removed, unchanged, to just before the closing `</div>` of the `.wrap` in `<section class="section" id="workflow">` (after `</ol>` of `.loop-grid`). Keep the `<dialog class="tour-dialog" …>` that follows the hero where it is.

```html
    <section class="hero">
      <div class="wrap">
        <p class="hero-badge"><span class="dot"></span> open source · desktop GUI &amp; terminal TUI · built for engineers and AI agents</p>
        <h1 class="display">The Kubernetes <span class="accent">control room</span><br>for engineers and AI agents.</h1>
        <p class="lede">
          Investigate, analyse, and take safe action across Kubernetes clusters from a
          high-performance desktop workspace or an ultra-fast terminal UI (<code>srelens-tui</code>),
          built with a <strong>pure-Rust core</strong>. Backend capabilities are also available to AI agents through MCP.
        </p>
        <p class="hero-platforms"><b>Desktop GUI</b> · <b>Terminal UI (TUI)</b> · <b>macOS</b> · <b>Linux</b> · <b>Windows</b> · free and open source</p>

        <div class="modes" data-modes>
          <div class="mode-bar">
            <div class="mode-tabs" role="tablist" aria-label="Choose an app" hidden>
              <button id="mode-tab-desktop" type="button" role="tab" aria-selected="true" aria-controls="mode-desktop" data-mode-tab="desktop"><kbd>1</kbd> desktop</button>
              <button id="mode-tab-terminal" type="button" role="tab" aria-selected="false" aria-controls="mode-terminal" data-mode-tab="terminal" tabindex="-1"><kbd>2</kbd> terminal</button>
            </div>
            <a class="btn btn-ghost" href="https://github.com/srelens/srelens" rel="noopener">Star on GitHub</a>
          </div>

          <div class="mode-panel" id="mode-desktop" role="tabpanel" aria-labelledby="mode-tab-desktop" data-mode-panel="desktop">
            <p class="mode-label">desktop</p>
            <div class="hero-actions">
              <a class="btn btn-primary" href="/download/">Download <span data-version>v0.15.0</span></a>
            </div>
            <figure class="shot hero-shot tour-poster">
              <!-- keep the two existing <img> elements (shot-dark with fetchpriority="high", shot-light) and the tour-play button exactly as they were -->
            </figure>
            <p class="shot-cap">real screenshot · srelens connected to a 3-node kind cluster (1 control-plane + 2 workers) · <button class="text-action" type="button" data-tour-open>play walkthrough</button></p>
          </div>

          <div class="mode-panel" id="mode-terminal" role="tabpanel" aria-labelledby="mode-tab-terminal" data-mode-panel="terminal">
            <p class="mode-label">terminal</p>
            <div class="hero-actions">
              <div class="cmd"><span class="cmd-p" aria-hidden="true">$</span><code>brew install srelens/tap/srelens-tui</code><button class="copy-btn" type="button" data-copy="brew install srelens/tap/srelens-tui">copy</button></div>
              <a class="btn btn-ghost" href="/download/#tui">Terminal UI (srelens-tui)</a>
            </div>
            <figure class="tui-figure">
              <pre class="tui" tabindex="0" role="region" aria-label="srelens-tui pods view, text capture"><!-- capture:pods:start --><!-- capture:pods:end --></pre>
              <figcaption>text capture · srelens-tui v0.15.0 on the same cluster · select it</figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
```

Inside the `<figure class="shot hero-shot tour-poster">`, paste the original two `<img>` elements and the `<button class="tour-play" …>…</button>` from the removed `.band` block, unchanged, in place of the comment.

- [ ] **Step 5: Embed the capture and strip inline styles**

```bash
node scripts/embed-captures.mjs
node scripts/strip-styles.mjs index.html
```

Expected: `captures embedded: index.html`, `inline styles removed: index.html`.

- [ ] **Step 6: Add verified keycaps to the `#everything` cells**

For each cell listed under `## Decisions` → keycaps in `docs/superpowers/plans/2026-10-02-tui-claims-check.md`, insert a keys row as the first child of the `<article class="bento-cell">`. Example for the command palette cell, if verified:

```html
<p class="keys"><kbd>⌘K</kbd> desktop · tui <kbd>:</kbd></p>
```

Cells without a verified binding get no keys row.

- [ ] **Step 7: Append the home section to `site.css`**

```css
/* ---------- pages: home ---------- */
.hero { padding-block: clamp(48px, 7vw, 88px) clamp(40px, 6vw, 72px); }
.hero .wrap { display: grid; gap: 22px; }
.hero-badge { margin: 0; font: 500 12.5px/1.5 var(--font-mono); color: var(--muted); letter-spacing: 0.02em; }
.hero-badge .dot { display: inline-block; width: 7px; height: 7px; margin-right: 6px; border-radius: 50%; background: var(--ok); vertical-align: 1px; }
.hero h1 { max-width: 20ch; }
.hero-platforms { margin: 0; font: 500 12.5px var(--font-mono); color: var(--muted); }
.hero-platforms b { font-weight: 500; color: var(--ink); }

.modes { display: grid; gap: 20px; margin-top: 10px; }
.mode-bar { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--line); padding-bottom: 8px; }
.modes.is-enhanced .mode-bar { padding-bottom: 0; }
.mode-tabs { display: flex; gap: 2px; }
.mode-tabs button {
  display: inline-flex; align-items: center; gap: 9px; margin-bottom: -1px; padding: 10px 16px 11px; cursor: pointer;
  font: 500 14px var(--font-mono); color: var(--muted); background: none; border: 0; border-bottom: 2px solid transparent;
}
.mode-tabs button[aria-selected="true"] { color: var(--ink); border-bottom-color: var(--brand); }
.modes.is-enhanced .mode-bar .btn { margin-bottom: 8px; }
.mode-panel { display: grid; gap: 18px; min-width: 0; }
.mode-label { margin: 0; font: 600 12px var(--font-mono); color: var(--brand); }
.modes.is-enhanced .mode-label { display: none; }
@media (prefers-reduced-motion: no-preference) {
  .modes.is-enhanced .mode-panel { animation: mode-in 120ms ease-out; }
}
@keyframes mode-in { from { opacity: 0; } to { opacity: 1; } }

.tour-play {
  position: absolute; left: 16px; bottom: 16px; display: inline-flex; align-items: center; gap: 8px; padding: 9px 14px; cursor: pointer;
  font: 600 13px var(--font-mono); color: #ffffff; background: var(--overlay); border: 1px solid rgba(255, 255, 255, 0.14); border-radius: var(--r-control);
}
.tour-play span { font-weight: 500; opacity: 0.7; }
.tour-dialog { width: min(1100px, calc(100vw - 32px)); padding: 0; color: var(--ink); background: var(--surface); border: 1px solid var(--line); border-radius: var(--r-frame); }
.tour-dialog::backdrop { background: rgba(8, 6, 12, 0.72); }
.tour-dialog-head { display: flex; justify-content: space-between; gap: 16px; padding: 14px 18px; border-bottom: 1px solid var(--line); }
.tour-dialog-head p { margin: 0; font: 600 14px var(--font-mono); }
.tour-dialog-head span { font-size: 13px; color: var(--muted); }
.tour-close { display: grid; place-items: center; width: 34px; height: 34px; cursor: pointer; color: var(--muted); background: none; border: 1px solid var(--line); border-radius: var(--r-control); }
.tour-dialog video { display: block; width: 100%; background: #000000; }
.tour-sequence { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 0; padding: 12px 18px; list-style: none; counter-reset: step; font: 500 12px var(--font-mono); color: var(--muted); }
.tour-sequence li::before { counter-increment: step; content: counter(step) " "; color: var(--brand); }
.tour-fallback { margin: 0; padding: 0 18px 14px; font-size: 13px; }

.tech-strip { border-top: 1px solid var(--line); }
.tech-strip ul { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 32px; max-width: calc(var(--wrap) + 2 * var(--gutter)); margin: 0 auto; padding: 18px var(--gutter); list-style: none; font: 500 12px var(--font-mono); letter-spacing: 0.08em; color: var(--muted); }
.tech-strip b { font-weight: 500; }

.loop-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin: 0; padding: 0; list-style: none; }
.loop-step { display: grid; gap: 8px; align-content: start; }
.loop-step .num { font: 500 12px var(--font-mono); color: var(--muted); }
.loop-step .num b { font-weight: 600; color: var(--brand); }
.loop-step p { margin: 0; font-size: 15.5px; color: var(--muted); }

.incident-drill {
  max-width: 760px; margin-top: 32px; overflow: hidden;
  background: var(--term-bg); color: var(--term-fg); border: 1px solid var(--term-line); border-radius: var(--r-frame);
  box-shadow: var(--evidence-shadow); font-family: var(--font-term);
}
.slo-title { display: flex; justify-content: space-between; gap: 12px; padding: 10px 16px; font-size: 12px; color: var(--term-dim); border-bottom: 1px solid var(--term-line); }
.incident-live { display: inline-block; width: 7px; height: 7px; margin-right: 6px; border-radius: 50%; background: var(--term-bad); vertical-align: 1px; }
.incident-tabs { display: flex; border-bottom: 1px solid var(--term-line); }
.incident-tabs button { flex: 1; padding: 10px 12px; cursor: pointer; font: 500 13px var(--font-term); color: var(--term-dim); background: none; border: 0; border-bottom: 2px solid transparent; }
.incident-tabs button b { margin-right: 6px; font-weight: 500; color: var(--term-key); }
.incident-tabs button[aria-selected="true"] { color: var(--term-fg); border-bottom-color: var(--term-border); }
.incident-panel { display: grid; gap: 12px; padding: 18px 16px 16px; }
.incident-context { margin: 0; font-size: 12px; color: var(--term-dim); }
.incident-heading { display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px; }
.incident-heading strong { font-size: 16px; color: var(--term-fg); }
.incident-severity { font-size: 12px; color: var(--term-bad); }
.incident-ready { font-size: 12px; color: var(--term-ok); }
.incident-facts { display: flex; gap: 32px; margin: 0; }
.incident-facts dt { font-size: 11px; color: var(--term-dim); }
.incident-facts dd { margin: 0; font-size: 18px; color: var(--term-warn); }
.incident-log { display: grid; gap: 4px; margin: 0; font-size: 12px; color: var(--term-dim); }
.incident-log code { padding: 0; background: none; border: 0; color: var(--term-bad); }
.incident-guard { margin: 0; font-size: 13px; color: var(--term-fg); }
.incident-next { justify-self: start; padding: 8px 12px; cursor: pointer; font: 500 13px var(--font-term); color: var(--term-fg); background: var(--term-raised); border: 1px solid var(--term-line); border-radius: var(--r-control); }
.incident-next:hover { border-color: var(--term-border); }

.bento { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; }
.bento-cell { display: grid; gap: 8px; align-content: start; }
.kicker { font: 500 12px var(--font-mono); color: var(--brand); }
.bento-cell p { margin: 0; font-size: 15px; color: var(--muted); }
.bento-cell .keys { margin: 0; }

.guide-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 14px; }
.guide-card { display: grid; gap: 8px; align-content: start; color: var(--ink); text-decoration: none; }
.guide-card:hover { border-color: var(--line-strong); }
.guide-card span { font: 500 12px var(--font-mono); color: var(--brand); }
.guide-card h2, .guide-card h3 { font-size: 16px; }
.guide-card p { margin: 0; font-size: 15px; color: var(--muted); }
.guide-card b { font: 500 14px var(--font-mono); color: var(--brand); }

.dl-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 14px; }
.dl-card { display: grid; gap: 10px; align-content: start; }
.dl-card h3 { font-size: 17px; }
.dl-card > p { margin: 0; font: 500 12.5px var(--font-mono); color: var(--muted); }
.dl-links { display: grid; gap: 8px; margin-top: 6px; }
.dl-btn { justify-content: space-between; width: 100%; }
.dl-btn span { font-weight: 500; opacity: 0.75; }
.dl-note { margin: 18px 0 0; font-size: 14px; color: var(--muted); }
.get-grid { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: clamp(24px, 4vw, 48px); align-items: start; }
.get-note { margin: 0; color: var(--muted); }
* + .get-grid { margin-top: 48px; }

.faq-list { display: grid; border-top: 1px solid var(--line); }
.faq-list details { border-bottom: 1px solid var(--line); }
.faq-list summary { display: flex; justify-content: space-between; gap: 16px; padding: 18px 0; cursor: pointer; list-style: none; font: 600 16px/1.4 var(--font-mono); color: var(--ink); }
.faq-list summary::-webkit-details-marker { display: none; }
.faq-list summary::after { content: "+"; flex: none; color: var(--brand); }
.faq-list details[open] summary::after { content: "−"; }
.faq-a { max-width: var(--measure); padding: 0 0 20px; color: var(--muted); }

@media (max-width: 1100px) { .bento { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 860px) {
  .loop-grid, .get-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 560px) { .bento { grid-template-columns: minmax(0, 1fr); } }
```

- [ ] **Step 8: Add the tabs helper and mode switch to `main.js`**

Replace the whole `/* ---------- interactive incident drill ---------- */` block (from `var incidentTabs = …` through the `[data-incident-next]` forEach) with:

```js
  /* ---------- tabs: incident drill and homepage desktop / terminal switch ---------- */
  function bindTabs(tabs, panels, tabAttr, panelAttr) {
    function show(name, focusTab) {
      tabs.forEach(function (tab) {
        var selected = tab.getAttribute(tabAttr) === name;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
        if (selected && focusTab) tab.focus();
      });
      panels.forEach(function (panel) {
        panel.hidden = panel.getAttribute(panelAttr) !== name;
      });
    }
    tabs.forEach(function (tab, index) {
      tab.addEventListener("click", function () { show(tab.getAttribute(tabAttr), false); });
      tab.addEventListener("keydown", function (event) {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        var next = (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
        show(tabs[next].getAttribute(tabAttr), true);
      });
    });
    return show;
  }

  var showIncidentStep = bindTabs(
    Array.from(document.querySelectorAll("[data-incident-tab]")),
    Array.from(document.querySelectorAll("[data-incident-panel]")),
    "data-incident-tab", "data-incident-panel"
  );
  document.querySelectorAll("[data-incident-next]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      showIncidentStep(btn.getAttribute("data-incident-next"), false);
    });
  });

  var modes = document.querySelector("[data-modes]");
  if (modes) {
    var showMode = bindTabs(
      Array.from(modes.querySelectorAll("[data-mode-tab]")),
      Array.from(modes.querySelectorAll("[data-mode-panel]")),
      "data-mode-tab", "data-mode-panel"
    );
    modes.querySelector("[role='tablist']").hidden = false;
    modes.classList.add("is-enhanced");
    showMode("desktop", false);
    document.addEventListener("keydown", function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      var el = document.activeElement;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (event.key === "1") showMode("desktop", false);
      if (event.key === "2") showMode("terminal", false);
    });
  }
```

- [ ] **Step 9: Run the full suite**

Run: `node --test`
Expected: PASS. If `seo.test.mjs` reports a lost link or `copy.test.mjs` a lost id/heading, the hero edit dropped something: restore it.

- [ ] **Step 10: Browser check**

Run the page-task browser check on `/`. Also run in the console, after load:
```js
const tabs = [...document.querySelectorAll('[data-mode-tab]')];
const panel = (m) => document.getElementById('mode-' + m).hidden;
const before = [panel('desktop'), panel('terminal')];
document.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
const afterKey = [panel('desktop'), panel('terminal'), tabs[1].getAttribute('aria-selected')];
tabs[0].click();
({ before, afterKey, afterClick: [panel('desktop'), panel('terminal')], tablistVisible: !document.querySelector('.mode-tabs').hidden })
```
Expected: `before: [false, true]`, `afterKey: [true, false, "true"]`, `afterClick: [false, true]`, `tablistVisible: true`. Then disable JavaScript (DevTools → Settings → Debugger → Disable JavaScript), reload, and confirm both panels and their `desktop` / `terminal` labels show with no tab bar. Confirm the incident drill tabs still switch, and that the capture text can be selected.

- [ ] **Step 11: Commit**

```bash
git add index.html site.css main.js tests/home.test.mjs tests/shell.test.mjs
git commit -m "feat(home): terminal-native homepage with desktop/terminal switch and real TUI capture"
```

---

### Task 12: `/tui/`

**Files:**
- Create: `tests/tui.test.mjs`
- Modify: `tests/shell.test.mjs` (`MIGRATED`), `tests/copy.test.mjs` (only rows decided in Task 7), `tui/index.html`, `site.css` (append tui section)

**Interfaces:**
- Consumes: Task 7 `## Decisions`; `captureHtml('pods')`.
- Produces: `.keymap-grid` / `.keymap` and `.stat-grid` / `.stat` components.

- [ ] **Step 1: Write the failing test `tests/tui.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read } from './lib/site.mjs';
import { captureHtml } from '../scripts/embed-captures.mjs';

const html = read('tui/index.html');

test('the hero shows the real capture and the install command', () => {
  const hero = html.slice(html.indexOf('<section class="page-hero">'), html.indexOf('</section>', html.indexOf('<section class="page-hero">')));
  assert.ok(hero.includes(`<!-- capture:pods:start -->${captureHtml('pods')}<!-- capture:pods:end -->`));
  assert.ok(hero.includes('data-copy="brew install srelens/tap/srelens-tui"'));
});

test('keybindings are keymap tables with <kbd> keys', () => {
  const section = html.slice(html.indexOf('id="keybindings"'));
  const grid = section.slice(0, section.indexOf('</section>'));
  assert.match(grid, /<div class="keymap-grid">/);
  assert.ok((grid.match(/<div class="keymap">/g) ?? []).length >= 2);
  assert.doesNotMatch(grid, /<td><code>/, 'keys use <kbd>, not <code>');
});

test('no stat or claim survives that Task 7 marked for removal', () => {
  // Fill from docs/superpowers/plans/2026-10-02-tui-claims-check.md "## Decisions" (remove rows).
  const REMOVED = [];
  for (const claim of REMOVED) assert.ok(!html.includes(claim), claim);
});
```

Before running, fill `REMOVED` with the exact strings of every claim marked `remove` in Task 7's `## Decisions` (for example `'&lt;25MB'`). If a removed claim was a heading or had an id, add it to `REMOVED_HEADINGS` / `REMOVED_IDS` in `tests/copy.test.mjs` under `'tui/index.html'`.

- [ ] **Step 2: Mark the page migrated and watch the tests fail**

Add `'tui/index.html'` to `MIGRATED` in `tests/shell.test.mjs`.
Run: `node --test` → FAIL in `tui.test.mjs` and the `tui/index.html` shell test.

- [ ] **Step 3: Apply the shell**

Run: `node scripts/apply-shell.mjs tui/index.html`

- [ ] **Step 4: Rebuild the hero**

Inside `<section class="page-hero">`, keep the path line, `hero-badge`, H1 and lede as they are. Replace the hero's `.hero-actions` div and the whole `.get-grid` block after it with:

```html
        <div class="hero-actions">
          <div class="cmd"><span class="cmd-p" aria-hidden="true">$</span><code>brew install srelens/tap/srelens-tui</code><button class="copy-btn" type="button" data-copy="brew install srelens/tap/srelens-tui">copy</button></div>
          <a class="btn btn-primary" href="/download/#tui">Install srelens-tui</a>
          <a class="btn btn-ghost" href="/docs/tui/">Read Documentation</a>
          <a class="btn btn-ghost" href="https://github.com/srelens/srelens" rel="noopener">Star on GitHub</a>
        </div>
        <p class="get-note">Available on macOS (Apple Silicon &amp; Intel), Linux (x86_64 &amp; ARM64), and Windows. Updates in-place with <code>srelens-tui update</code>.</p>
        <div class="codeblock">
          <button class="copy-btn" type="button" data-copy="curl -fsSL https://srelens.com/install.sh | bash">copy</button>
<pre><span class="c"># or standalone shell script</span>
<span class="p">$</span> curl -fsSL https://srelens.com/install.sh | bash
<span class="c"># launch immediately</span>
<span class="p">$</span> srelens-tui</pre>
        </div>
        <figure class="tui-figure">
          <pre class="tui" tabindex="0" role="region" aria-label="srelens-tui pods view, text capture"><!-- capture:pods:start --><!-- capture:pods:end --></pre>
          <figcaption>text capture · srelens-tui v0.15.0 on the srelens-demo kind cluster · select it</figcaption>
        </figure>
```

This keeps the "One-Line Install" eyebrow's install facts but drops its `h2` ("Install via Homebrew or Shell Script") **only if** Task 7 or Devesh approves; otherwise keep that `h2` and eyebrow above the `.cmd` row, as `<h2>Install via Homebrew or Shell Script</h2>`. The copy test enforces whichever is recorded.

Keep the existing `.band` + `tui-banner.webp` figure after the hero section unchanged.

- [ ] **Step 5: Convert the stats strip**

Apply the Task 7 decisions for each of the four stat cards. For each card that stays, use:

```html
<article class="stat"><p class="stat-value">100%</p><h3>Pure Rust Core</h3><p>Built with Ratatui &amp; kube-rs. No Node, no webviews.</p></article>
```

inside `<div class="stat-grid">…</div>` (replacing `<div class="dl-grid" style=…>`). Copy each card's value, heading and sentence exactly, or the replacement text from `## Decisions`. Remove cards marked `remove`. If no card remains, remove the whole stats `<section>`.

- [ ] **Step 6: Convert the keybindings tables**

In `<section class="section" id="keybindings">`, replace `<div class="shot-grid" style=…>` with `<div class="keymap-grid">`, each `<div class="dl-card" style=…>` with `<div class="keymap">`, each styled `<h3 style=…>` with a plain `<h3>`, each `<table style=…>` with `<table>`, and drop `style` from every `<tr>`/`<td>`. In each key cell, change `<code>` to `<kbd>` (one `<kbd>` per key; `Shift + D` becomes `<kbd>Shift</kbd> + <kbd>D</kbd>`). Apply the Task 7 decisions: fix `wrong key` rows to the verified key, remove `not in v0.15.0` rows.

- [ ] **Step 7: Convert the remaining inline-styled blocks**

For every other element with `style=…` on the page: feature rows (`<div class="feature-row" id=… style=…>`) lose the style; the MCP feature's wrapper `<div style=…>` around two figures becomes `<div class="shot-stack">`; the compare section's inline-styled table becomes `<div class="compare-scroll"><table>…</table></div>` with `<th scope="col">` headers and `<th scope="row">` first cells; the download section's inline-styled cards become `.dl-grid` / `.dl-card` / `.dl-links` / `.dl-btn` as on `/download/`. Keep every text node, link, id and `data-*` attribute. Then run:

```bash
node scripts/strip-styles.mjs tui/index.html
node scripts/embed-captures.mjs
```

- [ ] **Step 8: Apply claim decisions in body copy**

Apply every `reword` / `remove` decision from Task 7 that concerns `tui/index.html` text (feature bullets, lede, badge), using the exact replacement text recorded there.

- [ ] **Step 9: Append the tui section to `site.css`**

```css
/* ---------- pages: tui ---------- */
.page-hero .tui-figure { width: 100%; margin-top: 12px; }
.page-hero .codeblock { width: 100%; max-width: 640px; }
.stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.stat { display: grid; gap: 6px; align-content: start; }
.stat-value { margin: 0; font: 600 clamp(26px, 3vw, 36px)/1 var(--font-mono); letter-spacing: -0.04em; color: var(--ink); }
.stat h3 { font-size: 14px; }
.stat p { margin: 0; font-size: 14px; color: var(--muted); }
.shot-stack { display: grid; gap: 14px; }
.keymap-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.keymap h3 { margin-bottom: 10px; font-size: 15px; color: var(--brand); }
.keymap table { width: 100%; font-size: 14.5px; }
.keymap td { padding: 7px 0; vertical-align: top; border-bottom: 1px solid var(--line); }
.keymap tr:last-child td { border-bottom: 0; }
.keymap td:first-child { width: 36%; padding-right: 12px; white-space: nowrap; }
@media (max-width: 860px) { .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 760px) { .keymap-grid { grid-template-columns: minmax(0, 1fr); } }
```

- [ ] **Step 10: Run the full suite, browser check, commit**

Run: `node --test` → PASS. Run the page-task browser check on `/tui/` and confirm every `#anchor-link` heading still copies its URL.

```bash
git add tui/index.html site.css tests/tui.test.mjs tests/shell.test.mjs tests/copy.test.mjs
git commit -m "feat(tui): rebuild /tui/ on the design system with a real capture and verified keymap"
```

---

### Task 13: `/features/`, `/mcp/`, `/download/`

**Files:**
- Modify: `tests/shell.test.mjs` (`MIGRATED`), `features/index.html`, `mcp/index.html`, `download/index.html`, `site.css` (append section)

- [ ] **Step 1: Mark migrated, watch fail**

Add `'features/index.html', 'mcp/index.html', 'download/index.html'` to `MIGRATED`. Run `node --test` → FAIL for those three.

- [ ] **Step 2: Apply the shell and strip inline styles**

```bash
node scripts/apply-shell.mjs features/index.html mcp/index.html download/index.html
node scripts/strip-styles.mjs features/index.html mcp/index.html download/index.html
```

- [ ] **Step 3: Fix the two structural spots the inline styles carried**

- `mcp/index.html`: the `<div class="compare-grid">` now relies on CSS for its grid (Step 4). The `<div class="hero-actions">` loses `justify-content:flex-start`, which is already the default.
- `download/index.html`: the `<h2>` that had an inline font-size inside `.get-grid` stays a plain `<h2>`.

- [ ] **Step 4: Append the section to `site.css`**

```css
/* ---------- pages: features, mcp, download ---------- */
.compare-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: 16px; margin-top: 28px; }
.compare-grid .codeblock { margin-top: 12px; }
.compare-grid .verdict h3 { margin-bottom: 8px; font-size: 16px; }
.compare-grid .verdict p { margin: 0; color: var(--muted); font-size: 15px; }
.mini { overflow: hidden; background: var(--term-bg); color: var(--term-fg); border: 1px solid var(--term-line); border-radius: var(--r-frame); box-shadow: var(--evidence-shadow); }
.mini-bar { padding: 9px 14px; font: 500 12px var(--font-term); color: var(--term-dim); border-bottom: 1px solid var(--term-line); }
.mini-body pre { margin: 0; padding: 16px; overflow-x: auto; font: 500 13px/1.6 var(--font-term); }
.tk-dir, .tk-key { color: var(--term-key); }
.tk-method { color: var(--term-brand); }
.tk-dim { color: var(--term-dim); }
.tk-str, .tk-ok { color: var(--term-ok); }
.tk-num { color: var(--term-warn); }
.answer { display: grid; gap: 8px; }
.answer h2 { font-size: 17px; }
.answer p { margin: 0; color: var(--muted); }
.answer + .answer { margin-top: 12px; }
```

- [ ] **Step 5: Run the full suite, browser check, commit**

Run: `node --test` → PASS. Browser check on all three pages; on `/download/` confirm the `[data-asset]` buttons still rewrite to GitHub release URLs (inspect one `href` after load) and the `#tui` anchor scrolls below the sticky header.

```bash
git add features/index.html mcp/index.html download/index.html site.css tests/shell.test.mjs
git commit -m "feat(pages): move features, mcp and download to the design system"
```

---

### Task 14: `/compare/` hub and the six comparison guides

**Files:**
- Modify: `tests/shell.test.mjs` (`MIGRATED`), `compare/index.html`, `compare/{lens,headlamp,k9s,freelens,aptakube,kubernetes-dashboard}/index.html`, `site.css`

- [ ] **Step 1: Mark migrated, watch fail**

Add the 7 compare files to `MIGRATED`. Run `node --test` → FAIL for those 7.

- [ ] **Step 2: Apply the shell and strip inline styles**

```bash
F="compare/index.html compare/lens/index.html compare/headlamp/index.html compare/k9s/index.html compare/freelens/index.html compare/aptakube/index.html compare/kubernetes-dashboard/index.html"
node scripts/apply-shell.mjs $F
node scripts/strip-styles.mjs $F
```

- [ ] **Step 3: Append the compare section to `site.css`**

```css
/* ---------- pages: compare ---------- */
.verdict-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-bottom: 32px; }
.verdict h2, .verdict h3 { margin-bottom: 10px; font-size: 17px; }
.verdict ul { display: grid; gap: 6px; margin: 0; padding-left: 18px; color: var(--muted); font-size: 15.5px; }
.verdict.srelens-pick { border-color: color-mix(in srgb, var(--brand) 45%, var(--line)); }
.verdict.srelens-pick h2 { color: var(--brand); }
.compare-scroll + .answer, .compare-scroll + h2 { margin-top: 32px; }
.source-note { margin: 24px 0 0; font-size: 14px; color: var(--muted); }
.related-comparisons { display: flex; flex-wrap: wrap; gap: 8px 20px; margin-top: 16px; font: 500 13.5px var(--font-mono); }
.related-comparisons a { text-decoration: none; }
.compare-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 14px; }
.compare-card { display: grid; gap: 8px; align-content: start; color: var(--ink); text-decoration: none; }
.compare-card:hover { border-color: var(--line-strong); }
.tool-type { font: 500 12px var(--font-mono); color: var(--brand); }
.compare-card h2 { font-size: 17px; }
.compare-card p { margin: 0; font-size: 15px; color: var(--muted); }
.card-link { font: 500 13px var(--font-mono); color: var(--brand); }
@media (max-width: 760px) { .verdict-grid { grid-template-columns: minmax(0, 1fr); } }
```

- [ ] **Step 4: Run the full suite, browser check, commit**

Run: `node --test` → PASS. Browser check on the hub and on `compare/kubernetes-dashboard/` (the widest table) at 390px: the table scrolls inside `.compare-scroll`, the first column stays visible, the page body does not scroll sideways.

```bash
git add compare site.css tests/shell.test.mjs
git commit -m "feat(compare): move the comparison hub and guides to the design system"
```

---

### Task 15: Long-form pages (docs, guides, security, architecture)

**Files:**
- Modify: `tests/shell.test.mjs` (`MIGRATED`), `docs/index.html`, `docs/tui/index.html`, `docs/tui.html` (mirror), `guides/index.html`, `guides/{crashloopbackoff,oomkilled,failed-deployment}/index.html`, `security/index.html`, `architecture/index.html`, `site.css`

- [ ] **Step 1: Mark migrated, watch fail**

Add the 10 files (including `docs/tui.html`) to `MIGRATED`. Run `node --test` → FAIL for those 10.

- [ ] **Step 2: Apply the shell and strip inline styles**

```bash
F="docs/index.html docs/tui/index.html guides/index.html guides/crashloopbackoff/index.html guides/oomkilled/index.html guides/failed-deployment/index.html security/index.html architecture/index.html"
node scripts/apply-shell.mjs $F
node scripts/strip-styles.mjs $F
cp docs/tui/index.html docs/tui.html
```

- [ ] **Step 3: Append the long-form section to `site.css`**

```css
/* ---------- pages: long-form (docs, guides, security, architecture) ---------- */
.content-shell { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: clamp(24px, 4vw, 56px); align-items: start; }
.content-nav {
  position: sticky; top: calc(var(--header-h) + 24px); max-height: calc(100vh - var(--header-h) - 48px); overflow-y: auto;
  font: 500 13px var(--font-mono);
}
.content-nav strong { display: block; margin-bottom: 10px; font-weight: 600; color: var(--ink); }
.content-nav ul { display: grid; gap: 2px; margin: 0; padding: 0; list-style: none; }
.content-nav a { display: block; padding: 5px 10px; color: var(--muted); text-decoration: none; border-left: 2px solid var(--line); }
.content-nav a:hover { color: var(--ink); }
.content-nav a.active { color: var(--brand); border-left-color: var(--brand); }
.prose { max-width: var(--measure); min-width: 0; }
.prose h2 { margin: 48px 0 14px; font-size: clamp(22px, 2.2vw, 28px); }
.prose h2:first-child { margin-top: 0; }
.prose h3 { margin: 32px 0 10px; font-size: 17px; }
.prose p, .prose ul, .prose ol, .prose table, .prose .codeblock, .prose .shot { margin: 0 0 18px; }
.prose ul, .prose ol { display: grid; gap: 6px; padding-left: 22px; }
.prose li > ul, .prose li > ol { margin: 6px 0 0; }
.prose ol > li::marker { font-family: var(--font-mono); color: var(--brand); }
.prose table { display: block; width: 100%; overflow-x: auto; font-size: 15px; }
.prose th, .prose td { padding: 9px 12px; text-align: left; vertical-align: top; border-bottom: 1px solid var(--line); }
.prose th { font: 600 12.5px var(--font-mono); color: var(--muted); }
.prose .shot { margin-block: 24px; }
.operator-callout { display: grid; gap: 6px; margin: 0 0 24px; }
.operator-callout strong { font: 600 14px var(--font-mono); color: var(--brand); }
.operator-callout p { margin: 0; color: var(--muted); }
.page-hero + .section .operator-callout:first-child { margin-top: 0; }
.architecture-plate { margin: 0 0 28px; padding: 20px; background: var(--term-bg); color: var(--term-fg); border: 1px solid var(--term-line); border-radius: var(--r-frame); font-family: var(--font-term); }
.architecture-flow { display: grid; gap: 10px; }
.architecture-node { display: grid; gap: 4px; padding: 12px 14px; background: var(--term-raised); border: 1px solid var(--term-line); border-radius: var(--r-control); }
.architecture-node strong { font-size: 14px; color: var(--term-fg); }
.architecture-node span { font-size: 12px; color: var(--term-dim); }
.architecture-arrow { font-size: 11.5px; letter-spacing: 0.06em; text-align: center; color: var(--term-key); }
.architecture-split { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
@media (max-width: 900px) {
  .content-shell { grid-template-columns: minmax(0, 1fr); }
  .content-nav { position: static; max-height: none; }
}
@media (max-width: 640px) { .architecture-split { grid-template-columns: minmax(0, 1fr); } }
```

- [ ] **Step 4: Run the full suite, browser check, commit**

Run: `node --test` → PASS (includes the `docs/tui.html` mirror test). Browser check on `/docs/tui/`: scroll through, confirm the TOC scrollspy highlights the current section and the TOC fits the viewport at 1440×900. Check `/guides/oomkilled/` numbered steps and `/architecture/` plate at 390px.

```bash
git add docs/index.html docs/tui/index.html docs/tui.html guides security architecture site.css tests/shell.test.mjs
git commit -m "feat(docs): move docs, guides, security and architecture to the long-form layout"
```

---

### Task 16: `/faq/` and the 404 page

**Files:**
- Create: `tests/notfound.test.mjs`
- Modify: `tests/shell.test.mjs` (`MIGRATED` — now all pages), `faq/index.html`, `404.html`, `main.js`, `site.css`

- [ ] **Step 1: Write the failing test `tests/notfound.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, meta } from './lib/site.mjs';

const html = read('404.html');

test('404 stays out of the index', () => assert.equal(meta(html, 'robots'), 'noindex'));

test('404 shows the requested path in a terminal line, with a static fallback', () => {
  assert.match(html, /<pre class="err-term"><span class="cmd-p">\$<\/span> curl -I https:\/\/srelens\.com<span data-err-path>\/missing-page<\/span>\n<span class="err-status">HTTP\/2 404<\/span><\/pre>/);
});

test('404 keeps its copy and links back into the site', () => {
  assert.ok(html.includes('Pod not found in this namespace.'));
  for (const href of ['/', '/features/', '/tui/', '/docs/', '/download/']) assert.ok(html.includes(`href="${href}"`), href);
});
```

- [ ] **Step 2: Mark the last pages migrated, watch fail**

Add `'faq/index.html', '404.html'` to `MIGRATED`. Run `node --test` → FAIL in `notfound.test.mjs` and the two shell tests. "every page is migrated" is no longer TODO and must pass by the end of this task.

- [ ] **Step 3: Apply the shell and strip inline styles**

```bash
node scripts/apply-shell.mjs faq/index.html 404.html
node scripts/strip-styles.mjs faq/index.html 404.html
```

- [ ] **Step 4: Rewrite the 404 body**

Replace the `<main …>…</main>` of `404.html` with:

```html
  <main id="main" class="err-page">
    <div class="wrap err-shell">
      <pre class="err-term"><span class="cmd-p">$</span> curl -I https://srelens.com<span data-err-path>/missing-page</span>
<span class="err-status">HTTP/2 404</span></pre>
      <div class="err-code">404</div>
      <h1>Pod not found in this namespace.</h1>
      <p><code>kubectl get page /you-were-looking-for</code> returned nothing — the page may have been evicted.</p>
      <a class="btn btn-primary" href="/">Back to the control room</a>
      <nav class="err-links" aria-label="Main pages"><a href="/features/">/features</a><a href="/tui/">/tui</a><a href="/mcp/">/mcp</a><a href="/compare/">/compare</a><a href="/docs/">/docs</a><a href="/download/">/download</a><a href="/faq/">/faq</a></nav>
    </div>
  </main>
```

- [ ] **Step 5: Fill the path in `main.js`**

Add after the footer-year block at the top of the IIFE:

```js
  /* ---------- 404: show the requested path ---------- */
  var errPath = document.querySelector("[data-err-path]");
  if (errPath) errPath.textContent = window.location.pathname;
```

- [ ] **Step 6: Append the section to `site.css`**

```css
/* ---------- pages: 404 ---------- */
.err-page { padding-block: clamp(56px, 10vw, 120px); }
.err-shell { display: grid; gap: 18px; justify-items: start; }
.err-term { max-width: 100%; margin: 0; padding: 14px 18px; overflow-x: auto; background: var(--term-bg); color: var(--term-fg); border: 1px solid var(--term-line); border-radius: var(--r-card); font: 500 13.5px/1.6 var(--font-term); }
.err-term .cmd-p { color: var(--term-ok); }
.err-status { color: var(--term-bad); }
.err-code { font: 700 clamp(64px, 12vw, 120px)/1 var(--font-mono); letter-spacing: -0.06em; color: var(--line-strong); }
.err-links { display: flex; flex-wrap: wrap; gap: 6px 18px; font: 500 13.5px var(--font-mono); }
.err-links a { text-decoration: none; }
```

- [ ] **Step 7: Run the full suite, browser check, commit**

Run: `node --test` → PASS, and the "every page is migrated" test now runs and passes. Browser check on `/faq/` (details open/close, `FAQPage` answers unchanged) and on `http://localhost:8080/404.html` plus a missing URL such as `http://localhost:8080/no-such-page/` (http-server serves `404.html` for misses): the terminal line shows the requested path.

```bash
git add faq/index.html 404.html main.js site.css tests/notfound.test.mjs tests/shell.test.mjs
git commit -m "feat(pages): move faq and the 404 page to the design system"
```

---

## Phase E — Fresh product evidence (spec 7.4)

All desktop screenshots and TUI captures are retaken from srelens **v0.15.0**. Safety rules for this phase:

- **Never run the native desktop app on this machine.** Its vault master key lives in Windows Credential Manager (`keyring`, `apps/desktop/src-tauri/src/vault.rs` at the tag) and its settings path is hard-coded to `%APPDATA%\app.srelens.desktop`, which holds Devesh's real profile. A dev build would share both. Desktop views are captured in **web mode** instead: `srelens-server` from the worktree serves the same React UI with an isolated data dir and a dev login.
- **Upload only the srelens-demo kubeconfig** to the web-mode server, never `~/.kube/config`.
- **Never enter API keys or passwords.** The AI assistant views keep their existing images.
- **Nothing in the srelens repo is committed.** The worktree is removed in Task 25.
- The tag's source still says `0.14.0` in its version files (the release workflow bumps the version when it builds). Do not capture About/Updates screens. TUI captures use the published v0.15.0 binary, which is the release workflow's build of this tag.

### Task 17: srelens worktree at v0.15.0 and the web-mode build

**Files:** none in this repo. Creates the worktree `C:/Users/vrshu/work/srelens/srelens/.claude/worktrees/site-evidence-v0.15.0`.

- [ ] **Step 1: Create the worktree, detached at the tag**

```bash
SRELENS=/c/Users/vrshu/work/srelens/srelens
WT=$SRELENS/.claude/worktrees/site-evidence-v0.15.0
git -C "$SRELENS" fetch origin --tags
git -C "$SRELENS" worktree add --detach "$WT" srelens-v0.15.0
git -C "$WT" log -1 --format='%h %s'
```

Expected: `df6614d0 Merge pull request #645 from srelens/dev`.

- [ ] **Step 2: Carry the local agent files and follow them** (global rule "Worktrees carry the local agent files")

```bash
cp "$SRELENS/CLAUDE.local.md" "$WT/"
[ -f "$SRELENS/.claude/settings.local.json" ] && mkdir -p "$WT/.claude" && cp "$SRELENS/.claude/settings.local.json" "$WT/.claude/"
cd "$WT" && gitnexus analyze . --index-only --name srelens-site-evidence --force && gitnexus list | grep site-evidence
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3111/agentmemory/livez
```

Expected: the alias `srelens-site-evidence` is listed; livez prints `200`. Then recall with the agentmemory `memory_smart_search` tool for "srelens web mode screenshots srelens-demo". If agentmemory is down, follow the fix in `CLAUDE.local.md` before continuing. Nothing in this phase edits srelens code, so `gitnexus impact` / `detect-changes` are not needed.

- [ ] **Step 3: Install and build the frontend**

```bash
cd "$WT"
grep '"packageManager"' package.json
npx --yes pnpm@11.24.0 install --frozen-lockfile
npx --yes pnpm@11.24.0 --filter @srelens/desktop build
ls apps/desktop/dist/index.html
```

Use the pnpm version printed by the `packageManager` line if it differs from 11.24.0. Do not run `corepack enable` (it changes the global Node install).

- [ ] **Step 4: Build the web-mode server**

```bash
cd "$WT" && cargo build -p srelens-server --bin srelens-server
ls target/debug/srelens-server.exe
```

The frontend must be built first: `crates/server/build.rs` may embed `apps/desktop/dist`.

- [ ] **Step 5: Smoke-test web mode with an isolated data dir**

```bash
D="$(cygpath -w "$TEMP")\\srelens-site-smoke"; mkdir -p "$(cygpath -u "$D")"
SRELENS_DEV_LOGIN=site-shots@localhost SRELENS_MASTER_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") SRELENS_PUBLIC_URL=http://127.0.0.1:8791 \
  "$WT/target/debug/srelens-server.exe" serve 127.0.0.1:8791 --data "$D" &
sleep 5; curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8791/healthz; kill %1; rm -rf "$(cygpath -u "$D")"
```

Expected: `200`. No commit (this repo is unchanged).

---

### Task 18: Extend srelens-demo for Helm, Argo CD and BGP

**Files:**
- Create: `scripts/demo/extras.sh`, `scripts/demo/extras/argo-app.yaml`, `scripts/demo/extras/metallb.yaml.tmpl`, `scripts/demo/extras/frr/daemons`

The GPU node (kwok) is added only during the TUI GPU capture in Task 21, so desktop screenshots keep showing the documented 3-node cluster.

- [ ] **Step 1: Write `scripts/demo/extras/argo-app.yaml`**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata: { name: guestbook, namespace: argocd }
spec:
  project: default
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps
    targetRevision: HEAD
    path: guestbook
  destination: { server: https://kubernetes.default.svc, namespace: guestbook }
  syncPolicy:
    automated: { prune: true, selfHeal: true }
    syncOptions: [CreateNamespace=true]
```

- [ ] **Step 2: Write `scripts/demo/extras/metallb.yaml.tmpl`**

`@FRR_IP@`, `@POOL@` are filled by `extras.sh`.

```yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata: { name: demo-pool, namespace: metallb-system }
spec: { addresses: ["@POOL@"] }
---
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata: { name: edge-router, namespace: metallb-system }
spec: { myASN: 64513, peerASN: 64512, peerAddress: "@FRR_IP@" }
---
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata: { name: demo-adv, namespace: metallb-system }
spec: { ipAddressPools: [demo-pool] }
---
apiVersion: v1
kind: Service
metadata: { name: payments-api-lb, namespace: payments }
spec:
  type: LoadBalancer
  selector: { app: payments-api }
  ports: [{ port: 80, targetPort: 80 }]
```

- [ ] **Step 3: Write `scripts/demo/extras/frr/daemons`**

```
bgpd=yes
ospfd=no
ospf6d=no
ripd=no
ripngd=no
isisd=no
pimd=no
ldpd=no
nhrpd=no
eigrpd=no
babeld=no
sharpd=no
pbrd=no
bfdd=no
fabricd=no
vrrpd=no
pathd=no
vtysh_enable=yes
zebra_options="  -A 127.0.0.1 -s 90000000"
bgpd_options="   -A 127.0.0.1"
```

- [ ] **Step 4: Write `scripts/demo/extras.sh`**

```bash
#!/usr/bin/env bash
# Add a Helm release with history, Argo CD with an Application, and MetalLB in BGP mode
# peering with an FRR router container, to the srelens-demo kind cluster.
#   bash scripts/demo/extras.sh   (from the repo root; needs kind, kubectl, docker)
set -euo pipefail
K="kubectl --context kind-srelens-demo"
CAP=.superpowers/capture
mkdir -p "$CAP"
kind get kubeconfig --name srelens-demo --internal > "$CAP/kubeconfig"
HOSTDIR="$(pwd -W 2>/dev/null || pwd)"
helm() { MSYS_NO_PATHCONV=1 docker run --rm --network kind -v "$HOSTDIR/$CAP:/work" -e KUBECONFIG=/work/kubeconfig alpine/helm:3.16.2 "$@"; }

# Helm: one release, two revisions
helm upgrade --install podinfo oci://ghcr.io/stefanprodan/charts/podinfo --version 6.7.1 -n checkout --create-namespace --set replicaCount=1
helm upgrade podinfo oci://ghcr.io/stefanprodan/charts/podinfo --version 6.7.1 -n checkout --set replicaCount=2 --set ui.message="srelens demo"

# Argo CD + guestbook
$K create namespace argocd --dry-run=client -o yaml | $K apply -f -
$K apply -n argocd --server-side -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.13.2/manifests/install.yaml
$K -n argocd rollout status deploy/argocd-repo-server --timeout=300s
$K apply -f scripts/demo/extras/argo-app.yaml

# BGP: FRR router on the kind network, MetalLB peering with it
docker rm -f srelens-demo-frr >/dev/null 2>&1 || true
NODES=$(docker ps --filter name=srelens-demo- --format '{{.Names}}' | grep -v frr)
{
  echo "frr defaults traditional"
  echo "router bgp 64512"
  echo " no bgp ebgp-requires-policy"
  for n in $NODES; do echo " neighbor $(docker inspect -f '{{.NetworkSettings.Networks.kind.IPAddress}}' "$n") remote-as 64513"; done
} > "$CAP/frr.conf"
MSYS_NO_PATHCONV=1 docker run -d --name srelens-demo-frr --network kind --privileged \
  -v "$HOSTDIR/$CAP/frr.conf:/etc/frr/frr.conf" -v "$HOSTDIR/scripts/demo/extras/frr/daemons:/etc/frr/daemons" \
  frrouting/frr:v9.1.0 >/dev/null
FRR_IP=$(docker inspect -f '{{.NetworkSettings.Networks.kind.IPAddress}}' srelens-demo-frr)
SUBNET=$(docker network inspect kind -f '{{(index .IPAM.Config 0).Subnet}}')
POOL="${SUBNET%.*.*}.255.200-${SUBNET%.*.*}.255.220"
$K apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.9/config/manifests/metallb-native.yaml
$K -n metallb-system rollout status deploy/controller --timeout=300s
sed -e "s/@FRR_IP@/$FRR_IP/" -e "s/@POOL@/$POOL/" scripts/demo/extras/metallb.yaml.tmpl | $K apply -f -
echo "FRR $FRR_IP, pool $POOL"
```

If `docker network inspect` returns an IPv6 subnet first, use the IPv4 entry (`index .IPAM.Config 1`) instead.

- [ ] **Step 5: Run and verify**

```bash
bash scripts/demo/extras.sh
kubectl --context kind-srelens-demo -n checkout get secrets -l owner=helm
kubectl --context kind-srelens-demo -n argocd get applications
kubectl --context kind-srelens-demo -n metallb-system get bgppeers,ipaddresspools
docker exec srelens-demo-frr vtysh -c 'show bgp summary'
```

Expected: two `sh.helm.release.v1.podinfo.v1/v2` secrets; `guestbook` `Synced` / `Healthy` within a few minutes; one BGP peer and one pool; FRR shows the three node neighbors `Established` (if not after 3 minutes, record the real state; the TUI shows sessions as they are).

- [ ] **Step 6: Commit**

```bash
git add scripts/demo/extras.sh scripts/demo/extras
git commit -m "feat(evidence): add Helm, Argo CD and BGP extras to the srelens-demo cluster"
```

---

### Task 19: Desktop capture script, proven on three views — CHECKPOINT

**Files:**
- Create: `scripts/shots/cdp.mjs`, `scripts/shots/views.mjs`, `scripts/shots/desktop-shots.mjs`, `tests/shots.test.mjs`

**Interfaces:**
- Produces: `connect(wsUrl) → { send(method, params), on(event, fn) → off, close() }` (`scripts/shots/cdp.mjs`); `VIEWS: { name, settings?, steps }[]`, `APP_DESIGN`, `APP_THEME` (`scripts/shots/views.mjs`); `webpSize(buf) → [w, h]` (`tests/shots.test.mjs`).

- [ ] **Step 1: Write the failing test `tests/shots.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/site.mjs';
import { VIEWS } from '../scripts/shots/views.mjs';

export function webpSize(buf) {
  assert.equal(buf.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buf.toString('ascii', 8, 12), 'WEBP');
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
  if (chunk === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  if (chunk === 'VP8L') { const b = buf.readUInt32LE(21); return [1 + (b & 0x3fff), 1 + ((b >> 14) & 0x3fff)]; }
  throw new Error(`unknown WebP chunk ${chunk}`);
}

const dir = join(ROOT, 'assets', 'shots');
const files = new Set(readdirSync(dir));

for (const { name } of VIEWS) {
  for (const theme of ['dark', 'light']) {
    test(`assets/shots/${theme}-${name}.webp exists at 2400x1461`, () => {
      const file = `${theme}-${name}.webp`;
      assert.ok(files.has(file), `${file} is missing`);
      assert.deepEqual(webpSize(readFileSync(join(dir, file))), [2400, 1461]);
    });
  }
}
```

- [ ] **Step 2: Write `scripts/shots/cdp.mjs`**

```js
// Minimal Chrome DevTools Protocol client on Node's built-in WebSocket.
export function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    const listeners = new Set();
    let id = 0;
    ws.onerror = reject;
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { ok, fail } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) fail(new Error(`${msg.error.message} (${msg.error.code})`)); else ok(msg.result);
      } else {
        for (const fn of listeners) fn(msg);
      }
    };
    ws.onopen = () => resolve({
      send(method, params = {}) {
        id += 1;
        ws.send(JSON.stringify({ id, method, params }));
        return new Promise((ok, fail) => pending.set(id, { ok, fail }));
      },
      on(method, fn) {
        const listener = (msg) => { if (msg.method === method) fn(msg.params); };
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      close() { ws.close(); },
    });
  });
}
```

- [ ] **Step 3: Write `scripts/shots/views.mjs`**

```js
// Desktop views captured for the website. Labels come from the v0.15.0 source:
// LandingPage.tsx ("Open context <name>"), ClusterHotbar.tsx ("Open settings"),
// DetailActions.tsx ("Logs", "Shell", "Edit", "Forward"), CommandPalette.tsx (Ctrl+K "Go to").
// Steps run in order after a fresh load:
//   { label }  click the element whose aria-label is exactly `label`
//   { text }   click the visible button/link/[role] element whose text is exactly `text`
//   { row }    click the first visible table row whose text contains `row`
//   { goto }   open a resource kind through the command palette (Ctrl+K, type, Enter)
//   { key }    press a key or chord: 'Escape', 'Enter', 'Control+k'
//   { type }   insert text into the focused element
//   { wait }   pause, in milliseconds
// `settings` values are strings, exactly as the app keeps them in localStorage.
export const APP_DESIGN = 'classic'; // v0.15.0 default; confirm at the Task 19 checkpoint
export const APP_THEME = 'slate';    // v0.15.0 default; confirm at the Task 19 checkpoint

const demo = [{ label: 'Open context kind-srelens-demo' }, { wait: 3000 }];
const allNs = { 'srelens.defaultNamespace': '' };
const payments = { 'srelens.defaultNamespace': 'payments' };

export const VIEWS = [
  { name: 'overview', settings: allNs, steps: [...demo] },
  { name: 'pods', settings: allNs, steps: [...demo, { goto: 'pods' }] },
  { name: 'pods-payments', settings: payments, steps: [...demo, { goto: 'pods' }] },
  { name: 'pod-detail', settings: payments, steps: [...demo, { goto: 'pods' }, { row: 'payments-api' }] },
  { name: 'logs', settings: payments, steps: [...demo, { goto: 'pods' }, { row: 'ledger-worker' }, { text: 'Logs' }, { wait: 3000 }] },
  { name: 'terminal', settings: payments, steps: [...demo, { goto: 'pods' }, { row: 'payments-api' }, { text: 'Shell' }, { wait: 3000 }, { type: 'hostname && nslookup redis.payments.svc.cluster.local' }, { key: 'Enter' }, { wait: 2000 }] },
  { name: 'yaml', settings: payments, steps: [...demo, { goto: 'deployments' }, { row: 'payments-api' }, { text: 'Edit' }] },
  { name: 'deployments', settings: allNs, steps: [...demo, { goto: 'deployments' }] },
  { name: 'services', settings: allNs, steps: [...demo, { goto: 'services' }] },
  { name: 'nodes', settings: allNs, steps: [...demo, { goto: 'nodes' }] },
  { name: 'namespaces', settings: allNs, steps: [...demo, { goto: 'namespaces' }] },
  { name: 'events', settings: allNs, steps: [...demo, { goto: 'events' }] },
  { name: 'helm', settings: allNs, steps: [...demo, { goto: 'helm' }] },
  { name: 'port-forwards', settings: payments, steps: [...demo, { goto: 'pods' }, { row: 'payments-api' }, { text: 'Forward' }, { key: 'Enter' }, { wait: 2000 }, { goto: 'port forwards' }] },
  { name: 'mcp', settings: allNs, steps: [{ label: 'Open settings' }, { text: 'MCP' }] },
];
```

- [ ] **Step 4: Write `scripts/shots/desktop-shots.mjs`**

```js
// Capture srelens desktop views for the website, in web mode: srelens-server from the
// srelens worktree serves the same React UI as the desktop app, with an isolated data dir
// and a dev login. Nothing touches %APPDATA%\app.srelens.desktop or Credential Manager.
// Only the srelens-demo kubeconfig is uploaded.
//   node scripts/shots/desktop-shots.mjs --srelens=<worktree> --kubeconfig=<srelens-demo kubeconfig> [--only=overview,pods] [--themes=dark,light] [--out=assets/shots]
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ROOT } from '../../tests/lib/site.mjs';
import { connect } from './cdp.mjs';
import { VIEWS, APP_DESIGN, APP_THEME } from './views.mjs';

const flags = {};
for (const arg of process.argv.slice(2)) {
  const [key, ...value] = arg.replace(/^--/, '').split('=');
  flags[key] = value.length ? value.join('=') : true;
}
const SRELENS = resolve(String(flags.srelens ?? ''));
const KUBECONFIG = resolve(String(flags.kubeconfig ?? ''));
const SERVER_BIN = join(SRELENS, 'target', 'debug', 'srelens-server.exe');
if (!existsSync(SERVER_BIN) || !existsSync(KUBECONFIG)) {
  console.error('usage: node scripts/shots/desktop-shots.mjs --srelens=<srelens worktree with a built server> --kubeconfig=<srelens-demo kubeconfig>');
  process.exit(2);
}
const ONLY = flags.only ? new Set(String(flags.only).split(',')) : null;
const THEMES = String(flags.themes ?? 'dark,light').split(',');
const OUT = resolve(ROOT, String(flags.out ?? 'assets/shots'));
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8791;
const CDP_PORT = 9333;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const DATA = join(tmpdir(), 'srelens-site-shots');
const SETTLE = Number(flags.settle ?? 2500);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function isUp(url) {
  try { return (await fetch(url, { signal: AbortSignal.timeout(500) })).ok; } catch { return false; }
}
async function waitFor(url) {
  for (let i = 0; i < 150; i += 1) { if (await isUp(url)) return; await sleep(200); }
  throw new Error(`${url} did not come up`);
}

// A fresh data dir per run: the only kubeconfig the server ever sees is srelens-demo's.
rmSync(DATA, { recursive: true, force: true });
mkdirSync(DATA, { recursive: true });
const log = openSync(join(DATA, 'server.log'), 'a');
const server = spawn(SERVER_BIN, ['serve', `127.0.0.1:${PORT}`, '--data', DATA], {
  cwd: SRELENS,
  stdio: ['ignore', log, log],
  env: { ...process.env, SRELENS_DEV_LOGIN: 'site-shots@localhost', SRELENS_MASTER_KEY: randomBytes(32).toString('hex'), SRELENS_PUBLIC_URL: ORIGIN },
});
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${join(DATA, 'chrome')}`, '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });

try {
  await waitFor(`${ORIGIN}/healthz`);
  const login = await fetch(`${ORIGIN}/auth/dev-login`, { method: 'POST', redirect: 'manual' });
  const session = login.headers.getSetCookie().map((c) => /(?:^|;\s*)srelens_session=([^;]+)/.exec(c)?.[1]).find(Boolean);
  if (!session) throw new Error(`no session cookie from /auth/dev-login (status ${login.status})`);
  const api = (path, init = {}) => fetch(`${ORIGIN}${path}`, {
    ...init,
    headers: { cookie: `srelens_session=${session}`, 'x-srelens-csrf': '1', 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  const upload = await api('/api/kubeconfigs', { method: 'POST', body: JSON.stringify({ name: 'srelens-demo', yaml: readFileSync(KUBECONFIG, 'utf8') }) });
  if (!upload.ok) throw new Error(`kubeconfig upload failed: ${upload.status} ${await upload.text()}`);
  const setSettings = async (values) => {
    const res = await api('/api/capability/settings.set', { method: 'POST', body: JSON.stringify({ values }) });
    if (!res.ok) throw new Error(`settings.set failed: ${res.status} ${await res.text()}`);
  };

  await waitFor(`http://127.0.0.1:${CDP_PORT}/json/version`);
  const page = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()).find((t) => t.type === 'page');
  const cdp = await connect(page.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Network.enable');
  await cdp.send('Network.setCookie', { name: 'srelens_session', value: session, url: ORIGIN, httpOnly: true });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 974, deviceScaleFactor: 1.5, mobile: false });

  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (exceptionDetails) throw new Error(exceptionDetails.text);
    return result.value;
  };
  const load = async () => {
    const loaded = new Promise((done) => { const off = cdp.on('Page.loadEventFired', () => { off(); done(); }); });
    await cdp.send('Page.navigate', { url: `${ORIGIN}/` });
    await loaded;
    await sleep(SETTLE);
  };
  const KEYS = { Enter: 13, Escape: 27, Tab: 9, ArrowDown: 40, ArrowUp: 38 };
  const press = async (combo) => {
    const parts = combo.split('+');
    const key = parts.pop();
    const modifiers = (parts.includes('Alt') ? 1 : 0) | (parts.includes('Control') ? 2 : 0) | (parts.includes('Meta') ? 4 : 0) | (parts.includes('Shift') ? 8 : 0);
    const code = key.length === 1 ? `Key${key.toUpperCase()}` : key;
    const windowsVirtualKeyCode = key.length === 1 ? key.toUpperCase().charCodeAt(0) : KEYS[key];
    for (const type of ['keyDown', 'keyUp']) await cdp.send('Input.dispatchKeyEvent', { type, key, code, modifiers, windowsVirtualKeyCode });
  };
  const click = async (kind, value) => {
    const ok = await evaluate(`(() => {
      const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const want = ${JSON.stringify(value)};
      const el = ${JSON.stringify(kind)} === 'label'
        ? [...document.querySelectorAll('[aria-label]')].find((e) => e.getAttribute('aria-label') === want && visible(e))
        : ${JSON.stringify(kind)} === 'text'
          ? [...document.querySelectorAll('button, a, [role]')].find((e) => e.textContent.trim() === want && visible(e))
          : [...document.querySelectorAll('tr, [role="row"]')].find((e) => e.textContent.includes(want) && visible(e));
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    })()`);
    if (!ok) throw new Error(`no ${kind} "${value}"`);
  };
  const run = async (step) => {
    if (step.label) await click('label', step.label);
    else if (step.text) await click('text', step.text);
    else if (step.row) await click('row', step.row);
    else if (step.goto) { await press('Control+k'); await sleep(400); await cdp.send('Input.insertText', { text: step.goto }); await sleep(600); await press('Enter'); }
    else if (step.key) await press(step.key);
    else if (step.type) await cdp.send('Input.insertText', { text: step.type });
    if (step.wait) await sleep(step.wait); else await sleep(SETTLE);
  };

  mkdirSync(OUT, { recursive: true });
  for (const theme of THEMES) {
    for (const view of VIEWS.filter((v) => !ONLY || ONLY.has(v.name))) {
      await setSettings({
        'srelens.design': APP_DESIGN,
        'fl-theme-v2': JSON.stringify({ name: APP_THEME, mode: theme }),
        'srelens.openTabs': JSON.stringify({ tabs: [], activeTabId: null }),
        ...(view.settings ?? {}),
      });
      await load();
      try {
        for (const step of view.steps) await run(step);
      } catch (err) {
        throw new Error(`${theme}-${view.name}: ${err.message}`);
      }
      const shot = await cdp.send('Page.captureScreenshot', { format: 'webp', quality: 82 });
      writeFileSync(join(OUT, `${theme}-${view.name}.webp`), Buffer.from(shot.data, 'base64'));
      console.log(`captured ${theme}-${view.name}.webp`);
    }
  }
  cdp.close();
} finally {
  chrome.kill();
  server.kill();
}
```

- [ ] **Step 5: Check the two unknowns against the tag before the first run**

Read `crates/server/src/api_capability*.rs` (or the route that serves `/api/capability/<id>`) and `crates/registry/src/settings.rs` at the tag in the worktree, and confirm (a) `settings.set` takes `{ "values": { key: string } }` and (b) settings values are strings. If either differs, adjust `setSettings` and the values in Step 4 to match, keeping the same keys.

- [ ] **Step 6: Prove it on three views into a scratch folder**

```bash
kind get kubeconfig --name srelens-demo > .superpowers/capture/kubeconfig-host
node scripts/shots/desktop-shots.mjs --srelens="$WT" --kubeconfig=.superpowers/capture/kubeconfig-host --only=overview,pods,pod-detail --out=.superpowers/shots-proof
```

Expected: six `captured …` lines. If a step fails with `no label/text/row "…"`, open `http://127.0.0.1:8791` in a normal browser with the same server (`--keep` is not needed: start the server by hand as in Task 17 Step 5 and log in with "Developer login"), read the real control text, and fix `views.mjs`.

- [ ] **Step 7: STOP — show Devesh the six proof images next to the current `assets/shots/{dark,light}-{overview,pods}.webp`**

Ask him to confirm (1) design `classic` (v0.15.0 default) or `next`, (2) app theme `slate` (default) or `srelens` (brand violet), (3) the framing. Record the answers in `views.mjs` (`APP_DESIGN`, `APP_THEME`) and commit:

```bash
git add scripts/shots tests/shots.test.mjs
git commit -m "feat(evidence): capture desktop views in web mode over the DevTools protocol"
```

Run `node --test` → PASS (the 15 existing views already have 2400×1461 pairs; this test now guards them).

---

### Task 20: Capture every desktop view and add the new ones to `/features/`

**Files:**
- Modify: `assets/shots/{dark,light}-*.webp` (15 replaced), `features/index.html`, `index.html` (only if a referenced view changed name — none should)
- Create: `assets/shots/{dark,light}-{command-palette,confirm-delete,helm-detail}.webp`

- [ ] **Step 1: Add the three new views and watch the test fail**

Append to `VIEWS` in `scripts/shots/views.mjs`:

```js
  // new on the site
  { name: 'command-palette', settings: allNs, steps: [...demo, { key: 'Control+k' }, { type: 'dep' }, { wait: 800 }] },
  { name: 'confirm-delete', settings: payments, steps: [...demo, { goto: 'pods' }, { row: 'ledger-worker' }, { text: 'Delete' }, { wait: 800 }] },
  { name: 'helm-detail', settings: allNs, steps: [...demo, { goto: 'helm' }, { row: 'podinfo' }] },
```

Run: `node --test tests/shots.test.mjs` → FAIL for the six new files (missing).

- [ ] **Step 1b: Capture everything**

```bash
node scripts/shots/desktop-shots.mjs --srelens="$WT" --kubeconfig=.superpowers/capture/kubeconfig-host
```

Expected: 36 `captured …` lines (18 views × 2 themes).

- [ ] **Step 2: Check the set**

Run: `node --test tests/shots.test.mjs` → PASS (every view, both themes, 2400×1461).
Open every new image. Reject any that shows a loading spinner, an error toast, an empty table, the About/Updates version, or a kubeconfig path from outside `.superpowers/capture`. If the `mcp` view does not exist in web mode, remove it from `VIEWS`, restore `assets/shots/{dark,light}-mcp.webp` with `git checkout -- assets/shots/dark-mcp.webp assets/shots/light-mcp.webp`, and note it for the review.

- [ ] **Step 3: Add the three new features to `/features/`**

Append three rows inside `<div class="feature-rows">` on `features/index.html`, after the last existing row, numbered after the last `fr-num`. Use the existing row structure. Draft copy (Devesh reviews it in Task 25 with the screenshots):

```html
<div class="feature-row">
  <div class="copy">
    <span class="fr-num">/ 15</span>
    <p class="keys"><kbd>Ctrl</kbd> + <kbd>K</kbd> · <kbd>⌘K</kbd> on macOS</p>
    <h3>Go anywhere from the command palette</h3>
    <p>Open any resource kind, view or recent item by name, and run actions on the selected resource without leaving the keyboard.</p>
  </div>
  <figure class="shot">
    <img class="shot-dark" src="/assets/shots/dark-command-palette.webp" width="2400" height="1461" loading="lazy" alt="srelens command palette open over the cluster overview, filtering resource kinds as the user types dep">
    <img class="shot-light" src="/assets/shots/light-command-palette.webp" width="2400" height="1461" loading="lazy" alt="srelens command palette in light theme filtering resource kinds">
  </figure>
</div>
<div class="feature-row">
  <div class="copy">
    <span class="fr-num">/ 16</span>
    <h3>Destructive actions ask first</h3>
    <p>Deleting a pod opens a confirmation that names the target before anything changes in the cluster.</p>
  </div>
  <figure class="shot">
    <img class="shot-dark" src="/assets/shots/dark-confirm-delete.webp" width="2400" height="1461" loading="lazy" alt="srelens delete confirmation for the crash-looping ledger-worker pod in the payments namespace">
    <img class="shot-light" src="/assets/shots/light-confirm-delete.webp" width="2400" height="1461" loading="lazy" alt="srelens delete confirmation in light theme for the ledger-worker pod">
  </figure>
</div>
<div class="feature-row">
  <div class="copy">
    <span class="fr-num">/ 17</span>
    <h3>Helm releases with their history</h3>
    <p>Inspect a release's values, revisions and manifest from the same workspace you use for its pods.</p>
  </div>
  <figure class="shot">
    <img class="shot-dark" src="/assets/shots/dark-helm-detail.webp" width="2400" height="1461" loading="lazy" alt="srelens Helm release detail for podinfo in the checkout namespace with two revisions">
    <img class="shot-light" src="/assets/shots/light-helm-detail.webp" width="2400" height="1461" loading="lazy" alt="srelens Helm release detail in light theme for podinfo">
  </figure>
</div>
```

Before writing, check the last existing `fr-num` and renumber the three rows to follow it. Check each sentence against v0.15.0 behavior seen in the screenshots; reword anything the screenshot does not show (for example, if the palette lists no actions, drop "and run actions on the selected resource").

- [ ] **Step 4: Run the full suite and commit**

Run: `node --test` → PASS.

```bash
git add assets/shots features/index.html scripts/shots/views.mjs
git commit -m "feat(evidence): recapture every desktop view from v0.15.0 and add palette, confirm and Helm detail"
```

---

### Task 21: Capture every TUI feature as text

**Files:**
- Create: `scripts/demo/tui-captures.tsv`, `scripts/demo/capture-all.sh`, `scripts/demo/extras/gpu.yaml`, `assets/captures/*.ansi`
- Modify: `tui/index.html`, `docs/tui/index.html`, `docs/tui.html` (mirror), `tests/tui.test.mjs`

**Interfaces:**
- Consumes: `embedCaptures`, `captureHtml` (Task 5); `.tui-figure` markup (Task 11).

- [ ] **Step 1: Write `scripts/demo/tui-captures.tsv`**

Columns are tab-separated: name, `srelens-tui` arguments, key batches (tmux `send-keys` tokens; `|` separates batches, sent 2 s apart). Lines starting with `#` are ignored.

```
# name	arguments	keys
features	-A	
overview	-A srelens://view/kind-srelens-demo/_/overview	
deployments	srelens://view/kind-srelens-demo/payments/deployments	
helm	-A srelens://view/kind-srelens-demo/_/helm	
helm-detail	-A srelens://view/kind-srelens-demo/_/helm	Enter
argo	-A srelens://view/kind-srelens-demo/_/argo	
bgp	-A srelens://view/kind-srelens-demo/_/bgp	
gpu	-A srelens://view/kind-srelens-demo/_/gpuinfo	
top	-A srelens://view/kind-srelens-demo/_/top	
topology	srelens://view/kind-srelens-demo/payments/topology	
warnings	-A srelens://view/kind-srelens-demo/_/events	w
tree	-n payments	/ payments-api Enter | t
logs	-n payments	/ ledger-worker Enter | l
themes	-A	: themes Enter
help	-A	?
```

- [ ] **Step 2: Write `scripts/demo/capture-all.sh`**

```bash
#!/usr/bin/env bash
# Capture every TUI feature in /work/tui-captures.tsv with the published srelens-tui.
# Runs inside ubuntu:24.04 on the "kind" Docker network (see Task 21).
set -euo pipefail
VERSION="${VERSION:-0.15.0}"
ONLY="${ONLY:-}"
export DEBIAN_FRONTEND=noninteractive TERM=xterm-256color COLORTERM=truecolor
apt-get update -qq && apt-get install -y -qq tmux curl ca-certificates >/dev/null
curl -fsSL https://srelens.com/install.sh | sh -s -- --version "$VERSION"
export PATH="/usr/local/bin:$HOME/.local/bin:$PATH"
mkdir -p /work/out
while IFS=$'\t' read -r name args keys; do
  [[ -z "$name" || "$name" == \#* ]] && continue
  [[ -n "$ONLY" && ",$ONLY," != *",$name,"* ]] && continue
  tmux new-session -d -s cap -x 100 -y 30 "srelens-tui $args"
  sleep 8
  IFS='|' read -ra batches <<< "${keys:-}"
  for batch in "${batches[@]}"; do
    # shellcheck disable=SC2086
    [[ -n "${batch// /}" ]] && tmux send-keys -t cap $batch
    sleep 2
  done
  tmux capture-pane -p -e -t cap > "/work/out/$name.ansi"
  tmux kill-session -t cap
  echo "captured $name"
done < /work/tui-captures.tsv
```

Use the same `--version` format confirmed in Task 6.

- [ ] **Step 3: Write `scripts/demo/extras/gpu.yaml` (simulated GPU node, kwok)**

```yaml
apiVersion: v1
kind: Node
metadata:
  name: gpu-node-a100
  annotations: { kwok.x-k8s.io/node: fake, node.alpha.kubernetes.io/ttl: "0" }
  labels:
    type: kwok
    kubernetes.io/hostname: gpu-node-a100
    nvidia.com/gpu.product: NVIDIA-A100-SXM4-80GB
    nvidia.com/gpu.count: "8"
    nvidia.com/gpu.memory: "81920"
spec:
  taints: [{ key: kwok.x-k8s.io/node, value: fake, effect: NoSchedule }]
status:
  allocatable: { cpu: "96", memory: 1Ti, pods: "110", nvidia.com/gpu: "8" }
  capacity: { cpu: "96", memory: 1Ti, pods: "110", nvidia.com/gpu: "8" }
---
apiVersion: v1
kind: Namespace
metadata: { name: ml }
---
apiVersion: apps/v1
kind: Deployment
metadata: { name: trainer, namespace: ml }
spec:
  replicas: 2
  selector: { matchLabels: { app: trainer } }
  template:
    metadata: { labels: { app: trainer } }
    spec:
      nodeSelector: { type: kwok }
      tolerations: [{ key: kwok.x-k8s.io/node, operator: Exists, effect: NoSchedule }]
      containers:
        - name: trainer
          image: busybox:1.36
          resources: { limits: { nvidia.com/gpu: 2 } }
```

- [ ] **Step 4: Capture everything except GPU, then GPU with the kwok node present**

```bash
cp scripts/demo/capture-all.sh scripts/demo/tui-captures.tsv .superpowers/capture/
kind get kubeconfig --name srelens-demo --internal > .superpowers/capture/kubeconfig
RUN() { MSYS_NO_PATHCONV=1 docker run --rm --network kind -v "$(pwd -W 2>/dev/null || pwd)/.superpowers/capture:/work" -e KUBECONFIG=/work/kubeconfig -e ONLY="$1" ubuntu:24.04 bash /work/capture-all.sh; }
RUN "features,overview,deployments,helm,helm-detail,argo,bgp,top,topology,warnings,tree,logs,themes,help"

K="kubectl --context kind-srelens-demo"
$K apply -f https://github.com/kubernetes-sigs/kwok/releases/download/v0.6.1/kwok.yaml
$K apply -f https://github.com/kubernetes-sigs/kwok/releases/download/v0.6.1/stage-fast.yaml
$K -n kube-system rollout status deploy/kwok-controller --timeout=180s
$K apply -f scripts/demo/extras/gpu.yaml
sleep 20 && $K -n ml get pods -o wide
RUN "gpu"
$K delete -f scripts/demo/extras/gpu.yaml
```

Expected: 15 `captured …` lines in total; `ml` pods `Running` on `gpu-node-a100` before the GPU capture.

- [ ] **Step 5: Review and store the captures**

```bash
for f in .superpowers/capture/out/*.ansi; do node scripts/ansi-to-html.mjs "$f" > "${f%.ansi}.html"; done
```

Open each `.html` (wrap it in `<pre style="background:#100d16;color:#d9d3e3">` in a scratch file to view). Retake any capture that shows a loading state, an error banner, an empty list, or the wrong view (fix the row in `tui-captures.tsv`; `_` in a deep link means "keep the current context/namespace" at v0.15.0 — use a real namespace if it does not). Then:

```bash
cp .superpowers/capture/out/*.ansi assets/captures/
```

- [ ] **Step 6: Write the failing test additions in `tests/tui.test.mjs`**

```js
const REPLACED = ['tui-overview.webp', 'tui-pods.webp', 'tui-argo.webp', 'tui-helm.webp', 'tui-bgp.webp', 'tui-gpuinfo.webp', 'tui-logs.webp', 'tui-tree.webp', 'tui-banner.webp'];

for (const file of ['tui/index.html', 'docs/tui/index.html']) {
  test(`${file}: TUI screenshots that now have a text capture are replaced`, () => {
    const page = read(file);
    for (const image of REPLACED) assert.ok(!page.includes(`/assets/shots/${image}`), `${file} still uses ${image}`);
  });
}

test('the GPU capture says the node is simulated', () => {
  for (const file of ['tui/index.html', 'docs/tui/index.html']) {
    const page = read(file);
    const i = page.indexOf('<!-- capture:gpu:start -->');
    if (i === -1) continue;
    const figure = page.slice(i, page.indexOf('</figure>', i));
    assert.match(figure, /simulated GPU node \(kwok\)/);
  }
});
```

Run: `node --test tests/tui.test.mjs` → FAIL (the pages still use the images).

- [ ] **Step 7: Replace the images with captures**

On `tui/index.html` and `docs/tui/index.html`, replace each `<figure class="shot">…<img src="/assets/shots/tui-X…">…</figure>` listed in `REPLACED` with a capture figure. Mapping: `tui-banner` → `features`, `tui-overview` → `overview`, `tui-pods` → `pods`, `tui-argo` → `argo`, `tui-helm` → `helm-detail`, `tui-bgp` → `bgp`, `tui-gpuinfo` → `gpu`, `tui-logs` → `logs`, `tui-tree` → `tree`. Use the image's existing `alt` text as the figcaption and the aria-label:

```html
<figure class="tui-figure">
  <pre class="tui" tabindex="0" role="region" aria-label="srelens-tui ArgoCD application view, text capture"><!-- capture:argo:start --><!-- capture:argo:end --></pre>
  <figcaption>srelens-tui ArgoCD application view · text capture from v0.15.0</figcaption>
</figure>
```

For `gpu`, the figcaption ends with `· simulated GPU node (kwok)`. Keep `tui-assistant.webp`, `tui-argo-config.png`, `tui-mcp-agent.png` and `tui-mcp-tools.png` as images. Then:

```bash
node scripts/embed-captures.mjs
cp docs/tui/index.html docs/tui.html
```

Add `.feature-row .tui { font-size: 11px; }` to the tui section of `site.css` so 100 columns fit the 7fr column.

- [ ] **Step 8: Run the full suite, browser check, commit**

Run: `node --test` → PASS (captures test covers every embedded capture). Browser check on `/tui/` and `/docs/tui/` at 1440 and 390: captures scroll inside their own box, the page body never scrolls sideways.

```bash
git add scripts/demo/tui-captures.tsv scripts/demo/capture-all.sh scripts/demo/extras/gpu.yaml assets/captures tui/index.html docs/tui/index.html docs/tui.html site.css tests/tui.test.mjs
git commit -m "feat(evidence): show every srelens-tui feature as a real text capture"
```

---

## Phase F — SEO, docs and release

### Task 22: OG cards, OG/Twitter tags and robots

**Files:**
- Create: `scripts/og-card.html`, `scripts/og-cards.mjs`, `assets/og/og-*.png` (9 files)
- Modify: `scripts/shell.mjs` (OG tags, robots), `tests/seo.test.mjs`, `tests/shell.test.mjs`, then all pages via `apply-shell --all`

**Interfaces:**
- Consumes: `PAGES[].ogCard` from `scripts/pages.mjs`.
- Produces: `ogTags(page, html): string` and robots normalisation inside `applyShell`.

- [ ] **Step 1: Write the failing expectations in `tests/seo.test.mjs`**

Add below the existing `META_CHANGES` declaration:

```js
import { PAGES, page as pageEntry } from '../scripts/pages.mjs';

const baseOf = baselineFor;
const ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1';
for (const p of PAGES) {
  const src = p.mirrorOf ? pageEntry(p.mirrorOf) : p;
  const b = baseOf(p.file);
  const changes = {};
  if (p.file !== '404.html' && b.meta.robots !== ROBOTS) changes.robots = ROBOTS;
  if (src.ogCard) {
    const image = `https://srelens.com/assets/og/${src.ogCard}`;
    const alt = `srelens.com${new URL(b.canonical).pathname}: ${b.h1[0]}`;
    Object.assign(changes, b.meta['og:image'] ? {
      'og:image': image, 'og:image:width': '1200', 'og:image:height': '630', 'og:image:alt': alt, 'twitter:image': image,
    } : {
      'og:type': 'website', 'og:url': b.canonical, 'og:site_name': 'srelens', 'og:title': b.title,
      'og:description': b.meta.description, 'og:image': image, 'og:image:width': '1200', 'og:image:height': '630',
      'og:image:alt': alt, 'og:locale': 'en_US', 'twitter:card': 'summary_large_image', 'twitter:title': b.title,
      'twitter:description': b.meta.description, 'twitter:image': image,
    });
  }
  if (Object.keys(changes).length) META_CHANGES[p.file] = changes;
}
```

Move the `pages.mjs` import up with the other imports. Then add at the end of the file:

```js
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/site.mjs';

test('every indexable page has an og:image that exists on disk', () => {
  for (const file of listPages().filter((f) => f !== '404.html')) {
    const image = meta(read(file), 'og:image');
    assert.ok(image, `${file} has no og:image`);
    const local = image.replace('https://srelens.com/', '');
    assert.ok(existsSync(join(ROOT, local)), `${file}: ${local} is missing`);
  }
});
```

Move these imports to the top of the file with the others.

- [ ] **Step 2: Run and watch it fail**

Run: `node --test tests/seo.test.mjs`
Expected: FAIL on robots and OG keys for the 8 long-form pages + mirror, on `og:image` for `tui/index.html`, and on the og:image existence test.

- [ ] **Step 3: Write `scripts/og-card.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>srelens og card</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Geist+Mono:wght@500;600&display=swap">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  body {
    box-sizing: border-box; display: grid; grid-template-rows: auto 1fr auto; padding: 64px 72px;
    background: #0f0d14; color: #ece8f3; font-family: "Geist", sans-serif;
  }
  .top { display: flex; align-items: center; gap: 14px; font: 600 26px "Geist Mono", monospace; }
  .top img { width: 40px; height: 40px; }
  .path { margin-top: 56px; font: 500 24px "Geist Mono", monospace; color: #a78bfa; }
  h1 { max-width: 1000px; margin: 18px 0 0; font: 600 56px/1.1 "Geist Mono", monospace; letter-spacing: -0.045em; text-wrap: balance; }
  .foot { display: flex; justify-content: space-between; padding-top: 22px; border-top: 1px solid #2a2533; font: 500 20px "Geist Mono", monospace; color: #9d94aa; }
</style>
</head>
<body>
  <div>
    <div class="top"><img src="/assets/logo-mark.svg" alt="">srelens</div>
    <div class="path" id="path"></div>
    <h1 id="title"></h1>
  </div>
  <div></div>
  <div class="foot"><span>The Kubernetes control room</span><span>MIT · macOS · Windows · Linux</span></div>
  <script>
    var q = new URLSearchParams(location.search);
    document.getElementById("path").textContent = q.get("path") || "srelens.com/";
    document.getElementById("title").textContent = q.get("title") || "";
  </script>
</body>
</html>
```

- [ ] **Step 4: Write `scripts/og-cards.mjs` and render the cards**

```js
// Render 1200x630 Open Graph cards with headless Chrome from scripts/og-card.html.
// Serve the repo first:  npx --yes http-server . -p 8080 -c-1 --silent
//   node scripts/og-cards.mjs [http://localhost:8080]
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT, read, h1s, canonical } from '../tests/lib/site.mjs';
import { PAGES } from './pages.mjs';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const base = process.argv[2] ?? 'http://localhost:8080';

for (const p of PAGES.filter((entry) => entry.ogCard)) {
  const html = read(p.file);
  const path = `srelens.com${new URL(canonical(html)).pathname}`;
  const url = `${base}/scripts/og-card.html?path=${encodeURIComponent(path)}&title=${encodeURIComponent(h1s(html)[0])}`;
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=1200,630',
    '--virtual-time-budget=5000', `--screenshot=${join(ROOT, 'assets', 'og', p.ogCard)}`, url,
  ], { stdio: 'ignore' });
  console.log(`og card: assets/og/${p.ogCard}`);
}
```

Run (with the preview server up): `node scripts/og-cards.mjs`
Expected: 9 `og card:` lines. Open three of the PNGs and check the title wraps inside the card and the fonts are Geist Mono (not a fallback serif).

- [ ] **Step 5: Teach `applyShell` OG tags and robots**

In `scripts/shell.mjs`, import `title`, `meta`, `canonical`, `h1s` from `../tests/lib/site.mjs` alongside `ORIGIN`, `ldNodes`, `text`, and add:

```js
const ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1';

export function ogTags(page, html) {
  const image = `${ORIGIN}/assets/og/${page.ogCard}`;
  const t = esc(title(html));
  const d = esc(meta(html, 'description'));
  const url = canonical(html);
  const alt = esc(`srelens.com${new URL(url).pathname}: ${h1s(html)[0]}`);
  return [
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:site_name" content="srelens">`,
    `<meta property="og:title" content="${t}">`,
    `<meta property="og:description" content="${d}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${alt}">`,
    `<meta property="og:locale" content="en_US">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${t}">`,
    `<meta name="twitter:description" content="${d}">`,
    `<meta name="twitter:image" content="${image}">`,
  ].map((line) => `  ${line}`).join('\n');
}
```

And at the end of `applyShell`, before `return out;`:

```js
  // robots: full directive on every indexable page
  if (page.file !== '404.html') {
    out = out.replace(/<meta name="robots" content="[^"]*">/, `<meta name="robots" content="${ROBOTS}">`);
  }

  // Open Graph card
  if (page.ogCard) {
    if (meta(out, 'og:image')) {
      const image = `${ORIGIN}/assets/og/${page.ogCard}`;
      const alt = esc(`srelens.com${new URL(canonical(out)).pathname}: ${h1s(out)[0]}`);
      out = out
        .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${image}">`)
        .replace(/<meta property="og:image:width" content="[^"]*">/, '<meta property="og:image:width" content="1200">')
        .replace(/<meta property="og:image:height" content="[^"]*">/, '<meta property="og:image:height" content="630">')
        .replace(/<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${alt}">`)
        .replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${image}">`);
    } else {
      out = out.replace(/(<link rel="canonical" href="[^"]*">)/, `$1\n${ogTags(page, out)}`);
    }
  }
```

The `escape` here must match how the test decodes: `meta()` decodes `&amp;`/`&quot;`, so `esc` round-trips.

- [ ] **Step 6: Add a shell unit test for OG tags**

Append to `tests/shell.test.mjs`:

```js
test('applyShell adds a full OG/Twitter set to a page without one', () => {
  const p = page('security/index.html');
  const html = applyShell(read(p.file), p, '0.15.0');
  assert.match(html, /<meta property="og:image" content="https:\/\/srelens\.com\/assets\/og\/og-security\.png">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.equal(applyShell(html, p, '0.15.0'), html);
});
```

- [ ] **Step 7: Re-apply the shell everywhere and run the suite**

```bash
node scripts/apply-shell.mjs --all
node --test
```

Expected: PASS (the mirror is refreshed by `--all`).

- [ ] **Step 8: Commit**

```bash
git add scripts/og-card.html scripts/og-cards.mjs scripts/shell.mjs assets/og tests/seo.test.mjs tests/shell.test.mjs $(git ls-files -m '*.html')
git commit -m "feat(seo): add OG cards and tags to every indexable page and normalise robots"
```

---

### Task 23: Sitemap, llms files, vercel.json, cache headers

**Files:**
- Modify: `sitemap.xml`, `llms.txt`, `llms-full.txt`, `vercel.json`, `_headers`
- Create: `tests/meta-files.test.mjs`

- [ ] **Step 1: Write the failing test `tests/meta-files.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read } from './lib/site.mjs';

test('sitemap lastmod is the redesign date on every URL', () => {
  const dates = [...read('sitemap.xml').matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
  assert.equal(dates.length, 21);
  for (const d of dates) assert.equal(d, '2026-10-02');
});

test('vercel.json agrees with trailing-slash canonicals', () => {
  assert.equal(JSON.parse(read('vercel.json')).trailingSlash, true);
});

test('_headers caches site.css like the old stylesheet', () => {
  assert.match(read('_headers'), /^\/site\.css\n\s+Cache-Control: public, max-age=86400$/m);
});

test('llms files carry no stale version and list the TUI docs', () => {
  for (const file of ['llms.txt', 'llms-full.txt']) {
    const body = read(file);
    assert.doesNotMatch(body, /\b0\.3\.0\b/, file);
    assert.ok(body.includes('https://srelens.com/docs/tui/'), `${file} lists /docs/tui/`);
  }
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `node --test tests/meta-files.test.mjs` → FAIL (lastmod dates, vercel, _headers; llms may already pass).

- [ ] **Step 3: Update the files**

- `sitemap.xml`: set every `<lastmod>` to `2026-10-02` (use the date the PR is opened if later, and update the test to match).
- `vercel.json`: change `"trailingSlash": false` to `"trailingSlash": true`.
- `_headers`: add after the `/main.js` block:
  ```
  /site.css
    Cache-Control: public, max-age=86400
  ```
- `llms.txt` / `llms-full.txt`: apply the Task 7 claim decisions that concern these files (for example the "0ms Informer caching" wording), using the exact text recorded in `## Decisions`.

- [ ] **Step 4: Run the full suite and commit**

Run: `node --test` → PASS.

```bash
git add sitemap.xml llms.txt llms-full.txt vercel.json _headers tests/meta-files.test.mjs
git commit -m "chore(seo): bump sitemap lastmod, align vercel.json and llms files"
```

---

### Task 24: Design docs and README

**Files:**
- Modify: `DESIGN.md`, `.impeccable/design.json`, `README.md`

Docs only; no test.

- [ ] **Step 1: Rewrite `DESIGN.md`**

Keep the front-matter structure (`name`, `description`, `colors`, `typography`, `rounded`, `spacing`, `components`) and fill it from Task 8's tokens: colors (light and dark values), typography (Geist Mono display/headline/data, Geist body, JetBrains Mono terminal), rounded (7/9/10px), spacing (`--gutter`, `--section-y`). Replace the prose with: North Star "Command line", the theme rule (follows OS, toggle, dark terminal surfaces), the accent rule (one phrase on the H1), the status-color rule, the evidence-elevation rule (shadows only on screenshots and captures), components (header with path links, path line, section label, mode switch, keycaps, command block, terminal capture, code block, tables, FAQ, 404), and the Do/Don't list from the spec.

- [ ] **Step 2: Update `.impeccable/design.json`**

Set `generatedAt` to `2026-10-02T00:00:00Z`, replace `colorMeta` with the new brand (`#6d44c5` / `#a78bfa`), neutrals and `hot` accent, and the typography meta with the three faces above.

- [ ] **Step 3: Update `README.md`**

In the structure section, replace the `styles.css` / `enterprise.css` lines with `site.css` and add `_config.yml`, `scripts/` and `tests/`. Add sections:
- **Tests:** `node --test` (zero dependencies).
- **Shared shell:** edit `scripts/pages.mjs` or `scripts/shell.mjs`, then `node scripts/apply-shell.mjs --all`.
- **Terminal capture:** the Task 6 commands (kind cluster, `capture.sh` in Docker, `node scripts/embed-captures.mjs`).
- **OG cards:** `node scripts/og-cards.mjs` with the preview server running.
- **Release bump:** update `RELEASE` in `tests/version.test.mjs`, the JSON-LD `softwareVersion`, `data-version` fallbacks and fallback download URLs, then run the tests.

- [ ] **Step 4: Commit**

```bash
git add DESIGN.md .impeccable/design.json README.md
git commit -m "docs: document the terminal-native design system and authoring tools"
```

---

### Task 25: Cleanup, full review and PR

**Files:**
- Create: `scripts/screens.mjs`
- Modify: `main.js` (remove dead code)

- [ ] **Step 1: Remove dead JS now that no page uses it**

Confirm nothing references the old behaviors:
```bash
grep -l 'class="[^"]*reveal\|id="type-line"\|id="flip-status"\|--scroll-progress' $(git ls-files '*.html' '*.css' | grep -v 'styles.css\|enterprise.css') ; echo "exit $?"
```
Expected: no file names (`exit 1`). Then delete from `main.js` the `/* ---------- navigation scroll progress ---------- */` block, the `/* ---------- scroll reveal ---------- */` block, the `hero mock: typing log line` and `hero mock: pending pod flips to running` blocks, and the now-unused `if (reduced) return;` line. Keep `var reduced` only if something still reads it; otherwise delete it too.

- [ ] **Step 2: Run the suite**

Run: `node --test` → PASS.

- [ ] **Step 3: Write `scripts/screens.mjs` and render the review set**

```js
// Render every page at three widths in both themes with headless Chrome, for review.
// Serve the repo first, then:  node scripts/screens.mjs [http://localhost:8080]
// Output: .superpowers/screens/<page>-<width>-<theme>.png (not committed).
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, listPages } from '../tests/lib/site.mjs';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const base = process.argv[2] ?? 'http://localhost:8080';
const out = join(ROOT, '.superpowers', 'screens');
mkdirSync(out, { recursive: true });
const SIZES = [[1440, 6000], [768, 7000], [390, 9000]];

for (const file of listPages()) {
  const path = file === 'index.html' ? '/' : file.endsWith('/index.html') ? `/${file.slice(0, -'index.html'.length)}` : `/${file}`;
  const slug = file.replace(/\/?index\.html$/, '').replace(/\//g, '_') || 'home';
  for (const [w, h] of SIZES) {
    for (const theme of ['light', 'dark']) {
      const name = `${slug}-${w}-${theme}.png`;
      execFileSync(CHROME, [
        '--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${w},${h}`,
        '--virtual-time-budget=4000', `--screenshot=${join(out, name)}`, `${base}${path}?theme=${theme}`,
      ], { stdio: 'ignore' });
      console.log(name);
    }
  }
}
```

Run (preview server up): `node scripts/screens.mjs`
Expected: 138 PNGs (23 pages × 3 widths × 2 themes).

- [ ] **Step 4: Request code review**

Use superpowers:requesting-code-review on the branch diff against `main`. Fix confirmed findings with a test first where behavior changes.

- [ ] **Step 5: STOP — screenshot review with Devesh**

Send the `.superpowers/screens/` set (or a contact-sheet artifact built from it) and wait for approval. Include in the review: every recaptured desktop image (Task 20), the three new feature rows and their draft copy, and every TUI capture (Task 21). Fix requested changes, re-run the suite and `scripts/screens.mjs`, and repeat until approved.

- [ ] **Step 6: Commit and open the PR**

```bash
git add main.js scripts/screens.mjs
git commit -m "chore: remove dead scroll and reveal code; add review screenshot script"
git push -u origin redesign/terminal-native
gh pr create --title "Terminal-native redesign of srelens.com" --body-file - <<'EOF'
Restyles all 23 pages in the terminal-native "Command line" system (spec: docs/superpowers/specs/2026-10-02-terminal-native-redesign-design.md).

- Every URL, canonical, title, description, H1, id and H2/H3 is preserved; enforced by tests/ against a pre-redesign baseline.
- /docs/tui.html is now a canonical mirror instead of a meta refresh; no redirects remain.
- JSON-LD and fallback labels declare v0.15.0 (were 0.3.0).
- BreadcrumbList on 14 more subpages; OG/Twitter cards on 8 more pages; robots normalised.
- _config.yml stops publishing README.md, PRODUCT.md, DESIGN.md, docs/superpowers, tests, scripts and vercel.json (those URLs become 404 by decision).
- Homepage desktop/terminal switch; the terminal is a real srelens-tui v0.15.0 text capture.

Test: `node --test`
EOF
```

No attribution footer in the PR body.

- [ ] **Step 7: After merge, verify production**

```bash
for p in / /features/ /tui/ /mcp/ /compare/ /compare/lens/ /compare/headlamp/ /compare/k9s/ /compare/freelens/ /compare/aptakube/ /compare/kubernetes-dashboard/ /download/ /faq/ /docs/ /docs/tui/ /docs/tui.html /docs/tui /security/ /architecture/ /guides/ /guides/crashloopbackoff/ /guides/oomkilled/ /guides/failed-deployment/ /install.sh /llms.txt /llms-full.txt /sitemap.xml /robots.txt; do printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "https://srelens.com$p")" "$p"; done
for p in /README.md /PRODUCT.md /DESIGN.html /vercel.json /docs/superpowers/specs/2026-07-30-real-screenshots-redesign-design.html; do printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "https://srelens.com$p")" "$p"; done
```

Expected: every line of the first loop `200`; every line of the second loop `404`. Then validate structured data for `/`, `/tui/` and `/compare/lens/` with Google's Rich Results Test.

- [ ] **Step 8: Remove the evidence environment**

```bash
docker rm -f srelens-demo-frr
kind delete cluster --name srelens-demo
git -C /c/Users/vrshu/work/srelens/srelens worktree remove /c/Users/vrshu/work/srelens/srelens/.claude/worktrees/site-evidence-v0.15.0
rm -rf "$TEMP/srelens-site-shots" .superpowers/capture
git -C /c/Users/vrshu/work/srelens/srelens worktree list | grep -c site-evidence
```

Expected: the last command prints `0`. The srelens repo has no new commits or branches from this work (`git -C /c/Users/vrshu/work/srelens/srelens status --short` shows only what was there before).
