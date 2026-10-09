// The design docs describe site.css and the authoring scripts. These tests keep them from drifting:
// every value the docs state is read back from the file that owns it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, read } from './lib/site.mjs';
import { VIEWS } from '../scripts/shots/views.mjs';

// ---- site.css: the source of truth ----

const css = read('site.css');
const declarations = (body) => Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const light = declarations(/:root\s*\{([^}]*)\}/.exec(css)[1]);
const darkOverrides = declarations(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/.exec(css)[1]);
const HEX = /^#[0-9a-f]{6}$/i;

// A doc names a colour by its token: `brand` is the light value, `brand-dark` the dark one.
const tokenValue = (key) => (key.endsWith('-dark') ? darkOverrides[key.slice(0, -5)] : light[key]);
const hexTokens = Object.entries(light).filter(([, v]) => HEX.test(v)).map(([k]) => k);
const darkHexTokens = Object.entries(darkOverrides).filter(([, v]) => HEX.test(v)).map(([k]) => k);
const FONTS = ['font-mono', 'font-body', 'font-term', 'font-grid'].map((name) => light[name]);

// ---- DESIGN.md front matter: a small reader for the nested `key: value` subset it uses ----

function frontMatter(md) {
  const root = {};
  const stack = [{ indent: -1, node: root }];
  for (const line of /^---\n([\s\S]*?)\n---\n/.exec(md)[1].split('\n')) {
    if (!line.trim()) continue;
    const [, spaces, key, value] = /^( *)([\w-]+):\s*(.*)$/.exec(line);
    while (stack.at(-1).indent >= spaces.length) stack.pop();
    const parent = stack.at(-1).node;
    if (value === '') {
      parent[key] = {};
      stack.push({ indent: spaces.length, node: parent[key] });
    } else {
      parent[key] = value.replace(/^(["'])(.*)\1$/, '$2');
    }
  }
  return root;
}

const designMd = read('DESIGN.md');
const front = frontMatter(designMd);
const prose = designMd.replace(/^---\n[\s\S]*?\n---\n/, '');

test('DESIGN.md colours list every site.css colour token and match its value in both themes', () => {
  const { colors } = front;
  for (const name of hexTokens) assert.ok(name in colors, `colors is missing ${name}`);
  for (const name of darkHexTokens) assert.ok(`${name}-dark` in colors, `colors is missing ${name}-dark`);
  for (const [key, value] of Object.entries(colors)) {
    assert.ok(tokenValue(key), `colors.${key} is not a site.css token`);
    assert.equal(value.toLowerCase(), tokenValue(key).toLowerCase(), `colors.${key}`);
  }
});

test('DESIGN.md radii and spacing equal the site.css tokens', () => {
  assert.equal(front.rounded.control, light['r-control']);
  assert.equal(front.rounded.card, light['r-card']);
  assert.equal(front.rounded.frame, light['r-frame']);
  assert.equal(front.spacing.gutter, light.gutter);
  assert.equal(front.spacing['section-y'], light['section-y']);
});

test('DESIGN.md typography uses exactly the four site.css font stacks, grid included', () => {
  const used = Object.values(front.typography).map((t) => t.fontFamily);
  for (const font of FONTS) assert.ok(used.includes(font), `no typography entry uses ${font}`);
  for (const font of used) assert.ok(FONTS.includes(font), `typography stack not in site.css: ${font}`);
  assert.match(light['font-mono'], /^"Geist Mono"/);
  assert.match(light['font-body'], /^"Geist"/);
  assert.match(light['font-term'], /^"JetBrains Mono"/);
});

test('DESIGN.md component references resolve to a front matter value', () => {
  const refs = [...designMd.match(/^---\n[\s\S]*?\n---\n/)[0].matchAll(/\{(\w+)\.([\w-]+)\}/g)];
  assert.ok(refs.length > 0, 'components reference no tokens');
  for (const [, group, key] of refs) assert.ok(front[group]?.[key] !== undefined, `{${group}.${key}} does not exist`);
});

test('DESIGN.md names the Command line system, not the old Operations Brief', () => {
  assert.match(prose, /Creative North Star: "Command line"/);
  for (const stale of ['Operations Brief', 'Archivo', 'Source Sans', 'control-violet', 'styles.css', 'enterprise.css']) {
    assert.ok(!designMd.includes(stale), `DESIGN.md still mentions ${stale}`);
  }
  for (const rule of ['Theme Rule', 'Accent Rule', 'Status Color Rule', 'Evidence Elevation Rule']) {
    assert.ok(prose.includes(`**The ${rule}.**`), `missing the ${rule}`);
  }
});

test('DESIGN.md sends terminal captures to --font-grid and does not claim JetBrains Mono draws box borders', () => {
  assert.match(prose, /`--font-grid`[^\n]*\.tui|\.tui[^\n]*`--font-grid`/);
  assert.match(prose, /lack U\+2500[–-]25FF/);
  assert.ok(!/JetBrains Mono[^\n]{0,80}(complete|full|every)[^\n]{0,40}box[- ]drawing/i.test(prose));
});

test('DESIGN.md says a capture scales to its frame (up to --tui-size) and no longer scrolls', () => {
  assert.ok(prose.includes(`**Capture:** \`.tui\` text captures, up to ${light['tui-size']} (\`--tui-size\`)`), `DESIGN.md names the cap ${light['tui-size']}`);
  assert.match(prose, /container query\s+units/);
  assert.doesNotMatch(prose, /scrolls\s+inside its own box|captures scroll inside/);
  for (const token of ['tui-size', 'tui-cols', 'tui-advance']) assert.ok(light[token], `--${token} is a site.css token`);
});

test('every .class and --token that DESIGN.md names exists in site.css, and every component is named', () => {
  const named = [...prose.matchAll(/`\.([a-z][\w-]*)`/g)].map((m) => m[1]);
  // header, path line, section label, mode switch, keycaps, command block, capture, code block, tables, FAQ, 404, accent
  for (const cls of ['site-header', 'crumbs', 'section-label', 'mode-tabs', 'keys', 'cmd', 'tui', 'codeblock', 'compare-scroll', 'faq-list', 'err-page', 'accent']) {
    assert.ok(named.includes(cls), `DESIGN.md does not document .${cls}`);
  }
  for (const cls of named) {
    assert.ok(new RegExp(`\\.${cls}(?![\\w-])`).test(css), `site.css has no .${cls}`);
  }
  for (const [, token] of prose.matchAll(/`--([a-z][\w-]*)`/g)) {
    assert.ok(token in light || token in darkOverrides, `site.css has no --${token}`);
  }
});

// ---- .impeccable/design.json ----

const design = JSON.parse(read('.impeccable/design.json'));
const { colorMeta, typographyMeta, shadows, motion, breakpoints } = design.extensions;

test('design.json brand, neutral and accent colours equal the site.css tokens in both themes', () => {
  for (const name of ['brand', 'bg', 'ink', 'hot']) {
    for (const key of [name, `${name}-dark`]) {
      assert.ok(colorMeta[key], `colorMeta is missing ${key}`);
      assert.equal(colorMeta[key].canonical.toLowerCase(), tokenValue(key).toLowerCase(), key);
      assert.ok(colorMeta[key].tonalRamp.includes(colorMeta[key].canonical), `${key} ramp lacks its canonical colour`);
    }
  }
  assert.equal(colorMeta.brand.canonical, '#6d44c5');
  assert.equal(colorMeta['brand-dark'].canonical, '#a78bfa');
  assert.equal(design.narrative.northStar, 'Command line');
  assert.ok(!Number.isNaN(Date.parse(design.generatedAt)));
});

test('design.json typography lists Geist Mono, Geist, JetBrains Mono and the capture grid stack', () => {
  const stacks = Object.values(typographyMeta).map((t) => t.fontFamily);
  for (const font of FONTS) assert.ok(stacks.includes(font), `typographyMeta has no entry for ${font}`);
  assert.ok(stacks.includes(light['font-grid']) && /Cascadia Mono/.test(light['font-grid']));
});

test('design.json shadow, motion, breakpoints and component colours exist in site.css', () => {
  assert.equal(shadows[0].value, light['evidence-shadow']);
  for (const m of motion) assert.ok(css.includes(m.value), `site.css has no ${m.value}`);
  for (const b of breakpoints) assert.ok(css.includes(`max-width: ${b.value}`), `site.css has no breakpoint ${b.value}`);
  const allowed = new Set([...hexTokens.map((k) => light[k]), ...darkHexTokens.map((k) => darkOverrides[k])].map((v) => v.toLowerCase()));
  for (const c of design.components) {
    for (const [hex] of c.css.matchAll(/#[0-9a-f]{3,8}\b/gi)) {
      assert.ok(allowed.has(hex.toLowerCase()), `${c.name}: ${hex} is not a site.css colour`);
    }
  }
});

// ---- README.md ----

const readme = read('README.md');
const structure = /## Structure\n\n```\n([\s\S]*?)\n```/.exec(readme)[1];

test('README structure names site.css, _config.yml, scripts/ and tests/, not the retired stylesheets', () => {
  for (const entry of ['site.css', '_config.yml', 'scripts/', 'tests/']) {
    assert.ok(structure.split('\n').some((l) => l.startsWith(entry)), `structure lacks ${entry}`);
  }
  assert.ok(!/styles\.css|enterprise\.css/.test(readme), 'README still names styles.css or enterprise.css');
});

test('every structure entry and every scripts/, tests/, docs/ or assets/ path the README names exists', () => {
  for (const line of structure.split('\n').filter((l) => /^\S/.test(l))) {
    const entry = line.split(/\s+/)[0];
    assert.ok(existsSync(join(ROOT, entry)), `structure entry ${entry} is not on disk`);
  }
  for (const [, path] of readme.matchAll(/\b((?:scripts|tests|docs|assets)\/[\w./-]*[\w/])/g)) {
    assert.ok(existsSync(join(ROOT, path)), `README names ${path}, which is not on disk`);
  }
});

test('README documents the test run, shared shell, captures, OG cards, screenshots and the review set', () => {
  for (const cmd of [
    '`node --test`',
    'node scripts/apply-shell.mjs --all',
    'node scripts/embed-captures.mjs',
    'node scripts/og-cards.mjs',
    'node scripts/screens.mjs',
    '.superpowers/screens/final',
    'node scripts/shots/desktop-shots.mjs',
    'scripts/demo/capture-all.sh',
    'scripts/demo/capture.sh',
    'scripts/pages.mjs',
    'scripts/shell.mjs',
  ]) assert.ok(readme.includes(cmd), `README does not mention ${cmd}`);
});

test('DESIGN.md Evidence keeps only the mcp view and the assistant screenshot, not port-forwards, the Cursor images or the Argo config image', () => {
  const evidence = designMd.slice(designMd.indexOf('## Evidence'), designMd.indexOf('## Do\'s and Don\'ts')).replace(/\s+/g, ' ');
  assert.match(evidence, /desktop `mcp` view/);
  assert.doesNotMatch(evidence, /`port-forwards`|Cursor|third-party/);
  assert.match(evidence, /AI assistant screenshot, which needs a real provider key/);
  assert.match(evidence, /In web mode port forwards are captured through the srelens server, so the Local column shows its proxy URL/);
});

test('README says only the mcp view keeps its image, and that port-forwards is captured in web mode', () => {
  assert.doesNotMatch(readme, /Two views carry a `keep` field/);
  assert.match(readme, /One view carries a `keep` field and is skipped by a full run: `mcp`/);
  assert.match(readme, /`port-forwards` is captured in web mode[^\n]*(?:server proxy URL|http:\/\/127\.0\.0\.1:8791\/pf\/1\/)/);
});

test('README notes the optional fourth tsv column and that the container cannot reach the update check', () => {
  assert.match(readme, /optional fourth column[^\n]*seconds/i);
  assert.match(readme, /api\.github\.com/);
});

// Devesh runs the assistant capture himself: the model needs his key, which this repo never sees.
test('README has an "Assistant capture (needs your AI key)" subsection with the exact docker run and the follow-up steps', () => {
  const section = /### Assistant capture \(needs your AI key\)\n([\s\S]*?)(?=\n##)/.exec(readme)?.[1];
  assert.ok(section, 'the subsection exists, under "Terminal capture"');
  assert.ok(readme.indexOf('### Assistant capture') > readme.indexOf('## Terminal capture') && readme.indexOf('### Assistant capture') < readme.indexOf('## OG cards'));
  const command = 'MSYS_NO_PATHCONV=1 docker run --rm --network kind -v "$(pwd -W 2>/dev/null || pwd)/.superpowers/capture:/work" \\\n'
    + '  -e KUBECONFIG=/work/kubeconfig -e ANTHROPIC_API_KEY -e ONLY=assistant ubuntu:24.04 bash /work/capture-all.sh';
  assert.ok(section.includes(command), 'the exact command, with the key passed by name from the shell');
  assert.doesNotMatch(section, /API_KEY=|\bsk-|AIza/, 'no key and no key assignment is ever written down');
  for (const step of ['.superpowers/capture/out/assistant.ansi', '`assets/captures/`', 'tui-assistant.webp', '`/tui/`', '`/docs/tui/`', 'capture:assistant:start', 'node scripts/embed-captures.mjs', 'cp docs/tui/index.html docs/tui.html']) {
    assert.ok(section.includes(step), `the follow-up steps mention ${step}`);
  }
  assert.match(section, /OPENAI_API_KEY[\s\S]*GEMINI_API_KEY/, 'the other two providers are named');
});

test('the scripts that drive headless Chrome use a throwaway profile, never the user\'s own', () => {
  for (const file of ['scripts/og-cards.mjs', 'scripts/screens.mjs']) {
    const src = read(file);
    assert.match(src, /mkdtempSync\(join\(tmpdir\(\)/, `${file} does not make a temp profile directory`);
    assert.match(src, /--user-data-dir=\$\{profile\}/, `${file} does not pass --user-data-dir`);
    assert.match(src, /finally\s*\{[^}]*rmSync\(profile/, `${file} does not remove the profile in finally`);
  }
});

test('the review screenshots go to a fresh directory and cover every page at three widths in both themes', () => {
  const src = read('scripts/screens.mjs');
  assert.match(src, /'\.superpowers', 'screens', 'final'/);
  assert.match(src, /rmSync\(out, \{ recursive: true, force: true \}\)/, 'stale shots from an earlier run would mix in');
  assert.match(src, /WIDTHS = \[1440, 768, 390\]/);
  assert.match(src, /\['light', 'dark'\]/);
  assert.match(src, /listPages\(\)/);
});

test('each review screenshot is as tall as its page: the height is read from the loaded page, never a fixed number that truncates long pages', () => {
  const src = read('scripts/screens.mjs');
  // A frame or a short window leaves lazy images unloaded and misreads the page (/features/ is 10100px at 390, not 9819),
  // so each page loads in a window taller than any page, its own height is read, and the shot is clipped to that.
  assert.match(src, /import \{ connect, navigate \} from '\.\/shots\/cdp\.mjs'/, 'reuse the CDP client');
  assert.match(src, /TALL = \d{5,}/, 'the loading window must be taller than every page');
  assert.match(src, /Emulation\.setDeviceMetricsOverride/);
  assert.match(src, /documentElement\.getBoundingClientRect\(\)\.height/);
  assert.match(src, /clip: \{ x: 0, y: 0, width: w, height: pageHeight, scale: 1 \}/);
  assert.ok(!/\[\d{4}, \d{4,}\]/.test(src) && !/--window-size/.test(src), 'a fixed window height is back');
});

test('README warns that node --test tests/ fails on Node 24', () => {
  const lines = readme.split('\n').filter((l) => l.includes('node --test tests/'));
  assert.ok(lines.length > 0, 'no warning about node --test tests/');
  for (const line of lines) assert.ok(/Node 24/.test(line) && /not|fails/i.test(line), `not framed as a warning: ${line}`);
});

test('README documents the isolated kubeconfig, the 120x32 capture size and the kept desktop views', () => {
  for (const needle of ['.superpowers/capture/kubeconfig-host', 'kind-srelens-demo', '~/.kube/config', 'srelens-demo']) {
    assert.ok(readme.includes(needle), `README does not mention ${needle}`);
  }
  assert.match(readme, /120\s*[×x]\s*32/);
  const kept = VIEWS.filter((v) => v.keep).map((v) => v.name);
  assert.ok(kept.length > 0);
  for (const name of kept) assert.ok(readme.includes(`\`${name}\``), `README does not name the kept view ${name}`);
  assert.ok(readme.includes('keep'), 'README does not explain the keep field');
});

test('README release bump names every place a version lives and says to re-capture evidence', () => {
  const section = /## Release bump\n([\s\S]*?)(?=\n## |$)/.exec(readme)?.[1];
  assert.ok(section, 'README has no "## Release bump" section');
  for (const needle of ['RELEASE', 'tests/version.test.mjs', 'softwareVersion', 'data-version', 'download', 'node --test']) {
    assert.ok(section.includes(needle), `Release bump does not mention ${needle}`);
  }
  assert.match(section, /re-?captur/i);
  assert.match(read('tests/version.test.mjs'), /const RELEASE = /);
});

// ---- the workflow count, in PRODUCT.md and README.md ----

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
  'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four', 'twenty-five'];
const asNumber = (s) => (/^\d+$/.test(s) ? Number(s) : WORDS.indexOf(s.toLowerCase()));

test('PRODUCT.md and README count the product workflows /features/ really has', () => {
  const rows = [...read('features/index.html').matchAll(/class="feature-row"/g)].length;
  assert.ok(rows > 0, 'features/index.html has no .feature-row');
  for (const file of ['PRODUCT.md', 'README.md']) {
    const claims = [...read(file).matchAll(/([\w-]+) real (?:product )?workflows/gi)];
    assert.ok(claims.length > 0, `${file} does not state a workflow count`);
    for (const [, n] of claims) assert.equal(asNumber(n), rows, `${file} says ${n} workflows, /features/ has ${rows}`);
  }
});
