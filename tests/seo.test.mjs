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
