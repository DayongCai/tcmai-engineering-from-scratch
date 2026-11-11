#!/usr/bin/env node
/**
 * 第 14 章 弥散性血管内凝血 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、词频重心、凝血与纤溶的共现、数值是否为 0。
 * 不锁死正文措辞：教材改写段落时，测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  bySection,
  wordCount,
  unitsWith,
  cooccurrence,
  keyProfile,
} = require('./main');

const units = load();
const list = chapterUnits(units);

test('本章 12 个知识单元，分属 4 节，正文合计 20757 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 20757);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '14.1.1', '14.1.2', '14.1.3',
    '14.2.1', '14.2.2', '14.2.3',
    '14.3.1', '14.3.2', '14.3.3',
    '14.4.1', '14.4.2', '14.4.3',
  ]);
});

test('三视角合计 421 次，形态与机制接近、病因最轻', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 421);
  assert.strictEqual(views.形态, 193);
  assert.strictEqual(views.机制, 172);
  assert.strictEqual(views.病因, 56);
  assert.strictEqual(rank(views)[0][0], '形态');
  assert.ok(share(views, '病因') < 0.15, '病因在本章只作类别归纳，不展开成机制推演');
});

test('四层级合计 429 次，落在器官层（终末落点是器官功能与出血）', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 429);
  assert.strictEqual(levels.器官, 211);
  assert.strictEqual(levels.系统, 118);
  assert.strictEqual(levels.细胞, 67);
  assert.strictEqual(levels.组织, 33);
  assert.strictEqual(rank(levels)[0][0], '器官');
});

test('数值核验：12 个单元的 valueLike 全为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 12);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('四节各 3 个单元，每节都在 5000 字以上（没有薄节）', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.size, 4);
  for (const [sec, g] of secs) {
    assert.strictEqual(g.units, 3, `${sec} 单元数`);
    assert.ok(g.hanzi > 5000, `${sec} 只有 ${g.hanzi} 字`);
  }
});

test('凝血 187 次、纤溶 105 次，且 12 个单元里都同时出现：时序是贯穿全章的骨架', () => {
  assert.strictEqual(wordCount(list, '凝血'), 187);
  assert.strictEqual(wordCount(list, '纤溶'), 105);
  assert.strictEqual(cooccurrence(list).length, 12);
  assert.ok(wordCount(list, '凝血') > wordCount(list, '纤溶'), '凝血在前，笔墨也更重');
});

test('微血栓 47 次、分布在 10 个单元：不是机制一节的专属词', () => {
  assert.strictEqual(wordCount(list, '微血栓'), 47);
  assert.strictEqual(unitsWith(list, /微血栓/).length, 10);
  const prof = keyProfile(list);
  const wt = prof.find((p) => p.key === '微血栓');
  assert.strictEqual(wt.units, 10);
  assert.ok(!unitsWith(list, /微血栓/).includes('14.3.2'), '14.3.2 讲分型，不写微血栓');
});

test('「类别」在 12 个单元里全部出现；「六要素」只落在 2 个表述类单元', () => {
  const prof = keyProfile(list);
  assert.strictEqual(prof.find((p) => p.key === '类别').units, 12);
  assert.strictEqual(prof.find((p) => p.key === '六要素').units, 2);
  assert.deepStrictEqual(unitsWith(list, /六要素/), ['14.3.3', '14.4.3']);
});

test('学习目标是章级的：只落在 14.1.1，共 7 条，其余 11 个单元没有 goals', () => {
  const withGoals = list.filter((u) => u.goals.length > 0);
  assert.deepStrictEqual(withGoals.map((u) => u.sub), ['14.1.1']);
  assert.strictEqual(withGoals[0].goals.length, 7);
});

test('每单元 brief 都带「不写数值与单位与参考值」的口径句', () => {
  for (const u of list) assert.match(u.brief, /不写数值与单位与参考值/, `${u.sub} brief 缺口径`);
});
