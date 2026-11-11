'use strict';
/**
 * 第 1 章 · 一部 1909 年的书为什么叫「衷中参西」
 *
 *   node code/main.js
 *
 * 数据：standards/zhongcan-xilu/units.json（外源·笈成文字化本，534 单元）
 * 本章取其中 3 个单元（PICKS 按 locator 精确命中），所有数字由本文件现算。
 * docs/zh.md 抄的就是这里的结果 —— 不同源就过不了 code/main.test.js。
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const U = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/zhongcan-xilu/units.json'), 'utf8'));
const BY_LOC = new Map(U.units.map((u) => [u.locator, u]));

const PICKS = [
  "医学衷中参西录·二、药物·1．石膏解",
  "医学衷中参西录·三、医论·1．六经总论",
  "医学衷中参西录·四、医话·15．驳方书贵阳抑阴论"
];

const units = PICKS.map((loc) => {
  const u = BY_LOC.get(loc);
  if (!u) throw new Error('units.json 里没有 ' + loc);
  return u;
});

/** 组成行：药名（剂量）连写 → 药名序列 */
function herbs() {
  const out = [];
  for (const u of units) {
    for (const line of u.body.split('\n')) {
      const found = [...line.matchAll(/([\u4e00-\u9fff]{1,4})（(?:[一二三四五六七八九十百半]+|\d+(?:\.\d+)?)[钱兩两分斤枚个片寸]/g)];
      if (found.length >= 2) out.push(...found.map((m) => m[1]));
    }
  }
  return out;
}

const body = () => units.map((u) => u.body).join('');

function stats() {
  const b = body();
  return {
    units: units.length,
    hanzi: units.reduce((n, u) => n + u.hanzi, 0),
    dose: (b.match(/(?:[一二三四五六七八九十百半]+|\d+(?:\.\d+)?)\s*(?:两|兩|钱|錢|分|斤|枚|个|片|寸)/g) || []).length,
    xi: units.reduce((n, u) => n + u.measure.views['参西'], 0),
    cites: new Set((b.match(/《([^》]{2,20})》/g) || [])).size,
  };
}

function herbTop(n = 6) {
  const c = new Map();
  for (const h of herbs()) c.set(h, (c.get(h) || 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

/** 医案五段式覆盖率（只在含医案的章有意义，其余章 total 为 0） */
function segments() {
  const keys = ['病因', '证候', '诊断', '处方', '效果'];
  const cases = units.filter((u) => u.sec === '五、医案');
  const hit = Object.fromEntries(keys.map((k) => [k, cases.filter((u) => u.body.includes(k)).length]));
  return { total: cases.length, hit };
}

/** 参西最密的单元 */
function xiTop(n = 5) {
  return units.slice().sort((a, b) => b.measure.views['参西'] - a.measure.views['参西']).slice(0, n)
    .map((u) => [u.title, u.measure.views['参西']]);
}

module.exports = { U, PICKS, units, stats, herbs, herbTop, segments, xiTop, body };

if (require.main === module) {
  const s = stats();
  console.log('');
  console.log('═══ 第 1 章 · 一部 1909 年的书为什么叫「衷中参西」 ═══');
  console.log('  单元 ' + s.units + ' · 汉字 ' + s.hanzi.toLocaleString() + ' · 剂量命中 ' + s.dose + ' · 参西 ' + s.xi + ' · 引书 ' + s.cites + ' 部');
  console.log('\n── 药物频次 top ──');
  for (const [h, c] of herbTop()) console.log('  ' + h + '  ' + c + ' 次');
  const seg = segments();
  if (seg.total) {
    console.log('\n── 医案五段式（' + seg.total + ' 案）──');
    for (const [k, v] of Object.entries(seg.hit)) console.log('  ' + k + '  ' + v + '/' + seg.total);
  }
  console.log('\n── 参西最密 ──');
  for (const [t, c] of xiTop()) console.log('  ' + t + '  ' + c);
  console.log('');
  console.log('  边界：本输出为文本结构与药物频次统计，逐条可回查 units.json，不构成诊疗依据。');
}
