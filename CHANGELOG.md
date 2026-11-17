# Changelog

## 0.2.1 — 2026-11-17

### Fixed

- 修复“Serena reported success but the index cache is missing”死锁般的提示：Serena 首次自动生成 `.serena/project.yml` 时先写入空的 `language_servers: []`，再在**后台线程**推断语言并回写；实例在该线程完成前被停止，文件就永久停在空列表，之后 `serena project index` 会跳过所有文件却仍以 0 退出。插件现在在启动实例和建索引前把空列表修复为配置的语言（默认 `swift`），因此面板可以自愈，不必手工编辑 YAML。
- 建索引仍为空时给出可执行的原因：未声明语言服务（附修复结果）、匹配 0 个文件（检查 `ignored_paths` 与语言服务器）、或索引了文件但缓存不可写。
- `--ls` 不再硬编码为 `swift`；非 Swift 项目也能正确建索引。

### Added

- 新增 `languages` 配置项（默认 `["swift"]`），指定建索引使用的语言服务。
- 项目卡片对缺少语言服务的项目显示告警徽标与修复说明，不再只显示“未建索引”。

### Verification and compatibility

- host/panel 冒烟检查通过，mocked backend 场景从 18 增至 20（空 `language_servers` 的索引自愈、启动前修复），面板冒烟覆盖新徽标。
- 用真实的 oog126 项目验证：修复 `.serena/project.yml` 后重新建索引得到 `document_symbols.pkl`。
- 无新增依赖、无状态迁移；Node.js >= 20 的要求不变。

## 0.2.0 — 2026-11-05

### Added

- 已建立索引的项目新增“更新索引”操作，并显示索引缓存更新时间。
- 建索引和更新索引展示执行阶段、日志及失败重试入口；agent 继续使用 `index` 动作。
- 为索引更新、实例恢复、失败重试和缓存校验补充自动化测试及中英文使用说明。

### Fixed

- 索引更新前先停止运行中的实例，结束后恢复；原本停止的项目保持停止。
- 项目启停、移除及运行时操作串行执行，避免与索引缓存写入冲突。
- 实例停止失败时中止索引；恢复失败后保留恢复意图，供重试继续执行。主动停止或移除项目会取消待恢复状态。

### Verification and compatibility

- Passed host/panel smoke checks, 18 mocked backend scenarios, and the browser UI fixture.
- UI verification uses a real browser and DSH theme with a mocked backend; no production project was reindexed for this release.
- Index updates are manual. Click “更新索引 / Update index” after changing project code.
- No new dependencies, configuration changes or state migrations. Node.js >= 20 remains required.
- The package remains private; this release distributes source archives and a plugin tarball through GitHub Releases.
