# PR 文案（复制到 GitHub）

## 标题

```
Add verdana/dsh-session-purge (session)
```

## 正文

```md
Adds **dsh-session-purge** — deletion for DSH sessions, with a recycle bin.

Deleting a session moves its directory into `~/.dsh/session-purge/trash/`, together with a sidecar recording the original path, deletion time and size, instead of destroying it. The entry can be restored byte-exactly at any time. The disk space comes back on an explicit permanent delete, on emptying the bin, or on a retention sweep — 30 days by default, configurable in the plugin's own settings page (`autoClean`, retention 7/30/90/365 days or forever, sweep interval).

- `package.json` declares `dsh.bundle` → `./cordis.patch.yml`, which inserts `id: session-purge` / `name: dsh-session-purge`; `dsh.client` ships the browser UI (session-row menu item, bin panel, settings page).
- Published on npm as `dsh-session-purge` 0.5.1, and the published package's `repository` field points back at `verdana/dsh-session-purge`.
- Zero runtime dependencies, no build step, one codebase for Windows / Linux / macOS. CI runs the suites on ubuntu / macos / windows and on Node 22 and 24.
- Verified live on DSH 0.2.1-rc.2 and 0.2.0-rc.2: the full move → restore → permanent delete → sweep round trip, the bin panel and the settings page. 0.1.5-rc.3 has no settings extension point, so the settings page is unavailable there — the README says so rather than claiming otherwise.
- The repo has the `dsh-plugin` topic.

Why this is not just archive: archive hides a session from the default list while its log stays on disk forever. This plugin is about deletion, and it splits that into the reversible part (move to the bin) and reclaiming the space (permanent delete or the retention sweep).

Relationship to the upstream repo: this repo started as a fork of `Yicijiuhaobala/dsh-session-delete` and has since been rewritten around the recycle-bin model — bin panel, restore, retention sweep, settings page. Upstream's last push was 2026-08-24, and I could not find it on this list; if it is listed, treat this as the better-kept one and drop whichever of the two is stale.

Entry file: `data/plugins/verdana__dsh-session-purge.yml` — this PR touches nothing else.
Suggested category: `session`.

---

新增 `verdana/dsh-session-purge`：把 DSH 的「删除会话」改成回收站——删除时移入 `~/.dsh/session-purge/trash/` 并记录原路径、时间与体积，可字节级复原；空间在手动永久删除、清空回收站或按保留期（默认 30 天）自动清理时释放。`dsh.bundle` 与 `cordis.patch.yml` 齐备，已发布 npm 0.5.1 且 `repository` 指回本仓库，CI 覆盖三平台与 Node 22/24。
```
