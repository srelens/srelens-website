// What must never appear in a committed file or a published capture: a personal home path,
// or the name of whoever runs the tests (OS user name and git author name).
import os from 'node:os';
import { execFileSync } from 'node:child_process';

// A home directory on Windows (any drive, either slash), Git Bash (drive letter as a folder), macOS or Linux.
export const HOME_PATH = /[A-Za-z]:[\\/]+Users[\\/]|\/[a-z]\/Users\/|\/(?:Users|home)\/[^/\s]/;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const gitName = () => {
  try { return execFileSync('git', ['config', 'user.name'], { encoding: 'utf8' }).trim(); } catch { return ''; }
};

// Whole-word, case-insensitive: the OS user name and every word of 4+ letters in the git author name.
export const OWNER = new RegExp(`\\b(?:${[os.userInfo().username, ...gitName().split(/\s+/)]
  .filter((w) => w.length >= 4).map(escapeRe).join('|')})\\b`, 'i');
