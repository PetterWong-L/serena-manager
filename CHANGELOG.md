# Changelog

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
