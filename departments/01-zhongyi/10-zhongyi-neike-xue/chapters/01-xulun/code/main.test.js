#!/usr/bin/env node
/**
 * 第 1 章 绪论 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、逐节字数、小节序号、术语词频、界线归属、
 * 量值是否为 0。不锁正文措辞，底本改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  TERMS,
  OUTWARD,
  INWARD,
  load,
  chapter,
  bodyOf,
  subsOf,
  hanzi,
  shape,
  sectionStats,
  keywordHits,
  termCounts,
  boundaryAudit,
  valueAudit,
  extremes,
} = require('./main');

const base = load();
const chap = chapter(base);
const subs = subsOf(chap);

const SUBS = ['1.1.1', '1.1.2', '1.2.1', '1.2.2', '1.3.1', '1.3.2'];

test('本章 3 节 6 小节，正文合计 6920 汉字', () => {
  const s = shape(chap);
  assert.strictEqual(s.secs, 3);
  assert.strictEqual(s.subs, 6);
  assert.strictEqual(s.hanzi, 6920);
  assert.deepStrictEqual(subs.map((u) => u.no), SUBS);
});

test('每节恰 2 个小节；三节字数 2432 / 2274 / 2214，几乎均分', () => {
  const secs = sectionStats(chap);
  assert.deepStrictEqual(secs.map((x) => x.no), ['1.1', '1.2', '1.3']);
  for (const x of secs) assert.strictEqual(x.subs, 2, `${x.no} 小节数`);
  assert.deepStrictEqual(secs.map((x) => x.hanzi), [2432, 2274, 2214]);
  const hs = secs.map((x) => x.hanzi);
  assert.ok(Math.max(...hs) - Math.min(...hs) < Math.min(...hs) / 10, '三节应几乎均分');
  assert.deepStrictEqual(secs.map((x) => x.avg), [1216, 1137, 1107]);
});

test('小节字数逐条可对账；最薄 1.3.1，最厚 1.1.1', () => {
  assert.deepStrictEqual(subs.map((u) => hanzi(bodyOf(u))), [1241, 1191, 1100, 1174, 1090, 1124]);
  assert.deepStrictEqual(extremes(chap), {
    thinnest: { sub: '1.3.1', hanzi: 1090 },
    thickest: { sub: '1.1.1', hanzi: 1241 },
  });
});

test('术语词频：病证 46 · 辨证论治 20 · 证候 20 · 方药 19 · 病机 17 · 教材 13 · 治法 9 · 伤寒 6 · 整体观念 4 · 内经 2', () => {
  const t = termCounts(chap);
  assert.strictEqual(TERMS.length, 10);
  assert.deepStrictEqual(t.map((x) => x.key), [
    '病证', '辨证论治', '证候', '方药', '病机', '教材', '治法', '伤寒', '整体观念', '内经',
  ]);
  assert.deepStrictEqual(t.map((x) => x.total), [46, 20, 20, 19, 17, 13, 9, 6, 4, 2]);
  assert.strictEqual(t[0].key, '病证', '本章的主语应是病证');
});

test('词表分三组：界定组与落数组夹住来路组（每组的词都在）', () => {
  const groups = new Set(TERMS.map((x) => x.group));
  assert.deepStrictEqual([...groups].sort(), ['元词', '来路', '界定', '落数']);
  for (const g of ['界定', '来路', '落数']) {
    assert.ok(TERMS.filter((x) => x.group === g).length >= 3, `${g} 组应至少 3 个词`);
  }
  // 「病证」是分布最广的词：6 个小节无一缺
  assert.strictEqual(keywordHits(chap, '病证').per.length, 6);
  assert.strictEqual(keywordHits(chap, '证候').per.length, 6);
  // 「辨证论治」散在 5 个小节，缺的正好是讲技术载体的 1.3.2
  assert.deepStrictEqual(keywordHits(chap, '辨证论治').per.map((x) => x.sub),
    ['1.1.1', '1.1.2', '1.2.1', '1.2.2', '1.3.1']);
});

test('界线审计：向外四门、向内五系都出现在正文里，主战场在 1.1', () => {
  const b = boundaryAudit(chap);
  assert.deepStrictEqual(OUTWARD, ['外科', '妇科', '儿科', '西医']);
  assert.deepStrictEqual(INWARD, ['肺系', '心系', '脾胃系', '肝胆系', '肾系']);
  for (const x of [...b.outward, ...b.inward]) {
    assert.ok(x.subs.length > 0, `${x.word} 未出现在任何小节`);
    assert.ok(x.subs.includes('1.1.1') || x.subs.includes('1.1.2'), `${x.word} 的界线句不在 1.1`);
  }
  assert.deepStrictEqual(b.subs, SUBS);
});

test('量值核验：6 小节正文的数字＋单位命中 0 处', () => {
  const v = valueAudit(chap);
  assert.strictEqual(v.subs, 6);
  assert.strictEqual(v.hits, 0);
  assert.deepStrictEqual(v.offenders, []);
});

test('倒数第二节（1.3.2）字数不少于最薄节，说明技术那节不是附论', () => {
  const last = subs[subs.length - 1];
  assert.strictEqual(last.no, '1.3.2');
  assert.ok(hanzi(bodyOf(last)) > 1000, '1.3.2 不应被写成一段提示语');
});
