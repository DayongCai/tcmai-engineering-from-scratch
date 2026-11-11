#!/usr/bin/env node
/**
 * 第 4 章 局部血液循环障碍 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、词频重心、形态分类是否齐备、
 * 观察与描述六要素覆盖、口径覆盖、数值是否为 0。
 * 不锁死正文措辞，教材改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  SIX,
  CHAIN,
  THROMBUS,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  sixElementUnits,
  boundaryUnits,
  bySection,
  thrombusTypes,
} = require('./main');

const units = load();
const list = chapterUnits(units);

test('本章 12 个知识单元，分属 4 节，正文合计 20556 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 20556);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '4.1.1', '4.1.2', '4.1.3',
    '4.2.1', '4.2.2', '4.2.3',
    '4.3.1', '4.3.2', '4.3.3',
    '4.4.1', '4.4.2', '4.4.3',
  ]);
});

test('三视角合计 652 次，以形态为重心（八成以上）', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 652);
  assert.strictEqual(views.形态, 532);
  assert.strictEqual(views.机制, 116);
  assert.strictEqual(views.病因, 4);
  assert.strictEqual(rank(views)[0][0], '形态');
  assert.ok(share(views, '形态') > 0.8 && share(views, '形态') < 0.83);
});

test('四层级合计 448 次，落在器官层（本章的观察单位是一个部位）', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 448);
  assert.strictEqual(levels.器官, 185);
  assert.strictEqual(levels.组织, 125);
  assert.strictEqual(levels.系统, 86);
  assert.strictEqual(levels.细胞, 52);
  assert.strictEqual(rank(levels)[0][0], '器官');
  assert.ok(share(levels, '器官') > 0.4);
});

test('数值核验：12 个单元的 valueLike 全为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 12);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('血栓形态四类齐备：白色 / 混合 / 红色 / 透明，缺一类即链断', () => {
  assert.deepStrictEqual(THROMBUS, ['白色血栓', '混合血栓', '红色血栓', '透明血栓']);
  assert.deepStrictEqual(thrombusTypes(list), THROMBUS);
});

test('观察与描述六要素写全的单元只有 4.1.1 与 4.4.3（方法节与末节的首尾呼应）', () => {
  assert.deepStrictEqual(SIX, ['观察', '描述', '记录', '分析', '报告', '复核']);
  assert.deepStrictEqual(sixElementUnits(list), ['4.1.1', '4.4.3']);
});

test('12 个单元全部写明「不写数值与单位」的口径', () => {
  assert.strictEqual(boundaryUnits(list).length, 12);
  assert.deepStrictEqual(boundaryUnits(list), list.map((u) => u.sub));
});

test('四节各 3 个单元，每节汉字数在 5000 以上（教材按节均分，没有薄节）', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.size, 4);
  for (const [sec, g] of secs) {
    assert.strictEqual(g.units, 3, `${sec} 单元数`);
    assert.ok(g.hanzi > 5000, `${sec} 只有 ${g.hanzi} 字`);
  }
});

test('链的四段与四节一一对应，顺序为充血出血 → 血栓 → 栓塞 → 梗死', () => {
  assert.deepStrictEqual(CHAIN.map((c) => c.sec), ['4.1', '4.2', '4.3', '4.4']);
  assert.deepStrictEqual(CHAIN.map((c) => c.name), ['充血与出血', '血栓形成', '栓塞', '梗死']);
  const secs = bySection(list);
  const keys = [...secs.keys()].sort();
  for (let i = 0; i < CHAIN.length; i += 1) {
    assert.ok(keys[i].startsWith(CHAIN[i].sec), `${CHAIN[i].sec} 与第 ${i + 1} 节不对应`);
  }
});

test('学习目标 7 条只落在 4.1.1（章级目标），其余 11 个单元没有 goals', () => {
  const withGoals = list.filter((u) => (u.goals || []).length > 0);
  assert.deepStrictEqual(withGoals.map((u) => u.sub), ['4.1.1']);
  assert.strictEqual(withGoals[0].goals.length, 7);
});
