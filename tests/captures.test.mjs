import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, listPages, read } from './lib/site.mjs';
import { captureProblems, scanCaptureDir } from './lib/privacy.mjs';
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
const ROW_NAMES = ['features', 'overview', 'deployments', 'helm', 'helm-detail', 'argo', 'argo-config', 'bgp', 'gpu', 'top', 'topology', 'warnings', 'tree', 'logs', 'themes', 'help'];
// The assistant row needs an AI key, so Devesh runs it himself (README, "Assistant capture"); assistant.ansi is stored after that.
const KEY_ROWS = ['assistant'];

test('tui-captures.tsv lists every feature once, as name, arguments and keys, all on kind-srelens-demo', () => {
  const rows = rowsOf();
  assert.deepEqual(rows.map((r) => r[0]), [...ROW_NAMES, ...KEY_ROWS]);
  for (const [name, args] of rows) {
    assert.match(args ?? '', /^(-A|-n [a-z]+|(-A )?srelens:\/\/view\/kind-srelens-demo\/[a-z_]+\/[a-z]+)\b/, `${name}: arguments`);
    assert.doesNotMatch(args, /kind-srelens(?!-demo)/, `${name}: never the user's cluster`);
  }
});

test('capture-all.sh runs the TSV at 120x32 against the published srectl and prints its version', () => {
  const script = read('scripts/demo/capture-all.sh');
  assert.match(script, /^#!\/usr\/bin\/env bash\n/);
  assert.match(script, /^set -euo pipefail$/m);
  assert.match(script, /tmux new-session -d -s cap -x 120 -y 32 "srectl \$args"/);
  assert.match(script, /sh \/work\/install\.sh --version "\$VERSION"/);
  assert.match(script, /^srectl version$/m);
  assert.match(script, /done < \/work\/tui-captures\.tsv/);
});

test('capture-all.sh keeps the capture pinned to $VERSION: the update check cannot reach api.github.com', () => {
  // srectl checks api.github.com at startup and puts "▲ Update: <newer release>" in the header once a newer release exists.
  const script = read('scripts/demo/capture-all.sh');
  const hosts = script.indexOf('>> /etc/hosts');
  assert.ok(hosts > script.indexOf('sh /work/install.sh'), 'the hosts entry comes after the installer ran');
  assert.ok(hosts < script.indexOf('tmux new-session'), 'and before the first session starts');
  assert.match(script, /^echo "127\.0\.0\.1 api\.github\.com" >> \/etc\/hosts$/m);
});

// An optional fourth column: seconds to wait after the keys, before the screen is read (the model has to answer).
test('capture-all.sh waits the optional fourth column before capture-pane, and not at all by default', () => {
  const script = read('scripts/demo/capture-all.sh');
  assert.match(script, /^while IFS=\$'\\t' read -r name args keys wait; do$/m);
  const wait = script.indexOf('sleep "${wait:-0}"');
  assert.ok(wait > script.indexOf('for batch in'), 'the wait follows the key batches');
  assert.ok(wait < script.indexOf('tmux capture-pane'), 'and precedes the capture');
  for (const row of rowsOf().filter((r) => r[0] !== 'assistant')) assert.ok(row.length <= 3, `${row[0]} has no wait column`);
});

test('the assistant row opens the AI assistant on the demo cluster and asks one short question about ledger-worker', () => {
  const [name, args, keys, wait] = rowsOf().find((r) => r[0] === 'assistant');
  assert.equal(name, 'assistant');
  assert.equal(args, '-A srelens://view/kind-srelens-demo/payments/ai');
  const tokens = keys.trim().split(/\s+/);
  assert.equal(tokens.pop(), 'Enter', 'the question is submitted');
  // tmux send-keys types each word as given and has no space between words: a Space key goes between them.
  const typed = tokens.map((t) => (t === 'Space' ? ' ' : t)).join('');
  assert.equal(typed, 'Why is ledger-worker in payments crash-looping?');
  for (const word of typed.split(' ')) assert.doesNotMatch(word, /^(?:Enter|Tab|Up|Down|Left|Right|Home|End|Escape|BSpace|F\d+|[CMS]-.*)$/, `${word} would be read as a tmux key name`);
  assert.match(wait, /^\d+$/);
  assert.ok(Number(wait) >= 30, 'long enough for the model to call tools and answer');
});

const AI_KEYS = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY'];

test('capture-all.sh hands the AI keys to srectl from the container environment and never prints, logs or writes them', () => {
  const script = read('scripts/demo/capture-all.sh');
  // Only the installer's subshell names them, to unset them: install.sh has no use for a key.
  const unset = `unset ${AI_KEYS.join(' ')}`;
  assert.match(script, new RegExp(`^\\( ${unset}; sh /work/install\\.sh --version "\\$VERSION" \\)$`, 'm'));
  for (const line of script.split('\n')) {
    for (const key of AI_KEYS) if (line.includes(key)) assert.ok(line.includes(unset) || line.trimStart().startsWith('#'), `a line uses ${key}: ${line}`);
  }
  // Nothing that could print the environment, and no trace of expanded commands.
  assert.doesNotMatch(script, /\bset\s+-\w*x|xtrace|\bprintenv\b|^\s*env\b|\bdeclare\s+-\w*p|\bexport\s+-p|\bcompgen\s+-e|\/proc\/\S*environ/m);
  assert.doesNotMatch(script, /\btmux new-session\b[^\n]*\s-e\s/, 'a key on the tmux command line would show in ps (capture-pane -e is a different flag)');
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

// Every stored capture, the hero `pods` one included (it is not a TSV row), and every MCP transcript: the rules are
// captureProblems in tests/lib/privacy.mjs, applied to whatever .ansi or .jsonl file sits in assets/captures/.
test('no capture shows loading, errors, updates, other contexts or host data', () => {
  const found = scanCaptureDir(CAPTURES);
  assert.ok('pods.ansi' in found, 'the hero capture is scanned');
  assert.ok(Object.keys(found).some((f) => f.endsWith('.jsonl')), 'at least one MCP transcript is scanned');
  assert.deepEqual(Object.fromEntries(Object.entries(found).filter(([, problems]) => problems.length)), {});
});

// The assistant capture is taken by Devesh with his own AI key (README). A key could only reach it through the assistant's
// own screen or an answer, so the scan refuses key shapes, and it already scans every file in the folder: assistant.ansi included.
test('a future assistant.ansi is scanned like every other capture, and a key in it is refused', () => {
  const dir = mkdtempSync(join(tmpdir(), 'captures-'));
  try {
    writeFileSync(join(dir, 'assistant.ansi'), 'Assistant\nkey sk-ant-api03-AbCdEf0123456789AbCdEf0123456789 loaded\n');
    writeFileSync(join(dir, 'pods.ansi'), 'Pods [38]\n');
    const found = scanCaptureDir(dir);
    assert.deepEqual(Object.keys(found).sort(), ['assistant.ansi', 'pods.ansi']);
    assert.equal(found['pods.ansi'].length, 0);
    assert.match(found['assistant.ansi'].join('\n'), /an API key or bearer token/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('key shapes of the three providers and the env var assignments are refused in any capture', () => {
  for (const leak of ['sk-ant-api03-AbCdEf0123456789AbCdEf0123456789', 'sk-proj-AbCdEf0123456789AbCdEf0123456789', 'AIzaSyA-bCdEf0123456789AbCdEf012345678', 'ANTHROPIC_API_KEY=abc123', 'OPENAI_API_KEY: abc123', 'Authorization: Bearer abcdef0123456789abcdef']) {
    for (const file of ['assistant.ansi', 'pods.ansi', 'mcp-rollouts.jsonl']) assert.match(captureProblems(file, `before ${leak} after`).join('\n'), /an API key or bearer token/, `${file}: ${leak}`);
  }
});

test('only the assistant capture may say tokens, because its replies show per-reply token usage (the product text)', () => {
  const estimate = '⚡ 1,204 tokens (900 prompt, 304 completion)';
  assert.deepEqual(captureProblems('assistant.ansi', `Hello! Type '/caveman' for token compression.\n${estimate}\n`), []);
  assert.match(captureProblems('pods.ansi', estimate).join('\n'), /credential word/);
  assert.match(captureProblems('assistant.ansi', 'the token is abc').join('\n'), /credential word/, 'a bare token is still refused');
  assert.match(captureProblems('assistant.ansi', 'password: hunter2').join('\n'), /credential word/);
});

test('the assistant capture is refused when the key never reached srelens-tui, the model call failed or the context is not the demo one', () => {
  // The words are the product's own (apps/tui/src/app.rs:7566 in v0.15.0).
  const noKey = "No API key configured for Anthropic (Claude). Press '<Ctrl+s>' to configure settings, or set the ANTHROPIC_API_KEY environment variable.";
  assert.match(captureProblems('assistant.ansi', noKey).join('\n'), /the assistant has no AI key/);
  assert.match(captureProblems('assistant.ansi', 'API error: 404 not found').join('\n'), /loading, error or update banner/);
  assert.match(captureProblems('assistant.ansi', 'Ctx: kind-prod').join('\n'), /context other than the demo ones/);
});

test('the update notice srelens-tui puts in the header once a newer release exists is refused', () => {
  assert.match(captureProblems('argo-config.ansi', '● v1.36.1 Nodes: 3 Pods: 38  ▲ Update: v0.16.0').join('\n'), /loading, error or update banner/);
});

// ---- Devesh 2026-10-09: v0.16.0 / srectl. Every screen is re-taken from the renamed binary -----------

const stored = () => readdirSync(CAPTURES).filter((f) => f.endsWith('.ansi')).map((f) => [f, read(`assets/captures/${f}`).replace(/\x1b\[[0-9;:]*m/g, '')]);

test('no stored text capture is from srelens-tui or v0.15.0: the product text says srectl and v0.16.0', () => {
  const files = stored();
  assert.ok(files.length >= 17, 'the TSV captures and the hero capture are all scanned');
  for (const [file, text] of files) {
    assert.doesNotMatch(text, /srelens-tui/, `${file} still says srelens-tui`);
    assert.doesNotMatch(text, /\b0\.15\.0\b/, `${file} still says 0.15.0`);
  }
});

// v0.16.0 put a "Changed triage guide banner" setting (field 5) in front of the ArgoCD Hub Context (field 6) in :config
// (apps/tui/src/views/tui_config_view.rs:228-229), so the row needs six j presses, not five. j = select_next_field (app.rs:6708-6710).
test('argo-config presses j six times: ArgoCD Hub Context is the seventh setting of :config in v0.16.0', () => {
  assert.equal(rowsOf().find((r) => r[0] === 'argo-config')[2], 'j j j j j j');
  // v0.16.0 groups the Argo settings in an "ArgoCD (:argo)" box whose first field is "Hub Context" (tui_config_view.rs:648).
  assert.match(stored().find(([f]) => f === 'argo-config.ansi')[1], /▶ Hub Context/, 'the capture has the Hub Context field selected');
});

test('the tsv comments name srectl, not the old binary', () => {
  assert.doesNotMatch(read(TSV), /srelens-tui/);
});

test('the startup feature guide shows the version the captures are of', () => {
  assert.match(stored().find(([f]) => f === 'features.ansi')[1], /Version v0\.16\.0\b/);
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
