import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listPages, read, ids, headings } from './lib/site.mjs';
import { baselineFor, BASELINE_OF } from './lib/baseline.mjs';

// Headings and ids removed on purpose. Only Task 7 decisions may add entries.
// Format: { 'tui/index.html': ['Heading text', ...] }
const REMOVED_HEADINGS = {
  // C07 (claims check): "40+ resource kinds" is reworded to "35 resource kinds + CRDs".
  // Devesh 2026-10-05 owner review (A2, A5): the pod page shows current metrics with YAML a tab away; logs, shells and forwards open as tabs.
  // Devesh 2026-10-09: v0.16.0 / srectl. "srelens-tui in your shell" is "srectl in your shell" (the bento cell keeps its position).
  'index.html': ['40+ resource kinds', 'Live metrics beside the manifest', 'Logs, shells & forwards in the dock', 'srelens-tui in your shell'],
  // C01/C03: the "Startup Time" and "Memory Footprint" stat cards are removed (no measurement behind <15ms / <25MB).
  // C02/C04: the "Informer Cache" and "Pure Rust Core" stat cards are reworded to "Warm watches" and "Rust core".
  // Devesh 2026-10-09: v0.16.0 / srectl. The three headings that named srelens-tui name srectl now (ids stay).
  'tui/index.html': ['Startup Time', 'Informer Cache', 'Memory Footprint', 'Pure Rust Core',
    'Headless MCP Server (srelens-tui mcp)#', 'How srelens-tui compares.', 'Get srelens-tui for your platform.'],
  // Devesh 2026-10-09: v0.16.0 / srectl
  // Devesh 2026-10-09: v0.16.0 final review (install.sh is Linux only)
  'docs/tui/index.html': ['TUI MCP Server (srelens-tui mcp)', 'Standalone Install Script (macOS & Linux)'],
  // Devesh 2026-10-09: v0.16.0 / srectl
  'docs/index.html': ['Terminal interface (srelens-tui)'],
  // Shubham/Devesh 2026-10-08 review: remove the first-run section
  // Devesh 2026-10-09: v0.16.0 / srectl. "srelens-tui: pure Rust in your terminal." is "srectl: pure Rust in your terminal."
  'download/index.html': ['From installer to cluster in a minute.', 'srelens-tui: pure Rust in your terminal.'],
  // Devesh 2026-10-05 owner review (A2)
  'features/index.html': ['Metrics and manifest, side by side'],
};
const REMOVED_IDS = {
  // Shubham/Devesh 2026-10-08 review: remove the first-run section
  'download/index.html': ['first-run'],
  // Devesh 2026-10-09 ("Hide the button"): the old-UI product tour dialog is removed, and its title paragraph carried this id.
  'index.html': ['tour-title'],
};

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
    const removed = new Set(REMOVED_HEADINGS[BASELINE_OF[file] ?? file] ?? []); // the docs/tui.html mirror follows docs/tui/index.html
    for (const h of base.headings) if (!removed.has(h)) assert.ok(now.has(h), `lost heading "${h}"`);
  });
}

// ---- Owner copy fixes (Devesh 2026-10-05, docs/superpowers/plans/2026-10-02-tui-claims-check.md "Decisions (2026-10-05, owner review)") ----
// Whole files, so meta tags, Open Graph / Twitter descriptions and JSON-LD are covered as well as the body.
const PUBLISHED = [...listPages(), 'llms.txt', 'llms-full.txt'];

test('C9: no published page or llms file says "blazing-fast" or "ultra-fast"', () => {
  for (const file of PUBLISHED) assert.doesNotMatch(read(file), /blazing|ultra-?fast/i, file);
});

// A5: the desktop app opens logs, shells and forwards as tabs; it does not dock them. srectl has no docked panes either,
// so no "docked" hit survives anywhere and none is pinned as TUI-true.
test('A5: no published page or llms file says logs, shells or tools are "docked"', () => {
  for (const file of PUBLISHED) assert.doesNotMatch(read(file), /\bdocked\b/i, file);
});

