#!/usr/bin/env node
/**
 * 第 3 章 水、电解质代谢紊乱 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、词频重心、水钠与钾两段的分工、
 * 三条维度的覆盖、脱水三型的落点、钾的三端、数值是否为 0。
 * 不锁死正文措辞，底本改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  SUBS,
  DIMENSIONS,
  DEHYDRATION,
  K_ENDS,
  K_FACTORS,
  K_FUNCTION,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  coverage,
  boundaryUnits,
  bySection,
} = require('./main');

const units = load();
const list = chapterUnits(units);

test('本章 6 个知识单元，分属 2 节，正文合计 10875 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 6);
  assert.strictEqual(s.secs, 2);
  assert.strictEqual(s.chars, 10875);
  assert.deepStrictEqual(SUBS, ['5.1.1', '5.1.2', '5.1.3', '5.2.1', '5.2.2', '5.2.3']);
  assert.deepStrictEqual(list.map((u) => u.sub), SUBS);
});

test('三视角合计 228 次，以机能为重心（机能多于机制，病因一次不现）', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 228);
  assert.strictEqual(views.机能, 143);
  assert.strictEqual(views.机制, 85);
  assert.strictEqual(views.病因, 0);
  assert.strictEqual(rank(views)[0][0], '机能');
  assert.ok(share(views, '机能') > 0.6);
});

test('四层级合计 142 次，落在细胞层（本章讲细胞体积与跨膜移动，不落在器官）', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 142);
  assert.strictEqual(levels.细胞, 104);
  assert.strictEqual(levels.系统, 18);
  assert.strictEqual(levels.组织, 11);
  assert.strictEqual(levels.器官, 9);
  assert.strictEqual(rank(levels)[0][0], '细胞');
});

test('数值核验：6 个单元的 valueLike 全为 0', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 6);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('三条维度：渗透状态贯穿 6 节，容量状态 3 节，钠水平只在 5.1.1', () => {
  assert.deepStrictEqual(DIMENSIONS, ['容量状态', '渗透状态', '钠水平']);
  const cov = coverage(list, DIMENSIONS);
  assert.deepStrictEqual(cov.map((c) => c.key), DIMENSIONS);
  assert.deepStrictEqual(cov.map((c) => c.units.length), [3, 6, 1]);
  assert.deepStrictEqual(cov[2].units, ['5.1.1']);
  assert.deepStrictEqual(cov[1].units, SUBS);
});

test('脱水三型齐备，全部落在 5.1.2 一节', () => {
  assert.deepStrictEqual(DEHYDRATION, ['高渗性', '低渗性', '等渗性']);
  const cov = coverage(list, DEHYDRATION);
  for (const c of cov) {
    assert.deepStrictEqual(c.units, ['5.1.2'], `${c.key} 不在 5.1.2`);
  }
});

test('钾的三端：排出 6 节全中，摄入 5 节，跨膜转移 3 节（总量 ≠ 血钾的那一端）', () => {
  assert.deepStrictEqual(K_ENDS, ['摄入', '排出', '跨膜转移']);
  const cov = coverage(list, K_ENDS);
  assert.deepStrictEqual(cov.map((c) => c.units.length), [5, 6, 3]);
  assert.deepStrictEqual(cov[2].units, ['5.2.1', '5.2.2', '5.2.3']);
});

test('影响血钾的四组因素中，分布类别覆盖面最广（4 节）', () => {
  assert.deepStrictEqual(K_FACTORS, ['摄入类别', '排出类别', '分布类别', '调节类别']);
  const cov = coverage(list, K_FACTORS);
  assert.deepStrictEqual(cov.map((c) => c.units.length), [2, 2, 4, 2]);
  assert.strictEqual(rank(Object.fromEntries(cov.map((c) => [c.key, c.units.length])))[0][0], '分布类别');
});

test('功能变化落在神经肌肉与心脏两面，各 2 节', () => {
  assert.deepStrictEqual(K_FUNCTION, ['神经肌肉', '心脏']);
  const cov = coverage(list, K_FUNCTION);
  assert.deepStrictEqual(cov.map((c) => c.units), [['5.2.1', '5.2.3'], ['5.2.1', '5.2.3']]);
});

test('边界：6 节全部写明「由具备资质的人员」判读', () => {
  const bounded = boundaryUnits(list);
  assert.strictEqual(bounded.length, 6);
  assert.deepStrictEqual(bounded, SUBS);
});

test('两节各 3 个单元，字数分别为 5480 与 5395', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.size, 2);
  const first = secs.get('5.1 水钠代谢紊乱的类别');
  const second = secs.get('5.2 钾代谢紊乱的类别');
  assert.strictEqual(first.units, 3);
  assert.strictEqual(second.units, 3);
  assert.strictEqual(first.chars, 5480);
  assert.strictEqual(second.chars, 5395);
});

test('学习目标 7 条只落在 5.1.1（章级目标）', () => {
  const withGoals = list.filter((u) => (u.goals || []).length > 0);
  assert.deepStrictEqual(withGoals.map((u) => u.sub), ['5.1.1']);
  assert.strictEqual(withGoals[0].goals.length, 7);
});
