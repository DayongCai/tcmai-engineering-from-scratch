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
  netGrowth,
  resetCostWan,
  annualResetWan,
  equivalents,
} = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC), DOC);
  assert.ok(DOC.endsWith(path.join('chapters', '09-m9', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 9);
  assert.strictEqual(TITLE, '人力不是成本项，是唯一会自己决定出多少力的资源');
  assert.match(TEXT, /^# 第 9 章/);
});

test('入职、离职、培训与离职原因都取自正文', () => {
  assert.strictEqual(F.hires, 120);
  assert.strictEqual(F.exits, 67);
  assert.strictEqual(F.newHireLeavePct, 31);
  assert.strictEqual(F.growthReasonPct, 38);
  assert.strictEqual(F.scheduleReasonPct, 27);
  assert.strictEqual(F.sessions, 14);
  assert.strictEqual(F.hoursPerPerson, 12);
  assert.strictEqual(F.satisfaction, 94);
});

test('净增 53 人，但队伍扩大不等于能力积累', () => {
  assert.strictEqual(netGrowth(F.hires, F.exits), 53);
  assert.ok(netGrowth(F.hires, F.exits) > 0);
  assert.ok(F.newHireLeavePct > 30);
});

test('单个重置成本 3 万元，年度总额 201 万元', () => {
  const unit = resetCostWan(F.salaryWan, 3);
  assert.strictEqual(unit, F.resetWan);
  assert.strictEqual(unit, 3);
  assert.strictEqual(annualResetWan(F.exits, unit), F.totalWan);
  assert.strictEqual(annualResetWan(67, 3), 201);
});

test('折合 16.75 个护士年薪酬，与正文一致', () => {
  const eq = equivalents(F.totalWan, F.salaryWan);
  assert.ok(Math.abs(eq - F.equivalents) < 1e-9, `${eq} vs ${F.equivalents}`);
  assert.ok(Math.abs(eq - 16.75) < 1e-9, String(eq));
});

test('离职率压下一半，省下的钱可复算', () => {
  const total = annualResetWan(F.exits, resetCostWan(F.salaryWan, 3));
  assert.strictEqual(total / 2, 100.5);
  assert.ok(total / 2 > 3 * F.salaryWan, '省下的钱应够做一次有意义的投入');
});

test('非法参数报错，不返回 NaN', () => {
  assert.throws(() => resetCostWan(0, 3), /薪酬与月数必须为正/);
  assert.throws(() => resetCostWan(12, 0), /薪酬与月数必须为正/);
  assert.throws(() => annualResetWan(-1, 3), /离职人数不能为负/);
  assert.throws(() => equivalents(201, 0), /薪酬必须为正/);
});

test('脚本可运行，输出重置成本与成本置换结论', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /重置成本/);
  assert.match(out, /成本置换/);
  assert.match(out, /现算/);
  assert.match(out, /不构成人事处理依据、薪酬设计方案或管理咨询意见/);
});
