// Panel contract test: evaluates client.js against a mocked module loader and
// asserts the slots/locale contract without a browser.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8');

const React = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: value => [value, () => {}],
  useEffect: () => {},
  useRef: value => ({ current: value }),
  useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot(),
};

let plugin = null;
const registered = [];
const injected = [];
const slots = {
  injected,
  register(options, component) {
    if (!options?.name) throw new Error('slot needs a name');
    if (options.name === 'sidebar.panellist' && !options.id) throw new Error('panel list slot needs an id');
    if (options.name === 'main' && !options.key) throw new Error('keyed slot needs a key');
    registered.push({ options, component });
    return () => {};
  },
  inject(key, callback) {
    injected.push(key);
    callback();
  },
};
const locale = {
  register: () => () => {},
  bind: () => key => key,
  subscribe: () => () => {},
  getSnapshot: () => ({ active: 'zh' }),
};
const ctx = { slots, locale, effect: fn => fn() };

globalThis.window = { __ModuleLoader__: { load(row) { plugin = row.factory(() => React); } } };
globalThis.document = { baseURI: 'http://127.0.0.1:1/', hidden: false };

new Function('window', source)(globalThis.window);

assert.ok(plugin, 'client bundle registers a module factory');
assert.deepEqual(plugin.inject.slice().sort(), ['locale', 'slots']);
plugin.apply(ctx);

assert.deepEqual(injected.slice().sort(), ['main', 'sidebar.panellist']);

const listSlot = registered.find(entry => entry.options.name === 'sidebar.panellist');
assert.ok(listSlot, 'panel list entry registered');
assert.equal(listSlot.options.id, 'serena-manager');
assert.equal(typeof listSlot.options.label, 'function', 'list label is a translation function');

const mainSlot = registered.find(entry => entry.options.name === 'main');
assert.ok(mainSlot, 'panel body registered into the main slot');
assert.equal(mainSlot.options.key, 'serena-manager');
assert.equal(typeof mainSlot.component, 'function', 'panel body is a component');

console.log('PASS panel smoke');
