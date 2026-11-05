# serena-manager

给 DSH 里的 agent 装上一套**语义代码导航**：按项目起停 Serena（LSP over MCP），让它查定义、找引用、只读符号体，而不是 grep 整仓库再整文件读。

简体中文 · [English](./README.en.md)

![Serena 面板，浅色主题](artifacts/ui-light.png)

## 这个插件的目的是什么

不是"又一个 Serena 管理器"。目的是**给 agent 换一套读代码的方式**：

- 默认的 agent 读代码靠 `grep` + 整文件读取：找一次调用点要扫全仓，读一个函数要吞掉整个文件，token 花在无关代码上，重命名类的改动还容易漏。
- Serena 把 LSP 的语义层通过 MCP 暴露出来：按符号名查定义、查谁引用了它、只取符号体、按符号改。粒度从"文件"变成"符号"。
- 但 Serena 是**每个项目一个 MCP server**，手接进 DSH 意味着每个项目改一次 profile、重启一次应用；而且每个活着的实例都会把工具 schema 塞进模型上下文。

所以本插件要交付的是：**一个可以随时开关的"语义导航"能力**。装运行时、按项目启停 MCP、建符号索引、把工具暴露给 agent——这些都在一个侧边面板里完成，不改 profile、不重启应用。管理 Serena 只是实现手段，交付物是 agent 的导航能力。

它**不**做的事：不打包 Serena（永远用上游 `serena-agent`）、不替代语言服务器、不支持多个项目同时上线（那会让上下文里的工具 schema 翻倍）。

## Serena 是什么

