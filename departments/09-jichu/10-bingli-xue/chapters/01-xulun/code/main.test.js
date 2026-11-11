#!/usr/bin/env node
/**
 * 第 1 章 绪论 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、词频重心、层次覆盖、六要素是否写全、数值是否为 0。
 * 不锁死正文措辞，教材改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  LAYERS,
  SIX,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  layerCoverage,
  sixElementUnits,
  handoffUnits,
  platformCoverage,
  bySection,
} = require('./main');

const units = load();
const list = chapterUnits(units);

test('本章 12 个知识单元，分属 4 节，正文合计 20341 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 20341);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '1.1.1', '1.1.2', '1.1.3',
    '1.2.1', '1.2.2', '1.2.3',
    '1.3.1', '1.3.2', '1.3.3',
    '1.4.1', '1.4.2', '1.4.3',
  ]);
});

test('三视角合计 352 次，以形态为重心（占八成）', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 352);
  assert.strictEqual(views.形态, 284);
  assert.strictEqual(views.机制, 60);
  assert.strictEqual(views.病因, 8);
  assert.strictEqual(rank(views)[0][0], '形态');
  assert.ok(share(views, '形态') > 0.8 && share(views, '形态') < 0.81);
});

test('四层级合计 223 次，落在组织层（形态描述的默认尺度是组织）', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 223);
  assert.strictEqual(levels.组织, 97);
  assert.strictEqual(levels.细胞, 50);
  assert.strictEqual(levels.器官, 38);
  assert.strictEqual(levels.系统, 38);
  assert.strictEqual(rank(levels)[0][0], '组织');
  assert.ok(share(levels, '组织') > 0.43);
});

test('数值核验：12 个单元的 valueLike 全为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 12);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('三个观察层次不是并列口号：大体 5 个单元、组织学 4 个、细胞与分子 6 个写到', () => {
  const layers = layerCoverage(list);
  assert.deepStrictEqual(layers.map((l) => l.key), LAYERS.map((l) => l.key));
  assert.strictEqual(layers[0].units.length, 5);
  assert.strictEqual(layers[1].units.length, 4);
  assert.strictEqual(layers[2].units.length, 6);
  // 1.3 整节都在讲方法与层次，三个层次必须都在这一节里出现
  assert.ok(layers.every((l) => l.units.some((s) => s.startsWith('1.3.'))));
});

test('六要素写全的单元是 7 个，判据取教材的提法本身，1.3 整节三单元都在列——层次与方法在同一节合流', () => {
  const six = sixElementUnits(list);
  assert.deepStrictEqual(SIX, ['观察', '描述', '记录', '分析', '报告', '复核']);
  assert.strictEqual(six.length, 7);
  assert.deepStrictEqual(six, ['1.1.2', '1.3.1', '1.3.2', '1.3.3', '1.4.1', '1.4.2', '1.4.3']);
  assert.ok(six.includes('1.3.1'));
});

test('判断的归属：11 个单元把结论交给「具备资质的人员」，只有发展简史里的一个不写', () => {
  const handoff = handoffUnits(list);
  assert.strictEqual(handoff.length, 11);
  assert.ok(!handoff.includes('1.2.1'));
});

test('平台三件套齐备：单元库 11、术语域 10、数据门禁 8 个单元', () => {
  const p = platformCoverage(list);
  assert.deepStrictEqual(p.map((x) => x.key), ['单元库', '术语域', '数据门禁']);
  assert.deepStrictEqual(p.map((x) => x.units), [11, 10, 8]);
});

test('四节各 3 个单元，每节汉字数在 4900 以上（教材按节均分，没有薄节）', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.size, 4);
  for (const [sec, g] of secs) {
    assert.strictEqual(g.units, 3, `${sec} 单元数`);
    assert.ok(g.hanzi > 4900, `${sec} 只有 ${g.hanzi} 字`);
  }
});

test('学习目标是章级的：只落在 1.1.1，共 7 条，其余 11 个单元没有 goals', () => {
  const withGoals = list.filter((u) => u.goals.length > 0);
  assert.deepStrictEqual(withGoals.map((u) => u.sub), ['1.1.1']);
  assert.strictEqual(withGoals[0].goals.length, 7);
  assert.strictEqual(list.reduce((n, u) => n + u.goals.length, 0), 7);
});

test('每单元 brief 都带「不写数值与单位」的口径句', () => {
  for (const u of list) assert.match(u.brief, /不写数值与单位/, `${u.sub} brief 缺口径`);
});
