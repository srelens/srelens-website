import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listPages, read } from './lib/site.mjs';

// Where the old name may stay: "formerly srelens-tui", so searches for the old name still land (spec §2).
const FORMERLY = /\(?formerly srelens-tui\)?/g;
const MUST_SAY_FORMERLY = ['tui/index.html', 'docs/tui/index.html', 'docs/tui.html'];

// Devesh 2026-10-09: v0.16.0 / srectl. Recorded output is not renamed by hand, and none is exempt now: the text captures inside
// each <pre class="tui"> were re-taken from srectl v0.16.0 (Task 6) and the MCP panel was re-recorded from it (Task 7), so every
// page and llms file is checked like prose.

// The desktop app's own binary is also an MCP stdio server: `srelens --mcp-stdio`, the command Settings → MCP offers once the
// srelens CLI is installed. Those mentions are about the desktop app, not the terminal product, so they stay. Each is pinned by file.
const DESKTOP_MCP_STDIO = { 'mcp/index.html': 2, 'security/index.html': 1, 'llms.txt': 1, 'llms-full.txt': 1 };

// The command in front of `--mcp-stdio`. A version may sit between them ("srectl v0.16.0 --mcp-stdio", the MCP panel's figcaption),
// and the command is still the word before it, not the last number of the version.
const STDIO = /([\w-]+)(?: v\d+\.\d+\.\d+)? --mcp-stdio/g;

test('the --mcp-stdio pattern reads the command, with or without a version between it and the flag', () => {
  const names = (s) => [...s.matchAll(STDIO)].map((m) => m[1]);
  assert.deepEqual(names('run srectl --mcp-stdio'), ['srectl']);
  assert.deepEqual(names('srectl v0.16.0 --mcp-stdio, three clusters'), ['srectl']);
  assert.deepEqual(names('srelens-tui v0.15.0 --mcp-stdio'), ['srelens-tui'], 'the old name is still caught');
  assert.deepEqual(names('srelens --mcp-stdio'), ['srelens']);
});

for (const file of [...listPages(), 'llms.txt', 'llms-full.txt']) {
  test(`${file}: names srectl, keeping srelens-tui only as "formerly srelens-tui"`, () => {
    const text = read(file);
    assert.doesNotMatch(text.replace(FORMERLY, ''), /srelens-tui/, file);
    for (const m of text.matchAll(/brew install ([\w/.-]+)/g)) assert.equal(m[1], 'srelens/tap/srectl', file);
    const stdio = [...text.matchAll(STDIO)].map((m) => m[1]);
    for (const name of stdio.filter((n) => n !== 'srelens')) assert.equal(name, 'srectl', file);
    assert.equal(stdio.filter((n) => n === 'srelens').length, DESKTOP_MCP_STDIO[file] ?? 0, `${file}: desktop "srelens --mcp-stdio" mentions`);
  });
}

// Devesh 2026-10-09: v0.16.0 / srectl. "formerly srelens-tui" is pinned by count, not only allowed: [in <head>, after </head>].
// The three pages found as srelens-tui say it in their title, og:title and twitter:title and once in the hero lede; each llms
// file says it once, where the terminal product is first introduced, so answer engines can map the old name. Nowhere else.
const FORMERLY_COUNTS = {
  'tui/index.html': [3, 1], 'docs/tui/index.html': [3, 1], 'docs/tui.html': [3, 1],
  'llms.txt': [0, 1], 'llms-full.txt': [0, 1],
};
const times = (s) => (s.match(/formerly srelens-tui/g) ?? []).length;

for (const file of [...listPages(), 'llms.txt', 'llms-full.txt']) {
  test(`${file}: says "formerly srelens-tui" exactly as often as it should`, () => {
    const text = read(file);
    const end = text.indexOf('</head>');
    const [inHead, inBody] = end < 0 ? [0, times(text)] : [times(text.slice(0, end)), times(text.slice(end))];
    assert.deepEqual([inHead, inBody], FORMERLY_COUNTS[file] ?? [0, 0], `${file}: "formerly srelens-tui" in <head> and after it`);
  });
}

for (const file of MUST_SAY_FORMERLY) {
  test(`${file}: keeps "formerly srelens-tui" in its title or meta description and once in visible copy`, () => {
    const html = read(file);
    const head = html.slice(0, html.indexOf('</head>'));
    assert.match(head, /formerly srelens-tui/);
    const body = html.slice(html.indexOf('<main'));
    assert.equal((body.match(/formerly srelens-tui/g) ?? []).length, 1);
  });
}
