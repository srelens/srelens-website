---
name: srelens
description: Terminal-native design system for the local-first Kubernetes control room, desktop app and srelens-tui as one product
colors:
  bg: "#fbfafc"
  surface: "#ffffff"
  sunk: "#f3f0f7"
  line: "#e4dfeb"
  line-strong: "#cfc7da"
  ink: "#1b1524"
  muted: "#675d74"
  brand: "#6d44c5"
  brand-ink: "#ffffff"
  hot: "#c2410c"
  ok: "#15803d"
  warn: "#a16207"
  bad: "#b91c1c"
  bg-dark: "#0f0d14"
  surface-dark: "#17141e"
  sunk-dark: "#131019"
  line-dark: "#2a2533"
  line-strong-dark: "#3a3346"
  ink-dark: "#ece8f3"
  muted-dark: "#9d94aa"
  brand-dark: "#a78bfa"
  brand-ink-dark: "#140f1f"
  hot-dark: "#fb923c"
  ok-dark: "#4ade80"
  warn-dark: "#facc15"
  bad-dark: "#f87171"
  term-bg: "#100d16"
  term-raised: "#1d1828"
  term-line: "#2a2433"
  term-fg: "#d9d3e3"
  term-dim: "#8b8398"
  term-ok: "#4ade80"
  term-bad: "#f87171"
  term-warn: "#facc15"
  term-key: "#67e8f9"
  term-brand: "#f472b6"
  term-border: "#7c3aed"
typography:
  display:
    fontFamily: '"Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace'
    fontSize: "clamp(32px, 4.5vw, 58px)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.045em"
  headline:
    fontFamily: '"Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace'
    fontSize: "clamp(24px, 2.6vw, 32px)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  body:
    fontFamily: '"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  data:
    fontFamily: '"Geist Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace'
    fontSize: "12.5px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
  terminal:
    fontFamily: '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace'
    fontSize: "13.5px"
    fontWeight: 500
    lineHeight: 1.65
  capture:
    fontFamily: '"Cascadia Mono", Menlo, Consolas, "DejaVu Sans Mono", "Liberation Mono", monospace'
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  control: "7px"
  card: "9px"
  frame: "10px"
spacing:
  gutter: "clamp(16px, 4vw, 40px)"
  section-y: "clamp(56px, 8vw, 96px)"
  control-x: "18px"
  wrap: "1200px"
  measure: "70ch"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-ink}"
    typography: "{typography.data}"
    rounded: "{rounded.control}"
    padding: "0 {spacing.control-x}"
    height: "44px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 {spacing.control-x}"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "22px"
  command-block:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.data}"
    rounded: "{rounded.card}"
    height: "46px"
  code-block:
    backgroundColor: "{colors.term-bg}"
    textColor: "{colors.term-fg}"
    typography: "{typography.terminal}"
    rounded: "{rounded.card}"
  terminal-capture:
    backgroundColor: "{colors.term-bg}"
    textColor: "{colors.term-fg}"
    typography: "{typography.capture}"
    rounded: "{rounded.frame}"
---

# Design System: srelens

## Overview

**Creative North Star: "Command line"**

srelens is one product with one Rust core and two front ends: the desktop app
and `srelens-tui`. The site is written as if it were a shell session so both
read as the same thing. Headings, labels, commands, key bindings and data are
monospace; running text is a proportional face at reading width. Navigation is a
path (`srelens / compare / k9s`). Evidence is real: desktop screenshots and
text captured from `srelens-tui`, both taken against the `srelens-demo` cluster.

The system is quiet and flat. Hierarchy comes from type scale, rules, spacing
and state color, not from decoration. Every page is complete at rest and readable
without JavaScript.

**Key Characteristics:**

- Real product evidence is the primary visual: desktop screenshots and
  `srelens-tui` text captures, both from v0.15.0 (see Evidence).
- Monospace is the voice of the system; Geist carries long reading.
- Two complete themes. The default follows the visitor's OS.
- Terminal surfaces (code blocks, captures, the incident drill) are dark in
  both themes.
