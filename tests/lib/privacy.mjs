// What must never appear in a committed file or a published capture: a personal home path,
// or the name of whoever runs the tests (OS user name and git author name).
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// A home directory on Windows (any drive, either slash), Git Bash (drive letter as a folder), macOS or Linux.
// The last form must start a path, so a URL such as https://example.com/home/page does not count.
export const HOME_PATH = /[A-Za-z]:[\\/]+Users[\\/]|\/[a-z]\/Users\/|(?<![\w.-])\/(?:Users|home)\/[^/\s]/;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const gitName = () => {
  try { return execFileSync('git', ['config', 'user.name'], { encoding: 'utf8' }).trim(); } catch { return ''; }
};
// os.userInfo() throws when the uid has no passwd entry (some containers).
const osUser = () => {
  try { return os.userInfo().username; } catch { return process.env.USER ?? process.env.USERNAME ?? ''; }
};

// Whole-word, case-insensitive match of every name of 4+ letters; with none, a pattern that matches nothing.
export function ownerPattern(names) {
  const words = names.filter((w) => w.length >= 4);
  return words.length ? new RegExp(`\\b(?:${words.map(escapeRe).join('|')})\\b`, 'i') : /(?!)/;
}

export const OWNER = ownerPattern([osUser(), ...gitName().split(/\s+/)]);

// ---- stored captures (assets/captures/*.ansi and *.jsonl) -------------------------------------------------------------
// Only the demo contexts may appear: the TUI demo cluster and the three MCP demo clusters.
const FOREIGN_CONTEXT = /kind-(?!srelens-demo\b|demo-(?:eu|us|ap)\b)[\w-]+/;
const HOST_DATA = /\/Users\/|\/home\/|C:\\|gmail|@[a-z0-9.-]+\.[a-z]{2,}/i;
// The bare words token and password are legitimate inside tool output, so the transcript rule names key material instead.
const KEY_MATERIAL = ['client-key-data', 'client-certificate-data', '-----BEGIN'];
// What a provider key, a bearer header or an env var assignment looks like (Anthropic sk-ant-, OpenAI sk-, Gemini AIza).
const API_KEY = /\bsk-[\w-]{20,}|\bAIza[\w-]{30,}|\b(?:ANTHROPIC|OPENAI|GEMINI)_API_KEY\s*[=:]\s*\S|\bBearer\s+[\w.~+/-]{16,}/;
// The assistant's replies end with "⚡ N tokens (X prompt, Y completion)" and its greeting offers "token compression": product text, not credentials.
const TOKEN_ESTIMATE = /[\d,.]+ tokens \(\d[\d,.]* prompt|token compression/g;

// What is wrong with one stored capture, as a list of plain-language problems (empty when it is fit to publish).
export function captureProblems(file, raw) {
  const problems = [];
  const ansi = file.endsWith('.ansi');
  const plain = ansi ? raw.replace(/\x1b\[[0-9;:]*m/g, '') : raw;
  if (ansi) {
    if (/[\x00-\x08\x0b-\x1f\x7f]/.test(plain)) problems.push('control characters left after the colors');
    if (/Connecting\.\.\.|Loading\b|\berror:|Cluster unreachable|update available|Update: v\d/i.test(plain)) problems.push('loading, error or update banner');
    const words = file === 'assistant.ansi' ? plain.replace(TOKEN_ESTIMATE, '') : plain;
    if (/\[● 2:|token|password/i.test(words)) problems.push('second context or credential word');
    if (/No API key configured/.test(plain)) problems.push('the assistant has no AI key (docker run -e ANTHROPIC_API_KEY ...)');
  } else {
    for (const needle of KEY_MATERIAL) if (plain.includes(needle)) problems.push(`carries ${needle}`);
  }
  if (API_KEY.test(plain)) problems.push('an API key or bearer token');
  if (FOREIGN_CONTEXT.test(plain)) problems.push('a context other than the demo ones');
  if (HOST_DATA.test(plain)) problems.push('host data');
  if (HOME_PATH.test(plain)) problems.push('a personal home path');
  if (OWNER.test(plain)) problems.push('the name of whoever took the capture');
  return problems;
}

// { file: problems } for every .ansi and .jsonl file in dir, whatever it is called: a capture added later is covered too.
export function scanCaptureDir(dir) {
  return Object.fromEntries(readdirSync(dir).filter((f) => /\.(ansi|jsonl)$/.test(f)).map((f) => [f, captureProblems(f, readFileSync(join(dir, f), 'utf8'))]));
}
