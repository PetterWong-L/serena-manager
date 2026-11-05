/**
 * serena-manager — supervise per-project Serena MCP instances from one panel.
 *
 * Design notes (verified against this machine's DSH build):
 * - Each Serena instance is a live `@deepseek-ai/dsh-mcp-client` fiber started
 *   with `ctx.plugin()`, so start/stop is immediate: no profile edits, no app
 *   restart, and stopping a fiber disposes the transport (which closes the
 *   child process) and unregisters the tools it published.
 * - Which projects want an instance is remembered in `state.json`; the ones
 *   marked enabled start again on the next launch.
 * - Serena itself is installed/uninstalled through `uv tool`, never bundled.
 */
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve, sep } from 'node:path';

export const inject = ['tools', 'webServer', 'connection', 'loader'];
export const name = 'serena-manager';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,24}$/;
const SERVER_PREFIX = 'serena-';
const DEFAULT_UV = process.env.SERENA_MANAGER_UV ?? join(homedir(), '.local', 'bin', 'uv');
const VERSION_TTL_MS = 5 * 60 * 1000;
const OUTPUT_TAIL_LIMIT = 16000;
const tail = text => String(text).slice(-OUTPUT_TAIL_LIMIT);

const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

function slugify(input) {
  const base = String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return (base || 'project').slice(0, 24);
}

function firstExisting(paths) {
  return paths.find(path => path && existsSync(path));
}

function run(command, args, { cwd, env, timeoutMs = 120000, onOutput } = {}) {
  return new Promise(resolvePromise => {
    let stdout = '';
    let stderr = '';
    let child;
    let timedOut = false;
    const capture = (chunk, stream) => {
      const text = String(chunk);
      if (stream === 'stdout') stdout = tail(stdout + text);
      else stderr = tail(stderr + text);
      onOutput?.(text, stream);
    };
    try {
      child = spawn(command, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      capture(String(error), 'stderr');
      resolvePromise({ ok: false, code: null, stdout, stderr });
      return;
    }
    const timer = setTimeout(() => {
      timedOut = true;
      capture(`\nProcess timed out after ${timeoutMs} ms\n`, 'stderr');
      child.kill('SIGKILL');
    }, timeoutMs);
    child.stdout.on('data', chunk => capture(chunk, 'stdout'));
    child.stderr.on('data', chunk => capture(chunk, 'stderr'));
    child.on('error', error => {
      clearTimeout(timer);
      capture(String(error), 'stderr');
      resolvePromise({ ok: false, code: null, stdout, stderr });
    });
    child.on('close', code => { clearTimeout(timer); resolvePromise({ ok: code === 0 && !timedOut, code, stdout, stderr }); });
  });
}

class Store {
  constructor(dir) {
    this.dir = dir;
    this.file = join(dir, 'state.json');
    this.data = { projects: [], serenaHome: join(dir, 'home'), autoStart: true };
  }

  async load() {
    try {
      const raw = await readFile(this.file, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.projects)) {
        this.data = {
          projects: parsed.projects.filter(p => p && typeof p.path === 'string'),
          serenaHome: typeof parsed.serenaHome === 'string' ? parsed.serenaHome : this.data.serenaHome,
          autoStart: parsed.autoStart !== false,
        };
      }
    } catch (error) {
      // A truncated file must not be silently replaced by the defaults on the
      // next save: keep the unreadable copy so the projects can be recovered.
      if (error instanceof SyntaxError) {
        try { await rename(this.file, `${this.file}.corrupt-${Date.now()}`); } catch { /* best effort */ }
      }
    }
    return this.data;
  }

  async save() {
    await mkdir(this.dir, { recursive: true });
    // Write-then-rename so a crash mid-write cannot truncate state.json.
    const temporary = `${this.file}.tmp`;
    await writeFile(temporary, JSON.stringify(this.data, null, 2));
    await rename(temporary, this.file);
  }
}

