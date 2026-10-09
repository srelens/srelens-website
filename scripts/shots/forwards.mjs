// A port forward lives in the srelens server, not in the page, so the one the port-forwards view starts
// outlives its shot: every shot after it would show "1 port-forward" in the status bar. The capture
// script calls this before each load so every view starts from no forwards at all.
// `api(path, init)` is desktop-shots.mjs's authenticated fetch.
const post = (api, command, body) => api(`/api/command/${command}`, { method: 'POST', body });

export async function stopAllForwards(api) {
  const listed = await post(api, 'list_forwards', '{}');
  if (!listed.ok) throw new Error(`list_forwards failed: ${listed.status} ${await listed.text()}`);
  for (const { id } of (await listed.json()).forwards ?? []) {
    const stopped = await post(api, 'stop_port_forward', JSON.stringify({ id }));
    if (!stopped.ok) throw new Error(`stop_port_forward ${id} failed: ${stopped.status} ${await stopped.text()}`);
  }
}