[Serena](https://github.com/oraios/serena) 是基于语言服务器的语义代码检索与编辑工具箱，以 MCP server 形式对 agent 提供能力，本身不生成代码。核心操作大致是：

| 能力 | 典型调用 | 相比 grep/整文件读省在哪 |
| --- | --- | --- |
| 定义定位 | `find_symbol("OrderService.submit")` | 一次命中，不用扫全仓 |
| 引用查找 | `find_referencing_symbols(...)` | 改名/改签名前知道影响面 |
| 文件概览 | `get_symbols_overview(path)` | 先看骨架，再决定读哪段 |
| 按符号编辑 | `replace_symbol_body(...)` / `insert_after_symbol(...)` | 只改目标符号，不动别的代码 |
| 模式检索 | `search_for_pattern(...)` | 结构化搜索，比 `grep -rn` 少读无用文件 |

在 DSH 里，这些能力由 **3 个 MCP 工具**承载（Serena v2 的 `--agent-interface repl` 模式）：

- `initial_instructions` — 该项目的使用说明（约 2.3k tokens，读一次即可）
- `activate_project` — 切到某个项目
- `serena_repl` — 执行一段 Python，调用上面所有语义 API（符号/引用搜索、文件概览、编辑、重构、检查）

代价也要说清楚：每个运行中的实例会给上下文增加约 1.1k tokens 的工具 schema，所以面板围绕"**同一时间一个项目**"设计。

## 截图

| 浅色 | 深色 |
| --- | --- |
| ![浅色](artifacts/ui-light.png) | ![深色](artifacts/ui-dark.png) |

| 安装进行中 | 窄面板（320 px） |
| --- | --- |
| ![安装中](artifacts/ui-installing.png) | ![窄屏](artifacts/ui-narrow.png) |

截图由 `tests/ui-fixture.mjs` 渲染：真实 DSH 主题包 + 模拟 HTTP 后端 + 模拟文件夹选择器。它是浏览器 fixture，不是 Electron 应用实拍；演示项目都是占位名。

## 依赖

| 依赖 | 版本 | 用途 | 安装 |
| --- | --- | --- | --- |
| DSH 桌面应用 | 带插件 API 的版本（`dsh.profile.bundles` + client slot） | 宿主；面板与工具都跑在它里面 | 从 DSH 发行渠道安装 |
| Node.js | ≥ 20 | 插件运行时（`engines`）；DSH 自带 node 时可忽略 | `brew install node` 或 nvm |
| pnpm | ≥ 8 | `dsh plugin` 把参数转发给 profile 里的 pnpm | `corepack enable` 或 `npm i -g pnpm` |
| uv | ≥ 0.4 | 安装/卸载 Serena 的包管理器 | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Serena | 2.x（`serena-agent`） | 语义导航本体 | 由本插件安装；手动等价命令见下 |
| Xcode / Swift toolchain | — | 仅 Swift 项目：索引需要 sourcekit-lsp | App Store 或 `xcode-select --install` |

手动装 Serena（插件"安装 Serena"按钮的等价操作，装到 `~/.local/bin/serena`）：

```bash
uv tool install -p 3.13 serena-agent
serena --version          # 期望输出 Serena 2.1.0 或更高
```

如果 `uv` 不在 `~/.local/bin/uv`、也不在 `PATH`，用环境变量指定：

```bash
export SERENA_MANAGER_UV=/opt/homebrew/bin/uv
```

## 安装插件（人工步骤）

仓库可以放在任意位置，装成链接包：

```bash
git clone https://github.com/PetterWong-L/serena-manager.git
cd serena-manager
```

在 DSH profile（`~/.dsh/profiles/<profile>/package.json`）里登记两处：`dependencies` 加链接，`dsh.profile.bundles` 加包名（只加依赖不加载，profile 不会跑它）。

```json
{
  "dependencies": {
    "@local/serena-manager": "link:/absolute/path/to/serena-manager"
  },
  "dsh": {
    "profile": {
      "bundles": ["@local/serena-manager"]
    }
  }
}
```

装进 profile：

```bash
dsh plugin --profile desktop install
```

如果提示 `profile "desktop" is managed exclusively by the Electron application`，说明这个 profile 由桌面应用接管：在 profile 目录里直接执行 `pnpm install`（`dsh plugin` 本来就是把这串参数转发给 pnpm），或者用桌面应用自带的插件设置完成安装。装完重启 DSH，侧边栏会出现 **Serena 实例**。bundle patch 在 `cordis.patch.yml`，故意不含机器相关路径；要改注册表/日志位置时在 profile 的 patch 层覆盖：

```yaml
- insert:
    - id: serena-manager
      name: '@local/serena-manager'
      config:
        storageDir: /some/other/place/serena-manager
```

## 给 AI 的安装说明

把下面这段整段交给 agent（Codex / Claude Code / DSH agent 都可以），它会按顺序检查、安装、验收。前提：它已经能在本机执行命令。

```text
帮我在一台装好 DSH 桌面应用的机器上安装并验收 DSH 插件 serena-manager。
仓库：https://github.com/PetterWong-L/serena-manager

按顺序执行，每步报告实际输出，失败就停下来说明原因，不要猜：

1. 前置检查（缺什么先装什么）
   - node -v（需 ≥ 20）、pnpm -v（需 ≥ 8，缺了用 corepack enable）
   - uv --version 或 ls ~/.local/bin/uv（缺了用 curl -LsSf https://astral.sh/uv/install.sh | sh）
   - dsh --version（确认是带插件 API 的版本）

2. 克隆仓库到固定位置，例如 ~/dsh/serena-manager
   git clone https://github.com/PetterWong-L/serena-manager.git ~/dsh/serena-manager

3. 修改 DSH profile 的 package.json（先备份；只增不删，保持 JSON 合法）
   文件：~/.dsh/profiles/<profile>/package.json
   - dependencies 里加："@local/serena-manager": "link:<克隆的绝对路径>"
   - dsh.profile.bundles 数组里追加 "@local/serena-manager"
   注意：link: 后面必须是绝对路径；不要动其他插件条目。

4. 装进 profile
   dsh plugin --profile <profile> install

5. 验收（不要只看命令退出码）
   - 读回 profile manifest，确认两处都登记上了：
     node -e '
       const p = require(process.env.HOME + "/.dsh/profiles/<profile>/package.json");
       console.log(
         p.dependencies["@local/serena-manager"],
         p.dsh.profile.bundles.includes("@local/serena-manager"),
       );
     '
     期望输出：一个 link: 绝对路径 和 true
   - 重启 DSH（或等 HMR），侧边栏应出现「Serena 实例」
   - 打开面板 → 运行环境卡片 → 安装 Serena，等到状态变成「已安装」并显示版本（2.x）
   - 添加一个真实项目目录 → 启动实例 → 面板显示「运行中」和工具数（应为 3）
   - 建索引后确认 <项目>/.serena/cache/swift/document_symbols.pkl 存在

6. 告诉我
   - 面板截图
   - serena_manager status 的 snapshot（installed、version、projects）
   - 失败的步骤和原始报错文本

约束：不要提交或写入任何 token/API key；不要删除别人已有的插件配置；
不要为了绕过检查去改插件源码；路径一律用绝对路径。
```

它执行完，你应该能在 agent 的工具列表里看到 `serena_manager` 和 `mcp__serena-<项目>__serena_repl` 这类工具。

### 常见卡点

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `dsh plugin` 报 `managed exclusively by the Electron application` | 该 profile 由桌面应用接管 | 在 profile 目录执行 `pnpm install`，或用桌面应用的插件设置 |
| `dsh plugin` 报找不到 pnpm | pnpm 不在 PATH | `corepack enable` 或 `npm i -g pnpm` |
| 面板一直"未安装" | `uv` 不在默认位置 | 设 `SERENA_MANAGER_UV` 为绝对路径后重试 |
| 面板没出现 | bundle 没进 `dsh.profile.bundles` | 补上条目，重跑 `dsh plugin install`，重启 |
| 文件夹按钮灰的 | 在浏览器里打开，不是桌面应用 | 用桌面应用打开同一面板 |
| 启动成功但工具数 0 | MCP 握手失败 | 看 `~/.dsh/serena-manager/load.log`，手动跑 `serena start-mcp-server --project <path>` 复现 |
| 建索引失败 | 缺语言服务器 | Swift 需 Xcode/sourcekit-lsp；其他语言装对应 LSP |

## 使用

1. **安装 Serena** — 运行时卡片执行安装、流式输出日志、结束后校验二进制。卸载移除工具但保留项目索引。
2. **添加项目** — *选择仓库文件夹…* 走原生选择器，按路径登记，slug 成为 MCP server 名 `serena-<id>`。
3. **启动** — 只启动该项目的 MCP server；*建索引* 默认按 Swift 生成符号缓存；*停止* 释放 fiber 与子进程。
4. **全部停止** — 想把工具 schema 从上下文里清掉时用。

同样能力通过 `serena_manager` 工具给 agent：`status`、`install`、`uninstall`、`add`、`remove`、`start`、`stop`、`stop-all`、`index`。只有 `status` 是并发安全的，其余都会改变 profile 暴露的工具集合。

## 实现要点

```
DSH profile
└── serena-manager（宿主插件，index.js）
    ├── Store        ~/.dsh/serena-manager/state.json（项目、autoStart）
    ├── Instances    每个运行中的项目一个 mcp-client fiber
    │                 └── 子进程：serena start-mcp-server --context codex --project <path>
    ├── Routes       GET  /serena-manager/snapshot
    │                POST /serena-manager/manage
    └── Tool         serena_manager
```

- **一项目一 fiber**：`ctx.plugin({ inject, apply }, config)` 为该 server 注册上游 `@deepseek-ai/dsh-mcp-client`；dispose fiber 即 dispose stdio transport，子进程退出、工具注销。
- **模块解析**：用 `ctx.loader.import` 引入 mcp-client，附带 `.asar`／profile 路径扫描兜底，链接 checkout 与打包应用内都能工作。
- **索引判定**：`<repo>/.serena/cache/<language>/document_symbols.pkl` 存在即"已建索引"，mtime 作为新鲜度；不从运行中的 server 猜。
- **进度**：安装/卸载串行执行，报真实阶段（`preparing → installing → verifying → complete`，或 `stopping → uninstalling → verifying`），不编造百分比，日志尾巴上限 16,000 字符。
- **停止顺序**：stdin EOF → `SIGTERM` → `SIGKILL`。涉及端口：dashboard 24282+、Serena tray manager 24224、`start-project-server` 24225。

### 配置

| 项 | 默认值 | 说明 |
| --- | --- | --- |
| `storageDir` | `~/.dsh/serena-manager` | 存放 `state.json` 和 `load.log`。 |
| `SERENA_MANAGER_UV` | `~/.local/bin/uv` | `uv` 的绝对路径；也会探测 `PATH` 与 Homebrew 位置。 |
| `serenaHome` | `<storageDir>/home` | 作为 `SERENA_HOME` 传给子进程。 |

### 安全

两条路由都在 DSH 连接属主校验之后：只接受属主浏览器 peer，陌生 `Origin` 或 `Sec-Fetch-Site: cross-site` 直接拒绝，请求体必须是 JSON 且不超过 64 KiB，响应是 JSON 并带 `nosniff`。变更动作是白名单，命令一律用 argv 数组启动——不走 shell、不做字符串拼接。路径解析成绝对真实路径，且必须是已存在的目录。插件不存储、不记录任何凭据或 token，也看不到你的 API key。

## 测试

```bash
npm test          # 宿主冒烟（模拟 cordis 上下文）+ 面板契约
npm run test:vm   # 12 个模拟后端场景，需要 node --experimental-vm-modules
```

VM 套件把 `child_process`、文件系统、时钟都 mock 掉，所以能在不安装任何东西、不启动 Serena 的前提下跑安装/卸载状态机、HTTP 守卫和进度上报。

UI fixture 需要浏览器和 DSH 主题包，输入走环境变量：

```bash
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
DSH_THEME_CLIENT=/path/to/@deepseek-ai/dsh-client-ui-theme/lib/client.js \
REACT_UMD_DIR=/path/to/node_modules \
CHROME_PATH='/Applications/.../Microsoft Edge' \
npm run test:ui
```

不给这些变量时 fixture 打印 `SKIP` 并退出 0；给了就渲染浅色/深色、检查原生选择器契约、把视口压到 320 px，并重新生成 `artifacts/`。

## 已知限制

- 每个项目同时只支持一个活动实例；开多个会让工具 schema 在上下文里翻倍。
- 原生文件夹选择器只在面板里；agent 工具直接收路径。
- `state.json` 是单机状态、不同步。停止项目会持久化 `enabled: false`，下次启动不会自启。
- 仅支持 macOS 与 Linux；Windows 的路径和进程语义未验证。
- MCP 握手失败时可能仍显示 `running: true` 但工具为 0，因为创建 mcp-client fiber 时没有设 `failOnStartupError`。

## 许可证

MIT，见 [LICENSE](./LICENSE)。
