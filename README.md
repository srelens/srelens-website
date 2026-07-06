# srelens website

Marketing site for [srelens](https://srelens.com) — the Kubernetes desktop workspace built in Rust.

- **Live site:** https://srelens.com
- **This repo:** https://github.com/srelens/srelens-website
- **App source:** https://github.com/srelens/srelens

Pure static HTML/CSS/JS. No build step, no framework, no dependencies.

## Structure

```
index.html        landing page (all sections + JSON-LD structured data)
404.html          not-found page
styles.css        all styles (design tokens at the top; dark + light themes)
main.js           progressive enhancement only — page works without JS
CNAME             custom domain for GitHub Pages (srelens.com)
robots.txt        crawler policy + sitemap pointer
sitemap.xml       sitemap
llms.txt          AI/answer-engine summary of the product (AEO)
site.webmanifest  PWA manifest
_headers          security/cache headers (only honored on Netlify/Cloudflare Pages)
vercel.json       same headers for Vercel (only honored there)
assets/           brand SVGs, favicons, apple-touch-icon, og-image.png
                  app-icon.svg + srelens-logo.svg are the official brand files;
                  mark-dark.svg / mark-light.svg are per-theme header marks;
                  og-src.svg is the editable source for og-image.png
```

## Deployment

Deployed with **GitHub Pages** from the `main` branch root. Every push to `main`
triggers the `pages-build-deployment` workflow — no manual steps.

Custom domain is `srelens.com` (via the `CNAME` file). DNS must point the apex
at GitHub Pages: a Cloudflare CNAME record `@ → srelens.github.io` (flattened),
optionally `www → srelens.github.io`. Once the certificate is issued, enable
**Enforce HTTPS** in Settings → Pages.

Note: GitHub Pages ignores `_headers` and `vercel.json`; they're kept in case
the site ever moves to Netlify, Cloudflare Pages, or Vercel.

## Theming

Dark is the default. Light theme activates via `prefers-color-scheme`, the
sun/moon toggle in the nav (persisted in `localStorage`), or a `?theme=light`
URL parameter. Console-style surfaces (the app-window mock, code blocks, the
clone chip) intentionally stay dark in both themes.

Brand rule: **"srelens" is always lowercase**, including at sentence starts.

## Regenerating assets

Icons and the social image are rendered from SVG sources with `rsvg-convert`
(`brew install librsvg`):

```sh
cd assets
rsvg-convert -w 1200 -h 630 og-src.svg -o og-image.png
rsvg-convert -w 32 -h 32 app-icon.svg -o favicon-32.png
rsvg-convert -w 16 -h 16 app-icon.svg -o favicon-16.png
rsvg-convert -w 180 -h 180 app-icon.svg -o apple-touch-icon.png
rsvg-convert -w 192 -h 192 app-icon.svg -o icon-192.png
rsvg-convert -w 512 -h 512 app-icon.svg -o icon-512.png
```

## When releases ship

The site currently says "pre-release, build from source." When installers are
published:

1. Replace the Get started section and hero copy with download buttons
2. Update `softwareVersion` and `releaseNotes` in the SoftwareApplication JSON-LD
3. Update the "Can I download srelens today?" FAQ answer (page + FAQPage JSON-LD)
4. Bump `lastmod` in `sitemap.xml`

## SEO / AEO checklist (already included)

- Title, meta description, canonical URL, robots meta
- Open Graph + Twitter card with a 1200×630 image
- JSON-LD: `SoftwareApplication` (with featureList), `WebSite`, `FAQPage`
- `robots.txt` + `sitemap.xml` + `llms.txt`
- Semantic HTML (single `h1`, real `<details>` FAQ matching the FAQPage schema)
- No framework; system fonts fallback, `display=swap`
- Accessible: skip link, focus states, `prefers-reduced-motion`, decorative mock `aria-hidden`

## Local preview

```sh
python3 -m http.server 8080
# open http://localhost:8080
```
