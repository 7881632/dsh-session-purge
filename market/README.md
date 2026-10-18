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

---

## 1. 规范核对结果（已按当前仓库状态核实）

| 规范要求 | 本仓库现状 | 结论 |
|---|---|---|
| `package.json` 声明 `dsh.bundle` | [package.json:15](package.json#L15) → `"patch": "./cordis.patch.yml"`；[cordis.patch.yml](cordis.patch.yml) 插入 `id: session-purge` / `name: dsh-session-purge` | 通过 |
| 真实可用代码（非占位/纯 README） | [lib/index.js](lib/index.js)（回收站、复原、清空、保留期扫描）+ [client/client.js](client/client.js)（菜单项、回收站面板、设置页），`tools/*.test.mjs` 测试，[.github/workflows/ci.yml](.github/workflows/ci.yml) 跑 Windows/macOS/Linux 与 Node 22/24 | 通过 |
| 仓库创建满 1 天 | 创建于 2026-09-21，最后推送 2026-10-18 | 通过 |
| 仓库带 `dsh-plugin` topic | **当前 `topics: []`**（fork 不继承上游 topic） | **需手动加** |
| 描述属实、无营销词 | `package.json` 已在本次提交里改成回收站口径；**GitHub About 仍是旧文案，需网页手改** | **About 待改** |
| 一个 PR 只加 1 个文件、≤3 条、不手改两个 README | 本方案只新增 1 个 yml | 通过 |
| npm 包的 `repository` 指回本仓库 | npm 上的 `dsh-session-purge@0.5.1`：`repository = git+https://github.com/verdana/dsh-session-purge.git` | 通过（无需在 yml 里写 `npm:`） |
| `tarball:` 字段 | tag `v0.5.1` 已存在，但 **Actions 从未运行过**（`/actions/runs` 为 0），因此没有任何 Release 资产；且当前版本已发布、无构建步骤 | 不填 |
| 截图 | 仓库内无图片、无 `screenshots.json` | 可选，暂不声明 |
| fork 身份 | 本仓库是 `Yicijiuhaobala/dsh-session-delete` 的 fork；规范明确「fork 维护得更好或确实做了新东西时可收录」 | 可投，但**必须在 PR 里主动说明**（`market/PR.md` 已写） |

分类选择：`session`（规范允许的取值之一，贴合「会话生命周期」而非 UI 增强）。

---

## 2. 仓库侧事项（描述已修，剩下 2 处待手动）

### 2.1 加 topic（硬性要求，缺了会被打回）

仓库首页右侧 **About** → 齿轮图标 → **Topics** 填 `dsh-plugin`（可顺带加 `deepseek-harness`、`dsh`）→ 保存。
`market/PR.md` 里写了「仓库带 `dsh-plugin` topic」，所以**先加 topic 再发 PR**，否则那句话就不属实。
（fork 上的 Topics 入口偶尔不可用；真加不上时再考虑请 GitHub Support 把仓库脱离 fork 网络，一般不必。）

### 2.2 打开 Issues

当前 `has_issues: false`，而 `package.json` 的 `bugs.url` 指向 `…/issues`——点过去是 404，评审顺手点开就是个减分项。
**Settings → General → Features → 勾上 Issues。**

### 2.3 修正描述（评审第一条就是「描述与代码是否一致」）

现状：About 与 `package.json` 原本还是 v0.2 文案（直接永久删除），而 0.5.x 已经是移入回收站。

- ✅ **`package.json` 第 4 行已改**（本次提交）：

  ```
  A recycle bin for DSH session deletion: deleting a session moves it to a bin where it can be restored, and space is reclaimed on permanent delete or on a retention schedule.
  ```

- ⬜ **GitHub About 需要你在网页上改成同一句**（立刻生效，与收录判断最相关）。
- ℹ️ npm 上的文字要等下次发布才同步：`npm run release -- --bump patch` 会自动升到 **0.5.2**（所以这里刻意没有手动改 `version`，避免跳到 0.5.3）。不发版也不影响收录——列表条目描述是独立的。

> 仓库侧我只改了 `package.json` 的描述；版本号、LICENSE、发布脚本都没动。

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
| 删除时移入回收站（不直接抹除） | [lib/index.js:1838](lib/index.js#L1838) `POST /session-purge/trash`；菜单项 [client/client.js:34](client/client.js#L34) `menu.trashSession` |
| 可随时复原 | [lib/index.js:1539](lib/index.js#L1539) `restoreSession()`，按记录的原始路径回放；入口 [lib/index.js:1888](lib/index.js#L1888) |
| 可永久删除 | `Delete permanently` / `Empty the recycle bin` → [lib/index.js:1267](lib/index.js#L1267) `emptyTrash()` |
| 按保留期自动清理 | [lib/index.js:794](lib/index.js#L794-L795) 默认 `autoClean: true` + `retentionDays: 30`；扫描入口 [lib/index.js:1893](lib/index.js#L1893) `POST /session-purge/sweep` |
| 设置页 | [client/client.js:77](client/client.js#L77) 起 `settings.*` 文案；后端 [lib/index.js:1900](lib/index.js#L1900) |

如果评审问「fork 凭什么收录」，`market/PR.md` 里已准备好答案：上游最后推送是 2026-08-24，本仓库按回收站模型重写（面板、复原、保留期、设置页），并且列表里查不到上游条目。

---

## 5. 合并之后（可选加分项）

- **截图**：在 `package.json` 旁放 `screenshots.json`（1–8 张、相对路径、不能含 `..`、不能以 `/` 开头），市场详情页会按你的顺序展示，之后改图只需推自己的仓库。目前仓库没有图片，需要先截图。
- **tarball**：**暂时不填，原因是查过的事实**——tag `v0.5.1` 已存在，但这个仓库的 GitHub Actions **一次都没运行过**（`/actions/runs` 返回 0 条），所以没有任何 Release，`releases/latest/download/...` 现在必然 404。另外本插件零依赖、无构建步骤，源码安装本来就不需要 `allowBuilds` 授权，`tarball:` 的收益接近零。
  真想要的话按这个顺序：Settings → Actions 确认已启用 → 发版 `npm run release -- --bump patch --publish`（脚本会**本地**打 tag 并提示推送命令，它自己不 push）→ `git push && git push origin v0.5.2` → workflow 生成资产（[release.yml](.github/workflows/release.yml) 已把文件名固定成不带版本号的 `dsh-session-purge.tgz`）→ 再把
  `tarball: https://github.com/verdana/dsh-session-purge/releases/latest/download/dsh-session-purge.tgz` 加进条目。资产名不带版本号，换了 release 也不会 404。
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
