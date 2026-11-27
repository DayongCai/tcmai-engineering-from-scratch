#!/usr/bin/env node
/**
 * 脉诊客观化 · 第 10 章 评估：唯一能证伪前面九章的那一步，也是最容易被走过场的一步
 * 课程: departments/07-zhineng/08-maizhen-keguanhua/chapters/10-m10/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 三张表都从正文解析后用公式重算：
 *   设计效应 1 + (m−1)ρ 与有效样本量；PPV／NPV 随患病率的变化；
 *   McNemar 的双侧精确 p。另算按段划分时「露过脸」的比例。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 10;
const TITLE = '评估：唯一能证伪前面九章的那一步，也是最容易被走过场的一步';
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

const designEffect = (m, rho) => 1 + (m - 1) * rho;

/** 阳性预测值：患病率 prev、敏感度 se、特异度 sp */
function ppv(se, sp, prev) {
  const tp = se * prev;
  const fp = (1 - sp) * (1 - prev);
  if (tp + fp === 0) throw new Error('无阳性判定，PPV 未定义');
  return tp / (tp + fp);
}

/** 阴性预测值 */
function npv(se, sp, prev) {
  const tn = sp * (1 - prev);
  const fn = (1 - se) * prev;
  if (tn + fn === 0) throw new Error('无阴性判定，NPV 未定义');
  return tn / (tn + fn);
}

const choose = (n, k) => {
  let r = 1;
  for (let i = 1; i <= k; i += 1) r = (r * (n - k + i)) / i;
  return r;
};

/** McNemar 双侧精确 p：不一致样本 b : c */
function mcnemar(b, c) {
  if (!Number.isInteger(b) || !Number.isInteger(c) || b < 0 || c < 0) throw new Error('计数必须是非负整数');
  const n = b + c;
  if (n === 0) return 1;
  let tail = 0;
  for (let i = 0; i <= Math.min(b, c); i += 1) tail += choose(n, i);
  return Math.min(1, (2 * tail) / 2 ** n);
}

function analyze(text) {
  const body = String(text).replace(/\r\n/g, '\n');
  const tbl = tables(body);

  const deT = tbl.find((t) => t.header.join('').includes('设计效应'));
  const nominal = deT ? num(deT.header[deT.header.length - 1]) : NaN;
  const designs = deT ? deT.rows.map((r) => ({
    label: r[0], m: num(r[1]), rho: num(r[2]), statedDe: num(r[3]), statedN: num(r[4]),
  })) : [];

  const ppvT = tbl.find((t) => t.header.join('').includes('PPV'));
  const prevs = ppvT ? ppvT.rows.map((r) => ({
    label: r[0], prev: num(r[1]) / 100, statedPPV: num(r[2]), statedNPV: num(r[3]),
  })) : [];

  const se = Number((body.match(/敏感度\s*([\d.]+)、特异度\s*([\d.]+)/) || [])[1]);
  const sp = Number((body.match(/敏感度\s*([\d.]+)、特异度\s*([\d.]+)/) || [])[2]);

  const mcT = tbl.find((t) => t.header.join('').includes('不一致的样本'));
  const mc = mcT ? mcT.rows.map((r) => {
    const m = r[0].match(/(\d+)\s*:\s*(\d+)/);
    return { b: Number(m[1]), c: Number(m[2]), stated: num(r[1]) };
  }) : [];

  return {
    hanzi: (body.match(HANZI) || []).length,
    tables: tbl.length,
    nominal,
    designs,
    se,
    sp,
    prevs,
    mc,
    leak: 1 - 0.2 ** 5,
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
  console.log(`按段划分的泄漏：1 − 0.2^5 ＝ ${a.leak.toFixed(4)}，即 ${(a.leak * 100).toFixed(2)}% 的人在训练集里露过脸。`);
  console.log('');
  console.log('设计效应与有效样本量（重算值 / 表内值）：');
  for (const d of a.designs) {
    if (!Number.isFinite(d.rho)) {
      console.log(`  ${d.label}：m ＝ ${d.m} → 设计效应 ${designEffect(d.m, 0).toFixed(1)}，有效 n ${a.nominal}（一人一段，没有簇内相关）`);
      continue;
    }
    const de = designEffect(d.m, d.rho);
    const eff = Math.round(a.nominal / de);
    const ok = Math.abs(de - d.statedDe) < 0.06 && eff === d.statedN ? '一致' : '不一致';
    console.log(`  ${d.label}：m ＝ ${d.m}、ρ ＝ ${d.rho} → ${de.toFixed(1)}，有效 n ${eff}（表内 ${d.statedDe} / ${d.statedN}，${ok}）`);
  }
  console.log('');
  console.log(`PPV／NPV 随患病率变化（敏感度 ${a.se}、特异度 ${a.sp}，重算值 / 表内值）：`);
  for (const p of a.prevs) {
    const P = ppv(a.se, a.sp, p.prev);
    const N = npv(a.se, a.sp, p.prev);
    const ok = Math.abs(P - p.statedPPV) < 0.002 && Math.abs(N - p.statedNPV) < 0.002 ? '一致' : '不一致';
    console.log(`  ${p.label}（${(p.prev * 100).toFixed(0)}%）→ PPV ${P.toFixed(3)}，NPV ${N.toFixed(3)}（表内 ${p.statedPPV} / ${p.statedNPV}，${ok}）`);
  }
  console.log('  → 同一套敏感度与特异度，PPV 从 0.31 到 0.90：变的不是模型，是分母。');
  console.log('');
  console.log('McNemar 双侧精确 p（重算值 / 表内值）：');
  for (const m of a.mc) {
    const p = mcnemar(m.b, m.c);
    const ok = Math.abs(p - m.stated) < 0.002 ? '一致' : '不一致';
    console.log(`  ${m.b} : ${m.c} → ${p.toFixed(3)}（表内 ${m.stated}，${ok}）`);
  }
  console.log('');
  console.log('※ 以上泄漏实验、设计效应表、PPV 表与 McNemar 表都是正文的演算设定（合成数据或按公式直算）。');
  console.log('※ 本章不给任何实测的准确率、敏感度、AUC、样本量与 p 值；性能声明须有独立验证数据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, tables, designEffect, ppv, npv, mcnemar };

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/\*\*/g, '').replace(/^[>\s#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
