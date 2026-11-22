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
  bedDays,
  releasedBedDays,
  addedCapacity,
  capacityLift,
  segmentsSum,
} = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC), DOC);
  assert.ok(DOC.endsWith(path.join('chapters', '05-m5', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 5);
  assert.strictEqual(TITLE, '计划不是把目标写下来，是把目标拆到有人签字');
  assert.match(TEXT, /^# 第 5 章/);
});

test('出院例数与住院日前后值都取自正文', () => {
  assert.strictEqual(F.tasks, 87);
  assert.strictEqual(F.doneTasks, 84);
  assert.strictEqual(F.discharges, 24000);
  assert.strictEqual(F.losBefore, 8.6);
  assert.strictEqual(F.losAfter, 7.4);
});

test('占用床日与正文的 206,400 / 177,600 一致', () => {
  assert.ok(Math.abs(bedDays(F.discharges, F.losBefore) - 206400) < 1e-9);
  assert.ok(Math.abs(bedDays(F.discharges, F.losAfter) - 177600) < 1e-9);
});

test('全年释放 28,800 床日，折算 3,892 例、约 16.2%', () => {
  const released = releasedBedDays(F.discharges, F.losBefore, F.losAfter);
  assert.ok(Math.abs(released - 28800) < 1e-9, String(released));
  const added = addedCapacity(released, F.losAfter);
  assert.strictEqual(Math.round(added), 3892);
  assert.ok(Math.abs(capacityLift(added, F.discharges) - 16.2) < 0.05, String(capacityLift(added, F.discharges)));
});

test('四段压缩量之和正好等于 1.20 天', () => {
  const sum = segmentsSum(F);
  assert.ok(Math.abs(sum - 1.2) < 1e-9, String(sum));
  assert.ok(Math.abs(sum - (F.losBefore - F.losAfter)) < 1e-9, '四段之和不等于目标降幅');
  assert.strictEqual(F.segPreOp, 0.5);
  assert.strictEqual(F.segPostOp, 0.3);
  assert.strictEqual(F.segQueue, 0.25);
  assert.strictEqual(F.segSettle, 0.15);
});

test('目标不低于现状时报错，不返回负数', () => {
  assert.throws(() => releasedBedDays(24000, 7.4, 8.6), /目标住院日应低于现状/);
  assert.throws(() => addedCapacity(28800, 0), /目标住院日必须为正/);
  assert.throws(() => bedDays(0, 8.6), /例数与住院日必须为正/);
});

test('脚本可运行，输出分解与对账结论', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /释放/);
  assert.match(out, /拆成四段/);
  assert.match(out, /对得上账/);
  assert.match(out, /现算/);
  assert.match(out, /不构成管理咨询意见或绩效考核方案/);
});
