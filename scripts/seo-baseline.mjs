// Snapshot the SEO-relevant parts of every page. Run once on the pre-redesign tree:
//   node scripts/seo-baseline.mjs <git-sha>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, SEO_META, listPages, read, title, meta, canonical, h1s, headings, jsonLd, ids, pageLinks,
} from '../tests/lib/site.mjs';

const pages = {};
for (const file of listPages()) {
  const html = read(file);
  pages[file] = {
    title: title(html),
    canonical: canonical(html),
    h1: h1s(html),
    meta: Object.fromEntries(SEO_META.map((key) => [key, meta(html, key)])),
    jsonLd: jsonLd(html),
    pageLinks: pageLinks(html),
    ids: [...ids(html)].sort(),
    headings: headings(html),
  };
}
mkdirSync(join(ROOT, 'tests', 'fixtures'), { recursive: true });
writeFileSync(
  join(ROOT, 'tests', 'fixtures', 'seo-baseline.json'),
  `${JSON.stringify({ source: process.argv[2] ?? 'working tree', pages }, null, 2)}\n`,
);
console.log(`seo baseline written for ${Object.keys(pages).length} pages`);
