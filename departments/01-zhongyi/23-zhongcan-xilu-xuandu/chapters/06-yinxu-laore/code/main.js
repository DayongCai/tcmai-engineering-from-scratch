'use strict';
/**
 * 第 6 章 · 阴虚劳热：资生汤与十全育真汤的方证结构
 *
 *   node code/main.js
 *
 * 数据：standards/zhongcan-xilu/units.json（外源·笈成文字化本，534 单元）
 * 本章取其中 11 个单元（PICKS 按 locator 精确命中），所有数字由本文件现算。
 * docs/zh.md 抄的就是这里的结果 —— 不同源就过不了 code/main.test.js。
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const U = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/zhongcan-xilu/units.json'), 'utf8'));
const BY_LOC = new Map(U.units.map((u) => [u.locator, u]));

const PICKS = [
  "医学衷中参西录·一、医方·（一）治阴虚劳热方·1．资生汤",
  "医学衷中参西录·一、医方·（一）治阴虚劳热方·2．十全育真汤",
  "医学衷中参西录·一、医方·（一）治阴虚劳热方·3．醴泉饮",
  "医学衷中参西录·一、医方·（一）治阴虚劳热方·4．一味薯蓣饮",
  "医学衷中参西录·一、医方·（一）治阴虚劳热方·5．参麦汤",
  "医学衷中参西录·一、医方·（一）治阴虚劳热方·6．珠玉二宝粥",
  "医学衷中参西录·一、医方·（一）治阴虚劳热方·7．沃雪汤",
  "医学衷中参西录·一、医方·（一）治阴虚劳热方·8．水晶桃",
  "医学衷中参西录·一、医方·（一）治阴虚劳热方·9．既济汤",
  "医学衷中参西录·一、医方·（一）治阴虚劳热方·10．来复汤",
  "医学衷中参西录·一、医方·（一）治阴虚劳热方·11．镇摄汤"
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
  console.log('═══ 第 6 章 · 阴虚劳热：资生汤与十全育真汤的方证结构 ═══');
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
