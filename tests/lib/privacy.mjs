// What must never appear in a committed file or a published capture: a personal home path,
// or the name of whoever runs the tests (OS user name and git author name).
import os from 'node:os';
import { execFileSync } from 'node:child_process';

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
