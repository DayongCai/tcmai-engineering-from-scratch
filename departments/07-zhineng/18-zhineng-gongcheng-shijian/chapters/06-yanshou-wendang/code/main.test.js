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
  parseLoadTest,
  parseDocCaps,
  parseTerms,
  analyze,
} = require('./main.js');

const doc = readDoc();

test('交付问题段：96 项、40 分钟、六周、214 页、130 页截图、5 项无法验证', () => {
  const i = parseIncident(doc);
  assert.strictEqual(i.items, 96);
  assert.strictEqual(i.minutes, 40);
  assert.strictEqual(i.weeksLater, 6);
  assert.strictEqual(i.sameQuestionTimes, 3);
  assert.strictEqual(i.pages, 214);
  assert.strictEqual(i.screenshotPct, 0.61);
  assert.strictEqual(i.screenshotPages, 130);
  assert.strictEqual(i.unverifiable, 5);
});

test('每项秒数、截图真实占比、无法验证占比现算', () => {
  const a = analyze(doc);
  assert.strictEqual(a.secondsPerItem, (40 * 60) / 96);
  assert.ok(Math.abs(a.shotShare - 130 / 214) < 1e-12);
  assert.ok(a.shotShare > 0.6 && a.shotShare < 0.61);
  assert.ok(Math.abs(a.unverifiableShare - 5 / 96) < 1e-12);
  assert.strictEqual(a.nonShotPages, 84);
});

test('六份文档篇幅上限合计 39 页，实际是 5.5 倍', () => {
  const caps = parseDocCaps(doc);
  assert.strictEqual(caps.length, 6);
  assert.strictEqual(caps.find((c) => c.name === '运行手册').cap, '8');
  assert.strictEqual(caps.find((c) => c.name === '接口文档').cap, undefined, '接口文档应由 schema 生成');
  const a = analyze(doc);
  assert.strictEqual(a.capSum, 39);
  assert.ok(Math.abs(a.capRatio - 214 / 39) < 1e-12);
  assert.ok(a.halfPageShare > 0 && a.halfPageShare < 0.003);
});

test('压测报告的五个参数取自正文', () => {
  const l = parseLoadTest(doc);
  assert.deepStrictEqual(l, {
    concurrency: 50,
    durationMin: 30,
    datasetWan: 10,
    p95ms: 780,
    errorPct: 0.02,
  });
});

test('交接演练与保修条款的数字', () => {
  const t = parseTerms(doc);
  assert.strictEqual(t.transferTimes, 4);
  assert.strictEqual(t.transferHours, 2);
  assert.strictEqual(t.exitDays, 90);
  assert.strictEqual(t.rollbackCapMin, 30);
  assert.strictEqual(t.shadowWeeks, 2);
  const a = analyze(doc);
  assert.strictEqual(a.transferTotalHours, 8);
  assert.strictEqual(a.defectLevels, 4);
});

test('四类证据、用例五字段、保修六条款', () => {
  const a = analyze(doc);
  assert.strictEqual(a.evidence.length, 4);
  assert.strictEqual(a.caseFields.length, 5);
  assert.strictEqual(a.warranty.length, 6);
  assert.deepStrictEqual(a.evidence.map((e) => e[0]), ['功能', '性能', '安全', '运维']);
  assert.strictEqual(tableRows(doc, '类别').length, 4);
});

test('脚本可运行，输出含现算结论与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /96 项 \/ 40 分钟 = 每项 25\.0 秒/);
  assert.match(out, /篇幅上限合计 39 页/);
  assert.match(out, /P95 780ms/);
  assert.match(out, /不构成合同建议或法律意见/);
});
