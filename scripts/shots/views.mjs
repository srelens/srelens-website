// Desktop views captured for the website, in srelens v0.15.0's "next" design.
//
// The next design has no URL router: a screen is a tab, and the open tabs live in the
// `srelens.next.workspaces` setting. Each view therefore names a `route` (the tab's route,
// see packages/ui-next/src/lib/routes.ts and detailRoute.ts) and desktop-shots.mjs writes a
// workspace document that holds exactly that tab before the page loads.
//
//   route       string, or ({ context, pod }) => string. `pod('payments-api')` is the live name of
//               the first pod in the payments namespace whose name starts with `payments-api-`.
//   expect      string or RegExp that must appear in document.body.innerText before the shot is taken
//               (polled, the view fails if it never does): text an empty or still-syncing screen cannot show
//   keep        why web mode cannot show this view faithfully; a full run skips it and the existing image
//               stays (--only=<name> still captures it)
//   namespaces  the namespace filter the screen opens with; [] (the default) is all namespaces.
//   steps       optional, run in order once the route has loaded:
//                 { label }  click the element whose aria-label is exactly `label`
//                 { text }   click the visible button/link/[role] element whose text is exactly `text`
//                 { row }    click the first visible table row whose text contains `row`
//                 { focus }  focus the first element matching this CSS selector (a terminal's input, say)
//                 { key }    press a key or chord: 'Escape', 'Enter', 'Control+k'
//                 { type }   insert text into the focused element
//                 { wait }   pause, in milliseconds
export const APP_DESIGN = 'next';
// The next design's own theme ids (appearance.ts); "dark" is its ink violet control room.
export const APP_THEME = { dark: 'dark', light: 'light' };

const PAYMENTS = ['payments'];
// ledger-worker crash-loops, so a synced cluster always shows one of these; a screen captured before the app has synced says "all ready".
const UNHEALTHY = /Degraded|CrashLoopBackOff|NotReady|not ready/;

export const VIEWS = [
  { name: 'overview', route: '/overview', expect: UNHEALTHY },
  { name: 'pods', route: '/k/pods', expect: UNHEALTHY },
  { name: 'pods-payments', route: '/k/pods', namespaces: PAYMENTS, expect: UNHEALTHY },
  { name: 'pod-detail', route: ({ pod }) => `/k/Pod/payments/${pod('payments-api')}`, namespaces: PAYMENTS, expect: 'nginx:1.27-alpine' },
  { name: 'logs', route: ({ pod }) => `/logs/Pod/payments/${pod('ledger-worker')}`, namespaces: PAYMENTS, expect: 'connecting to ledger-db' },
  {
    name: 'terminal',
    route: ({ pod }) => `/k/Pod/payments/${pod('payments-api')}`,
    namespaces: PAYMENTS,
    expect: /Address:\s+10\.244\./,
    // The pod's Shell action starts an exec session and opens the Shell tab on it.
    steps: [{ text: 'Shell' }, { wait: 4000 }, { focus: '.xterm-helper-textarea' }, { type: 'hostname && nslookup redis.payments.svc.cluster.local' }, { key: 'Enter' }, { wait: 2500 }],
  },
  { name: 'yaml', route: ({ context }) => `/edit/${context}/Deployment/payments/payments-api`, namespaces: PAYMENTS, expect: 'kind: Deployment' },
  { name: 'deployments', route: '/k/deployments', expect: 'payments-api' },
  { name: 'services', route: '/k/services', expect: 'payments-api-lb' },
  { name: 'nodes', route: '/k/nodes', expect: 'srelens-demo-worker2' },
  { name: 'namespaces', route: '/k/namespaces', expect: 'monitoring' },
  { name: 'events', route: '/events', expect: 'BackOff' },
  { name: 'helm', route: '/helm', expect: 'podinfo' },
  {
    name: 'port-forwards',
    route: ({ pod }) => `/k/Pod/payments/${pod('payments-api')}`,
    namespaces: PAYMENTS,
    expect: 'Active',
    keep: 'In web mode the Local column shows the server proxy URL (http://127.0.0.1:8791/pf/1/), not the desktop 127.0.0.1:8080.',
    // The pod's Forward action opens the New port forward dialog; once it is up the status bar's counter opens the Port forwards tab.
    steps: [
      { text: 'Forward' }, { wait: 1500 },
      { focus: 'input[placeholder="9090"]' }, { type: '8080' },
      { focus: 'input[placeholder="8080"]' }, { type: '80' },
      { text: 'Start forward' }, { wait: 3000 },
      { text: '1 port-forward' }, { wait: 2500 },
    ],
  },
  { name: 'mcp', route: '/settings', expect: 'Agent access', keep: 'The MCP server pane lives in the desktop app only (Settings.tsx renders a notice in web mode).' },
];