function serenaCandidates() {
  return [
    join(homedir(), '.local', 'bin', 'serena'),
    '/opt/homebrew/bin/serena',
    '/usr/local/bin/serena',
    join(process.env.SERENA_MANAGER_PROBE_HOME ?? join(homedir(), 'dsh', '.serena-probe'), 'bin', 'serena'),
  ];
}

const versionCache = new Map();

async function readVersion(bin, fresh) {
  const cached = versionCache.get(bin);
  if (!fresh && cached && Date.now() - cached.at < VERSION_TTL_MS) return cached.value;
  const out = await run(bin, ['--version'], { timeoutMs: 20000 });
  const value = (out.stdout || out.stderr).trim().split('\n').pop() || null;
  versionCache.set(bin, { value, at: Date.now() });
  return value;
}

async function serenaStatus(store, fresh = false) {
  const bin = firstExisting(serenaCandidates());
  const managed = firstExisting([join(homedir(), '.local', 'bin', 'serena'), '/opt/homebrew/bin/serena', '/usr/local/bin/serena']);
  // Polling the panel must not spawn `serena --version` on every tick.
  const version = bin ? await readVersion(bin, fresh) : null;
  return {
    installed: Boolean(managed),
    bin: bin ?? null,
    managed: Boolean(managed),
    probeOnly: Boolean(bin) && !managed,
    version,
    uv: firstExisting([DEFAULT_UV, '/opt/homebrew/bin/uv', '/usr/local/bin/uv']) ?? null,
    home: store.data.serenaHome,
  };
}

async function projectFacts(dir) {
  const cache = join(dir, '.serena', 'cache');
  let indexed = false;
  let updatedAt = null;
  try {
    for (const language of await readdir(cache)) {
      const pkl = join(cache, language, 'document_symbols.pkl');
      if (!existsSync(pkl)) continue;
      indexed = true;
      const stat = statSync(pkl);
      if (!updatedAt || stat.mtime > updatedAt) updatedAt = stat.mtime;
    }
  } catch { /* no cache directory yet */ }
  return {
    indexed,
    indexedAt: updatedAt ? updatedAt.toISOString() : null,
    hasProjectFile: existsSync(join(dir, '.serena', 'project.yml')),
  };
}

class Instances {
  constructor(ctx, store, logger) {
    this.ctx = ctx;
    this.store = store;
    this.logger = logger;
    this.live = new Map();
    this.pending = new Map();
    this.module = null;
  }

  async loadModule() {
    if (this.module) return this.module;
    const loader = this.ctx.loader;
    const failures = [];
    if (loader?.import) {
      try {
        const namespace = await loader.import('@deepseek-ai/dsh-mcp-client');
        this.module = loader.unwrapExports ? loader.unwrapExports(namespace) : namespace;
        if (this.module?.apply) return this.module;
        failures.push('loader.import returned a module without apply()');
      } catch (error) {
        failures.push(`loader.import: ${String(error?.message ?? error)}`);
      }
    } else {
      failures.push('ctx.loader.import is unavailable');
    }
    const found = firstExisting(this.moduleCandidates());
    if (!found) throw new Error(`dsh-mcp-client is not resolvable (${failures.join('; ')})`);
    this.module = await import(new URL(`file://${found}`).href);
    return this.module;
  }

  moduleCandidates() {
    const candidates = [];
    const add = base => {
      if (base) candidates.push(join(base, 'node_modules', '@deepseek-ai', 'dsh-mcp-client', 'lib', 'index.js'));
    };
    add(process.env.DSH_PROFILE_DIR);
    const entry = process.argv[1] ?? '';
    const marker = entry.indexOf('.asar');
    if (marker > 0) {
      const root = entry.slice(0, marker + '.asar'.length);
      add(join(root, 'dsh'));
    }
    add(process.execPath ? join(process.execPath, '..', '..', 'Resources', 'app.asar', 'dsh') : null);
    try {
      for (const name of readdirSync(join(homedir(), '.dsh', 'profiles'))) add(join(homedir(), '.dsh', 'profiles', name));
    } catch { /* no profiles dir */ }
    return candidates;
  }

