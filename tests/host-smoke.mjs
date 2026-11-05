// Host smoke test: boots the plugin against a mocked cordis context and a
// throwaway storage dir. No Serena binary, no child process, no network.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const moduleUrl = new URL('../index.js', import.meta.url).href;
let loadCount = 0;

function makeContext(storageDir) {
  const routes = new Map();
  const tools = new Map();
  const disposers = [];
  const ctx = {
    logger: { info() {}, warn() {}, error() {} },
    effect(fn) { const dispose = fn(); if (typeof dispose === 'function') disposers.push(dispose); return () => {}; },
    tools: {
      register(def) { tools.set(def.name, def); return () => tools.delete(def.name); },
      schemas() { return [...tools.keys()].map(name => ({ name })); },
    },
    webServer: {
      register(route) {
        const key = `${route.kind}:${route.path}`;
        if (routes.has(key)) throw new Error(`duplicate route ${key}`);
        routes.set(key, route);
        return () => routes.delete(key);
      },
    },
    connection: { admit: () => ({ peer: { id: 'owner' } }), browserPeer: { id: 'owner' } },
    loader: { import: async () => ({ apply() {}, inject: [] }), unwrapExports: m => m },
    plugin: () => ({ dispose() {}, then(resolve) { resolve(); } }),
    storageDir,
  };
  return { ctx, routes, tools, disposers };
}

async function boot(storageDir) {
  const mod = await import(`${moduleUrl}?smoke=${++loadCount}`);
  const { ctx, routes, tools } = makeContext(storageDir);
  mod.apply(ctx, { storageDir });
  return { mod, ctx, routes, tools };
}

async function getSnapshot(routes) {
  const route = routes.get('exact:/serena-manager/snapshot');
  assert.ok(route, '/serena-manager/snapshot route registered');
  const res = {
    statusCode: null,
    body: null,
    writeHead(code) { this.statusCode = code; },
    end(body) { this.body = JSON.parse(body); },
  };
  await route.handler({ method: 'GET', headers: { host: 'localhost:1' } }, res);
  return res;
}

// Fresh install: routes, tool schema and a well-formed snapshot.
{
  const dir = mkdtempSync(join(tmpdir(), 'sm-host-'));
  const { mod, routes, tools } = await boot(dir);
  assert.deepEqual(mod.inject.slice().sort(), ['connection', 'loader', 'tools', 'webServer']);
  assert.equal(mod.name, 'serena-manager');
  assert.equal(routes.size, 2, 'two routes: snapshot + manage');
  assert.ok(tools.has('serena_manager'), 'serena_manager tool registered');
  assert.equal(typeof tools.get('serena_manager').execute, 'function');

  const res = await getSnapshot(routes);
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.observedAt, 'snapshot carries observedAt');
  assert.equal(typeof res.body.serena.installed, 'boolean');
  assert.ok(Array.isArray(res.body.projects));
  assert.ok(res.body.totals && typeof res.body.totals.projects === 'number');
  assert.equal(res.body.runtimeOperation, null);
  assert.ok(existsSync(join(dir, 'load.log')), 'trace log lives in the storage dir');
}

// A corrupt state file is preserved for inspection instead of silently wiping projects.
{
  const dir = mkdtempSync(join(tmpdir(), 'sm-corrupt-'));
  writeFileSync(join(dir, 'state.json'), '{"projects": [');
  const { routes } = await boot(dir);
  const res = await getSnapshot(routes);
  assert.equal(res.statusCode, 200);
  const quarantined = readdirSync(dir).filter(name => name.startsWith('state.json.corrupt-'));
  assert.equal(quarantined.length, 1, 'corrupt state renamed aside');
  assert.deepEqual(res.body.projects, []);
}

// The manage route rejects a cross-site request before parsing the body.
{
  const dir = mkdtempSync(join(tmpdir(), 'sm-guard-'));
  mkdirSync(dir, { recursive: true });
  const { routes } = await boot(dir);
  const route = routes.get('exact:/serena-manager/manage');
  const res = { statusCode: null, writeHead(code) { this.statusCode = code; }, end() {} };
  await route.handler({
    method: 'POST',
    headers: { host: 'localhost:1', 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' },
    async *[Symbol.asyncIterator]() { yield Buffer.from('{"action":"status"}'); },
  }, res);
  assert.equal(res.statusCode, 403);
}

console.log('PASS host smoke');
