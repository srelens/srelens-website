// Capture srelens desktop views for the website, in web mode: srelens-server from the
// srelens worktree serves the same React UI as the desktop app, with an isolated data dir
// and a dev login. Nothing touches %APPDATA%\app.srelens.desktop or Credential Manager,
// and only the srelens-demo kubeconfig is uploaded.
//   node scripts/shots/desktop-shots.mjs --srelens=<worktree> --kubeconfig=<srelens-demo kubeconfig> \
//        [--context=kind-srelens-demo] [--only=overview,pods] [--themes=dark,light] [--out=assets/shots]
//
// How the next design is steered (see views.mjs): before every page load the server-side
// settings are rewritten through PUT /api/settings/:key (web mode keeps settings in the server
// DB; localStorage is only imported when the DB lacks a key, so it is ignored after first boot):
//   srelens.design             "next"
//   srelens.next.workspaces    the workspace document with one tab at the view's route
//   srelens.next.appearance    { theme: "dark" | "light" }
//   srelens.next.namespaces    { <stableId>: [namespace, ...] }, [] being all namespaces
//
// A shot is only taken once the view's `expect` text is on the page (views.mjs), and the first
// load of a run is a throwaway warm-up: the first load after the server starts can paint
// before the app has synced. Whatever fails, the server, Chrome and the data dir are cleaned up.
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { ROOT } from '../../tests/lib/site.mjs';
import { connect, navigate } from './cdp.mjs';
import { APP_DESIGN, APP_THEME, VIEWS, seen, selectThemes, selectViews, workspaceDoc } from './views.mjs';

const USAGE = 'usage: node scripts/shots/desktop-shots.mjs --srelens=<srelens worktree with a built server> --kubeconfig=<srelens-demo kubeconfig> [--context=NAME] [--only=a,b] [--themes=dark,light] [--out=DIR]';
const usageError = (message) => { console.error(`${message}\n${USAGE}`); process.exit(2); };

const flags = {};
for (const arg of process.argv.slice(2)) {
  const [key, ...value] = arg.replace(/^--/, '').split('=');
  flags[key] = value.length ? value.join('=') : true;
}
const SRELENS = resolve(String(flags.srelens ?? ''));
const KUBECONFIG = resolve(String(flags.kubeconfig ?? ''));
const SERVER_BIN = join(SRELENS, 'target', 'debug', 'srelens-server.exe');
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
for (const [what, path] of [['srelens-server', SERVER_BIN], ['kubeconfig', KUBECONFIG], ['Chrome (set CHROME)', CHROME]]) {
  if (!existsSync(path)) usageError(`${what} not found: ${path}`);
}
let RUN_VIEWS;
let THEMES;
try { RUN_VIEWS = selectViews(flags.only); THEMES = selectThemes(flags.themes); } catch (err) { usageError(err.message); }
const CONTEXT = String(flags.context ?? 'kind-srelens-demo');
const OUT = resolve(ROOT, String(flags.out ?? 'assets/shots'));
const PORT = 8791;
const CDP_PORT = 9333;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const SETTLE = Number(flags.settle ?? 2500);
const EXPECT_MS = 20000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function isUp(url) {
  try { return (await fetch(url, { signal: AbortSignal.timeout(500) })).ok; } catch { return false; }
}
async function waitFor(url) {
  for (let i = 0; i < 150; i += 1) { if (await isUp(url)) return; await sleep(200); }
  throw new Error(`${url} did not come up`);
}
// Stop a child we started, by its own PID, and wait for it to be gone.
async function stop(child) {
  if (!child || child.pid === undefined || child.exitCode !== null) return;
  const gone = new Promise((done) => child.once('exit', done));
  child.kill();
  await Promise.race([gone, sleep(5000)]);
}

// Never reuse a server or browser that is already there: this run must own both.
for (const url of [`${ORIGIN}/healthz`, `http://127.0.0.1:${CDP_PORT}/json/version`]) {
  if (await isUp(url)) { console.error(`${url} is already answering; stop whatever owns it first`); process.exit(2); }
}