// ---- v0.16.0 final review (Devesh 2026-10-09) ----

// install.sh is the Linux installer: check_platform() refuses Darwin and points at `brew install srelens/tap/srectl` (install.sh:329-336).
// Homebrew works on both, so the Homebrew labels keep "macOS & Linux"; the curl installer's labels say Linux.
test('final review: no page labels the one-line curl installer "macOS"', () => {
  for (const file of PUBLISHED) {
    const html = read(file);
    assert.doesNotMatch(html, /install(?:er| script)\s*\(macOS/i, `${file} labels the curl installer macOS`);
    assert.doesNotMatch(html, /macOS[^\n]{0,40}install(?:er| script)/i, `${file} puts macOS in front of the curl installer`);
  }
});

test('final review: /docs/ and /docs/tui/ label the curl installer Linux, with Homebrew for macOS right above it', () => {
  const docs = read('docs/index.html');
  assert.equal(docs.split('# One-line install script (Linux)\ncurl -fsSL https://srelens.com/install.sh | bash').length - 1, 1, 'the copy button');
  assert.equal(docs.split('<span class="c"># One-line install script (Linux)</span>\ncurl -fsSL https://srelens.com/install.sh | bash').length - 1, 1, 'the displayed block');
  assert.ok(docs.includes('# Homebrew (macOS &amp; Linux)\nbrew install srelens/tap/srectl\n\n# One-line install script (Linux)'), 'brew first, for macOS');
  for (const file of ['docs/tui/index.html', 'docs/tui.html']) {
    const html = read(file);
    assert.ok(html.includes('<h3>Homebrew (macOS &amp; Linux)</h3>'), `${file}: the Homebrew heading`);
    assert.ok(html.includes('<h3>Standalone Install Script (Linux)</h3>'), `${file}: the curl installer heading`);
  }
});

// columns.tsx:515-540 (v0.16.0): the namespaces table has Name, Status, Labels and Age, and the screenshot shows the same four.
test('final review: /features/ row 09 lists only what the namespaces table shows', () => {
  assert.ok(read('features/index.html').includes('<p>See every namespace, its status, age, and labels in one table, then open a namespace directly to continue the investigation with the right scope.</p>'));
  for (const file of PUBLISHED) assert.doesNotMatch(read(file), /resource totals/i, file);
});

// gpu_view.rs:528-561: the per-node gauges are "GPUs (Alloc)" and "VRAM Allocation", requests over capacity, not measured use.
test('final review: /docs/ calls the per-node GPU gauges allocation gauges, and no page says utilization gauges', () => {
  assert.ok(read('docs/index.html').includes('total vs. allocated VRAM, and per-node GPU allocation gauges.</li>'));
  for (const file of PUBLISHED) assert.doesNotMatch(read(file), /utili[sz]ation gauges/i, file);
});

// The kept tui-assistant.webp is a pre-rename build: its window title reads "srelens-tui" and it shows an update banner (v0.14.x).
// The alt may name that title only as "srelens-tui (now srectl)", and must say the image is a pre-rename build.
test('final review: the tui-assistant.webp alts name srelens-tui only with "now srectl", and say pre-rename build', () => {
  for (const file of ['tui/index.html', 'docs/tui/index.html', 'docs/tui.html']) {
    const tag = read(file).match(/<img[^>]*tui-assistant\.webp[^>]*>/)?.[0] ?? '';
    const alt = tag.match(/\salt="([^"]*)"/)?.[1] ?? '';
    assert.ok(alt, `${file}: the assistant screenshot has an alt`);
    assert.ok(alt.includes('srelens-tui'), `${file}: the alt says what the window title shows`);
    assert.equal((alt.match(/srelens-tui/g) ?? []).length, (alt.match(/srelens-tui \(now srectl\)/g) ?? []).length, `${file}: srelens-tui without "now srectl"`);
    assert.match(alt, /pre-rename build/, file);
  }
});
