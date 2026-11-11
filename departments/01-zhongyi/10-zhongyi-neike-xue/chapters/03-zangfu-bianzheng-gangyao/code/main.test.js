#!/usr/bin/env node
/**
 * 第 3 章 脏腑辨证纲要与内科治则 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、逐节字数、三件套模板的齐备、每节最厚格、
 * 「纲」的分布、术语词频、量值是否为 0。
 * 不锁正文措辞，底本改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  KINDS,
  TERMS,
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
  thickestPerSection,
  gangAudit,
  termCounts,
  valueAudit,
  extremes,
} = require('./main');

const base = load();
const chap = chapter(base);
const subs = subsOf(chap);

test('本章 8 节 25 小节，正文合计 21814 汉字', () => {
  const s = shape(chap);
  assert.strictEqual(s.secs, 8);
  assert.strictEqual(s.subs, 25);
  assert.strictEqual(s.hanzi, 21814);
  assert.deepStrictEqual(subs.map((u) => u.no), [
    '3.1.1', '3.1.2', '3.1.3', '3.2.1', '3.2.2', '3.2.3', '3.3.1', '3.3.2', '3.3.3',
    '3.4.1', '3.4.2', '3.4.3', '3.5.1', '3.5.2', '3.5.3', '3.6.1', '3.6.2', '3.6.3',
    '3.7.1', '3.7.2', '3.7.3', '3.8.1', '3.8.2', '3.8.3', '3.8.4',
  ]);
});

test('逐节字数 2781 / 2400 / 2738 / 2806 / 2436 / 3199 / 2367 / 3087', () => {
  const secs = sectionStats(chap);
  assert.deepStrictEqual(secs.map((x) => x.no), ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8']);
  assert.deepStrictEqual(secs.map((x) => x.subs), [3, 3, 3, 3, 3, 3, 3, 4]);
  assert.deepStrictEqual(secs.map((x) => x.hanzi), [2781, 2400, 2738, 2806, 2436, 3199, 2367, 3087]);
});

test('三件套模板：前六节都齐 生理 / 证候 / 辨治，3.7 与 3.8 不是三件套', () => {
  const t = templateAudit(chap);
  assert.strictEqual(t.length, 8);
  assert.deepStrictEqual(t.filter((x) => x.full).map((x) => x.no),
    ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6']);
  for (const x of t.slice(0, 6)) assert.deepStrictEqual(x.kinds, ['生理', '证候', '辨治'], x.no);
  assert.deepStrictEqual(t[6].kinds, ['外感', '外感', '外感']);
  assert.deepStrictEqual(t[7].kinds, ['兼夹', '兼夹', '兼夹', '兼夹']);
  assert.deepStrictEqual(KINDS.map((k) => k.key), ['生理', '证候', '辨治', '外感', '兼夹']);
});

test('每节最厚的那一格：五节是「证候」，心系例外（辨治要点更厚）', () => {
  const th = thickestPerSection(chap);
  assert.deepStrictEqual(th.map((x) => x.no), ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8']);
  const six = th.slice(0, 6).map((x) => x.top.sub);
  assert.deepStrictEqual(six, ['3.1.2', '3.2.3', '3.3.2', '3.4.2', '3.5.2', '3.6.2']);
  const byKind = six.map((s) => kindOf(subs.find((u) => u.no === s)));
  assert.deepStrictEqual(byKind, ['证候', '辨治', '证候', '证候', '证候', '证候']);
  assert.strictEqual(byKind.filter((k) => k === '证候').length, 5);
});

test('小节字数逐条可对账；最薄 3.8.1，最厚 3.4.2', () => {
  assert.deepStrictEqual(subs.map((u) => hanzi(bodyOf(u))), [
    806, 1177, 798, 809, 764, 827, 809, 1127, 802,
    769, 1268, 769, 773, 884, 779, 1138, 1258, 803,
    791, 780, 796, 732, 807, 780, 768,
  ]);
  assert.deepStrictEqual(extremes(chap), {
    thinnest: { sub: '3.8.1', hanzi: 732 },
    thickest: { sub: '3.4.2', hanzi: 1268 },
  });
});

test('「为纲」14 次，落在 11 个小节；五系的纲都在其中', () => {
  const g = gangAudit(chap);
  assert.strictEqual(g.count, 14);
  assert.strictEqual(g.of, 25);
  assert.deepStrictEqual(g.subs,
    ['3.1.1', '3.1.3', '3.2.3', '3.3.1', '3.3.3', '3.4.1', '3.4.3', '3.7.1', '3.7.2', '3.7.3', '3.8.1']);
  for (const s of ['3.1.3', '3.2.3', '3.3.3', '3.4.3']) {
    assert.ok(g.subs.includes(s), `${s} 未写「为纲」`);
  }
  // 肾系是唯一的例外：它不用「为纲」，而写成「当遵…之原则」——
  // 「以补为主」是有例外的原则，不是无例外的纲，措辞本身就在提示这一点
  assert.ok(!g.subs.includes('3.5.3'), '3.5.3 未使用「为纲」措辞');
  assert.ok(bodyOf(subs.find((u) => u.no === '3.5.3')).includes('之原则'));
});

test('术语词频：治法 52 · 虚实 31 · 传变 23 · 证候 22 · 标本 20 · 疏泄 18 · 升降 13 · 纳气 12 · 病位 10 · 宣降 9', () => {
  const t = termCounts(chap);
  assert.strictEqual(TERMS.length, 10);
  assert.deepStrictEqual(t.map((x) => x.key),
    ['治法', '虚实', '传变', '证候', '标本', '疏泄', '升降', '纳气', '病位', '宣降']);
  assert.deepStrictEqual(t.map((x) => x.total), [52, 31, 23, 22, 20, 18, 13, 12, 10, 9]);
  assert.strictEqual(t[0].key, '治法', '本章落点应是治法');
});

test('三组词都在：结构组、功能组、复合组各不少于三个词', () => {
  const groups = {};
  for (const x of TERMS) groups[x.group] = (groups[x.group] || 0) + 1;
  assert.deepStrictEqual(Object.keys(groups).sort(), ['功能', '复合', '结构']);
  for (const g of Object.keys(groups)) assert.ok(groups[g] >= 3, `${g}组不足三个词`);
  // 「疏泄」18 次里有 17 次落在肝系两节——功能词是按系分布的，不是全章均匀
  const shu = keywordHits(chap, '疏泄');
  assert.strictEqual(shu.total, 18);
  assert.strictEqual(shu.per.filter((x) => x.sub.startsWith('3.4')).reduce((n, x) => n + x.hits, 0), 17);
});

test('量值核验：25 小节正文的数字＋单位命中 0 处', () => {
  const v = valueAudit(chap);
  assert.strictEqual(v.subs, 25);
  assert.strictEqual(v.hits, 0);
  assert.deepStrictEqual(v.offenders, []);
});
