import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/site.mjs';

// main.js is progressive enhancement over plain markup. These tests run the real file against a
// minimal fake DOM (just the selectors main.js uses) and check the tab behaviour end to end.
const source = readFileSync(join(ROOT, 'main.js'), 'utf8');

class El {
  constructor(tag, attrs = {}, children = []) {
    const { hidden, class: cls, ...rest } = attrs;
    this.tagName = tag.toUpperCase();
    this.attrs = rest;
    this.hidden = Boolean(hidden);
    this.classes = new Set((cls ?? '').split(/\s+/).filter(Boolean));
    this.classList = {
      add: (c) => this.classes.add(c),
      remove: (c) => this.classes.delete(c),
      contains: (c) => this.classes.has(c),
    };
    this.children = children;
    this.listeners = {};
    this.tabIndex = rest.tabindex === undefined ? 0 : Number(rest.tabindex);
    this.focused = false;
  }
  getAttribute(name) { return name in this.attrs ? this.attrs[name] : null; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  removeAttribute(name) { delete this.attrs[name]; }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  appendChild(child) { this.children.push(child); return child; }
  contains(node) { return Boolean(node) && (node === this || this.children.some((child) => child.contains(node))); }
  focus() { this.focused = true; this.ownerDocument.activeElement = this; }
  dispatch(type, event = {}) {
    const e = { preventDefault() { e.prevented = true; }, target: this, ...event };
    for (const fn of this.listeners[type] ?? []) fn(e);
    return e;
  }
  matches(selector) {
    return selector.split(',').some((part) => {
      const s = part.trim();
      let m = s.match(/^\[([\w-]+)(?:='([^']*)')?\]$/);
      if (m) return m[2] === undefined ? this.getAttribute(m[1]) !== null : this.getAttribute(m[1]) === m[2];
      m = s.match(/^\.([\w-]+)$/);
      return m ? this.classes.has(m[1]) : false;
    });
  }
  querySelectorAll(selector) {
    const out = [];
    const walk = (node) => node.children.forEach((child) => {
      if (child.matches(selector)) out.push(child);
      walk(child);
    });
    walk(this);
    return out;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
}

const el = (tag, attrs, children) => new El(tag, attrs, children);

// The homepage's switch and drill, as served (no JS has run: every panel of the switch is visible).
// `extras` adds elements to <body>; `reduced` is what prefers-reduced-motion reports.
function fixture({ withModes = true, withDrill = true, fieldInTablist = false, errPath = null, extras = [], reduced = true } = {}) {
  const tabs = ['desktop', 'terminal'].map((m, i) => el('button', { id: `mode-tab-${m}`, role: 'tab', 'aria-selected': String(i === 0), 'data-mode-tab': m, tabindex: i === 0 ? undefined : '-1' }));
  const download = el('a', { id: 'mode-download' }); // a control inside the switch's container but outside its tab bar
  const panels = ['desktop', 'terminal'].map((m, i) => el('div', { id: `mode-${m}`, role: 'tabpanel', 'data-mode-panel': m }, i === 0 ? [download] : []));
  const tablist = el('div', { class: 'mode-tabs', role: 'tablist', hidden: true }, tabs);
  const field = el('input', { id: 'mode-field' }); // not in the real markup: lets a test put a text field inside the tab bar
  if (fieldInTablist) tablist.children.push(field);
  const modes = el('div', { class: 'modes', 'data-modes': '' }, [tablist, ...panels]);

  const steps = ['signal', 'diagnose', 'act'];
  const drillTabs = steps.map((s, i) => el('button', { id: `incident-tab-${s}`, role: 'tab', 'aria-selected': String(i === 0), 'data-incident-tab': s, tabindex: i === 0 ? undefined : '-1' }));
  const drillPanels = steps.map((s, i) => el('section', { id: `incident-${s}`, role: 'tabpanel', 'data-incident-panel': s, hidden: i > 0 }));
  const nexts = steps.map((s, i) => el('button', { 'data-incident-next': steps[(i + 1) % steps.length] }));

  const errSpan = errPath === null ? null : el('span', { 'data-err-path': '' }); // the 404 page's terminal line
  if (errSpan) Object.defineProperty(errSpan, 'innerHTML', { set() { throw new Error('innerHTML must not be used for the path'); } });
  const body = el('body', {}, [...(withModes ? [modes] : []), ...(withDrill ? [...drillTabs, ...drillPanels, ...nexts] : []), ...(errSpan ? [errSpan] : []), ...extras]);
  const root = el('html', { 'data-theme': 'dark' }, [body]);
  const document = el('#document', {}, [root]);
  document.documentElement = root;
  document.body = body;
  const styleCalls = []; // body.style.setProperty(...) calls
  document.body.style = { setProperty: (...args) => styleCalls.push(args) };
  document.readyState = 'complete';
  document.activeElement = null;
  document.getElementById = (id) => document.querySelectorAll(`[id='${id}']`)[0] ?? null;
  document.createElement = (tag) => { const e = el(tag); e.style = {}; return e; };
  const all = [document, root, body, ...document.querySelectorAll('[id]'), ...body.querySelectorAll('[role]'), ...nexts];
  for (const node of all) node.ownerDocument = document;

  const windowEvents = []; // event types main.js listens for on window
  const timers = []; // setTimeout calls, never fired
  const observers = []; // IntersectionObserver instances
  const stored = {}; // localStorage writes
  const copied = []; // clipboard writes
  const IntersectionObserver = class { constructor() { observers.push(this); } observe() {} unobserve() {} };
  const window = {
    matchMedia: () => ({ matches: reduced }),
    addEventListener: (type) => windowEvents.push(type),
    location: { hash: '', origin: 'http://localhost', pathname: errPath ?? '/' },
    scrollY: 0,
    IntersectionObserver,
  };
  vm.runInNewContext(source, {
    document, window, history: {}, IntersectionObserver,
    navigator: { clipboard: { writeText: (text) => { copied.push(text); return Promise.resolve(); } } },
    localStorage: { setItem: (key, value) => { stored[key] = value; } },
    setTimeout: (fn, ms) => timers.push({ fn, ms }),
  });
  return { document, modes, tablist, tabs, panels, download, field, drillTabs, drillPanels, nexts, errSpan, windowEvents, timers, observers, styleCalls, stored, copied };
}

const state = (nodes) => nodes.map((n) => n.hidden);
const selected = (nodes) => nodes.map((n) => n.getAttribute('aria-selected'));

test('the mode switch is enhanced on load: tab bar revealed, desktop shown, terminal hidden', () => {
  const { modes, tablist, tabs, panels } = fixture();
  assert.equal(tablist.hidden, false);
  assert.ok(modes.classList.contains('is-enhanced'));
  assert.deepEqual(state(panels), [false, true]);
  assert.deepEqual(selected(tabs), ['true', 'false']);
  assert.deepEqual(tabs.map((t) => t.tabIndex), [0, -1]);
});

test('keys 1 and 2 switch the mode while focus is on a tab of the switch', () => {
  const { document, panels, tabs } = fixture();
  tabs[0].focus();
  document.dispatch('keydown', { key: '2' });
  assert.deepEqual(state(panels), [true, false]);
  assert.deepEqual(selected(tabs), ['false', 'true']);
  document.dispatch('keydown', { key: '1' });
  assert.deepEqual(state(panels), [false, true]);
});

test('the number keys do nothing unless a tab of the switch has focus (WCAG 2.1.4)', () => {
  const { document, panels, tabs, drillTabs, download } = fixture();
  // outside the page widget, and inside the switch's container but not on a tab (e.g. the Download link)
  for (const elsewhere of [null, drillTabs[0], el('input'), download]) {
    document.activeElement = elsewhere;
    document.dispatch('keydown', { key: '2' });
    assert.deepEqual(state(panels), [false, true], 'focus not on a tab');
  }
  tabs[0].focus();
  document.dispatch('keydown', { key: '2' });
  assert.deepEqual(state(panels), [true, false], 'focus on a tab of the switch');
});

test('on a tab the number keys are still ignored with a modifier and while typing in a field', () => {
  const { document, panels, tabs, field } = fixture({ fieldInTablist: true });
  tabs[0].focus();
  for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey']) document.dispatch('keydown', { key: '2', [modifier]: true });
  assert.deepEqual(state(panels), [false, true], 'modifiers');
  field.focus();
  document.dispatch('keydown', { key: '2' });
  assert.deepEqual(state(panels), [false, true], 'typing in an input');
});

test('clicking a tab switches the mode', () => {
  const { panels, tabs } = fixture();
  tabs[1].dispatch('click');
  assert.deepEqual(state(panels), [true, false]);
  tabs[0].dispatch('click');
  assert.deepEqual(state(panels), [false, true]);
});

test('arrow keys move between the tabs, wrap around and focus the new tab', () => {
  const { tabs, panels } = fixture();
  const right = tabs[0].dispatch('keydown', { key: 'ArrowRight' });
  assert.ok(right.prevented);
  assert.deepEqual(state(panels), [true, false]);
  assert.ok(tabs[1].focused);
  tabs[1].dispatch('keydown', { key: 'ArrowRight' });
  assert.deepEqual(state(panels), [false, true], 'wraps to the first tab');
  const other = tabs[0].dispatch('keydown', { key: 'a' });
  assert.ok(!other.prevented);
});

test('the incident drill still steps through its three panels, independently of the mode switch', () => {
  const { document, drillTabs, drillPanels, nexts, panels, tabs } = fixture();
  assert.deepEqual(state(drillPanels), [false, true, true]);
  nexts[0].dispatch('click');
  assert.deepEqual(state(drillPanels), [true, false, true]);
  assert.deepEqual(selected(drillTabs), ['false', 'true', 'false']);
  drillTabs[1].dispatch('keydown', { key: 'ArrowRight' });
  assert.deepEqual(state(drillPanels), [true, true, false]);
  nexts[2].dispatch('click');
  assert.deepEqual(state(drillPanels), [false, true, true]);
  tabs[0].focus();
  document.dispatch('keydown', { key: '2' });
  assert.deepEqual(state(drillPanels), [false, true, true], 'the mode keys do not touch the drill');
  assert.deepEqual(state(panels), [true, false]);
});

test('pages without the switch or the drill load without error', () => {
  assert.doesNotThrow(() => fixture({ withModes: false, withDrill: false }));
  assert.doesNotThrow(() => fixture({ withModes: false }));
});

test('the 404 terminal line shows the requested path', () => {
  const { errSpan } = fixture({ withModes: false, withDrill: false, errPath: '/no-such-page/' });
  assert.equal(errSpan.textContent, '/no-such-page/');
});

test('the 404 path is written as text, never as markup', () => {
  const hostile = '/<img src=x onerror=alert(1)>/';
  const { errSpan } = fixture({ withModes: false, withDrill: false, errPath: hostile });
  assert.equal(errSpan.textContent, hostile);
});

// ---- no scroll progress, scroll reveal, typing log line or pod flip: the terminal-native pages have none of them ----

test('main.js has no scroll-progress, scroll-reveal, typing-line or pod-flip block, and no reduced-motion branch', () => {
  const dead = [
    ['navigation scroll progress', '--scroll-progress'],
    ['scroll reveal', 'IntersectionObserver'],
    ['hero mock: typing log line', 'type-line'],
    ['hero mock: pending pod flips to running', 'flip-status'],
  ];
  for (const [block, hook] of dead) {
    assert.ok(!source.includes(block), `main.js still has the "${block}" block`);
    assert.ok(!source.includes(hook), `main.js still reads ${hook}`);
  }
  assert.ok(!source.includes('.reveal'), 'main.js still selects .reveal');
  assert.ok(!/\breduced\b/.test(source), 'main.js still has a reduced-motion branch, and nothing is left to animate');
});

test('nothing is wired to scrolling or resizing on a page without a table of contents', () => {
  for (const reduced of [true, false]) {
    const { windowEvents, styleCalls } = fixture({ reduced });
    assert.ok(!windowEvents.includes('scroll') && !windowEvents.includes('resize'), `reduced=${reduced}: window listens for ${windowEvents}`);
    assert.deepEqual(styleCalls, [], `reduced=${reduced}: body.style.setProperty was called`);
  }
});

test('.reveal elements are left as served: no observer, no "in" class', () => {
  for (const reduced of [true, false]) {
    const reveal = el('div', { class: 'reveal' });
    const { observers } = fixture({ reduced, extras: [reveal] });
    assert.equal(observers.length, 0, `reduced=${reduced}: an IntersectionObserver was created`);
    assert.ok(!reveal.classList.contains('in'), `reduced=${reduced}: .reveal got the "in" class`);
  }
});

test('the hero log line and the pending pod are left as served: nothing is typed, nothing is scheduled', () => {
  for (const reduced of [true, false]) {
    const typeLine = el('span', { id: 'type-line' });
    typeLine.textContent = 'payment gateway recovered — 200 OK (1.2s)';
    const flip = el('td', { id: 'flip-status' });
    flip.innerHTML = '<span class="status pending"><i></i>Pending</span>';
    const { timers } = fixture({ reduced, extras: [typeLine, flip] });
    assert.equal(timers.length, 0, `reduced=${reduced}: main.js scheduled ${timers.length} timer(s) at load`);
    assert.equal(typeLine.textContent, 'payment gateway recovered — 200 OK (1.2s)');
    assert.equal(flip.innerHTML, '<span class="status pending"><i></i>Pending</span>');
  }
});

// ---- what the pages still use, kept ----

test('the theme toggle flips data-theme and remembers the choice', () => {
  const toggle = el('button', { class: 'theme-toggle' });
  const { document, stored } = fixture({ extras: [toggle] });
  toggle.dispatch('click');
  assert.equal(document.documentElement.getAttribute('data-theme'), 'light');
  assert.equal(stored.theme, 'light');
  toggle.dispatch('click');
  assert.equal(document.documentElement.getAttribute('data-theme'), 'dark');
  assert.equal(stored.theme, 'dark');
});

test('a copy button copies its data-copy text and says so', () => {
  const button = el('button', { 'data-copy': 'brew install srelens' });
  button.textContent = 'copy';
  const { copied } = fixture({ extras: [button] });
  button.dispatch('click');
  assert.deepEqual(copied, ['brew install srelens']);
});

test('the footer year is filled in', () => {
  const year = el('span', { id: 'year' });
  fixture({ extras: [year] });
  assert.equal(year.textContent, String(new Date().getFullYear()));
});

// Devesh 2026-10-09 ("Hide the button"): the old-UI product tour is hidden, so its dialog code is gone.
test('main.js carries no product-tour code', () => {
  assert.doesNotMatch(source, /tour|walkthrough/i);
});
