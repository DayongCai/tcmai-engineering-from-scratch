#!/usr/bin/env node
/**
 * 医学遗传学 · 第 2 章 基因不是「一段编码」，是一套带开关的坐标系
 * 课程: departments/09-jichu/09-yixue-yichuan-xue/chapters/02-jiyin-de-jiegou-zuzhi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章算例的四个输入（CDS 3,000 bp、20 个外显子、平均 150 bp、3.2×10⁹ bp 基因组）
 * 都写在正文里，这里按正文的除法重算一遍，再与正文写下的结果对照。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '基因不是「一段编码」，是一套带开关的坐标系';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 结构量：汉字数、节、表格、加粗判断 */
function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const lines = body.split('\n');
  const sections = [];
  let cur = null;
  for (const line of lines) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = { title: h[1], hanzi: 0 }; sections.push(cur); continue; }
    if (cur) cur.hanzi += (line.match(HANZI) || []).length;
  }
  return {
    hanzi: (body.match(HANZI) || []).length,
    sections,
    tables: (body.match(/^\s*\|[\s:|-]+\|\s*$/gm) || []).length,
    claims: (body.match(/\*\*[^*\n]+\*\*/g) || []).length,
  };
}

/** 算例：先按正文给的输入重算，再与正文写下的同一个数对照 */
function figures(text) {
  const cds = 3000;     // 正文：CDS 长 3,000 bp
  const exons = 20;     // 正文：含 20 个外显子
  const genome = 3.2e9; // 正文：约 3.2×10⁹ 个碱基对
  const codingCap = 0.02; // 正文：直接编码蛋白的部分不到百分之二

  return [
    { name: '平均外显子长度', got: cds / exons, stated: 150, token: '150 bp' },
    { name: '编码氨基酸数', got: cds / 3, stated: 1000, token: '1,000 个氨基酸' },
    { name: '编码区上限（bp）', got: genome * codingCap, stated: 6.4e7, token: '百分之二' },
  ].map((f) => ({ ...f, ok: Math.abs(f.got - f.stated) <= 0.03 * Math.abs(f.stated) }));
}

function fmt(x) {
  if (x >= 1e6) return x.toExponential(2);
  if (x >= 1) return x.toFixed(0);
  return x.toPrecision(4);
}

function main() {
  const text = read();
  const a = analyze(text);
  const rows = figures(text);

  console.log(`医学遗传学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算：正文给输入，这里重算，再与正文写下的结果对照）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tables} 张 · 加粗判断 ${a.claims} 处`);
  console.log('');
  for (const r of rows) {
    const mark = r.ok ? '✓' : '✗ 与正文不符';
    console.log(`  ${r.name.padEnd(12, '　')} 算得 ${fmt(r.got).padStart(9)} · 正文 ${r.token}  ${mark}`);
  }
  console.log('');
  console.log('读法：3,000 ÷ 20 得到平均外显子长度，3,000 ÷ 3 得到氨基酸数；两者都不是实测，是算例设定。');
  console.log('※ 3.2×10⁹ bp、编码区不到百分之二为常引口径；20 个外显子与 3,000 bp 为教学算例设定，不作为判读阈值。');
  console.log('※ 本输出仅用于教学演示，不构成变异致病性判定或医学意见。');
  if (rows.some((r) => !r.ok)) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, figures };
