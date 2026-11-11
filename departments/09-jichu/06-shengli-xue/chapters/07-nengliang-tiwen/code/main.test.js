#!/usr/bin/env node
/**
 * 第 7 章 能量代谢与体温 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在「可对账的结构」上：单元数与节数、字数、数值核验合计、视角/层级合计、类别推理的边界。
 * 不锁死正文措辞，以免教材改写时测试变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  load, chapterUnits, chapterMeta, sectionsOf, aggregate,
  dominantView, dominantLevel, netHeatDirection,
  lossModesByEnv, heatSourceByState, unitKind, VIEWS, LEVELS,
} = require('./main');

const db = load();
const units = chapterUnits(db);
const meta = chapterMeta(db);

test('本章 12 个知识单元落在 4 个节里，章号与章名对得上', () => {
  assert.strictEqual(units.length, 12);
  assert.strictEqual(sectionsOf(units).length, 4);
  assert.strictEqual(meta.no, '7');
  assert.match(meta.title, /能量代谢与体温/);
});

test('本章教材字数 = 20292，且与逐单元 hanzi 之和一致', () => {
  assert.strictEqual(meta.hanzi, 20292);
  const sum = units.reduce((n, u) => n + u.hanzi, 0);
  assert.strictEqual(sum, 20292);
});

test('数值零容忍：12 个单元 measure.valueLike 合计为 0', () => {
  for (const u of units) {
    assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值型表述`);
  }
  assert.strictEqual(aggregate(units).valueLike, 0);
});

test('三视角合计 = 214/127/6，四层级合计 = 4/10/24/53（全部由 measure 现算）', () => {
  const agg = aggregate(units);
  assert.deepStrictEqual(agg.views, { 代谢: 214, 机能: 127, 形态: 6 });
  assert.deepStrictEqual(agg.levels, { 细胞: 4, 组织: 10, 器官: 24, 系统: 53 });
  // 合计必须等于逐单元相加，防止区间求和写错
  for (const k of VIEWS) {
    assert.strictEqual(agg.views[k], units.reduce((n, u) => n + u.measure.views[k], 0));
  }
  for (const k of LEVELS) {
    assert.strictEqual(agg.levels[k], units.reduce((n, u) => n + u.measure.levels[k], 0));
  }
});

test('本章是全书写代谢最重的一章：代谢视角高于机能视角', () => {
  const agg = aggregate(units);
  assert.ok(agg.views['代谢'] > agg.views['机能'], '本章代谢应高于机能');
  // 全书口径下机能远高于代谢，本章反着来，这正是差异点
  assert.ok(db.views['机能'] > db.views['代谢']);
});

test('主视角判定：7.1.2 测定属代谢，7.2.3 体温调节属机能；层级不猜', () => {
  const u12 = units.find((u) => u.sub === '7.1.2');
  const u23 = units.find((u) => u.sub === '7.2.3');
  assert.strictEqual(dominantView(u12), '代谢');
  assert.strictEqual(dominantView(u23), '机能');
  assert.strictEqual(dominantLevel(u23), '系统');
  assert.throws(() => chapterUnits(db, '99'), /没有第99章/);
});

test('类别推理的边界：产与散同向升时净方向推不出，不同向才给方向', () => {
  assert.strictEqual(netHeatDirection('平', '平'), '净持平');
  assert.match(netHeatDirection('升', '降'), /净增/);
  assert.match(netHeatDirection('降', '升'), /净减/);
  assert.match(netHeatDirection('升', '升'), /推不出/);
  assert.throws(() => netHeatDirection('大涨', '降'), /方向只取/);
});

test('散热方式的侧重随环境类别改变，产热主力随状态类别改变', () => {
  assert.match(lossModesByEnv('冷')[0], /辐射/);
  assert.match(lossModesByEnv('热')[0], /蒸发/);
  assert.match(heatSourceByState('寒冷').主, /骨骼肌/);
  assert.match(heatSourceByState('安静').主, /内脏/);
  assert.throws(() => lossModesByEnv('温'), /环境类别/);
});

test('机制 6 个单元 / 口径 6 个单元：观察与表述口径占了本章一半', () => {
  const kinds = units.filter((u) => unitKind(u) === '口径');
  assert.strictEqual(kinds.length, 6);
  assert.ok(kinds.every((u) => /^7\.[34]\./.test(u.sub)));
});
