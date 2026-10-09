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
  'docs/tui/index.html': ['TUI MCP Server (srelens-tui mcp)'],
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
