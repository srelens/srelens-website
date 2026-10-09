import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listPages, read, attr, text } from './lib/site.mjs';

// A <pre> scrolls sideways (site.css: overflow-x: auto), so a keyboard user can only scroll it when it can take
// focus. Focusable content needs a role and a name. The uniquely named .tui captures are regions (landmarks);
// code blocks share the name "Code example", so they are groups, which are not landmarks (axe landmark-unique).

for (const file of listPages()) {
  const html = read(file);

  test(`${file}: every <pre> is focusable and named; captures are regions, code blocks groups`, () => {
    for (const [tag] of html.matchAll(/<pre\b[^>]*>/g)) {
      assert.equal(attr(tag, 'tabindex'), '0', tag);
      assert.equal(attr(tag, 'role'), /\bclass="tui"/.test(tag) ? 'region' : 'group', tag);
      assert.ok((attr(tag, 'aria-label') ?? '').trim(), `${tag} has no aria-label`);
    }
  });

  test(`${file}: a code block is named by its own visible title, else "Code example"`, () => {
    for (const [, title, pre] of html.matchAll(/<div class="mini-bar">([^<]*)<\/div>\s*<div class="mini-body">\s*(<pre\b[^>]*>)/g)) {
      assert.equal(attr(pre, 'aria-label'), text(title), pre);
    }
    for (const [, pre] of html.matchAll(/<div class="codeblock">(?:(?!<\/div>)[\s\S])*?(<pre\b[^>]*>)/g)) {
      assert.equal(attr(pre, 'aria-label'), 'Code example', pre);
    }
  });
}
