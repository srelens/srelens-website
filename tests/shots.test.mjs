import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/site.mjs';
import { VIEWS, APP_DESIGN, workspaceDoc } from '../scripts/shots/views.mjs';
import { connect } from '../scripts/shots/cdp.mjs';

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
