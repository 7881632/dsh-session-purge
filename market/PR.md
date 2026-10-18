# PR 文案（复制到 GitHub）

> 发 PR 前确认两件事，否则正文不成立：
> 1. 仓库已加 `dsh-plugin` topic（正文第 4 条依赖它）。
> 2. GitHub About 已改成 `package.json` 里那句回收站文案。
>
> 正文刻意**不含**：CI 运行情况（仓库 Actions 目前 0 次运行，等真跑起来再加）、npm 发布信息（规范明确说不用告知，映射自动从 registry 采集）。

## 标题

```
Add verdana/dsh-session-purge (session)
```

## 正文

```md
Adds **dsh-session-purge** — deletion for DSH sessions, with a recycle bin.

Deleting a session moves its directory into `~/.dsh/session-purge/trash/`, with a sidecar recording the original path, deletion time and size, instead of destroying it. The entry can be restored byte-exactly at any time; the space comes back on an explicit permanent delete, on emptying the bin, or on a retention sweep (30 days by default, configurable — `autoClean`, 7/30/90/365 days or forever, sweep interval).

- `package.json` declares `dsh.bundle` → `./cordis.patch.yml` (`id: session-purge`, `name: dsh-session-purge`); `dsh.client` ships the browser UI.
- Zero runtime dependencies, no build step; one codebase for Windows / Linux / macOS.
- Verified live on DSH 0.2.1-rc.2 and 0.2.0-rc.2 — move → restore → permanent delete → sweep, the bin panel and the settings page. 0.1.5-rc.3 has no settings extension point, so the settings page is unavailable there, and the README says so.
- The repo has the `dsh-plugin` topic.

Why this is not just archive: archive hides a session from the default list while its log stays on disk forever. This plugin handles deletion, split into the reversible part and reclaiming the space.

This started as a fork of `Yicijiuhaobala/dsh-session-delete` and has since been rewritten around the recycle-bin model (bin panel, restore, retention sweep, settings). If the upstream is already on the list, I'd argue this is the better-kept of the two — but that call is yours.

Entry file: `data/plugins/verdana__dsh-session-purge.yml` — nothing else is touched.
Suggested category: `session`.
```
