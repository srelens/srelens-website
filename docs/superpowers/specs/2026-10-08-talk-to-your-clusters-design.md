# srelens.com: "Talk to your clusters" (the Kubernetes kernel for AI)

Status: approved by Devesh on 2026-10-08. It builds on the terminal-native redesign (`2026-10-02-terminal-native-redesign-design.md`) and ships on the same branch (`redesign/terminal-native-copy`, PR #12).

## 1. Why

The review feedback from Shubham and Devesh on 2026-10-08:
- MCP is the one real thing srelens has that other Kubernetes tools lack.
- People increasingly work through chat agents.
- The pitch is a tool so good you install it and stop using it directly, the way you rely on a kernel: your agents use it instead. The name for that is "the Kubernetes kernel for AI".

The homepage should show that: an agent asks one question, and srelens answers it from several clusters at once.

## 2. Decisions already made

| Question | Decision |
|---|---|
| What is `srectl`? | The upcoming rename of the headless MCP server (today `srelens-tui --mcp-stdio`). |
| Naming before it ships | Position now, name later. No page says `srectl` until a release ships it. A test enforces this. |
| Where the kernel line lives | A new homepage section directly after the hero. The H1 and `<title>` stay unchanged. `/mcp/` repeats the line in its lede. |
| How the demo is made real | A real MCP session against three throwaway kind clusters, rendered in the site's own agent-session panel. No imitation of Cursor or any other app's UI, and no AI-written prose. |

## 3. What the visitor sees

A new section on `index.html`, between `</section>` of `<section class="hero">` and `<section class="section" id="workflow">`.

```
#talk-to-your-clusters · Talk to your clusters        (section label, like the others)
The Kubernetes kernel for AI.                          (H2)
<lead>                                                 (copy below)
┌ mcp · srelens — agent session ───────────────────┐   (.mini panel, as on /mcp/)
│ prompt  What's rolling out in default, across all │
│         my clusters?                              │
│ → k8s.listContexts                                │   (each real tool call, in order)
│ → k8s.listDeployments  kind-demo-eu  default      │
│ → k8s.listDeployments  kind-demo-us  default      │
│ → k8s.listDeployments  kind-demo-ap  default      │
├───────────────────────────────────────────────────┤
│ table: cluster · deployment · ready · up to date · available · age │ (returned JSON only)
└───────────────────────────────────────────────────┘
caption: Real tool calls and results: srelens-tui v0.15.0 --mcp-stdio,
         three local kind clusters. Any MCP client (Cursor, Claude Code,
         your own agent) makes the same calls.
```

The draft copy below goes to Devesh's review in the PR. Every claim in it has to stay true of v0.15.0.

- **Section label:** `#talk-to-your-clusters` · Talk to your clusters
- **H2:** The Kubernetes kernel for AI.
- **Lead:** "Install srelens once and you will rarely open it, because your agents do. Point any MCP client at it and ask in plain language: the answers come live from your clusters, through typed tools that are read-only unless you allow more."
  - Backed by the `--mcp-stdio` flags: destructive capabilities need `--allow-destructive`, and secret reads need their own flag (`apps/tui/src/cli.rs`).
- **/mcp/ lede:** append one sentence, "srelens is the Kubernetes kernel for AI: your agents use it so you don't have to." Meta descriptions do not change.

The `prompt` line is the example question the session answers. It is shown as the question, not as model output. The tool calls and the table come only from the recorded transcript.

## 4. The demo environment (throwaway)

- **Clusters:** three new single-node kind clusters, `demo-eu`, `demo-us` and `demo-ap`, created with an isolated kubeconfig, `.superpowers/capture/kubeconfig-mcp-host` (git-ignored).
  - The existing `srelens-demo` cluster, the user's own `srelens` cluster and `~/.kube/config` are never touched.
- **Workloads:** in `default` only, from committed manifests under `scripts/demo/mcp/`. They give a true rollout story the table shows at a glance:
  - `checkout` is fully rolled out in eu and us, but in ap its rollout is stuck: only 1 of 3 replicas is up to date, because the new pods never become ready;
  - `storefront` is fully available everywhere;
  - one Deployment has an unavailable replica, for example a resource request no node can fit.
  - Every image is a real public image and tag. (`k8s.listDeployments` returns no image, so the table cannot show one.)
- **Container kubeconfig:** the three internal kubeconfigs (`kind get kubeconfig --internal`), merged into `.superpowers/capture/kubeconfig-mcp`, with contexts `kind-demo-eu`, `kind-demo-us` and `kind-demo-ap`.
- **Cleanup:** after the capture is committed, the three clusters are deleted with the same `--kubeconfig`.

## 5. Capture and rendering

- **`scripts/demo/mcp-demo.sh`**
  - Runs in `ubuntu:24.04` on the `kind` Docker network, like `capture.sh`.
  - Installs the published `srelens-tui` v0.15.0 with the project's own installer.
  - Runs `srelens-tui --mcp-stdio` with `KUBECONFIG=/work/kubeconfig-mcp`.
  - Feeds it newline-delimited JSON-RPC: `initialize`, the `initialized` notification, `tools/call` for `k8s.listContexts`, then `k8s.listDeployments` `{context, namespace: "default"}` for each context. A wrong tool name shows up as a failed call, and the transcript is never hand-edited.
  - If a context must be connected first, the script makes the real call that does it, and that call shows in the transcript.
  - Writes every request and response line to `/work/out/mcp-rollouts.jsonl`.
- **`assets/captures/mcp-rollouts.jsonl`:** the committed transcript. It is not published (`assets/captures` is excluded), the same as the `.ansi` files.
- **`scripts/embed-mcp-demo.mjs`**
  - Exports a pure function `renderMcpDemo(transcriptLines) → html`.
  - Its CLI replaces the content between `<!-- mcp-demo:start -->` and `<!-- mcp-demo:end -->` in `index.html`. It is idempotent.
  - The table rows are built only from the `listDeployments` results.
  - Every text node is escaped. Columns: cluster (context), deployment, ready (`ready/desired`), up to date, available, age. These are the fields `DeploymentSummary` returns (`crates/kube/src/deployments.rs`).
  - A failed call renders as a failed call. It is never hidden.
- **Markup:**
  - the existing `.mini` / `.mini-bar` / `.mini-body` panel;
  - a `<table>` with `<caption>` and `<th scope="col">`;
  - a `<figcaption>` for the provenance line.
  - New CSS only where `.mini` lacks a rule (the table inside it), using `site.css` tokens only.

## 6. Tests (written first)

- `renderMcpDemo` on a small fixture transcript gives the expected rows. It escapes `<` and `&` in names, and it shows an error result as an error.
- The committed `index.html` block equals `renderMcpDemo(assets/captures/mcp-rollouts.jsonl)`, and running the embed twice changes nothing.
- The transcript contains `initialize`, a `listContexts` call and one `listDeployments` call per context, every response is a JSON-RPC result or error (no fabricated rows), and the server reports version 0.15.0.
- The privacy scan (`tests/lib/privacy.mjs`) covers the transcript. It has no home path, no owner name, and no context other than `kind-demo-*`.
- The new section is the first section after the hero, its H2 is "The Kubernetes kernel for AI.", and its table has a caption and column header scopes.
- No published page or llms file contains `srectl`.
- SEO: the baseline tests still pass. A new H2 and id are additions, which are allowed. Titles, meta and JSON-LD are unchanged.
- The page has no horizontal overflow at 1440, 768 and 390. The table scrolls inside its panel if it must.

## 7. Out of scope

- The `srectl` name. It goes in with the release that ships it, and the guard test is removed then.
- A Cursor screenshot.
- A /features/ version of this section.
- New JSON-LD or meta changes.
