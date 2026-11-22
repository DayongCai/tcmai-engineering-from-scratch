#!/usr/bin/env node
/**
 * 医学统计学 · 第 9 章 做了 20 个指标，「总有一个显著」是算术，不是运气
 * 课程正文: departments/06-guanli/01-yixue-tongjixue/chapters/09-duochong-jiaoyan/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 正文那组 10 个 p 值从正文读出，Bonferroni、Holm、BH 三种校正分别现算；
 * 再按 1−(1−α)^k 复算 k=3/10/20/50 的族错误率，与正文的 14.3% / 40.1% / 64.2% / 92.3% 对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC_PATH = path.join(__dirname, '..', 'docs', 'zh.md');

function readDoc() {
  return fs.readFileSync(DOC_PATH, 'utf8');
}

function parsePValues(doc) {
  const m = doc.match(/演示（升序）：([\d.、]+)/);
  if (!m) throw new Error('正文里找不到 10 个 p 值');
  const ps = m[1].split('、').map(Number);
  if (ps.length !== 10) throw new Error(`p 值个数为 ${ps.length}，不是 10`);
  return ps;
}

/** Bonferroni：p ≤ α/m */
function bonferroni(pvalues, alpha = 0.05) {
  const m = pvalues.length;
  return pvalues.map((p, i) => (p <= alpha / m ? i : -1)).filter((i) => i >= 0);
}

/** Holm：升序后第 i 个与 α/(m−i+1) 比较，首个不通过即停止 */
function holm(pvalues, alpha = 0.05) {
  const m = pvalues.length;
  const idx = pvalues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  const keep = [];
  for (let rank = 0; rank < m; rank += 1) {
    if (idx[rank].p <= alpha / (m - rank)) keep.push(idx[rank].i);
    else break;
  }
  return keep;
}

/** Benjamini–Hochberg：找最大的 k 使 p₍ₖ₎ ≤ (k/m)α，拒绝排序后的前 k 个 */
function bh(pvalues, alpha = 0.05) {
  const m = pvalues.length;
  const idx = pvalues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  let k = 0;
  idx.forEach((x, rank) => { if (x.p <= ((rank + 1) / m) * alpha) k = rank + 1; });
  return idx.slice(0, k).map((x) => x.i);
}

function familyError(k, alpha = 0.05) {
  return 1 - Math.pow(1 - alpha, k);
}

function compute(doc) {
  const pvalues = parsePValues(doc);
  const indicators = Number((doc.match(/测了\s*(\d+)\s*个指标/) || [])[1]);
  return {
    pvalues,
    bonferroni: bonferroni(pvalues),
    holm: holm(pvalues),
    bh: bh(pvalues),
    indicators,
    family20: familyError(indicators),
    family: { 3: familyError(3), 10: familyError(10), 20: familyError(20), 50: familyError(50) },
  };
}

function assertDocNumbers(doc, r) {
  const out = [];
  const ok = (cond, label) => { if (!cond) throw new Error(`正文对账失败：${label}`); out.push(label); };
  ok(r.pvalues.length === 10, '10 个 p 值全部读出');
  ok(r.bonferroni.length === 1 && r.pvalues[r.bonferroni[0]] === 0.001, 'Bonferroni 保留 1 个（0.001）');
  ok(r.holm.length === 1 && r.pvalues[r.holm[0]] === 0.001, 'Holm 保留 1 个（0.001）');
  ok(r.bh.length === 2 && r.pvalues[r.bh[0]] === 0.001 && r.pvalues[r.bh[1]] === 0.008, 'BH 保留 2 个（0.001 与 0.008）');
  ok(r.indicators === 20, '正文测了 20 个指标');
  ok(Math.abs(r.family20 * 100 - 64.15) < 0.01 && doc.includes('64.15%'), '20 个指标的族错误率 64.15%');
  ok(Math.abs(r.family[3] * 100 - 14.3) < 0.05 && doc.includes('14.3%'), 'k=3 时 14.3%');
  ok(Math.abs(r.family[10] * 100 - 40.1) < 0.05 && doc.includes('40.1%'), 'k=10 时 40.1%');
  ok(Math.abs(r.family[50] * 100 - 92.3) < 0.05 && doc.includes('92.3%'), 'k=50 时 92.3%');
  return out;
}

function main() {
  const doc = readDoc();
  const r = compute(doc);
  console.log('医学统计学 · 第 9 章 做了 20 个指标，「总有一个显著」是算术，不是运气');
  console.log('');
  console.log(`正文 p 值（升序）：${r.pvalues.join('、')}`);
  console.log(`Bonferroni 保留 ${r.bonferroni.length} 个：${r.bonferroni.map((i) => r.pvalues[i]).join('、')}`);
  console.log(`Holm 保留 ${r.holm.length} 个：${r.holm.map((i) => r.pvalues[i]).join('、')}`);
  console.log(`BH 保留 ${r.bh.length} 个：${r.bh.map((i) => r.pvalues[i]).join('、')}`);
  console.log(`族错误率 1−0.95^k：k=3 ${(r.family[3] * 100).toFixed(1)}%，k=10 ${(r.family[10] * 100).toFixed(1)}%，k=20 ${(r.family20 * 100).toFixed(2)}%，k=50 ${(r.family[50] * 100).toFixed(1)}%`);
  console.log('');
  for (const line of assertDocNumbers(doc, r)) console.log(`  ✓ ${line}`);
  console.log('');
  console.log('结论：三种方法回答不同问题；校正救不了事后挑选，主结局唯一比任何校正都重要。');
  console.log('※ 数字由本章正文 p 值现算，正文改动后重跑即可发现对不上。');
  console.log('※ 教学示意数据，不构成研究结论或临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, parsePValues, bonferroni, holm, bh, familyError, compute, DOC_PATH };
