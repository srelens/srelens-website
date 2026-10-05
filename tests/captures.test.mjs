import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, listPages, read } from './lib/site.mjs';
import { captureHtml, markers, embedCaptures } from '../scripts/embed-captures.mjs';

test('embedCaptures fills an empty marker pair', () => {
  const html = '<pre class="tui"><!-- capture:fixture:start --><!-- capture:fixture:end --></pre>';
  assert.equal(
    embedCaptures(html, () => '<span style="color:#4ade80">ok</span>'),
    '<pre class="tui"><!-- capture:fixture:start --><span style="color:#4ade80">ok</span><!-- capture:fixture:end --></pre>',
  );
});

test('embedCaptures replaces stale content and is idempotent', () => {
  const render = () => 'new';
  const stale = '<!-- capture:fixture:start -->old<!-- capture:fixture:end -->';
  const once = embedCaptures(stale, render);
  assert.equal(once, '<!-- capture:fixture:start -->new<!-- capture:fixture:end -->');
  assert.equal(embedCaptures(once, render), once);
});

for (const file of listPages()) {
  for (const { name, inner } of markers(read(file))) {
    test(`${file}: capture "${name}" matches assets/captures/${name}.ansi`, () => {
      assert.equal(inner, captureHtml(name));
    });
  }
}

// ---- Task 21: every srelens-tui feature is captured from the demo cluster -----------------------

const TSV = 'scripts/demo/tui-captures.tsv';
const rowsOf = () => read(TSV).split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
const ROW_NAMES = ['features', 'overview', 'deployments', 'helm', 'helm-detail', 'argo', 'bgp', 'gpu', 'top', 'topology', 'warnings', 'tree', 'logs', 'themes', 'help'];

test('tui-captures.tsv lists every feature once, as name, arguments and keys, all on kind-srelens-demo', () => {
  const rows = rowsOf();
  assert.deepEqual(rows.map((r) => r[0]), ROW_NAMES);
  for (const [name, args] of rows) {
    assert.match(args ?? '', /^(-A|-n [a-z]+|(-A )?srelens:\/\/view\/kind-srelens-demo\/[a-z_]+\/[a-z]+)\b/, `${name}: arguments`);
    assert.doesNotMatch(args, /kind-srelens(?!-demo)/, `${name}: never the user's cluster`);
  }
});

test('capture-all.sh runs the TSV at 120x32 against the published srelens-tui and prints its version', () => {
  const script = read('scripts/demo/capture-all.sh');
  assert.match(script, /^#!\/usr\/bin\/env bash\n/);
  assert.match(script, /^set -euo pipefail$/m);
  assert.match(script, /tmux new-session -d -s cap -x 120 -y 32 /);
  assert.match(script, /curl -fsSL https:\/\/srelens\.com\/install\.sh \| sh -s -- --version "\$VERSION"/);
  assert.match(script, /^srelens-tui version$/m);
  assert.match(script, /done < \/work\/tui-captures\.tsv/);
});

test('the .tsv keeps LF on Windows checkouts (read -r would carry a CR into the key list)', () => {
  assert.match(read('.gitattributes'), /^scripts\/demo\/\*\.tsv text eol=lf$/m);
});

test('the simulated GPU node is a kwok node with the NVIDIA labels srelens-tui reads', () => {
  const yaml = read('scripts/demo/extras/gpu.yaml');
  for (const needle of ['kwok.x-k8s.io/node: fake', 'nvidia.com/gpu.product: NVIDIA-A100-SXM4-80GB', 'nvidia.com/gpu: "8"', 'name: gpu-node-a100', 'namespace: ml']) assert.ok(yaml.includes(needle), needle);
});

test('every TSV row has a stored capture, and no capture shows loading, errors, updates, other contexts or host data', () => {
  for (const name of ROW_NAMES) {
    const file = join(ROOT, 'assets', 'captures', `${name}.ansi`);
    assert.ok(existsSync(file), `assets/captures/${name}.ansi`);
    const plain = readFileSync(file, 'utf8').replace(/\x1b\[[0-9;:]*m/g, '');
    assert.doesNotMatch(plain, /[\x00-\x08\x0b-\x1f\x7f]/, `${name}: control characters left after the colors`);
    assert.doesNotMatch(plain, /Connecting\.\.\.|Loading\b|\berror:|Cluster unreachable|update available/i, `${name}: loading, error or update banner`);
    assert.doesNotMatch(plain, /\[● 2:|kind-srelens(?!-demo)|\/Users\/|\/home\/|C:\|vrshu|Devesh|gmail|@[a-z0-9.-]+\.[a-z]{2,}|token|password/i, `${name}: other context or host data`);
  }
});
