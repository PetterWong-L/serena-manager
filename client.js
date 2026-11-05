window.__ModuleLoader__.load({
  id: '@local/serena-manager',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const dictionaries = {
      en: {
        title: 'Serena Instances', subtitle: 'Code navigation, ready for the project you are working on.',
        refresh: 'Refresh', refreshing: 'Refreshing…', projects: 'Projects', running: 'Running', tools: 'Tools available', indexed: 'Indexed',
        serena: 'Serena runtime', installed: 'Installed', probeOnly: 'Probe build only', missing: 'Not installed',
        install: 'Install Serena', uninstall: 'Uninstall', installing: 'Installing Serena', uninstalling: 'Uninstalling Serena',
        installHint: 'Install once, then start an instance for the project you need. Uninstalling stops all instances and keeps your project indexes.',
        selectProject: 'Choose repository folder…', selectingProject: 'Choosing folder…', pickerHint: 'Choose a local repository folder to register it.', pickerUnavailable: 'Open this panel in the DSH desktop app to choose a local repository folder.', pickerFailed: 'Could not open the folder picker. Please try again.',
        start: 'Start instance', stop: 'Stop instance', stopAll: 'Stop all', index: 'Build index', indexing: 'Indexing…', remove: 'Remove',
        runningBadge: 'Running', stoppedBadge: 'Stopped', indexedBadge: 'Indexed', notIndexedBadge: 'No index', toolsCount: 'tools', started: 'Started',
        empty: 'Your next project starts here', emptyHint: 'Choose a repository folder above. Start its instance when you need semantic code navigation.',
        noMatch: 'No matching projects', noMatchHint: 'Try a different name or path.', search: 'Search by name or path',
        note: 'Keep only the instances you need running. Stopped projects keep their indexes.',
        updated: 'Updated', pending: 'Loading projects…', unavailable: 'Unable to load status. Check the connection and refresh.', stale: 'Showing the last available status.',
        confirmUninstall: 'Uninstall Serena and stop all instances? Project indexes will be kept.',
        autoStart: 'Auto-start enabled instances', autoStartOn: 'On', autoStartOff: 'Off', environment: 'Runtime details',
        projectHeading: 'Project instances', projectHint: 'Start the project you need. Stop it when you switch.',
        logs: 'View output', failed: 'Operation failed', waiting: 'Waiting for the runtime…',
        phase_preparing: 'Checking the runtime', phase_installing: 'Installing Serena', phase_stopping: 'Stopping instances',
        phase_uninstalling: 'Uninstalling Serena', phase_verifying: 'Verifying the result', phase_restarting: 'Restoring instances',
        phase_complete: 'Completed', phase_failed: 'Operation failed', elapsed: 'Elapsed', unknownDuration: 'Waiting for the installer; duration depends on downloads.',
        installDone: 'Serena is ready', uninstallDone: 'Serena has been uninstalled', retry: 'Retry',
        uvMissing: 'uv is required before Serena can be installed.',
        updateIndex: 'Update index', updatingIndex: 'Updating index…', indexDone: 'Project index is ready', indexedAt: 'Index updated',
        phase_indexing: 'Indexing project files', indexDuration: 'Scanning project files; duration depends on project size.',
        indexHint: 'After code changes, update the index. A running instance will stop briefly and resume afterwards.',
      },
      zh: {
        title: 'Serena 实例', subtitle: '为当前项目开启代码语义导航。',
        refresh: '刷新', refreshing: '刷新中…', projects: '已登记项目', running: '运行中', tools: '可用工具', indexed: '已建索引',
        serena: 'Serena 运行时', installed: '已安装', probeOnly: '仅有探针版', missing: '未安装',
        install: '安装 Serena', uninstall: '卸载', installing: '正在安装 Serena', uninstalling: '正在卸载 Serena',
        installHint: '安装一次，按项目开启实例。卸载会关闭所有实例，并保留项目索引。',
        selectProject: '选择仓库文件夹…', selectingProject: '正在选择文件夹…', pickerHint: '选择本机仓库文件夹，选中后自动登记。', pickerUnavailable: '请在 DSH 桌面应用中打开此面板，选择本机仓库文件夹。', pickerFailed: '无法打开文件夹选择器，请重试。',
        start: '启动实例', stop: '停止实例', stopAll: '全部停止', index: '建索引', indexing: '正在建索引…', remove: '移除',
        runningBadge: '运行中', stoppedBadge: '已停止', indexedBadge: '已索引', notIndexedBadge: '未建索引', toolsCount: '个工具', started: '启动于',
        empty: '从一个项目开始', emptyHint: '在上方选择仓库文件夹，需要语义导航时再启动它的实例。',
        noMatch: '没有匹配的项目', noMatchHint: '换一个项目名或路径试试。', search: '搜索项目名或路径',
        note: '只开启当前需要的实例；停止实例后，项目索引会保留。',
        updated: '更新于', pending: '正在读取项目…', unavailable: '暂时无法读取状态，请检查连接后刷新。', stale: '当前显示上一次成功读取的状态。',
        confirmUninstall: '卸载 Serena 并关闭所有实例？项目索引会保留。',
        autoStart: '自动恢复已启用实例', autoStartOn: '已开启', autoStartOff: '已关闭', environment: '运行环境',
        projectHeading: '项目实例', projectHint: '按需启动，切换项目时关闭不再使用的实例。',
        logs: '查看执行日志', failed: '操作失败', waiting: '正在等待运行时响应…',
        phase_preparing: '检查运行环境', phase_installing: '安装 Serena', phase_stopping: '关闭运行中的实例',
        phase_uninstalling: '卸载 Serena', phase_verifying: '校验操作结果', phase_restarting: '恢复已启用实例',
        phase_complete: '已完成', phase_failed: '操作失败', elapsed: '已用时', unknownDuration: '正在等待安装器，耗时取决于下载情况。',
        installDone: 'Serena 已就绪', uninstallDone: 'Serena 已卸载', retry: '重试',
        uvMissing: '需要先安装 uv，才能安装 Serena。',
        updateIndex: '更新索引', updatingIndex: '正在更新索引…', indexDone: '项目索引已就绪', indexedAt: '索引更新于',
        phase_indexing: '扫描项目文件并更新索引', indexDuration: '正在扫描项目文件，耗时取决于项目大小。',
        indexHint: '代码变动后请更新索引；运行中的实例会短暂停止，结束后自动恢复。',
      },
    };
    const css = `
.sm-panel{--sm-accent:var(--dsw-alias-state-business-primary);--sm-line:var(--dsw-alias-border-l3);box-sizing:border-box;width:100%;height:100%;min-height:0;overflow:auto;container-type:inline-size;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family,inherit);font-size:13px;line-height:1.55}
.sm-panel *{box-sizing:border-box}.sm-inner{max-width:1040px;margin:0 auto;padding:calc(28px + var(--dsh-frame-top-clearance,0px)) clamp(20px,4vw,48px) 36px}
.sm-heading,.sm-section-heading,.sm-runtime-top,.sm-progress-top{display:flex;align-items:center;justify-content:space-between;gap:16px}.sm-heading{margin-bottom:24px}.sm-title{display:flex;align-items:center;gap:12px;min-width:0}.sm-title-icon{color:var(--sm-accent);display:grid;place-items:center;width:38px;height:38px;border-radius:var(--dsw-radius-lg,12px);background:color-mix(in srgb,var(--sm-accent) 9%,transparent);flex:none}
.sm-heading h1{margin:0;font-size:20px;line-height:28px;font-weight:600;letter-spacing:-.02em}.sm-heading p{margin:3px 0 0}.sm-muted{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.6}.sm-btn{font:inherit;font-size:12px;line-height:18px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md,8px);min-height:32px;padding:6px 11px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);cursor:pointer;white-space:nowrap;display:inline-flex;justify-content:center;align-items:center;gap:6px;transition:background .12s,color .12s}.sm-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.sm-btn:disabled{opacity:.45;cursor:default}.sm-btn[data-kind=primary]{color:var(--sm-accent);border-color:color-mix(in srgb,var(--sm-accent) 40%,transparent);background:color-mix(in srgb,var(--sm-accent) 7%,var(--dsw-alias-bg-base))}.sm-btn[data-kind=primary]:hover:not(:disabled){background:color-mix(in srgb,var(--sm-accent) 13%,var(--dsw-alias-bg-base))}.sm-btn[data-kind=quiet]{background:transparent;border-color:transparent;color:var(--dsw-alias-label-secondary)}.sm-btn[data-kind=danger]{color:var(--dsw-alias-state-error-primary);border-color:transparent;background:transparent}.sm-btn[data-kind=danger]:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger)}.sm-panel :focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--sm-accent));outline-offset:3px}
.sm-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:24px;padding:0 0 22px;border-bottom:.5px solid var(--sm-line)}.sm-stat{display:flex;flex-direction:column;gap:4px}.sm-stat-label{font-size:12px;color:var(--dsw-alias-label-tertiary)}.sm-number{font-size:23px;line-height:30px;letter-spacing:-.03em;font-weight:500;font-variant-numeric:tabular-nums}.sm-number[data-active=true]{color:var(--sm-accent)}
.sm-runtime{border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg,12px);padding:20px;margin-bottom:30px;background:var(--dsw-alias-bg-layer-1)}.sm-runtime h2,.sm-section-heading h2{font-size:14px;font-weight:600;line-height:22px;margin:0}.sm-runtime-title{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.sm-runtime-desc{margin:8px 0 0;color:var(--dsw-alias-label-secondary);font-size:12px;max-width:600px;line-height:1.7}.sm-actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.sm-runtime-details{border-top:.5px solid var(--sm-line);margin-top:16px;padding-top:12px}.sm-runtime-details summary,.sm-log summary{cursor:pointer;color:var(--dsw-alias-label-tertiary);font-size:12px;width:fit-content}.sm-runtime-details summary:hover,.sm-log summary:hover{color:var(--dsw-alias-label-primary)}.sm-runtime-meta{display:grid;grid-template-columns:140px minmax(0,1fr);gap:7px 16px;margin:12px 0 0;font-size:12px;color:var(--dsw-alias-label-secondary)}.sm-runtime-meta dt{color:var(--dsw-alias-label-tertiary)}.sm-runtime-meta dd{margin:0;overflow-wrap:anywhere}.sm-code{font-family:var(--ds-font-family-code,monospace);font-size:11px}
.sm-badge{font-size:11px;line-height:18px;border-radius:var(--dsw-radius-sm,6px);padding:1px 6px;white-space:nowrap;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);display:inline-flex;align-items:center;gap:5px}.sm-badge[data-status=ok]{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 9%,transparent)}.sm-badge[data-status=warn]{color:var(--dsw-alias-state-warn-label);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 10%,transparent)}.sm-dot{width:5px;height:5px;border-radius:50%;background:currentColor;flex:none}
.sm-section-heading{margin-bottom:12px;align-items:flex-start}.sm-section-heading p{margin:3px 0 0}.sm-add{display:flex;align-items:center;gap:8px;margin-bottom:16px}.sm-input{font:inherit;font-size:12px;min-width:0;width:100%;min-height:34px;padding:7px 10px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)}.sm-input::placeholder{color:var(--dsw-alias-label-caption)}.sm-search{max-width:260px}.sm-search-row{display:flex;justify-content:flex-end;margin-bottom:10px}.sm-project-list{border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg,12px);overflow:hidden}.sm-card{padding:18px 16px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;border-bottom:.5px solid var(--sm-line);position:relative}.sm-card:last-child{border-bottom:0}.sm-card[data-running=true]:before{content:'';position:absolute;left:0;top:18px;bottom:18px;width:3px;border-radius:0 2px 2px 0;background:var(--sm-accent)}.sm-card h3{font-size:13px;line-height:20px;font-weight:600;margin:0;overflow-wrap:anywhere}.sm-card-path{font-family:var(--ds-font-family-code,monospace);font-size:11px;line-height:18px;color:var(--dsw-alias-label-tertiary);margin-top:4px;overflow-wrap:anywhere}.sm-badges{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:9px}.sm-card .sm-actions{align-self:center;justify-content:flex-end}.sm-card-error{color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;margin:6px 0 0}.sm-note{font-size:12px;line-height:1.7;color:var(--dsw-alias-label-tertiary);margin:14px 0 0;display:flex;align-items:flex-start;gap:7px}.sm-note svg{margin-top:3px;flex:none}.sm-empty{text-align:center;padding:36px 20px;border:.5px dashed var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg,12px);color:var(--dsw-alias-label-tertiary)}.sm-empty h3{font-size:14px;color:var(--dsw-alias-label-secondary);font-weight:500;margin:12px 0 4px}.sm-empty p{max-width:400px;margin:0 auto}.sm-alert{padding:10px 12px;border:.5px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 40%,transparent);border-radius:var(--dsw-radius-md,8px);font-size:12px;margin-bottom:16px;color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere}.sm-outcome{margin-bottom:14px;font-size:12px;color:var(--dsw-alias-label-secondary)}.sm-log{margin-top:10px}.sm-log pre{margin:8px 0 0;padding:10px 12px;max-height:180px;overflow:auto;border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-family:var(--ds-font-family-code,monospace);font-size:11px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}
.sm-progress{margin-top:16px;border-top:.5px solid var(--sm-line);padding-top:14px}.sm-progress-title{font-size:12px;font-weight:500;display:flex;align-items:center;gap:7px}.sm-progress[data-status=succeeded] .sm-progress-title{color:var(--dsw-alias-state-success-primary)}.sm-progress[data-status=failed] .sm-progress-title{color:var(--dsw-alias-state-error-primary)}.sm-progress-top{gap:8px}.sm-track{height:4px;margin:10px 0 9px;background:var(--dsw-alias-bg-layer-2);border-radius:999px;overflow:hidden;position:relative}.sm-fill{height:100%;width:100%;background:var(--sm-accent);border-radius:inherit}.sm-track[data-running=true] .sm-fill{width:35%;animation:sm-progress-slide 1.5s ease-in-out infinite}.sm-progress[data-status=succeeded] .sm-fill{background:var(--dsw-alias-state-success-primary)}.sm-progress[data-status=failed] .sm-fill{background:var(--dsw-alias-state-error-primary);width:100%;opacity:.45}.sm-steps{display:flex;gap:8px 16px;flex-wrap:wrap;padding:0;margin:0;list-style:none;color:var(--dsw-alias-label-caption);font-size:11px}.sm-steps li{display:flex;align-items:center;gap:5px}.sm-steps li[data-state=current]{color:var(--sm-accent)}.sm-steps li[data-state=done]{color:var(--dsw-alias-label-secondary)}.sm-step-dot{display:inline-grid;place-items:center;min-width:14px;height:14px;border:1px solid currentColor;border-radius:50%;font-size:9px}.sm-progress-hint{margin:8px 0 0;font-size:11px;color:var(--dsw-alias-label-tertiary)}.sm-foot{margin-top:24px;color:var(--dsw-alias-label-caption);font-size:11px}.sm-spinner{width:12px;height:12px;border:1.5px solid currentColor;border-right-color:transparent;border-radius:50%;display:inline-block;animation:sm-spin .9s linear infinite;flex:none}.sm-icon{display:inline-flex;flex:none}.sm-visually-hidden{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@keyframes sm-progress-slide{0%{transform:translateX(-110%)}100%{transform:translateX(390%)}}@keyframes sm-spin{to{transform:rotate(360deg)}}
@container(max-width:700px){.sm-card{grid-template-columns:minmax(0,1fr)}.sm-card .sm-actions{justify-content:flex-start}.sm-inner{padding-inline:20px}.sm-runtime-top{align-items:flex-start;flex-direction:column;gap:12px}.sm-section-heading{flex-wrap:wrap}.sm-card .sm-btn[data-kind=danger]{margin-left:auto}}
@container(max-width:400px){.sm-heading{align-items:flex-start;gap:8px}.sm-title-icon{display:none}.sm-heading h1{font-size:18px}.sm-stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.sm-runtime{padding:14px}.sm-add{align-items:stretch;flex-direction:column}.sm-search{max-width:none}.sm-section-heading>.sm-btn{padding-left:0}.sm-runtime-meta{grid-template-columns:1fr;gap:2px}.sm-runtime-meta dd{margin-bottom:7px}.sm-inner{padding-inline:14px}.sm-steps{gap:6px 10px}}
@media(prefers-reduced-motion:reduce){.sm-spinner,.sm-track[data-running=true] .sm-fill{animation:none}.sm-track[data-running=true] .sm-fill{width:100%;opacity:.5}.sm-btn{transition:none}}
`;
    function Glyph({ name, size = 16 }) {
      const paths = { refresh: 'M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.6-2L20 8M4 16l2.3 3A7 7 0 0 0 18 17', folder: 'M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3V7Z', check: 'm5 12 4 4L19 6', info: 'M12 11v6m0-10v.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', close: 'm6 6 12 12M6 18 18 6', plus: 'M12 5v14M5 12h14' };
      return h('svg', { className: 'sm-icon', width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, h('path', { d: paths[name] || paths.info }));
    }
    function Icon({ size = 20 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, h('path', { d: 'M12 4v5m0 6v5M5 8l4 2m6 4 4 2M5 16l4-2m6-4 4-2' }), ...[[12, 12, 3], [12, 3, 1.5], [12, 21, 1.5], [4, 7.5, 1.5], [20, 16.5, 1.5], [4, 16.5, 1.5], [20, 7.5, 1.5]].map(([cx, cy, r], key) => h('circle', { cx, cy, r, key })));
    }
    const failed = value => value?.application === 'failed' || value?.ok === false || value?.index?.ok === false;
    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        for (const [language, dict] of Object.entries(dictionaries)) ctx.effect(() => ctx.locale.register('serena-manager', language, dict));
        const t = ctx.locale.bind('serena-manager');
        const subscribe = fn => ctx.locale.subscribe(fn);
        const getLocale = () => ctx.locale.getSnapshot();
        function Progress({ operation, onRetry }) {
          const [now, setNow] = React.useState(Date.now);
          const running = operation?.status === 'running';
          React.useEffect(() => { if (!running) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [running]);
          if (!operation) return null;
          const isInstall = operation.action === 'install';
          const isIndex = operation.action === 'index';
          const stages = isIndex ? ['preparing', 'stopping', 'indexing', 'verifying', 'restarting'] : isInstall ? ['preparing', 'installing', 'verifying', 'restarting'] : ['stopping', 'uninstalling', 'verifying'];
          const index = stages.indexOf(operation.phase);
          const succeeded = operation.status === 'succeeded';
          const title = running ? t(isIndex ? 'updatingIndex' : isInstall ? 'installing' : 'uninstalling') : succeeded ? t(isIndex ? 'indexDone' : isInstall ? 'installDone' : 'uninstallDone') : t('failed');
          const elapsed = Math.max(0, Math.floor(((operation.finishedAt ? Date.parse(operation.finishedAt) : now) - Date.parse(operation.startedAt)) / 1000));
          const time = Number.isFinite(elapsed) ? `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}` : '0:00';
          return h('div', { className: 'sm-progress', 'data-status': operation.status },
            h('div', { className: 'sm-progress-top' }, h('div', { className: 'sm-progress-title', role: 'status', 'aria-live': 'polite' }, running ? h('span', { className: 'sm-spinner', 'aria-hidden': true }) : h(Glyph, { name: succeeded ? 'check' : 'close', size: 14 }), title), h('span', { className: 'sm-muted' }, `${t('elapsed')} ${time}`)),
            h('div', { className: 'sm-track', 'data-running': running, role: 'progressbar', 'aria-label': title, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': succeeded ? 100 : undefined, 'aria-valuetext': t(`phase_${operation.phase}`) }, h('div', { className: 'sm-fill' })),
            h('ol', { className: 'sm-steps', 'aria-label': title }, stages.map((phase, i) => { const state = succeeded || (index >= 0 && i < index) ? 'done' : i === index ? 'current' : 'pending'; return h('li', { key: phase, 'data-state': state, 'aria-current': state === 'current' ? 'step' : undefined }, h('span', { className: 'sm-step-dot', 'aria-hidden': true }, state === 'done' ? '✓' : i + 1), t(`phase_${phase}`)); })),
            running && h('p', { className: 'sm-progress-hint' }, t(operation.phase === 'preparing' ? 'waiting' : isIndex ? 'indexDuration' : 'unknownDuration')),
            operation.diagnostic && h('p', { className: 'sm-card-error', role: 'alert' }, operation.diagnostic),
            operation.output && h('details', { className: 'sm-log' }, h('summary', null, t('logs')), h('pre', null, operation.output)),
            operation.status === 'failed' && h('button', { className: 'sm-btn', type: 'button', style: { marginTop: 10 }, onClick: () => onRetry(operation) }, t('retry')));
        }
        function Panel() {
          const locale = React.useSyncExternalStore(subscribe, getLocale, getLocale);
          const language = locale.active;
          const [snapshot, setSnapshot] = React.useState(null);
          const [error, setError] = React.useState(false);
          const [loading, setLoading] = React.useState(true);
          const [refresh, setRefresh] = React.useState(0);
          const [search, setSearch] = React.useState('');
          const [picking, setPicking] = React.useState(false);
          const [busy, setBusy] = React.useState('');
          const [outcome, setOutcome] = React.useState(null);
          const [localOperation, setLocalOperation] = React.useState(null);
          const alive = React.useRef(false);
          const requestLock = React.useRef(false);
          const pickerLock = React.useRef(false);
          React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
          async function request(args) {
            if (requestLock.current || snapshot?.runtimeOperation?.status === 'running') return false;
            requestLock.current = true;
            setBusy(`${args.action}:${args.id || ''}`); setOutcome(null);
            const runtimeAction = ['install', 'uninstall', 'index'].includes(args.action);
            const startedAt = new Date().toISOString();
            if (runtimeAction) setLocalOperation({ id: `local-${startedAt}`, previousId: snapshot?.runtimeOperation?.id, projectId: args.id, action: args.action, status: 'running', phase: args.action === 'uninstall' ? 'stopping' : 'preparing', startedAt, output: '' });
            try {
              const response = await fetch(new URL('serena-manager/manage', document.baseURI), { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
              const value = await response.json().catch(() => ({ application: 'failed', error: { diagnostic: `HTTP ${response.status}` } }));
              if (!response.ok && !failed(value)) value.application = 'failed';
              if (alive.current) {
                setOutcome(runtimeAction ? null : value); setRefresh(n => n + 1);
                if (runtimeAction) setLocalOperation(value.runtimeOperation || { id: `local-${startedAt}`, previousId: snapshot?.runtimeOperation?.id, projectId: args.id, action: args.action, status: failed(value) ? 'failed' : 'succeeded', phase: failed(value) ? 'failed' : 'complete', startedAt, finishedAt: new Date().toISOString(), output: value.output || '', diagnostic: value.diagnostic || value.error?.diagnostic || value.error?.code });
              }
              return !failed(value);
            } catch {
              if (alive.current) { if (runtimeAction) setLocalOperation({ id: `local-${startedAt}`, previousId: snapshot?.runtimeOperation?.id, projectId: args.id, action: args.action, status: 'failed', phase: 'failed', startedAt, finishedAt: new Date().toISOString(), diagnostic: t('unavailable') }); else setOutcome({ application: 'failed', error: { diagnostic: t('unavailable') } }); setRefresh(n => n + 1); }
              return false;
            } finally { requestLock.current = false; if (alive.current) setBusy(''); }
          }
          React.useEffect(() => {
            let disposed = false, timer, active;
            async function load() {
              if (document.hidden) { timer = setTimeout(load, busy ? 700 : 5000); return; }
              active = new AbortController();
              const timeout = setTimeout(() => active.abort(), 12000);
              let operationRunning = false;
              try {
                const response = await fetch(new URL('serena-manager/snapshot', document.baseURI), { credentials: 'same-origin', cache: 'no-store', signal: active.signal });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const value = await response.json();
                if (!Array.isArray(value.projects) || !value.totals) throw new Error('invalid snapshot');
                operationRunning = value.runtimeOperation?.status === 'running';
                if (!disposed) { setSnapshot(value); setError(false); }
              } catch { if (!disposed) setError(true); }
              finally { clearTimeout(timeout); if (!disposed) { setLoading(false); timer = setTimeout(load, busy || operationRunning ? 700 : 5000); } }
            }
            load();
            const visibility = () => { if (!document.hidden) { clearTimeout(timer); active?.abort(); setRefresh(n => n + 1); } };
            document.addEventListener('visibilitychange', visibility);
            return () => { disposed = true; clearTimeout(timer); active?.abort(); document.removeEventListener('visibilitychange', visibility); };
          }, [refresh, busy]);
          const remoteOperation = snapshot?.runtimeOperation;
          const remoteMatchesLocal = localOperation && remoteOperation && remoteOperation.id !== localOperation.previousId && remoteOperation.action === localOperation.action && remoteOperation.projectId === localOperation.projectId && Date.parse(remoteOperation.startedAt) >= Date.parse(localOperation.startedAt) - 1000;
          const operation = localOperation ? remoteMatchesLocal ? remoteOperation : localOperation : remoteOperation;
          const locked = picking || Boolean(busy) || remoteOperation?.status === 'running';
          const canPickDirectory = typeof window.__DSH_DIRECTORY_PICKER__?.pick === 'function';
          const serena = snapshot?.serena;
          const query = search.trim().toLowerCase();
          const projects = (snapshot?.projects || []).filter(project => !query || `${project.name} ${project.path}`.toLowerCase().includes(query));
          const badge = serena?.installed ? ['ok', 'installed'] : serena?.probeOnly ? ['warn', 'probeOnly'] : ['off', 'missing'];
          const action = (label, args, props = {}) => h('button', { className: 'sm-btn', type: 'button', disabled: locked, onClick: () => request(args), ...props }, t(label));
          async function chooseProject() {
            if (pickerLock.current || requestLock.current || snapshot?.runtimeOperation?.status === 'running') return;
            pickerLock.current = true;
            setPicking(true);
            setOutcome(null);
            try {
              if (!canPickDirectory) throw new Error(t('pickerUnavailable'));
              const selected = await window.__DSH_DIRECTORY_PICKER__.pick();
              if (alive.current && typeof selected === 'string' && selected.trim()) await request({ action: 'add', path: selected });
            } catch (error) {
              if (alive.current) setOutcome({ application: 'failed', error: { diagnostic: `${t('pickerFailed')} ${String(error?.message ?? error)}` } });
            } finally {
              pickerLock.current = false;
              if (alive.current) setPicking(false);
            }
          }
          return h('section', { className: 'sm-panel', 'aria-label': t('title') }, h('style', null, css), h('div', { className: 'sm-inner' },
            h('header', { className: 'sm-heading' }, h('div', { className: 'sm-title' }, h('span', { className: 'sm-title-icon' }, h(Icon, { size: 25 })), h('div', null, h('h1', null, t('title')), h('p', { className: 'sm-muted' }, t('subtitle')))), h('button', { className: 'sm-btn', 'data-kind': 'quiet', type: 'button', onClick: () => { setLoading(true); setRefresh(n => n + 1); }, disabled: loading, 'aria-label': t('refresh') }, h(Glyph, { name: 'refresh', size: 14 }), t(loading ? 'refreshing' : 'refresh'))),
            h('div', { className: 'sm-stats' }, ['projects', 'running', 'tools', 'indexed'].map(key => h('div', { className: 'sm-stat', key }, h('span', { className: 'sm-stat-label' }, t(key)), h('span', { className: 'sm-number', 'data-active': key === 'running' && snapshot?.totals.running > 0 }, snapshot?.totals[key] ?? '—')))),
            error && h('div', { className: 'sm-alert', role: 'alert' }, t('unavailable'), snapshot && ` ${t('stale')}`),
            h('section', { className: 'sm-runtime', 'aria-label': t('serena') },
              h('div', { className: 'sm-runtime-top' }, h('div', { className: 'sm-runtime-title' }, h('h2', null, t('serena')), snapshot && h('span', { className: 'sm-badge', 'data-status': badge[0] }, h('span', { className: 'sm-dot' }), t(badge[1])), serena?.version && h('span', { className: 'sm-muted' }, serena.version)), h('div', { className: 'sm-actions' }, !serena?.installed && action('install', { action: 'install' }, { 'data-kind': 'primary', disabled: locked || !serena?.uv || !snapshot }), serena?.installed && h('button', { className: 'sm-btn', 'data-kind': 'danger', type: 'button', disabled: locked, onClick: () => { if (window.confirm(t('confirmUninstall'))) request({ action: 'uninstall' }); } }, t('uninstall')))),
              h('p', { className: 'sm-runtime-desc' }, t('installHint')),
              snapshot && !serena?.uv && h('p', { className: 'sm-card-error' }, t('uvMissing')),
              h(Progress, { operation: operation?.action === 'index' ? null : operation, onRetry: retry => request({ action: retry.action, id: retry.projectId }) }),
              h('details', { className: 'sm-runtime-details' }, h('summary', null, t('environment')), h('dl', { className: 'sm-runtime-meta' }, h('dt', null, 'Serena'), h('dd', { className: 'sm-code' }, serena?.bin || '—'), h('dt', null, 'uv'), h('dd', { className: 'sm-code' }, serena?.uv || '—'), h('dt', null, t('autoStart')), h('dd', null, t(snapshot?.autoStart ? 'autoStartOn' : 'autoStartOff'))))),
            h('section', { 'aria-label': t('projectHeading') },
              h('div', { className: 'sm-section-heading' }, h('div', null, h('h2', null, t('projectHeading')), h('p', { className: 'sm-muted' }, t('projectHint'))), action('stopAll', { action: 'stop-all' }, { 'data-kind': 'quiet', disabled: locked || !snapshot?.totals.running })),
              h('div', { className: 'sm-add' }, h('button', { className: 'sm-btn', 'data-kind': 'primary', type: 'button', disabled: locked || !snapshot || !canPickDirectory, onClick: chooseProject }, picking ? h('span', { className: 'sm-spinner', 'aria-hidden': true }) : h(Glyph, { name: 'folder', size: 14 }), t(picking ? 'selectingProject' : 'selectProject')), h('span', { className: 'sm-muted' }, t(canPickDirectory ? 'pickerHint' : 'pickerUnavailable'))),
              h('p', { className: 'sm-muted' }, t('indexHint')),
              h(Progress, { operation: operation?.action === 'index' ? operation : null, onRetry: retry => request({ action: retry.action, id: retry.projectId }) }),
              outcome && h('div', { className: failed(outcome) ? 'sm-alert' : 'sm-outcome', role: failed(outcome) ? 'alert' : 'status' }, failed(outcome) ? outcome.error?.diagnostic || outcome.error?.code || outcome.diagnostic || t('failed') : t('updated'), (outcome.output || outcome.index?.output) && h('details', { className: 'sm-log' }, h('summary', null, t('logs')), h('pre', null, outcome.output || outcome.index.output))),
              snapshot?.totals.projects > 1 && h('div', { className: 'sm-search-row' }, h('input', { className: 'sm-input sm-search', type: 'search', value: search, placeholder: t('search'), 'aria-label': t('search'), onChange: e => setSearch(e.target.value) })),
              !snapshot && loading ? h('p', { className: 'sm-muted', role: 'status' }, t('pending')) : projects.length ? h('div', { className: 'sm-project-list' }, projects.map(project => h('article', { key: project.id, className: 'sm-card', 'data-running': project.running },
                h('div', { style: { minWidth: 0 } }, h('h3', null, project.name), h('div', { className: 'sm-card-path' }, project.path), h('div', { className: 'sm-badges' }, h('span', { className: 'sm-badge', 'data-status': project.running ? 'ok' : 'off' }, h('span', { className: 'sm-dot' }), t(project.running ? 'runningBadge' : 'stoppedBadge')), h('span', { className: 'sm-muted' }, t(project.indexed ? 'indexedBadge' : 'notIndexedBadge')), project.indexedAt && h('span', { className: 'sm-muted' }, `${t('indexedAt')} `, h('time', { dateTime: project.indexedAt }, new Date(project.indexedAt).toLocaleString(language))), project.running && h('span', { className: 'sm-muted' }, `${project.tools} ${t('toolsCount')}`), project.running && project.startedAt && h('span', { className: 'sm-muted' }, `${t('started')} ${new Date(project.startedAt).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}`)), project.error && h('p', { className: 'sm-card-error', role: 'alert' }, project.error)),
                h('div', { className: 'sm-actions' }, action(project.running ? 'stop' : 'start', { action: project.running ? 'stop' : 'start', id: project.id }, { 'data-kind': 'primary', disabled: locked || !serena?.bin }), action(operation?.action === 'index' && operation.projectId === project.id && operation.status === 'running' ? (project.indexed ? 'updatingIndex' : 'indexing') : project.indexed ? 'updateIndex' : 'index', { action: 'index', id: project.id }, { disabled: locked || !serena?.bin, title: t('indexHint') }), action('remove', { action: 'remove', id: project.id }, { 'data-kind': 'danger' }))))) : snapshot && h('div', { className: 'sm-empty' }, h(Glyph, { name: 'folder', size: 28 }), h('h3', null, t(snapshot.totals.projects ? 'noMatch' : 'empty')), h('p', { className: 'sm-muted' }, t(snapshot.totals.projects ? 'noMatchHint' : 'emptyHint'))),
              h('p', { className: 'sm-note' }, h(Glyph, { name: 'info', size: 13 }), t('note'))),
            snapshot && h('footer', { className: 'sm-foot' }, `${t('updated')} ${new Date(snapshot.observedAt).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}`)));
        }
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: 'serena-manager', order: 66, label: () => t('title') }, Icon));
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'serena-manager' }, Panel));
      },
    };
  },
});
