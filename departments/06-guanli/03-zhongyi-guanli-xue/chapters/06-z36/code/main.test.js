'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, CHAPTER, TITLE, read, facts, perPharmacist, inspectionLoad, rejectRate, share } = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC));
  assert.ok(DOC.endsWith(path.join('chapters', '06-z36', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 6);
  assert.ok(TEXT.startsWith('# 第 6 章'));
  assert.strictEqual(TITLE, '中药房是成本中心，也是唯一不能省的那道关');
});

test('剂数、人数与验收参数全部取自正文', () => {
  assert.strictEqual(F.dailyDoses, 600);
  assert.strictEqual(F.staff, 5);
  assert.strictEqual(F.establishment, 8);
  assert.strictEqual(F.typesPerDay, 40);
  assert.strictEqual(F.secondsPerType, 20);
  assert.strictEqual(F.totalIncome, 780);
  assert.strictEqual(F.coreIncome, 96);
});

test('每人每日剂数：在岗 120 剂，按编制 75 剂，缺口 3 人', () => {
  assert.strictEqual(perPharmacist(600, 5), 120);
  assert.strictEqual(perPharmacist(600, 8), 75);
  assert.strictEqual(F.establishment - F.staff, 3);
});

test('验收负荷只占工作日的百分之三左右，「没时间」不成立', () => {
  const load = inspectionLoad(40, 20, 8);
  assert.strictEqual(load.seconds, 800);
  assert.ok(Math.abs(load.minutes - 13.333) < 0.01, String(load.minutes));
  assert.ok(load.share < 0.03 && load.share > 0.02, String(load.share));
});

test('抽检不合格率：40 个品种里 4 个，10%', () => {
  assert.strictEqual(rejectRate(4, 40), 0.1);
  assert.throws(() => rejectRate(1, 0), /抽检数必须为正/);
});

test('治未病收入结构：评估与随访占 12% 左右', () => {
  const s = share(96, 780);
  assert.ok(Math.abs(s * 100 - 12.31) < 0.01, String(s));
  assert.ok(s < 0.2, '核心服务占比不到两成');
});

test('脚本可运行，输出验收负荷与结构，并给出边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /时间不是瓶颈，判据才是/);
  assert.match(out, /评估与随访/);
  assert.match(out, /不构成药事管理、药品质量检验或合同法律意见/);
});
