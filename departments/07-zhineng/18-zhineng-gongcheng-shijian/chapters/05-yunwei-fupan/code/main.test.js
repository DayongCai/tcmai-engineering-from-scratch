'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const MAIN = path.join(__dirname, 'main.js');
const { readDoc, tableRows, parseIncident, parseBands, analyze } = require('./main.js');

const doc = readDoc();

test('37 起事件与五个根因计数', () => {
  const i = parseIncident(doc);
  assert.strictEqual(i.total, 37);
  assert.deepStrictEqual(i.roots, {
    证书过期: 9,
    磁盘写满: 6,
    上游变更: 9,
    配置误改: 7,
    模型输入异常: 4,
  });
  assert.strictEqual(i.topEvents, 24);
  assert.strictEqual(i.alerts, 1400);
  assert.strictEqual(i.alertsUnhandled, 1180);
});

test('前 24 起正好是三种根因之和', () => {
  const a = analyze(doc);
  assert.strictEqual(a.rootSum, 35);
  assert.strictEqual(a.unaccounted, 2);
  assert.strictEqual(a.top3, 24);
  assert.strictEqual(a.top3Matches, true);
  assert.ok(Math.abs(a.top3Share - 24 / 37) < 1e-12);
});

test('MTTR 与定位时间现算', () => {
  const i = parseIncident(doc);
  assert.strictEqual(i.mttrMin, 252);
  assert.strictEqual(i.locateMin, 180);
  const a = analyze(doc);
  assert.ok(Math.abs(a.locateShare - 180 / 252) < 1e-12);
  assert.strictEqual(a.recoverMin, 72);
  assert.ok(a.locateShare > 0.71 && a.locateShare < 0.72);
});

test('改进项完成率与告警噪声占比', () => {
  const a = analyze(doc);
  assert.strictEqual(a.improvements, 43);
  assert.strictEqual(a.improvementsDone, 5);
  assert.ok(Math.abs(a.doneRate - 5 / 43) < 1e-12);
  assert.strictEqual(a.actionable, 220);
  assert.ok(Math.abs(a.noiseShare - 1180 / 1400) < 1e-12);
  assert.strictEqual(a.actionableInBand, true, '220 应落在 150–300 的健康区间');
});

test('三段阈值与表格行数', () => {
  const b = parseBands(doc);
  assert.deepStrictEqual(b.alertBand, [150, 300]);
  assert.deepStrictEqual(b.recurBand, [10, 20]);
  assert.deepStrictEqual(b.certReminders, [30, 7, 1]);
  assert.strictEqual(b.diskDays, 14);
  const a = analyze(doc);
  assert.strictEqual(a.layers.length, 3);
  assert.strictEqual(a.severity.length, 4);
  assert.strictEqual(a.handover.length, 5);
  assert.strictEqual(a.first30.length, 6);
  assert.strictEqual(a.review.length, 8);
  assert.strictEqual(tableRows(doc, '栏').length, 8);
});

test('脚本可运行，输出含现算结论与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /五项合计 35 起，零散 2 起/);
  assert.match(out, /定位 180 分钟/);
  assert.match(out, /完成并验证 5 条/);
  assert.match(out, /剩下 220 条可执行告警/);
  assert.match(out, /落在区间内/);
  assert.match(out, /不对应任何真实机构的运行数据/);
});
