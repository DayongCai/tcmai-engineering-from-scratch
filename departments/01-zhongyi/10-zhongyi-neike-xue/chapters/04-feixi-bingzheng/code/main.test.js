#!/usr/bin/env node
/**
 * 第 4 章 肺系病证 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、逐节字数、五小节模板、辨证论治最厚、
 * 证名抽取结果（肺痈为 0 是结论不是缺陷）、病名互引、病机因素词频、量值。
 * 不锁正文措辞，底本改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  KINDS,
  DISEASES,
  FACTORS,
  load,
  chapter,
  bodyOf,
  subsOf,
  hanzi,
  shape,
  sectionStats,
  keywordHits,
  kindOf,
  templateAudit,
  syndromeAudit,
  crossRef,
  factorCounts,
  thickestPerSection,
  valueAudit,
  extremes,
} = require('./main');

const base = load();
const chap = chapter(base);
const subs = subsOf(chap);

test('本章 8 节 40 小节，正文合计 38900 汉字', () => {
  const s = shape(chap);
  assert.strictEqual(s.secs, 8);
  assert.strictEqual(s.subs, 40);
  assert.strictEqual(s.hanzi, 38900);
  assert.strictEqual(subs.length, 40);
  assert.deepStrictEqual(subs[0].no, '4.1.1');
  assert.deepStrictEqual(subs[39].no, '4.8.5');
});

test('八个病证按节排列：感冒 咳嗽 哮病 喘证 肺痈 肺痨 肺胀 肺痿', () => {
  assert.deepStrictEqual(DISEASES, ['感冒', '咳嗽', '哮病', '喘证', '肺痈', '肺痨', '肺胀', '肺痿']);
  assert.deepStrictEqual(chap.secs.map((s) => s.title.replace(/^\d+\.\d+\s*/, '')), DISEASES);
});

test('逐节字数 5274 / 5571 / 5351 / 5210 / 4387 / 4290 / 4955 / 3862', () => {
  const secs = sectionStats(chap);
  assert.deepStrictEqual(secs.map((x) => x.no), ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '4.8']);
  assert.deepStrictEqual(secs.map((x) => x.subs), [5, 5, 5, 5, 5, 5, 5, 5]);
  assert.deepStrictEqual(secs.map((x) => x.hanzi), [5274, 5571, 5351, 5210, 4387, 4290, 4955, 3862]);
});

test('五小节模板：8 节全部是 概述 / 病因病机 / 辨证论治 / 预防调护 / 按语，5 × 8 = 40', () => {
  const t = templateAudit(chap);
  assert.deepStrictEqual(KINDS, ['概述', '病因病机', '辨证论治', '预防调护', '按语']);
  assert.strictEqual(t.length, 8);
  assert.strictEqual(t.filter((x) => x.ok).length, 8);
  for (const x of t) assert.deepStrictEqual(x.kinds, KINDS, x.no);
  assert.strictEqual(KINDS.length * t.length, 40);
});

test('每节最厚的一格都是「辨证论治」（8 / 8）', () => {
  const th = thickestPerSection(chap);
  assert.strictEqual(th.filter((x) => x.top.kind === '辨证论治').length, 8);
  assert.deepStrictEqual(th.map((x) => x.top.sub),
    ['4.1.3', '4.2.3', '4.3.3', '4.4.3', '4.5.3', '4.6.3', '4.7.3', '4.8.3']);
  assert.deepStrictEqual(th.map((x) => x.top.hanzi), [2306, 2907, 2768, 2702, 1859, 1838, 2503, 1283]);
});

test('证名抽取：3 / 7 / 7 / 7 / 0 / 4 / 6 / 2，合计 36；肺痈按四期分故为 0', () => {
  const syn = syndromeAudit(chap);
  assert.deepStrictEqual(syn.map((x) => x.count), [3, 7, 7, 7, 0, 4, 6, 2]);
  assert.strictEqual(syn.reduce((n, x) => n + x.count, 0), 36);
  assert.deepStrictEqual(syn[0].names, ['风寒束表证', '风热犯表证', '暑湿伤表证']);
  assert.deepStrictEqual(syn[2].names,
    ['冷哮证', '热哮证', '寒包热哮证', '风痰哮证', '虚哮证', '肺脾气虚证', '肺肾两虚证']);
  // 肺痈的 0 是结论：它以期分型
  assert.deepStrictEqual(syn[4].names, []);
  assert.deepStrictEqual(syn[4].stages, ['初期', '成痈期', '溃脓期', '恢复期']);
});

test('病名互引：咳嗽在别节被提最多（它同时是症状名）', () => {
  const c = crossRef(chap);
  assert.deepStrictEqual(c.map((x) => x.disease), DISEASES);
  assert.deepStrictEqual(c.map((x) => x.ownHits), [87, 110, 36, 38, 44, 31, 39, 55]);
  assert.deepStrictEqual(c.map((x) => x.otherHits), [19, 54, 7, 10, 15, 9, 7, 9]);
  const top = [...c].sort((a, b) => b.otherHits - a.otherHits)[0];
  assert.strictEqual(top.disease, '咳嗽');
  // 每个病名都至少在本节出现，说明节标题与正文对得上
  for (const x of c) assert.ok(x.ownHits > 0, `${x.disease} 在本节未出现`);
});

test('病机因素词频：痰 523 · 虚 434 · 热 405 · 风 169 · 饮 124 · 火 64 · 瘀 60', () => {
  const f = factorCounts(chap);
  assert.deepStrictEqual(FACTORS, ['痰', '虚', '热', '瘀', '饮', '风', '火']);
  assert.deepStrictEqual(f.map((x) => x.key), ['痰', '虚', '热', '风', '饮', '火', '瘀']);
  assert.deepStrictEqual(f.map((x) => x.total), [523, 434, 405, 169, 124, 64, 60]);
  assert.strictEqual(f[0].key, '痰', '本章的第一病理因素是痰');
});

test('小节字数逐条可对账；最薄 4.7.1，最厚 4.2.3', () => {
  assert.deepStrictEqual(extremes(chap), {
    thinnest: { sub: '4.7.1', hanzi: 588 },
    thickest: { sub: '4.2.3', hanzi: 2907 },
  });
  const total = subs.reduce((n, u) => n + hanzi(bodyOf(u)), 0);
  assert.strictEqual(total, 38900);
});

test('量值核验：正文 5 处数字＋单位，全部落在 4.2.5 与 4.7.5 的「现代认识」段', () => {
  const v = valueAudit(chap);
  assert.strictEqual(v.subs, 40);
  assert.strictEqual(v.hits, 5);
  assert.deepStrictEqual(v.offenders.map((x) => x.sub), ['4.2.5', '4.7.5']);
  // 每一处都在「现代认识」段之后——不是中医的剂量，但仍然按量值处理
  for (const o of v.offenders) {
    const b = bodyOf(subs.find((u) => u.no === o.sub));
    assert.ok(b.indexOf('现代认识') < b.search(/\d/), `${o.sub} 的量值不在现代认识段`);
  }
});

test('分类函数：五小节标题各自归到唯一的格，没有「?」', () => {
  for (const u of subs) assert.notStrictEqual(kindOf(u), '?', `${u.no} 归不进任何一格`);
  assert.strictEqual(keywordHits(chap, '鉴别').total > 0, true);
});
