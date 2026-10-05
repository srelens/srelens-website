import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, SEO_META, listPages, read, title, meta, canonical, h1s, ldNodes, pageLinks } from './lib/site.mjs';
import { baselineFor } from './lib/baseline.mjs';
import { PAGES, page as pageEntry } from '../scripts/pages.mjs';

// ---- Deliberate changes from the spec (section 8). Everything else must match the baseline. ----
// Expected meta values that replace the baseline: { file: { key: value } }.
const META_CHANGES = {
  // C02 (claims check): "0ms" is not a measured latency. Only the description carried it; og:description and twitter:description did not.
  'compare/k9s/index.html': {
    description: 'Compare srelens and K9s: srelens offers both a multi-tab desktop workspace and a standalone pure-Rust terminal UI (srelens-tui) with an in-memory Informer cache, deep Helm values diff, and built-in AI MCP, compared to K9s.',
  },
};

// Task 22: full robots directive everywhere except 404, and an OG/Twitter card on every page the manifest gives one
// (the mirror docs/tui.html follows docs/tui/index.html). A page that already has og:image only swaps the image.
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
  if (Object.keys(changes).length) META_CHANGES[p.file] = { ...META_CHANGES[p.file], ...changes };
}
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
// Approved claim fixes: exact baseline FAQPage answer text -> replacement, per page. The visible answer changes with it (tests/faq.test.mjs).
const LD_ANSWER_CHANGES = {
  'faq/index.html': [
    // C07: the desktop resource browser covers 35 built-in kinds, not "40+".
    [
      'srelens is a Kubernetes desktop workspace — a native GUI app for browsing, inspecting, and operating Kubernetes clusters. It reads the contexts in your local kubeconfig and gives you resource browsing across 40+ kinds, live watches, log streaming, in-pod terminals, port forwarding, Helm release views, and a schema-aware YAML editor, all in one window. It is built on Tauri v2 with a pure-Rust core.',
      'srelens is a Kubernetes desktop workspace — a native GUI app for browsing, inspecting, and operating Kubernetes clusters. It reads the contexts in your local kubeconfig and gives you resource browsing across 35 built-in kinds plus any CRD, live watches, log streaming, in-pod terminals, port forwarding, Helm release views, and a schema-aware YAML editor, all in one window. It is built on Tauri v2 with a pure-Rust core.',
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
  const answers = new Map(LD_ANSWER_CHANGES[file] ?? []);
  if (Array.isArray(out.mainEntity)) {
    out = { ...out, mainEntity: out.mainEntity.map((q) => ({ ...q, acceptedAnswer: { ...q.acceptedAnswer, text: answers.get(q.acceptedAnswer.text) ?? q.acceptedAnswer.text } })) };
  }
  return out;
};

const withoutCrumbs = (nodes) => nodes.filter((n) => n['@type'] !== 'BreadcrumbList');

test('every planned meta change replaces or adds a tracked baseline value', () => {
  for (const [file, changes] of Object.entries(META_CHANGES)) {
    for (const key of Object.keys(changes)) {
      assert.ok(SEO_META.includes(key), `${file}: ${key} is not a tracked meta key`);
      assert.ok(changes[key], `${file}: ${key} has no planned value`);
      assert.notEqual(changes[key], baselineFor(file).meta[key], `${file}: ${key} is not changed`);
    }
  }
});

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

test('every planned FAQPage answer change replaces an answer that the baseline really has', () => {
  for (const [file, swaps] of Object.entries(LD_ANSWER_CHANGES)) {
    const answers = baselineFor(file).jsonLd.flatMap((j) => j['@graph'] ?? [j]).flatMap((n) => n.mainEntity ?? []).map((q) => q.acceptedAnswer.text);
    for (const [from] of swaps) assert.ok(answers.includes(from), `${file}: "${from}" is not in the baseline`);
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

// PNG header: 8-byte signature, then the IHDR chunk (length, "IHDR", width, height as big-endian uint32).
const pngSize = (rel) => {
  const buf = readFileSync(join(ROOT, rel));
  assert.equal(buf.toString('latin1', 12, 16), 'IHDR', `${rel} is not a PNG`);
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
};

test('every indexable page has an og:image that exists on disk', () => {
  for (const file of listPages().filter((f) => f !== '404.html')) {
    const image = meta(read(file), 'og:image');
    assert.ok(image, `${file} has no og:image`);
    const local = image.replace('https://srelens.com/', '');
    assert.ok(existsSync(join(ROOT, local)), `${file}: ${local} is missing`);
  }
});

test('every OG card in the manifest is a 1200x630 PNG', () => {
  const cards = PAGES.filter((p) => p.ogCard);
  assert.equal(cards.length, 9);
  for (const { ogCard } of cards) assert.deepEqual(pngSize(`assets/og/${ogCard}`), [1200, 630], ogCard);
});
