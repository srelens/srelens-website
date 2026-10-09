// Minimal Chrome DevTools Protocol client on Node's built-in WebSocket.
// Once the socket closes or errors, every pending and later request rejects and listeners stop,
// so a dead browser fails the run instead of hanging it.
export function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    const listeners = new Set();
    let id = 0;
    let opened = false;
    let dead = null;
    const die = (message) => {
      if (dead) return;
      dead = new Error(message);
      for (const { fail } of pending.values()) fail(dead);
      pending.clear();
      listeners.clear();
    };
    ws.onerror = (event) => { if (opened) die(`CDP socket error: ${event?.message || 'connection lost'}`); else reject(event); };
    ws.onclose = () => die('CDP socket closed');
    ws.onmessage = (event) => {
      if (dead) return;
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { ok, fail } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) fail(new Error(`${msg.error.message} (${msg.error.code})`)); else ok(msg.result);
      } else {
        for (const fn of listeners) fn(msg);
      }
    };
    ws.onopen = () => {
      opened = true;
      resolve({
        send(method, params = {}) {
          if (dead) return Promise.reject(dead);
          id += 1;
          const mine = id;
          return new Promise((ok, fail) => {
            pending.set(mine, { ok, fail });
            try { ws.send(JSON.stringify({ id: mine, method, params })); } catch (err) { pending.delete(mine); fail(err); }
          });
        },
        on(method, fn) {
          const listener = (msg) => { if (msg.method === method) fn(msg.params); };
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        close() { ws.close(); },
      });
    };
  });
}

// Page.navigate, then wait for the load event: fails on the errorText Page.navigate reports and
// on a load event that never comes.
export async function navigate(cdp, url, timeoutMs = 30000) {
  let off;
  let timer;
  const loaded = new Promise((done, fail) => {
    off = cdp.on('Page.loadEventFired', done);
    timer = setTimeout(() => fail(new Error(`navigation to ${url} timed out after ${timeoutMs} ms`)), timeoutMs);
  });
  loaded.catch(() => {}); // a timeout that fires while Page.navigate is still in flight is awaited below
  try {
    const { errorText } = await cdp.send('Page.navigate', { url });
    if (errorText) throw new Error(`navigation to ${url} failed: ${errorText}`);
    await loaded;
  } finally {
    off();
    clearTimeout(timer);
  }
}
