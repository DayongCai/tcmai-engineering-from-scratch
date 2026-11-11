#!/usr/bin/env node
/**
 * 第 10 章 缺氧 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、节分布、四型断点、指标覆盖、数值是否为 0。
 * 不锁死正文措辞，教材改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  TYPES,
  INDICATORS,
  SIX,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  typeBreakdown,
  indicatorCoverage,
  sixElements,
  bySection,
} = require('./main');

const units = load();
const list = chapterUnits(units);

test('本章 12 个知识单元，分属 4 节，正文合计 19851 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 19851);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '10.1.1', '10.1.2', '10.1.3',
    '10.2.1', '10.2.2', '10.2.3',
    '10.3.1', '10.3.2', '10.3.3',
    '10.4.1', '10.4.2', '10.4.3',
  ]);
});

test('三视角以机制为主轴，病因视角为 0（本章按断点分类，不按病因分类）', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 397);
  assert.strictEqual(views.机制, 203);
  assert.strictEqual(views.形态, 194);
  assert.strictEqual(views.病因, 0);
  assert.strictEqual(rank(views)[0][0], '机制');
  assert.ok(share(views, '机制') > 0.5);
});

test('四层级以系统层居首、组织层次之（缺氧讲的是组织与系统怎样应对）', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 221);
  assert.strictEqual(levels.系统, 86);
  assert.strictEqual(levels.组织, 82);
  assert.strictEqual(levels.细胞, 30);
  assert.strictEqual(levels.器官, 23);
  assert.strictEqual(rank(levels)[0][0], '系统');
  assert.ok(share(levels, '系统') + share(levels, '组织') > 0.75);
});

test('数值核验：12 个单元的 valueLike 全为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 12);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('四型缺氧 = 氧运输链上的四个断点，四型在正文中都有落点', () => {
  assert.deepStrictEqual(TYPES.map((t) => t.name), ['低张性', '血液性', '循环性', '组织性']);
  const found = typeBreakdown(list);
  assert.strictEqual(found.length, 4);
  for (const t of found) {
    assert.ok(t.units.length > 0, `${t.name} 在正文里没有落点`);
  }
  // 断点在链上不重复：四型各占一段
  assert.strictEqual(new Set(TYPES.map((t) => t.at)).size, 4);
  // 两种「以含量下降为特征」的型（低张性 / 血液性）必须都在 10.3.3 的总结里被比较
  const summary = list.find((u) => u.sub === '10.3.3');
  assert.ok(summary.body.includes('低张性') && summary.body.includes('血液性'));
});

test('五个血氧指标全部出现，说明仪表盘是画全的（不是只讲其中一两个）', () => {
  assert.deepStrictEqual(INDICATORS, ['血氧分压', '血氧容量', '血氧饱和度', '血氧含量', '动静脉氧差']);
  const cov = indicatorCoverage(list);
  assert.strictEqual(cov.length, 5);
  for (const i of cov) assert.ok(i.units.length > 0, `${i.name} 未被任何单元提到`);
  // 分压与容量是区分低张性与血液性的那组关键指标，覆盖数应最高一档
  const byName = Object.fromEntries(cov.map((i) => [i.name, i.units.length]));
  assert.ok(byName.血氧分压 >= byName.血氧含量, '分压覆盖应不少于含量');
  assert.strictEqual(byName.血氧分压, 9);
  assert.strictEqual(byName.动静脉氧差, 8);
});

test('六要素写全的单元只有两处：指标变化与代偿反应', () => {
  assert.deepStrictEqual(SIX, ['观察', '描述', '记录', '分析', '报告', '复核']);
  assert.deepStrictEqual(sixElements(list), ['10.1.2', '10.3.1']);
});

test('四节各 3 个单元，每节汉字数都在 4900 以上（教材按节均分，没有薄节）', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.size, 4);
  for (const [sec, g] of secs) {
    assert.strictEqual(g.units, 3, `${sec} 单元数`);
    assert.ok(g.hanzi > 4900, `${sec} 只有 ${g.hanzi} 字`);
  }
});

test('每单元 brief 都带「不写数值与单位与参考值」的口径句', () => {
  for (const u of list) assert.match(u.brief, /不写数值与单位与参考值/, `${u.sub} brief 缺口径`);
});

test('学习目标是章级的：只落在 10.1.1，共 7 条，其余 11 个单元没有 goals', () => {
  const withGoals = list.filter((u) => u.goals.length > 0);
  assert.deepStrictEqual(withGoals.map((u) => u.sub), ['10.1.1']);
  assert.strictEqual(withGoals[0].goals.length, 7);
  assert.strictEqual(list.reduce((n, u) => n + u.goals.length, 0), 7);
});
