'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, CHAPTER, TITLE, read, facts, sumSegments, shares, roomCapacity } = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC));
  assert.ok(DOC.endsWith(path.join('chapters', '07-z37', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 7);
  assert.ok(TEXT.startsWith('# 第 7 章'));
  assert.strictEqual(TITLE, '门诊流程是按检查设计的，病人却是来复诊调方的');
});

test('在院时长的四个分段全部取自正文，且相加等于 96 分钟', () => {
  assert.strictEqual(F.visit, 9);
  assert.strictEqual(F.waiting, 31);
  assert.strictEqual(F.pharmacyWait, 34);
  assert.strictEqual(F.admin, 22);
  assert.strictEqual(F.totalBefore, 96);
  assert.strictEqual(sumSegments(F), F.totalBefore);
  assert.strictEqual(F.followUpShare, 62);
});

test('候药是最大的一段，占三分之一以上', () => {
  const ranked = shares(F);
  assert.strictEqual(ranked[0].name, '候药');
  assert.ok(ranked[0].share > 1 / 3, String(ranked[0].share));
});

test('候药压到 15 分钟省下 19 分钟，多于三年改造的 18 分钟', () => {
  const saved = F.totalBefore - F.totalAfter;
  assert.strictEqual(saved, 18);
  assert.strictEqual(F.pharmacyWait - 15, 19);
  assert.ok(F.pharmacyWait - 15 > saved);
});

test('诊室产能：理论 24 人次，实际 18 至 20，折扣率 75% 至 83%', () => {
  const low = roomCapacity(4, 10, 18);
  const high = roomCapacity(4, 10, 20);
  assert.strictEqual(low.theoretical, 24);
  assert.ok(Math.abs(low.discount - 0.75) < 1e-9);
  assert.ok(Math.abs(high.discount - 20 / 24) < 1e-9);
});

test('脚本可运行，输出分段占比与瓶颈比较，并给出边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /最大的一段是候药/);
  assert.match(out, /三年流程改造/);
  assert.match(out, /不构成医院运营、价格管理或医保结算意见/);
});
