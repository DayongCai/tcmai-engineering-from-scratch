#!/usr/bin/env node
/**
 * 第 3 章 细胞和组织的适应、损伤与修复 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、词频重心、三类反应同处的单元、形态类别是否成套、数值是否为 0。
 * 不锁死正文措辞，教材改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  TRIAD,
  ADAPT,
  NUCLEAR,
  REPAIR,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  triadUnits,
  adaptCoverage,
  nuclearCoverage,
  repairCoverage,
  sixElementUnits,
  handoffUnits,
  neutralUnits,
  bySection,
} = require('./main');

const units = load();
const list = chapterUnits(units);

test('本章 12 个知识单元，分属 4 节，正文合计 20942 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 20942);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '3.1.1', '3.1.2', '3.1.3',
    '3.2.1', '3.2.2', '3.2.3',
    '3.3.1', '3.3.2', '3.3.3',
    '3.4.1', '3.4.2', '3.4.3',
  ]);
});

test('三视角合计 1045 次，形态占八成半——这是全书形态密度最高的一章', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 1045);
  assert.strictEqual(views.形态, 904);
  assert.strictEqual(views.机制, 137);
  assert.strictEqual(views.病因, 4);
  assert.strictEqual(rank(views)[0][0], '形态');
  assert.ok(share(views, '形态') > 0.86 && share(views, '形态') < 0.87);
});

test('四层级合计 445 次，组织与细胞两层占九成：形态描述默认落在细胞与组织', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 445);
  assert.strictEqual(levels.组织, 229);
  assert.strictEqual(levels.细胞, 170);
  assert.strictEqual(levels.器官, 31);
  assert.strictEqual(levels.系统, 15);
  assert.ok(share(levels, '组织') + share(levels, '细胞') > 0.89);
});

test('数值核验：12 个单元的 valueLike 全为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 12);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('三类反应同处出现的只有 4 个单元：连续线是两端的框定，不是每一节的写法', () => {
  assert.deepStrictEqual(TRIAD, ['适应', '损伤', '修复']);
  assert.deepStrictEqual(triadUnits(list), ['3.1.1', '3.1.3', '3.4.1', '3.4.3']);
});

test('适应反应四个类别都在 3.1 之内出现，且化生只在 3.1.3 专节', () => {
  const adapt = adaptCoverage(list);
  assert.deepStrictEqual(adapt.map((a) => a.kind), ADAPT);
  assert.deepStrictEqual(adapt.map((a) => a.units.length), [4, 3, 4, 3]);
  for (const a of adapt) {
    assert.ok(a.units.some((s) => s.startsWith('3.1.')), `${a.kind} 未在 3.1 出现`);
  }
  assert.deepStrictEqual(adapt.find((a) => a.kind === '化生').units, ['3.1.1', '3.1.3', '3.4.3']);
});

test('坏死的三个核的形态类别都在同一单元（3.2.3）成套出现', () => {
  const nuclear = nuclearCoverage(list);
  assert.deepStrictEqual(nuclear.map((n) => n.sign), NUCLEAR);
  for (const n of nuclear) assert.deepStrictEqual(n.units, ['3.2.3'], `${n.sign} 出现在 ${n.units}`);
});

test('肉芽组织与瘢痕组织都在 3.3.2 与 3.3.3 出现：修复的两个结构成对写', () => {
  const repair = repairCoverage(list);
  assert.deepStrictEqual(repair.map((r) => r.kind), REPAIR);
  for (const r of repair) assert.deepStrictEqual(r.units, ['3.3.2', '3.3.3'], `${r.kind} 出现在 ${r.units}`);
});

test('六要素被提到 5 个单元，判断交接 11 个单元（缺的正好是 3.2.2）', () => {
  assert.deepStrictEqual(sixElementUnits(list), ['3.3.1', '3.3.3', '3.4.1', '3.4.2', '3.4.3']);
  const handoff = handoffUnits(list);
  assert.strictEqual(handoff.length, 11);
  assert.deepStrictEqual(list.map((u) => u.sub).filter((s) => !handoff.includes(s)), ['3.2.2']);
});

test('中性表述只在 3 个单元被要求：3.1.3 与 3.4.2 与 3.4.3', () => {
  assert.deepStrictEqual(neutralUnits(list), ['3.1.3', '3.4.2', '3.4.3']);
});

test('四节各 3 个单元，每节汉字数在 5000 以上（末节最长，收口要交代边界）', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.size, 4);
  for (const [sec, g] of secs) {
    assert.strictEqual(g.units, 3, `${sec} 单元数`);
    assert.ok(g.hanzi > 5000, `${sec} 只有 ${g.hanzi} 字`);
  }
  const hz = [...secs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en')).map(([, g]) => g.hanzi);
  assert.strictEqual(Math.max(...hz), 5551);
});

test('学习目标是章级的：只落在 3.1.1，共 7 条，其余 11 个单元没有 goals', () => {
  const withGoals = list.filter((u) => u.goals.length > 0);
  assert.deepStrictEqual(withGoals.map((u) => u.sub), ['3.1.1']);
  assert.strictEqual(withGoals[0].goals.length, 7);
  assert.strictEqual(list.reduce((n, u) => n + u.goals.length, 0), 7);
});

test('每单元 brief 都带「不写数值与单位」的口径句', () => {
  for (const u of list) assert.match(u.brief, /不写数值与单位/, `${u.sub} brief 缺口径`);
});
