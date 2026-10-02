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
