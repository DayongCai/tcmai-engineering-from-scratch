#!/usr/bin/env node
/**
 * 医学细胞生物学 · 第 8 章 基因表达调控：答案在「多少、何时、在哪」
 * 正文: departments/09-jichu/03-yixue-xibao-shengwu-xue/chapters/08-jiyin-biaoda-tiaokong/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 可调点表与修饰表都从正文现抓。核心动作是读「时间尺度」那一列：把每个环节的尺度归到
 * 秒 / 分钟 / 小时 / 分裂四级，再回答「一个要在多少时间内起效的响应，能用哪几层」。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const readDoc = () => fs.readFileSync(DOC, 'utf8');

function tableRows(doc, keys) {
  const lines = doc.split(/\r?\n/);
  const head = lines.findIndex((l) => l.trim().startsWith('|') && keys.every((k) => l.includes(k)));
  if (head < 0) throw new Error('正文里找不到表头: ' + keys.join(' / '));
  const rows = [];
  for (let i = head + 2; i < lines.length; i += 1) {
    const l = lines[i].trim();
    if (!l.startsWith('|')) break;
    rows.push(l.split('|').slice(1, -1).map((c) => c.trim()));
  }
  if (!rows.length) throw new Error('表头之后没有数据行');
  return rows;
}

/** 把「秒到小时」「分钟到小时」这类说法拆成两端：最快能到哪一档、最慢到哪一档 */
function unitRange(scale) {
  const s = String(scale);
  const hits = [];
  if (s.includes('秒')) hits.push(1);
  if (s.includes('分钟')) hits.push(2);
  if (s.includes('小时')) hits.push(3);
  if (s.includes('分裂')) hits.push(4);
  if (!hits.length) throw new Error('认不出这个时间尺度: ' + s);
  return { fast: Math.min(...hits), slow: Math.max(...hits) };
}

/** 兼容旧用法：只取最快那一档 */
function unitRank(scale) {
  return unitRange(scale).fast;
}

const RANK_NAME = { 1: '秒', 2: '分钟', 3: '小时', 4: '细胞分裂' };

/** 流水线上的可调点：环节 / 可调之处 / 时间尺度 / 典型机制 */
function adjustablePoints(doc) {
  return tableRows(doc, ['环节', '可调之处', '时间尺度']).map((r) => {
    const range = unitRange(r[2]);
    return {
      stage: r[0],
      knob: r[1],
      scale: r[2],
      fastRank: range.fast,
      slowRank: range.slow,
      mechanism: r[3],
    };
  });
}

/** 想在某个时限内起效，能用的只有最快一侧不超过该刻度的层 */
function usableWithin(limitRank, doc) {
  if (!RANK_NAME[limitRank]) throw new Error('刻度取值 1–4: ' + limitRank);
  return (doc ? adjustablePoints(doc) : adjustablePoints(readDoc()))
    .filter((p) => p.fastRank <= limitRank)
    .map((p) => p.stage);
}

/** 哪一层最快、哪一层最慢（按两端分别取） */
function extremes(doc) {
  const list = doc ? adjustablePoints(doc) : adjustablePoints(readDoc());
  const fast = [...list].sort((a, b) => a.fastRank - b.fastRank)[0];
  const slow = [...list].sort((a, b) => b.slowRank - a.slowRank)[0];
  return { fastest: fast.stage, slowest: slow.stage };
}

/** 修饰表：修饰 / 一般效应 / 备注 */
function modifications(doc) {
  return tableRows(doc, ['修饰', '一般效应', '备注']).map((r) => ({ mark: r[0], effect: r[1], note: r[2] }));
}

/** 读—写—擦：修饰不是静态标签，是三个动作的循环 */
function readWriteErase(doc) {
  const d = String(doc);
  const m = d.match(/修饰是「([^」]+)」的循环/);
  if (!m) throw new Error('正文里没有读—写—擦');
  return { cycle: m[1].split('—').map((s) => s.replace(/[「」]/g, '').trim()) };
}

/** 「某处理使某基因上调」要追的三层：哪一层变了、可逆吗、平均还是分布 */
function threeQuestions(doc) {
  const d = String(doc);
  const a = d.indexOf('任何「某处理使某基因表达上调」');
  const b = d.indexOf('三层问完');
  if (a < 0 || b < 0) throw new Error('正文里没有三层追问');
  const seg = d.slice(a, b);
  const out = [];
  for (const m of seg.matchAll(/\d\.\s*\*\*([^*]+)\*\*/g)) out.push(m[1].trim());
  if (out.length !== 3) throw new Error('追问不是三条: ' + out.length);
  return out;
}

function main() {
  const doc = readDoc();
  const pts = adjustablePoints(doc);
  const ex = extremes(doc);
  const mods = modifications(doc);

  console.log('医学细胞生物学 · 第 8 章 基因表达调控');
  console.log('');
  console.log(`正文里读到 ${pts.length} 个可调点：`);
  for (const p of pts) {
    const span = p.fastRank === p.slowRank ? RANK_NAME[p.fastRank] : `${RANK_NAME[p.fastRank]}–${RANK_NAME[p.slowRank]}`;
    console.log(`  ${p.stage} ｜ ${span} ｜ ${p.mechanism}`);
  }
  console.log('');
  console.log(`最快的一层：${ex.fastest}；最慢的一层：${ex.slowest}。`);
  for (const r of [1, 2, 3]) {
    console.log(`  要在${RANK_NAME[r]}级内起效，能用的层：${usableWithin(r, doc).join('、')}`);
  }
  console.log('');
  console.log(`染色质修饰 ${mods.length} 种；读—写—擦的循环：${readWriteErase(doc).cycle.join(' → ')}`);
  console.log('');
  console.log('「上调」要追的三层：' + threeQuestions(doc).join(' / '));
  console.log('');
  console.log('※ 环节、尺度与修饰都从本章正文现抓；尺度归级只按「秒/分钟/小时/分裂」四档，不引入新数值。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = {
  readDoc,
  tableRows,
  unitRange,
  unitRank,
  adjustablePoints,
  usableWithin,
  extremes,
  modifications,
  readWriteErase,
  threeQuestions,
};
