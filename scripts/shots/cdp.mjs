// Minimal Chrome DevTools Protocol client on Node's built-in WebSocket.
export function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    const listeners = new Set();
    let id = 0;
    ws.onerror = reject;
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { ok, fail } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) fail(new Error(`${msg.error.message} (${msg.error.code})`)); else ok(msg.result);
      } else {
        for (const fn of listeners) fn(msg);
      }
    };
    ws.onopen = () => resolve({
      send(method, params = {}) {
        id += 1;
        ws.send(JSON.stringify({ id, method, params }));
        return new Promise((ok, fail) => pending.set(id, { ok, fail }));
      },
      on(method, fn) {
        const listener = (msg) => { if (msg.method === method) fn(msg.params); };
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      close() { ws.close(); },
    });
  });
}
