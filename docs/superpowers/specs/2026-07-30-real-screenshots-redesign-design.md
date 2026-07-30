# srelens.com redesign: real screenshots + multi-page SEO/AEO

Date: 2026-07-30
Status: approved by Devesh (evolve identity / multi-page / dual-theme screenshots)

## Goal

Rebuild srelens.com around real product screenshots captured from srelens running
against a live multi-node kind cluster, and expand the single page into a small
multi-page site optimized for search engines and answer engines.

## Demo environment

- kind cluster `srelens-demo`: 1 control-plane + 2 workers.
- Realistic workloads across namespaces (`payments`, `checkout`, `monitoring`):
  multi-replica Deployments, a redis StatefulSet, a CronJob, Services, an HPA,
  and one intentionally crash-looping pod for authentic troubleshooting views.
- Screenshots captured from `/Applications/srelens.app` in both dark and light
  app themes: cluster overview, pods list, pod detail/logs, nodes, terminal,
  MCP panel. Retina PNG source, optimized WebP + PNG fallback, dimensions set,
  lazy-loaded (hero preloaded). Screenshots swap with the site theme toggle.

## Site structure (pure static, no build step)

| Page | Target queries |
|---|---|
| `/` | kubernetes desktop client, kubernetes IDE |
| `/features/` | feature deep-dive, one screenshot per feature |
| `/mcp/` | kubernetes MCP server, AI agent kubernetes |
| `/compare/` | lens alternative, freelens alternative |
| `/download/` | download kubernetes GUI mac/windows/linux |
| `/faq/` | question-phrased headings, full FAQ |

Shared nav/footer duplicated per page. Existing brand system carried over:
dark/light themes, blue #1769FF → teal gradient, Archivo + IBM Plex Mono,
lowercase "srelens" everywhere.

## SEO / AEO

- Unique title, meta description, canonical, OG/Twitter tags per page;
  screenshot-based OG images.
- JSON-LD: SoftwareApplication (screenshots + download offers), FAQPage,
  BreadcrumbList, Organization, WebSite.
- sitemap.xml with all pages; robots.txt; expanded llms.txt + llms-full.txt.
- Clean directory URLs working on both Vercel and GitHub Pages.

## Review gate

All work on branch `redesign/real-screenshots`. Site served locally and every
page rendered in headless Chrome (both themes) and shown to Devesh before any
push.
