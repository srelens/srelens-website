# srelens website

Marketing site for [srelens](https://srelens.com) — the Kubernetes desktop workspace built in Rust.

Pure static HTML/CSS/JS. No build step, no framework, no dependencies. Deploy the directory as-is to any static host.

## Structure

```
index.html          landing page (SoftwareApplication + WebSite + Organization JSON-LD)
features/           feature deep-dive with 14 real workflows in both themes
mcp/                the built-in MCP server for AI agents (setup + example)
compare/            comparison hub + Lens, Headlamp, K9s, Freelens/OpenLens,
                    Aptakube, and Kubernetes Dashboard alternative guides
download/           installers for macOS / Windows / Linux + build from source
faq/                full FAQ (FAQPage JSON-LD lives here, and only here)
docs/               operator quick start and product documentation
guides/             SRE runbooks for CrashLoopBackOff, OOMKilled, and failed rollouts
security/           desktop, MCP, package, and web-deployment security boundaries
architecture/       React, Tauri, Rust capability registry, kube-rs, and MCP system map
404.html            not-found page
styles.css          all styles (design tokens at the top; .shot = screenshot frame)
enterprise.css      enterprise operations-brief visual system shared by every page
main.js             progressive enhancement only — pages work without JS
robots.txt          crawler policy + sitemap pointer
sitemap.xml         all public pages
llms.txt            AI/answer-engine summary of the product (AEO)
llms-full.txt       extended version with screenshot + demo-cluster inventory
site.webmanifest    PWA manifest
_headers            security + cache headers (Netlify / Cloudflare Pages)
vercel.json         same headers for Vercel
assets/             logos, favicons, OG sources
assets/shots/       app-only product screenshots (webp, 2400w, dark-*/light-*)
assets/og/          1200x630 OG images per page (jpg)
assets/media/       17-second product walkthrough in MP4 and GIF formats
PRODUCT.md          durable product truth for future site work
DESIGN.md           enterprise design tokens, patterns, and guardrails
```

## Screenshots

Every product image is a real capture of srelens connected to a live 3-node kind
cluster (`srelens-demo`: 1 control-plane + 2 workers) with demo workloads across
`payments` / `checkout` / `monitoring` namespaces, including a deliberately
crash-looping pod and metrics-server for live usage numbers. Captured as an
app-only 3456×2168 window in both themes, cropped below the 64px title bar, and
encoded as 2400×1461 WebP (`cwebp -q 82`).
The site's theme toggle swaps `.shot-dark` / `.shot-light` images.

To refresh: recreate a kind cluster with similar workloads, capture with
`screencapture`, crop the top 64px, resample to 2400×1461, encode with cwebp, and
regenerate the OG crops (1200×630 jpg) from the dark PNGs.

## Deploy

Any of these work with zero config:

- **Netlify**: drag the folder into the dashboard, or `netlify deploy --prod --dir .`
- **Vercel**: `vercel --prod`
- **Cloudflare Pages**: create a project, upload the directory
- **GitHub Pages**: push to a repo, enable Pages on the root

## Release hygiene

- `main.js` rewrites `[data-version]` labels and `[data-asset]` hrefs from the
  GitHub Releases API at load; the hardcoded links are the no-JS fallback —
  bump them (and the `softwareVersion` in index.html JSON-LD) when releases advance.
- Bump `lastmod` in `sitemap.xml` when content changes.

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
python3 -m http.server 8080
# open http://localhost:8080
```
