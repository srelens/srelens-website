import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listPages, read, ids, headings } from './lib/site.mjs';
import { baselineFor } from './lib/baseline.mjs';

// Headings and ids removed on purpose. Only Task 7 decisions may add entries.
// Format: { 'tui/index.html': ['Heading text', ...] }
const REMOVED_HEADINGS = {
  // C07 (claims check): "40+ resource kinds" is reworded to "35 resource kinds + CRDs".
  'index.html': ['40+ resource kinds'],
  // C01/C03: the "Startup Time" and "Memory Footprint" stat cards are removed (no measurement behind <15ms / <25MB).
  // C02/C04: the "Informer Cache" and "Pure Rust Core" stat cards are reworded to "Warm watches" and "Rust core".
  'tui/index.html': ['Startup Time', 'Informer Cache', 'Memory Footprint', 'Pure Rust Core'],
};
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
