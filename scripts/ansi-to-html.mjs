// Convert terminal output with ANSI SGR escapes (as written by `tmux capture-pane -p -e`)
// into HTML for <pre class="tui">. Colors become inline styles on spans; the terminal
// block is dark in both site themes, so fixed colors are safe.
//   node scripts/ansi-to-html.mjs assets/captures/pods.ansi
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Indexes 0-15, tuned to the site's terminal tokens.
export const PALETTE_16 = [
  '#1d1828', '#f87171', '#4ade80', '#facc15', '#60a5fa', '#f472b6', '#67e8f9', '#d9d3e3',
  '#6b6378', '#fca5a5', '#86efac', '#fde047', '#93c5fd', '#f9a8d4', '#a5f3fc', '#ffffff',
];

const hex = (r, g, b) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function xterm256(n) {
  if (n < 16) return PALETTE_16[n];
  if (n >= 232) { const v = 8 + (n - 232) * 10; return hex(v, v, v); }
  const i = n - 16;
  const steps = [0, 95, 135, 175, 215, 255];
  return hex(steps[Math.floor(i / 36)], steps[Math.floor(i / 6) % 6], steps[i % 6]);
}

const RESET = { fg: null, bg: null, bold: false, dim: false, italic: false, underline: false, reverse: false };

function applySgr(state, codes) {
  const p = codes.length ? codes : [0];
  for (let i = 0; i < p.length; i += 1) {
    const n = p[i];
    if (n === 0) Object.assign(state, RESET);
    else if (n === 1) state.bold = true;
    else if (n === 2) state.dim = true;
    else if (n === 3) state.italic = true;
    else if (n === 4) state.underline = true;
    else if (n === 7) state.reverse = true;
    else if (n === 22) { state.bold = false; state.dim = false; }
    else if (n === 23) state.italic = false;
    else if (n === 24) state.underline = false;
    else if (n === 27) state.reverse = false;
    else if (n >= 30 && n <= 37) state.fg = PALETTE_16[n - 30];
    else if (n === 39) state.fg = null;
    else if (n >= 40 && n <= 47) state.bg = PALETTE_16[n - 40];
    else if (n === 49) state.bg = null;
    else if (n >= 90 && n <= 97) state.fg = PALETTE_16[n - 90 + 8];
    else if (n >= 100 && n <= 107) state.bg = PALETTE_16[n - 100 + 8];
    else if (n === 38 || n === 48) {
      const key = n === 38 ? 'fg' : 'bg';
      if (p[i + 1] === 5) { state[key] = xterm256(p[i + 2]); i += 2; }
      else if (p[i + 1] === 2) { state[key] = hex(p[i + 2], p[i + 3], p[i + 4]); i += 4; }
    }
  }
}

function styleOf(state) {
  let { fg, bg } = state;
  if (state.reverse) [fg, bg] = [bg ?? 'var(--term-bg)', fg ?? 'var(--term-fg)'];
  const parts = [];
  if (fg) parts.push(`color:${fg}`);
  if (bg) parts.push(`background:${bg}`);
  if (state.bold) parts.push('font-weight:700');
  if (state.dim) parts.push('opacity:.7');
  if (state.italic) parts.push('font-style:italic');
  if (state.underline) parts.push('text-decoration:underline');
  return parts.join(';');
}

export function ansiToHtml(input) {
  const state = { ...RESET };
  let out = '';
  let open = '';
  let buf = '';
  const flush = () => {
    if (!buf) return;
    out += open ? `<span style="${open}">${esc(buf)}</span>` : esc(buf);
    buf = '';
  };
  // SGR | other CSI | OSC | carriage return
  const re = /\x1b\[([0-9;]*)m|\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*\x07|\r/g;
  let last = 0;
  let m;
  while ((m = re.exec(input))) {
    buf += input.slice(last, m.index);
    last = re.lastIndex;
    if (m[1] === undefined) continue;
    const next = { ...state };
    applySgr(next, m[1] === '' ? [] : m[1].split(';').map(Number));
    const style = styleOf(next);
    if (style !== open) { flush(); open = style; }
    Object.assign(state, next);
  }
  buf += input.slice(last);
  flush();
  return out.replace(/\n+$/, '');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(`${ansiToHtml(readFileSync(process.argv[2], 'utf8'))}\n`);
}
