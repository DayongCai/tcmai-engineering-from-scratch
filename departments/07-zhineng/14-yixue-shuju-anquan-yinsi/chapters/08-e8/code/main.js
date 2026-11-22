#!/usr/bin/env node
/**
 * 医学数据安全与隐私 · 第 8 章 去标识不是删掉姓名，是让组合失去分辨力
 * 正文: departments/07-zhineng/14-yixue-shuju-anquan-yinsi/chapters/08-e8/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：三档粗化的组合数、平均密度、孤格数与单人占比，全部由 docs/zh.md 的演算设定现算；
 * 差分反解与拉普拉斯噪声尺度同样按正文给出的数复算，不写死结论。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 8;
const SLUG = '08-e8';
const TITLE = '去标识不是删掉姓名，是让组合失去分辨力';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s).match(HANZI) || []).length;
const num = (s) => Number(String(s).replace(/[,{}\s≈]/g, ''));
const fmt = (n) => Number(n).toLocaleString('en-US');

function readDoc() {
  return fs.readFileSync(DOC, 'utf8');
}

function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

function parseCells(text) {
  const out = [];
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!/^\|/.test(t)) { cur = null; continue; }
    if (!cur) { cur = { rows: [] }; out.push(cur); }
    if (/^\|[\s:|-]*---[\s:|-]*\|$/.test(t)) continue;
    cur.rows.push(t.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  }
  return out;
}

/** 章首设定：记录数与原始四列的取值个数 */
function params(text) {
  const t = String(text);
  const n = t.match(/一张\s*([\d.]+)\s*万条的住院数据表/);
  const latex = t.match(/\$?(\d+)\\times(\d+)\\times(\d+)\\times(\d+)=([\d,{}]+)\$/);
  const share = t.match(/占\s*\*\*(\d+)%\*\*/);
  if (!n && !latex) throw new Error('正文缺少去标识的演算设定，无法现算');
  return {
    N: n ? Math.round(Number(n[1]) * 10000) : null,
    dims: latex ? [1, 2, 3, 4].map((i) => num(latex[i])) : null,
    statedCells: latex ? num(latex[5]) : null,
    shareStated: share ? num(share[1]) : null,
  };
}

/** 三档粗化的对照表：组合数、平均每格、单人记录 */
function plans(text) {
  const tb = parseCells(text).find((t) => t.rows.length && t.rows[0][0] === '方案' && t.rows[0].some((c) => c.includes('组合数')));
  if (!tb) throw new Error('正文缺少三档粗化的对照表');
  return tb.rows.slice(1).map((r) => ({
    name: r[0],
    cells: num(r[1]),
    lambdaStated: Number(r[2]),
    singlesStated: num(r[3]),
  }));
}

/** 拉普拉斯机制：计数查询敏感度为 1，噪声尺度 b = 1/ε */
function laplace(text) {
  const tb = parseCells(text).find((t) => t.rows.length && t.rows[0][0] === 'ε');
  if (!tb) throw new Error('正文缺少隐私预算与噪声尺度的对照表');
  return tb.rows.slice(1).map((r) => ({
    eps: Number(r[0]),
    b: Number(r[1]),
    half: Number(r[2]),
  }));
}

function model(text) {
  const p = params(text);
  const pl = plans(text);
  const N = p.N || 50000;
  const rows = pl.map((r) => {
    const lambda = N / r.cells;
    const singles = r.cells * lambda * Math.exp(-lambda);
    return {
      ...r,
      lambda,
      singles,
      lambdaMatch: Math.abs(lambda - r.lambdaStated) < 0.02,
      singlesMatch: Math.abs(singles - r.singlesStated) <= Math.max(2, r.singlesStated * 0.005),
    };
  });
  const aloneShare = Math.exp(-N / rows[0].cells) * 100;
  const eps = laplace(text);
  return {
    N,
    dims: p.dims,
    statedCells: p.statedCells,
    cellsMatch: p.dims ? p.dims.reduce((a, b) => a * b, 1) === p.statedCells : null,
    rows,
    aloneShare,
    shareStated: p.shareStated,
    eps,
  };
}

function stats(text) {
  const t = String(text);
  const heads = headings(t);
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    hanzi: hanzi(t),
    sections: heads.length,
    numbered: heads.filter((h) => /^[一二三四五六七八九十]+、/.test(h)).length,
    tables: parseCells(t).length,
    drills: (t.match(/演算设定/g) || []).length,
    disclaimer: /免责声明/.test(t),
  };
}

function main() {
  const text = readDoc();
  const s = stats(text);
  const m = model(text);

  console.log(`医学数据安全与隐私 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字        ${fmt(s.hanzi)}`);
  console.log(`  节          ${s.sections}（编号节 ${s.numbered} + 代价与边界）`);
  console.log(`  表          ${s.tables}`);
  console.log('');
  console.log(`章首设定：${fmt(m.N)} 条记录，四列取值 ${m.dims ? m.dims.join('×') : '—'} = ${fmt(m.statedCells)} 格`);
  console.log(`随机取一条记录，独占一格的概率 e^{-λ} ≈ ${(m.aloneShare / 100).toFixed(3)}，即 ${m.aloneShare.toFixed(0)}%（正文写 ${m.shareStated}%）`);
  console.log('');
  console.log('三档粗化的取舍：');
  for (const r of m.rows) {
    console.log(
      `  ${r.name.padEnd(4, '　')} 组合 ${String(fmt(r.cells)).padStart(7)} · λ ${r.lambda.toFixed(2).padStart(6)} · 孤格 ${String(fmt(Math.round(r.singles))).padStart(6)}`
      + `（正文 ${r.lambdaStated} / ${fmt(r.singlesStated)}）${r.lambdaMatch && r.singlesMatch ? ' ✓' : ' ✗'}`
    );
  }
  console.log(`  平均每格 7.7 人看似 k>5，但 k-匿名看的是分组后的最小值，泊松尾部仍有 1 人乃至 0 人的格子`);
  console.log('');
  console.log('差分隐私的预算表（b = 1/ε，95% 误差半宽约 3b）：');
  for (const e of m.eps) {
    const b = 1 / e.eps;
    console.log(`  ε=${String(e.eps).padEnd(4)} b=${String(e.b).padEnd(6)} 3b=${String(e.half).padEnd(5)} ${Math.abs(b - e.b) < 1e-9 && Math.abs(3 * b - e.half) < 0.011 ? '✓' : '✗'}`);
  }
  const b05 = 1 / 0.5;
  console.log(`  ε=0.5 时亚组真值 5 人的发布标准差 √2·b ≈ ${(Math.SQRT2 * b05).toFixed(2)}，结果可能落在 0 到 11 之间——小样本在预算内没有信息量`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：记录数、四列基数、粗化档位与 ε 任一变动，重跑本脚本即可看到新值。');
  console.log('※ 本章数值为演算设定，用于演示唯一性与噪声的量级关系，不构成「通过检验即可发布」的结论。');
  console.log('※ 对外发布与跨机构共享须经数据治理责任人与伦理委员会审查，并对残余风险作书面接受。');
}

if (require.main === module) main();

module.exports = { CHAPTER, SLUG, TITLE, DOC, readDoc, headings, parseCells, params, plans, laplace, model, stats, main };
