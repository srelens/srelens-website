# srelens.com redesign: terminal-native (direction A, "Command line")

Date: 2026-10-02
Status: draft for review
Branch: `redesign/terminal-native`
Review artifact (mockups A/B/C): https://claude.ai/artifact/1PEPa7sryXhQmY53tj892A

## 1. Goal

Redesign all 23 HTML files of srelens.com in a terminal-native visual language
inspired by sofka.rs (not copied from it). The site must present both srelens
front ends, the desktop GUI and `srelens-tui`, as one product with one Rust core.

Direction A ("Command line") was chosen. It is applied with two refinements from
the review:

- Long-form pages (docs, guides, compare, FAQ, security, architecture) use A's
  quieter form: body text in a proportional face at reading width, monospace for
  headings, labels, commands and data only.
- B's "where am I" idea becomes a path line under the nav
  (`srelens / compare / k9s`). It is the restyled form of the existing
  `.crumbs` breadcrumb, keeps each page's existing crumb text, and is not a new
  bottom status bar.

## 2. Hard constraints

1. **No URL changes.** Every page that returns 200 today returns 200 after the
   redesign, at the same URL, with the same canonical. No page is removed or
   renamed.
2. **No new redirects, and one fewer.** No `http-equiv="refresh"`, no JS
   redirects, no host redirect rules. The one existing meta-refresh
   (`/docs/tui.html`) is removed (see section 8.3).
3. **No 404s from the site itself.** Every internal link and every `#fragment`
   link resolves. Internal page links use the canonical trailing-slash form
   (`/features/`, not `/features`) so no visitor or crawler takes a host 301 hop.
4. **SEO/AEO preserved, then improved.** Titles, meta descriptions, canonicals,
   H1 text, robots directives, OG/Twitter tags, JSON-LD, `sitemap.xml`,
   `robots.txt`, `llms.txt` and `llms-full.txt` keep their current values except
   for the deliberate fixes in section 8.
5. **Copy stays.** Page copy, headings and FAQ text are unchanged. The only text
   changes are factual fixes (version numbers), section labels introduced by the
   new design (section 5.3), and the visible path line, which repeats existing
   breadcrumb text.
6. **Real evidence only** (PRODUCT.md). Desktop images are the existing real
   captures. The text-rendered terminal is a real `srelens-tui` capture (section 7).
   No invented benchmarks, logos, testimonials or counts.
7. **No build step for the site.** Static HTML, one stylesheet, one script.
   Authoring tools (tests, the ANSI converter) are Node scripts with zero npm
   dependencies and are never published.

## 3. Visual system

### 3.1 Theme

Two complete themes. The default follows the OS: the existing inline head script
stays (`?theme=` param, then `localStorage`, then `prefers-color-scheme`, with
dark as the fallback) and still sets `data-theme` on `<html>`. The nav toggle
stays. Desktop screenshots keep the `.shot-dark` / `.shot-light` swap. Terminal
blocks and code blocks are dark in both themes.

### 3.2 Color tokens

Light values are defined on bare `:root` in `site.css`. Dark values are redefined
under `[data-theme="dark"]`, and again under
`@media (prefers-color-scheme: dark) { :root:not([data-theme]) }` so a visitor
without JS still gets their OS theme.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | `#fbfafc` | `#0f0d14` | page |
| `--surface` | `#ffffff` | `#17141e` | cards, nav, panels |
| `--sunk` | `#f3f0f7` | `#131019` | keycaps, inset rows |
| `--line` | `#e4dfeb` | `#2a2533` | borders, rules |
| `--line-strong` | `#cfc7da` | `#3a3346` | hover borders, table heads |
| `--ink` | `#1b1524` | `#ece8f3` | headings, body |
| `--muted` | `#675d74` | `#9d94aa` | secondary text |
| `--brand` | `#6d44c5` | `#a78bfa` | links, active nav, primary button |
| `--brand-ink` | `#ffffff` | `#140f1f` | text on `--brand` |
| `--hot` | `#c2410c` | `#fb923c` | the single H1 accent phrase |
| `--ok` / `--warn` / `--bad` | `#15803d` / `#a16207` / `#b91c1c` | `#4ade80` / `#facc15` / `#f87171` | state only |
| `--term-bg` / `--term-fg` | `#100d16` / `#d9d3e3` | same | terminal and code blocks |

