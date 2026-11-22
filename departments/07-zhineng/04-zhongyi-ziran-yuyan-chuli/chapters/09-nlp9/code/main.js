#!/usr/bin/env node
/**
 * 中医自然语言处理 · 第 9 章 F1 高不等于抽得对，可能只是学会了标注员的习惯
 * 正文: departments/07-zhineng/04-zhongyi-ziran-yuyan-chuli/chapters/09-nlp9/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：每类的 tp/fp/fn 从正文代码块解析，P/R/F1、微平均、宏平均在本脚本里现算，
 * 并与正文写明的演算结果逐项对账；不给任何模型的实测分数。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 9;
const SLUG = '09-nlp9';
const TITLE = 'F1 高不等于抽得对，可能只是学会了标注员的习惯';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s).match(HANZI) || []).length;
const readDoc = () => fs.readFileSync(DOC, 'utf8');

function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

function codeBlocks(text) {
  return [...text.matchAll(/```[a-z]*\r?\n([\s\S]*?)```/g)].map((m) => m[1]);
}

/** 正文代码块里的 rows = {"症": (100, 20, 14), ...} */
function parseRows(text) {
  const block = codeBlocks(text).find((b) => /rows\s*=\s*\{/.test(b));
  if (!block) throw new Error('正文里找不到 rows = {...} 的代码块');
  const body = block.match(/rows\s*=\s*\{([\s\S]*?)\}/)[1];
  const rows = {};
  for (const m of body.matchAll(/"([^"]+)"\s*:\s*\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/g)) {
    rows[m[1]] = { tp: +m[2], fp: +m[3], fn: +m[4] };
  }
  if (!Object.keys(rows).length) throw new Error('rows 解析为空');
  return rows;
}

/** 正文里写明的演算结果（用于对账，不作为输入） */
function docClaims(text) {
  const claims = {};
  for (const m of text.matchAll(/([症方穴])\s+(\d\.\d{3})／(\d\.\d{3})／(\d\.\d{3})/g)) {
    claims[m[1]] = [ +m[2], +m[3], +m[4] ];
  }
  const micro = text.match(/微平均\s+(\d\.\d{3})/);
  const macro = text.match(/宏平均\s*F1\s*(\d\.\d{3})/);
  return { perClass: claims, micro: micro ? +micro[1] : null, macro: macro ? +macro[1] : null };
}

const round3 = (x) => Math.round(x * 1000) / 1000;

function prf(tp, fp, fn) {
  const p = tp + fp ? tp / (tp + fp) : 0;
  const r = tp + fn ? tp / (tp + fn) : 0;
  const f = p + r ? (2 * p * r) / (p + r) : 0;
  return { p, r, f };
}

/** 微平均：先合并计数再算；宏平均：各类等权 */
function averages(rows) {
  const per = {};
  for (const [k, v] of Object.entries(rows)) per[k] = prf(v.tp, v.fp, v.fn);
  const tp = Object.values(rows).reduce((a, v) => a + v.tp, 0);
  const fp = Object.values(rows).reduce((a, v) => a + v.fp, 0);
  const fn = Object.values(rows).reduce((a, v) => a + v.fn, 0);
  const micro = prf(tp, fp, fn);
  const macroF = Object.values(per).reduce((a, x) => a + x.f, 0) / Object.keys(per).length;
  return { per, micro, macroF, support: Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, v.tp + v.fn])) };
}

/** Wilson 区间：比例型指标的小样本区间 */
function wilson(p, n, z = 1.96) {
  const denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

/** 三个切分维度，按严格程度排 */
function splitKinds(text) {
  const sec = text.slice(text.indexOf('## 五、'));
  const out = [];
  for (const m of sec.matchAll(/\*\*(按[^*]+)\*\*/g)) out.push(m[1].replace(/[：:].*$/, '').trim());
  return out;
}

function stats() {
  const text = readDoc();
  const rows = parseRows(text);
  const avg = averages(rows);
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    hanzi: hanzi(text),
    sections: headings(text).length,
    rows,
    avg,
    claims: docClaims(text),
    gap: avg.micro.f - avg.macroF,
    splits: splitKinds(text),
    wilson: wilson(avg.per['症'].p, rows['症'].tp + rows['症'].fp),
    disclaimer: /免责声明/.test(text),
  };
}

function main() {
  const s = stats();
  console.log(`中医自然语言处理 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字            ${s.hanzi.toLocaleString('en-US')}`);
  console.log(`  类别            ${Object.keys(s.rows).length}：${Object.keys(s.rows).join('／')}`);
  console.log('');
  console.log('逐类 P／R／F1（tp, fp, fn 取自正文代码块）：');
  for (const [k, v] of Object.entries(s.rows)) {
    const x = s.avg.per[k];
    console.log(`  ${k}（${v.tp},${v.fp},${v.fn}，支持 ${s.avg.support[k]}）  ${round3(x.p).toFixed(3)}／${round3(x.r).toFixed(3)}／${round3(x.f).toFixed(3)}`);
  }
  console.log('');
  console.log(`微平均 F1  ${round3(s.avg.micro.f).toFixed(3)}`);
  console.log(`宏平均 F1  ${round3(s.avg.macroF).toFixed(3)}`);
  console.log(`差额       ${round3(s.gap).toFixed(3)}——长尾的可见度`);
  console.log('');
  console.log(`正文声明的数：微平均 ${s.claims.micro}，宏平均 F1 ${s.claims.macro}`);
  console.log(`逐项对账：${Object.entries(s.claims.perClass).map(([k, v]) => `${k} ${v.join('/')}`).join('；')}`);
  console.log('');
  console.log(`切分维度（按严格程度）：${s.splits.join(' → ')}`);
  console.log(`「症」的精确率 Wilson 区间：${s.wilson[0].toFixed(3)}–${s.wilson[1].toFixed(3)}（分母很小，区间很宽）`);
  console.log('');
  console.log('※ 计数取自本目录 docs/zh.md 的演算示例，不是任何系统的实测；脚本只复算，不改数。');
  console.log('※ 本章只做评测方法的讨论，不构成诊断、辨证或治疗建议。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC, readDoc, headings, codeBlocks, parseRows, docClaims,
  prf, averages, wilson, splitKinds, round3, hanzi, stats, main,
};
