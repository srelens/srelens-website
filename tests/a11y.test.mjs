import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listPages, read, attr, text } from './lib/site.mjs';

// A <pre> scrolls sideways (site.css: overflow-x: auto), so a keyboard user can only scroll it when it can take
// focus. Focusable content needs a role and a name, so each one is a labelled region (as the .tui captures are).

for (const file of listPages()) {
  const html = read(file);

  test(`${file}: every <pre> is a focusable, named region`, () => {
    for (const [tag] of html.matchAll(/<pre\b[^>]*>/g)) {
      assert.equal(attr(tag, 'tabindex'), '0', tag);
      assert.equal(attr(tag, 'role'), 'region', tag);
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
