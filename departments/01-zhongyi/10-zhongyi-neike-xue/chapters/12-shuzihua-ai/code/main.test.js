'use strict';
/**
 * 第 12 章的单测：八小节两两成对、零证—方对（正确结果）、证候要素 24、编码 4 种、三元组 6 个。
 * 这一章最容易出错的地方是把「没有辨证论治」当成抽取失败 —— 测试专门锁住这一点。
 */
const assert = require('node:assert');
const test = require('node:test');
const {
  chap, subs, shape, pairing, hasSyndromeSection, elements, codes,
  standards, triples, layers, boundaryWords, spread, totals,
} = require('./main.js');

test('章的规模：4 节 · 8 小节 · 11503 汉字 · 量值 5', () => {
  const t = totals();
  assert.strictEqual(t.secs, 4);
  assert.strictEqual(t.subs, 8);
  assert.strictEqual(t.hanzi, 11503);
  assert.strictEqual(t.valueLike, 5);
});

test('八小节两两成对：每节恰好 2 个小节', () => {
  const p = pairing();
  assert.strictEqual(p.length, 4);
  for (const s of p) {
    assert.strictEqual(s.n, 2);
    assert.strictEqual(s.pair, true);
  }
  assert.deepStrictEqual(p.map((s) => s.no), ['12.1', '12.2', '12.3', '12.4']);
});

test('本章没有辨证论治／证治，证—方对为 0 —— 这是正确结果', () => {
  assert.strictEqual(hasSyndromeSection(), false);
  assert.strictEqual(totals().pairs, 0);
  const titles = subs().map((u) => u.title).join('|');
  assert.ok(!/辨证论治|证治|代表方/.test(titles));
});

test('证候要素 24 个：病位 8 · 病性 16', () => {
  const e = elements();
  assert.deepStrictEqual(e.position, ['心', '肝', '脾', '肺', '肾', '胃', '肠', '胆']);
  assert.strictEqual(e.positionCount, 8);
  assert.strictEqual(e.natureCount, 16);
  assert.deepStrictEqual(e.nature, ['风', '寒', '暑', '湿', '燥', '火', '气滞', '血瘀', '痰', '饮', '水停', '气虚', '血虚', '阴虚', '阳虚', '精亏']);
  assert.strictEqual(totals().elements, 24);
});

test('ICD-11 形态编码：出现 7 次，去重 4 种（8B20 / 7A00 / SA00 / SE10）', () => {
  const c = codes();
  assert.strictEqual(c.n, 7);
  assert.strictEqual(c.distinctN, 4);
  assert.deepStrictEqual(c.distinct.sort(), ['7A00', '8B20', 'SA00', 'SE10']);
});

test('标准与工具名的出现次数：ICD-11 6 · GB/T 16751.2 5 · Neo4j 3 · RAG 3', () => {
  const m = Object.fromEntries(standards().map((x) => [x.w, x.n]));
  assert.strictEqual(m['ICD-11'], 6);
  assert.strictEqual(m['GB/T 16751.2'], 5);
  assert.strictEqual(m['Neo4j'], 3);
  assert.strictEqual(m['RAG'], 3);
  assert.strictEqual(m['TM1'], 1);
});

test('三元组样板 6 个，谓词为辨证为 / 治以 / 主方 / 含', () => {
  const t = triples();
  assert.strictEqual(t.n, 6);
  const p = Object.fromEntries(t.predicates.map((x) => [x.p, x.n]));
  assert.deepStrictEqual(p, { 辨证为: 1, 治以: 2, 主方: 1, 含: 2 });
  assert.ok(t.samples[0].includes('胸痹，辨证为，心血瘀阻证'));
});

test('平台四层齐备：基础设施层 / 数据层 / 服务层 / 应用层', () => {
  const l = layers();
  assert.strictEqual(l.length, 4);
  for (const x of l) assert.strictEqual(x.hit, true, `${x.n} 未出现`);
});

test('边界词：溯源 21 · 必须 13 · 以医者为准 7 · 可辅助参考 5 · 不得 5 · 不能 5', () => {
  const m = Object.fromEntries(boundaryWords().map((x) => [x.w, x.n]));
  assert.strictEqual(m['溯源'], 21);
  assert.strictEqual(m['必须'], 13);
  assert.strictEqual(m['以医者为准'], 7);
  assert.strictEqual(m['可辅助参考'], 5);
  assert.strictEqual(m['不得'], 5);
  assert.strictEqual(m['不能'], 5);
});

test('八小节字数：合计 13243，最长 12.1.1（1729），最短 12.3.1（1605）', () => {
  const s = spread();
  assert.strictEqual(s.total, 13243);
  assert.deepStrictEqual([s.max.no, s.max.chars], ['12.1.1', 1729]);
  assert.deepStrictEqual([s.min.no, s.min.chars], ['12.3.1', 1605]);
  assert.strictEqual(s.rows.length, 8);
});

test('每个小节 1 个条目，正文都长于 1500 字', () => {
  for (const u of subs()) {
    assert.strictEqual(u.items.length, 1, `${u.no} 条目数异常`);
    assert.ok(u.items[0].body.length > 1500, `${u.no} 正文过短`);
  }
});
