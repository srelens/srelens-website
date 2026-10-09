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
  // Devesh 2026-10-09: the brand line is "the Kubernetes kernel"
  'index.html': {
    'og:title': 'srelens — The Kubernetes kernel',
    'twitter:title': 'srelens — The Kubernetes kernel',
  },
  // C02 (claims check): "0ms" is not a measured latency. Only the description carried it; og:description and twitter:description did not.
  'compare/k9s/index.html': {
    description: 'Compare srelens and K9s: srelens offers both a multi-tab desktop workspace and a standalone pure-Rust terminal UI (srelens-tui) with an in-memory Informer cache, deep Helm values diff, and built-in AI MCP, compared to K9s.',
  },
  // Devesh 2026-10-05 owner review: C9 ("ultra-fast" becomes "fast"; the description, og:description and twitter:description all carried it).
  'tui/index.html': {
    description: 'srelens-tui is a fast, keyboard-driven terminal UI for Kubernetes built in Rust with Ratatui and kube-rs. Live stream watches, BGP peering dashboard, Helm 3 inspector, interactive logs, and in-process AI diagnostics.',
    'og:description': 'A fast, keyboard-driven terminal workspace for Kubernetes operators. Live stream watches, BGP peering dashboard, Helm 3 diffs, and embedded AI diagnostics.',
    'twitter:description': 'A fast, keyboard-driven terminal workspace for Kubernetes operators. Live stream watches, BGP peering dashboard, Helm 3 diffs, and embedded AI diagnostics.',
  },
  // Devesh 2026-10-05 owner review: C11 (a Cargo build of srelens-tui is from source, not an install: Makefile builds it with `cargo build --release -p srelens-tui`).
  'download/index.html': {
    description: 'Download srelens free: Kubernetes desktop client and pure-Rust terminal UI (srelens-tui) for macOS, Windows, and Linux — direct from GitHub Releases, or build from source with Cargo.',
  },
};

// H1s changed on purpose, as exact [from, to] pairs. Devesh 2026-10-09: the homepage H1 becomes the "kernel" line.
const H1_CHANGES = {
  'index.html': ['The Kubernetes control room for engineers and AI agents.', 'The Kubernetes kernel for engineers and AI agents.'],
};
const plannedH1 = (file, base) => (H1_CHANGES[file] ? [H1_CHANGES[file][1], ...base.h1.slice(1)] : base.h1);

