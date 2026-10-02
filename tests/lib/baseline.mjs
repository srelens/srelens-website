import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './site.mjs';

const pages = JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'seo-baseline.json'), 'utf8')).pages;

// Pages whose expected state is another page's baseline (spec 8.3).
export const BASELINE_OF = {};

export const baselineFor = (file) => pages[BASELINE_OF[file] ?? file];