  serenaBin(status) {
    return status?.bin ?? null;
  }

  async start(project, status) {
    if (this.live.has(project.id)) return { changed: false, state: 'already-running' };
    const inflight = this.pending.get(project.id);
    if (inflight) return inflight.then(() => ({ changed: false, state: 'already-running' }), () => ({ changed: false, state: 'start-failed' }));
    const bin = this.serenaBin(status);
    if (!bin) throw new Error('Serena is not installed');
    if (!existsSync(project.path)) throw new Error(`project path is missing: ${project.path}`);
    // Register the in-flight start before the first await so a second start or a
    // stop cannot race past the `live.has()` check.
    const task = (async () => {
      const module = await this.loadModule();
      const serverName = `${SERVER_PREFIX}${project.id}`;
      const config = {
        transport: 'stdio',
        serverName,
        command: bin,
        args: [
          'start-mcp-server',
          '--context', 'codex',
          '--project', project.path,
          '--agent-interface', 'repl',
          '--open-web-dashboard', 'false',
        ],
        env: { SERENA_HOME: this.store.data.serenaHome },
        cwd: project.path,
        toolCallTimeoutMs: 300000,
        reconnect: { enabled: true, initialDelayMs: 1000, maxDelayMs: 15000, maxAttempts: 5 },
      };
      const record = { id: project.id, serverName, startedAt: new Date().toISOString(), error: null, fiber: null };
      try {
        record.fiber = this.ctx.plugin({ inject: module.inject, apply: module.apply, name: `serena-mcp:${project.id}`, Config: module.Config }, config);
        await record.fiber;
      } catch (error) {
        record.error = String(error?.message ?? error);
        try { await record.fiber?.dispose(); } catch { /* already gone */ }
        throw error;
      }
      this.live.set(project.id, record);
    })();
    this.pending.set(project.id, task);
    try {
      await task;
    } finally {
      this.pending.delete(project.id);
    }
    return { changed: true, state: 'started' };
  }

  async stop(id) {
    // A stop that lands while the instance is still starting must wait for the
    // fiber to exist, otherwise the start would resurrect a stopped instance.
    const inflight = this.pending.get(id);
    if (inflight) { try { await inflight; } catch { /* the start failed on its own */ } }
    const record = this.live.get(id);
    if (!record) return { changed: false, state: 'already-stopped' };
    this.live.delete(id);
    try { await record.fiber?.dispose(); } catch (error) { this.logger.warn(`serena-manager: dispose failed for ${id}: ${String(error)}`); }
    return { changed: true, state: 'stopped' };
  }

  async stopAll() {
    for (const id of [...this.live.keys(), ...this.pending.keys()]) await this.stop(id);
  }

  toolCount(id) {
    const prefix = `mcp__${SERVER_PREFIX}${id}__`;
    try {
      return this.ctx.tools.schemas().filter(schema => String(schema?.name ?? '').startsWith(prefix)).length;
    } catch { return 0; }
  }
}