`--hot` is the warm end of the logo gradient. Rules:

- **One accent phrase per page, on the H1 only.** The existing `<span class="grad">`
  in each H1 becomes `<span class="accent">` when it is four words or fewer.
  Longer spans render as plain H1 text. On the homepage the accent moves to
  "control room"; the H1 text itself does not change.
- **State colors describe state.** Green, amber and red never decorate.
- **No gradients on text or backgrounds.** The logo keeps its own gradient.

All body-text pairs meet WCAG AA (4.5:1). A test enforces this (section 9).

### 3.3 Typography

| Role | Face | Use |
|---|---|---|
| Display / headings / nav / labels / keycaps / commands | Geist Mono 500–700 | H1–H3, nav, path line, section labels, buttons, `kbd`, `code` |
| Body | Geist 400–600 | paragraphs, lists, table cells, FAQ answers |
| Terminal blocks | `--font-term` JetBrains Mono 500/700; `--font-grid` Cascadia Mono, Menlo, Consolas for `.tui` captures | The Google Fonts JetBrains Mono subsets have no U+2500–25FF, so box borders would fall back at another advance (Consolas 0.55em vs 0.6em) and drift; `--font-grid` draws letters and borders in one system font so columns align |

Scale: H1 `clamp(32px, 4.5vw, 58px)`, weight 600, line-height 1.08, tracking
-0.045em. H2 `clamp(24px, 2.6vw, 32px)`, weight 600. H3 16px. Body 17px / 1.6.
Small 14px. Labels 12.5–13px. Running text max 70ch. Fonts load from Google
Fonts with `display=swap` and preconnect, as today.

### 3.4 Layout and shape

- Content max width 1200px. Side gutter `clamp(16px, 4vw, 40px)`. Section
  padding 56–96px.
- Long-form pages: 70ch reading column with the existing sticky `.content-nav`
  table of contents where pages already have one.
- Radii: controls 7px, cards and panels 9px, product frames 10px.
- Elevation: flat. Only real product evidence (screenshot windows, terminal
  captures) gets a shadow, which keeps DESIGN.md's Evidence Elevation Rule.
- Motion: no scroll-reveal animations; every page is complete at rest. The mode
  switch uses a 120ms fade, disabled under `prefers-reduced-motion`.

## 4. Information architecture

Unchanged: same 23 files, same sitemap URLs, same section ids. Navigation:

- **Header nav** (all pages): logo + `srelens`, then path links
  `/features /tui /mcp /compare /docs /download /faq`, the theme toggle and
  `github ↗`. The active section's link gets `aria-current="page"` and brand color.
  Below 760px the links collapse into a `<details>` menu, which works without JS.
  There is no site search. The mockup's `⌘K` search control is dropped because
  the site has no search behind it.
- **Path line** (all subpages except `404.html`): `srelens / compare / k9s`, monospace, linked
  segments, the restyled `.crumbs` element. Segment text is the page's existing
  crumb text. It matches the page's BreadcrumbList JSON-LD exactly (section 8.2).
- **Footer** (all pages): grouped path links to every indexable page, including
  `/guides/`, `/security/` and `/architecture/`, which today are missing from the
  homepage footer. Plus license, current version, GitHub and releases links.

## 5. Components

Each component is a class family in `site.css`. Pages use these classes only;
inline `style=""` attributes are removed during migration. The one exception is
the generated terminal capture inside `<pre class="tui">`, whose spans carry
inline colors (section 7.2).

1. **Site header.** Section 4. Sticky, 56px, surface background, bottom rule.
2. **Path line.** Section 4.
3. **Section label.** A monospace label above each H2 that shows the section's
   fragment (`#workflow`) and links to it. Clicking copies the URL; this reuses
   the existing heading-anchor behavior in `main.js`. The label always matches an
   existing `id`.