- One warm accent per page at most, and only on the H1.
- Flat by default. Borders and tone group content; shadows are reserved.
- No scroll-reveal or entrance animation. The only motion is a 120ms fade when
  the homepage mode switch changes panel.

## Colors

Light values live on bare `:root` in `site.css`. Dark values are redefined under
`[data-theme="dark"]`, and again under `@media (prefers-color-scheme: dark)` on
`:root:not([data-theme])`, so a visitor without JavaScript still gets their OS
theme. The front matter above lists every token in both themes; the `-dark`
suffix marks the dark value, and a test checks each one against `site.css`.

### Roles

- **Page and surfaces** (`--bg`, `--surface`, `--sunk`): the page, cards and
  nav, and inset rows such as keycaps.
- **Lines** (`--line`, `--line-strong`): borders and rules, then hover borders
  and button outlines.
- **Text** (`--ink`, `--muted`): headings and body, then secondary text.
- **Brand** (`--brand`, with `--brand-ink` for text on it): links, the active nav
  item, the primary button and section labels.
- **Accent** (`--hot`): the warm end of the logo gradient, used for the single
  H1 accent phrase and nothing else.
- **State** (`--ok`, `--warn`, `--bad`): healthy, caution and failing.
- **Terminal** (`--term-bg`, `--term-fg`, `--term-dim` and the `--term-*` hues):
  the dark surface and syntax colors shared by code blocks, captures and the
  incident drill. They do not change with the theme.

### Named Rules

**The Theme Rule.** The theme follows the OS. An inline head script sets
`data-theme` on `<html>` from `?theme=light|dark`, then `localStorage`, then
`prefers-color-scheme`, falling back to dark. The `.theme-toggle` in the header
overrides it and remembers the choice. Desktop screenshots swap between
`.shot-dark` and `.shot-light`. Terminal surfaces stay dark in both themes.

**The Accent Rule.** At most one accent phrase per page, on the H1 only, in a
`<span class="accent">` of four words or fewer. `.accent` sets `--hot`. A longer
phrase is plain H1 text. On the homepage the accent is "kernel".

**The Status Color Rule.** Green, amber and red describe state. Brand violet
carries links and primary action. Neither becomes ambient decoration.

**The Evidence Elevation Rule.** Shadows (`--evidence-shadow`) belong to
screenshot frames (`.shot`) and terminal captures (`.tui`). The terminal-styled
demonstration panels (`.incident-drill` and `.mini`) take the same shadow because
they share the dark terminal surface. Nothing else is raised: marketing
containers stay flat.

## Typography

**Display, headline, labels and data:** Geist Mono (`--font-mono`)
**Body:** Geist (`--font-body`)
**Code blocks and terminal chrome:** JetBrains Mono (`--font-term`)
**Terminal captures:** the system grid stack (`--font-grid`)

**Character:** Geist Mono sets the shell voice: H1 to H3, the nav, the path
line, section labels, buttons, `kbd` and inline `code`. Geist keeps paragraphs,
lists, table cells and FAQ answers open and readable. Fonts load from Google
Fonts with `display=swap`.

### Hierarchy

- **Display:** H1 and `.display`, `clamp(32px, 4.5vw, 58px)`, weight 600, tight
  tracking.
- **Headline:** H2, `clamp(24px, 2.6vw, 32px)`. H3 is 16px.
- **Body:** 17px on a 1.6 line, with running text capped at 70ch (`--measure`).
- **Data:** 12.5 to 13px labels: eyebrows, path line, versions, captions.
- **Terminal:** code blocks at 13.5px, in the same face as the incident drill and
  the other terminal-styled panels.
- **Capture:** `.tui` text captures, up to 16px (`--tui-size`). The size scales
  with the frame through container query units, so the 120 columns fill it.

### Named Rules

**The Instrument Type Rule.** Monospace marks a machine-readable thing or a
structural label: a command, a path, a key, a version, a heading. Prose stays in
Geist, even on long-form pages.

