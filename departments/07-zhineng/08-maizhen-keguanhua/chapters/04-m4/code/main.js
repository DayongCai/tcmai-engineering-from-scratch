#!/usr/bin/env node
/**
 * 脉诊客观化 · 第 4 章 浮沉迟数：把一个形容词切成两类，切点就是全部
 * 课程: departments/07-zhineng/08-maizhen-keguanhua/chapters/04-m4/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 四件事全部现算：
 *   1) 呼吸锚 → 时钟锚的换算（一息五动 × 呼吸频率）
 *   2) 敏感度／特异度／约登指数表 —— 用正文给的两个正态分布重算，与表里印的数对照
 *   3) 60 例验证集上敏感度的 95% 区间半宽
 *   4) LDA 的 w ＝ Σ⁻¹d、与均值差的夹角、相关对判别力的削减
 * 数字来自正文的演算设定，不是任何真实数据集。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const TITLE = '浮沉迟数：把一个形容词切成两类，切点就是全部';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 标准正态分布函数 Φ（Abramowitz & Stegun 7.1.26，绝对误差 < 1.5e-7） */
function normCdf(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

/** 切点上的敏感度、特异度与约登指数 */
function cutStats(cut, { muPos, sdPos, muNeg, sdNeg }) {
  const sens = 1 - normCdf((cut - muPos) / sdPos);
  const spec = normCdf((cut - muNeg) / sdNeg);
  return { cut, sens, spec, youden: sens + spec - 1 };
}

/** 二项分布正态近似的 95% 区间半宽 */
function ciHalfWidth(p, n) {
  if (!(p > 0 && p < 1) || !(n > 0)) throw new Error('参数越界: ' + p + ',' + n);
  return 1.96 * Math.sqrt((p * (1 - p)) / n);
}

/** 2×2 协方差矩阵的逆（标准化后对角为 1，相关系数 r） */
function inv2(r) {
  const det = 1 - r * r;
  if (!(det > 0)) throw new Error('相关系数必须落在 (−1,1)');
  return [[1 / det, -r / det], [-r / det, 1 / det]];
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const norm = (a) => Math.hypot(a[0], a[1]);
const matVec = (m, v) => [m[0][0] * v[0] + m[0][1] * v[1], m[1][0] * v[0] + m[1][1] * v[1]];

/** LDA：给定标准化均值差 d 与相关系数 r，返回 w、夹角、可分性的削减 */
function lda(d, r) {
  const w = matVec(inv2(r), d);
  const cos = dot(w, d) / (norm(w) * norm(d));
  const angle = (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
  return { w, angle, independent: dot(d, d), correlated: dot(w, d) };
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

function analyze(text) {
  const body = String(text).replace(/\r\n/g, '\n');
  const tbl = tables(body);

  const dist = [...body.matchAll(/均值\s*(\d+)、标准差\s*(\d+)/g)].map((m) => ({ mu: Number(m[1]), sd: Number(m[2]) }));
  const breath = [...body.matchAll(/(\d+)\s*至\s*(\d+)\s*次\/分/g)].map((m) => [Number(m[1]), Number(m[2])])[0] || null;

  const cutT = tbl.find((t) => t.header.join('').includes('约登'));
  const stated = cutT ? cutT.rows.map((r) => ({
    cut: num(r[0]), sens: num(r[1]), spec: num(r[2]), youden: num(r[3]),
  })) : [];

  const muPos = dist[0] ? dist[0].mu : NaN;
  const sdPos = dist[0] ? dist[0].sd : NaN;
  const muNeg = dist[1] ? dist[1].mu : NaN;
  const sdNeg = dist[1] ? dist[1].sd : NaN;
  const computed = stated.map((r) => cutStats(r.cut, { muPos, sdPos, muNeg, sdNeg }));

  return {
    hanzi: (body.match(HANZI) || []).length,
    tables: tbl.length,
    breath,
    dist,
    stated,
    computed,
    ci: {
      n: 60,
      p: 0.73,
      half: ciHalfWidth(0.73, 60),
    },
    lda: lda([0.9, 0.5], 0.6),
    covParams: (14 * 15) / 2,
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
  if (a.breath) {
    const [lo, hi] = a.breath;
    console.log(`呼吸锚 → 时钟锚：一息五动 × 静息呼吸 ${lo} 至 ${hi} 次/分`);
    console.log(`  ＝ ${lo * 5} 至 ${hi * 5} 次/分；呼吸 12 次/分时只有 ${12 * 5} 次/分。`);
  }
  console.log('');
  console.log(`切点表（数脉 ${a.dist[0].mu}±${a.dist[0].sd}，平脉 ${a.dist[1].mu}±${a.dist[1].sd}，重算值 / 表内值）：`);
  for (let i = 0; i < a.computed.length; i += 1) {
    const c = a.computed[i];
    const s = a.stated[i];
    const d = (x, y) => (Math.abs(x - y) < 0.006 ? '一致' : `偏 ${(x - y).toFixed(3)}`);
    console.log(
      `  切点 ${String(c.cut).padStart(3)}  敏感度 ${c.sens.toFixed(2)}（${s.sens}，${d(c.sens, s.sens)}）` +
      `  特异度 ${c.spec.toFixed(2)}（${s.spec}，${d(c.spec, s.spec)}）` +
      `  约登 ${c.youden.toFixed(2)}（${s.youden}）`
    );
  }
  const y84 = a.computed.find((c) => c.cut === 84);
  const y90 = a.computed.find((c) => c.cut === 90);
  if (y84 && y90) {
    console.log(`  → 84 与 90 的约登指数都是 ${y84.youden.toFixed(2)}：无代价函数时统计上分不出高下。`);
    const s84 = a.stated.find((r) => r.cut === 84);
    const s90 = a.stated.find((r) => r.cut === 90);
    if (s84 && s90) {
      console.log(`  → 两者敏感度差 ${(s84.sens - s90.sens).toFixed(2)}，而 60 例的 95% 区间半宽约 ±${a.ci.half.toFixed(2)}。`);
    }
  }
  console.log('');
  console.log('LDA（d ＝ (0.9, 0.5)，相关系数 0.6）：');
  console.log(`  w ＝ (${a.lda.w.map((v) => v.toFixed(4)).join(', ')})`);
  console.log(`  w 与 d 的夹角 ${a.lda.angle.toFixed(1)}°；两特征独立时的可分性 ${a.lda.independent.toFixed(2)}，相关后只剩 ${a.lda.correlated.toFixed(4)}。`);
  console.log(`  14 个特征的共同协方差有 14 × 15 / 2 ＝ ${a.covParams} 个自由参数。`);
  console.log('');
  console.log('※ 以上分布、协方差与切点表都是正文的演算设定，用来说明切点与相关性的作用方向。');
  console.log('※ 迟数的具体划界以现行规范为准；本章不给出任何模型的准确率、敏感性与样本量。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, normCdf, cutStats, ciHalfWidth, inv2, lda, tables };

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/\*\*/g, '').replace(/^[>\s#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
