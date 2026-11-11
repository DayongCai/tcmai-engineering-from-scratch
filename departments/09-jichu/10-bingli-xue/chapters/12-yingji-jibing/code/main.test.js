#!/usr/bin/env node
/**
 * 第 12 章 应激与疾病 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、节分布、分期、机制通路、系统覆盖、数值是否为 0。
 * 不锁死正文措辞，教材改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  STAGES,
  PATHWAYS,
  SYSTEMS,
  SIX,
  BOUNDARY_PHRASES,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  stageCoverage,
  pathwayCoverage,
  systemCoverage,
  sixElements,
  boundaryCount,
  bySection,
} = require('./main');

const units = load();
const list = chapterUnits(units);

test('本章 12 个知识单元，分属 4 节，正文合计 20397 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 20397);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '12.1.1', '12.1.2', '12.1.3',
    '12.2.1', '12.2.2', '12.2.3',
    '12.3.1', '12.3.2', '12.3.3',
    '12.4.1', '12.4.2', '12.4.3',
  ]);
});

test('三视角：形态词居首但多用于划界，机制次之，病因近于零', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 246);
  assert.strictEqual(views.形态, 145);
  assert.strictEqual(views.机制, 97);
  assert.strictEqual(views.病因, 4);
  assert.strictEqual(rank(views)[0][0], '形态');
  // 形态词高频不等于在写形态学：本章反复用它划界（属功能性调整、非结构性病变）
  assert.ok(boundaryCount(list) > 0);
});

test('四层级落在系统层（压倒性多数），组织层最低', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 392);
  assert.strictEqual(levels.系统, 292);
  assert.strictEqual(levels.细胞, 55);
  assert.strictEqual(levels.器官, 38);
  assert.strictEqual(levels.组织, 7);
  assert.strictEqual(rank(levels)[0][0], '系统');
  assert.ok(share(levels, '系统') > 0.7, '系统层应占四层级七成以上');
});

test('数值核验：12 个单元的 valueLike 全为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 12);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('三期齐全，且三期都写在同一个单元里（分期是状态表，不是时间表）', () => {
  assert.deepStrictEqual(STAGES.map((s) => s.name), ['警戒期', '抵抗期', '衰竭期']);
  const cov = stageCoverage(list);
  assert.strictEqual(cov.length, 3);
  for (const s of cov) assert.ok(s.units.length > 0, `${s.name} 在正文里没有落点`);
  // 三期同源：都只在 12.1.2 被写成集合
  assert.deepStrictEqual(cov.map((s) => s.units), [['12.1.2'], ['12.1.2'], ['12.1.2']]);
  // 三期的资源侧互不相同，且抵抗期带「选择性适应」这条反直觉判据
  assert.strictEqual(new Set(STAGES.map((s) => s.ledger)).size, 3);
  assert.match(STAGES[1].ledger, /选择性适应/);
});

test('机制四层齐全：快通路 / 持久通路 / 细胞保护 / 体液支援', () => {
  assert.deepStrictEqual(PATHWAYS.map((p) => p.key), ['交感', '下丘脑', '折叠', '急性期反应']);
  const cov = pathwayCoverage(list);
  assert.strictEqual(cov.length, 4);
  for (const p of cov) assert.ok(p.units.length > 0, `${p.name} 在正文里没有落点`);
  // 两条主通路同在 12.2.1：快与慢是一节里的对照，不是两章
  const byName = Object.fromEntries(cov.map((p) => [p.name, p.units]));
  assert.deepStrictEqual(byName['交感—肾上腺髓质通路'], ['12.2.1']);
  assert.deepStrictEqual(byName['下丘脑—垂体—肾上腺皮质通路'], ['12.2.1']);
});

test('七组系统全部出现：全身性 = 一次资源再分配', () => {
  assert.deepStrictEqual(SYSTEMS, ['中枢神经', '免疫', '心血管', '消化', '血液', '泌尿', '生殖']);
  const cov = systemCoverage(list);
  assert.strictEqual(cov.length, 7);
  for (const x of cov) assert.ok(x.units.length > 0, `${x.name} 未被任何单元提到`);
  // 免疫跨单元最多：它是与神经内分泌构成双向回路的那个系统
  const top = [...cov].sort((a, b) => b.units.length - a.units.length)[0];
  assert.strictEqual(top.name, '免疫');
});

test('六要素写进正文的单元只有 12.4.3（边界一节），其余单元不重复这套流程', () => {
  assert.deepStrictEqual(SIX, ['观察', '描述', '记录', '分析', '报告', '复核']);
  assert.deepStrictEqual(sixElements(list), ['12.4.3']);
});

test('四节各 3 个单元，每节汉字数都在 5000 以上（教材按节均分，没有薄节）', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.size, 4);
  for (const [sec, g] of secs) {
    assert.strictEqual(g.units, 3, `${sec} 单元数`);
    assert.ok(g.hanzi > 5000, `${sec} 只有 ${g.hanzi} 字`);
  }
});

test('每单元 brief 都带「不写数值与单位与参考值」的口径句', () => {
  for (const u of list) assert.match(u.brief, /不写数值与单位与参考值/, `${u.sub} brief 缺口径`);
});

test('划界句式贯穿全章：功能层面 / 功能性调整 / 结构性 至少命中 10 处', () => {
  assert.deepStrictEqual(BOUNDARY_PHRASES, ['功能层面', '功能性调整', '结构性']);
  assert.ok(boundaryCount(list) >= 10);
});

test('学习目标是章级的：只落在 12.1.1，共 7 条，其余 11 个单元没有 goals', () => {
  const withGoals = list.filter((u) => u.goals.length > 0);
  assert.deepStrictEqual(withGoals.map((u) => u.sub), ['12.1.1']);
  assert.strictEqual(withGoals[0].goals.length, 7);
  assert.strictEqual(list.reduce((n, u) => n + u.goals.length, 0), 7);
});