**The Grid Font Rule.** `.tui` captures use `--font-grid`, not `--font-term`. The
Google Fonts subsets of JetBrains Mono lack U+2500–25FF, so box-drawing and
block glyphs would fall back to another font at another advance and the borders
would drift. `--font-grid` (Cascadia Mono, Menlo, Consolas, DejaVu Sans Mono,
Liberation Mono) draws letters and borders at one advance, so columns align.
JetBrains Mono stays for code blocks and terminal chrome, where there are no
box borders.

## Layout

Content is 1200px wide (`--wrap`) with a `--gutter` of 16 to 40px. Sections are
separated by a full-width rule and padded by `--section-y`, 56 to 96px. The header
is 56px (`--header-h`) and sticky.

Long-form pages (docs, guides, security, architecture) use a 70ch reading column
with the sticky `.content-nav` table of contents. Feature pages use editorial
rows (`.feature-row`): copy on the left, evidence on the right. A row that holds a
120-column capture stacks, because the capture needs the whole line; its font
scales so the 120 columns fit that line.

At 860px the header links collapse into a `<details>` menu, which works without
JavaScript, and multi-column groups stack. The five-cell `.bento` grid goes to
two columns at 1100px and one at 560px. The page body never scrolls sideways;
wide tables scroll inside their own containers and captures scale down to fit
theirs.

## Elevation & Depth

The system is flat by default. A 1px `--line` border and a change of tone
establish grouping. The only shadow is `--evidence-shadow`, a soft offset
shadow that lifts evidence off the page (see the Evidence Elevation Rule). No
glows, glass or gradients.

## Shapes

Radii come from three tokens: `--r-control` (7px) for buttons, toggles and
inputs, `--r-card` (9px) for panels, cards and command blocks, `--r-frame` (10px)
for product frames: screenshots, captures and dialogs. Small chips (inline
`code`, keycaps, copy buttons, nav links) use 5 to 6px.

## Components

### Header with path links

`.site-header` is a sticky 56px bar with a bottom rule: the logo and `srelens`,
then path links (`/features /tui /mcp /compare /docs /download /faq`) in
`.nav-links`, the `.theme-toggle`, and `github ↗`. The active section's link has
`aria-current="page"` and takes the brand color. Below 860px the links move into
the `.nav-menu` details element. There is no site search.

### Path line

`.crumbs` is the restyled breadcrumb under the header: `srelens / compare / k9s`,
monospace, with linked segments. It repeats the page's existing crumb text and
matches its `BreadcrumbList` JSON-LD item for item. Every subpage has one except
the 404 page.

### Section label

`.section-label` is the monospace label above an H2 that shows the section's
fragment (`#workflow`) and links to it. It always matches an existing `id`.

### Mode switch

On the homepage, `.modes` holds an ARIA tablist (`.mode-tabs`) with `1 desktop`
and `2 terminal`. Arrow keys move between tabs, and `1` and `2` switch panels
while a tab has focus. Desktop is the default and the choice is not saved. The
headline, lede and badge above it never change. Without JavaScript the tablist is
hidden and both panels render one after the other under a `.mode-label`.

### Keycaps

`kbd` is a small sunk chip with a heavier bottom border. A `.keys` row of keycaps
sits in a feature or capability card. When both apps have a binding for the same
thing, both show (`⌘K` and `:`). Every binding is verified against the released
v0.15.0 source before it appears.

### Buttons

- **Primary** (`.btn` with `.btn-primary`): solid `--brand`, `--brand-ink` text,
  monospace 600, 44px tall.
- **Secondary** (`.btn` with `.btn-ghost`): transparent with a 1px
  `--line-strong` outline and a tonal hover.
- **Focus:** a visible 2px `--brand` outline on every interactive element.

### Command block

`.cmd` is a `$` prompt, one command, and a `.copy-btn`, on a `--surface` card
with a `--r-card` corner. The `data-copy` attribute on the button holds the text
that is copied.

