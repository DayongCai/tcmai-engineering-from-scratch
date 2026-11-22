'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const MAIN = path.join(__dirname, 'main.js');
const {
  readDoc,
  tableRows,
  parseIncident,
  parsePhases,
  parseFailures,
  parseMonitor,
  parseSeverity,
  parseHealthBand,
  analyze,
} = require('./main.js');

const doc = readDoc();

test('灰度头三天：5% 流量、1,240 例、87 次提示、关闭 62%', () => {
  const i = parseIncident(doc);
  assert.strictEqual(i.pilotShare, 5);
  assert.strictEqual(i.cases, 1240);
  assert.strictEqual(i.alerts, 87);
  assert.strictEqual(i.closeRate, 0.62);
  assert.strictEqual(i.silentCases, 11);
  assert.strictEqual(i.silentHours, 4);
  assert.strictEqual(i.dailyVisits, 800);
});

test('触发率、被关闭次数与静默占比现算', () => {
  const a = analyze(doc);
  assert.ok(Math.abs(a.triggerRate - 87 / 1240) < 1e-12);
  assert.strictEqual(a.closedAlerts, Math.round(87 * 0.62));
  assert.ok(Math.abs(a.silentShareOfAlerts - 11 / 87) < 1e-12);
  assert.strictEqual(a.silentEstimate, Math.round((800 * 4) / 24));
});

test('四阶段观察期与样本量，卡进度的是观察期', () => {
  const phases = parsePhases(doc);
  assert.strictEqual(phases.length, 4);
  assert.deepStrictEqual(phases.map((p) => p.days), [3, 5, 7, 14]);
  assert.deepStrictEqual(phases.map((p) => p.samples), [2000, 300, 1200, 3000]);
  const a = analyze(doc);
  assert.strictEqual(a.phaseDays, 29);
  assert.strictEqual(a.phaseSamples, 6500);
  assert.ok(a.shadowDaysNeeded < phases[0].days, '影子阶段样本所需天数应小于最短观察期');
  assert.ok(a.daysForSamples < a.phaseDays);
});

test('五种失败模式与四个监控数', () => {
  assert.strictEqual(parseFailures(doc).length, 5);
  const mon = parseMonitor(doc);
  assert.strictEqual(mon.length, 4);
  assert.ok(mon[0].metric.includes('空返回率'));
  assert.match(mon[0].threshold, /0\.5%|0\.5/);
  assert.match(mon[1].threshold, /1\.5s/);
});

test('健康区间中点闭合到 100', () => {
  const band = parseHealthBand(doc);
  assert.deepStrictEqual(band.adopt, [40, 70]);
  assert.deepStrictEqual(band.override, [20, 40]);
  assert.deepStrictEqual(band.ignore, [10, 20]);
  const a = analyze(doc);
  assert.strictEqual(a.bandMidSum, 100);
});

test('五张清单、四级事件、按时间升级', () => {
  const a = analyze(doc);
  assert.strictEqual(a.checklistCount, 5);
  assert.strictEqual(parseSeverity(doc).length, 4);
  assert.strictEqual(a.upgradeFirst, 15);
  assert.strictEqual(a.upgradeSecond, 30);
  assert.strictEqual(tableRows(doc, '失败模式').length, 5);
});

test('脚本可运行，输出含现算结论与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /1,240 例、提示 87 次/);
  assert.match(out, /观察期合计 29 天/);
  assert.match(out, /三者中点相加 = 100/);
  assert.match(out, /15 分钟未定位升一级/);
  assert.match(out, /不可直接作为验收承诺/);
});
