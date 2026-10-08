// Renders the homepage "Talk to your clusters" panel from a recorded MCP stdio transcript and embeds it in index.html.
//   node scripts/embed-mcp-demo.mjs   (reads assets/captures/mcp-rollouts.jsonl and .version)
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROMPT = "What's rolling out in default, across all my clusters?";
const START = '<!-- mcp-demo:start -->';
const END = '<!-- mcp-demo:end -->';
const BAR = 'mcp · srelens — agent session';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function parseTranscript(text) {
  const lines = text.split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  const responses = new Map(lines.filter((m) => 'id' in m && !('method' in m)).map((m) => [m.id, m]));
  const init = lines.find((m) => m.method === 'initialize');
  const server = init ? responses.get(init.id)?.result?.serverInfo ?? null : null;
  const calls = lines.filter((m) => m.method === 'tools/call').map((m) => {
    const res = responses.get(m.id)?.result;
    const text = res?.content?.[0]?.text ?? '';
    const failed = !res || res.isError;
    return { id: m.id, tool: m.params.name, args: m.params.arguments ?? {}, result: failed ? null : JSON.parse(text), error: failed ? (text || 'no response') : null };
  });
  return { server: server && { name: server.name, version: server.version }, calls };
}

// Not fully rolled out: fewer up-to-date or available replicas than desired (the number after the "/" in ready).
const behind = (d) => { const desired = Number(String(d.ready).split('/')[1]); return d.upToDate < desired || d.available < desired; };

export function renderMcpDemo(text, version) {
  const { calls } = parseTranscript(text);
  const callLines = calls.map((c) => `<span class="mcp-call">→ ${esc(c.tool)}</span>${c.args.context ? `  ${esc(c.args.context)}  ${esc(c.args.namespace)}` : ''}`);
  const rows = calls.filter((c) => c.tool === 'k8s.listDeployments').flatMap((c) => (c.error
    ? [`<tr class="mcp-error"><td>${esc(c.args.context)}</td><td colspan="5">error: ${esc(c.error)}</td></tr>`]
    : c.result.deployments.map((d) => `<tr${behind(d) ? ' class="mcp-warn"' : ''}><td>${esc(c.args.context)}</td><td>${esc(d.name)}</td><td>${esc(d.ready)}</td><td>${esc(d.upToDate)}</td><td>${esc(d.available)}</td><td>${esc(d.age)}</td></tr>`)));
  return [
    '<figure class="mcp-demo">',
    `  <div class="mini" aria-label="One question, answered from three clusters">`,
    `    <div class="mini-bar">${BAR}</div>`,
    '    <div class="mini-body">',
    `      <pre tabindex="0" role="group" aria-label="${BAR}"><span class="mcp-prompt">prompt</span>  ${esc(PROMPT)}`,
    ...callLines.map((l, i) => (i === callLines.length - 1 ? `${l}</pre>` : l)),
    '      <div class="mcp-table" tabindex="0" role="group" aria-label="Deployments in default, by cluster">',
    '        <table>',
    '          <caption>Deployments in <code>default</code>, by cluster</caption>',
    '          <thead><tr><th scope="col">cluster</th><th scope="col">deployment</th><th scope="col">ready</th><th scope="col">up to date</th><th scope="col">available</th><th scope="col">age</th></tr></thead>',
    `          <tbody>${rows.join('')}</tbody>`,
    '        </table>',
    '      </div>',
    '    </div>',
    '  </div>',
    `  <figcaption>Real tool calls and results: srelens-tui v${esc(version)} --mcp-stdio, three local kind clusters. Any MCP client (Cursor, Claude Code, your own agent) can make the same calls.</figcaption>`,
    '</figure>',
  ].join('\n');
}

export function embedMcpDemo(html, block) {
  const i = html.indexOf(START);
  const j = html.indexOf(END, i);
  if (i === -1 || j === -1) throw new Error('index.html has no mcp-demo markers');
  return html.slice(0, i + START.length) + block + html.slice(j);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = join(fileURLToPath(import.meta.url), '..', '..');
  const transcript = readFileSync(join(root, 'assets/captures/mcp-rollouts.jsonl'), 'utf8');
  const version = readFileSync(join(root, 'assets/captures/mcp-rollouts.version'), 'utf8').match(/\d+\.\d+\.\d+/)[0];
  const file = join(root, 'index.html');
  writeFileSync(file, embedMcpDemo(readFileSync(file, 'utf8'), renderMcpDemo(transcript, version)));
  console.log('embedded the MCP demo into index.html');
}
