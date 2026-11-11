#!/usr/bin/env node
/**
 * 第 11 章 发热 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、节分布、机制链四段、三个时相、三个类别、数值是否为 0。
 * 不锁死正文措辞，教材改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  CHAIN,
  PHASES,
  CATEGORIES,
  SIX,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  chainCoverage,
  phaseCoverage,
  categoryCoverage,
  sixElements,
  bySection,
} = require('./main');

const units = load();
const list = chapterUnits(units);

test('本章 12 个知识单元，分属 4 节，正文合计 20436 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 20436);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '11.1.1', '11.1.2', '11.1.3',
    '11.2.1', '11.2.2', '11.2.3',
    '11.3.1', '11.3.2', '11.3.3',
    '11.4.1', '11.4.2', '11.4.3',
  ]);
});

test('三视角以机制为主轴（七成半），形态次之，病因近于零', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 348);
  assert.strictEqual(views.机制, 263);
  assert.strictEqual(views.形态, 80);
  assert.strictEqual(views.病因, 5);
  assert.strictEqual(rank(views)[0][0], '机制');
  assert.ok(share(views, '机制') > 0.75);
});

test('四层级落在系统层，组织层最低（发热不在组织学层面展开）', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 177);
  assert.strictEqual(levels.系统, 104);
  assert.strictEqual(levels.细胞, 36);
  assert.strictEqual(levels.器官, 29);
  assert.strictEqual(levels.组织, 8);
  assert.strictEqual(rank(levels)[0][0], '系统');
  assert.strictEqual(rank(levels)[3][0], '组织');
  assert.ok(share(levels, '系统') > 0.55);
});

test('数值核验：12 个单元的 valueLike 全为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 12);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('机制链四段齐全：激活物 → 内生致热原 → 中枢介质 → 调定点，一段都不能跳', () => {
  assert.deepStrictEqual(CHAIN.map((c) => c.key), ['发热激活物', '内生致热原', '中枢介质', '调定点']);
  const cov = chainCoverage(list);
  assert.strictEqual(cov.length, 4);
  for (const c of cov) assert.ok(c.units.length > 0, `${c.key} 在正文里没有落点`);
  // 效应段（调定点）应比启动段覆盖更广：它是全章的枢纽
  const byKey = Object.fromEntries(cov.map((c) => [c.key, c.units.length]));
  assert.strictEqual(byKey.调定点, 9);
  assert.ok(byKey.调定点 > byKey.发热激活物);
});

test('三个时相的方向互补：差为正 / 差近零 / 差为负，且三段方向互不相同', () => {
  assert.deepStrictEqual(PHASES.map((p) => p.name), ['体温上升期', '高温持续期', '体温下降期']);
  const cov = phaseCoverage(list);
  assert.strictEqual(cov.length, 3);
  for (const p of cov) assert.ok(p.units.length > 0, `${p.name} 在正文里没有落点`);
  assert.strictEqual(new Set(PHASES.map((p) => p.gap)).size, 3);
  assert.strictEqual(new Set(PHASES.map((p) => p.flux)).size, 3);
  // 上升期与下降期的方向相反：一个产热占优，一个散热占优
  assert.match(PHASES[0].flux, /产热相对增加/);
  assert.match(PHASES[2].flux, /散热相对增加/);
});

test('三个「体温高」的类别都在正文出现，判据是调定点有没有上移', () => {
  assert.deepStrictEqual(CATEGORIES.map((c) => c.name), ['发热', '过热', '生理性体温升高']);
  const cov = categoryCoverage(list);
  for (const c of cov) assert.ok(c.units.length > 0, `${c.name} 在正文里没有落点`);
  assert.strictEqual(new Set(CATEGORIES.map((c) => c.setpoint)).size, 3);
});

test('六要素写进正文的单元只有四处，且集中在 11.1.2 与 11.4', () => {
  assert.deepStrictEqual(SIX, ['观察', '描述', '记录', '分析', '报告', '复核']);
  assert.deepStrictEqual(sixElements(list), ['11.1.2', '11.4.1', '11.4.2', '11.4.3']);
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

test('学习目标是章级的：只落在 11.1.1，共 7 条，其余 11 个单元没有 goals', () => {
  const withGoals = list.filter((u) => u.goals.length > 0);
  assert.deepStrictEqual(withGoals.map((u) => u.sub), ['11.1.1']);
  assert.strictEqual(withGoals[0].goals.length, 7);
  assert.strictEqual(list.reduce((n, u) => n + u.goals.length, 0), 7);
});
