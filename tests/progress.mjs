import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import vm from 'node:vm';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

// No real child process is imported or launched. All host files live in a temp dir.
// Resolved from this file so the suite runs from any checkout.
const source = await fsp.readFile(fileURLToPath(new URL('../index.js', import.meta.url)), 'utf8');
const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'serena-progress-'));
let passed = 0;
async function harness({ installed = false, uv = true, project = false, restartFailure = false, disposeFailure = false } = {}) {
  const dir = await fsp.mkdtemp(path.join(root, 'case-'));
  const home = path.join(dir, 'home');
  const bin = path.join(home, '.local/bin/serena');
  const projectPath = path.join(dir, 'project');
  await fsp.mkdir(projectPath, { recursive: true });
  const state = { projects: project ? [{ id: 'project', path: projectPath, enabled: true }] : [], autoStart: true, serenaHome: path.join(dir, 'serena-home') };
  await fsp.writeFile(path.join(dir, 'state.json'), JSON.stringify(state));
  const calls = [], children = [], routes = new Map();
  let tool, holdVersions = false, restartGate = null, disposals = 0;
  const existsSync = name => {
    if (name === bin) return installed;
    if (String(name).endsWith('/bin/serena')) return false;
    if (String(name).endsWith('/bin/uv')) return uv;
    return fs.existsSync(name);
  };
  function spawn(command, args) {
    const child = new EventEmitter();
    child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
    child.args = args; child.command = command;
    child.emitOutput = (text, stream = 'stdout') => child[stream].emit('data', Buffer.from(text));
    child.finish = (code = 0) => child.emit('close', code);
    child.kill = () => { child.finish(null); return true; };
    calls.push([...args]);
    if (args[0] === '--version' && !holdVersions) queueMicrotask(() => { child.emitOutput('Serena 2.1.0\n'); child.finish(); });
    else children.push(child);
    return child;
  }
  const timers = new Map(); let timerId = 0;
  const context = vm.createContext({ console, Buffer, URL, setTimeout(fn) { const id = ++timerId; timers.set(id, fn); return id; }, clearTimeout(id) { timers.delete(id); }, process: { env: {}, argv: [], execPath: '/mock/node', pid: 1, on() {} } });
  const mocks = {
    'node:child_process': { spawn },
    'node:fs': { ...fs, existsSync },
    'node:fs/promises': fsp,
    'node:os': { homedir: () => home },
    'node:path': path,
  };
  const module = new vm.SourceTextModule(source + '\nexport { run };', { context });
  await module.link(async name => {
    const values = mocks[name]; assert.ok(values, `unexpected import ${name}`);
    const dependency = new vm.SyntheticModule(Object.keys(values), function () { for (const [key, value] of Object.entries(values)) this.setExport(key, value); }, { context });
    return dependency;
  });
  await module.evaluate();
  const ctx = {
    logger: { warn() {} },
    effect(callback) { callback(); },
    tools: { register(value) { tool = value; return () => {}; }, schemas() { return []; } },
    webServer: { register(route) { routes.set(route.path, route); return () => {}; } },
    connection: { browserPeer: { id: 'owner' }, admit(req) { return req.denied ? { rejection: 401 } : { peer: { id: req.otherPeer ? 'other' : 'owner' } }; } },
    loader: { async import() { return { apply() {}, inject: [] }; } },
    plugin() { if (restartFailure) throw new Error('mock restart refused'); return { then(done, reject) { if (restartGate) restartGate.then(done, reject); else done(); }, dispose() { if (disposeFailure) throw new Error('mock shutdown refused'); disposals += 1; } }; },
  };
  module.namespace.apply(ctx, { storageDir: dir });
  const status = async () => (await tool.execute({ action: 'status' })).snapshot;
  await status();
  return {
    status, act: (action, args = {}) => tool.execute({ action, ...args }), calls, children, routes, projectPath,
    get disposals() { return disposals; },
    setInstalled(value) { installed = value; }, setUv(value) { uv = value; }, holdVersion(value) { holdVersions = value; },
    setRestartGate(value) { restartGate = value; }, run: module.namespace.run,
    expireTimers() { for (const callback of [...timers.values()]) callback(); },
  };
}
async function until(predicate, label) { for (let i = 0; i < 100; i++) { if (await predicate()) return; await new Promise(resolve => setImmediate(resolve)); } throw new Error(`Did not reach ${label}`); }
async function nextChild(h, action) { await until(() => h.children.some(child => child.args.includes(action)), action); return h.children.find(child => child.args.includes(action)); }
function finished(op, state) { assert.equal(op.status, state); assert.equal(op.phase, state === 'succeeded' ? 'complete' : 'failed'); assert.ok(op.id && op.startedAt && op.updatedAt && op.finishedAt); assert.ok(op.updatedAt >= op.startedAt); }

