import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, listPages, read } from './lib/site.mjs';
import { HOME_PATH, OWNER } from './lib/privacy.mjs';
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
const CAPTURES = join(ROOT, 'assets', 'captures');
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

test('every TSV row has a stored capture', () => {
  for (const name of ROW_NAMES) assert.ok(existsSync(join(CAPTURES, `${name}.ansi`)), `assets/captures/${name}.ansi`);
});

// Every stored capture, the hero `pods` one included (it is not a TSV row), and every MCP transcript.
// Only the demo contexts may appear: the TUI demo cluster and the three MCP demo clusters.
const FOREIGN_CONTEXT = /kind-(?!srelens-demo\b|demo-(?:eu|us|ap)\b)[\w-]+/;
const HOST_DATA = /\/Users\/|\/home\/|C:\\|gmail|@[a-z0-9.-]+\.[a-z]{2,}/i;
// The bare words token and password are legitimate inside tool output, so the transcript rule names key material instead.
const KEY_MATERIAL = ['client-key-data', 'client-certificate-data', '-----BEGIN'];

test('no capture shows loading, errors, updates, other contexts or host data', () => {
  const files = readdirSync(CAPTURES).filter((f) => /\.(ansi|jsonl)$/.test(f));
  assert.ok(files.includes('pods.ansi'), 'the hero capture is scanned');
  assert.ok(files.some((f) => f.endsWith('.jsonl')), 'at least one MCP transcript is scanned');
  for (const file of files) {
    const raw = readFileSync(join(CAPTURES, file), 'utf8');
    const ansi = file.endsWith('.ansi');
    const plain = ansi ? raw.replace(/\x1b\[[0-9;:]*m/g, '') : raw;
    if (ansi) {
      assert.doesNotMatch(plain, /[\x00-\x08\x0b-\x1f\x7f]/, `${file}: control characters left after the colors`);
      assert.doesNotMatch(plain, /Connecting\.\.\.|Loading\b|\berror:|Cluster unreachable|update available/i, `${file}: loading, error or update banner`);
      assert.doesNotMatch(plain, /\[● 2:|token|password/i, `${file}: second context or credential word`);
    } else {
      for (const needle of KEY_MATERIAL) assert.ok(!plain.includes(needle), `${file}: carries ${needle}`);
    }
    assert.doesNotMatch(plain, FOREIGN_CONTEXT, `${file}: a context other than the demo ones`);
    assert.doesNotMatch(plain, HOST_DATA, `${file}: host data`);
    assert.doesNotMatch(plain, HOME_PATH, `${file}: a personal home path`);
    assert.doesNotMatch(plain, OWNER, `${file}: the name of whoever took the capture`);
  }
});

// ---- Task 21 fix round 1: the hero pods capture matches the rest of the evidence ------------------

test('the hero pods capture shows the same pod count as the overview capture, with ledger-worker selected', () => {
  const raw = read('assets/captures/pods.ansi');
  const plain = (s) => s.replace(/\x1b\[[0-9;:]*m/g, '');
  const total = plain(read('assets/captures/overview.ansi')).match(/Total Pods:\s+(\d+)/)?.[1];
  assert.ok(total, 'the overview capture states Total Pods');
  assert.match(plain(raw), new RegExp(`Nodes: 3 Pods: ${total}\\b`), 'header pod count');
  assert.match(plain(raw), new RegExp(`Pods \\[${total}\\]`), 'table title pod count');
  // The selected row is the only one with the selection background (#2d3748).
  const selected = raw.split('\n').filter((line) => line.includes('48;2;45;55;72'));
  assert.equal(selected.length, 1, 'exactly one selected row');
  assert.match(plain(selected[0]), /\bledger-worker-/, 'the selected row is ledger-worker');
});