// Whether the page text has what a view waits for; a view with no expectation is always ready.
export const seen = (text, expect) => expect === undefined || (typeof expect === 'string' ? text.includes(expect) : expect.test(text));

// The views a run captures: all but the `keep` ones, or exactly the comma-separated names given (which may include them).
export function selectViews(only) {
  if (only === undefined) return VIEWS.filter((v) => !v.keep);
  const wanted = String(only).split(',');
  const unknown = wanted.find((name) => !VIEWS.some((v) => v.name === name));
  if (unknown !== undefined) throw new Error(`unknown view "${unknown}"; the views are ${VIEWS.map((v) => v.name).join(', ')}`);
  return VIEWS.filter((v) => wanted.includes(v.name));
}

export function selectThemes(list) {
  const wanted = list === undefined ? Object.keys(APP_THEME) : String(list).split(',');
  const unknown = wanted.find((theme) => !Object.hasOwn(APP_THEME, theme));
  if (unknown !== undefined) throw new Error(`unknown theme "${unknown}"; the themes are ${Object.keys(APP_THEME).join(', ')}`);
  return wanted;
}

// [title, kind] of the routes that are neither a resource list nor a subject route.
const FIXED = {
  '/overview': ['Cluster overview', 'control'],
  '/events': ['Events', 'events'],
  '/helm': ['Helm', 'helm'],
  '/forwards': ['Port forwards', 'forwards'],
  '/terminals': ['Shell', 'terminal'],
  '/settings': ['Settings', 'settings'],
};
const APP_SCOPED = new Set(['/settings']); // their tab names no cluster

// The title and kind the tab strip stores, mirroring describe() in routes.ts.
function describeRoute(route) {
  const seg = route.split('/').map(decodeURIComponent);
  if (seg[1] === 'logs' && seg.length === 5) return [`${seg[4]} · logs`, 'logs'];
  if (seg[1] === 'edit' && seg.length === 6) return [`Edit ${seg[4]}/${seg[5]}`, 'edit'];
  if (seg[1] === 'k' && seg.length === 5) return [seg[4], 'resource'];
  if (seg[1] === 'k' && seg.length === 3) return [seg[2][0].toUpperCase() + seg[2].slice(1), 'workloads'];
  if (FIXED[route]) return FIXED[route];
  throw new Error(`no tab title for route ${route}`);
}

// The `srelens.next.workspaces` document: one workspace holding every context, a pinned Home
// tab and a tab at `route`. `contexts` is k8s.listContexts' answer; the ids are its stableIds.
export function workspaceDoc(contexts, activeName, route) {
  const active = contexts.find((c) => c.name === activeName);
  if (!active) throw new Error(`no context called ${activeName}`);
  const [title, kind] = describeRoute(route);
  const tab = { id: 'shot-route', route, title, kind, ...(APP_SCOPED.has(route) ? {} : { sub: active.name }) };
  return {
    version: 1,
    currentId: 'shot-ws',
    workspaces: [{
      id: 'shot-ws',
      name: 'Default',
      clusters: contexts.map((c) => c.stableId),
      tabs: [{ id: 'shot-home', route: '/', title: 'Home', kind: 'control', pinned: true }, tab],
      activeId: tab.id,
      closed: [],
      activeCluster: active.stableId,
    }],
  };
}
