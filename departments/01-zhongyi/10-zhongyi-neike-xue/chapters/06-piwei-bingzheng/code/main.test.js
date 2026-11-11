#!/usr/bin/env node
/**
 * 第 6 章 脾胃系病证 —— 确定性单元测试
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
  '6.1.1', '6.1.2', '6.1.3', '6.1.4', '6.1.5',
  '6.2.1', '6.2.2', '6.2.3', '6.2.4', '6.2.5',
  '6.3.1', '6.3.2', '6.3.3', '6.3.4', '6.3.5',
  '6.4.1', '6.4.2', '6.4.3', '6.4.4', '6.4.5',
  '6.5.1', '6.5.2', '6.5.3', '6.5.4', '6.5.5',
  '6.6.1', '6.6.2', '6.6.3', '6.6.4', '6.6.5',
  '6.7.1', '6.7.2', '6.7.3', '6.7.4', '6.7.5',
  '6.8.1', '6.8.2', '6.8.3', '6.8.4', '6.8.5',
  '6.9.1', '6.9.2', '6.9.3', '6.9.4', '6.9.5',
];

test('本章 9 节 45 小节，正文合计 38439 汉字', () => {
  const s = shape(chap);
  assert.strictEqual(s.secs, 9);
  assert.strictEqual(s.subs, 45);
  assert.strictEqual(s.hanzi, 38439);
  assert.deepStrictEqual(subs.map((u) => u.no), SUBS);
  assert.strictEqual(new Set(SUBS).size, 45);
});

test('九病各 5 小节，五段模板一篇不缺', () => {
  for (const s of chap.secs) {
    assert.deepStrictEqual(
      s.subs.map((u) => u.title),
      ['概述', '病因病机', '辨证论治', '预防调护', '按语'],
      `${s.no} ${s.title} 的小节次序`,
    );
  }
});

test('逐病证字数：胃痛 4884 最厚，呃逆 3858 最薄；九篇皆过三千八百字', () => {
  const secs = sectionStats(chap);
  assert.deepStrictEqual(secs.map((x) => x.no), ['6.1', '6.2', '6.3', '6.4', '6.5', '6.6', '6.7', '6.8', '6.9']);
  assert.deepStrictEqual(secs.map((x) => x.hanzi), [4884, 4268, 4413, 3911, 3858, 4247, 4223, 4167, 4468]);
  assert.deepStrictEqual(secs.map((x) => x.title), ['胃痛', '痞满', '呕吐', '噎膈', '呃逆', '腹痛', '泄泻', '痢疾', '便秘']);
  for (const x of secs) assert.ok(x.hanzi > 3800, `${x.no} 只有 ${x.hanzi} 字`);
});

test('辨证论治占各篇四到五成，五篇达五成', () => {
  const secs = sectionStats(chap);
  assert.deepStrictEqual(secs.map((x) => x.cheng), [5, 4, 5, 4, 4, 4, 5, 5, 5]);
  assert.deepStrictEqual(secs.map((x) => x.bianzheng), [2258, 1881, 2100, 1517, 1630, 1907, 1933, 1944, 2119]);
  assert.strictEqual(secs.filter((x) => x.cheng === 5).length, 5);
});

test('证型清点：54 个证型，胃痛·呕吐·便秘各 7 证居首，噎膈 4 证最简', () => {
  const syn = syndromeAudit(chap);
  assert.deepStrictEqual(syn.map((x) => x.sec), ['6.1', '6.2', '6.3', '6.4', '6.5', '6.6', '6.7', '6.8', '6.9']);
  assert.deepStrictEqual(syn.map((x) => x.count), [7, 6, 7, 4, 5, 6, 6, 6, 7]);
  assert.strictEqual(syn.reduce((n, x) => n + x.count, 0), 54);
  // 噎膈四证即四期，证型谱是线性的
  assert.deepStrictEqual(syn.find((x) => x.sec === '6.4').names,
    ['痰气交阻证', '瘀血内结证', '津亏热结证', '气虚阳微证']);
});

test('代表方：54 次、45 首，5 首跨病证复用（保和丸跨四病）', () => {
  const fx = formulaAudit(chap);
  assert.strictEqual(fx.total, 54);
  assert.strictEqual(fx.distinct, 45);
  assert.strictEqual(fx.reused.length, 5);
  assert.deepStrictEqual(fx.reused.map((r) => r.name).sort(), [
    '保和丸', '柴胡疏肝散', '藿香正气散', '理中汤', '益胃汤',
  ].sort());
  const baohe = fx.reused.find((r) => r.name === '保和丸');
  assert.deepStrictEqual(baohe.secs.sort(), ['6.1', '6.2', '6.3', '6.7']);
  assert.strictEqual(fx.total, syndromeAudit(chap).reduce((n, x) => n + x.count, 0));
});

test('病机词频：食 496 居首，虚 390 次之，热 266 多于寒 237', () => {
  const w = keywordCounts(chap);
  assert.deepStrictEqual(KEYWORDS.map((k) => k.key), ['虚', '实', '寒', '热', '湿', '食', '逆']);
  assert.deepStrictEqual(w.map((x) => x.key), ['食', '虚', '热', '寒', '湿', '实', '逆']);
  assert.deepStrictEqual(w.map((x) => x.total), [496, 390, 266, 237, 179, 162, 157]);
  assert.strictEqual(w[0].key, '食', '本章出现频次最高的病机词应是食');
});

test('病位词频：脾 257 为轴，肝 106 超过心 91；出口两病的概述与调护不提脾胃', () => {
  const o = organCounts(chap);
  assert.deepStrictEqual(ORGANS, ['心', '肝', '脾', '肺', '肾']);
  assert.deepStrictEqual(o.map((x) => x.total), [91, 106, 257, 23, 64]);
  assert.ok(o[1].total > o[0].total, '脾胃一章里肝应多于心');
  assert.strictEqual(keywordHits(chap, '胃').per.length, 43);
  assert.strictEqual(keywordHits(chap, '脾').per.length, 38);
  // 6.8.1 痢疾概述与 6.9.4 便秘调护通篇只讲肠腑，脾胃二字皆无
  const noPiwei = subs.filter((u) => !bodyOf(u).includes('脾') && !bodyOf(u).includes('胃')).map((u) => u.no);
  assert.deepStrictEqual(noPiwei, ['6.8.1', '6.9.4']);
});

test('调护与按语：4873 + 5599 字，按语每篇均 622 字，合计占全章 2.7 成', () => {
  const t = tailShare(chap);
  assert.strictEqual(t.care, 4873);
  assert.strictEqual(t.anYu, 5599);
  assert.strictEqual(t.cheng, 2.7);
  assert.strictEqual(t.careAvg, 541);
  assert.strictEqual(t.anYuAvg, 622);
});

test('量值核验：45 小节正文命中 1 处，且落在 6.9.4 的生活调护', () => {
  const v = valueAudit(chap);
  assert.strictEqual(v.subs, 45);
  assert.strictEqual(v.hits, 1);
  assert.deepStrictEqual(v.offenders.map((o) => o.sub), ['6.9.4']);
});

test('小节两端：最薄 6.2.4（515 字），最厚 6.1.3（2258 字）——厚在证治，薄在调护', () => {
  assert.deepStrictEqual(extremes(chap), {
    thinnest: { sub: '6.2.4', hanzi: 515 },
    thickest: { sub: '6.1.3', hanzi: 2258 },
  });
  assert.strictEqual(hanzi(bodyOf(subs.find((u) => u.no === '6.1.1'))), 772);
});
