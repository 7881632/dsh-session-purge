# dsh-session-purge — 开发文档

面向维护者。终端用户请读 [README.md](./README.md)。

## 代码结构

- `lib/index.js` — Host 半：`/session-purge/{trash,restore,purge,empty,sweep,settings,state,delete,undo}`
  路由、回收站内核与永久删除逻辑
- `client/client.js` — 浏览器半：会话行菜单注入 + 侧边栏回收站入口 + 回收站面板 +
  设置面板里的「回收站」页 + 确认弹窗（React，无 JSX；UI 原语可选、缺失时自绘）
- `cordis.patch.yml` — bundle 补丁，把插件行插入 profile 合成树
- `scripts/publish-npm.mjs` — npm 发布流水线（默认只核查）
- `tools/` — 回归测试（`helpers.test.mjs` 上游适配、`trash.test.mjs` 宿主、`client-bin.test.mjs` 客户端）、
  端到端脚本（`repro-delete.mjs` 永久删除、`repro-trash.mjs` 回收站全流程）、冒烟脚本、
  浏览器探针（弹窗 / 面板 / 设置页 / 隔离实例端到端）
- `docs/recycle-bin/` — 回收站的产品规格（spec.md）与技术设计（design.md）

## 本地开发

用 `link:` 指向本仓库，改完不用重装：

```sh
dsh plugin --profile web add link:<本仓库绝对路径>
```

浏览器半原样加载，改完**刷新页面**；Host 半只在启动时装载，改完必须**重启
`dsh web`**。

## 测试

```sh
npm test                              # 回归测试（helpers + trash + client-bin 三个套件）
node tools/repro-delete.mjs           # 端到端：永久删除（真实 JSONL 后端 + 真实日志副本）
node tools/repro-trash.mjs            # 端到端：移入 → 复原（逐字节）→ 真实删除 → 过期清理
node tools/smoke-install.mjs ./x.tgz  # 隔离 home 里装包冒烟
node tools/dialog-render-probe.mjs    # 真实 React + 真实主题渲染弹窗，核对配色
node tools/trash-panel-probe.mjs      # 真实 React + 真实主题渲染回收站面板的 6 种状态
node tools/settings-render-probe.mjs  # 真实 React + 真实主题渲染设置页并逐个驱动控件
```

隔离实例的浏览器端到端（不动你自己的 3080）：

```sh
pwsh -NoProfile -File tools/probe-setup.ps1
$env:DSH_HOME = '<repo>\.probe-home'; dsh --profile web --no-open --port 3081 --host 127.0.0.1
node tools/bin-live-probe.mjs "http://127.0.0.1:3081/?token=<启动时打印的 token>"
```

都不碰你的 `~/.dsh`（用临时 `DSH_HOME`）。渲染探针需要 DSH 源码树（取 React 与
主题 CSS），不需要起服务；源码树不在默认位置时用 `DSH_REPO` 指定。

三条容易踩的规矩：

- **改菜单识别逻辑，必须同步更新 `tools/helpers.test.mjs` 里的标签 fixture**。
  那些标签是从真实渲染抓下来的，fixture 不跟着改，测试会在上游真变了的时候给假绿。
- **改弹窗/面板/设置页配色或变体类名，跑 `dialog-render-probe.mjs`、`trash-panel-probe.mjs`
  与 `settings-render-probe.mjs`**。静态断言看不出 `var()` 究竟解析成什么颜色。
- **改侧边栏注入或设置页，跑一次 `bin-live-probe.mjs`**：锚点识别、60px 上限覆写、
  「复原后不刷新页面行就回来」、以及设置页四项真的落库，只有真 shell 能证明
  （design.md §8.5 记了探针的四个坑）。

## 回收站模型（0.5.0 起）

删除会话不再是 `rm`，而是把会话目录**原样移动**到回收站区：

```text
<DSH_HOME>/session-purge/
  pending.json              重启后待处理队列（语义：重启后移入回收站）
  settings.json             插件自有设置（autoClean / retentionDays / sweepOnBoot / sweepIntervalHours）
  trash/
    .state.json             清理记账（lastSweepAt / lastSweepRemoved）
    t-<UTC 时间戳>-<6 hex>/ 条目载荷：原会话目录，原样 rename 进来
    t-<UTC 时间戳>-<6 hex>.json  条目元数据
```

五条不变量（`tools/trash.test.mjs` 与 `tools/repro-trash.mjs` 钉住了它们）：

1. **复原必须落回原路径**。持久层用 header 自己推导路径并校验（`assertStoredIdentity`），
   放错位置会让**整个** `list()` 抛错，所以元数据记录 `originalDir`（trash 时从
   `locate()` 证明过的真实路径取得），复原时不重新推导那个有损的 projectKey。
2. **回收站不能放在 `sessions/` 内部**：持久层把 `sessions/` 下每个目录当项目、
   再下一层当会话扫描，放进去会被列成正常会话。
3. **写元数据在前、移动在后**（`status: 'moving'` → rename → `'trashed'`），启动时
   `recoverTrash()` 收尾；孤儿载荷（有目录无元数据）**留在原地并记 warn**，不猜 id/cwd。
4. **驻留会话先拆再移**：内核写锁跟着目录走（POSIX inode / Windows 路径派生信号量），
   `live`/`busy` 拒绝，内部面缺失则进重启队列。
