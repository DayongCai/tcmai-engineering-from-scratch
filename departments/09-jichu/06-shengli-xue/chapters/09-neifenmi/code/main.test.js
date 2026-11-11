#!/usr/bin/env node
/**
 * 第 9 章 内分泌 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言落在可对账的结构上：单元与节数、字数、数值核验合计、视角层级合计、
 * 调节链的层数与输出、反馈三类的归类、受体位置与溶解性的对应、三种相互作用。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  load, chapterUnits, chapterMeta, sectionsOf, aggregate,
  dominantView, dominantLevel,
  axisChain, feedbackKind, receptorMechanism, interactionKind, hormoneIndex,
  VIEWS, LEVELS,
} = require('./main');

const db = load();
const units = chapterUnits(db);
const meta = chapterMeta(db);

test('本章 12 个知识单元落在 4 个节里，章名与章号对得上', () => {
  assert.strictEqual(units.length, 12);
  assert.strictEqual(sectionsOf(units).length, 4);
  assert.strictEqual(meta.no, '9');
  assert.match(meta.title, /内分泌/);
});

test('本章教材字数 = 20631，与逐单元 hanzi 之和一致', () => {
  assert.strictEqual(meta.hanzi, 20631);
  assert.strictEqual(units.reduce((n, u) => n + u.hanzi, 0), 20631);
});

test('数值零容忍：12 个单元 valueLike 合计为 0', () => {
  for (const u of units) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值型表述`);
  assert.strictEqual(aggregate(units).valueLike, 0);
});

test('三视角合计 = 107/546/105，四层级合计 = 160/40/68/72', () => {
  const agg = aggregate(units);
  assert.deepStrictEqual(agg.views, { 代谢: 107, 机能: 546, 形态: 105 });
  assert.deepStrictEqual(agg.levels, { 细胞: 160, 组织: 40, 器官: 68, 系统: 72 });
  for (const k of VIEWS) assert.strictEqual(agg.views[k], units.reduce((n, u) => n + u.measure.views[k], 0));
  for (const k of LEVELS) assert.strictEqual(agg.levels[k], units.reduce((n, u) => n + u.measure.levels[k], 0));
});

test('本章重心在细胞层：细胞最高、组织最低', () => {
  const agg = aggregate(units);
  assert.strictEqual(agg.levels['细胞'], Math.max(...LEVELS.map((k) => agg.levels[k])));
  assert.strictEqual(agg.levels['组织'], Math.min(...LEVELS.map((k) => agg.levels[k])));
  assert.ok(agg.views['机能'] > agg.views['代谢']);
});

test('调节链四层，输出方式分体液与神经两条', () => {
  const chain = axisChain();
  assert.strictEqual(chain.length, 4);
  assert.deepStrictEqual(chain.map((n) => n.层), ['下丘脑', '腺垂体', '靶腺', '外周组织']);
  assert.match(chain[0].输出, /门脉系统/);
  assert.match(chain[0].输出, /神经纤维/);
  assert.match(chain[1].输出, /促激素/);
});

test('反馈三类按「谁反馈给谁」归类，不是按强弱', () => {
  assert.strictEqual(feedbackKind('靶腺', '下丘脑'), '长反馈');
  assert.strictEqual(feedbackKind('靶腺', '腺垂体'), '长反馈');
  assert.strictEqual(feedbackKind('腺垂体', '下丘脑'), '短反馈');
  assert.strictEqual(feedbackKind('下丘脑', '下丘脑'), '超短反馈');
  assert.strictEqual(new Set([feedbackKind('靶腺', '下丘脑'), feedbackKind('腺垂体', '下丘脑'), feedbackKind('下丘脑', '下丘脑')]).size, 3);
  assert.throws(() => feedbackKind('外周组织', '下丘脑'), /反馈只认/);
});

test('受体位置由溶解性决定：水溶性走膜受体与信使，脂溶性走胞内受体与基因表达', () => {
  const w = receptorMechanism('水溶性');
  const l = receptorMechanism('脂溶性');
  assert.match(w.受体位置, /膜/);
  assert.match(w.中介, /信使/);
  assert.match(l.受体位置, /核内/);
  assert.match(l.中介, /基因表达/);
  assert.throws(() => receptorMechanism('两亲性'), /溶解性只取/);
});

test('三种相互作用必须齐备，允许作用不得与协同混为一谈', () => {
  assert.match(interactionKind('允许'), /提供条件/);
  assert.match(interactionKind('拮抗'), /相反/);
  assert.match(interactionKind('协同'), /加强/);
  assert.throws(() => interactionKind('增强'), /相互作用只取/);
});

test('激素索引只写来源与靶与方向，字段里不含剂量或浓度', () => {
  const idx = hormoneIndex();
  assert.ok(idx.length >= 7);
  for (const h of idx) {
    assert.ok(h.名称 && h.来源 && h.靶 && h.方向, `${h.名称} 字段不全`);
    assert.ok(!/浓度|剂量|参考值/.test(h.方向), `${h.名称} 的方向里出现越界用语`);
  }
  assert.ok(idx.some((h) => h.名称 === '抗利尿激素' && /神经垂体/.test(h.来源)));
});

test('主视角与主层级判定：9.1.3 机制属形态与细胞，9.4.1 胰岛素属机能', () => {
  const a = units.find((u) => u.sub === '9.1.3');
  const b = units.find((u) => u.sub === '9.4.1');
  assert.strictEqual(dominantView(a), '形态');
  assert.strictEqual(dominantLevel(a), '细胞');
  assert.strictEqual(dominantView(b), '机能');
  assert.throws(() => chapterUnits(db, '99'), /没有第99章/);
});
