# 收录到 awesome-dsh-plugin：文件与操作流程

面向 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 的投稿材料。规范原文见
[contributing.md](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)。

## 0. 本次准备好的文件

| 文件 | 用途 |
|---|---|
| `market/verdana__dsh-session-purge.yml` | **唯一要加进列表仓库的文件**，目标路径 `data/plugins/verdana__dsh-session-purge.yml` |
| `market/PR.md` | PR 标题与正文，直接粘贴 |
| `market/README.md` | 本文档：核对结果、前置修正、操作步骤、被退回时的处理 |

`market/` 不在 `package.json` 的 `files` 白名单里，所以这些文件不会进 npm 包。

> 本核对以 2026-10-18 发布的 `v0.5.2` 为准，条目描述指向的能力（移入 / 复原 / 永久删除 /
> 保留期清理）此后未变。`v0.5.3`（2026-10-21）发布设置页图标、页脚版本号与 npm 更新提示，
> `v0.5.4`（2026-10-25）发布失败路径修复与「移入回收站」成功提示改 toast；`main` 上另有一处
> 未发布的面板列表滚动修复（issue #1）。第 4 节的代码行号按当前 `main`（2026-10-28）复核。

---

## 1. 规范核对结果（已按当前仓库状态核实）

| 规范要求 | 本仓库现状 | 结论 |
|---|---|---|
| `package.json` 声明 `dsh.bundle` | [package.json:15](../package.json#L15) → `"patch": "./cordis.patch.yml"`；[cordis.patch.yml](../cordis.patch.yml) 插入 `id: session-purge` / `name: dsh-session-purge` | 通过 |
| 真实可用代码（非占位/纯 README） | [lib/index.js](../lib/index.js)（回收站、复原、清空、保留期扫描）+ [client/client.js](../client/client.js)（菜单项、回收站面板、设置页），`tools/*.test.mjs` 测试，[.github/workflows/ci.yml](../.github/workflows/ci.yml) 跑 Windows/macOS/Linux 与 Node 22/24 | 通过 |
| 仓库创建满 1 天 | 创建于 2026-09-21，最后推送 2026-10-24 | 通过 |
| 仓库带 `dsh-plugin` topic | 已加：`["deepseek-harness","dsh","dsh-plugin"]`（fork 不继承上游，需手动加，已补） | 通过 |
| 描述属实、无营销词 | About、`package.json`、npm 0.5.2 三处口径一致，均为回收站模型 | 通过 |
| 一个 PR 只加 1 个文件、≤3 条、不手改两个 README | 本方案只新增 1 个 yml | 通过 |
| npm 包的 `repository` 指回本仓库 | npm 上的 `dsh-session-purge@0.5.2`：`repository = git+https://github.com/verdana/dsh-session-purge.git` | 通过（无需在 yml 里写 `npm:`） |
| `tarball:` 字段 | Release v0.5.2 由 Actions 生成，资产 `dsh-session-purge.tgz`（55,646 B），`latest/download` 有效，条目已填 | 已启用 |
| 截图 | 仓库内无图片、无 `screenshots.json` | 可选，暂不声明 |
| fork 身份 | 本仓库是 `Yicijiuhaobala/dsh-session-delete` 的 fork；规范明确「fork 维护得更好或确实做了新东西时可收录」 | 可投，但**必须在 PR 里主动说明**（`market/PR.md` 已写） |

分类选择：`session`（规范允许的取值之一，贴合「会话生命周期」而非 UI 增强）。

---

## 2. 仓库侧事项：已全部完成（2026-10-18 复核）

| 事项 | 状态 | 复核证据 |
|---|---|---|
| 加 `dsh-plugin` topic | ✅ | API `topics: ["deepseek-harness","dsh","dsh-plugin"]`（fork 不继承上游，需手动加；初次核对时确为空，后已补上） |
| 开启 Issues | ✅ | `has_issues: true`，`bugs.url` 不再 404 |
| 修正描述 | ✅ | About、`package.json:4`、npm `0.5.2` 的 description 三处一致：回收站口径 |
| 启用 Actions | ✅ | 共 4 次运行：`checks` #3（08:46，success）、`release` #1（08:27，success） |
| 发布 + Release | ✅ | npm `dsh-session-purge@0.5.2`（`gitHead 938d339`）；GitHub Release `v0.5.2`，资产 `dsh-session-purge.tgz` |

描述统一后的文案（三处一致）：

```
A recycle bin for DSH session deletion: deleting a session moves it to a bin where it can be restored, and space is reclaimed on permanent delete or on a retention schedule.
```

> 事后注记：本次修改之前，`package.json`、About 与 npm 上的文字还是 v0.2 的「permanently removes session logs」，与 0.5.x 的回收站模型不符——这是专门修掉的问题，也是评审第一条会查的东西。

---

## 3. 提交步骤

没有 `gh` CLI，以下用网页 + git。把 `<你的 GitHub 账号>` 换成实际账号（当前 remote 是 `verdana`）。

```powershell
# 1) 先在网页上 fork：https://github.com/awesome-dsh-plugin/awesome-dsh-plugin → Fork
#    然后 clone 你自己的 fork（不要直接 clone 上游）
git clone git@github.com:verdana/awesome-dsh-plugin.git
cd awesome-dsh-plugin
git remote add upstream https://github.com/awesome-dsh-plugin/awesome-dsh-plugin.git

# 2) 始终从最新 main 切分支（列表每天都有合并）
git fetch upstream
git checkout -b add-verdana-dsh-session-purge upstream/main

# 3) 只放这一个文件，文件名必须完全一致
Copy-Item D:\dsh-session-purge\market\verdana__dsh-session-purge.yml data\plugins\verdana__dsh-session-purge.yml

# 4) 提交（注意：不要动 README.md / README.en.md，它们是生成的）
git add data/plugins/verdana__dsh-session-purge.yml
git commit -m "Add verdana/dsh-session-purge (session)"
git push -u origin add-verdana-dsh-session-purge
```

推送后 GitHub 会给一条 Compare 链接，开 PR：
- **标题**：`Add verdana/dsh-session-purge (session)`
- **正文**：`market/PR.md` 里的代码块内容
- 只应看到 **1 个文件变更**。多于 1 个就说明动到别人条目了，`git reset` 重来。

---

## 4. CI 会检查什么（按序）

1. **条目数** ≤ 3：本次 1 条。
2. **`dsh.bundle`**：从 `https://github.com/verdana/dsh-session-purge` 的 `package.json` 读取——已具备，只声明 `dsh.client` 是常见被拒原因，我们不踩。
3. **仓库年龄 ≥ 1 天**：2026-09-21 创建，通过。
4. **`awesome-lint` + 站点构建**：双语一致性、分隔符、日期、截图。我们的 yml 两个语言都给了，`description.en` 以句号结尾、无 `: `（冒号加空格）歧义。

评审阶段（CI 通过只是前置条件）会读源码核对描述。我们这边每条声明的出处：

| 条目描述里的说法 | 代码位置 |
|---|---|
| 删除时移入回收站（不直接抹除） | [lib/index.js:1933](../lib/index.js#L1933) `POST /session-purge/trash`；菜单项 [client/client.js:34](../client/client.js#L34) `menu.trashSession` |
| 可随时复原 | [lib/index.js:1629](../lib/index.js#L1629) `restoreSession()`，按记录的原始路径回放；入口 [lib/index.js:1980](../lib/index.js#L1980) |
| 可永久删除 | `Delete permanently` / `Empty the recycle bin` → [lib/index.js:1342](../lib/index.js#L1342) `emptyTrash()` |
| 按保留期自动清理 | [lib/index.js:856](../lib/index.js#L856-L857) 默认 `autoClean: true` + `retentionDays: 30`；扫描入口 [lib/index.js:1985](../lib/index.js#L1985) `POST /session-purge/sweep` |
| 设置页 | [client/client.js:78](../client/client.js#L78) 起 `settings.*` 文案；后端 [lib/index.js:1992](../lib/index.js#L1992) |

如果评审问「fork 凭什么收录」，`market/PR.md` 里已准备好答案：上游最后推送是 2026-08-24，本仓库按回收站模型重写（面板、复原、保留期、设置页），并且列表里查不到上游条目。

---

## 5. 合并之后（可选加分项）

- **截图**：在 `package.json` 旁放 `screenshots.json`（1–8 张、相对路径、不能含 `..`、不能以 `/` 开头），市场详情页会按你的顺序展示，之后改图只需推自己的仓库。目前仓库没有图片，需要先截图。
- **tarball**：已上线并复核。`v0.5.2` 推送后 `release` workflow（run #1，success）自动打包并挂出资产 `dsh-session-purge.tgz`（55,646 B，与本地 `npm pack` 的 7 文件包一致），资产名**不带版本号**，所以 `latest/download` 链接换版本也不会 404，条目里已填：
  `tarball: https://github.com/verdana/dsh-session-purge/releases/latest/download/dsh-session-purge.tgz`
  如果哪天不想维护 Release，删掉这一行即可，条目照常成立（零依赖、无构建步骤，源码安装本就不需要 `allowBuilds`）。
- **`peerDependencies`**：`client/client.js` 运行时依赖宿主提供的 `@deepseek-ai/dsh-client-ui-primitives`，规范建议把官方包声明为 `peerDependencies` 而非 `dependencies`。当前 `package.json` 里两者都没有（零依赖是设计的一部分），不加也能收录；如果要加，注意预发布范围的坑——`>=0.0.1-rc.1 <0.2.0` 这类写法会静默排除 `0.1.0-rc.x`，必须写成 `>=0.0.1-rc.1 <0.1.0 || >=0.1.0-rc.1 <0.2.0-0` 的形式。
- 更新自己条目时：只改 `data/plugins/verdana__dsh-session-purge.yml` 再让 CI 重新生成，**永远不要手工编辑两个 README**。

---

## 6. 本地校验条目（可复制运行）

借用 DSH 自带安装里的 YAML 解析器，避免装新依赖：

```powershell
$env:NODE_PATH = "C:\Users\Verdana\scoop\persist\nodejs\bin\node_modules\@deepseek-ai\dsh\node_modules"
node -e 'const fs=require("fs"),Y=require("yaml");const f="market/verdana__dsh-session-purge.yml";const e=Y.parse(fs.readFileSync(f,"utf8"));const cats="agi ui usage theme model identity session memory tools wsl browser vision voice docs skill workflow git notify dev security remote market fun".split(" ");if(e.url!=="https://github.com/verdana/dsh-session-purge")throw new Error("url 与仓库不一致");if(e.name!=="verdana/dsh-session-purge")throw new Error("name 应为 owner/repo");if(!cats.includes(e.category))throw new Error("category 非法");if(!e.description||!e.description.en)throw new Error("description.en 必填");if(!/\.$/.test(e.description.en.trim()))throw new Error("description.en 必须以句号结尾");if(/: /.test(e.description.en.replace(/^[\x27"]|[\x27"]$/g,"")))throw new Error("描述含冒号+空格，需加引号");console.log(JSON.stringify(e,null,2));console.log("entry ok")'
```

---

## 7. 被打回时怎么改

反馈会以 PR 评论给出，指名要改什么——**在同一分支推 fixup 提交即可，不用重开 PR**：

```powershell
# 改完 data/plugins/verdana__dsh-session-purge.yml
git add data/plugins/verdana__dsh-session-purge.yml
git commit -m "Fix entry per review: <改了什么>"
git push
```

最常见的三类退回原因与我们的对应状态：

| 退回原因 | 我们的状态 |
|---|---|
| 只声明了 `dsh.client`，无法 `dsh plugin add` | 不适用：`dsh.bundle` + `cordis.patch.yml` 齐备 |
| 描述夸大（数字、API 名对不上代码） | 描述里没写数字，四个动词都能在源码里找到对应实现（见第 4 节表格） |
| 仓库太新 / 占位 | 2026-09-21 创建，有测试与三平台 CI |

分类若被判「更贴切的是别的」，维护者会直接改，不会打回——不必纠结 `session` 与 `ui` 的边界。
