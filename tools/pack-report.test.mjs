/**
 * `npm pack --json` 形状的回归测试。
 *
 * 这条闸门（`publish-npm.mjs` 第 4 步 tarball 核查）只在发版当天跑，它的输入形状
 * 又跟着 npm 大版本变过：npm 10 及更早是以包名为键的对象，npm 11 起是数组。曾经
 * 只切第一个 `{` 的写法在数组形状下抛 SyntaxError，整条流水线在发版当天崩在
 * 4/6 —— 报错还读不出原因。四种形状都钉在这里，改解析逻辑时先跑它。
 *
 * Run: node --test tools/*.test.mjs   （或：npm test）
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parsePackReport } from '../scripts/pack-report.mjs';

const NAME = 'dsh-session-purge';
const ENTRY = {
    id: `${NAME}@0.5.5`,
    name: NAME,
    version: '0.5.5',
    files: [{ path: 'README.md', size: 10 }, { path: 'lib/index.js', size: 20_000 }],
};

test('npm 11+ shape: a top-level array is understood', () => {
    const report = parsePackReport(JSON.stringify([ENTRY], null, 2), NAME);
    assert.equal(report.version, '0.5.5');
    assert.deepEqual(report.files.map((file) => file.path), ['README.md', 'lib/index.js']);
});

test('npm 10 shape: an object keyed by package name is understood', () => {
    const report = parsePackReport(JSON.stringify({ [NAME]: ENTRY }, null, 2), NAME);
    assert.equal(report.version, '0.5.5');
    assert.equal(report.files.length, 2);
});

test('the entry is chosen by name when the array carries more than one', () => {
    const other = { id: 'other@1.0.0', name: 'other', version: '1.0.0', files: [{ path: 'x', size: 1 }] };
    const report = parsePackReport(JSON.stringify([other, ENTRY]), NAME);
    assert.equal(report.name, NAME, 'must not silently report on the sibling package');
});

test('leading npm chatter before the JSON does not break the parse', () => {
    const stdout = `npm warn using --force\nnpm notice something\n${JSON.stringify([ENTRY], null, 2)}\n`;
    assert.equal(parsePackReport(stdout, NAME).version, '0.5.5');
});

test('a report without a file list is rejected instead of half-read', () => {
    assert.throws(
        () => parsePackReport(JSON.stringify([{ name: NAME, version: '0.5.5' }]), NAME),
        /没有 files/);
});

test('output that is not JSON at all is rejected with a readable message', () => {
    assert.throws(() => parsePackReport('npm ERR! something went sideways', NAME), /没吐出 JSON/);
});
