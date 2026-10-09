// Remove inline style attributes from pages, leaving generated terminal captures alone.
//   node scripts/strip-styles.mjs compare/index.html compare/lens/index.html
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, read } from '../tests/lib/site.mjs';

for (const file of process.argv.slice(2)) {
  const parts = read(file).split(/(<pre class="tui"[\s\S]*?<\/pre>)/);
  const next = parts.map((part, i) => (i % 2 ? part : part.replace(/\s+style="[^"]*"/g, ''))).join('');
  writeFileSync(join(ROOT, file), next);
  console.log(`inline styles removed: ${file}`);
}
