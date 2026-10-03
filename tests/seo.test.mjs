import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEO_META, listPages, read, title, meta, canonical, h1s, ldNodes, pageLinks } from './lib/site.mjs';
import { baselineFor } from './lib/baseline.mjs';

// ---- Deliberate changes from the spec (section 8). Everything else must match the baseline. ----
// Expected meta values that replace the baseline: { file: { key: value } }.
const META_CHANGES = {};
// Approved claim fixes (TUI claims check, Decision 3): exact baseline featureList entry -> replacement, per page.
const LD_FEATURE_CHANGES = {
  'index.html': [
    // C07: the desktop resource browser covers 35 built-in kinds, not "40+".
    ['Resource browser covering 40+ Kubernetes resource kinds', 'Resource browser covering 35 built-in Kubernetes resource kinds plus custom resources'],
    // C02: "0ms" is not a measured latency.
    ['Live streaming resource watches and 0ms Informer cache', 'Live streaming resource watches and an in-memory Informer cache'],
  ],
};
// Approved claim fixes: exact baseline JSON-LD `description` -> replacement, per page.
const LD_DESCRIPTION_CHANGES = {
  'tui/index.html': [
    // C02: "0ms" is not a measured latency. B28: Shift + D (debug containers) is not in v0.15.0.
    [
      'srelens-tui is a standalone pure-Rust terminal user interface for Kubernetes operators, built with Ratatui and kube-rs. It provides 0ms Informer cache browsing, live stream watches, BGP peering dashboard, deep Helm 3 values diff and rollback, auto-wrapped logs, debug containers, and an in-process AI assistant drawer.',
      'srelens-tui is a standalone pure-Rust terminal user interface for Kubernetes operators, built with Ratatui and kube-rs. It provides in-memory Informer cache browsing, live stream watches, BGP peering dashboard, deep Helm 3 values diff and rollback, auto-wrapped logs, and an in-process AI assistant drawer.',
    ],
  ],
};
// Applied to every baseline JSON-LD node of `file` before comparison.
const ldChange = (node, file) => {
  let out = 'softwareVersion' in node ? { ...node, softwareVersion: '0.15.0' } : node;
  const swaps = new Map(LD_FEATURE_CHANGES[file] ?? []);
  if (Array.isArray(out.featureList)) out = { ...out, featureList: out.featureList.map((f) => swaps.get(f) ?? f) };
  const described = new Map(LD_DESCRIPTION_CHANGES[file] ?? []);
  if (typeof out.description === 'string') out = { ...out, description: described.get(out.description) ?? out.description };
  return out;
};

const withoutCrumbs = (nodes) => nodes.filter((n) => n['@type'] !== 'BreadcrumbList');

test('every planned JSON-LD change replaces a feature that the baseline really has', () => {
  for (const [file, swaps] of Object.entries(LD_FEATURE_CHANGES)) {
    const features = baselineFor(file).jsonLd.flatMap((j) => j['@graph'] ?? [j]).flatMap((n) => n.featureList ?? []);
    for (const [from] of swaps) assert.ok(features.includes(from), `${file}: "${from}" is not in the baseline`);
  }
});

test('every planned JSON-LD description change replaces a description that the baseline really has', () => {
  for (const [file, swaps] of Object.entries(LD_DESCRIPTION_CHANGES)) {
    const descriptions = baselineFor(file).jsonLd.flatMap((j) => j['@graph'] ?? [j]).map((n) => n.description);
    for (const [from] of swaps) assert.ok(descriptions.includes(from), `${file}: "${from}" is not in the baseline`);
  }
});

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
    const expected = withoutCrumbs(base.jsonLd.flatMap((j) => j['@graph'] ?? [j])).map((node) => ldChange(node, file));
    assert.deepEqual(withoutCrumbs(ldNodes(html)), expected);
  });

  test(`${file}: every page linked before is still linked`, () => {
    const now = new Set(pageLinks(html));
    for (const link of base.pageLinks) assert.ok(now.has(link), `lost link to ${link}`);
  });
}
