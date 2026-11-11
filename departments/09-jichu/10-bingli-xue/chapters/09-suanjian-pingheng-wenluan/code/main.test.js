#!/usr/bin/env node
/**
 * 第 9 章 酸碱平衡紊乱 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、词频重心、三个调节环节是否都在、
 * 六个指标的覆盖、四型是否各有着落、代偿出现在几个单元、数值是否为 0。
 * 不锁死正文措辞，教材改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  SIX,
  THREE,
  INDICATORS,
  FOUR,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  sixElementUnits,
  bySection,
  threeRegulators,
  indicatorCoverage,
  fourTypes,
  compensationUnits,
} = require('./main');

const units = load();
const list = chapterUnits(units);

test('本章 12 个知识单元，分属 4 节，正文合计 20430 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 20430);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '9.1.1', '9.1.2', '9.1.3',
    '9.2.1', '9.2.2', '9.2.3',
    '9.3.1', '9.3.2', '9.3.3',
    '9.4.1', '9.4.2', '9.4.3',
  ]);
});

test('三视角合计 199 次，形态与机制几乎持平（本章没有肉眼病灶）', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 199);
  assert.strictEqual(views.形态, 101);
  assert.strictEqual(views.机制, 98);
  assert.strictEqual(views.病因, 0);
  // 两者相差不到一成：这是全书少有的「形态与机制同重」的章
  assert.ok(Math.abs(views.形态 - views.机制) / total(views) < 0.1);
});

test('四层级合计 193 次，落在细胞层（缓冲对与离子交换都在细胞这一层）', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 193);
  assert.strictEqual(levels.细胞, 86);
  assert.strictEqual(levels.器官, 63);
  assert.strictEqual(levels.系统, 32);
  assert.strictEqual(levels.组织, 12);
  assert.strictEqual(rank(levels)[0][0], '细胞');
  assert.ok(share(levels, '细胞') > 0.4);
});

test('数值核验：12 个单元的 valueLike 全为 0', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 12);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('三个调节环节各占一个单元：缓冲 9.1.1、肺 9.1.2、肾 9.1.3，按起效快慢排', () => {
  assert.deepStrictEqual(THREE.map((t) => t.sub), ['9.1.1', '9.1.2', '9.1.3']);
  assert.deepStrictEqual(THREE.map((t) => t.pace), ['即时', '较快', '较慢而持久']);
  const three = threeRegulators(list);
  for (const t of three) assert.strictEqual(t.found, true, `${t.sub} 未写 ${t.key}`);
});

test('六个指标覆盖单元数为 11 / 9 / 11 / 5 / 5 / 5，酸碱度与碳酸氢盐最广', () => {
  assert.deepStrictEqual(INDICATORS, ['酸碱度', '二氧化碳分压', '碳酸氢盐', '缓冲碱', '碱剩余', '阴离子间隙']);
  const cov = indicatorCoverage(list);
  assert.deepStrictEqual(cov.map((c) => c.key), INDICATORS);
  assert.deepStrictEqual(cov.map((c) => c.units.length), [11, 9, 11, 5, 5, 5]);
  const m = Object.fromEntries(cov.map((c) => [c.key, c.units.length]));
  assert.strictEqual(rank(m)[0][1], 11);
});

test('四型单纯型紊乱各有着落：9.3.1 两种酸中毒、9.3.2 两种碱中毒', () => {
  assert.deepStrictEqual(FOUR.map((f) => f.key), ['代谢性酸中毒', '呼吸性酸中毒', '代谢性碱中毒', '呼吸性碱中毒']);
  assert.deepStrictEqual(FOUR.map((f) => f.sub), ['9.3.1', '9.3.1', '9.3.2', '9.3.2']);
  assert.deepStrictEqual(FOUR.map((f) => f.origin), ['碳酸氢盐', '碳酸', '碳酸氢盐', '碳酸']);
  for (const f of fourTypes(list)) assert.strictEqual(f.found, true, `${f.key} 未命中`);
});

test('「代偿」出现在 7 个单元，从 9.1.2 一直贯到 9.4.3（第二条线索）', () => {
  const comp = compensationUnits(list);
  assert.strictEqual(comp.length, 7);
  assert.deepStrictEqual(comp, ['9.1.2', '9.3.1', '9.3.2', '9.3.3', '9.4.1', '9.4.2', '9.4.3']);
});

test('观察与描述六要素写全的单元只有 9.4.2 与 9.4.3（表述要求两节）', () => {
  assert.deepStrictEqual(SIX, ['观察', '描述', '记录', '分析', '报告', '复核']);
  assert.deepStrictEqual(sixElementUnits(list), ['9.4.2', '9.4.3']);
});

test('四节各 3 个单元，每节汉字数在 5000 以上', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.size, 4);
  for (const [sec, g] of secs) {
    assert.strictEqual(g.units, 3, `${sec} 单元数`);
    assert.ok(g.hanzi > 5000, `${sec} 只有 ${g.hanzi} 字`);
  }
});

test('学习目标 7 条只落在 9.1.1（章级目标）', () => {
  const withGoals = list.filter((u) => (u.goals || []).length > 0);
  assert.deepStrictEqual(withGoals.map((u) => u.sub), ['9.1.1']);
  assert.strictEqual(withGoals[0].goals.length, 7);
});
