#!/usr/bin/env node
/**
 * 第 14 章 肾功能不全 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、词频重心、链条是否写全、数值是否为 0。
 * 不锁死正文措辞，底本改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  COURSES,
  RELATIONS,
  FUNCS,
  DIMS,
  BOUNDARY,
  baseUnits,
  measureUnits,
  shape,
  lens,
  rank,
  total,
  valueAudit,
  chainUnits,
} = require('./main');

const list = baseUnits();
const measured = measureUnits();

test('本章 3 个小节，1 节，去空白字符数合计 5642', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 3);
  assert.strictEqual(s.secs, 1);
  assert.strictEqual(s.chars, 5642);
  assert.deepStrictEqual(list.map((u) => u.sub), ['11.4.1', '11.4.2', '11.4.3']);
});

test('小节标题去掉重复编号，与底本一致', () => {
  assert.deepStrictEqual(list.map((u) => u.title), [
    '急性与慢性类别的表述', '功能变化类别的表述', '由具备资质的人员判定的边界',
  ]);
  for (const u of list) assert.ok(!u.title.startsWith(u.sub), `${u.sub} 标题仍在重复编号`);
});

test('三视角合计 79 次，机能是主轴、病因与机制都只是零头', () => {
  const { views } = lens(measured);
  assert.strictEqual(total(views), 79);
  assert.strictEqual(views.机能, 67);
  assert.strictEqual(views.病因, 6);
  assert.strictEqual(views.机制, 6);
  assert.strictEqual(rank(views)[0][0], '机能');
});

test('四层级合计 31 次，系统层略高于器官层（本章讲功能类别与全身状态的关系）', () => {
  const { levels } = lens(measured);
  assert.strictEqual(total(levels), 31);
  assert.strictEqual(levels.系统, 15);
  assert.strictEqual(levels.器官, 13);
  assert.strictEqual(levels.细胞, 2);
  assert.strictEqual(levels.组织, 1);
  assert.strictEqual(rank(levels)[0][0], '系统');
});

test('数值核验：正文没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 3);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.samples, []);
  for (const u of measured) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('急与慢两类经过在首节写全，边界节只作回顾', () => {
  assert.deepStrictEqual(COURSES, ['急性经过', '慢性经过']);
  assert.deepStrictEqual(chainUnits(list, COURSES), ['11.4.1', '11.4.3']);
});

test('独立、转化、叠加三种关系只在 11.4.1 写全', () => {
  assert.deepStrictEqual(RELATIONS, ['独立关系类', '转化关系类', '叠加关系类']);
  assert.deepStrictEqual(chainUnits(list, RELATIONS), ['11.4.1']);
});

test('四类功能组成只在 11.4.2 写全：滤过、重吸收、分泌、内分泌', () => {
  assert.deepStrictEqual(FUNCS, ['滤过', '重吸收', '分泌', '内分泌']);
  assert.deepStrictEqual(chainUnits(list, FUNCS), ['11.4.2']);
});

test('四个维度只在 11.4.3 写全：结构、功能、经过、关系', () => {
  assert.deepStrictEqual(DIMS, ['结构维度', '功能维度', '经过维度', '关系维度']);
  assert.deepStrictEqual(chainUnits(list, DIMS), ['11.4.3']);
});

test('「不作诊断与判定 + 具备资质的人员」三节都写，是全章口径', () => {
  assert.deepStrictEqual(BOUNDARY, ['不作诊断与判定', '具备资质的人员']);
  assert.deepStrictEqual(chainUnits(list, BOUNDARY), ['11.4.1', '11.4.2', '11.4.3']);
});

test('急与慢只作经过类别，不押轻重', () => {
  const u = list.find((x) => x.sub === '11.4.1');
  assert.match(u.rawBody, /不表示轻重顺序/);
  assert.match(u.rawBody, /不表示优劣顺序/);
});

test('每小节都写着「只写类别与关系」的口径句，且篇幅相当', () => {
  for (const u of measured) {
    assert.match(u.brief, /只写类别与关系/, `${u.sub} brief 缺口径`);
    assert.ok(u.hanzi > 1500, `${u.sub} 只有 ${u.hanzi} 字，篇幅异常`);
  }
  for (const u of list) {
    assert.ok(u.chars > 1800 && u.chars < 2050, `${u.sub} 去空白 ${u.chars} 字，与「每小节约 1900」不符`);
  }
});
