#!/usr/bin/env node
/**
 * 第 15 章 缺血-再灌注损伤 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、词频重心、三条机制边是否分节、数值是否为 0。
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
  valueAudit,
  bySection,
  wordCount,
  unitsWith,
  keyProfile,
  mechanismUnits,
  organUnits,
} = require('./main');

const units = load();
const list = chapterUnits(units);

test('本章 12 个知识单元，分属 4 节，正文合计 20519 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 20519);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '15.1.1', '15.1.2', '15.1.3',
    '15.2.1', '15.2.2', '15.2.3',
    '15.3.1', '15.3.2', '15.3.3',
    '15.4.1', '15.4.2', '15.4.3',
  ]);
});

test('三视角合计 521 次，形态压倒性居首、病因几乎为零', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 521);
  assert.strictEqual(views.形态, 347);
  assert.strictEqual(views.机制, 172);
  assert.strictEqual(views.病因, 2);
  assert.strictEqual(rank(views)[0][0], '形态');
});

test('四层级合计 328 次，细胞层居首但器官层紧随（机制在细胞、表现在器官）', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 328);
  assert.strictEqual(levels.细胞, 123);
  assert.strictEqual(levels.器官, 116);
  assert.strictEqual(levels.系统, 47);
  assert.strictEqual(levels.组织, 42);
  assert.strictEqual(rank(levels)[0][0], '细胞');
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

test('三条机制边各占一节：自由基 / 钙超载 / 微血管与白细胞', () => {
  const mech = mechanismUnits(list);
  assert.strictEqual(mech.length, 3);
  assert.deepStrictEqual(mech.map((m) => m.sub), ['15.2.1', '15.2.2', '15.2.3']);
  assert.strictEqual(wordCount(list, '自由基'), 22);
  assert.strictEqual(wordCount(list, '钙超载'), 21);
});

test('自由基 7 个单元、钙超载 6 个单元：机制词会溢出到器官层与表述层', () => {
  assert.strictEqual(unitsWith(list, /自由基/).length, 7);
  assert.strictEqual(unitsWith(list, /钙超载/).length, 6);
  assert.ok(unitsWith(list, /自由基/).includes('15.3.1'), '心脏那一节也写自由基');
  assert.ok(unitsWith(list, /钙超载/).includes('15.3.2'), '脑那一节也写钙超载');
});

test('「再灌注」21 次、7 个单元；「无复流」4 次、只在 2 个单元', () => {
  assert.strictEqual(wordCount(list, '再灌注'), 21);
  assert.strictEqual(unitsWith(list, /再灌注/).length, 7);
  assert.strictEqual(wordCount(list, '无复流'), 4);
  assert.deepStrictEqual(unitsWith(list, /无复流/), ['15.1.2', '15.2.3']);
});

test('器官层恰好 3 个单元：心、脑、其它（含凋亡）', () => {
  assert.deepStrictEqual(organUnits(list), ['15.3.1', '15.3.2', '15.3.3']);
  const prof = keyProfile(list);
  assert.strictEqual(prof.find((p) => p.key === '凋亡').units, 4);
  assert.strictEqual(prof.find((p) => p.key === '六要素').units, 2);
  assert.deepStrictEqual(unitsWith(list, /六要素/), ['15.4.1', '15.4.3']);
});

test('学习目标是章级的：只落在 15.1.1，共 7 条，其余 11 个单元没有 goals', () => {
  const withGoals = list.filter((u) => u.goals.length > 0);
  assert.deepStrictEqual(withGoals.map((u) => u.sub), ['15.1.1']);
  assert.strictEqual(withGoals[0].goals.length, 7);
});

test('每单元 brief 都带「不写数值与单位与参考值」的口径句', () => {
  for (const u of list) assert.match(u.brief, /不写数值与单位与参考值/, `${u.sub} brief 缺口径`);
});
