#!/usr/bin/env node
/**
 * 第 8 章 肾系病证 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、逐病证字数、证型清点、方剂复用、病机与病位词频、
 * 调护与按语占比、量值是否为 3（且只落在三个调护节）。不锁正文措辞。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  KEYWORDS,
  ORGANS,
  load,
  chapter,
  subsOf,
  hanzi,
  bodyOf,
  shape,
  sectionStats,
  syndromeAudit,
  formulaAudit,
  keywordHits,
  keywordCounts,
  organCounts,
  tailShare,
  valueAudit,
  extremes,
} = require('./main');

const base = load();
const chap = chapter(base);
const subs = subsOf(chap);

const SUBS = [
  '8.1.1', '8.1.2', '8.1.3', '8.1.4', '8.1.5',
  '8.2.1', '8.2.2', '8.2.3', '8.2.4', '8.2.5',
  '8.3.1', '8.3.2', '8.3.3', '8.3.4', '8.3.5',
  '8.4.1', '8.4.2', '8.4.3', '8.4.4', '8.4.5',
  '8.5.1', '8.5.2', '8.5.3', '8.5.4', '8.5.5',
  '8.6.1', '8.6.2', '8.6.3', '8.6.4', '8.6.5',
];

test('本章 6 节 30 小节，正文合计 26217 汉字', () => {
  const s = shape(chap);
  assert.strictEqual(s.secs, 6);
  assert.strictEqual(s.subs, 30);
  assert.strictEqual(s.hanzi, 26217);
  assert.deepStrictEqual(subs.map((u) => u.no), SUBS);
  assert.strictEqual(new Set(SUBS).size, 30);
});

test('六病各 5 小节，五段模板一篇不缺', () => {
  for (const s of chap.secs) {
    assert.deepStrictEqual(s.subs.map((u) => u.title),
      ['概述', '病因病机', '辨证论治', '预防调护', '按语'], `${s.no} ${s.title} 的小节次序`);
  }
});

test('逐病证字数：水肿 5048 最厚，关格 3921 最薄；平均每小节 874 字为四章最高', () => {
  const secs = sectionStats(chap);
  assert.deepStrictEqual(secs.map((x) => x.no), ['8.1', '8.2', '8.3', '8.4', '8.5', '8.6']);
  assert.deepStrictEqual(secs.map((x) => x.hanzi), [5048, 4724, 4515, 3921, 4041, 3968]);
  assert.deepStrictEqual(secs.map((x) => x.title), ['水肿', '淋证', '癃闭', '关格', '阳痿', '遗精']);
  assert.strictEqual(Math.round(26217 / 30), 874);
});

test('证治占比：前三篇（水溺三病）各达五成，关格 1431 字最少', () => {
  const secs = sectionStats(chap);
  assert.deepStrictEqual(secs.map((x) => x.cheng), [5, 5, 5, 4, 4, 4]);
  assert.deepStrictEqual(secs.map((x) => x.bianzheng), [2358, 2232, 2035, 1431, 1593, 1573]);
  assert.strictEqual(Math.min(...secs.map((x) => x.bianzheng)), 1431);
});

test('证型清点：30 个证型，水肿 7 证最多，关格 3 证最少（危候不铺证型）', () => {
  const syn = syndromeAudit(chap);
  assert.deepStrictEqual(syn.map((x) => x.count), [7, 6, 6, 3, 4, 4]);
  assert.strictEqual(syn.reduce((n, x) => n + x.count, 0), 30);
  assert.deepStrictEqual(syn.find((x) => x.sec === '8.2').names,
    ['热淋', '石淋', '血淋', '气淋', '膏淋', '劳淋']);
  assert.deepStrictEqual(syn.find((x) => x.sec === '8.4').names,
    ['脾肾阳虚，湿浊内蕴证', '肝肾阴虚，肝风内动证', '肾气衰微，邪陷心包证']);
});

test('代表方：30 次、27 首，3 首复用且全落在溺道与精道之间', () => {
  const fx = formulaAudit(chap);
  assert.strictEqual(fx.total, 30);
  assert.strictEqual(fx.distinct, 27);
  assert.strictEqual(fx.reused.length, 3);
  assert.deepStrictEqual(fx.reused.map((r) => r.name).sort(),
    ['八正散', '沉香散', '程氏萆薢分清饮'].sort());
  // 三首复用方无一跨到水道（8.1）：水道自成一套方
  for (const r of fx.reused) assert.ok(!r.secs.includes('8.1'), `${r.name} 不应出现在水肿篇`);
  assert.strictEqual(fx.total, syndromeAudit(chap).reduce((n, x) => n + x.count, 0));
});

test('病机词频：水 298 居首，虚 204，热 193 多于湿 149，瘀 45 最少', () => {
  const w = keywordCounts(chap);
  assert.deepStrictEqual(KEYWORDS.map((k) => k.key), ['水', '精', '虚', '湿', '热', '瘀', '浊']);
  assert.deepStrictEqual(w.map((x) => x.key), ['水', '虚', '热', '精', '湿', '浊', '瘀']);
  assert.deepStrictEqual(w.map((x) => x.total), [298, 204, 193, 169, 149, 64, 45]);
  assert.strictEqual(w[0].key, '水', '肾主水，水应是本章第一主语');
});

test('病位词频：肾 324 为轴，脾 184 次之，心 167 超过肝 93；肺 60 皆为水之上源', () => {
  const o = organCounts(chap);
  assert.deepStrictEqual(ORGANS, ['心', '肝', '脾', '肺', '肾']);
  assert.deepStrictEqual(o.map((x) => x.total), [167, 93, 184, 60, 324]);
  assert.strictEqual(o[4].organ, '肾');
  assert.ok(o[0].total > o[1].total, '肾系一章里心应多于肝（心肾相交主精病）');
  assert.strictEqual(keywordHits(chap, '肾').per.length, 29);
  // 唯一不提肾的小节是阳痿调护：那一段讲的是情志、起居、饮食与房事
  assert.deepStrictEqual(subs.filter((u) => !bodyOf(u).includes('肾')).map((u) => u.no), ['8.5.4']);
});

test('调护与按语：3529 + 3933 字，每篇均 588 与 656，为四章最高', () => {
  const t = tailShare(chap);
  assert.strictEqual(t.care, 3529);
  assert.strictEqual(t.anYu, 3933);
  assert.strictEqual(t.cheng, 2.8);
  assert.strictEqual(t.careAvg, 588);
  assert.strictEqual(t.anYuAvg, 656);
});

test('量值核验：30 小节正文命中 3 处，全落在三个调护节', () => {
  const v = valueAudit(chap);
  assert.strictEqual(v.subs, 30);
  assert.strictEqual(v.hits, 3);
  assert.deepStrictEqual(v.offenders.map((o) => o.sub), ['8.1.4', '8.2.4', '8.4.4']);
  for (const o of v.offenders) {
    assert.strictEqual(subs.find((u) => u.no === o.sub).title, '预防调护', `${o.sub} 应是调护节`);
  }
});

test('小节两端：最薄 8.3.4（527 字），最厚 8.1.3（2358 字）', () => {
  assert.deepStrictEqual(extremes(chap), {
    thinnest: { sub: '8.3.4', hanzi: 527 },
    thickest: { sub: '8.1.3', hanzi: 2358 },
  });
  assert.strictEqual(hanzi(bodyOf(subs.find((u) => u.no === '8.6.1'))), 620);
});