export function apply(ctx, config = {}) {
  const storageDir = config.storageDir ?? join(homedir(), '.dsh', 'serena-manager');
  try { mkdirSync(storageDir, { recursive: true }); } catch { /* diagnostics only */ }
  const store = new Store(storageDir);
  const instances = new Instances(ctx, store, ctx.logger);
  const trace = message => {
    try {
      const file = join(storageDir, 'load.log');
      let size = 0;
      try { size = statSync(file).size; } catch { /* first write */ }
      if (size > 1_000_000) return; // diagnostics only: never grow without bound
      appendFileSync(file, `${new Date().toISOString()} ${message}\n`);
    } catch { /* diagnostics only */ }
  };
  // Diagnostics are scoped to this plugin: no process-wide uncaughtException or
  // unhandledRejection listeners, which would outlive the plugin and swallow
  // fatal errors from unrelated bundles.
  trace(`apply() entered, pid=${process.pid}`);

  let runtimeOperation = null;
  let runtimeSequence = 0;
  let runtimeStatus = null;
  const readRuntimeStatus = async (fresh = false) => (runtimeStatus = await serenaStatus(store, fresh));
  const ready = (async () => {
    await store.load();
    const status = await readRuntimeStatus();
    trace(`state loaded: ${store.data.projects.length} project(s), bin=${status.bin}`);
    if (store.data.autoStart === false) return;
    if (!status.bin) return;
    for (const project of store.data.projects.filter(p => p.enabled)) {
      try {
        await instances.start(project, status);
        trace(`autostart ${project.id} ok`);
      } catch (error) {
        trace(`autostart ${project.id} failed: ${String(error?.stack ?? error)}`);
        ctx.logger.warn(`serena-manager: could not start ${project.id}: ${String(error)}`);
      }
    }
  })();

  ctx.effect(() => () => instances.stopAll(), 'serena-manager.instances');

  async function snapshot() {
    await ready;
    // A runtime mutation can temporarily remove the executable. Polling progress
    // must not wait on another --version subprocess against that installation.
    const status = runtimeOperation?.status === 'running' ? runtimeStatus : await readRuntimeStatus();
    const projects = [];
    for (const project of store.data.projects) {
      const live = instances.live.get(project.id);
      const facts = await projectFacts(project.path);
      projects.push({
        id: project.id,
        name: project.name ?? project.id,
        path: project.path,
        enabled: project.enabled !== false,
        indexed: facts.indexed,
        running: Boolean(live),
        startedAt: live?.startedAt ?? null,
        error: live?.error ?? null,
        tools: live ? instances.toolCount(project.id) : 0,
        serverName: `${SERVER_PREFIX}${project.id}`,
      });
    }
    return {
      observedAt: new Date().toISOString(),
      serena: status,
      runtimeOperation: runtimeOperation ? { ...runtimeOperation } : null,
      autoStart: store.data.autoStart !== false,
      projects,
      totals: {
        projects: projects.length,
        running: projects.filter(p => p.running).length,
        tools: projects.reduce((sum, p) => sum + p.tools, 0),
        indexed: projects.filter(p => p.indexed).length,
      },
    };
  }

  async function addProject(input) {
    const requested = resolve(String(input ?? '').trim());
    if (!requested || requested === homedir() || requested === '/') throw new Error('project path does not exist');
    let stats;
    try { stats = statSync(requested); } catch { throw new Error('project path does not exist'); }
    if (!stats.isDirectory()) throw new Error('project path is not a directory');
    // Normalise symlinks so the same repository cannot be registered twice.
    const path = realpathSync(requested);
    const existing = store.data.projects.find(p => p.path === path);
    if (existing) return { changed: false, project: existing };
    let id = slugify(path.split(sep).filter(Boolean).pop() ?? 'project');
    const taken = new Set(store.data.projects.map(p => p.id));
    if (taken.has(id)) {
      let n = 2;
      while (taken.has(`${id}-${n}`)) n += 1;
      id = `${id}-${n}`;
    }
    if (!SLUG_RE.test(id)) throw new Error('could not derive a usable project id');
    const project = { id, name: path.split(sep).filter(Boolean).pop(), path, enabled: false, addedAt: new Date().toISOString() };
    store.data.projects.push(project);
    await store.save();
    return { changed: true, project };
  }

  async function removeProject(id) {
    await instances.stop(id);
    const before = store.data.projects.length;
    store.data.projects = store.data.projects.filter(p => p.id !== id);
    if (store.data.projects.length === before) throw new Error('unknown project');
    await store.save();
    return { changed: true };
  }

  async function setEnabled(id, enabled) {
    const project = store.data.projects.find(p => p.id === id);
    if (!project) throw new Error('unknown project');
    project.enabled = enabled;
    await store.save();
    const status = await serenaStatus(store);
    if (enabled) {
      const outcome = await instances.start(project, status);
      return { ...outcome, enabled: true };
    }
    const outcome = await instances.stop(id);
    return { ...outcome, enabled: false };
  }

  async function indexProject(id) {
    const project = store.data.projects.find(p => p.id === id);
    if (!project) throw new Error('unknown project');
    const status = await serenaStatus(store);
    if (!status.bin) throw new Error('Serena is not installed');
    const env = { SERENA_HOME: store.data.serenaHome };
    // `project index <path> --ls swift` is fully non-interactive and auto-creates
    // .serena/project.yml plus the SERENA_HOME projects entry when missing.
    const indexed = await run(status.bin, ['project', 'index', project.path, '--ls', 'swift'], { env, timeoutMs: 900000 });
    return {
      changed: indexed.ok,
      index: { ok: indexed.ok, output: (indexed.stdout + indexed.stderr).trim().slice(-2000) },
      facts: await projectFacts(project.path),
    };
  }

  // Keep runtime mutations in one queue to avoid overlapping install/uninstall.
  let runtimeQueue = Promise.resolve();
  const serialised = task => {
    const next = runtimeQueue.then(task, task);
    runtimeQueue = next.then(() => undefined, () => undefined);
    return next;
  };

  function runtimeTask(action, task) {
    return serialised(async () => {
      const now = new Date().toISOString();
      const operation = runtimeOperation = {
        id: `${Date.now()}-${++runtimeSequence}`,
        action, status: 'running', phase: 'preparing',
        startedAt: now, updatedAt: now, finishedAt: null, output: '',
      };
      const update = changes => Object.assign(operation, changes, { updatedAt: new Date().toISOString() });
      const append = text => update({ output: tail(operation.output + text) });
      try {
        const result = await task({ phase: phase => update({ phase }), append, onOutput: append });
        const succeeded = result.ok !== false;
        const finishedAt = new Date().toISOString();
        update({ status: succeeded ? 'succeeded' : 'failed', phase: succeeded ? 'complete' : 'failed', finishedAt,
          ...(result.diagnostic ? { diagnostic: result.diagnostic } : {}) });
        return { ...result, output: operation.output.trim() || result.output || '' };
      } catch (error) {
        const diagnostic = String(error?.message ?? error);
        append(`\n${diagnostic}\n`);
        update({ status: 'failed', phase: 'failed', finishedAt: new Date().toISOString(), diagnostic });
        return { changed: false, ok: false, output: operation.output.trim(), diagnostic };
      }
    });
  }

  function installSerena() {
    return runtimeTask('install', async ({ phase, append, onOutput }) => {
      const status = await readRuntimeStatus(true);
      const uv = status.uv;
      if (!uv) throw new Error('uv is not installed; install uv first');
      if (status.managed) {
        append(`already installed: ${status.bin}\n`);
        return { changed: false, installer: 'uv', ok: true };
      }
      phase('installing');
      trace(`install: ${uv} tool install -p 3.13 serena-agent`);
      const result = await run(uv, ['tool', 'install', '-p', '3.13', 'serena-agent'], { timeoutMs: 900000, onOutput });
      trace(`install finished ok=${result.ok} code=${result.code}`);
      phase('verifying');
      versionCache.clear();
      const after = await readRuntimeStatus(true);
      if (!result.ok || !after.installed) {
        const diagnostic = !result.ok
          ? `uv exited with ${result.code ?? 'an error'}${result.stderr.trim() ? `: ${result.stderr.trim()}` : ''}`
          : 'uv reported success but the Serena executable is still missing';
        append(`\n${diagnostic}\n`);
        return { changed: after.installed, installer: 'uv', ok: false, diagnostic };
      }
      // Restore enabled projects after reinstalling the runtime.
      const projects = store.data.autoStart !== false ? store.data.projects.filter(p => p.enabled) : [];
      const failures = [];
      if (projects.length) phase('restarting');
      for (const project of projects) {
        append(`\nStarting ${project.id}…\n`);
        try {
          await instances.start(project, after);
          trace(`install: restarted ${project.id}`);
          append(`Started ${project.id}\n`);
        } catch (error) {
          const diagnostic = `${project.id}: ${String(error?.message ?? error)}`;
          failures.push(diagnostic);
          append(`Could not start ${diagnostic}\n`);
          trace(`install: restart failed: ${diagnostic}`);
        }
      }
      if (failures.length) return { changed: true, installer: 'uv', ok: false, diagnostic: `Serena installed, but project restart failed: ${failures.join('; ')}` };
      return { changed: true, installer: 'uv', ok: true };
    });
  }

  function uninstallSerena() {
    return runtimeTask('uninstall', async ({ phase, append, onOutput }) => {
      const status = await readRuntimeStatus(true);
      const uv = status.uv;
      if (!uv) throw new Error('uv is not installed');
      phase('stopping');
      await instances.stopAll();
      phase('uninstalling');
      const result = await run(uv, ['tool', 'uninstall', 'serena-agent'], { timeoutMs: 120000, onOutput });
      trace(`uninstall finished ok=${result.ok} code=${result.code}`);
      phase('verifying');
      versionCache.clear();
      const after = await readRuntimeStatus(true);
      if (!result.ok || after.installed) {
        const diagnostic = !result.ok
          ? `uv exited with ${result.code ?? 'an error'}${result.stderr.trim() ? `: ${result.stderr.trim()}` : ''}`
          : `uv reported success but Serena is still installed: ${after.bin}`;
        append(`\n${diagnostic}\n`);
        return { changed: !after.installed, ok: false, diagnostic };
      }
      return { changed: true, ok: true };
    });
  }

  async function manage(args = {}) {
    // A tool or route call can arrive before the initial state load finished;
    // without this await a concurrent save would clobber the loaded projects.
    await ready.catch(() => {});
    const action = args.action;
    switch (action) {
      case 'status': return { application: 'applied', snapshot: await snapshot() };
      case 'install': return { application: 'applied', ...await installSerena() };
      case 'uninstall': return { application: 'applied', ...await uninstallSerena() };
      case 'add': return { application: 'applied', ...await addProject(args.path) };
      case 'remove': return { application: 'applied', ...await removeProject(args.id) };
      case 'start': return { application: 'applied', ...await setEnabled(args.id, true) };
      case 'stop': return { application: 'applied', ...await setEnabled(args.id, false) };
      case 'index': return { application: 'applied', ...await indexProject(args.id) };
      case 'stop-all': {
        await instances.stopAll();
        for (const project of store.data.projects) project.enabled = false;
        await store.save();
        return { application: 'applied', changed: true };
      }
      default: throw new Error(`unknown action: ${String(action)}`);
    }
  }

  ctx.effect(() => ctx.tools.register({
    name: 'serena_manager',
    description: 'Inspect, start, stop or register per-project Serena (LSP) MCP instances, install or uninstall Serena, and index a project. Read-only for status; other actions change which MCP tools this profile exposes.',
    parameters: {
      type: 'object',
      required: ['action'],
      additionalProperties: false,
      properties: {
        action: { type: 'string', enum: ['status', 'start', 'stop', 'stop-all', 'add', 'remove', 'index', 'install', 'uninstall'] },
        id: { type: 'string', description: 'Project id from status.' },
        path: { type: 'string', description: 'Absolute project path, for add.' },
      },
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    timeoutMs: 900000,
    isConcurrencySafe: args => args?.action === 'status',
    async execute(args) {
      try {
        const value = await manage(args);
        return value;
      } catch (error) {
        return { application: 'failed', error: { code: 'operation-error', diagnostic: String(error?.message ?? error) } };
      }
    },
  }), 'serena-manager.tool');

  const guard = req => {
    const admission = ctx.connection.admit(req);
    if ('rejection' in admission) return admission.rejection;
    if (admission.peer.id !== ctx.connection.browserPeer.id) return 403;
    return null;
  };

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/serena-manager/snapshot',
    async handler(req, res) {
      const rejection = guard(req);
      if (rejection !== null) { res.writeHead(rejection, headers); res.end('{"error":"owner browser required"}'); return; }
      if (req.method !== 'GET') { res.writeHead(405, { ...headers, Allow: 'GET' }); res.end('{}'); return; }
      try {
        // Build the body first: writing the head inside the try would make the
        // 503 path throw ERR_HTTP_HEADERS_SENT and leave the request hanging.
        const body = JSON.stringify(await snapshot());
        res.writeHead(200, headers);
        res.end(body);
      } catch (error) {
        res.writeHead(503, headers);
        res.end(JSON.stringify({ error: String(error?.message ?? error) }));
      }
    },
  }), 'serena-manager.route-snapshot');

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/serena-manager/manage',
    async handler(req, res) {
      const reply = (status, value) => { res.writeHead(status, headers); res.end(JSON.stringify(value)); };
      trace(`manage ${req.method} origin=${req.headers.origin ?? '-'} host=${req.headers.host ?? '-'} ct=${req.headers['content-type'] ?? '-'} site=${req.headers['sec-fetch-site'] ?? '-'}`);
      const rejection = guard(req);
      if (rejection !== null) trace(`manage rejected by guard: ${rejection}`);
      if (rejection !== null) { reply(rejection, { application: 'failed', error: { code: 'owner-required' } }); return; }
      if (req.method !== 'POST') { res.writeHead(405, { ...headers, Allow: 'POST' }); res.end('{}'); return; }
      const originHeader = req.headers.origin;
      // The Electron renderer sends same-origin POSTs without Origin and without
      // Sec-Fetch-Site headers, so a missing Origin cannot be treated as hostile.
      // `guard()` already proved this request comes from the owner browser, and a
      // present-but-foreign Origin is still refused.
      if (originHeader !== undefined && originHeader !== null && originHeader !== '') {
        let origin;
        try { origin = new URL(originHeader); } catch { reply(403, { application: 'failed', error: { code: 'origin-invalid' } }); return; }
        if (!['http:', 'https:'].includes(origin.protocol) || origin.host !== req.headers.host || req.headers['sec-fetch-site'] === 'cross-site') {
          reply(403, { application: 'failed', error: { code: 'origin-refused' } });
          return;
        }
      } else if (req.headers['sec-fetch-site'] === 'cross-site') {
        reply(403, { application: 'failed', error: { code: 'origin-refused' } });
        return;
      }
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? '')) {
        reply(415, { application: 'failed', error: { code: 'json-required' } });
        return;
      }
      const declared = Number(req.headers['content-length'] ?? NaN);
      if (Number.isFinite(declared) && declared > 65536) {
        req.resume();
        reply(413, { application: 'failed', error: { code: 'request-too-large' } });
        return;
      }
      let bytes = 0;
      let tooLarge = false;
      const chunks = [];
      try {
        // Drain an oversized chunked body before replying so the socket is not
        // destroyed before the 413 reaches the client.
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 65536) { tooLarge = true; continue; }
          chunks.push(chunk);
        }
      } catch { reply(400, { application: 'failed', error: { code: 'unreadable' } }); return; }
      if (tooLarge) { reply(413, { application: 'failed', error: { code: 'request-too-large' } }); return; }
      let args;
      try { args = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { reply(400, { application: 'failed', error: { code: 'invalid-json' } }); return; }
      trace(`manage action=${String(args?.action)}`);
      try {
        const value = await manage(args);
        trace(`manage result ${JSON.stringify(value).slice(0, 600)}`);
        reply(200, value);
      } catch (error) {
        trace(`manage error: ${String(error?.stack ?? error)}`);
        reply(200, { application: 'failed', error: { code: 'operation-error', diagnostic: String(error?.message ?? error) } });
      }
    },
  }), 'serena-manager.route-manage');
}

