'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, CHAPTER, TITLE, read, facts, minutesPerPatient, followUpVisits, inflation } = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC));
  assert.ok(DOC.endsWith(path.join('chapters', '01-z31', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 1);
  assert.strictEqual(TITLE, '中医机构的效率，不能按手术台的产出来算');
  assert.ok(TEXT.startsWith('# 第 1 章'));
});

test('三个效率口径的设定值确实来自正文', () => {
  assert.strictEqual(F.halfDayHours, 4);
  assert.strictEqual(F.shortVisitPatients, 30);
  assert.strictEqual(F.longVisitPatients, 60);
  assert.strictEqual(F.packDays, 14);
  assert.strictEqual(F.splitDays, 7);
  assert.match(TEXT, /8 分钟已是下限/);
  assert.match(TEXT, /药房人力减掉三分之一/);
});

test('诊次效率：30 人 8 分钟、60 人 4 分钟，人次翻倍时长减半', () => {
  assert.strictEqual(minutesPerPatient(4, 30), 8);
  assert.strictEqual(minutesPerPatient(4, 60), 4);
  assert.strictEqual(minutesPerPatient(4, 60) * 2, minutesPerPatient(4, 30));
  assert.strictEqual(minutesPerPatient(4, 30) * F.shortVisitPatients, 240);
});

test('低于 8 分钟即触及正文所说的下限，4 分钟是它的一半', () => {
  const floor = minutesPerPatient(F.halfDayHours, F.shortVisitPatients);
  assert.strictEqual(floor, 8);
  const squeezed = minutesPerPatient(F.halfDayHours, F.longVisitPatients);
  assert.ok(squeezed < floor, `${squeezed} 未低于下限 ${floor}`);
});

test('拆方只增加复诊次数，不改变剂数与疗程', () => {
  assert.strictEqual(followUpVisits(14, 14), 1);
  assert.strictEqual(followUpVisits(14, 7), 2);
  assert.strictEqual(inflation(14, 7), 1);
  assert.strictEqual(followUpVisits(14, 7) * F.splitDays, F.packDays);
});

test('脚本可运行，输出三个效率口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /诊次效率/);
  assert.match(out, /疗程效率/);
  assert.match(out, /资源效率/);
  assert.match(out, /现算/);
  assert.match(out, /不构成医疗管理、财务或医保结算意见/);
});
