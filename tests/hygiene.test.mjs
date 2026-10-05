import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, read } from './lib/site.mjs';
import { HOME_PATH } from './lib/privacy.mjs';

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });

test('no tracked text file contains a personal home path', () => {
  const hits = [];
  for (const file of git('ls-files', '-z').split('\0').filter(Boolean)) {
    const buf = readFileSync(join(ROOT, file));
    if (buf.includes(0)) continue; // binary
    buf.toString('utf8').split(/\r?\n/).forEach((line, i) => {
      if (HOME_PATH.test(line)) hits.push(`${file}:${i + 1}`);
    });
  }
  assert.deepEqual(hits, []);
});

test('.gitignore ignores .superpowers/ (the capture kubeconfig lives there)', () => {
  const lines = read('.gitignore').split('\n').map((l) => l.trim());
  assert.ok(lines.includes('.superpowers/'), '.gitignore lists .superpowers/');
});

test('git ignores .superpowers/capture/kubeconfig-host because of .gitignore, not a local exclude', () => {
  const out = git('check-ignore', '-v', '.superpowers/capture/kubeconfig-host');
  assert.match(out, /^\.gitignore:\d+:\.superpowers\//);
});
