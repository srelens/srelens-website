# srelens website

Marketing site for [srelens](https://srelens.com) — the Kubernetes desktop workspace built in Rust.

Pure static HTML/CSS/JS. No build step, no framework, no dependencies. Deploy the directory as-is to any static host.

## Structure

```
index.html        landing page (all sections + JSON-LD structured data)
404.html          not-found page
styles.css        all styles (design tokens at the top)
main.js           progressive enhancement only — page works without JS
robots.txt        crawler policy + sitemap pointer
sitemap.xml       sitemap (single URL for now)
llms.txt          AI/answer-engine summary of the product (AEO)
site.webmanifest  PWA manifest
_headers          security + cache headers (Netlify / Cloudflare Pages)
vercel.json       same headers for Vercel
assets/           logo-mark.svg + logo-full.svg (brand: hexagon lens + pulse), favicons, apple-touch-icon, og-image.png
                  og-src.svg is the editable source for the rendered OG image
```

## Deploy

Any of these work with zero config:

- **Netlify**: drag the folder into the dashboard, or `netlify deploy --prod --dir .` (`_headers` is picked up automatically)
- **Vercel**: `vercel --prod` (`vercel.json` is picked up automatically)
- **Cloudflare Pages**: create a project, upload the directory (`_headers` is picked up automatically)
- **GitHub Pages**: push to a repo, enable Pages on the root

## Before going live — update these placeholders

1. **Domain** — the site assumes `https://srelens.com`. If you use a different domain, search-and-replace `srelens.com` in `index.html`, `sitemap.xml`, `robots.txt`, and `llms.txt`.
2. **GitHub URL** — `https://github.com/srelens/srelens` is a placeholder. Replace it in `index.html` and `llms.txt` once the real repo is public.
3. **OG image / icons** — rendered from `assets/og-src.svg` and `assets/logo-mark.svg`. To regenerate after edits:
   ```sh
   cd assets
   rsvg-convert -w 1200 -h 630 og-src.svg -o og-image.png
   rsvg-convert -w 32 -h 32 logo-mark.svg -o favicon-32.png
   rsvg-convert -w 16 -h 16 logo-mark.svg -o favicon-16.png
   rsvg-convert -w 180 -h 180 logo-mark.svg -o apple-touch-icon.png
   rsvg-convert -w 192 -h 192 logo-mark.svg -o icon-192.png
   rsvg-convert -w 512 -h 512 logo-mark.svg -o icon-512.png
   ```
4. **Downloads** — when installers ship, replace the "Build from source" section and the pre-release copy in the hero/FAQ, and update the `softwareVersion` + `releaseNotes` in the SoftwareApplication JSON-LD.
5. **Sitemap lastmod** — bump the date in `sitemap.xml` when content changes.

## SEO / AEO checklist (already included)

- Title, meta description, canonical URL, robots meta
- Open Graph + Twitter card with a 1200×630 image
- JSON-LD: `SoftwareApplication` (with featureList), `WebSite`, `FAQPage`
- `robots.txt` + `sitemap.xml`
- `llms.txt` for AI crawlers / answer engines
- Semantic HTML (single `h1`, real `<details>` FAQ that matches the FAQPage schema)
- Fast: no framework, ~15 KB CSS, ~2 KB JS, system-rendered fonts with `display=swap`
- Accessible: skip link, visible focus states, `prefers-reduced-motion` respected, decorative mock marked `aria-hidden`

## Local preview

```sh
python3 -m http.server 8080
# open http://localhost:8080
```