test('every planned H1 change replaces the H1 the baseline really has', () => {
  for (const [file, [from]] of Object.entries(H1_CHANGES)) assert.equal(baselineFor(file).h1[0], from, file);
});

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
    const alt = `srelens.com${new URL(b.canonical).pathname}: ${plannedH1(src.file, b)[0]}`;
    Object.assign(changes, b.meta['og:image'] ? {
      'og:image': image, 'og:image:width': '1200', 'og:image:height': '630', 'og:image:alt': alt, 'twitter:image': image,
    } : {
      'og:type': 'website', 'og:url': b.canonical, 'og:site_name': 'srelens', 'og:title': b.title,
      'og:description': b.meta.description, 'og:image': image, 'og:image:width': '1200', 'og:image:height': '630',
      'og:image:alt': alt, 'og:locale': 'en_US', 'twitter:card': 'summary_large_image', 'twitter:title': b.title,
      'twitter:description': b.meta.description, 'twitter:image': image,
    });
  }
  // Only what really differs: a page whose old card was already 1200x630 changes no dimension tag.
  for (const [key, value] of Object.entries(changes)) if (value === b.meta[key]) delete changes[key];
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
      // Devesh 2026-10-05 owner review: C10 ("pure-Rust" becomes "Rust" in the JSON-LD description; the titles keep "Pure-Rust").
      'srelens-tui is a standalone Rust terminal user interface for Kubernetes operators, built with Ratatui and kube-rs. It provides in-memory Informer cache browsing, live stream watches, BGP peering dashboard, deep Helm 3 values diff and rollback, auto-wrapped logs, and an in-process AI assistant drawer.',
    ],
  ],
};
// Approved claim fixes: exact baseline FAQPage answer text -> replacement, per page. The visible answer changes with it (tests/faq.test.mjs).
const LD_ANSWER_CHANGES = {
  'faq/index.html': [
    // C07: the desktop resource browser covers 35 built-in kinds, not "40+" (first answer).
    // Devesh 2026-10-05 owner review: C13. The visible answer is the source of truth, so each JSON-LD answer is the visible
    // text word for word ("It's", the trailing link sentences, "Yes — installers ...").
    [
      "srelens is a Kubernetes desktop workspace — a native GUI app for browsing, inspecting, and operating Kubernetes clusters. It reads the contexts in your local kubeconfig and gives you resource browsing across 40+ kinds, live watches, log streaming, in-pod terminals, port forwarding, Helm release views, and a schema-aware YAML editor, all in one window. It is built on Tauri v2 with a pure-Rust core.",
      "srelens is a Kubernetes desktop workspace — a native GUI app for browsing, inspecting, and operating Kubernetes clusters. It reads the contexts in your local kubeconfig and gives you resource browsing across 35 built-in kinds plus any CRD, live watches, log streaming, in-pod terminals, port forwarding, Helm release views, and a schema-aware YAML editor, all in one window. It's built on Tauri v2 with a pure-Rust core. See it in action on the features page.",
    ],
    [
      "srelens uses Tauri v2 with a pure-Rust core and connects directly to Kubernetes API servers through kube-rs. It follows a familiar Kubernetes desktop workflow while providing local-first operation and MCP access for supported backend capabilities. srelens is independently developed and is not affiliated with Mirantis Lens or the Freelens project.",
      "srelens uses Tauri v2 with a pure-Rust core and connects directly to Kubernetes API servers through kube-rs. It follows a familiar Kubernetes desktop workflow while providing local-first operation and MCP access for supported backend capabilities. srelens is independently developed and is not affiliated with Mirantis Lens or the Freelens project. The comparison page covers the architecture in detail.",
    ],
    [
      "srelens targets macOS, Windows, and Linux desktops via Tauri v2.",
      "macOS, Windows, and Linux desktops via Tauri v2.",
    ],
    // Devesh 2026-10-09: /mcp/ shows the setup and a recorded session across three clusters now, not screenshots.
    [
      "Supported backend capabilities in srelens are registered in a shared capability registry and exposed through the built-in MCP server. MCP-capable clients can connect over stdio or loopback HTTP. Mutating tools require an explicit _confirm: true argument before they run. Additional MCP security and audit controls are planned.",
      "Supported backend capabilities are registered in a shared capability registry and exposed through the built-in MCP server. MCP-capable clients can connect over stdio or loopback HTTP. Mutating tools require an explicit _confirm: true argument before they run. Additional MCP security and audit controls are planned. The MCP page shows the setup and a recorded session across three clusters.",
    ],
    [
      "Nowhere. srelens runs entirely on your machine and connects to clusters directly using the credentials in your local kubeconfig files. There is no intermediary cloud service between the app and your API servers.",
      "Nowhere. srelens runs entirely on your machine and connects to clusters directly using the credentials in your local kubeconfig files. There's no intermediary cloud service between the app and your API servers.",
    ],
    [
      "Yes. Installers for macOS (Apple Silicon and Intel), Windows, and Linux are published on GitHub Releases. The latest build is always available there, and you can also build srelens from source.",
      "Yes — installers for macOS (Apple Silicon and Intel), Windows, and Linux are available on the download page and on GitHub Releases. You can also build srelens from source.",
    ],
    [
      "Yes. Every product image on srelens.com is an unedited capture of srelens connected to a live three-node kind Kubernetes cluster (one control-plane and two workers) running real workloads, in both the dark and light themes of the app.",
      "Yes. Every product image on this site is an unedited capture of srelens connected to a live three-node kind cluster (one control-plane and two workers) running real workloads — deployments, a StatefulSet, CronJobs, and one deliberately crash-looping pod — in both the dark and light themes of the app.",
    ],
    [
      "Yes. srelens is open source under the MIT license and free to download. There is no account, license key, or paid tier.",
      "Yes. srelens is open source under the MIT license and free to download. There's no account, license key, or paid tier.",
    ],
  ],
};
// Exact baseline JSON-LD `image` / `primaryImageOfPage` -> replacement, per page.
const LD_IMAGE_CHANGES = {
  // Devesh 2026-10-09: all new UI images; the old og-*.jpg cards show the old UI
  'index.html': [
    ['https://srelens.com/assets/og/og-home.jpg', 'https://srelens.com/assets/og/og-home.png'],
  ],
  'features/index.html': [
    ['https://srelens.com/assets/og/og-features.jpg', 'https://srelens.com/assets/og/og-features.png'],
  ],
  'mcp/index.html': [
    ['https://srelens.com/assets/og/og-mcp.jpg', 'https://srelens.com/assets/og/og-mcp.png'],
  ],
  'download/index.html': [
    ['https://srelens.com/assets/og/og-download.jpg', 'https://srelens.com/assets/og/og-download.png'],
  ],
  'tui/index.html': [
    // Devesh 2026-10: use the new UI images; the old one shows a real cluster.
    ['https://srelens.com/assets/shots/tui-overview.webp', 'https://srelens.com/assets/og/og-tui.png'],
  ],
};
// Exact baseline JSON-LD `screenshot` entry -> replacement, per page.
const LD_SCREENSHOT_CHANGES = {
  'index.html': [
    // Devesh 2026-10-09: all new UI images; the MCP settings image is old UI
    ['https://srelens.com/assets/shots/dark-mcp.webp', 'https://srelens.com/assets/shots/dark-topology.webp'],
  ],
};
// Applied to every baseline JSON-LD node of `file` before comparison.
const ldChange = (node, file) => {
  let out = 'softwareVersion' in node ? { ...node, softwareVersion: '0.15.0' } : node;
  const pictured = new Map(LD_IMAGE_CHANGES[file] ?? []);
  // `image` and `primaryImageOfPage` are a URL string or an ImageObject ({url} or {@id}); the baseline has plain strings.
  const reimage = (v) => (typeof v === 'string' ? pictured.get(v) ?? v
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, ['url', '@id'].includes(k) ? pictured.get(x) ?? x : x])) : v);
  for (const key of ['image', 'primaryImageOfPage']) if (key in out) out = { ...out, [key]: reimage(out[key]) };
  const screenshots = new Map(LD_SCREENSHOT_CHANGES[file] ?? []);
  if (Array.isArray(out.screenshot)) out = { ...out, screenshot: out.screenshot.map((s) => screenshots.get(s) ?? s) };
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

