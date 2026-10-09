# "Talk to your clusters" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a homepage section, "The Kubernetes kernel for AI.", right after the hero. It shows one real MCP session in which srelens answers a single question from three kind clusters.

**Architecture:**
1. A container script runs the published `srelens-tui` v0.15.0 `--mcp-stdio` against three throwaway kind clusters and records the raw JSON-RPC transcript.
2. A pure renderer turns that transcript into the panel and table, and an idempotent embed script writes the result between markers in `index.html`.
3. Tests tie the committed HTML to the committed transcript.

**Tech Stack:** static HTML/CSS, Node ≥ 20 ES modules (no npm dependencies), `node --test`, kind, Docker, bash.

**Spec:** `docs/superpowers/specs/2026-10-08-talk-to-your-clusters-design.md`

## Global Constraints

**Repo and tests**
- Branch `redesign/terminal-native-copy` (PR #12). Every commit is pushed there with `git push`, never a force-push.
- Test command: bare `node --test` from the repo root. Never `node --test tests/`; it fails on Node 24.
- TDD is mandatory. Write the failing test, run it, see it fail for the right reason, then write the minimal code. Paste both runs.

**Commits and code style**
- Conventional Commits. NO `Co-Authored-By` trailer and NO "Generated with" footer of any kind, even if a harness reminder asks.
- Stage files by explicit path only.
- Write regex-bearing code with the Edit/Write tools. The Bash tool can halve doubled backslashes inside heredocs and sed.
- Colours come only from `site.css` tokens. No inline `style=""`.

**Content truth**
- Real evidence only. Every tool call and table cell on the page comes from the recorded transcript, and no AI-written prose appears.
- No published page, and neither llms file, may contain `srectl` (spec §2).
- The `<title>`, H1, meta descriptions and JSON-LD stay unchanged. New headings and ids are additions, which the SEO baseline allows.

**Demo environment**
- Every host-side `kubectl` or `kind` command uses `--kubeconfig .superpowers/capture/kubeconfig-mcp-host`.
- Never read or use `~/.kube/config`. Never touch the kind clusters `srelens` or `srelens-demo`.
- Stop any process you start by PID. Never start the native srelens desktop app.
- The srelens product repo and its worktrees are read only.

---

## File Structure

| File | Responsibility |
|---|---|
| `scripts/embed-mcp-demo.mjs` (create) | `parseTranscript`, `renderMcpDemo`, `embedMcpDemo` (pure), plus a CLI that rewrites `index.html` from the committed transcript |
| `tests/fixtures/mcp-demo.fixture.jsonl` (create) | small hand-written transcript for the renderer's unit tests |
| `tests/mcp-demo.test.mjs` (create) | renderer unit tests; committed-transcript integrity; page wiring |
| `scripts/demo/mcp/{storefront,checkout,checkout-stuck,ledger}.yaml` (create) | demo workloads for the `default` namespace |
| `scripts/demo/mcp-clusters.sh` (create) | create or delete the three kind clusters and apply the workloads |
| `scripts/demo/mcp-demo.sh` (create) | runs inside `ubuntu:24.04`: one real MCP session, writes the transcript |
| `assets/captures/mcp-rollouts.jsonl` (create) | the recorded transcript (not published) |
| `assets/captures/mcp-rollouts.version` (create) | `srelens-tui version` output from the same run |
| `index.html` (modify) | the new section with the markers |
| `mcp/index.html` (modify) | one sentence appended to the lede |
| `site.css` (modify) | styles for the table and prompt inside `.mini` |
| `tests/captures.test.mjs` (modify) | the privacy scan also covers `*.jsonl` |
| `.gitattributes` (modify) | `assets/captures/*.jsonl -text`, `scripts/demo/mcp/* text eol=lf` |
| `README.md` (modify) | how to reproduce the MCP demo |

---

### Task 1: The transcript renderer

**Files:**
- Create: `scripts/embed-mcp-demo.mjs`
- Create: `tests/fixtures/mcp-demo.fixture.jsonl`
- Create: `tests/mcp-demo.test.mjs`

**Interfaces:**
- Produces:
  - `PROMPT: string`
  - `parseTranscript(text: string) → { server: {name, version} | null, calls: Array<{ id: number, tool: string, args: object, result: object | null, error: string | null }> }`
  - `renderMcpDemo(text: string, version: string) → string` (HTML)
  - `embedMcpDemo(html: string, block: string) → string`
  - the markers `<!-- mcp-demo:start -->` and `<!-- mcp-demo:end -->`
  - CLI `node scripts/embed-mcp-demo.mjs`, which reads `assets/captures/mcp-rollouts.jsonl` and `.version` and rewrites `index.html`

The transcript is newline-delimited JSON-RPC. Requests and responses are interleaved in the order they happened. A `tools/call` response is `{"jsonrpc":"2.0","id":N,"result":{"content":[{"type":"text","text":"<JSON of the tool output>"}],"isError":false}}` (srelens `crates/mcp/src/stdio.rs:204-213`). `k8s.listDeployments` output is `{"deployments":[{"name","namespace","ready":"r/d","upToDate":n,"available":n,"created","age","createdAt"}]}` (`crates/kube/src/deployments.rs:20-43`). `k8s.listContexts` output is `{"contexts":[{"name",…}],"error":null}`.

- [ ] **Step 1: Write the fixture** `tests/fixtures/mcp-demo.fixture.jsonl`, one JSON object per line, exactly:

```
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"srelens-site-demo","version":"1"}}}
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-06-18","capabilities":{"tools":{}},"serverInfo":{"name":"srelens","version":"0.15.0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"k8s.listContexts","arguments":{}}}
{"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"{\"contexts\":[{\"name\":\"kind-a\"},{\"name\":\"kind-b\"}],\"error\":null}"}],"isError":false}}
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"k8s.listDeployments","arguments":{"context":"kind-a","namespace":"default"}}}
{"jsonrpc":"2.0","id":4,"result":{"content":[{"type":"text","text":"{\"deployments\":[{\"name\":\"web<x>&y\",\"namespace\":\"default\",\"ready\":\"2/3\",\"upToDate\":1,\"available\":2,\"created\":null,\"age\":\"5m\",\"createdAt\":\"\"}]}"}],"isError":false}}
{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"k8s.listDeployments","arguments":{"context":"kind-b","namespace":"default"}}}
{"jsonrpc":"2.0","id":5,"result":{"content":[{"type":"text","text":"context kind-b: connection refused"}],"isError":true}}
```

- [ ] **Step 2: Write the failing tests** in `tests/mcp-demo.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/site.mjs';
import { PROMPT, parseTranscript, renderMcpDemo, embedMcpDemo } from '../scripts/embed-mcp-demo.mjs';

const fixture = readFileSync(join(ROOT, 'tests/fixtures/mcp-demo.fixture.jsonl'), 'utf8');

test('parseTranscript pairs each tools/call with its response by id', () => {
  const { server, calls } = parseTranscript(fixture);
  assert.deepEqual(server, { name: 'srelens', version: '0.15.0' });
  assert.deepEqual(calls.map((c) => [c.id, c.tool, c.args.context ?? null]), [[3, 'k8s.listContexts', null], [4, 'k8s.listDeployments', 'kind-a'], [5, 'k8s.listDeployments', 'kind-b']]);
  assert.equal(calls[1].result.deployments[0].ready, '2/3');
  assert.equal(calls[2].result, null);
  assert.equal(calls[2].error, 'context kind-b: connection refused');
});

test('renderMcpDemo shows the prompt, every tool call in order, and a row per deployment', () => {
  const html = renderMcpDemo(fixture, '0.15.0');
  assert.ok(html.includes(PROMPT), 'prompt');
  const calls = [...html.matchAll(/<span class="mcp-call">→ ([\w.]+)<\/span>([^\n<]*)/g)].map((m) => `${m[1]}${m[2]}`.trim());
  assert.deepEqual(calls, ['k8s.listContexts', 'k8s.listDeployments  kind-a  default', 'k8s.listDeployments  kind-b  default']);
  assert.match(html, /<tr><td>kind-a<\/td><td>web&lt;x&gt;&amp;y<\/td><td>2\/3<\/td><td>1<\/td><td>2<\/td><td>5m<\/td><\/tr>/);
});

test('renderMcpDemo shows a failed call as an error row, never hides it', () => {
  assert.match(renderMcpDemo(fixture, '0.15.0'), /<tr class="mcp-error"><td>kind-b<\/td><td colspan="5">error: context kind-b: connection refused<\/td><\/tr>/);
});

test('renderMcpDemo labels its table and code for assistive technology and names the version it ran', () => {
  const html = renderMcpDemo(fixture, '0.15.0');
  assert.match(html, /<div class="mini-bar">mcp · srelens — agent session<\/div>\s*<div class="mini-body">\s*<pre tabindex="0" role="group" aria-label="mcp · srelens — agent session">/);
  assert.match(html, /<caption>Deployments in <code>default<\/code>, by cluster<\/caption>/);
  assert.equal((html.match(/<th scope="col">/g) ?? []).length, 6);
  assert.match(html, /<figcaption>Real tool calls and results: srelens-tui v0\.15\.0 --mcp-stdio, three local kind clusters\./);
});

test('embedMcpDemo replaces only the marked block and is idempotent', () => {
  const page = 'a<!-- mcp-demo:start -->old<!-- mcp-demo:end -->b';
  const once = embedMcpDemo(page, 'NEW $& $1');
  assert.equal(once, 'a<!-- mcp-demo:start -->NEW $& $1<!-- mcp-demo:end -->b');
  assert.equal(embedMcpDemo(once, 'NEW $& $1'), once);
  assert.throws(() => embedMcpDemo('no markers', 'x'), /mcp-demo markers/);
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `node --test tests/mcp-demo.test.mjs`
Expected: FAIL. The import fails because `scripts/embed-mcp-demo.mjs` does not exist yet.

- [ ] **Step 4: Write `scripts/embed-mcp-demo.mjs`**

```js
// Renders the homepage "Talk to your clusters" panel from a recorded MCP stdio transcript and embeds it in index.html.
//   node scripts/embed-mcp-demo.mjs   (reads assets/captures/mcp-rollouts.jsonl and .version)
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROMPT = "What's rolling out in default, across all my clusters?";
const START = '<!-- mcp-demo:start -->';
const END = '<!-- mcp-demo:end -->';
const BAR = 'mcp · srelens — agent session';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function parseTranscript(text) {
  const lines = text.split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  const responses = new Map(lines.filter((m) => 'id' in m && !('method' in m)).map((m) => [m.id, m]));
  const init = lines.find((m) => m.method === 'initialize');
  const server = init ? responses.get(init.id)?.result?.serverInfo ?? null : null;
  const calls = lines.filter((m) => m.method === 'tools/call').map((m) => {
    const res = responses.get(m.id)?.result;
    const text = res?.content?.[0]?.text ?? '';
    const failed = !res || res.isError;
    return { id: m.id, tool: m.params.name, args: m.params.arguments ?? {}, result: failed ? null : JSON.parse(text), error: failed ? (text || 'no response') : null };
  });
  return { server: server && { name: server.name, version: server.version }, calls };
}

export function renderMcpDemo(text, version) {
  const { calls } = parseTranscript(text);
  const callLines = calls.map((c) => `<span class="mcp-call">→ ${esc(c.tool)}</span>${c.args.context ? `  ${esc(c.args.context)}  ${esc(c.args.namespace)}` : ''}`);
  const rows = calls.filter((c) => c.tool === 'k8s.listDeployments').flatMap((c) => (c.error
    ? [`<tr class="mcp-error"><td>${esc(c.args.context)}</td><td colspan="5">error: ${esc(c.error)}</td></tr>`]
    : c.result.deployments.map((d) => `<tr><td>${esc(c.args.context)}</td><td>${esc(d.name)}</td><td>${esc(d.ready)}</td><td>${esc(d.upToDate)}</td><td>${esc(d.available)}</td><td>${esc(d.age)}</td></tr>`)));
  return [
    '<figure class="mcp-demo">',
    `  <div class="mini" aria-label="One question, answered from three clusters">`,
    `    <div class="mini-bar">${BAR}</div>`,
    '    <div class="mini-body">',
    `      <pre tabindex="0" role="group" aria-label="${BAR}"><span class="mcp-prompt">prompt</span>  ${esc(PROMPT)}`,
    ...callLines.map((l, i) => (i === callLines.length - 1 ? `${l}</pre>` : l)),
    '      <div class="mcp-table" tabindex="0" role="group" aria-label="Deployments in default, by cluster">',
    '        <table>',
    '          <caption>Deployments in <code>default</code>, by cluster</caption>',
    '          <thead><tr><th scope="col">cluster</th><th scope="col">deployment</th><th scope="col">ready</th><th scope="col">up to date</th><th scope="col">available</th><th scope="col">age</th></tr></thead>',
    `          <tbody>${rows.join('')}</tbody>`,
    '        </table>',
    '      </div>',
    '    </div>',
    '  </div>',
    `  <figcaption>Real tool calls and results: srelens-tui v${esc(version)} --mcp-stdio, three local kind clusters. Any MCP client (Cursor, Claude Code, your own agent) makes the same calls.</figcaption>`,
    '</figure>',
  ].join('\n');
}

export function embedMcpDemo(html, block) {
  const i = html.indexOf(START);
  const j = html.indexOf(END, i);
  if (i === -1 || j === -1) throw new Error('index.html has no mcp-demo markers');
  return html.slice(0, i + START.length) + block + html.slice(j);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = join(fileURLToPath(import.meta.url), '..', '..');
  const transcript = readFileSync(join(root, 'assets/captures/mcp-rollouts.jsonl'), 'utf8');
  const version = readFileSync(join(root, 'assets/captures/mcp-rollouts.version'), 'utf8').match(/\d+\.\d+\.\d+/)[0];
  const file = join(root, 'index.html');
  writeFileSync(file, embedMcpDemo(readFileSync(file, 'utf8'), renderMcpDemo(transcript, version)));
  console.log('embedded the MCP demo into index.html');
}
```

The `pre` closes on the last call line, so the call lines stay inside it. If `calls` is empty, the `pre` would never close. That cannot happen for a valid transcript, because Task 2's integrity test requires calls.

- [ ] **Step 5: Run the tests and watch them pass**

Run: `node --test tests/mcp-demo.test.mjs`. Expected: PASS, 5 tests. Then run bare `node --test`, expecting everything to pass (598 + 5).

- [ ] **Step 6: Commit and push**

```bash
git add scripts/embed-mcp-demo.mjs tests/fixtures/mcp-demo.fixture.jsonl tests/mcp-demo.test.mjs
git commit -m "feat(mcp-demo): render an MCP stdio transcript as a session panel and table"
git push
```

---

### Task 2: Three demo clusters and one real MCP session

**Files:**
- Create: `scripts/demo/mcp/storefront.yaml`, `scripts/demo/mcp/checkout.yaml`, `scripts/demo/mcp/checkout-stuck.yaml`, `scripts/demo/mcp/ledger.yaml`
- Create: `scripts/demo/mcp-clusters.sh`, `scripts/demo/mcp-demo.sh`
- Create: `assets/captures/mcp-rollouts.jsonl`, `assets/captures/mcp-rollouts.version`
- Modify: `tests/mcp-demo.test.mjs`, `tests/captures.test.mjs`, `.gitattributes`, `README.md`

**Interfaces:**
- Consumes: `parseTranscript` (Task 1).
- Produces: the committed transcript and version file that Task 3 embeds. The contexts are `kind-demo-eu`, `kind-demo-us` and `kind-demo-ap`.

- [ ] **Step 1: Write the failing integrity tests.** Append to `tests/mcp-demo.test.mjs`:

```js
const transcriptPath = join(ROOT, 'assets/captures/mcp-rollouts.jsonl');
const CONTEXTS = ['kind-demo-eu', 'kind-demo-us', 'kind-demo-ap'];

test('the committed transcript is one real session: initialize, listContexts, then listDeployments per demo cluster', () => {
  const { server, calls } = parseTranscript(readFileSync(transcriptPath, 'utf8'));
  assert.equal(server?.name, 'srelens');
  assert.equal(calls[0].tool, 'k8s.listContexts');
  assert.deepEqual(calls[0].result.contexts.map((c) => c.name).sort(), [...CONTEXTS].sort());
  const deps = calls.filter((c) => c.tool === 'k8s.listDeployments');
  assert.deepEqual(deps.map((c) => [c.args.context, c.args.namespace]), CONTEXTS.map((c) => [c, 'default']));
  for (const c of deps) assert.ok(c.result?.deployments?.length, `${c.args.context} returned deployments`);
});

test('the transcript tells the rollout story the page describes', () => {
  const { calls } = parseTranscript(readFileSync(transcriptPath, 'utf8'));
  const by = (ctx, name) => calls.find((c) => c.args.context === ctx)?.result.deployments.find((d) => d.name === name);
  for (const ctx of ['kind-demo-eu', 'kind-demo-us']) assert.equal(by(ctx, 'checkout').upToDate, 3, `${ctx} checkout rolled out`);
  assert.ok(by('kind-demo-ap', 'checkout').upToDate < 3, 'ap checkout rollout is stuck');
  assert.equal(by('kind-demo-us', 'ledger').ready, '1/2', 'us ledger has an unavailable replica');
});

test('the transcript comes from srelens-tui 0.15.0', () => {
  assert.match(readFileSync(join(ROOT, 'assets/captures/mcp-rollouts.version'), 'utf8'), /\b0\.15\.0\b/);
});
```

In `tests/captures.test.mjs`, extend the privacy scan that reads every `assets/captures/*.ansi` so it also reads `*.jsonl`. Assert there is at least one `.jsonl` file. The existing patterns (`HOME_PATH`, `OWNER`, contexts other than the demo ones, emails, tokens) then apply to the transcript too.
- Adjust the context rule so `kind-demo-(eu|us|ap)` is allowed alongside `kind-srelens-demo`.
- Add `client-key-data`, `client-certificate-data` and `-----BEGIN` as forbidden substrings in the `.jsonl` scan.
- Keep the bare words `token` and `password` out of the `.jsonl` rule; they are legitimate inside tool output.
- If `listContexts` output carries the in-container kubeconfig path (`sourceFile: /work/kubeconfig-mcp`), that is fine: it is not a home path.

Run: `node --test tests/mcp-demo.test.mjs tests/captures.test.mjs`. Expected: FAIL with ENOENT on `assets/captures/mcp-rollouts.jsonl`.

- [ ] **Step 2: Write the workloads.** Each manifest uses namespace `default`. The `nginx:1.27-alpine` image is real.

`scripts/demo/mcp/storefront.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: storefront, namespace: default }
spec:
  replicas: 2
  selector: { matchLabels: { app: storefront } }
  template:
    metadata: { labels: { app: storefront } }
    spec:
      containers:
        - name: web
          image: nginx:1.27-alpine
          readinessProbe: { httpGet: { path: /, port: 80 }, periodSeconds: 3 }
```

`scripts/demo/mcp/checkout.yaml` (v2.4.1, healthy):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: checkout, namespace: default }
spec:
  replicas: 3
  strategy: { type: RollingUpdate, rollingUpdate: { maxSurge: 1, maxUnavailable: 0 } }
  selector: { matchLabels: { app: checkout } }
  template:
    metadata: { labels: { app: checkout } }
    spec:
      containers:
        - name: api
          image: nginx:1.27-alpine
          env: [{ name: CHECKOUT_VERSION, value: "2.4.1" }]
          readinessProbe: { httpGet: { path: /, port: 80 }, periodSeconds: 3 }
```

`scripts/demo/mcp/checkout-stuck.yaml` (the same Deployment updated to v2.4.2 with a readiness probe on a port nothing listens on, so the new pods never become ready and, with `maxUnavailable: 0`, the rollout stops at 1 of 3 up to date):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: checkout, namespace: default }
spec:
  replicas: 3
  strategy: { type: RollingUpdate, rollingUpdate: { maxSurge: 1, maxUnavailable: 0 } }
  selector: { matchLabels: { app: checkout } }
  template:
    metadata: { labels: { app: checkout } }
    spec:
      containers:
        - name: api
          image: nginx:1.27-alpine
          env: [{ name: CHECKOUT_VERSION, value: "2.4.2" }]
          readinessProbe: { httpGet: { path: /, port: 8081 }, periodSeconds: 3 }
```

`scripts/demo/mcp/ledger.yaml` (two replicas that may not share a node; each cluster has one node, so one replica stays Pending):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: ledger, namespace: default }
spec:
  replicas: 2
  selector: { matchLabels: { app: ledger } }
  template:
    metadata: { labels: { app: ledger } }
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector: { matchLabels: { app: ledger } }
              topologyKey: kubernetes.io/hostname
      containers:
        - name: worker
          image: nginx:1.27-alpine
```

- [ ] **Step 3: Write `scripts/demo/mcp-clusters.sh`**

```bash
#!/usr/bin/env bash
# Create (default) or delete the three throwaway kind clusters for the homepage MCP demo.
# All three live in their own kubeconfig; ~/.kube/config is never read or written.
#   scripts/demo/mcp-clusters.sh [create|delete]
set -euo pipefail
cd "$(dirname "$0")/../.."
KC=.superpowers/capture/kubeconfig-mcp-host
CLUSTERS=(demo-eu demo-us demo-ap)
mkdir -p .superpowers/capture
if [[ "${1:-create}" == delete ]]; then
  for c in "${CLUSTERS[@]}"; do kind delete cluster --name "$c" --kubeconfig "$KC"; done
  exit 0
fi
for c in "${CLUSTERS[@]}"; do kind create cluster --name "$c" --kubeconfig "$KC" --wait 120s; done
for c in "${CLUSTERS[@]}"; do
  k="kubectl --kubeconfig $KC --context kind-$c -n default"
  $k apply -f scripts/demo/mcp/storefront.yaml -f scripts/demo/mcp/checkout.yaml
  $k rollout status deploy/storefront --timeout=180s
  $k rollout status deploy/checkout --timeout=180s
done
kubectl --kubeconfig "$KC" --context kind-demo-us -n default apply -f scripts/demo/mcp/ledger.yaml
kubectl --kubeconfig "$KC" --context kind-demo-ap -n default apply -f scripts/demo/mcp/checkout-stuck.yaml
# The container reaches the clusters by their internal addresses on the kind network.
for c in "${CLUSTERS[@]}"; do kind get kubeconfig --name "$c" --internal > ".superpowers/capture/kubeconfig-$c"; done
KUBECONFIG=".superpowers/capture/kubeconfig-demo-eu:.superpowers/capture/kubeconfig-demo-us:.superpowers/capture/kubeconfig-demo-ap" \
  kubectl config view --flatten > .superpowers/capture/kubeconfig-mcp
echo "clusters ready; container kubeconfig at .superpowers/capture/kubeconfig-mcp"
```

- [ ] **Step 4: Write `scripts/demo/mcp-demo.sh`**

```bash
#!/usr/bin/env bash
# Runs inside ubuntu:24.04 on the "kind" Docker network: one real MCP stdio session against three kind clusters.
# Writes /work/out/mcp-rollouts.jsonl (every request and response, in order) and /work/out/mcp-rollouts.version.
set -euo pipefail
VERSION="${VERSION:-0.15.0}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq curl ca-certificates >/dev/null
curl -fsSL https://srelens.com/install.sh | sh -s -- --version "$VERSION"
export PATH="/usr/local/bin:$HOME/.local/bin:$PATH"
export KUBECONFIG=/work/kubeconfig-mcp
mkdir -p /work/out
OUT=/work/out/mcp-rollouts.jsonl
: > "$OUT"
srelens-tui version > /work/out/mcp-rollouts.version
mkfifo /tmp/mcp-in
srelens-tui --mcp-stdio < /tmp/mcp-in > /tmp/mcp-out.jsonl 2> /tmp/mcp-err.log &
PID=$!
exec 3> /tmp/mcp-in
seen=0
flush() { local n; n=$(wc -l < /tmp/mcp-out.jsonl); if (( n > seen )); then sed -n "$((seen + 1)),${n}p" /tmp/mcp-out.jsonl >> "$OUT"; seen=$n; fi; }
send() { printf '%s\n' "$1" >&3; printf '%s\n' "$1" >> "$OUT"; sleep "${2:-3}"; flush; }
send '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"srelens-site-demo","version":"1"}}}'
send '{"jsonrpc":"2.0","method":"notifications/initialized"}' 1
send '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"k8s.listContexts","arguments":{}}}'
id=4
for ctx in kind-demo-eu kind-demo-us kind-demo-ap; do
  send "{\"jsonrpc\":\"2.0\",\"id\":$id,\"method\":\"tools/call\",\"params\":{\"name\":\"k8s.listDeployments\",\"arguments\":{\"context\":\"$ctx\",\"namespace\":\"default\"}}}" 6
  id=$((id + 1))
done
exec 3>&-
wait "$PID" || true
flush
echo "wrote $OUT ($(wc -l < "$OUT") lines)"
```

The committed session has no `tools/list` call: its long tool descriptions would only add noise. A wrong tool name shows up as a failed call in the transcript. If a call fails because a context must be connected first, add that real call before the `listDeployments` loop and re-run. Never hand-edit the transcript.

- [ ] **Step 5: Run it.** Use Git Bash from the repo root:

```bash
bash scripts/demo/mcp-clusters.sh create
kubectl --kubeconfig .superpowers/capture/kubeconfig-mcp-host --context kind-demo-ap -n default get deploy checkout   # expect UP-TO-DATE 1, AVAILABLE 3, after ~30 s
kubectl --kubeconfig .superpowers/capture/kubeconfig-mcp-host --context kind-demo-us -n default get deploy ledger     # expect READY 1/2
cp scripts/demo/mcp-demo.sh .superpowers/capture/
MSYS_NO_PATHCONV=1 docker run --rm --network kind -v "$(pwd -W 2>/dev/null || pwd)/.superpowers/capture:/work" ubuntu:24.04 bash /work/mcp-demo.sh
cp .superpowers/capture/out/mcp-rollouts.jsonl .superpowers/capture/out/mcp-rollouts.version assets/captures/
```

Read the transcript and check all of this:
- every call succeeded;
- the contexts are the three demo ones;
- no home path, user name, token or key appears.

If a response carries anything sensitive, stop and report it. Do not hand-edit the transcript. Re-run instead.

- [ ] **Step 6: Line endings and README.**
- `.gitattributes`: add `assets/captures/*.jsonl -text` and `scripts/demo/mcp/* text eol=lf`. `*.sh` is already LF.
- `README.md`: in the terminal-capture section, add a short "MCP demo" subsection with the three commands from Step 5, plus `node scripts/embed-mcp-demo.mjs` and `bash scripts/demo/mcp-clusters.sh delete`.

- [ ] **Step 7: Run the tests and watch them pass.** Run `node --test tests/mcp-demo.test.mjs tests/captures.test.mjs`, then bare `node --test`. Expected: all PASS.

- [ ] **Step 8: Commit and push**

```bash
git add scripts/demo/mcp scripts/demo/mcp-clusters.sh scripts/demo/mcp-demo.sh assets/captures/mcp-rollouts.jsonl assets/captures/mcp-rollouts.version tests/mcp-demo.test.mjs tests/captures.test.mjs .gitattributes README.md
git commit -m "feat(mcp-demo): record one real MCP session across three kind clusters"
git push
```

Keep the three clusters running until Task 3's browser check passes and the controller says to delete them.

---

### Task 3: The homepage section and the /mcp/ line

**Files:**
- Modify: `index.html` (new section after the hero), `mcp/index.html` (lede), `site.css`
- Modify: `tests/mcp-demo.test.mjs`, `tests/copy.test.mjs`

**Interfaces:**
- Consumes:
  - `renderMcpDemo`, `embedMcpDemo` and the CLI (Task 1);
  - `assets/captures/mcp-rollouts.{jsonl,version}` (Task 2);
  - `read`, `listPages` and `headings` from `tests/lib/site.mjs`.

- [ ] **Step 1: Write the failing page tests.** Append to `tests/mcp-demo.test.mjs`:

```js
import { read, listPages } from './lib/site.mjs';

const home = read('index.html');

test('the homepage section right after the hero is "Talk to your clusters"', () => {
  const heroEnd = home.indexOf('</section>', home.indexOf('<section class="hero">'));
  const next = home.slice(heroEnd).match(/<section class="section" id="([\w-]+)">/);
  assert.equal(next?.[1], 'talk-to-your-clusters');
  assert.match(home, /<h2>The Kubernetes kernel for AI\.<\/h2>/);
});

test('the committed panel is exactly the render of the committed transcript', () => {
  const transcript = readFileSync(join(ROOT, 'assets/captures/mcp-rollouts.jsonl'), 'utf8');
  const version = readFileSync(join(ROOT, 'assets/captures/mcp-rollouts.version'), 'utf8').match(/\d+\.\d+\.\d+/)[0];
  const block = home.slice(home.indexOf('<!-- mcp-demo:start -->') + '<!-- mcp-demo:start -->'.length, home.indexOf('<!-- mcp-demo:end -->'));
  assert.equal(block, renderMcpDemo(transcript, version));
});

test('/mcp/ calls srelens the Kubernetes kernel for AI', () => {
  assert.match(read('mcp/index.html'), /srelens is the Kubernetes kernel for AI: your agents use it so you don’t have to\./);
});

test('no page and no llms file names srectl before the release that ships it', () => {
  for (const file of [...listPages(), 'llms.txt', 'llms-full.txt']) assert.doesNotMatch(read(file), /srectl/i, file);
});
```

Run: `node --test tests/mcp-demo.test.mjs`. Expected: FAIL on the section, block, /mcp/ line. The srectl test passes from the start; it is a guard.

- [ ] **Step 2: Add the section** to `index.html`, directly after the `</section>` that closes `<section class="hero">` and before `<section class="section" id="workflow">`:

```html
    <section class="section" id="talk-to-your-clusters">
      <div class="wrap">
        <div class="section-head">
          <p class="eyebrow"><a class="section-label anchor-link" href="#talk-to-your-clusters">#talk-to-your-clusters</a> · Talk to your clusters</p>
          <h2>The Kubernetes kernel for AI.</h2>
          <p class="sub">
            Install srelens once and you will rarely open it, because your agents do. Point any MCP client at it
            and ask in plain language: the answers come live from your clusters, through typed tools that are
            read-only unless you allow more.
          </p>
        </div>
        <!-- mcp-demo:start --><!-- mcp-demo:end -->
        <p><a href="/mcp/">Set up the MCP server →</a></p>
      </div>
    </section>
```

Then run `node scripts/embed-mcp-demo.mjs`.

- [ ] **Step 3: The /mcp/ lede.** In `mcp/index.html`, the hero `<p class="lede">` ends with "…and with explicit confirmation for anything mutating." Append on a new line inside the same paragraph: `srelens is the Kubernetes kernel for AI: your agents use it so you don’t have to.`

- [ ] **Step 4: CSS.** Append to the evidence or terminal part of `site.css`, using tokens only:

```css
.mcp-demo { margin: 28px 0 12px; }
.mcp-demo figcaption { margin-top: 10px; font: 500 12px var(--font-mono); color: var(--muted); }
.mcp-demo .mini-body pre { border-bottom: 1px solid var(--term-line); }
.mcp-prompt { color: var(--term-dim); }
.mcp-call { color: var(--term-fg); }
.mcp-table { overflow-x: auto; }
.mcp-table table { width: 100%; font: 500 13px/1.5 var(--font-term); color: var(--term-fg); }
.mcp-table caption { padding: 12px 16px 6px; text-align: left; color: var(--term-dim); font: 500 12px var(--font-term); }
.mcp-table th, .mcp-table td { padding: 6px 16px; text-align: left; white-space: nowrap; border-bottom: 1px solid var(--term-line); }
.mcp-table th { color: var(--term-dim); font-weight: 500; }
.mcp-error td { color: var(--term-bad, var(--term-fg)); }
```

Check each token exists in `site.css` (`--term-bad` may be named differently; use the existing failing-status terminal token). `tests/contrast.test.mjs` must still pass. If a new text/background pair is not covered by it, add that pair to the test.

- [ ] **Step 5: Re-apply the shell.** Run `node scripts/apply-shell.mjs --all`, then run it again. The second run must change nothing (compare `git diff --stat`). The shell may normalise the section label; that is expected.

- [ ] **Step 6: Run the full suite.** Bare `node --test`. Expected: all PASS, including the SEO baseline (the new H2 and id are additions), the a11y test (the `pre` has `tabindex="0"`, `role="group"`, and an `aria-label` equal to the mini-bar text), and the hygiene and privacy tests.

- [ ] **Step 7: Browser check.** With the `site` preview (or `npx --yes http-server . -p 8080 -c-1 --silent`, stopped by PID afterwards), load `/` at 1440, 768 and 390:
- `document.documentElement.scrollWidth <= innerWidth`;
- the table is visible;
- at 390 the table scrolls inside `.mcp-table`, not the page.

Take one screenshot at 1440 and look at it. Reset the viewport.

- [ ] **Step 8: Commit and push**

```bash
git add index.html mcp/index.html site.css tests/mcp-demo.test.mjs
git commit -m "feat(home): add Talk to your clusters, a real MCP session across three clusters"
git push
```

---

### Task 4 (controller): Clean up and close out

- [ ] Delete the clusters: `bash scripts/demo/mcp-clusters.sh delete`. Then check with `kind get clusters`: the `demo-*` clusters are gone, and `srelens` and `srelens-demo` are still there.
- [ ] Regenerate the review screenshots (`node scripts/screens.mjs`). Rebuild `.superpowers/screens/review.html`.
- [ ] Update the PR #12 description: add the new section under "Real evidence", and keep "no attribution footer".
