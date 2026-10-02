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
  const p = codes.length ? codes : ['0'];
  for (let i = 0; i < p.length; i += 1) {
    const part = p[i];
    // Handle colon-separated sub-parameters: for parts like "38:2::255:0:0" or "4:3"
    // Extract the main code (first number before any colon)
    let n = typeof part === 'string' && part.includes(':')
      ? parseInt(part.split(':')[0], 10)
      : parseInt(part, 10);
    if (isNaN(n)) n = 0;

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
    else if (n === 38 || n === 48 || n === 58) {
      // Handle 38 (foreground), 48 (background), and 58 (underline color)
      const key = n === 38 ? 'fg' : n === 48 ? 'bg' : null;

      // Parse colon-separated form: e.g., "38:5:196" or "38:2::255:0:0"
      if (typeof part === 'string' && part.includes(':')) {
        const subParts = part.split(':');
        const subType = parseInt(subParts[1], 10);

        if (subType === 5 && subParts.length >= 3) {
          // 256-color: take the last value
          const colorIdx = parseInt(subParts[subParts.length - 1], 10);
          if (!isNaN(colorIdx) && colorIdx >= 0 && colorIdx <= 255 && key) {
            state[key] = xterm256(colorIdx);
          }
        } else if (subType === 2 && subParts.length >= 5) {
          // Truecolor: take the last three values as r, g, b
          const r = parseInt(subParts[subParts.length - 3], 10);
          const g = parseInt(subParts[subParts.length - 2], 10);
          const b = parseInt(subParts[subParts.length - 1], 10);
          if (!isNaN(r) && !isNaN(g) && !isNaN(b) &&
              r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255 && key) {
            state[key] = hex(r, g, b);
          }
        }
      } else {
        // Semicolon-separated form (original): 38;5;n or 38;2;r;g;b
        const next1 = parseInt(p[i + 1], 10);
        const next2 = parseInt(p[i + 2], 10);
        const next3 = parseInt(p[i + 3], 10);
        const next4 = parseInt(p[i + 4], 10);

        if (key) {
          if (next1 === 5) {
            // 256-color form: consume 2 args, but only apply if colorIdx is valid
            if (!isNaN(next2) && next2 >= 0 && next2 <= 255) {
              state[key] = xterm256(next2);
            }
            i += 2;
          } else if (next1 === 2) {
            // Truecolor form: consume 4 args, but only apply if all values are valid
            if (!isNaN(next2) && !isNaN(next3) && !isNaN(next4) &&
                next2 >= 0 && next2 <= 255 && next3 >= 0 && next3 <= 255 && next4 >= 0 && next4 <= 255) {
              state[key] = hex(next2, next3, next4);
            }
            i += 4;
          }
        } else if (n === 58) {
          // Underline color: just consume arguments without applying
          if (next1 === 5) {
            i += 2;
          } else if (next1 === 2) {
            i += 4;
          }
        }
      }
    } else if (n === 59) {
      // Underline color reset: ignore
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

  // Enhanced regex to drop more escape sequences:
  // SGR (with colons) | general CSI | OSC (with ST terminator) | charset designation | other escapes | carriage return
  const re = /\x1b\[([0-9;:]*)m|\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][\s\S]*?(?:\x07|\x1b\\)|\x1b[()*+][0-9A-Za-z]|\x1b[@-Z\\-_]|\r/g;
  let last = 0;
  let m;
  while ((m = re.exec(input))) {
    buf += input.slice(last, m.index);
    last = re.lastIndex;
    if (m[1] === undefined) continue; // Not an SGR, so drop it

    const next = { ...state };
    // Split on semicolons, but keep colons intact within each part
    const codes = m[1] === '' ? [] : m[1].split(';');
    applySgr(next, codes);
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