// Success: live output while POST is pending; output tail bound; verifying and restarting observable.
{
  const h = await harness({ project: true });
  assert.equal((await h.status()).runtimeOperation, null);
  let releasedRestart; h.setRestartGate(new Promise(resolve => { releasedRestart = resolve; }));
  let settled = false; const pending = h.act('install').then(result => { settled = true; return result; });
  const child = await nextChild(h, 'install');
  child.emitOutput('x'.repeat(20000)); child.emitOutput('stderr-tail\n', 'stderr');
  let op = (await h.status()).runtimeOperation;
  assert.equal(op.phase, 'installing'); assert.equal(op.status, 'running'); assert.equal(op.finishedAt, null); assert.equal(op.output.length, 16000); assert.ok(op.output.endsWith('stderr-tail\n')); assert.equal(settled, false);
  const initialId = op.id;
  h.setInstalled(true); h.holdVersion(true); child.finish();
  const version = await nextChild(h, '--version');
  op = (await h.status()).runtimeOperation; assert.equal(op.phase, 'verifying'); assert.equal(op.id, initialId);
  h.holdVersion(false); version.finish();
  await until(async () => (await h.status()).runtimeOperation.phase === 'restarting', 'restarting');
  releasedRestart(); assert.equal((await pending).ok, true);
  op = (await h.status()).runtimeOperation; finished(op, 'succeeded'); assert.ok(op.output.includes('Started project'));
  passed++;
}
// FIFO queue: second mutation cannot start or replace the running record; uninstall verifies absence.
{
  const h = await harness(); const installing = h.act('install'); const install = await nextChild(h, 'install');
  const id = (await h.status()).runtimeOperation.id;
  const uninstalling = h.act('uninstall');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await h.status()).runtimeOperation.id, id); assert.equal(h.calls.some(args => args.includes('uninstall')), false);
  h.setInstalled(true); install.finish(); assert.equal((await installing).ok, true);
  const uninstall = await nextChild(h, 'uninstall');
  assert.equal((await h.status()).runtimeOperation.phase, 'uninstalling');
  h.setInstalled(false); uninstall.finish(); assert.equal((await uninstalling).ok, true);
  const op = (await h.status()).runtimeOperation; finished(op, 'succeeded'); assert.equal(op.action, 'uninstall'); assert.notEqual(op.id, id); passed++;
}
// Subprocess failure remains a failure even if an executable appeared; queue recovers afterwards.
{
  const h = await harness(); const pending = h.act('install'); const child = await nextChild(h, 'install');
  child.emitOutput('network refused', 'stderr'); h.setInstalled(true); child.finish(7);
  const result = await pending; assert.equal(result.ok, false); assert.match(result.diagnostic, /7.*network refused/);
  finished((await h.status()).runtimeOperation, 'failed');
  assert.equal((await h.act('install')).ok, true); finished((await h.status()).runtimeOperation, 'succeeded'); passed++;
}
// A successful exit is insufficient: install must create binary; uninstall must remove it.
for (const action of ['install', 'uninstall']) {
  const h = await harness({ installed: action === 'uninstall' }); const pending = h.act(action); const child = await nextChild(h, action); child.finish();
  const result = await pending; assert.equal(result.ok, false); assert.match(result.diagnostic, action === 'install' ? /missing/ : /still installed/);
  finished((await h.status()).runtimeOperation, 'failed'); passed++;
}
// Missing dependency / spawn error / project restart errors surface in the operation.
{
  const h = await harness({ uv: false }); assert.equal((await h.act('install')).ok, false); assert.match((await h.status()).runtimeOperation.diagnostic, /uv is not installed/); passed++;
}
{
  const h = await harness(); const pending = h.act('install'); const child = await nextChild(h, 'install'); child.emit('error', new Error('mock ENOENT'));
  assert.equal((await pending).ok, false); assert.match((await h.status()).runtimeOperation.diagnostic, /ENOENT/); passed++;
}
{
  const h = await harness({ project: true, restartFailure: true }); const pending = h.act('install'); const child = await nextChild(h, 'install'); h.setInstalled(true); child.finish();
  assert.equal((await pending).ok, false); assert.match((await h.status()).runtimeOperation.diagnostic, /restart failed.*mock restart refused/); passed++;
}
// run() capture and timeout use only mock events and fake timers.
{
  const h = await harness(); const output = [];
  const pending = h.run('/mock', ['probe'], { onOutput: (text, stream) => output.push([text, stream]) });
  const child = await nextChild(h, 'probe'); child.emitOutput('a'.repeat(20000)); child.emitOutput('err', 'stderr'); h.expireTimers();
  const result = await pending; assert.equal(result.ok, false); assert.equal(result.stdout.length, 16000); assert.ok(result.stderr.includes('timed out')); assert.equal(output[1][1], 'stderr'); passed++;
}
// HTTP guards preserved; owner requests may omit Origin; foreign/cross-site/other peer denied.
{
  const h = await harness({ installed: true });
  async function request(extra = {}) {
    const req = { method: 'POST', headers: { host: 'localhost:1234', 'content-type': 'application/json', ...extra.headers }, ...extra,
      async *[Symbol.asyncIterator]() { yield Buffer.from('{"action":"install"}'); } };
    req.headers = { host: 'localhost:1234', 'content-type': 'application/json', ...extra.headers };
    const res = { writeHead(code) { this.code = code; }, end(body) { this.body = JSON.parse(body); } };
    await h.routes.get('/serena-manager/manage').handler(req, res); return res;
  }
  assert.equal((await request()).code, 200);
  assert.equal((await request({ headers: { origin: 'https://foreign.test' } })).code, 403);
  assert.equal((await request({ headers: { 'sec-fetch-site': 'cross-site' } })).code, 403);
  assert.equal((await request({ otherPeer: true })).code, 403);
  assert.equal((await request({ denied: true })).code, 401); passed++;
}
// Actual registered GET stays responsive while registered POST awaits final result.
{
  const h = await harness();
  const req = { method: 'POST', headers: { host: 'localhost:1234', 'content-type': 'application/json' }, async *[Symbol.asyncIterator]() { yield Buffer.from('{"action":"install"}'); } };
  const response = () => ({ ended: false, writeHead(code) { this.code = code; }, end(body) { this.ended = true; this.body = JSON.parse(body); } });
  const postRes = response(); const pending = h.routes.get('/serena-manager/manage').handler(req, postRes);
  const install = await nextChild(h, 'install'); install.emitOutput('downloading mocked package\n');
  const getRes = response(); await h.routes.get('/serena-manager/snapshot').handler({ method: 'GET', headers: {} }, getRes);
  assert.equal(postRes.ended, false); assert.equal(getRes.code, 200); assert.equal(getRes.body.runtimeOperation.phase, 'installing'); assert.match(getRes.body.runtimeOperation.output, /downloading/);
  h.setInstalled(true); install.finish(); await pending; assert.equal(postRes.body.ok, true); passed++;
}
{
  const h = await harness({ installed: true }); h.holdVersion(true);
  const pending = h.act('uninstall'); const version = await nextChild(h, '--version');
  assert.equal((await h.status()).runtimeOperation.phase, 'preparing');
  h.holdVersion(false); version.finish(); const uninstall = await nextChild(h, 'uninstall');
  uninstall.emitOutput('permission denied', 'stderr'); uninstall.finish(2);
  assert.equal((await pending).ok, false); const op = (await h.status()).runtimeOperation;
  finished(op, 'failed'); assert.match(op.diagnostic, /2.*permission denied/); passed++;
}
// Refresh an existing cache: stop the live instance, expose progress, then restore it.
{
  const h = await harness({ installed: true, project: true });
  const cache = path.join(h.projectPath, '.serena/cache/swift/document_symbols.pkl');
  await fsp.mkdir(path.dirname(cache), { recursive: true });
  await fsp.writeFile(cache, 'old symbols');
  await fsp.utimes(cache, new Date(0), new Date(0));
  const pending = h.act('index', { id: 'project' });
  const child = await nextChild(h, 'index');
  const during = await h.status();
  assert.equal(during.projects[0].running, false, 'live instance stopped before cache writes');
  assert.equal(h.disposals, 1);
  assert.equal(during.runtimeOperation.action, 'index');
  assert.equal(during.runtimeOperation.projectId, 'project');
  assert.equal(during.runtimeOperation.phase, 'indexing');
  child.emitOutput('Indexing changed files\n');
  assert.match((await h.status()).runtimeOperation.output, /changed files/);
  let stopped = false;
  const stop = h.act('stop', { id: 'project' }).then(value => { stopped = true; return value; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(stopped, false, 'mutations wait until indexing and restore finish');
  await fsp.writeFile(cache, 'updated symbols');
  child.finish();
  const result = await pending;
  assert.equal(result.ok, true);
  assert.ok(Date.parse(result.facts.indexedAt) > 0);
  finished((await h.status()).runtimeOperation, 'succeeded');
  await stop;
  assert.equal((await h.status()).projects[0].running, false, 'queued stop wins after restore');
  assert.equal(h.disposals, 2, 'restored instance was stopped by queued action');
  assert.equal((await h.status()).projects[0].indexedAt, result.facts.indexedAt);
  passed++;
}
// Failed indexing restores the previously live instance and remains retryable.
{
  const h = await harness({ installed: true, project: true });
  const pending = h.act('index', { id: 'project' });
  const child = await nextChild(h, 'index');
  child.emitOutput('language server failed', 'stderr'); child.finish(2);
  const result = await pending;
  assert.equal(result.ok, false);
  assert.match(result.diagnostic, /2.*language server failed/);
  assert.equal((await h.status()).projects[0].running, true);
  finished((await h.status()).runtimeOperation, 'failed');
  passed++;
}
// First-time indexing must produce a cache; an exit code alone is insufficient.
{
  const h = await harness({ installed: true });
  await h.act('add', { path: h.projectPath });
  const pending = h.act('index', { id: 'project' });
  const child = await nextChild(h, 'index'); child.finish();
  assert.equal((await pending).ok, false);
  assert.match((await h.status()).runtimeOperation.diagnostic, /cache.*missing/);
  assert.equal((await h.status()).projects[0].running, false);
  passed++;
}
// A failed restore remains required on retry unless the user explicitly stops the project.
for (const stopBeforeRetry of [false, true]) {
  const h = await harness({ installed: true, project: true });
  const cache = path.join(h.projectPath, '.serena/cache/swift/document_symbols.pkl');
  await fsp.mkdir(path.dirname(cache), { recursive: true });
  await fsp.writeFile(cache, 'symbols');
  let rejectRestart;
  h.setRestartGate(new Promise((resolve, reject) => { rejectRestart = reject; }));
  const pending = h.act('index', { id: 'project' });
  const child = await nextChild(h, 'index'); child.finish();
  await until(async () => (await h.status()).runtimeOperation.phase === 'restarting', 'index restore');
  rejectRestart(new Error('temporary restore failure'));
  assert.equal((await pending).ok, false);
  assert.equal((await h.status()).projects[0].running, false);
  h.setRestartGate(null);
  h.children.length = 0;
  if (stopBeforeRetry) await h.act('stop', { id: 'project' });
  const retry = h.act('index', { id: 'project' });
  (await nextChild(h, 'index')).finish();
  assert.equal((await retry).ok, true);
  assert.equal((await h.status()).projects[0].running, !stopBeforeRetry, 'retry preserves restore intent unless explicitly stopped');
  passed++;
}
// Never write the cache when the previous server could not be stopped.
{
  const h = await harness({ installed: true, project: true, disposeFailure: true });
  const result = await h.act('index', { id: 'project' });
  assert.equal(result.ok, false);
  assert.match(result.diagnostic, /Could not stop.*shutdown refused/);
  assert.equal(h.calls.some(args => args.includes('index')), false, 'index command never starts after failed shutdown');
  assert.equal((await h.status()).projects[0].running, true, 'failed shutdown retains live record');
  finished((await h.status()).runtimeOperation, 'failed');
  passed++;
}
console.log(`PASS ${passed} mocked backend scenarios; no real subprocess spawned. Artifacts: ${root}`);
