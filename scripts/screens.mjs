// Render every page at three widths in both themes with headless Chrome, for review.
// Serve the repo first:  npx --yes http-server . -p 8080 -c-1 --silent
//   node scripts/screens.mjs [http://localhost:8080]
// Output: .superpowers/screens/final/<page>-<width>-<theme>.png (git-ignored, emptied first so old shots never mix in).
// Chrome is driven over DevTools. Each page loads in a window taller than any page, so every lazy image loads, its own
// height is read, and the shot is clipped to that: a fixed window height cuts long pages off, and measuring in a short
// window or a frame misreads them (images change a page's height when they load).
// Chrome runs with a throwaway profile, never the user's own.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, listPages } from '../tests/lib/site.mjs';
import { connect, navigate } from './shots/cdp.mjs';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const base = process.argv[2] ?? 'http://localhost:8080';
const out = join(ROOT, '.superpowers', 'screens', 'final');
const WIDTHS = [1440, 768, 390];
const TALL = 40000; // taller than any page: the longest, /docs/tui/ at 390 px wide, is about 25,000
const profile = mkdtempSync(join(tmpdir(), 'screens-'));
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// Stop the browser we started, by its own PID, and wait for it to be gone so the profile can be removed.
async function stop(child) {
  if (!child || child.exitCode !== null) return;
  const gone = new Promise((done) => child.once('exit', done));
  child.kill();
  await Promise.race([gone, sleep(5000)]);
}

// Fonts and every image that is on screen, then the page's own height.
const PAGE_HEIGHT = `(async () => {
  await document.fonts.ready;
  const loading = [...document.images].filter((img) => img.offsetParent !== null && !img.complete);
  const give = new Promise((done) => setTimeout(done, 8000));
  await Promise.race([Promise.all(loading.map((img) => new Promise((done) => { img.onload = img.onerror = done; }))), give]);
  await new Promise((done) => setTimeout(done, 300));
  return Math.ceil(document.documentElement.getBoundingClientRect().height);
})()`;

let chrome;
let cdp;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

try {
  let startError;
  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
  chrome.on('error', (err) => { startError = err; });
  const portFile = join(profile, 'DevToolsActivePort'); // Chrome writes the port it picked here
  for (let i = 0; i < 100 && !startError && !existsSync(portFile); i += 1) await sleep(200);
  if (!existsSync(portFile)) throw new Error(`Chrome did not start (${startError?.message ?? 'no DevToolsActivePort'}); set CHROME if it is not at ${CHROME}`);
  const port = readFileSync(portFile, 'utf8').split('\n')[0];
  let page;
  for (let i = 0; i < 25 && !page; i += 1) {
    page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
    if (!page) await sleep(200);
  }
  cdp = await connect(page.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  };

  for (const file of listPages()) {
    const path = file === 'index.html' ? '/' : file.endsWith('/index.html') ? `/${file.slice(0, -'index.html'.length)}` : `/${file}`;
    const slug = file.replace(/\/?index\.html$/, '').replace(/\//g, '_') || 'home';
    for (const w of WIDTHS) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: TALL, deviceScaleFactor: 1, mobile: false });
      for (const theme of ['light', 'dark']) {
        const name = `${slug}-${w}-${theme}.png`;
        await navigate(cdp, `${base}${path}?theme=${theme}`);
        const pageHeight = await evaluate(PAGE_HEIGHT);
        if (pageHeight > TALL) throw new Error(`${name} is ${pageHeight}px tall; raise TALL (${TALL})`);
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w, height: pageHeight, scale: 1 } });
        writeFileSync(join(out, name), Buffer.from(shot.data, 'base64'));
        console.log(`${name} ${pageHeight}`);
      }
    }
  }
} finally {
  cdp?.close();
  await stop(chrome);
  rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
}
