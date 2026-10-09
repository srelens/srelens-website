# srelens website

Marketing site for [srelens](https://srelens.com) — the Kubernetes desktop workspace built in Rust.

Pure static HTML/CSS/JS. No build step, no framework, no dependencies. Deploy the directory as-is to any static host. The authoring tools in `scripts/` and the tests in `tests/` are plain Node scripts with no npm dependencies, and neither is published.

## Structure

```
index.html          landing page (SoftwareApplication + WebSite + Organization JSON-LD)
features/           feature deep-dive with 17 real workflows in both themes
tui/                dedicated landing page for the pure-Rust Terminal UI (srelens-tui)
mcp/                the built-in MCP server for AI agents (setup + example)
compare/            comparison hub + Lens, Headlamp, K9s, Freelens/OpenLens,
                    Aptakube, and Kubernetes Dashboard alternative guides
download/           installers for macOS / Windows / Linux + srelens-tui CLI + build from source
faq/                full FAQ (FAQPage JSON-LD lives here, and only here)
docs/               operator quick start and product documentation (includes docs/tui/)
guides/             SRE runbooks for CrashLoopBackOff, OOMKilled, and failed rollouts
security/           desktop, MCP, package, and web-deployment security boundaries
architecture/       React, Tauri, Rust capability registry, kube-rs, and MCP system map
404.html            not-found page
site.css            the whole design system: tokens, base, components, page sections
main.js             progressive enhancement only — pages work without JS
_config.yml         Jekyll excludes that keep repo-internal files off srelens.com
robots.txt          crawler policy + sitemap pointer
sitemap.xml         all public pages
llms.txt            AI/answer-engine summary of the product (AEO)
llms-full.txt       extended version with screenshot + demo-cluster inventory
site.webmanifest    PWA manifest
_headers            security + cache headers (Netlify / Cloudflare Pages)
vercel.json         same headers for Vercel
assets/             logos, favicons, OG sources
assets/shots/       product screenshots (webp, 2400w, desktop dark-*/light-* and tui-*)
assets/captures/    raw ANSI sources of the srectl text captures (not published)
assets/og/          1200x630 OG cards per page (jpg and png)
assets/media/       17-second product walkthrough in MP4 and GIF formats
scripts/            authoring tools: shared shell, captures, screenshots, OG cards, review shots (not published)
tests/              zero-dependency tests for URLs, SEO, shell, contrast, captures, docs (not published)
docs/superpowers/   design spec and plans for the terminal-native redesign (not published)
PRODUCT.md          durable product truth for future site work
DESIGN.md           the design system: tokens, rules, components, evidence
.impeccable/        design.json, the machine-readable design system
```

## Tests

```sh
node --test
```

Zero dependencies. Run it bare from the repo root: `node --test tests/` fails on Node 24 (it looks for a module called `tests`). The tests guard the published page set, every internal link and fragment, the SEO baseline, version agreement, the shared shell, WCAG contrast of the `site.css` tokens, the embedded terminal captures, and the design docs against `site.css` (`tests/docs.test.mjs`).

## Shared shell

The header, path line, footer, head links, `BreadcrumbList` JSON-LD, robots tag and Open Graph tags are generated, not hand-edited. To change them, edit `scripts/pages.mjs` (the page manifest: current nav link, crumb text, OG card) or `scripts/shell.mjs` (the markup), then run:

```sh
node scripts/apply-shell.mjs --all
```

or name pages: `node scripts/apply-shell.mjs index.html tui/index.html`. It also refreshes `docs/tui.html`, which is a byte-identical copy of `docs/tui/index.html` (a test fails if they differ).

## Screenshots

Desktop screenshots show srelens v0.15.0 connected to a live 3-node kind cluster (`srelens-demo`: 1 control-plane + 2 workers). The demo workloads (`scripts/demo/workloads.yaml`) span `payments` / `checkout` / `monitoring` and include a deliberately crash-looping pod (`ledger-worker`) and metrics-server for live usage numbers. `scripts/demo/extras.sh` adds a Helm release with two revisions, Argo CD with an Application, and MetalLB peering with an FRR router for BGP.

They are captured in web mode, not from the native app. `srelens-server`, built from the srelens repo at the release tag, serves the same React UI ("next" design) with an isolated data directory and a dev login, and only the `srelens-demo` kubeconfig is uploaded. The native app is never run for this, because its settings and vault key live in the real user profile and OS credential store.

```sh
node scripts/shots/desktop-shots.mjs \
  --srelens=<srelens worktree with target/debug/srelens-server.exe built> \
  --kubeconfig=.superpowers/capture/kubeconfig-host \
  [--context=kind-srelens-demo] [--only=overview,pods] [--themes=dark,light] [--out=assets/shots]
```

It drives headless Chrome over the DevTools Protocol (set `CHROME` if it is not at the default path) at a 1600×974 viewport with device scale 1.5, and writes `assets/shots/{dark,light}-<view>.webp` at 2400×1461, quality 82. Each view's route, the text that proves it has synced, and any click steps live in `scripts/shots/views.mjs`. Add a view there to capture a new one.

One view carries a `keep` field and is skipped by a full run: `mcp`. Web mode cannot show it faithfully (the MCP server pane exists only in the desktop app), and its image is on no page now; `--only=mcp` still captures it. `port-forwards` is captured in web mode, where the Local column shows the srelens server proxy URL (`http://127.0.0.1:8791/pf/1/`) instead of the desktop `127.0.0.1:8080`, and the alt text on `/features/` says so. One image is kept on purpose until its text capture exists: the `srectl` AI assistant screenshot (see "Assistant capture" below; it needs a real provider key).

## Terminal capture

The terminal blocks are real `srectl` v0.16.0 text, not mock-ups. Everything uses an isolated kubeconfig, `.superpowers/capture/kubeconfig-host` (context `kind-srelens-demo`). `~/.kube/config` is never read or written, and no other cluster is touched. The `.superpowers/capture/` folder is working space and is not part of the site.

```sh
# 1. the cluster, with its own kubeconfig
kind create cluster --config scripts/demo/kind.yaml --kubeconfig .superpowers/capture/kubeconfig-host
K="kubectl --kubeconfig .superpowers/capture/kubeconfig-host --context kind-srelens-demo"
$K apply -f scripts/demo/workloads.yaml
$K apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
$K -n kube-system patch deployment metrics-server --type=json \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
bash scripts/demo/extras.sh        # Helm, Argo CD, BGP

# 2. an in-network kubeconfig and the capture scripts, for the container
kind get kubeconfig --name srelens-demo --internal > .superpowers/capture/kubeconfig
cp install.sh scripts/demo/capture.sh scripts/demo/capture-all.sh scripts/demo/tui-captures.tsv .superpowers/capture/

# 3. capture inside Docker on the kind network (MSYS_NO_PATHCONV=1 keeps Git Bash from rewriting /work)
MSYS_NO_PATHCONV=1 docker run --rm --network kind -v "$(pwd -W 2>/dev/null || pwd)/.superpowers/capture:/work" \
  -e KUBECONFIG=/work/kubeconfig ubuntu:24.04 bash /work/capture-all.sh
```

`scripts/demo/capture-all.sh` installs the pinned `srectl` (`VERSION=0.16.0`) in the container with the repo's own `install.sh` (the `cp` above puts it at `/work/install.sh`; the scripts never fetch the live one), then captures every row of `scripts/demo/tui-captures.tsv` in tmux at 120×32 (100 columns truncated the STATUS and NAME columns), writing `.superpowers/capture/out/<name>.ansi`. Add `-e ONLY=overview,helm` to the `docker run` to capture only those rows. The homepage and `/tui/` hero capture, the pods view with `ledger-worker` selected, comes from `scripts/demo/capture.sh` the same way (`-e JUMP=<n>` moves the selection down n rows; the TUI sorts pods by name) and writes `pods.ansi`. The `gpu` row needs a simulated node: install kwok v0.6.1, apply `scripts/demo/extras/gpu.yaml`, capture with `ONLY=gpu`, then remove them again. Its caption says the node is simulated. A row's optional fourth column is the number of seconds to wait after its keys before the screen is read (only `assistant` uses it, to wait for the model). The script also points `api.github.com` at localhost inside the container, so srectl's startup update check cannot add a "newer release" notice to a capture of the pinned version.

Copy the `.ansi` files into `assets/captures/`, then embed them:

```sh
node scripts/embed-captures.mjs
node --test
```

Pages hold `<!-- capture:NAME:start --><!-- capture:NAME:end -->` marker pairs. The embed script fills each one from the `.ansi` file of the same name in `assets/captures/`, through `scripts/ansi-to-html.mjs`, and `tests/captures.test.mjs` fails if an embedded capture differs from a fresh conversion or shows a loading screen, an update banner or a stray host path.

### Assistant capture (needs your AI key)

The `assistant` row opens the AI assistant (`:ai`) on `kind-srelens-demo` and asks "Why is ledger-worker in payments crash-looping?", then waits 90 seconds for the answer. It needs a provider key, which this repo never holds, so it is run by hand. A key goes to the container only as an environment variable of that one `docker run`: `-e ANTHROPIC_API_KEY` with no value makes Docker copy it from your shell (set it there first), so it is never typed into the command, written to a file or printed. `capture-all.sh` also keeps it from the installer it runs. `OPENAI_API_KEY` and `GEMINI_API_KEY` are passed through the same way, but srectl v0.16.0 defaults to the Anthropic provider with the model `claude-3-7-sonnet-20250219` (`apps/tui/src/ai_config.rs:60` and `:149` in the v0.16.0 source), so they are only used once its provider setting is changed. If Anthropic has retired that model, the capture shows an API error and the privacy scan refuses it, so set a current model in srectl's AI settings first.

With the cluster up and step 2 above repeated (so the container has the current script and rows), run it from the repo root:

```sh
MSYS_NO_PATHCONV=1 docker run --rm --network kind -v "$(pwd -W 2>/dev/null || pwd)/.superpowers/capture:/work" \
  -e KUBECONFIG=/work/kubeconfig -e ANTHROPIC_API_KEY -e ONLY=assistant ubuntu:24.04 bash /work/capture-all.sh
```

A run without `ONLY=assistant` captures every row, this one included; without a key that row shows "No API key configured" and `tests/captures.test.mjs` refuses the file. Then:

1. Read `.superpowers/capture/out/assistant.ansi`. It must show a real answer about `ledger-worker` (no error, no "No API key configured"). Its per-reply "tokens" line is allowed; a key, an error banner, another context or a host path is not, and `node --test` checks that.
2. Copy it into `assets/captures/`.
3. On `/tui/` (`#ai-assistant`) and `/docs/tui/` (`#ai-assistant`), replace the `tui-assistant.webp` `<figure class="shot">` with a `tui-figure` block like the other captures: a `<pre class="tui" tabindex="0" role="region" aria-label="srectl AI assistant answering a question about ledger-worker, text capture">` holding `<!-- capture:assistant:start --><!-- capture:assistant:end -->`, and a `<figcaption>` ending ` · text capture from v0.16.0`. Add `assistant` to `PLACED` in `tests/tui.test.mjs` and move `tui-assistant.webp` from `KEPT` to `REPLACED` there (and update the screenshot count in `tests/longform.test.mjs`) first, so the page change starts from a failing test.
4. Fill the marker with `node scripts/embed-captures.mjs`, mirror the page with `cp docs/tui/index.html docs/tui.html`, and run `node --test`. Keep `assets/shots/tui-assistant.webp` on disk.

### MCP demo

The "Talk to your clusters" panel on the homepage is one real `srectl --mcp-stdio` session, recorded as JSON-RPC lines in `assets/captures/mcp-rollouts.jsonl` (and the version it ran in `mcp-rollouts.version`). It needs three throwaway kind clusters, `kind-demo-eu`, `kind-demo-us` and `kind-demo-ap`, all in the isolated kubeconfig `.superpowers/capture/kubeconfig-mcp-host`. In `ap` the `checkout` rollout is stuck at 1 of 3 up to date, and in `us` one `ledger` replica stays Pending. The transcript is never edited by hand; if a call fails, fix the script and re-run.

```sh
bash scripts/demo/mcp-clusters.sh create     # three kind clusters, workloads, and the in-network kubeconfig-mcp
cp install.sh scripts/demo/mcp-demo.sh .superpowers/capture/
MSYS_NO_PATHCONV=1 docker run --rm --network kind -v "$(pwd -W 2>/dev/null || pwd)/.superpowers/capture:/work" ubuntu:24.04 bash /work/mcp-demo.sh
cp .superpowers/capture/out/mcp-rollouts.jsonl .superpowers/capture/out/mcp-rollouts.version assets/captures/
node scripts/embed-mcp-demo.mjs              # render the transcript into index.html
bash scripts/demo/mcp-clusters.sh delete     # remove the three clusters
```

## OG cards

```sh
npx --yes http-server . -p 8080 -c-1 --silent     # in one shell
node scripts/og-cards.mjs                         # in another; optional argument: the base URL
```

Renders a 1200×630 PNG with headless Chrome (a throwaway profile; set `CHROME` if it is not at the default path) from `scripts/og-card.html` into `assets/og/` for every page in `scripts/pages.mjs` that names an `ogCard`. The title and path come from each page's H1 and canonical URL, so re-run it after an H1 changes.

## Review screenshots

```sh
npx --yes http-server . -p 8080 -c-1 --silent     # in one shell
node scripts/screens.mjs                          # in another; optional argument: the base URL
```

Renders every page at 1440, 768 and 390 px wide in both themes (`?theme=light|dark`) with headless Chrome (a throwaway profile; set `CHROME` if it is not at the default path) into `.superpowers/screens/final/<page>-<width>-<theme>.png`: 23 pages × 3 widths × 2 themes = 138 files. Each shot is as tall as its page, so long pages (`/docs/tui/` runs past 25,000 px at 390) are not cut off: Chrome is driven over DevTools (`scripts/shots/cdp.mjs`), the page loads in a window taller than any page so every lazy image has loaded, its own height is read, and the shot is clipped to it. The folder is emptied at the start of each run, is not part of the site, and nothing is committed. It is for a human to page through before a release; nothing asserts on the pixels.

## Deploy

Any of these work with zero config:

- **Netlify**: drag the folder into the dashboard, or `netlify deploy --prod --dir .`
- **Vercel**: `vercel --prod`
- **Cloudflare Pages**: create a project, upload the directory
- **GitHub Pages**: push to a repo, enable Pages on the root. Pages builds with Jekyll, so `_config.yml` excludes `README.md`, `PRODUCT.md`, `DESIGN.md`, `docs/superpowers`, `tests`, `scripts`, `assets/captures` and `vercel.json`, which would otherwise be published.

## Installation script

`https://srelens.com/install.sh` serves the Linux `srectl` installer as a
static shell script. `install.sh` is copied verbatim from
[`srelens/srelens:packaging/install/install.sh`](https://github.com/srelens/srelens/blob/main/packaging/install/install.sh)
(source blob `858b6ff69ef8689fb8dba679db426dd635fe19f4` at `srelens-v0.16.0`). It
still installs a release cut before the rename, whose archives are named
`srelens-tui-…`, as `srectl`. Refresh this copy when the upstream installer
changes (`git -C <srelens checkout> show srelens-vX.Y.Z:packaging/install/install.sh > install.sh`);
GitHub Pages cannot proxy the upstream URL. Run `sh -n install.sh` before
publishing an update. The capture scripts install with this copy, not the live URL.

## Release bump

`main.js` rewrites `[data-version]` labels and `[data-asset]` hrefs from the GitHub Releases API at load; the hardcoded values are the no-JS fallback. When a new stable release (`srelens-vX.Y.Z`) ships:

1. Update `RELEASE` in `tests/version.test.mjs`.
2. Update `softwareVersion` in the JSON-LD on `/` and `/tui/`.
3. Update the `<span data-version>` fallback labels and the fallback download URLs (`releases/download/srelens-vX.Y.Z/…`; the asset names carry the version too). `node scripts/apply-shell.mjs --all` re-renders the footer's version from the homepage JSON-LD.
4. Re-capture the evidence for the new version: the desktop screenshots (`node scripts/shots/desktop-shots.mjs`), then the terminal captures (refresh `install.sh` from the new tag first, then run `capture.sh` and `capture-all.sh` with `VERSION=X.Y.Z`, then `node scripts/embed-captures.mjs`). Update the captions that name the version.
5. Run `node --test`. Every `softwareVersion`, `data-version` label and download URL must agree with `RELEASE`.
6. Bump `lastmod` in `sitemap.xml`.

## SEO / AEO checklist (already included)

- Unique title, meta description, canonical, OG/Twitter image per page
- JSON-LD: `SoftwareApplication` (with real screenshots), `WebSite`, `Organization`,
  `BreadcrumbList` on subpages, `FAQPage` on /faq/ only
- `robots.txt` + `sitemap.xml` + `llms.txt` + `llms-full.txt`
- Semantic HTML (single `h1` per page, real `<details>` FAQ matching the schema)
- Images: webp, explicit width/height, descriptive alt text, lazy-loaded below
  the fold, hero preloaded
- Accessible: skip link, visible focus states, `prefers-reduced-motion` respected

## Local preview

```sh
npx --yes http-server . -p 8080 -c-1 --silent
# open http://localhost:8080
```
