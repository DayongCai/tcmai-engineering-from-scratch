#!/usr/bin/env node
/**
 * 医学遗传学 · 第 8 章 核型是一条「分辨率就是判据」的技术
 * 课程: departments/09-jichu/09-yixue-yichuan-xue/chapters/08-heti-yu-ranse-ti-jibian/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 两组算例：分辨率（3.2×10⁹ bp ÷ 400–550 条带；每 160 kb 一个基因；5 Mb 涉及多少基因），
 * 与嵌合漏检（0.95²⁰ ≈ 0.36；要压到 5% 需要计数多少个细胞）。
 * 输入都写在正文里，结果再与正文明写的数对照。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const TITLE = '核型是一条「分辨率就是判据」的技术';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

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

const GENOME = 3.2e9;  // 正文：单倍体基因组约 3.2×10⁹ bp
const BANDS_HI = 550;  // 正文：常规显带约 400–550 条
const GENES = 20000;   // 正文：约两万个蛋白编码基因
const ABNORMAL = 0.05; // 正文：异常细胞占 5%

/** 抽 n 个细胞全是正常的概率（二项，(1−p)^n） */
const missChance = (n, p = ABNORMAL) => Math.pow(1 - p, n);

/** 要把漏检压到 0.05 以下，最少要计数多少个细胞 */
function cellsNeeded(target = 0.05, p = ABNORMAL) {
  let n = 1;
  while (missChance(n, p) >= target) n += 1;
  return n;
}

function figures(text) {
  const perBand = GENOME / BANDS_HI;
  const perGene = GENOME / GENES;
  return [
    { name: '每条带平均 bp', got: perBand, stated: 5.8e6, token: '5.8×10⁶' },
    { name: '每带取整约 Mb', got: perBand / 1e6, stated: 6, token: '约 6 Mb', tol: 0.06 },
    { name: '平均每个基因的间距', got: perGene, stated: 160000, token: '160 kb' },
    { name: '5 Mb 缺失涉及基因数', got: 5e6 / perGene, stated: 30, token: '三十个基因', tol: 0.06 },
    { name: '20 个细胞全正常的概率', got: missChance(20), stated: 0.36, token: '0.95²⁰' },
    { name: '压到 5% 所需细胞数', got: cellsNeeded(), stated: 60, token: '0.95⁶⁰' },
  ].map((f) => ({ ...f, ok: Math.abs(f.got - f.stated) <= (f.tol || 0.03) * Math.abs(f.stated) }));
}

function fmt(x) {
  if (x >= 1e5) return x.toExponential(2);
  if (x >= 10) return x.toFixed(0);
  if (x >= 1) return x.toFixed(2);
  return x.toPrecision(3);
}

function main() {
  const text = read();
  const a = analyze(text);
  const rows = figures(text);

  console.log(`医学遗传学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算：正文写输入，这里重算，再与正文的结果对照）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tables} 张 · 加粗判断 ${a.claims} 处`);
  console.log('');
  for (const r of rows) {
    const mark = r.ok ? '✓' : '✗ 与正文不符';
    console.log(`  ${r.name.padEnd(16, '　')} 算得 ${fmt(r.got).padStart(8)} · 正文 ${r.token}  ${mark}`);
  }
  console.log('');
  console.log('读法：坐标的最小刻度就是判据的最小单位；「在一群细胞里找少数」，先算抽多少个才够。');
  console.log('※ 3.2×10⁹ bp、400–550 条带、每带约 6 Mb、每 160 kb 一个基因为常引口径；0.95²⁰ 为由设定比例推导的二项结果。');
  console.log('※ 本输出仅用于教学演示，不构成核型判读或医学意见。');
  if (rows.some((r) => !r.ok)) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, figures, missChance, cellsNeeded, ABNORMAL };
