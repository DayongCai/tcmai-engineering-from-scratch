#!/usr/bin/env node
/**
 * 脉诊客观化 · 第 7 章 支持向量机：边界由最难分的那几个人决定
 * 课程: departments/07-zhineng/08-maizhen-keguanhua/chapters/07-m7/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 三张表都从正文解析后用公式重算：
 *   间隔宽度 ＝ d（以类内标准差计），最近样本在两侧 ±d/2；
 *   贝叶斯错误率下限 ＝ Φ(−d/2)；
 *   gamma='scale' 时 γ ＝ 1 / (特征数 × 方差)，相似半径 ＝ 1/√γ。
 * 另由「准确率 95%」反解 d，看它落在哪一档。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 7;
const TITLE = '支持向量机：边界由最难分的那几个人决定';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function tables(text) {
  const lines = String(text).split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    if (!/^\s*\|/.test(lines[i])) { i += 1; continue; }
    const block = [];
    while (i < lines.length && /^\s*\|/.test(lines[i])) { block.push(lines[i]); i += 1; }
    if (block.length < 3 || !/^\s*\|[\s:|-]+\|\s*$/.test(block[1])) continue;
    const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    out.push({ header: cells(block[0]), rows: block.slice(2).map(cells) });
  }
  return out;
}

const num = (s) => {
  const m = String(s).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : NaN;
};

/** 标准正态分布函数 Φ（Abramowitz & Stegun 7.1.26） */
function normCdf(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

/** Φ 的反函数（二分法，收敛到 1e-10） */
function normInv(p) {
  if (!(p > 0 && p < 1)) throw new Error('分位必须在 (0,1): ' + p);
  let lo = -40;
  let hi = 40;
  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    if (normCdf(mid) < p) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** 等方差正态、先验相等时，两类均值差 d（类内标准差计）的错误率下限 */
const errorFloor = (d) => normCdf(-d / 2);

/** scikit-learn 的 gamma='scale' 约定 */
const gammaScale = (features, variance) => 1 / (features * variance);

/** γ 折算的相似半径 */
const simRadius = (gamma) => 1 / Math.sqrt(gamma);

function analyze(text) {
  const body = String(text).replace(/\r\n/g, '\n');
  const tbl = tables(body);

  const widthT = tbl.find((t) => t.header.join('').includes('最大间隔宽度'));
  const widths = widthT ? widthT.rows.map((r) => ({ d: num(r[0]), width: num(r[1]), edge: num(r[2]) })) : [];

  const floorT = tbl.find((t) => t.header.join('').includes('错误率下限'));
  const floors = floorT ? floorT.rows.map((r) => ({ d: num(r[0]), floor: num(r[2]), acc: num(r[3]) })) : [];

  const gammaT = tbl.find((t) => t.header.join('').includes('相似半径'));
  const gammas = gammaT ? gammaT.rows.map((r) => {
    const f = num(r[0]);
    const v = num(String(r[0]).split('方差')[1]);
    return { features: f, variance: v, gamma: num(r[1]), radius: num(r[2]) };
  }) : [];

  return {
    hanzi: (body.match(HANZI) || []).length,
    tables: tbl.length,
    widths,
    floors,
    gammas,
    dFor95: 2 * normInv(0.95),
  };
}

function main() {
  const text = read();
  const a = analyze(text);

  console.log(`脉诊客观化 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 表格 ${a.tables} 张`);
  console.log('');
  console.log('间隔宽度与最近样本位置（重算值 / 表内值）：');
  for (const w of a.widths) {
    const width = w.d;
    const edge = w.d / 2;
    const flag = Math.abs(width - w.width) < 0.01 && Math.abs(edge - Math.abs(w.edge)) < 0.01 ? '一致' : '不一致';
    console.log(`  d ＝ ${w.d} σ → 间隔 ${width.toFixed(2)}，最近样本在 ±${edge.toFixed(2)} σ（${flag}）`);
  }
  console.log('');
  console.log('错误率下限 Φ(−d/2) 与准确率上限（重算值 / 表内值）：');
  for (const f of a.floors) {
    const floor = errorFloor(f.d);
    const acc = 1 - floor;
    const flag = Math.abs(floor - f.floor) < 0.002 && Math.abs(acc - f.acc) < 0.002 ? '一致' : '不一致';
    console.log(`  d ＝ ${f.d} σ → 下限 ${floor.toFixed(3)}，准确率上限 ${acc.toFixed(3)}（表内 ${f.floor} / ${f.acc}，${flag}）`);
  }
  console.log('');
  console.log("gamma='scale' 折算的相似半径（重算值 / 表内值）：");
  for (const g of a.gammas) {
    const gamma = gammaScale(g.features, g.variance);
    const radius = simRadius(gamma);
    const flag = Math.abs(gamma - g.gamma) < 0.002 && Math.abs(radius - g.radius) < 0.03 ? '一致' : '不一致';
    console.log(`  ${g.features} 特征、方差 ${g.variance} → γ ${gamma.toFixed(3)}，半径 ${radius.toFixed(2)} σ（表内 ${g.gamma} / ${g.radius}，${flag}）`);
  }
  console.log('  → 同一个 γ 在不同维数下对应的模型完全不同，而相似半径在脉学里没有对应物。');
  console.log('');
  console.log(`准确率 95% 反解 d：2 × Φ⁻¹(0.95) ≈ ${a.dFor95.toFixed(2)} σ`);
  console.log('  → 60 例上要出现这种分离，要么中间状态被排除，要么特征混进了与标签同源的量。');
  console.log('');
  console.log('※ 以上都是等方差正态、先验相等假设下的算术（正文的演算设定），不对应任何真实数据集。');
  console.log('※ 本章不给出任何实测准确率、敏感度或核参数最优值；核与参数须在报告中写明。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, normCdf, normInv, errorFloor, gammaScale, simRadius, tables };
