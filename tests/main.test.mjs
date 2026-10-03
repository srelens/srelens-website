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
  contains() { return false; }
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
function fixture({ withModes = true, withDrill = true } = {}) {
  const tabs = ['desktop', 'terminal'].map((m, i) => el('button', { id: `mode-tab-${m}`, role: 'tab', 'aria-selected': String(i === 0), 'data-mode-tab': m, tabindex: i === 0 ? undefined : '-1' }));
  const panels = ['desktop', 'terminal'].map((m) => el('div', { id: `mode-${m}`, role: 'tabpanel', 'data-mode-panel': m }));
  const tablist = el('div', { class: 'mode-tabs', role: 'tablist', hidden: true }, tabs);
  const modes = el('div', { class: 'modes', 'data-modes': '' }, [tablist, ...panels]);

  const steps = ['signal', 'diagnose', 'act'];
  const drillTabs = steps.map((s, i) => el('button', { id: `incident-tab-${s}`, role: 'tab', 'aria-selected': String(i === 0), 'data-incident-tab': s, tabindex: i === 0 ? undefined : '-1' }));
  const drillPanels = steps.map((s, i) => el('section', { id: `incident-${s}`, role: 'tabpanel', 'data-incident-panel': s, hidden: i > 0 }));
  const nexts = steps.map((s, i) => el('button', { 'data-incident-next': steps[(i + 1) % steps.length] }));

  const body = el('body', {}, [...(withModes ? [modes] : []), ...(withDrill ? [...drillTabs, ...drillPanels, ...nexts] : [])]);
  const root = el('html', { 'data-theme': 'dark' }, [body]);
  const document = el('#document', {}, [root]);
  document.documentElement = root;
  document.body = body;
  document.body.style = { setProperty() {} };
  document.readyState = 'complete';
  document.activeElement = null;
  document.getElementById = (id) => document.querySelectorAll(`[id='${id}']`)[0] ?? null;
  document.createElement = (tag) => { const e = el(tag); e.style = {}; return e; };
  const all = [document, root, body, ...document.querySelectorAll('[id]'), ...body.querySelectorAll('[role]'), ...nexts];
  for (const node of all) node.ownerDocument = document;

  const window = {
    matchMedia: () => ({ matches: true }),
    addEventListener() {},
    location: { hash: '', origin: 'http://localhost', pathname: '/' },
    scrollY: 0,
    innerHeight: 800,
  };
  vm.runInNewContext(source, { document, window, navigator: {}, history: {}, localStorage: { setItem() {} }, setTimeout() {} });
  return { document, modes, tablist, tabs, panels, drillTabs, drillPanels, nexts };
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

test('keys 1 and 2 switch the mode', () => {
  const { document, panels, tabs } = fixture();
  document.dispatch('keydown', { key: '2' });
  assert.deepEqual(state(panels), [true, false]);
  assert.deepEqual(selected(tabs), ['false', 'true']);
  document.dispatch('keydown', { key: '1' });
  assert.deepEqual(state(panels), [false, true]);
});

test('the number keys are ignored with a modifier and while typing in a field', () => {
  const { document, panels } = fixture();
  for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey']) document.dispatch('keydown', { key: '2', [modifier]: true });
  assert.deepEqual(state(panels), [false, true], 'modifiers');
  document.activeElement = el('input');
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
  const { document, drillTabs, drillPanels, nexts, panels } = fixture();
  assert.deepEqual(state(drillPanels), [false, true, true]);
  nexts[0].dispatch('click');
  assert.deepEqual(state(drillPanels), [true, false, true]);
  assert.deepEqual(selected(drillTabs), ['false', 'true', 'false']);
  drillTabs[1].dispatch('keydown', { key: 'ArrowRight' });
  assert.deepEqual(state(drillPanels), [true, true, false]);
  nexts[2].dispatch('click');
  assert.deepEqual(state(drillPanels), [false, true, true]);
  document.dispatch('keydown', { key: '2' });
  assert.deepEqual(state(drillPanels), [false, true, true], 'the mode keys do not touch the drill');
  assert.deepEqual(state(panels), [true, false]);
});

test('pages without the switch or the drill load without error', () => {
  assert.doesNotThrow(() => fixture({ withModes: false, withDrill: false }));
  assert.doesNotThrow(() => fixture({ withModes: false }));
});
