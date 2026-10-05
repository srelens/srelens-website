import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, read } from './lib/site.mjs';
import { HOME_PATH, ownerPattern } from './lib/privacy.mjs';

test('the owner pattern never matches everything, whatever the machine', () => {
  assert.doesNotMatch('any capture text', ownerPattern([]));
  assert.doesNotMatch('any capture text', ownerPattern(['ci', 'Al', 'Wu']));
  assert.match('captured by Devesh', ownerPattern(['Devesh']));
  assert.doesNotMatch('Deveshx', ownerPattern(['Devesh']));
});

test('a home path is a path, not a URL that merely has a home or Users folder in it', () => {
  // Built at run time so this file does not itself hold a home path.
  const U = 'Us' + 'ers';
  const H = 'ho' + 'me';
  const paths = [`C:\\${U}\\x`, `/c/${U}/x`, `cd /${H}/bob/x`, `"/${U}/alice/x"`, `file:///${U}/x`];
  for (const s of paths) assert.match(s, HOME_PATH, s);
  for (const s of [`https://kubernetes.io/docs/${H}/`, `https://github.com/${U}/x`, `example.com/${H}/page`]) assert.doesNotMatch(s, HOME_PATH, s);
});

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
