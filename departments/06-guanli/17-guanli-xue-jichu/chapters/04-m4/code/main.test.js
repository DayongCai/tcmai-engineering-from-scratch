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
  annualFixedWan,
  breakEvenVolume,
  dailyVolume,
  yearly,
  expectedWan,
} = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC), DOC);
  assert.ok(DOC.endsWith(path.join('chapters', '04-m4', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 4);
  assert.strictEqual(TITLE, '决策不是选最好的，是在信息不够时选一个能交代的');
  assert.match(TEXT, /^# 第 4 章/);
});

test('设备与运营的全部设定都取自正文', () => {
  assert.strictEqual(F.investWan, 1200);
  assert.strictEqual(F.arguedDaily, 22);
  assert.strictEqual(F.actualDaily, 9.4);
  assert.strictEqual(F.depreciateYears, 8);
  assert.strictEqual(F.opexWan, 60);
  assert.strictEqual(F.price, 500);
  assert.strictEqual(F.workdays, 256);
  assert.strictEqual(F.lowPrice, 400);
});

test('年固定成本 210 万元，保本 4,200 人次、日均 16.4', () => {
  const fixed = annualFixedWan(F);
  assert.strictEqual(fixed, 210);
  assert.strictEqual(breakEvenVolume(fixed, F.price), 4200);
  assert.ok(Math.abs(dailyVolume(4200, F.workdays) - 16.4) < 0.05, String(dailyVolume(4200, F.workdays)));
});

test('论证与实际的三个数与正文对得上账', () => {
  const argued = yearly(F, F.arguedDaily, F.price);
  assert.strictEqual(argued.visits, 5632);
  assert.ok(Math.abs(argued.revenueWan - 281.6) < 1e-9, String(argued.revenueWan));
  assert.ok(Math.abs(argued.profitWan - 71.6) < 1e-9, String(argued.profitWan));

  const actual = yearly(F, F.actualDaily, F.price);
  assert.strictEqual(Math.round(actual.visits), 2406);
  assert.ok(Math.abs(actual.revenueWan - 120.3) < 0.05, String(actual.revenueWan));
  assert.ok(Math.abs(actual.profitWan + 89.7) < 0.05, String(actual.profitWan));
});

test('保本点高于实测日均，落差就是亏损的来源', () => {
  const beDaily = dailyVolume(breakEvenVolume(annualFixedWan(F), F.price), F.workdays);
  assert.ok(beDaily > F.actualDaily, `${beDaily} 应高于 ${F.actualDaily}`);
  assert.ok(yearly(F, F.actualDaily, F.price).profitWan < 0);
  assert.ok(yearly(F, F.arguedDaily, F.price).profitWan > 0);
});

test('期望值 106 万元，概率之和必须为 1', () => {
  assert.strictEqual(expectedWan(F), 106);
  assert.throws(() => expectedWan({ ...F, pPessimistic: 0.3 }), /概率之和应为 1/);
});

test('收费降到 400 元后保本量升到 5,250、日均 20.5', () => {
  const lowBe = breakEvenVolume(annualFixedWan(F), F.lowPrice);
  assert.strictEqual(lowBe, 5250);
  assert.ok(Math.abs(dailyVolume(lowBe, F.workdays) - 20.5) < 0.05, String(dailyVolume(lowBe, F.workdays)));
  assert.ok(dailyVolume(lowBe, F.workdays) < F.arguedDaily + 0.5);
});

test('收费为零时报错，不返回 Infinity', () => {
  assert.throws(() => breakEvenVolume(210, 0), /收费必须为正/);
});

test('脚本可运行，输出三个工具与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /盈亏平衡/);
  assert.match(out, /期望值/);
  assert.match(out, /敏感度/);
  assert.match(out, /现算/);
  assert.match(out, /不构成投资建议、采购建议或管理咨询意见/);
});
