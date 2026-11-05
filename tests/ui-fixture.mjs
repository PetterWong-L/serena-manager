import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const skip = reason => { console.log('SKIP ui-fixture: ' + reason); process.exit(0); };
const playwrightModule = process.env.PLAYWRIGHT_MODULE;
if (!playwrightModule) skip('set PLAYWRIGHT_MODULE to a playwright index.mjs');
const { chromium } = await import(playwrightModule);
const themeFile = process.env.DSH_THEME_CLIENT;
if (!themeFile) skip('set DSH_THEME_CLIENT to the DSH theme client bundle');
const reactUmdDir = process.env.REACT_UMD_DIR;
if (!reactUmdDir) skip('set REACT_UMD_DIR to the directory holding react/umd and react-dom/umd');
const source = await readFile(fileURLToPath(new URL('../client.js', import.meta.url)), 'utf8');
const themeSource = await readFile(themeFile, 'utf8');
const match = themeSource.match(/(?:var|const) design_platform_css_default = ("(?:\\.|[^"\\])*");/);
assert.ok(match, 'extract real DSH theme CSS');
const themeCSS = JSON.parse(match[1]);
const output = process.env.OUTPUT_DIR ?? fileURLToPath(new URL('../artifacts', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch(process.env.CHROME_PATH ? { headless: true, executablePath: process.env.CHROME_PATH } : { headless: true });
const page = await browser.newPage({ viewport: { width: 1120, height: 960 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
let installed = true, operation = null, postCount = 0, failInstall = false, failAdd = false;
const addPaths = [];
const projects = [
  { id: 'ios-app', name: 'ios-app', path: '/Users/example/Projects/ios-app', running: true, indexed: true, tools: 3, startedAt: new Date().toISOString() },
  { id: 'ios-legacy-app', name: 'ios-legacy-app', path: '/Users/example/Projects/ios-legacy-app', running: false, indexed: true, tools: 0 },
  { id: 'long-path', name: 'reference-workspace-with-a-long-project-name', path: '/Users/example/Projects/platform-reference-app-with-a-very-long-name/modules/feature-payments', running: false, indexed: false, tools: 0 },
];
const snapshot = () => ({ observedAt: new Date().toISOString(), serena: { installed, bin: installed ? '/Users/example/.local/bin/serena' : null, uv: '/Users/example/.local/bin/uv', version: installed ? '2.1.0' : null }, projects, totals: { projects: projects.length, running: projects.filter(p => p.running).length, tools: 3, indexed: 2 }, autoStart: true, runtimeOperation: operation });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
await page.route('**/serena-manager/snapshot', route => route.fulfill({ json: snapshot() }));
await page.route('**/serena-manager/manage', async route => {
  postCount++;
  const args = route.request().postDataJSON();
  if (args.action === 'add') { addPaths.push(args.path); await route.fulfill({ json: failAdd ? { ok: false, diagnostic: 'Project directory does not exist' } : { ok: true } }); return; }
  if (!['install', 'uninstall'].includes(args.action)) { await route.fulfill({ json: { ok: true } }); return; }
  const startedAt = new Date().toISOString();
  operation = { id: String(postCount), action: args.action, status: 'running', phase: 'preparing', startedAt, updatedAt: startedAt, finishedAt: null, output: '' };
  await delay(350);
  operation.phase = args.action === 'install' ? 'installing' : 'stopping';
  operation.output = args.action === 'install' ? 'Resolving Serena dependencies…' : 'Stopped 1 project instance';
  await delay(1000);
  operation.phase = args.action === 'install' ? 'verifying' : 'uninstalling';
  operation.updatedAt = new Date().toISOString();
  await delay(1000);
  if (args.action === 'install' && failInstall) { operation.status = 'failed'; operation.phase = 'failed'; operation.diagnostic = 'Installer could not reach the package registry'; }
  else { installed = args.action === 'install'; operation.status = 'succeeded'; operation.phase = 'complete'; }
  operation.finishedAt = new Date().toISOString();
  await route.fulfill({ json: { ok: operation.status === 'succeeded', runtimeOperation: operation, diagnostic: operation.diagnostic } });
});
try {
  await page.setContent('<!doctype html><html><head><base href="http://127.0.0.1:64141/"></head><body><main id="main"></main></body></html>');
  await page.addStyleTag({ content: themeCSS + '\nhtml,body,#main{margin:0;width:100%;height:100%;min-height:0}body{font-family:system-ui;--dsh-frame-top-clearance:0px}' });
  await page.addScriptTag({ path: reactUmdDir + '/react/umd/react.development.js' });
  await page.addScriptTag({ path: reactUmdDir + '/react-dom/umd/react-dom.development.js' });
  await page.addScriptTag({ content: `
    window.pickerCalls = 0;
    window.__DSH_DIRECTORY_PICKER__ = { pick() { window.pickerCalls++; if(window.pickerError) return Promise.reject(new Error('Dialog unavailable')); return new Promise(resolve => { window.resolvePicker = resolve; }); } };
    const dicts = {}, snapshotLocale = {active:'zh'};
    window.__ModuleLoader__ = { load(row) {
      const plugin = row.factory(name => { if(name==='react') return React; throw Error(name); });
      const locale = { register(ns,lang,dict){dicts[lang]=dict;return()=>{}}, bind(ns){return key=>dicts[snapshotLocale.active]?.[key]||key}, subscribe(fn){return()=>{}}, getSnapshot(){return snapshotLocale} };
      plugin.apply({ locale, effect(fn){fn()}, slots:{inject(slot,fn){fn()},register(options,component){if(options.name==='main')ReactDOM.createRoot(document.querySelector('#main')).render(React.createElement(component));return()=>{}}} });
    }};
  ` });
  await page.addScriptTag({ content: source });
  await page.getByRole('heading', { name: 'Serena 实例', exact: true }).waitFor();
  await page.getByRole('heading', { name: 'ios-app', exact: true }).waitFor();
  const rootCSS = await page.locator('.sm-panel').evaluate(el => ({ background: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color, accent: getComputedStyle(el).getPropertyValue('--dsw-alias-state-business-primary') }));
  assert.ok(rootCSS.accent.trim(), 'native accent resolves');
  assert.notEqual(rootCSS.background, 'rgba(0, 0, 0, 0)', 'native background resolves');
  await page.screenshot({ path: output + '/ui-light.png', fullPage: true, animations: 'disabled' });
  await page.evaluate(() => document.body.setAttribute('data-ds-dark-theme', ''));
  const darkCSS = await page.locator('.sm-panel').evaluate(el => ({ background: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }));
  assert.notEqual(rootCSS.background, darkCSS.background, 'native dark theme switches background');
  await page.screenshot({ path: output + '/ui-dark.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('searchbox').fill('legacy');
  assert.equal(await page.locator('.sm-card').count(), 1, 'project search filters');
  await page.getByRole('searchbox').fill('missing-project');
  await page.getByRole('heading', { name: '没有匹配的项目' }).waitFor();
  await page.getByRole('searchbox').fill('');
  const picker = () => page.getByRole('button', { name: '选择仓库文件夹…', exact: true });
  assert.equal(await page.locator('#sm-project-path,input[type="file"]').count(), 0, 'no manual path or upload input');
  const postsBeforeCancel = postCount;
  await picker().evaluate(el => { el.click(); el.click(); });
  assert.equal(await page.evaluate(() => window.pickerCalls), 1, 'double click opens only one picker');
  await page.getByRole('button', { name: '正在选择文件夹…', exact: true }).waitFor();
  await page.evaluate(() => window.resolvePicker(null));
  await picker().waitFor();
  assert.equal(postCount, postsBeforeCancel, 'cancel does not register');
  failAdd = true;
  await picker().click();
  await page.evaluate(() => window.resolvePicker('/invalid/path'));
  await page.getByRole('alert').filter({ hasText: 'Project directory does not exist' }).waitFor();
  failAdd = false;
  await picker().click();
  await page.evaluate(() => window.resolvePicker('/Users/example/项目 空格/repo'));
  await page.locator('.sm-outcome').waitFor();
  assert.equal(addPaths.at(-1), '/Users/example/项目 空格/repo', 'native absolute path preserved');
  await page.evaluate(() => { window.pickerError = true; });
  await picker().click();
  await page.getByRole('alert').filter({ hasText: '无法打开文件夹选择器' }).waitFor();
  assert.equal(await picker().isEnabled(), true, 'picker failure unlocks retry');
  await page.evaluate(() => { window.pickerError = false; window.savedPicker = window.__DSH_DIRECTORY_PICKER__; delete window.__DSH_DIRECTORY_PICKER__; });
  await page.getByRole('button', { name: '刷新', exact: true }).click();
  await page.getByText('请在 DSH 桌面应用中打开此面板，选择本机仓库文件夹。', { exact: true }).waitFor();
  assert.equal(await picker().isDisabled(), true, 'no unsupported picker fallback in web browser');
  await page.evaluate(() => { window.__DSH_DIRECTORY_PICKER__ = window.savedPicker; });
  await page.getByRole('button', { name: '刷新', exact: true }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el => el.textContent === '选择仓库文件夹…' && !el.disabled));
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '卸载', exact: true }).click();
  await page.locator('[role="progressbar"]').waitFor();
  assert.equal(await page.locator('[role="progressbar"]').getAttribute('aria-valuenow'), null, 'running progress has no fabricated percentage');
  await page.locator('.sm-progress[data-status="running"] .sm-steps [data-state="current"]').waitFor();
  assert.equal(await picker().isDisabled(), true, 'mutation controls locked while uninstalling');
  await page.locator('.sm-progress[data-status="succeeded"]').waitFor();
  await page.getByRole('button', { name: '安装 Serena', exact: true }).waitFor();
  assert.equal(await page.locator('[role="progressbar"]').getAttribute('aria-valuenow'), '100', 'only success reaches complete');
  failInstall = true;
  const postsBefore = postCount;
  await page.getByRole('button', { name: '安装 Serena', exact: true }).evaluate(el => { el.click(); el.click(); });
  await page.locator('.sm-progress[data-status="running"]').waitFor();
  await page.waitForFunction(() => document.querySelector('.sm-steps [aria-current="step"]')?.textContent.includes('安装 Serena'));
  await page.locator('.sm-log pre').filter({ hasText: 'Resolving Serena dependencies' }).waitFor({ state: 'attached' });
  await page.screenshot({ path: output + '/ui-installing.png', fullPage: true, animations: 'disabled' });
  await page.locator('.sm-progress[data-status="failed"]').waitFor();
  assert.equal(postCount, postsBefore + 1, 'double click makes one request');
  await page.getByRole('alert').filter({ hasText: 'Installer could not reach' }).waitFor();
  failInstall = false;
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await page.locator('.sm-progress[data-status="succeeded"]').waitFor();
  await page.getByRole('button', { name: '卸载', exact: true }).waitFor();
  for (const width of [700, 420, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.locator('.sm-panel').evaluate(el => el.scrollWidth > el.clientWidth + 1), false, 'no horizontal overflow at ' + width);
  }
  await page.screenshot({ path: output + '/ui-narrow.png', fullPage: true, animations: 'disabled' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.deepEqual(errors, [], 'no React or browser runtime errors');
  console.log(JSON.stringify({ result: 'PASS', fixture: true, actualElectron: false, actualUvActions: false, nativeThemeCSS: true, assertions: ['light/dark native tokens','three narrow widths','project search','native picker contract','cancel without mutation','picker double click deduplication','unicode and spaced paths','registration failure and retry','picker failure recovery','web browser desktop hint','install/uninstall stages and output','no fake percent','mutation lock','double click deduplication','failure and retry','success complete'], screenshots: output }));
} finally { await browser.close(); }