test('every planned JSON-LD image change replaces an image that the baseline really has, with the page\'s og:image', () => {
  for (const [file, swaps] of Object.entries(LD_IMAGE_CHANGES)) {
    const images = baselineFor(file).jsonLd.flatMap((j) => j['@graph'] ?? [j]).flatMap((n) => [n.image, n.primaryImageOfPage]);
    for (const [from, to] of swaps) {
      assert.ok(images.includes(from), `${file}: "${from}" is not in the baseline`);
      assert.equal(to, META_CHANGES[file]['og:image'], `${file}: the JSON-LD image is the og:image`);
    }
  }
});

test('every planned JSON-LD screenshot change replaces a screenshot the baseline lists, with a published image it does not list yet', () => {
  for (const [file, swaps] of Object.entries(LD_SCREENSHOT_CHANGES)) {
    const listed = baselineFor(file).jsonLd.flatMap((j) => j['@graph'] ?? [j]).flatMap((n) => n.screenshot ?? []);
    for (const [from, to] of swaps) {
      assert.ok(listed.includes(from), `${file}: "${from}" is not in the baseline`);
      assert.ok(!listed.includes(to), `${file}: "${to}" is already listed`);
      assert.ok(existsSync(join(ROOT, to.replace('https://srelens.com/', ''))), `${file}: ${to} is missing on disk`);
    }
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

  test(`${file}: title, canonical and h1 match the baseline plus planned changes`, () => {
    assert.ok(base, 'page missing from the baseline');
    assert.equal(title(html), base.title);
    assert.equal(canonical(html), base.canonical);
    assert.deepEqual(h1s(html), plannedH1(file, base));
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

// Devesh 2026-10-09: the brand line is "the Kubernetes kernel"; the card footer carries it.
test('the OG card template carries the brand line "The Kubernetes kernel", not "control room"', () => {
  const template = readFileSync(join(ROOT, 'scripts', 'og-card.html'), 'utf8');
  assert.ok(template.includes('<span>The Kubernetes kernel</span>'));
  assert.doesNotMatch(template, /control room/i);
});

// Devesh 2026-10-09: "All new UI images". The old og-*.jpg cards stay published (nothing 404s) but no page points at one.
test('no published page points og:image or twitter:image at an old-UI .jpg in assets/og/', () => {
  for (const file of listPages()) {
    const html = read(file);
    for (const key of ['og:image', 'twitter:image']) {
      assert.doesNotMatch(meta(html, key) ?? '', /\/assets\/og\/[^/]*\.jpe?g$/i, `${file}: ${key}`);
    }
  }
});

// The structured data must not name them either: a crawler reads `image` / `primaryImageOfPage` as the page's picture.
test('no published page names an old-UI .jpg from assets/og/ anywhere in its JSON-LD', () => {
  for (const file of listPages()) {
    assert.doesNotMatch(JSON.stringify(ldNodes(read(file))), /\/assets\/og\/[^"/]*\.jpe?g/i, file);
  }
});

test('every indexable page has its own PNG card in the manifest; only the docs/tui.html mirror shares one', () => {
  const own = PAGES.filter((p) => p.file !== '404.html' && !p.mirrorOf);
  for (const p of own) assert.match(p.ogCard ?? '', /^og-[a-z0-9-]+\.png$/, `${p.file} has no PNG ogCard`);
  assert.equal(new Set(own.map((p) => p.ogCard)).size, own.length, 'two pages share a card');
  for (const p of PAGES.filter((e) => e.mirrorOf)) assert.equal(meta(read(p.file), 'og:image'), `https://srelens.com/assets/og/${pageEntry(p.mirrorOf).ogCard}`, p.file);
});

test('every OG card in the manifest is a 1200x630 PNG', () => {
  const cards = PAGES.filter((p) => p.ogCard);
  assert.equal(cards.length, 21);
  for (const { ogCard } of cards) assert.deepEqual(pngSize(`assets/og/${ogCard}`), [1200, 630], ogCard);
});
