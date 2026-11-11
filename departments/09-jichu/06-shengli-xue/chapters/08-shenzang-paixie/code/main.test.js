#!/usr/bin/env node
/**
 * 第 8 章 肾脏的排泄功能 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言落在可对账的结构上：单元与节数、字数、数值核验合计、视角层级合计、
 * 三环节的转运方向、滤过动力两侧的变动方向、浓缩的两个条件、清除率的三种读法。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  load, chapterUnits, chapterMeta, sectionsOf, aggregate,
  transportDirection, filtrationForces, filtrationShift,
  urineConcentration, clearanceMeaning, dominantView, dominantLevel,
  VIEWS, LEVELS,
} = require('./main');

const db = load();
const units = chapterUnits(db);
const meta = chapterMeta(db);

test('本章 12 个知识单元落在 4 个节里，章名与章号对得上', () => {
  assert.strictEqual(units.length, 12);
  assert.strictEqual(sectionsOf(units).length, 4);
  assert.strictEqual(meta.no, '8');
  assert.match(meta.title, /肾脏的排泄功能/);
});

test('本章教材字数 = 20888，与逐单元 hanzi 之和一致', () => {
  assert.strictEqual(meta.hanzi, 20888);
  assert.strictEqual(units.reduce((n, u) => n + u.hanzi, 0), 20888);
});

test('数值零容忍：12 个单元 valueLike 合计为 0', () => {
  for (const u of units) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值型表述`);
  assert.strictEqual(aggregate(units).valueLike, 0);
});

test('三视角合计 = 28/306/129，四层级合计 = 63/30/151/56', () => {
  const agg = aggregate(units);
  assert.deepStrictEqual(agg.views, { 代谢: 28, 机能: 306, 形态: 129 });
  assert.deepStrictEqual(agg.levels, { 细胞: 63, 组织: 30, 器官: 151, 系统: 56 });
  for (const k of VIEWS) assert.strictEqual(agg.views[k], units.reduce((n, u) => n + u.measure.views[k], 0));
  for (const k of LEVELS) assert.strictEqual(agg.levels[k], units.reduce((n, u) => n + u.measure.levels[k], 0));
});

test('本章的重心在器官层：器官高于其它三层，且形态高于代谢', () => {
  const agg = aggregate(units);
  assert.ok(agg.levels['器官'] > agg.levels['细胞']);
  assert.ok(agg.levels['器官'] > agg.levels['系统']);
  assert.ok(agg.views['形态'] > agg.views['代谢']);
});

test('三环节的转运方向相反，且排泄不计重吸收', () => {
  assert.match(transportDirection('滤过'), /血液 → 肾小囊/);
  assert.match(transportDirection('重吸收'), /小管液 → 血液/);
  assert.match(transportDirection('分泌'), /→ 小管液/);
  assert.match(transportDirection('排泄'), /滤过 \+ 分泌/);
  assert.throws(() => transportDirection('转运'), /环节只取/);
});

test('滤过动力两侧：推动一项、对抗两项，漏一项就错', () => {
  const f = filtrationForces();
  assert.strictEqual(f.推动.length, 1);
  assert.strictEqual(f.对抗.length, 2);
  assert.ok(f.对抗.includes('血浆胶体渗透压'));
  assert.ok(f.对抗.includes('肾小囊内压'));
  assert.match(f.合成, /有效滤过压/);
});

test('滤过变动只能给方向：单侧变动可定，两侧同向变动推不出', () => {
  assert.match(filtrationShift('降', '平'), /降低/);
  assert.match(filtrationShift('平', '降'), /升高/); // 对抗力下降 = 有效滤过压升高
  assert.match(filtrationShift('平', '升'), /降低/); // 对抗力升高 = 有效滤过压降低
  assert.match(filtrationShift('升', '降'), /升高/);
  assert.match(filtrationShift('降', '升'), /降低/);
  assert.strictEqual(filtrationShift('平', '平'), '有效滤过压不变');
  assert.match(filtrationShift('降', '降'), /推不出/);
  assert.throws(() => filtrationShift('涨', '平'), /方向只取/);
});

test('浓缩与稀释：梯度与激素两个条件缺一不可', () => {
  assert.match(urineConcentration('有', '有'), /^浓缩/);
  assert.match(urineConcentration('有', '无'), /^稀释/);
  assert.match(urineConcentration('无', '有'), /不成立/);
  assert.match(urineConcentration('无', '无'), /^稀释/);
  assert.throws(() => urineConcentration('有', '少'), /只取/);
});

test('清除率是三种读法，不是三个公式', () => {
  assert.match(clearanceMeaning('只滤过'), /滤过过程/);
  assert.match(clearanceMeaning('滤过并分泌'), /肾血浆流量/);
  assert.match(clearanceMeaning('滤过并重吸收'), /重吸收程度/);
  assert.throws(() => clearanceMeaning('只分泌'), /物质类别/);
});

test('主视角/主层级判定：8.2.2 滤过膜属形态与细胞，8.4.2 尿生成调节属机能', () => {
  const a = units.find((u) => u.sub === '8.2.2');
  const b = units.find((u) => u.sub === '8.4.2');
  assert.strictEqual(dominantView(a), '形态');
  assert.strictEqual(dominantLevel(a), '细胞');
  assert.strictEqual(dominantView(b), '机能');
  assert.throws(() => chapterUnits(db, '99'), /没有第99章/);
});