4. **Mode switch** (homepage hero only). An ARIA tablist with two tabs,
   `1 desktop` and `2 terminal`. Arrow keys move between tabs. The `1` and `2`
   keys switch modes when focus is not in a text field and no modifier is held.
   The H1, the existing lede, the hero badge and the GitHub button sit above the
   tabs and never change, so no hero copy is rewritten. Each panel holds only its
   install action, its evidence and a one-line mono caption (desktop: the existing
   screenshot caption; terminal: "text capture · srelens-tui v0.15.0 on the same
   cluster · select it"). Without JS the tablist is hidden and
   both panels render one after the other, each with a small mono label
   (`desktop`, `terminal`), so all copy stays crawlable and readable. No extra
   headings are added. Desktop is the default. The choice is not persisted.
5. **Evidence window.** A screenshot frame with a mono title bar
   (`srelens · kind-srelens-demo · overview`) and the dark/light image pair.
   `width`/`height` attributes stay; the hero image stays preloaded.
6. **Terminal capture.** `<figure>` > `<pre class="tui" tabindex="0">` with a
   `<figcaption>` ("Text capture of srelens-tui v0.15.0 on the srelens-demo
   cluster. Select it."). Scrolls horizontally inside its own container. The
   page body never scrolls sideways.
7. **Command block.** `$ brew install srelens/tap/srelens-tui` plus a copy button,
   using the existing `[data-copy]` behavior.
8. **Keycap card.** A key row (`kbd`), H3 and paragraph. When a capability has
   bindings in both apps, both appear (`⌘K` · `:`). Every binding shown is
   verified against the released v0.15.0 source (section 7.3).
9. **Buttons.** Primary: `--brand` fill, mono 600 14px, 44px tall. Secondary:
   1px `--line-strong` outline. Visible 2px focus ring on both.
10. **Panels and cards.** 1px `--line` border, `--surface` fill, no shadow.
11. **Comparison table.** Mono header row, row rules, no zebra striping. On
    narrow screens it scrolls inside its own container with a sticky first column.
12. **FAQ.** Native `<details>`/`<summary>` (unchanged markup, so `FAQPage`
    JSON-LD still matches) with a mono `+` / `−` marker.
13. **Code block.** Dark in both themes, JetBrains Mono, copy button.
14. **Incident drill** (homepage `#workflow`). The existing signal → diagnose →
    act tabs keep their markup, ids and behavior, restyled as a bordered terminal
    panel.
15. **404 page.** A terminal-styled panel: `$ curl -I srelens.com<path>` →
    `HTTP/2 404`, where `<path>` is filled from `location.pathname` (static
    fallback text without JS), followed by path links to the main pages. Keeps
    `noindex`.

## 6. Page-by-page treatment

Every page: new header, path line (subpages), footer, `site.css`, section labels,
tokens. Page-specific work:

| Page | Treatment |
|---|---|
| `/` | Hero with mode switch (desktop screenshot / terminal capture). The incident drill moves from the hero into `#workflow`. The `#everything` cells get keycap rows for verified bindings. Sections `#workflow`, `#features`, `#everything`, `#learn`, `#compare`, `#download`, `#get-started`, `#faq` and the final CTA keep their ids and copy. |
| `/tui/` | Hero shows the terminal capture with the install command block. `#features` keeps the real `tui-*` screenshots. `#keybindings` becomes a keycap table verified against v0.15.0. `#compare` and `#download` are restyled. |
| `/features/` | Editorial rows keep the screenshot pairs. Each feature title gets its keycap row where a binding exists. |
| `/mcp/` | `#how`, `#setup` (config code blocks), `#example` and `#answers` are restyled. The safety flags (`--allow-destructive`, `--allow-sensitive-reads`) are shown as command blocks. |
| `/download/` | `#platforms` becomes a platform card grid. `#tui`, `#first-run` and `#get-started` use command blocks. `[data-asset]` links are unchanged. |
| `/compare/` + 6 guides | Comparison tables per component 11. The verdict blocks are restyled. |
| `/docs/`, `/docs/tui/` | Long-form treatment with the sticky TOC and scrollspy (existing JS). |
| `/docs/tui.html` | Section 8.3. |
| `/guides/` + 3 | Long-form treatment. `HowTo` steps become numbered steps (the order is real). |
| `/faq/` | Component 12. |
| `/security/`, `/architecture/` | Long-form treatment. The architecture diagram is restyled, not redrawn. |
| `/404.html` | Component 15. |

## 7. Real terminal capture

### 7.1 What

One capture of `srelens-tui` v0.15.0 (stable tag `srelens-v0.15.0`), showing the
pods view in all namespaces on the `srelens-demo` kind cluster, with the
crash-looping pod selected. Terminal size 120×32 (100×26 truncated the STATUS and NAME columns). It is used in the homepage
terminal panel and in the `/tui/` hero.

### 7.2 How

1. Recreate `srelens-demo` if needed (1 control-plane + 2 workers, the
   `payments` / `checkout` / `monitoring` workloads from README.md, including the
   crash-looping pod and metrics-server).
2. Run `srelens-tui` v0.15.0 inside `tmux` (macOS, Linux or WSL), navigate to the
   view, then `tmux capture-pane -p -e -t <pane> > capture.ansi`.
3. Commit the raw capture as `assets/captures/pods.ansi`, the source of truth.
   The folder is excluded from publishing (section 8.4).
4. `scripts/embed-captures.mjs` fills every
   `<!-- capture:pods:start --><!-- capture:pods:end -->` marker pair in the pages
   with `scripts/ansi-to-html.mjs` output. The converter maps SGR codes (16-color,
   256-color and truecolor, bold, dim, italic, underline, reverse) to inline-styled
   spans, HTML-escapes text, drops other escapes, and preserves spacing exactly.
   A test fails if an embedded capture differs from a fresh conversion.

### 7.3 Binding verification

Every key or `:command` shown on the site is checked against
`srelens/srelens` at tag `srelens-v0.15.0` (not `origin/dev`). Bindings that
exist only on dev, and help-screen entries that disagree with the handlers, are
not shown.

The same pass checks the numeric and capability claims already on `/tui/` and in
`llms*.txt` (`<15ms` startup, `0ms` informer cache, `<25MB` memory, "up to 90%"
prompt-caching savings, `Shift + D` / `Shift + N` / `Shift + F` bindings). The
findings go to Devesh as a table before any copy changes. Claims without
first-party evidence are removed or corrected only with his sign-off, which is
the one exception to "copy stays".

### 7.4 Fresh screenshots of every feature

Added 2026-10-02 at Devesh's request. All product imagery is recaptured from
srelens built from source at tag `srelens-v0.15.0`, run from a dedicated
worktree of the local srelens repo (`C:\Users\vrshu\work\srelens\srelens`).

- **Worktree.** `<srelens>/.claude/worktrees/site-evidence-v0.15.0`, detached at
  the tag. Before any work in it: copy `CLAUDE.local.md` from the main checkout,
  build its own GitNexus index
  (`gitnexus analyze . --index-only --name srelens-site-evidence --force`), run
  the agentmemory health check and recall. Nothing in srelens is modified or
  committed; the worktree is removed when the evidence is done.
- **Cluster.** `srelens-demo` is extended with what each feature needs to show
  real state, as identified in the v0.15.0 analysis: a Helm release, Argo CD with
  an Application, BGP resources, simulated GPU nodes (kwok), metrics-server.
- **Desktop.** The native app is not run on this machine: its vault master key
  lives in Windows Credential Manager and its settings path is hard-coded to the
  real `%APPDATA%app.srelens.desktop` profile, so a dev build could overwrite
  Devesh's real vault key and settings. Desktop views are captured in the repo's
  own web mode instead: `srelens-server` built in the worktree serves the same
  React UI with an isolated data dir and a dev login, and only the srelens-demo
  kubeconfig is uploaded. A zero-dependency Node script drives headless Chrome
  over the DevTools Protocol: it sets design, app theme and namespace, opens each
  view, and captures it at a 1600×974 viewport with device scale 1.5.
  Tauri-only views (assistant, Apps, toolbox installs) keep their existing images.
  That gives 2400×1461 WebP at quality 82, the same size as today's images.
  Existing file names are kept (`assets/shots/{dark,light}-<view>.webp`), so the
  existing `<img>` markup, dimensions and alt text stay valid. Views that are new
  to the site get new files with the same naming.
- **TUI.** Every TUI feature that renders from cluster state is captured as text
  (method in 7.2) and embedded with capture markers, replacing the `tui-*` images
  on `/tui/` and `/docs/tui/` where a capture exists. Two images stay: the AI
  assistant (it needs a real provider key, which Claude does not enter; Devesh
  can capture it) and the Cursor MCP agent screenshots (a third-party app).
- **New features.** A feature that exists in v0.15.0 but is not on the site today
  gets a new screenshot and a short new description. That text is new copy, and
  Devesh reviews it together with the screenshot set before merge.
- **Honesty.** Every image shows srelens v0.15.0 against `srelens-demo`. No mocked
  data and no pixel edits beyond cropping.

## 8. SEO and AEO

### 8.1 Preserved

A baseline snapshot of every page's title, meta description, canonical, robots,
H1 text, OG/Twitter tags, JSON-LD and outgoing internal links is generated from
`main` before any page changes (`tests/fixtures/seo-baseline.json`). Tests compare
the redesigned pages with it. Only the changes in 8.2 to 8.4 are allowed, and each
one is listed in the test as an explicit expected difference.

### 8.2 Fixes

1. **Version.** `softwareVersion` in the JSON-LD on `/` and `/tui/` goes from
   `0.3.0` to `0.15.0`, and all ten `data-version` fallback labels go from `v0.3.0`
   to `v0.15.0`. A test requires every occurrence to agree. `main.js` still
   rewrites the labels from the GitHub Releases API at runtime.
2. **BreadcrumbList JSON-LD** is added to the 14 subpages that lack it
   (`architecture`, `compare/{aptakube,freelens,headlamp,k9s,kubernetes-dashboard}`,
   `docs`, `docs/tui`, `guides` + 3, `security`, `tui`). It matches the visible
   path line item for item. `docs/tui.html` inherits it through the mirror (8.3).
3. **OG/Twitter tags and images** for the 8 pages that have none
   (`architecture`, `docs`, `docs/tui`, `guides` + 3, `security`). New 1200×630
   PNGs are rendered from one HTML card template in the new style with headless
   Chrome (`--screenshot`) and saved to `assets/og/`. `/tui/` switches its
   `og:image` from a WebP to a new `og-tui.png`, because PNG and JPG have the
   widest support across link-preview clients. That makes 9 new cards. Existing
   `og-*.jpg` files stay.
4. **Robots** are normalised to
   `index, follow, max-image-preview:large, max-snippet:-1` on every indexable
   page. Eight pages currently use plain `index, follow` (the same 8 as above).
   `404.html` stays `noindex`.
5. **`sitemap.xml`**: `lastmod` is bumped on every changed page. The URL set is
   unchanged.
6. **`llms.txt` / `llms-full.txt`**: checked for stale facts (version, page list)
   and corrected. The structure is unchanged.
7. **`vercel.json`**: `trailingSlash` changes from `false` to `true` so it agrees
   with the canonicals. The site is served by GitHub Pages today, but a future
   Vercel deploy must not start redirecting `/features/` to `/features`.

### 8.3 `/docs/tui.html`

Today this file is a meta-refresh redirect to `/docs/tui/`, and it is also what
GitHub Pages serves at `/docs/tui`. It becomes a byte-identical copy of
`docs/tui/index.html`, whose canonical already points to
`https://srelens.com/docs/tui/`. Both URLs return 200 with real content, there
is no redirect, and the canonical consolidates ranking signals to `/docs/tui/`.
A test fails if the two files ever differ.

### 8.4 Internal files are no longer published

GitHub Pages runs Jekyll on this repo, which publishes repo-internal files. Today
these return 200 on srelens.com: `/README.md`, `/PRODUCT.md`, `/DESIGN.html`,
`/vercel.json`, and the July spec as both
`/docs/superpowers/specs/2026-07-30-real-screenshots-redesign-design.md` and
`.html`. They are thin, unbranded pages on the product's domain. They are not in
the sitemap, and nothing links to them.

A `_config.yml` adds an `exclude:` list covering `README.md`, `PRODUCT.md`,
`DESIGN.md`, `docs/superpowers/`, `tests/`, `scripts/`, `assets/captures/` and
`vercel.json`. Jekyll already skips `_headers` and dot-folders such as
`.impeccable/`. `install.sh`, `CNAME`, `robots.txt`, `sitemap.xml` and the
`llms*.txt` files stay published. **These URLs will return 404
after the change.** They are not site pages, but this is the one deliberate 404
change, so it needs explicit sign-off in review. HTML pages have no front matter
and are copied verbatim, so no site page changes behavior.

## 9. Testing

Zero-dependency Node tests, run with `node --test`. They follow TDD: each
behavior gets a failing test first.

| Test file | Guards |
|---|---|
| `tests/urls.test.mjs` | The set of published HTML files equals the baseline 23. Every sitemap `<loc>` maps to a file. No `http-equiv="refresh"` anywhere. Every internal `href`/`src` resolves to a file. Internal page links use the trailing-slash form. Every `#fragment` link resolves to an `id` on its target page. |
| `tests/seo.test.mjs` | Per page against the baseline: title, description, canonical, H1 text, OG/Twitter. JSON-LD parses and keeps its types. Expected differences from section 8.2 only. BreadcrumbList on every subpage matches the path line. Every indexable page has an `og:image` whose file exists. Robots values. |
| `tests/version.test.mjs` | `softwareVersion` and every `data-version` fallback agree. |
| `tests/docs-tui-mirror.test.mjs` | `docs/tui.html` equals `docs/tui/index.html`. |
| `tests/shell.test.mjs` | Every page links `/site.css` and `/main.js`, has the theme-init script, the skip link, the header nav with exactly one `aria-current="page"` (none on `/` and `404.html`), the path line on subpages except `404.html`, and the footer. No inline `style=""` attributes. |
| `tests/contrast.test.mjs` | Reads the token values from `site.css` and checks text/background pairs for 4.5:1 in both themes. |
| `tests/jekyll.test.mjs` | `_config.yml` excludes the internal paths in section 8.4. |
| `tests/ansi-to-html.test.mjs` | Converter: 16-color, 256-color and truecolor SGR, bold, reset, reverse, HTML escaping, exact spacing, box-drawing passthrough. |
| `tests/captures.test.mjs` | Every embedded capture equals a fresh conversion of its `.ansi` source. |
| `tests/copy.test.mjs` | Every baseline `id` and every baseline H2/H3 text still exists on its page, apart from changes Devesh signs off in the claims check (section 7.3). |

Behavior in the browser (mode switch tabs and keys, theme toggle, copy buttons,
TOC scrollspy, incident drill, tour dialog, 404 path fill) is verified with
scripted checks in a real browser for each page group. Every page is
screenshotted at 1440, 768 and 390 widths in light and dark, and the set is
reviewed by Devesh before the PR is merged.

## 10. Files

| File | Change |
|---|---|
| `site.css` | New. The whole design system: tokens, base, components, page sections. |
| `main.js` | Keeps all current behavior. Adds the mode switch and the 404 path fill. Drops the reveal-on-scroll code. |
| `styles.css`, `enterprise.css` | Left in place, unreferenced, so HTML cached at the edge for the next 10 minutes never requests a missing file. Deleted in a follow-up PR after one release. |
| 23 HTML files | Migrated to the new shell and components. |
| `_config.yml` | New (section 8.4). |
| `_headers` | Cache rule for `/site.css`. |
| `assets/og/*.png` | 9 new cards (section 8.2.3). |
| `assets/captures/` | Raw ANSI capture source (unpublished). |
| `scripts/` | Authoring tools, unpublished: `pages.mjs` (page manifest), `shell.mjs` and `apply-shell.mjs` (shared header, path line, footer, head links, BreadcrumbList), `ansi-to-html.mjs`, `embed-captures.mjs`, `seo-baseline.mjs`, `og-card.html` and `og-cards.mjs`, `shots/` (desktop screenshots in web mode) and `demo/` (kind cluster, feature extras and TUI capture scripts). |
| `tests/` | Section 9 (unpublished). |
| `DESIGN.md`, `.impeccable/design.json` | Rewritten for the new system. |
| `README.md` | Updated structure section, test command and capture workflow. |
| `sitemap.xml`, `llms.txt`, `llms-full.txt`, `vercel.json` | Section 8.2. |

## 11. Out of scope

- Copy rewrites or new messaging.
- New pages or URL changes.
- Site search.
- Recorded terminal sessions (asciinema). The existing product-tour MP4/GIF
  stays.
- Benchmarks, a mascot or story section, or any claim without first-party
  evidence.
- Fixing the srelens-tui help-screen mismatches. That is in the srelens repo and
  tracked separately.

## 12. Delivery

One branch (`redesign/terminal-native`) and one PR. Commits go in this order:
baseline and tests, shell and design system, then page groups (home, tui,
features/mcp/download, compare, docs, guides, faq/security/architecture/404),
then SEO fixes and OG cards, then docs updates. The PR merges only after the
full test suite passes and the screenshot review is approved.
