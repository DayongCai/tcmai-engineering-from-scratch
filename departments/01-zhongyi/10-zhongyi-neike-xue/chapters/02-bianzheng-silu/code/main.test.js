#!/usr/bin/env node
/**
 * 第 2 章 辨证论治思路与方法 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、逐节字数、三段流水线的字数、
 * 小节序号、术语词频、词组的空间分布、量值是否为 0。
 * 不锁正文措辞，底本改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  PHASES,
  TERMS,
  load,
  chapter,
  bodyOf,
  subsOf,
  hanzi,
  shape,
  sectionStats,
  keywordHits,
  phaseStats,
  termCounts,
  groupSpread,
  valueAudit,
  extremes,
} = require('./main');

const base = load();
const chap = chapter(base);
const subs = subsOf(chap);

const SUBS = [
  '2.1.1', '2.1.2', '2.1.3',
  '2.2.1', '2.2.2', '2.2.3',
  '2.3.1', '2.3.2', '2.3.3', '2.3.4', '2.3.5',
  '2.4.1', '2.4.2', '2.4.3',
  '2.5.1', '2.5.2', '2.5.3',
];

test('本章 5 节 17 小节，正文合计 17521 汉字', () => {
  const s = shape(chap);
  assert.strictEqual(s.secs, 5);
  assert.strictEqual(s.subs, 17);
  assert.strictEqual(s.hanzi, 17521);
  assert.deepStrictEqual(subs.map((u) => u.no), SUBS);
});

test('逐节字数 2959 / 3234 / 4992 / 3149 / 3187；2.3 因五条治则单列而最长', () => {
  const secs = sectionStats(chap);
  assert.deepStrictEqual(secs.map((x) => x.no), ['2.1', '2.2', '2.3', '2.4', '2.5']);
  assert.deepStrictEqual(secs.map((x) => x.subs), [3, 3, 5, 3, 3]);
  assert.deepStrictEqual(secs.map((x) => x.hanzi), [2959, 3234, 4992, 3149, 3187]);
  // 最长的节是 2.3，且它的小节均字与其它四节几乎持平
  const longest = [...secs].sort((a, b) => b.hanzi - a.hanzi)[0];
  assert.strictEqual(longest.no, '2.3');
  const avgs = secs.map((x) => x.avg);
  assert.ok(Math.max(...avgs) - Math.min(...avgs) < 100, '五节小节均字应接近');
});

test('小节字数逐条可对账；最薄 2.3.2，最厚 2.2.3', () => {
  assert.deepStrictEqual(subs.map((u) => hanzi(bodyOf(u))),
    [1015, 943, 1001, 1068, 1035, 1131, 984, 929, 1028, 1006, 1045, 1007, 1054, 1088, 1067, 1015, 1105]);
  assert.deepStrictEqual(extremes(chap), {
    thinnest: { sub: '2.3.2', hanzi: 929 },
    thickest: { sub: '2.2.3', hanzi: 1131 },
  });
});

test('三段流水线：辨 6193 · 治 8141 · 调 3187，三段之和等于全章', () => {
  const p = phaseStats(chap);
  assert.deepStrictEqual(PHASES.map((x) => x.key), ['辨', '治', '调']);
  assert.deepStrictEqual(p.map((x) => x.secs), [['2.1', '2.2'], ['2.3', '2.4'], ['2.5']]);
  assert.deepStrictEqual(p.map((x) => x.subs), [6, 8, 3]);
  assert.deepStrictEqual(p.map((x) => x.hanzi), [6193, 8141, 3187]);
  assert.strictEqual(p.reduce((n, x) => n + x.hanzi, 0), shape(chap).hanzi);
  // 治段最长，调段最短——顺序不是篇幅顺序
  assert.strictEqual([...p].sort((a, b) => b.hanzi - a.hanzi)[0].key, '治');
  assert.strictEqual([...p].sort((a, b) => a.hanzi - b.hanzi)[0].key, '调');
});

test('术语词频：辨证 49 · 证候 43 · 治法 29 · 病证 28 · 标本 23 · 病位 20 · 随访 18 · 调护 12 · 方证 6 · 治则 2', () => {
  const t = termCounts(chap);
  assert.strictEqual(TERMS.length, 10);
  assert.deepStrictEqual(t.map((x) => x.key),
    ['辨证', '证候', '治法', '病证', '标本', '病位', '随访', '调护', '方证', '治则']);
  assert.deepStrictEqual(t.map((x) => x.total), [49, 43, 29, 28, 23, 20, 18, 12, 6, 2]);
  assert.strictEqual(t[0].key, '辨证', '本章的主语应是辨证');
});

test('词组分布：调组只落在 2.5，辨组与治组贯穿全章（不是干净分段）', () => {
  const g = groupSpread(chap);
  assert.deepStrictEqual(g.map((x) => x.group), ['辨', '治', '调']);
  const tiao = g.find((x) => x.group === '调');
  assert.deepStrictEqual(tiao.secs, ['2.5']);
  assert.deepStrictEqual(tiao.words, ['调护', '随访']);
  // 辨组与治组都跨到 2.5 之前至少四节——这条事实本身就是本章要讲的判断
  for (const k of ['辨', '治']) {
    const x = g.find((v) => v.group === k);
    assert.ok(x.secs.length >= 4, `${k}组只落在 ${x.secs.length} 节`);
  }
  // 「随访」在全章只出现于 2.5
  assert.deepStrictEqual(keywordHits(chap, '随访').per.map((x) => x.sub), ['2.5.3']);
});

test('量值核验：17 小节正文的数字＋单位命中 0 处', () => {
  const v = valueAudit(chap);
  assert.strictEqual(v.subs, 17);
  assert.strictEqual(v.hits, 0);
  assert.deepStrictEqual(v.offenders, []);
});

test('2.3 的五个小节都在讲治则，五条并列而非主次（小节字数接近）', () => {
  const zhi = subs.filter((u) => u.no.startsWith('2.3.'));
  assert.strictEqual(zhi.length, 5);
  const hs = zhi.map((u) => hanzi(bodyOf(u)));
  assert.ok(Math.max(...hs) - Math.min(...hs) < 150, '五条治则的篇幅应接近');
  assert.deepStrictEqual(zhi.map((u) => u.title.replace(/^\d+\.\d+\.\d+\s*/, '')),
    ['治病求本与标本兼治', '扶正祛邪', '调整阴阳与调和气血', '三因制宜', '治未病与既病防变']);
});
