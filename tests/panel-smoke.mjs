// Panel contract test: evaluates client.js against a mocked module loader and
// asserts the slots/locale contract without a browser.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8');

let panelSnapshot = null;
let stateIndex = 0;
const dicts = {};
const React = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: value => [stateIndex++ === 0 ? panelSnapshot : value, () => {}],
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
  register: (namespace, language, dict) => { dicts[language] = dict; return () => {}; },
  bind: () => key => dicts.zh?.[key] || key,
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

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.children)];
}
const indexedAt = '2026-11-05T02:00:00.000Z';
panelSnapshot = {
  projects: [
    { id: 'live', name: 'Live project', path: '/live', indexed: true, indexedAt, running: true },
    { id: 'new', name: 'New project', path: '/new', indexed: false, running: false },
  ],
  totals: { projects: 2, indexed: 1, running: 1, tools: 0 },
  serena: { bin: '/serena', installed: true }, observedAt: indexedAt,
};
stateIndex = 0;
const tree = nodes(mainSlot.component());
const update = tree.find(node => node.type === 'button' && node.children.includes('更新索引'));
assert.ok(update, 'existing index has an explicit refresh action');
assert.equal(update.props.disabled, false, 'live projects can refresh with managed stop and restore');
assert.ok(tree.some(node => node.type === 'button' && node.children.includes('建索引')), 'new projects retain build action');
assert.ok(tree.some(node => node.type === 'time' && node.props.dateTime === indexedAt), 'cache timestamp visible');
assert.match(dicts.en.updateIndex, /Update index/);
assert.match(dicts.zh.indexHint, /代码/);
console.log('PASS panel smoke');
