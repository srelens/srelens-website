import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listPages, read } from './lib/site.mjs';

// Where the old name may stay: "formerly srelens-tui", so searches for the old name still land (spec §2).
const FORMERLY = /\(?formerly srelens-tui\)?/g;
const MUST_SAY_FORMERLY = ['tui/index.html', 'docs/tui/index.html', 'docs/tui.html'];

// Devesh 2026-10-09: v0.16.0 / srectl. Recorded output is not renamed by hand: the text capture inside each <pre class="tui">
// is re-taken in Task 6, and the MCP transcript panel is re-recorded in Task 7. Both may say srelens-tui until then.
// Task 6 removes the first exemption below and Task 7 the second. The opening <pre> tag stays checked, so its aria-label is renamed now.
const exempt = (text) => text
  .replace(/(<pre class="tui"[^>]*>)[\s\S]*?<\/pre>/g, '$1')
  .replace(/<!-- mcp-demo:start -->[\s\S]*?<!-- mcp-demo:end -->/g, '');

// The desktop app's own binary is also an MCP stdio server: `srelens --mcp-stdio`, the command Settings → MCP offers once the
// srelens CLI is installed. Those mentions are about the desktop app, not the terminal product, so they stay. Each is pinned by file.
const DESKTOP_MCP_STDIO = { 'mcp/index.html': 2, 'security/index.html': 1, 'llms.txt': 1, 'llms-full.txt': 1 };

for (const file of [...listPages(), 'llms.txt', 'llms-full.txt']) {
  test(`${file}: names srectl, keeping srelens-tui only as "formerly srelens-tui"`, () => {
    const text = exempt(read(file));
    assert.doesNotMatch(text.replace(FORMERLY, ''), /srelens-tui/, file);
    for (const m of text.matchAll(/brew install ([\w/.-]+)/g)) assert.equal(m[1], 'srelens/tap/srectl', file);
    const stdio = [...text.matchAll(/([\w-]+) --mcp-stdio/g)].map((m) => m[1]);
    for (const name of stdio.filter((n) => n !== 'srelens')) assert.equal(name, 'srectl', file);
    assert.equal(stdio.filter((n) => n === 'srelens').length, DESKTOP_MCP_STDIO[file] ?? 0, `${file}: desktop "srelens --mcp-stdio" mentions`);
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
