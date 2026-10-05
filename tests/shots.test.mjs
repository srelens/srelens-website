import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/site.mjs';
import { VIEWS, APP_DESIGN, APP_THEME, workspaceDoc, seen, selectViews, selectThemes } from '../scripts/shots/views.mjs';
import { connect, navigate } from '../scripts/shots/cdp.mjs';

export function webpSize(buf) {
  assert.equal(buf.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buf.toString('ascii', 8, 12), 'WEBP');
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
  if (chunk === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  if (chunk === 'VP8L') { const b = buf.readUInt32LE(21); return [1 + (b & 0x3fff), 1 + ((b >> 14) & 0x3fff)]; }
  throw new Error(`unknown WebP chunk ${chunk}`);
}

const dir = join(ROOT, 'assets', 'shots');
const files = new Set(readdirSync(dir));

for (const { name } of VIEWS) {
  for (const theme of ['dark', 'light']) {
    test(`assets/shots/${theme}-${name}.webp exists at 2400x1461`, () => {
      const file = `${theme}-${name}.webp`;
      assert.ok(files.has(file), `${file} is missing`);
      assert.deepEqual(webpSize(readFileSync(join(dir, file))), [2400, 1461]);
    });
  }
}

test('the capture drives the "next" design', () => {
  assert.equal(APP_DESIGN, 'next');
});

test('every view has a unique name and an absolute route', () => {
  assert.equal(new Set(VIEWS.map((v) => v.name)).size, VIEWS.length);
  for (const v of VIEWS) assert.match(typeof v.route === 'function' ? v.route({ pod: () => 'x', context: 'c' }) : v.route, /^\//, v.name);
});

// workspaceDoc mirrors describe() in packages/ui-next/src/lib/routes.ts: the tab strip shows the stored title.
const contexts = [{ name: 'kind-srelens-demo', stableId: 'k.yaml#kind-srelens-demo' }];
const tabAt = (route) => {
  const [ws] = workspaceDoc(contexts, 'kind-srelens-demo', route).workspaces;
  return ws.tabs.find((t) => t.id === ws.activeId);
};

test('workspaceDoc opens the route on the demo cluster behind a pinned home tab', () => {
  const doc = workspaceDoc(contexts, 'kind-srelens-demo', '/k/pods');
  assert.equal(doc.version, 1);
  const [ws] = doc.workspaces;
  assert.equal(doc.currentId, ws.id);
  assert.deepEqual(ws.clusters, ['k.yaml#kind-srelens-demo']);
  assert.equal(ws.activeCluster, 'k.yaml#kind-srelens-demo');
  assert.deepEqual(ws.closed, []);
  assert.equal(ws.tabs[0].route, '/');
  assert.equal(ws.tabs[0].pinned, true);
  assert.deepEqual(tabAt('/k/pods'), { id: ws.activeId, route: '/k/pods', title: 'Pods', kind: 'workloads', sub: 'kind-srelens-demo' });
});

test('workspaceDoc titles each route the way the tab strip does', () => {
  const title = (r) => tabAt(r).title;
  assert.equal(title('/overview'), 'Cluster overview');
  assert.equal(title('/k/Pod/payments/payments-api-1'), 'payments-api-1');
  assert.equal(tabAt('/k/Pod/payments/payments-api-1').kind, 'resource');
  assert.equal(title('/logs/Pod/payments/ledger-worker-1'), 'ledger-worker-1 · logs');
  assert.equal(tabAt('/logs/Pod/payments/ledger-worker-1').kind, 'logs');
  assert.equal(title('/edit/kind-srelens-demo/Deployment/payments/payments-api'), 'Edit payments/payments-api');
  assert.equal(tabAt('/edit/kind-srelens-demo/Deployment/payments/payments-api').kind, 'edit');
  assert.equal(title('/forwards'), 'Port forwards');
  assert.equal(title('/events'), 'Events');
  assert.equal(title('/helm'), 'Helm');
  assert.equal(tabAt('/settings').sub, undefined, 'app-scoped routes carry no cluster');
});

// connect() reads the global WebSocket when called, so a stub stands in for Chrome.
class FakeSocket {
  constructor(url) { this.url = url; this.sent = []; FakeSocket.last = this; queueMicrotask(() => this.onopen()); }
  send(raw) { this.sent.push(JSON.parse(raw)); }
  close() { this.closed = true; }
  reply(msg) { this.onmessage({ data: JSON.stringify(msg) }); }
}

async function withFakeSocket(run) {
  const real = globalThis.WebSocket;
  globalThis.WebSocket = FakeSocket;
  try { return await run(await connect('ws://chrome/devtools/page/1'), FakeSocket.last); } finally { globalThis.WebSocket = real; }
}

test('cdp send matches each reply to its request by id', () => withFakeSocket(async (cdp, ws) => {
  const a = cdp.send('Page.navigate', { url: 'x' });
  const b = cdp.send('Runtime.evaluate', { expression: '1' });
  assert.deepEqual(ws.sent.map((m) => [m.id, m.method]), [[1, 'Page.navigate'], [2, 'Runtime.evaluate']]);
  ws.reply({ id: 2, result: { v: 'two' } });
  ws.reply({ id: 1, result: { v: 'one' } });
  assert.deepEqual([await a, await b], [{ v: 'one' }, { v: 'two' }]);
}));

test('cdp send rejects with the protocol error message and code', () => withFakeSocket(async (cdp, ws) => {
  const failed = cdp.send('Nope.nope');
  ws.reply({ id: 1, error: { message: 'not found', code: -32601 } });
  await assert.rejects(failed, /not found \(-32601\)/);
}));

test('cdp on delivers only the named event and stops after off()', () => withFakeSocket(async (cdp, ws) => {
  const seen = [];
  const off = cdp.on('Page.loadEventFired', (p) => seen.push(p));
  ws.reply({ method: 'Page.frameNavigated', params: { skip: true } });
  ws.reply({ method: 'Page.loadEventFired', params: { timestamp: 1 } });
  off();
  ws.reply({ method: 'Page.loadEventFired', params: { timestamp: 2 } });
  assert.deepEqual(seen, [{ timestamp: 1 }]);
}));

test('views web mode cannot show faithfully name the reason they keep their existing image', () => {
  const kept = VIEWS.filter((v) => v.keep);
  assert.deepEqual(kept.map((v) => v.name), ['port-forwards', 'mcp']);
  for (const v of kept) assert.ok(v.keep.length > 40, `${v.name} needs a reason`);
});

// --- fix round 1 -----------------------------------------------------------------------------

test('cdp rejects the in-flight and every later request once the socket closes', () => withFakeSocket(async (cdp, ws) => {
  const inflight = cdp.send('Runtime.evaluate');
  ws.onclose({ code: 1006 });
  await assert.rejects(inflight, /closed/);
  await assert.rejects(cdp.send('Page.enable'), /closed/);
}));

test('cdp rejects pending requests when the socket errors after it opened', () => withFakeSocket(async (cdp, ws) => {
  const inflight = cdp.send('Runtime.evaluate');
  ws.onerror({ message: 'boom' });
  await assert.rejects(inflight, /socket error: boom/);
}));

test('cdp listeners stop once the socket is gone', () => withFakeSocket(async (cdp, ws) => {
  const seenEvents = [];
  cdp.on('Page.loadEventFired', (p) => seenEvents.push(p));
  ws.onclose({ code: 1006 });
  ws.reply({ method: 'Page.loadEventFired', params: { timestamp: 1 } });
  assert.deepEqual(seenEvents, []);
}));

test('navigate resolves on the load event', () => withFakeSocket(async (cdp, ws) => {
  const done = navigate(cdp, 'http://x/', 1000);
  assert.deepEqual(ws.sent.map((m) => [m.method, m.params.url]), [['Page.navigate', 'http://x/']]);
  ws.reply({ id: 1, result: { frameId: 'f' } });
  ws.reply({ method: 'Page.loadEventFired', params: {} });
  await done;
}));

test('navigate fails on the errorText Page.navigate reports', () => withFakeSocket(async (cdp, ws) => {
  const done = navigate(cdp, 'http://x/', 1000);
  ws.reply({ id: 1, result: { frameId: 'f', errorText: 'net::ERR_CONNECTION_REFUSED' } });
  await assert.rejects(done, /ERR_CONNECTION_REFUSED/);
}));

test('navigate fails instead of waiting forever when no load event comes', () => withFakeSocket(async (cdp, ws) => {
  const done = navigate(cdp, 'http://x/', 30);
  ws.reply({ id: 1, result: { frameId: 'f' } });
  await assert.rejects(done, /timed out/);
}));

test('seen matches a string by inclusion, a RegExp by test, and no expectation always', () => {
  assert.equal(seen('a podinfo row', 'podinfo'), true);
  assert.equal(seen('nothing here', 'podinfo'), false);
  assert.equal(seen('1 not ready', /Degraded|not ready/), true);
  assert.equal(seen('all ready', /Degraded|not ready/), false);
  assert.equal(seen('anything', undefined), true);
});

test('every view waits for something an empty or unsynced screen cannot show', () => {
  for (const v of VIEWS) assert.ok(v.expect !== undefined, `${v.name} has no expect`);
  const unhealthy = ['overview', 'pods', 'pods-payments'].map((n) => VIEWS.find((v) => v.name === n));
  for (const v of unhealthy) {
    for (const text of ['Degraded', 'CrashLoopBackOff', 'NotReady', '1 not ready']) assert.equal(seen(text, v.expect), true, `${v.name} should accept ${text}`);
    // the screen the dark overview was captured on before the app had synced
    assert.equal(seen('NODES 3 all ready PODS 38 all ready Nothing is unhealthy', v.expect), false, `${v.name} accepts an unsynced screen`);
  }
  assert.equal(seen('Releases 0 in this cluster', VIEWS.find((v) => v.name === 'helm').expect), false);
  assert.equal(seen('podinfo checkout podinfo-6.7.1', VIEWS.find((v) => v.name === 'helm').expect), true);
});

test('selectViews skips the keep views unless they are asked for by name', () => {
  assert.deepEqual(selectViews(undefined).map((v) => v.name), VIEWS.filter((v) => !v.keep).map((v) => v.name));
  assert.deepEqual(selectViews('mcp,pods').map((v) => v.name), ['pods', 'mcp']);
});

test('selectViews and selectThemes refuse a name they do not know', () => {
  assert.throws(() => selectViews('pods,nope'), /unknown view "nope".*overview/);
  assert.throws(() => selectViews(true), /unknown view "true"/);
  assert.deepEqual(selectThemes(undefined), ['dark', 'light']);
  assert.deepEqual(selectThemes('light'), ['light']);
  assert.throws(() => selectThemes('dark,sepia'), /unknown theme "sepia".*dark/);
  assert.deepEqual(Object.keys(APP_THEME), ['dark', 'light']);
});

test('the terminal view waits for the nslookup answer, not for the typed command', () => {
  const { expect } = VIEWS.find((v) => v.name === 'terminal');
  assert.equal(seen('/ # hostname && nslookup redis.payments.svc.cluster.local', expect), false);
  assert.equal(seen('Server:\t10.96.0.10\nAddress:\t10.96.0.10:53\n\nName:\tredis.payments.svc.cluster.local\nAddress: 10.244.1.5', expect), true);
});
