'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, CHAPTER, TITLE, read, cnInt, facts, approvalRate, conversionRate } = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC), DOC);
  assert.ok(DOC.endsWith(path.join('chapters', '14-m14', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 14);
  assert.strictEqual(TITLE, '创新不是想出新点子，是让新点子活着走出实验室');
  assert.match(TEXT, /^# 第 14 章/);
});

test('汉字整数换算：八十七、六十一、四十三', () => {
  assert.strictEqual(cnInt('八十七'), 87);
  assert.strictEqual(cnInt('六十一'), 61);
  assert.strictEqual(cnInt('四十三'), 43);
});

test('申报、立项、留存、论文数都取自正文', () => {
  assert.strictEqual(F.applied, 87);
  assert.strictEqual(F.approved, 61);
  assert.strictEqual(F.routine, 9);
  assert.strictEqual(F.papers, 43);
  assert.strictEqual(F.approvedPct, 70);
  assert.ok(Math.abs(F.routinePct - 10.3) < 1e-9);
});

test('立项率七成，与正文一致', () => {
  const rate = approvalRate(F.approved, F.applied);
  assert.ok(Math.abs(rate - F.approvedPct) < 0.2, String(rate));
  assert.ok(rate > 69 && rate < 71, String(rate));
});

test('留存率约一成，与正文的 10.3% 对得上', () => {
  const rate = approvalRate(F.routine, F.applied);
  assert.ok(Math.abs(rate - F.routinePct) < 0.1, String(rate));
  assert.ok(rate < 11);
});

test('从批文到常规的转化率约 14.8%，立项不等于落地', () => {
  const conv = conversionRate(F.routine, F.approved);
  assert.ok(Math.abs(conv - 14.75) < 0.1, String(conv));
  assert.ok(conv < 15, '转化率应低于一成五');
  assert.ok(F.routine < F.approved / 5, '进入常规的不足立项数的五分之一');
});

test('非法参数报错，不返回负值', () => {
  assert.throws(() => approvalRate(61, 0), /申报数必须为正/);
  assert.throws(() => approvalRate(88, 87), /不能多于/);
  assert.throws(() => conversionRate(9, 0), /立项数必须为正/);
});

test('脚本可运行，输出两个率与五道关', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /立项率/);
  assert.match(out, /五道关/);
  assert.match(out, /现算/);
  assert.match(out, /不构成技术评估意见、项目审批依据或管理咨询意见/);
});
