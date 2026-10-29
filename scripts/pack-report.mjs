/**
 * `npm pack --json` 输出的解析。
 *
 * 单独成一个模块只有一个理由：这是发布闸门里唯一「形状会随 npm 版本变」的输入。
 * npm 10 及更早吐以包名为键的对象（`{ "<name>": { files: [...] } }`），npm 11 起
 * 吐数组（`[{ name, files: [...] }]`）。脚本从前只从第一个 `{` 往后切，遇到数组
 * 形状会留下尾部的 `]`，于是在「tarball 核查」这一步抛 SyntaxError —— 报错信息
 * 完全看不出跟 npm 版本有关，而这一步恰好是发版当天才跑的。
 */

/**
 * 从 `npm pack --json` 的 stdout 里取出这个包的报告。
 *
 * @param stdout - 完整 stdout。npm 可能在前置输出里混入无关行，所以不整体 parse。
 * @param packageName - 期望出现在报告里的包名。
 * @returns 该包的 pack 报告（至少含 `files` 数组）。
 * @throws 输出不可解析、或报告里没有这个包 / 没有 `files` 时，抛出可读的错误。
 */
export function parsePackReport(stdout, packageName) {
    const starts = [stdout.indexOf('{'), stdout.indexOf('[')].filter((index) => index !== -1);
    if (starts.length === 0) throw new Error(`npm pack --json 没吐出 JSON：${stdout.slice(0, 400)}`);

    let payload;
    try {
        payload = JSON.parse(stdout.slice(Math.min(...starts)));
    } catch (error) {
        throw new Error(`npm pack --json 的 JSON 解析失败（${error.message}）：${stdout.slice(0, 400)}`);
    }

    const reports = Array.isArray(payload) ? payload : [payload?.[packageName]];
    const report = reports.find((entry) => entry?.name === packageName) ?? reports[0];
    if (report === undefined || report === null || !Array.isArray(report.files)) {
        throw new Error(`npm pack --json 的报告里没有 ${packageName}（或没有 files）：${stdout.slice(0, 400)}`);
    }
    return report;
}
