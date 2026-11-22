'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  DOC,
  CHAPTER,
  TITLE,
  read,
  facts,
  casesAvoided,
  minutesSaved,
  shiftsSaved,
} = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC), DOC);
  assert.ok(DOC.endsWith(path.join('chapters', '03-m3', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 3);
  assert.strictEqual(TITLE, '原理用来排除错误做法，方法才用来动手');
  assert.match(TEXT, /^# 第 3 章/);
});

test('机构画像与改进参数都取自正文', () => {
  assert.strictEqual(F.policies, 68);
  assert.strictEqual(F.flows, 214);
  assert.strictEqual(F.committees, 9);
  assert.strictEqual(F.monthlyDischarges, 260);
  assert.strictEqual(F.recheckBeforePct, 12);
  assert.strictEqual(F.recheckAfterPct, 4);
  assert.strictEqual(F.nurseMinutes, 18);
});

test('每月减少重采例数算得 20.8，与正文一致', () => {
  const cases = casesAvoided(F.monthlyDischarges, F.recheckBeforePct, F.recheckAfterPct);
  assert.ok(Math.abs(cases - 20.8) < 1e-9, String(cases));
  assert.strictEqual(cases, 260 * 0.08);
});

test('节约工时 374.4 分钟，折合 6.24 小时', () => {
  const minutes = minutesSaved(20.8, F.nurseMinutes);
  assert.ok(Math.abs(minutes - 374.4) < 1e-9, String(minutes));
  assert.ok(Math.abs(minutes / 60 - 6.24) < 1e-9, String(minutes / 60));
});

test('折合护士工作日与正文的 0.78 / 9.4 对得上账', () => {
  const shifts = shiftsSaved(374.4);
  assert.ok(Math.abs(shifts - F.shiftsPerMonth) < 0.01, `${shifts} vs ${F.shiftsPerMonth}`);
  assert.ok(Math.abs(shifts * 12 - F.shiftsPerYear) < 0.1, `${shifts * 12} vs ${F.shiftsPerYear}`);
});

test('非法输入报错，不返回负值或 NaN', () => {
  assert.throws(() => casesAvoided(0, 12, 4), /出院例数必须为正/);
  assert.throws(() => casesAvoided(260, 4, 12), /重采率不合法/);
  assert.throws(() => casesAvoided(260, 12, -1), /重采率不合法/);
});

test('脚本可运行，输出改进口径与三个问题', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /可复算的改进/);
  assert.match(out, /护士工作日/);
  assert.match(out, /成本落在谁身上/);
  assert.match(out, /现算/);
  assert.match(out, /不构成管理咨询意见、质量控制方案或绩效设计依据/);
});