// The live pod names come from the cluster, never from this file: `pod('payments-api')`.
const podNames = execFileSync('kubectl', ['--kubeconfig', KUBECONFIG, '--context', CONTEXT, 'get', 'pods', '-n', 'payments', '-o', 'name'], { encoding: 'utf8' })
  .split(/\r?\n/).filter(Boolean).map((line) => line.replace(/^pod\//, ''));
const pod = (prefix) => {
  const found = podNames.find((name) => name.startsWith(`${prefix}-`));
  if (!found) throw new Error(`no pod starting with ${prefix}- in payments (have: ${podNames.join(', ')})`);
  return found;
};

// A fresh data dir per run: the only kubeconfig the server ever sees is the one uploaded below.
const DATA = mkdtempSync(join(tmpdir(), 'srelens-site-shots-'));
let log;
let server;
let chrome;
let cdp;
let cleaning;
// Idempotent: the finally block, a signal and the exit hook can all ask for it.
const cleanup = () => cleaning ??= (async () => {
  try { cdp?.close(); } catch { /* already gone */ }
  await stop(chrome);
  await stop(server);
  try { if (log !== undefined) closeSync(log); } catch { /* already closed */ }
  try {
    rmSync(DATA, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  } catch (err) {
    console.warn(`could not remove ${DATA}: ${err.message}`);
  }
})();
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { cleanup().finally(() => process.exit(130)); });
process.on('exit', () => { chrome?.kill(); server?.kill(); }); // an uncaught error must not leave them running

async function capture() {
  await waitFor(`${ORIGIN}/healthz`);
  const login = await fetch(`${ORIGIN}/auth/dev-login`, { method: 'POST', redirect: 'manual' });
  const session = login.headers.getSetCookie().map((c) => /(?:^|;\s*)srelens_session=([^;]+)/.exec(c)?.[1]).find(Boolean);
  if (!session) throw new Error(`no session cookie from /auth/dev-login (status ${login.status})`);
  const api = (path, init = {}) => fetch(`${ORIGIN}${path}`, {
    ...init,
    headers: { cookie: `srelens_session=${session}`, 'x-srelens-csrf': '1', 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  const upload = await api('/api/kubeconfigs', { method: 'POST', body: JSON.stringify({ name: 'srelens-demo', yaml: readFileSync(KUBECONFIG, 'utf8') }) });
  if (!upload.ok) throw new Error(`kubeconfig upload failed: ${upload.status} ${await upload.text()}`);

  // The backend's own ids for the contexts: the workspace document refers to them, they cannot be guessed.
  const listed = await api('/api/capability/k8s.listContexts', { method: 'POST', body: JSON.stringify({ paths: [] }) });
  if (!listed.ok) throw new Error(`k8s.listContexts failed: ${listed.status} ${await listed.text()}`);
  const contexts = (await listed.json()).contexts ?? [];
  if (contexts.length !== 1 || contexts[0].name !== CONTEXT) throw new Error(`expected only ${CONTEXT}, the server lists: ${contexts.map((c) => c.name).join(', ') || 'nothing'}`);
  const [{ stableId }] = contexts;

  // Settings values are JSON, stored verbatim; read each back so a value that did not stick fails here, not in a screenshot.
  const putSetting = async (key, value) => {
    const url = `/api/settings/${encodeURIComponent(key)}`;
    const put = await api(url, { method: 'PUT', body: JSON.stringify(value) });
    if (!put.ok) throw new Error(`PUT ${url} failed: ${put.status} ${await put.text()}`);
    const back = (await (await api(url)).json()).value;
    if (!isDeepStrictEqual(back, value)) throw new Error(`${key} did not stick: wrote ${JSON.stringify(value)}, read ${JSON.stringify(back)}`);
  };

  await waitFor(`http://127.0.0.1:${CDP_PORT}/json/version`);
  const page = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()).find((t) => t.type === 'page');
  cdp = await connect(page.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Network.enable');
  await cdp.send('Network.setCookie', { name: 'srelens_session', value: session, url: ORIGIN, httpOnly: true });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 974, deviceScaleFactor: 1.5, mobile: false });

  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  };
  // The shell boots in a few hundred ms, but a resource list then opens a watch and takes seconds more
  // to show a row: wait for both, or the shot is a spinner that looks like a working app.
  const waitForApp = async () => {
    const text = () => evaluate("document.getElementById('root')?.innerText ?? ''");
    for (let i = 0; i < 300; i += 1) {
      const t = await text();
      if (t && !/^\s*Loading\s*$/.test(t) && !t.includes('Checking session')) break;
      await sleep(100);
    }
    for (let i = 0; i < 200 && /Loading\b|Loading…/.test(await text()); i += 1) await sleep(100);
    await sleep(SETTLE);
  };
  // "Not loading" is not "synced": a view says what its synced screen shows (`expect`) and the shot waits for it.
  const waitForExpect = async (view) => {
    let text = '';
    const started = Date.now();
    while (Date.now() - started < EXPECT_MS) {
      text = await evaluate('document.body.innerText');
      if (seen(text, view.expect)) { await sleep(600); return; }
      await sleep(250);
    }
    throw new Error(`${view.expect} never appeared within ${EXPECT_MS / 1000}s; the page said: ${text.replace(/\s+/g, ' ').slice(0, 300)}`);
  };

  const KEYS = { Enter: 13, Escape: 27, Tab: 9, ArrowDown: 40, ArrowUp: 38 };
  const press = async (combo) => {
    const parts = combo.split('+');
    const key = parts.pop();
    const modifiers = (parts.includes('Alt') ? 1 : 0) | (parts.includes('Control') ? 2 : 0) | (parts.includes('Meta') ? 4 : 0) | (parts.includes('Shift') ? 8 : 0);
    const code = key.length === 1 ? `Key${key.toUpperCase()}` : key;
    const windowsVirtualKeyCode = key.length === 1 ? key.toUpperCase().charCodeAt(0) : KEYS[key];
    for (const type of ['keyDown', 'keyUp']) await cdp.send('Input.dispatchKeyEvent', { type, key, code, modifiers, windowsVirtualKeyCode });
  };
  const click = async (kind, value) => {
    const ok = await evaluate(`(() => {
      const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const want = ${JSON.stringify(value)};
      const el = ${JSON.stringify(kind)} === 'label'
        ? [...document.querySelectorAll('[aria-label]')].find((e) => e.getAttribute('aria-label') === want && visible(e))
        : ${JSON.stringify(kind)} === 'text'
          ? [...document.querySelectorAll('button, a, [role]')].find((e) => e.textContent.trim() === want && visible(e))
          : [...document.querySelectorAll('tr, [role="row"]')].find((e) => e.textContent.includes(want) && visible(e));
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    })()`);
    if (!ok) throw new Error(`no ${kind} "${value}"`);
  };
  const run = async (step) => {
    if (step.label) await click('label', step.label);
    else if (step.text) await click('text', step.text);
    else if (step.row) await click('row', step.row);
    else if (step.focus) { if (!(await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(step.focus)}); el?.focus(); return !!el; })()`))) throw new Error(`no element ${step.focus}`); }
    else if (step.key) await press(step.key);
    else if (step.type) await cdp.send('Input.insertText', { text: step.type });
    await sleep(step.wait ?? 1200);
  };

  // Park the browser, write the view's settings, load the app on its route, wait for it to stop loading.
  const open = async (view, theme) => {
    const route = typeof view.route === 'function' ? view.route({ context: CONTEXT, pod }) : view.route;
    // Park first: a page unloading while we write could flush its own old state over ours.
    await navigate(cdp, 'about:blank');
    await putSetting('srelens.design', APP_DESIGN);
    await putSetting('srelens.next.appearance', { theme: APP_THEME[theme] });
    await putSetting('srelens.next.namespaces', { [stableId]: view.namespaces ?? [] });
    await putSetting('srelens.next.workspaces', workspaceDoc(contexts, CONTEXT, route));
    await navigate(cdp, `${ORIGIN}/`);
    await waitForApp();
    return route;
  };

  mkdirSync(OUT, { recursive: true });
  if (flags.only === undefined) for (const v of VIEWS.filter((x) => x.keep)) console.log(`kept ${v.name}: ${v.keep}`);
  // Throwaway: the first load after the server starts can paint before the app has synced.
  try { await open(RUN_VIEWS[0], THEMES[0]); } catch (err) { throw new Error(`warm-up: ${err.message}`); }
  for (const theme of THEMES) {
    for (const view of RUN_VIEWS) {
      try {
        const route = await open(view, theme);
        for (const step of view.steps ?? []) await run(step);
        await waitForExpect(view);
        const shot = await cdp.send('Page.captureScreenshot', { format: 'webp', quality: 82 });
        writeFileSync(join(OUT, `${theme}-${view.name}.webp`), Buffer.from(shot.data, 'base64'));
        console.log(`captured ${theme}-${view.name}.webp (${route})`);
      } catch (err) {
        throw new Error(`${theme}-${view.name}: ${err.message}`);
      }
    }
  }
}

try {
  log = openSync(join(DATA, 'server.log'), 'a');
  const { KUBECONFIG: _ignored, ...inherited } = process.env;
  server = spawn(SERVER_BIN, ['serve', `127.0.0.1:${PORT}`, '--data', DATA], {
    cwd: SRELENS,
    stdio: ['ignore', log, log],
    env: { ...inherited, SRELENS_DEV_LOGIN: 'site-shots@localhost', SRELENS_MASTER_KEY: randomBytes(32).toString('hex'), SRELENS_PUBLIC_URL: ORIGIN },
  });
  chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${join(DATA, 'chrome')}`, '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
  // A child that cannot start emits 'error' (and would be an uncaught exception without a listener):
  // make it fail the run, which still reaches the finally below.
  const failedToStart = new Promise((_, reject) => {
    for (const [name, child] of [['srelens-server', server], ['Chrome', chrome]]) child.on('error', (err) => reject(new Error(`${name} failed to start: ${err.message}`)));
  });
  failedToStart.catch(() => {}); // reported through the race below
  const capturing = capture();
  capturing.catch(() => {}); // when failedToStart wins, a later failure of the run is not a second report
  await Promise.race([capturing, failedToStart]);
} finally {
  await cleanup();
}
