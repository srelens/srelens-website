import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, meta, siteVersion } from './lib/site.mjs';
import { page } from '../scripts/pages.mjs';
import { applyShell } from '../scripts/shell.mjs';

const html = read('404.html');

test('404 stays out of the index', () => assert.equal(meta(html, 'robots'), 'noindex'));

test('404 shows the requested path in a terminal line, with a static fallback', () => {
  assert.match(html, /<pre class="err-term" tabindex="0" role="region" aria-label="Terminal output"><span class="cmd-p">\$<\/span> curl -I https:\/\/srelens\.com<span data-err-path>\/missing-page<\/span>\n<span class="err-status">HTTP\/2 404<\/span><\/pre>/);
});

test('404 keeps its copy and links back into the site', () => {
  assert.ok(html.includes('Pod not found in this namespace.'));
  for (const href of ['/', '/features/', '/tui/', '/docs/', '/download/']) assert.ok(html.includes(`href="${href}"`), href);
});

test('404 hides the decorative big number from assistive tech (it repeats "HTTP/2 404") and keeps it when the shell is re-applied', () => {
  const big = '<div class="err-code" aria-hidden="true">404</div>';
  assert.ok(html.includes(big));
  assert.ok(applyShell(html, page('404.html'), siteVersion()).includes(big));
});
