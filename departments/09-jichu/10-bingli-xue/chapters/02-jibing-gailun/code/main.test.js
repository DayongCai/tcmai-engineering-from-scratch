#!/usr/bin/env node
/**
 * 第 2 章 疾病概论 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、词频重心、原因与条件是否分写、阶段与转归是否成套、数值是否为 0。
 * 不锁死正文措辞，教材改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  STAGES,
  OUTCOMES,
  load,
  chapterUnits,
  shape,
  lens,
  rank,
  total,
  share,
  valueAudit,
  causeCondition,
  stageCoverage,
  outcomeCoverage,
  sixElementUnits,
  handoffUnits,
  localWhole,
  bySection,
} = require('./main');

const units = load();
const list = chapterUnits(units);

test('本章 12 个知识单元，分属 4 节，正文合计 20167 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 12);
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.hanzi, 20167);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '2.1.1', '2.1.2', '2.1.3',
    '2.2.1', '2.2.2', '2.2.3',
    '2.3.1', '2.3.2', '2.3.3',
    '2.4.1', '2.4.2', '2.4.3',
  ]);
});

test('三视角合计 377 次，以机制为重心（过半），病因退到个位数比重', () => {
  const { views } = lens(list);
  assert.strictEqual(total(views), 377);
  assert.strictEqual(views.机制, 197);
  assert.strictEqual(views.形态, 148);
  assert.strictEqual(views.病因, 32);
  assert.strictEqual(rank(views)[0][0], '机制');
  assert.ok(share(views, '机制') > 0.52 && share(views, '机制') < 0.53);
});

test('四层级合计 133 次，落在系统层（疾病概论讲的是整体调节，不是细胞细节）', () => {
  const { levels } = lens(list);
  assert.strictEqual(total(levels), 133);
  assert.strictEqual(levels.系统, 80);
  assert.strictEqual(levels.组织, 29);
  assert.strictEqual(levels.细胞, 20);
  assert.strictEqual(levels.器官, 4);
  assert.strictEqual(rank(levels)[0][0], '系统');
  assert.ok(share(levels, '系统') > 0.6);
});

test('数值核验：12 个单元的 valueLike 全为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 12);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('原因与条件的分工是全章的写法：12 个单元全部两者同处，没有一处只留一个词', () => {
  const cc = causeCondition(list);
  assert.strictEqual(cc.both.length, 12);
  assert.deepStrictEqual(cc.onlyCause, []);
  assert.deepStrictEqual(cc.onlyCondition, []);
});

test('经过的四段与转归的四类都成套出现在同一节，且不在别处零散复述', () => {
  assert.strictEqual(stageCoverage(list).length, STAGES.length);
  for (const st of stageCoverage(list)) {
    assert.deepStrictEqual(st.units, ['2.4.1'], `${st.stage} 出现在 ${st.units.join(',')}`);
  }
  assert.strictEqual(outcomeCoverage(list).length, OUTCOMES.length);
  for (const o of outcomeCoverage(list)) {
    assert.deepStrictEqual(o.units, ['2.4.2'], `${o.outcome} 出现在 ${o.units.join(',')}`);
  }
});

test('六要素只被提到一次（2.4.3）：方法链在本章是声明，展开留给总论各章', () => {
  assert.deepStrictEqual(sixElementUnits(list), ['2.4.3']);
});

test('判断的归属是满的：12 个单元都把结论交给「具备资质的人员」', () => {
  assert.strictEqual(handoffUnits(list).length, 12);
});

test('局部与整体同处出现 7 个单元，且 2.3.3 专节讨论', () => {
  const lw = localWhole(list);
  assert.strictEqual(lw.length, 7);
  assert.ok(lw.includes('2.3.3'));
  assert.strictEqual(lw.filter((s) => s === '2.3.3').length, 1);
});

test('四节各 3 个单元，每节汉字数在 4900 以上（教材按节均分，没有薄节）', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.size, 4);
  for (const [sec, g] of secs) {
    assert.strictEqual(g.units, 3, `${sec} 单元数`);
    assert.ok(g.hanzi > 4900, `${sec} 只有 ${g.hanzi} 字`);
  }
});

test('学习目标是章级的：只落在 2.1.1，共 7 条，其余 11 个单元没有 goals', () => {
  const withGoals = list.filter((u) => u.goals.length > 0);
  assert.deepStrictEqual(withGoals.map((u) => u.sub), ['2.1.1']);
  assert.strictEqual(withGoals[0].goals.length, 7);
  assert.strictEqual(list.reduce((n, u) => n + u.goals.length, 0), 7);
});

test('每单元 brief 都带「不写数值与单位」的口径句', () => {
  for (const u of list) assert.match(u.brief, /不写数值与单位/, `${u.sub} brief 缺口径`);
});
