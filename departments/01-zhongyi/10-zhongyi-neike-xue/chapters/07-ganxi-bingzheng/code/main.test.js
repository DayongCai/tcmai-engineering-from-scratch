#!/usr/bin/env node
/**
 * 第 7 章 肝系病证 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、逐病证字数、证型清点、方剂复用、病机与病位词频、
 * 调护与按语占比、量值是否为 1（且只落在调护节）。不锁正文措辞。
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
  '7.1.1', '7.1.2', '7.1.3', '7.1.4', '7.1.5',
  '7.2.1', '7.2.2', '7.2.3', '7.2.4', '7.2.5',
  '7.3.1', '7.3.2', '7.3.3', '7.3.4', '7.3.5',
  '7.4.1', '7.4.2', '7.4.3', '7.4.4', '7.4.5',
  '7.5.1', '7.5.2', '7.5.3', '7.5.4', '7.5.5',
  '7.6.1', '7.6.2', '7.6.3', '7.6.4', '7.6.5',
  '7.7.1', '7.7.2', '7.7.3', '7.7.4', '7.7.5', '7.7.6', '7.7.7', '7.7.8',
  '7.8.1', '7.8.2', '7.8.3', '7.8.4', '7.8.5',
  '7.9.1', '7.9.2', '7.9.3', '7.9.4', '7.9.5',
];

test('本章 9 节 48 小节，正文合计 37483 汉字', () => {
  const s = shape(chap);
  assert.strictEqual(s.secs, 9);
  assert.strictEqual(s.subs, 48);
  assert.strictEqual(s.hanzi, 37483);
  assert.deepStrictEqual(subs.map((u) => u.no), SUBS);
  assert.strictEqual(new Set(SUBS).size, 48);
});

test('八篇五小节，中风一篇八小节——辨证论治被拆成辨证要点与三期证治', () => {
  assert.deepStrictEqual(chap.secs.map((s) => s.subs.length), [5, 5, 5, 5, 5, 5, 8, 5, 5]);
  assert.deepStrictEqual(chap.secs[6].subs.map((u) => u.title), [
    '概述', '病因病机', '辨证要点', '中经络证治', '中脏腑证治', '恢复期证治', '预防调护', '按语',
  ]);
  for (const s of chap.secs.filter((x) => x.no !== '7.7')) {
    assert.deepStrictEqual(s.subs.map((u) => u.title),
      ['概述', '病因病机', '辨证论治', '预防调护', '按语'], `${s.no} 的小节次序`);
  }
});

test('逐病证字数：中风 4963 与头痛 4640 最厚，瘿病 3711 最薄', () => {
  const secs = sectionStats(chap);
  assert.deepStrictEqual(secs.map((x) => x.no), ['7.1', '7.2', '7.3', '7.4', '7.5', '7.6', '7.7', '7.8', '7.9']);
  assert.deepStrictEqual(secs.map((x) => x.hanzi), [3850, 4211, 4008, 4246, 4640, 3913, 4963, 3711, 3941]);
  assert.deepStrictEqual(secs.map((x) => x.title), ['胁痛', '黄疸', '积聚', '鼓胀', '头痛', '眩晕', '中风', '瘿病', '疟疾']);
});

test('证治占比：四篇达五成，中风 2717 字为全章最多', () => {
  const secs = sectionStats(chap);
  assert.deepStrictEqual(secs.map((x) => x.cheng), [4, 5, 4, 5, 5, 4, 5, 4, 4]);
  assert.deepStrictEqual(secs.map((x) => x.bianzheng), [1623, 1960, 1767, 2066, 2513, 1751, 2717, 1570, 1747]);
  assert.strictEqual(Math.max(...secs.map((x) => x.bianzheng)), 2717);
});

test('证型清点：52 个证型，中风九证（三层各三）最多，胁痛与瘿病各四证最少', () => {
  const syn = syndromeAudit(chap);
  assert.deepStrictEqual(syn.map((x) => x.count), [4, 6, 5, 6, 8, 5, 9, 4, 5]);
  assert.strictEqual(syn.reduce((n, x) => n + x.count, 0), 52);
  const zf = syn.find((x) => x.sec === '7.7');
  assert.strictEqual(zf.count, 9);
  assert.deepStrictEqual(zf.names.filter((n) => n.startsWith('中经络')), ['中经络·风痰瘀阻证', '中经络·风阳上扰证', '中经络·阴虚风动证']);
  assert.deepStrictEqual(zf.names.filter((n) => n.startsWith('恢复期')), ['恢复期·风痰瘀阻证', '恢复期·气虚络瘀证', '恢复期·肝肾亏虚证']);
});

test('代表方：52 次、48 首，3 首跨病证复用，天麻钩藤饮跨头痛·眩晕·中风', () => {
  const fx = formulaAudit(chap);
  assert.strictEqual(fx.total, 52);
  assert.strictEqual(fx.distinct, 48);
  assert.strictEqual(fx.reused.length, 3);
  assert.deepStrictEqual(fx.reused.map((r) => r.name).sort(),
    ['天麻钩藤饮', '半夏白术天麻汤', '通窍活血汤'].sort());
  const tmgt = fx.reused.find((r) => r.name === '天麻钩藤饮');
  assert.deepStrictEqual(tmgt.secs.sort(), ['7.5', '7.6', '7.7']);
  assert.strictEqual(fx.total, syndromeAudit(chap).reduce((n, x) => n + x.count, 0));
});

test('病机词频：血 463 多于气 409，风仅 168 排第五，火 69 最少', () => {
  const w = keywordCounts(chap);
  assert.deepStrictEqual(KEYWORDS.map((k) => k.key), ['风', '气', '血', '水', '痰', '瘀', '火']);
  assert.deepStrictEqual(w.map((x) => x.key), ['血', '气', '痰', '瘀', '风', '水', '火']);
  assert.deepStrictEqual(w.map((x) => x.total), [463, 409, 194, 192, 168, 139, 69]);
  assert.strictEqual(w[0].key, '血', '肝藏血一半把血写成了本章第一主语');
  assert.ok(w.find((x) => x.key === '风').total < 200, '内风多写作复合词，风的单字频次不高');
});

test('病位词频：肝 352 为轴，脾 207 次之，肺仅 3 次；疟疾五节通篇不提肝', () => {
  const o = organCounts(chap);
  assert.deepStrictEqual(ORGANS, ['心', '肝', '脾', '肺', '肾']);
  assert.deepStrictEqual(o.map((x) => x.total), [111, 352, 207, 3, 96]);
  assert.strictEqual(o[1].organ, '肝');
  assert.strictEqual(keywordHits(chap, '肝').per.length, 40);
  const noGan = subs.filter((u) => !bodyOf(u).includes('肝')).map((u) => u.no);
  assert.deepStrictEqual(noGan, ['7.5.1', '7.7.3', '7.8.1', '7.9.1', '7.9.2', '7.9.3', '7.9.4', '7.9.5']);
});

test('调护与按语：4977 + 5046 字，各篇均五百五十余字，合计占全章 2.7 成', () => {
  const t = tailShare(chap);
  assert.strictEqual(t.care, 4977);
  assert.strictEqual(t.anYu, 5046);
  assert.strictEqual(t.cheng, 2.7);
  assert.strictEqual(t.careAvg, 553);
  assert.strictEqual(t.anYuAvg, 561);
});

test('量值核验：48 小节正文命中 1 处，且落在 7.7.8 的生活调护', () => {
  const v = valueAudit(chap);
  assert.strictEqual(v.subs, 48);
  assert.strictEqual(v.hits, 1);
  assert.deepStrictEqual(v.offenders.map((o) => o.sub), ['7.7.8']);
});

test('小节两端：最薄 7.5.1（518 字），最厚 7.5.3（2513 字）——同一篇的首尾差近五倍', () => {
  assert.deepStrictEqual(extremes(chap), {
    thinnest: { sub: '7.5.1', hanzi: 518 },
    thickest: { sub: '7.5.3', hanzi: 2513 },
  });
  assert.strictEqual(hanzi(bodyOf(subs.find((u) => u.no === '7.7.3'))), 597);
});
