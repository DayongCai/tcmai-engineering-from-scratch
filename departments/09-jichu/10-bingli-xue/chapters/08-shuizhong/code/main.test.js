#!/usr/bin/env node
/**
 * 第 8 章 水肿 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、词频重心、两本账是否都在、
 * 四条机制类别的覆盖、三类主导环节是否落在指定单元、数值是否为 0。
 * 不锁死正文措辞，教材改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  SIX,
  MECH,
  SYSTEMIC,
  TWO_BOOKS,
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
  mechCoverage,
  systemicUnits,
} = require('./main');

const units = load();
const list = chapterUnits(units);

test('本章 12 个知识单元，分属 4 节，正文合计 20630 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 20630);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '8.1.1', '8.1.2', '8.1.3',
    '8.2.1', '8.2.2', '8.2.3',
    '8.3.1', '8.3.2', '8.3.3',
    '8.4.1', '8.4.2', '8.4.3',
  ]);
});

test('三视角合计 411 次，以机制为重心（机制多于形态）', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 411);
  assert.strictEqual(views.机制, 233);
  assert.strictEqual(views.形态, 177);
  assert.strictEqual(views.病因, 1);
  assert.strictEqual(rank(views)[0][0], '机制');
  assert.ok(share(views, '机制') > 0.5);
});

test('四层级合计 269 次，落在器官层（水肿落在器官与组织，不落在系统）', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 269);
  assert.strictEqual(levels.器官, 119);
  assert.strictEqual(levels.组织, 72);
  assert.strictEqual(levels.系统, 69);
  assert.strictEqual(levels.细胞, 9);
  assert.strictEqual(rank(levels)[0][0], '器官');
});

test('数值核验：12 个单元的 valueLike 全为 0', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 12);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('两本账各占一个单元：血管内外 8.1.1、机体内外 8.1.2，接口在 8.1.3', () => {
  assert.deepStrictEqual(TWO_BOOKS.map((b) => b.sub), ['8.1.1', '8.1.2']);
  const bySub = new Map(list.map((u) => [u.sub, u]));
  assert.ok((bySub.get('8.1.1').body || '').includes('血管内外液体交换'));
  assert.ok((bySub.get('8.1.2').body || '').includes('机体内外液体交换'));
  const iface = bySub.get('8.1.3').body || '';
  assert.ok(iface.includes('主导环节') && iface.includes('伴随环节'), '8.1.3 未同时写主导与伴随');
});

test('四条机制类别齐备，覆盖单元数分别为 5 / 9 / 7 / 7', () => {
  assert.deepStrictEqual(MECH, ['流体静压', '胶体渗透压', '淋巴回流', '通透性']);
  const cov = mechCoverage(list);
  assert.deepStrictEqual(cov.map((c) => c.key), MECH);
  assert.deepStrictEqual(cov.map((c) => c.units.length), [5, 9, 7, 7]);
  // 胶体渗透压覆盖面最广：它是唯一同时被打中「生成不足」与「丢失过多」两条路的一条
  assert.strictEqual(rank(Object.fromEntries(cov.map((c) => [c.key, c.units.length])))[0][0], '胶体渗透压');
});

test('全身性水肿三类主导环节各占一个单元，且本节正文都写明类别名', () => {
  assert.deepStrictEqual(SYSTEMIC.map((s) => s.sub), ['8.2.1', '8.2.2', '8.2.3']);
  const sys = systemicUnits(list);
  assert.strictEqual(sys.length, 3);
  for (const s of sys) assert.strictEqual(s.found, true, `${s.sub} 未写 ${s.key}`);
});

test('观察与描述六要素写全的单元为 8 个，8.4 三节全部在列', () => {
  assert.deepStrictEqual(SIX, ['观察', '描述', '记录', '分析', '报告', '复核']);
  const six = sixElementUnits(list);
  assert.strictEqual(six.length, 8);
  for (const s of ['8.4.1', '8.4.2', '8.4.3']) assert.ok(six.includes(s), `${s} 缺六要素`);
});

test('口径覆盖 11 / 12：唯一例外是 8.1.3，它把口径写成「不写与时间参数相关的内容」', () => {
  const bounded = boundaryUnits(list);
  assert.strictEqual(bounded.length, 11);
  assert.ok(!bounded.includes('8.1.3'));
  const u = list.find((x) => x.sub === '8.1.3');
  assert.ok((u.body || '').includes('不写与时间参数相关的内容'));
});

test('四节各 3 个单元，每节汉字数在 5000 以上', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.size, 4);
  for (const [sec, g] of secs) {
    assert.strictEqual(g.units, 3, `${sec} 单元数`);
    assert.ok(g.hanzi > 5000, `${sec} 只有 ${g.hanzi} 字`);
  }
});

test('学习目标 7 条只落在 8.1.1（章级目标）', () => {
  const withGoals = list.filter((u) => (u.goals || []).length > 0);
  assert.deepStrictEqual(withGoals.map((u) => u.sub), ['8.1.1']);
  assert.strictEqual(withGoals[0].goals.length, 7);
});