5. **危险动作只发生在回收站区内**：真实删除前对载荷做 realpath 包含校验；复原目标
   已存在时返回 `conflict`（上游对重复 id 是整表报错，不会改名让路）。

设置**不**走上游 `configForms`：那条路要求宿主导出 schemastery `Config`，而本插件是零依赖
发行，实测无法解析 `@deepseek-ai/*`。设置存在插件自己的 `settings.json`，宿主每次读文件，
所以改完立即生效。清理调度是一个 15 分钟心跳 + “到期判断”，改动间隔或开关无需重挂定时器。

## 发布

```sh
npm run release:check                     # 六道闸门 + tarball 清单，不发布
npm run release -- --bump patch --smoke   # 真发布并冒烟
```

**版本号归发布脚本管**（`--bump` 会跑 `npm version`、提交、打 tag）。特性提交里
不要手工改 `package.json` 的 version。参数说明：`node scripts/publish-npm.mjs --help`。

## 跨版本兼容

浏览器半靠 DOM 嗅探会话行菜单（上游没有可用扩展点），菜单形状是主要需要随版本走
的部分：

| | 0.1.5-rc.3 | 0.1.7-rc.2 | 0.2.1-rc.2 |
|---|---|---|---|
| 菜单项 | 重命名 / 分叉会话 / 归档会话 | 置顶会话 + 上面三项，后面可能还有插件行 | 在 0.1.7 基础上，归档后多了「复制 Session ID / Copy Session ID」 |
| 按钮文本 | 纯标签 | 标签 + 快捷键键帽（`aria-hidden` 的 `<span>`） | 同 0.1.7；「复制 Session ID」没有绑定，因而没有键帽 |
| 行组件 props | `onFork` / `onArchive` | 已移除（动作走 slot）；`onOpen` / `onRenameRequest` 仍在 | 同 0.1.7 |
| 设置入口 | 侧栏「设置」按钮 | 侧栏「设置」按钮 | **账号菜单（账号菜单 → 设置）**：`settings.launcher` 被账号菜单占用，不再有独立的「设置」按钮 |

插件按「内置三项作为有序子序列」识别菜单（不要求恰好三项），按 `aria-hidden` 过滤
键帽，把「删除会话」插在「归档会话」之后。多出来的置顶行、插件行和 0.2.1 的
「复制 Session ID」都不影响它。上游再改菜单形状时，`tools/helpers.test.mjs` 是最先
该失败的地方；改菜单识别逻辑时**必须同步更新那里的 fixture**。

设置入口同理：`openSettingsFromBin()` 先找 ≤0.2.0 的「设置」按钮，找不到再走
0.2.1 的账号菜单两步路径（点开账号菜单，再点其中的「设置」菜单项）；两条都不存在时
只显示提示文案，不会产生死点击。改这段逻辑时同步改 `tools/client-bin.test.mjs` 的
两个 pure picker 用例。

### 依赖的上游内部面（无 API 保证）

下面这些**实测可用但上游不算兼容契约**——出问题先查这里。`tools/helpers.test.mjs`
钉住了调用形状：

| 依赖 | 上游现状 | 失效表现 |
|---|---|---|
| `sessionPersistence.locate()` | `JsonlSessionPersistence` 上的 TS `private`（运行时可达） | `unsupported`，拒绝删除 |
| `agents.store` / `detachEntered`、`sessions.store` / `detachEntered` | TS `private` | 降级 `held` → 排进重启后删除队列 |
| `agent.phase.kind` | TS `private`，**不在公开 `Agent` 接口上** | 无法区分 idle / maintenance |
| `agent.scope.dispose()` | 类字段 public，不在 `Agent` 接口上 | 走不到安全释放 → 降级队列 |
| `ctx.get('dshHomePath')` | 值是**函数**；0.5.1 起取出后调用（见下） | 旧版探测不命中，家目录回退 `$DSH_HOME` → `~/.dsh` |

刻意保留的取舍：

- **`dshHomePath` 探测（0.5.1 已修）**：上游提供的是函数 `dshHomePath(...segments)`，
  不是字符串。`resolveHome()` 现在经 `ctx.get('dshHomePath')` 取出并调用，因此
  「显式配置路径把 home 挪走」时也能把回收站与重启后队列写到同一个 home。为兼容旧
  上下文/测试桩（把 home 作为字符串属性暴露），字符串属性读取仍在，但包在 try/catch
  里——真实 Cordis 在 fiber 未声明 inject 时该属性读取会抛。
- **`detachEntered` 绕过 `enter()` 的 announce 延迟**：直接调私有 `detachEntered` 会
  跳过「创建派发未结束时延后移除」的保护，agent 侧在 `!entry.announced` 时也不发
  `agent/disposed`。所以这条路**只对严格 idle 的会话**开放（`agent.status` +
  `phase.kind` 双重闸门就是为此）。

### `/session-purge/state` 的语义

- `sessions[].title` 与删除响应的 `name` **恒为 null**：`SessionHeader` 没有 `title`
  字段，标题是 `dsh-session-title` 写的**事件**，不在持久层元数据里。界面上的标题是
  插件从 DOM 行上抓的；直接 curl 这个接口时不要指望有标题。
- `sessions[].archived` 读**注册表级** `workspaceRegistry.archivedSessionIds`。曾误读
  成每个 `Workspace` 条目上的同名成员——那个成员不存在，于是该标志恒为 `false`。
