#!/usr/bin/env node
/**
 * 中医大数据分析 · 第 5 章 换成秩，你换掉的是「差多少」
 * 正文: departments/07-zhineng/09-zhongyi-dashuju-fenxi/chapters/05-s5/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：rank-biserial 效应量、三条规则的提升度（等于频次比）、Fisher z 变换后的相关区间，
 * 全部由正文的 U 值、支持度／置信度／边际频率与 r／n 现算；结果要回落到正文写法。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 5;
const SLUG = '05-s5';
const TITLE = '换成秩，你换掉的是「差多少」';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s || '').match(HANZI) || []).length;

const readDoc = () => fs.readFileSync(DOC, 'utf8');

function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

function tables(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^\|[\s:|-]*---[\s:|-]*\|$/.test(l)).length;
}

const citations = (text) => [...text.matchAll(/《([^》]+)》/g)].map((m) => m[1]);

/** 秩和检验的 U 与样本量 */
function rankTest(text) {
  const n = text.match(/n_1=n_2=(\d+)/);
  const u = text.match(/U=(\d+)/);
  if (!n || !u) throw new Error('正文缺 U 值与样本量');
  const per = Number(n[1]);
  const U = Number(u[1]);
  return { per, U, pairs: per * per, rrb: 1 - (2 * U) / (per * per) };
}

/** 关联规则表：支持度、置信度、后件边际频率 → 提升度 */
function rules(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(
      /^\|\s*\{[^}]+\}\s*→\s*\{[^}]+\}\s*\|\s*([\d.]+)%\s*\|\s*([\d.]+)%\s*\|\s*([\d.]+)%\s*\|\s*([\d.]+)\s*\|/,
    );
    if (!m) continue;
    const sup = Number(m[1]);
    const conf = Number(m[2]);
    const pb = Number(m[3]);
    out.push({ sup, conf, pb, lift: conf / pb, stated: Number(m[4]) });
  }
  if (out.length < 3) throw new Error(`关联规则表只读到 ${out.length} 行`);
  return out;
}

/** 相关系数的 Fisher z 区间 */
function fisher(r, n) {
  const z = Math.atanh(r);
  const se = 1 / Math.sqrt(n - 3);
  const loZ = z - 1.96 * se;
  const hiZ = z + 1.96 * se;
  return { r, n, z, se, loZ, hiZ, lo: Math.tanh(loZ), hi: Math.tanh(hiZ) };
}

function pearsonCI(text) {
  const m = text.match(/r=([\d.]+)\$?、\$?n=(\d+)/);
  if (!m) throw new Error('正文缺相关系数与样本量');
  return fisher(Number(m[1]), Number(m[2]));
}

/** 直线回归的斜率与解释力度 */
function regression(text) {
  const b = text.match(/b=([\d.]+)\$?\s*分\/g/);
  const r2 = text.match(/R\^2=([\d.]+)/);
  if (!b || !r2) throw new Error('正文缺回归算例');
  return { b: Number(b[1]), r2: Number(r2[1]) };
}

function compute(text) {
  return {
    rank: rankTest(text),
    rules: rules(text),
    corr: pearsonCI(text),
    reg: regression(text),
  };
}

function verify(text) {
  const c = compute(text);
  const need = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };
  need(c.rank.rrb.toFixed(2) === '0.31' && text.includes('0.31'), `rank-biserial 重算为 ${c.rank.rrb.toFixed(4)}`);
  c.rules.forEach((r, i) => {
    const name = ['黄芪当归→川芎', '陈皮半夏→茯苓', '甘草→茯苓'][i] || `第 ${i + 1} 行`;
    need(Math.abs(r.lift - r.stated) < 0.006, `${name} 提升度重算 ${r.lift.toFixed(3)}，表内写 ${r.stated}`);
    need(text.includes(r.stated.toFixed(2)), `${name} 的提升度未回落到正文`);
  });
  need(c.rules[2].lift < 1.1, '第三条规则应接近独立（提升度约 1）');
  need(c.corr.z.toFixed(3) === '0.725' && text.includes('0.725'), `Fisher z 重算为 ${c.corr.z.toFixed(3)}`);
  need(c.corr.se.toFixed(4) === '0.0925' && text.includes('0.0925'), `SE 重算为 ${c.corr.se.toFixed(4)}`);
  need(c.corr.loZ.toFixed(3) === '0.544' && text.includes('0.544'), 'z 区间下界未回落到正文');
  need(c.corr.hiZ.toFixed(3) === '0.906' && text.includes('0.906'), 'z 区间上界未回落到正文');
  need(c.corr.lo.toFixed(3) === '0.496' && text.includes('0.496'), 'r 区间下界未回落到正文');
  need(Math.abs(c.corr.hi - 0.72) < 1e-3 && text.includes('0.720'), `r 区间上界重算为 ${c.corr.hi.toFixed(4)}，正文写 0.720`);
  return c;
}

function stats(text) {
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    hanzi: hanzi(text),
    sections: headings(text).length,
    tables: tables(text),
    cites: citations(text).length,
    drills: (text.match(/演算设定/g) || []).length,
    disclaimer: /免责声明/.test(text),
  };
}

function main() {
  const text = readDoc();
  const s = stats(text);
  const c = verify(text);

  console.log(`中医大数据分析 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字 ${s.hanzi.toLocaleString('en-US')} · 节 ${s.sections} · 表 ${s.tables} · 引文 ${s.cites} 处 · 演算设定 ${s.drills} 处`);
  console.log('');
  console.log(`秩和：每组 ${c.rank.per} 例、U=${c.rank.U}，r_rb=${c.rank.rrb.toFixed(3)}（中等偏小）。`);
  console.log('');
  console.log('关联规则（置信度 ÷ 后件边际频率 = 提升度，也就是频次比）：');
  for (const r of c.rules) {
    console.log(`  支持度 ${r.sup}% · 置信度 ${r.conf}% · P(B) ${r.pb}% · lift ${r.lift.toFixed(2)}（表内 ${r.stated.toFixed(2)}）`);
  }
  console.log('');
  console.log(`相关：r=${c.corr.r}、n=${c.corr.n} → z=${c.corr.z.toFixed(3)}，SE=${c.corr.se.toFixed(4)}，z 区间 [${c.corr.loZ.toFixed(3)}, ${c.corr.hiZ.toFixed(3)}]，r 区间 [${c.corr.lo.toFixed(3)}, ${c.corr.hi.toFixed(3)}]。`);
  console.log(`回归：b=${c.reg.b} 分/g，R²=${c.reg.r2}，说明方向存在但个体预测不可靠。`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 现算：U 值、置信度与边际频率一改，效应量与提升度跟着变。');
  console.log('※ 本章数值为演算设定，不对应任何真实处方库或临床试验。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  readDoc,
  headings,
  tables,
  citations,
  hanzi,
  rankTest,
  rules,
  fisher,
  compute,
  verify,
  stats,
  main,
};
