#!/usr/bin/env node
/**
 * 第 13 章 休克 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、词频重心、分期叙事的分量、数值是否为 0。
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
  stageProfile,
} = require('./main');

const units = load();
const list = chapterUnits(units);

test('本章 12 个知识单元，分属 4 节，正文合计 20475 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 20475);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '13.1.1', '13.1.2', '13.1.3',
    '13.2.1', '13.2.2', '13.2.3',
    '13.3.1', '13.3.2', '13.3.3',
    '13.4.1', '13.4.2', '13.4.3',
  ]);
});

test('三视角合计 629 次，以形态为重心', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 629);
  assert.strictEqual(views.形态, 351);
  assert.strictEqual(views.机制, 194);
  assert.strictEqual(views.病因, 84);
  assert.strictEqual(rank(views)[0][0], '形态');
  assert.ok(share(views, '形态') > 0.55);
});

test('四层级合计 631 次，落在器官层（休克是器官灌注不足的病）', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 631);
  assert.strictEqual(levels.器官, 214);
  assert.strictEqual(levels.系统, 197);
  assert.strictEqual(levels.细胞, 171);
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

test('微循环 82 次、分布在 10 个单元：分期差别写在微循环上，不是写在时限上', () => {
  assert.strictEqual(wordCount(list, '微循环'), 82);
  assert.strictEqual(unitsWith(list, /微循环/).length, 10);
  assert.ok(!unitsWith(list, /微循环/).includes('13.1.2'), '13.1.2 讲分类，不写微循环');
  const prof = stageProfile(list);
  const byKey = Object.fromEntries(prof.map((p) => [p.key, p]));
  assert.strictEqual(byKey.微循环.units, 10);
  assert.strictEqual(byKey.难治.units, 6);
  assert.strictEqual(byKey.六要素.units, 4);
});

test('「类别」在 12 个单元里全部出现：全章的口径是类别与关系', () => {
  const prof = stageProfile(list);
  const cat = prof.find((p) => p.key === '类别');
  assert.strictEqual(cat.units, 12);
  assert.ok(cat.hits > 200);
});

test('「六要素」只写在表述类的 4 个单元里，不混进病因与分期', () => {
  assert.deepStrictEqual(unitsWith(list, /六要素/), ['13.2.1', '13.4.1', '13.4.2', '13.4.3']);
});

test('学习目标是章级的：只落在 13.1.1，共 7 条，其余 11 个单元没有 goals', () => {
  const withGoals = list.filter((u) => u.goals.length > 0);
  assert.deepStrictEqual(withGoals.map((u) => u.sub), ['13.1.1']);
  assert.strictEqual(withGoals[0].goals.length, 7);
});

test('每单元 brief 都带「不写数值与单位与参考值」的口径句', () => {
  for (const u of list) assert.match(u.brief, /不写数值与单位与参考值/, `${u.sub} brief 缺口径`);
});