### Terminal capture

`.tui` is a `<pre>` inside a `.tui-figure`, with a caption saying what was
captured. The figure is a size container; the capture's font size is worked out
from its width (`--tui-cols` columns at `--tui-advance` em), never above
`--tui-size`. It is text, so it can be selected and searched. It is filled by
`scripts/embed-captures.mjs` from `assets/captures/*.ansi`, and a test fails if
the page differs from a fresh conversion. Spans inside a `.tui` carry inline
colors; that is the one place the site uses `style=""`.

### Code block

`.codeblock` is a dark `<pre>` with a `.copy-btn`, in `--font-term`, dark in both
themes. Syntax spans use the `--term-*` colors.

### Tables

`.compare-scroll` wraps a comparison table: monospace header row, row rules, no
zebra striping, a sticky first column, and its own horizontal scroll on narrow
screens. A yes or no cell gets a state mark from `--ok` or `--bad`.

### FAQ

`.faq-list` is native `<details>` and `<summary>` with a monospace `+` and `−`
marker. The markup matches the `FAQPage` JSON-LD, which lives on `/faq/` only.

### Cards and panels

Cards (`.dl-card`, `.guide-card`, `.compare-card`, `.bento-cell`, `.verdict`)
share a 1px `--line` border, a `--surface` fill, `--r-card` corners and 22px
padding, with no shadow.

### Incident drill

`.incident-drill` is the homepage `#workflow` signature: signal, diagnose and
act tabs on the dark terminal surface. It keeps its accessible tab markup and ids;
only the surface changed.

### 404

`.err-page` is a terminal panel (`.err-term`) showing
`$ curl -I https://srelens.com<path>` and `HTTP/2 404`, where `<path>` is filled from
`location.pathname` (static text without JavaScript), then path links to the main
pages. It keeps `noindex`.

## Evidence

Desktop screenshots and terminal captures are srelens v0.15.0 against the
`srelens-demo` kind cluster (1 control-plane, 2 workers). Desktop screenshots come
from `srelens-server` serving the app's "next" design in web mode, driven by
`scripts/shots/desktop-shots.mjs`. Terminal captures are real `srelens-tui` text
at 120×32, taken in tmux by `scripts/demo/capture-all.sh` and
`scripts/demo/capture.sh`.

Some images are not from that run: the desktop `mcp` view, which web mode cannot
show faithfully (the `keep` field in `scripts/shots/views.mjs`; its image is on no
page now), and the `srelens-tui` AI assistant screenshot, which needs a real
provider key and is replaced by a text capture once its owner runs the row. In web
mode port forwards are captured through the srelens server, so the Local column
shows its proxy URL and the alt text says so. Older `tui-*` screenshots also
remain where no text capture replaces them. The README has the full workflow.

## Do's and Don'ts

### Do:

- **Do** lead with real evidence: desktop screenshots and `srelens-tui` text
  captures, from the released version.
- **Do** keep terminal and code surfaces dark in both themes.
- **Do** take every color from a `site.css` token, and keep body-text pairs at
  4.5:1 or better in both themes.
- **Do** keep each page complete and readable without JavaScript.
- **Do** keep the visible focus ring and `aria-current` on the active nav link.
- **Do** show only key bindings verified against the released source.
- **Do** give every section label an `id` it links to.

### Don't:

- **Don't** use gradients on text or backgrounds. The logo keeps its own.
- **Don't** add a second accent phrase, or one longer than four words.
- **Don't** use green, amber or red as decoration.
- **Don't** put shadows on marketing containers.
- **Don't** set terminal box borders in `--font-term`; use `--font-grid`.
- **Don't** use inline `style=""` except on spans inside a `.tui` capture.
- **Don't** add scroll-reveal or entrance animation.
- **Don't** invent benchmarks, customer logos, testimonials or adoption numbers.
- **Don't** add a control with nothing behind it, such as a search box on a site
  with no search.
