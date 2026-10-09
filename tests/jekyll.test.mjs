import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, read } from './lib/site.mjs';

// A path is listed as `- path` or `- path/`; Jekyll treats both the same.
const listed = (cfg, path) => new RegExp(`^\\s*-\\s*${path.replace(/\/$/, '').replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}/?\\s*$`, 'm').test(cfg);

test('listed() sees an exclude entry with or without a trailing slash, and only the whole path', () => {
  const cfg = 'exclude:\n  - tests/\n  - scripts\n  - docs/superpowers/\n';
  for (const path of ['tests', 'tests/', 'scripts', 'docs/superpowers']) assert.ok(listed(cfg, path), path);
  for (const path of ['docs', 'docs/', 'test', 'assets']) assert.ok(!listed(cfg, path), path);
});

test('_config.yml exists', () => {
  assert.ok(existsSync(join(ROOT, '_config.yml')));
});

test('_config.yml keeps repo-internal files off the site', () => {
  const cfg = read('_config.yml');
  for (const path of ['README.md', 'PRODUCT.md', 'DESIGN.md', 'docs/superpowers', 'tests', 'scripts', 'assets/captures', 'vercel.json']) {
    assert.ok(listed(cfg, path), `${path} should be excluded`);
  }
});

test('_config.yml does not exclude anything the site serves', () => {
  const cfg = read('_config.yml');
  for (const path of ['install.sh', 'llms.txt', 'llms-full.txt', 'robots.txt', 'sitemap.xml', 'CNAME', 'assets', 'site.css', 'main.js', 'docs']) {
    assert.ok(!listed(cfg, path), `${path} must stay published`);
  }
});
