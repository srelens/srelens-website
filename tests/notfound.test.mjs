import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, meta } from './lib/site.mjs';

const html = read('404.html');

test('404 stays out of the index', () => assert.equal(meta(html, 'robots'), 'noindex'));

test('404 shows the requested path in a terminal line, with a static fallback', () => {
  assert.match(html, /<pre class="err-term"><span class="cmd-p">\$<\/span> curl -I https:\/\/srelens\.com<span data-err-path>\/missing-page<\/span>\n<span class="err-status">HTTP\/2 404<\/span><\/pre>/);
});

test('404 keeps its copy and links back into the site', () => {
  assert.ok(html.includes('Pod not found in this namespace.'));
  for (const href of ['/', '/features/', '/tui/', '/docs/', '/download/']) assert.ok(html.includes(`href="${href}"`), href);
});
