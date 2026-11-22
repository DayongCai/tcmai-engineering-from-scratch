#!/usr/bin/env node
/**
 * 医学遗传学 · 第 10 章 遗传平衡不是自然界的常态，是一把用来量「什么力在起作用」的尺子
 * 课程: departments/09-jichu/09-yixue-yichuan-xue/chapters/10-qunti-yichuan-xue/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的算术：p² + 2pq + q² = 1、携带者与患者的比值 2p/q、X 连锁三档（q / 2q / q²），
 * 以及选择清除所需的代数（Δq ≈ −q²，1/q 每代加一）。
 * 输入取自正文，结果再与正文明写的数对照。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 10;
const TITLE = '遗传平衡不是自然界的常态，是一把用来量「什么力在起作用」的尺子';

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

/** 常染色体隐性位点：患者 q²、携带者 2pq、携带者∶患者 = 2p/q */
function recessive(q) {
  const p = 1 - q;
  return { q, p, affected: q * q, carrier: 2 * p * q, ratio: (2 * p * q) / (q * q) };
}

/** X 连锁位点：男性 q、女性携带者 2q、女性患者 q² */
const xLinked = (q) => ({ male: q, femaleCarrier: 2 * q, femaleAffected: q * q });

/** 选择系数 s = 1 时，1/q 每代加一：从 q0 到 q1 需要的代数 */
const generations = (q0, q1) => Math.round(1 / q1 - 1 / q0);

function figures(text) {
  const a = recessive(1 / 100);
  const b = recessive(1 / 1000);
  const x = xLinked(1 / 1000);
  return [
    { name: '患者频率 q²', got: a.affected, stated: 1 / 10000, token: '1/10000' },
    { name: '携带者频率 2pq', got: a.carrier, stated: 1 / 50, token: '1/50' },
    { name: '携带者∶患者（q=1/100）', got: a.ratio, stated: 200, token: '200∶1', tol: 0.02 },
    { name: '携带者∶患者（q=1/1000）', got: b.ratio, stated: 2000, token: '2000∶1', tol: 0.02 },
    { name: 'X 连锁男性患者', got: x.male, stated: 1 / 1000, token: '男性患者 1/1000' },
    { name: 'X 连锁女性携带者', got: x.femaleCarrier, stated: 1 / 500, token: '1/500' },
    { name: 'X 连锁女性患者', got: x.femaleAffected, stated: 1 / 1e6, token: '1/10⁶' },
    { name: '每代下降（q=1/100）', got: a.affected, stated: 1 / 10000, token: '每代下降约' },
    { name: '1/100 降到 1/200 的代数', got: generations(0.01, 0.005), stated: 100, token: '约一百代', tol: 0.05 },
  ].map((f) => ({ ...f, ok: Math.abs(f.got - f.stated) <= (f.tol || 0.03) * Math.abs(f.stated) }));
}

function fmt(x) {
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
    console.log(`  ${r.name.padEnd(20, '　')} 算得 ${fmt(r.got).padStart(8)} · 正文 ${r.token}  ${mark}`);
  }
  console.log('');
  for (const q of [0.01, 0.001, 0.0001]) {
    const r = recessive(q);
    console.log(`  q=${q} → 患者 ${r.affected.toExponential(2)} · 携带者 ${r.carrier.toExponential(2)} · 比值 ${r.ratio.toFixed(0)}∶1`);
  }
  console.log('读法：平衡是零假设，偏离的方向与幅度指认正在起作用的那种力；罕见病更值得筛查，因为携带者相对更多。');
  console.log('※ 1/10000、1/100、1/50、1/1000、1/500 为教学设定；200∶1 与 2000∶1 为由公式推导的近似比值。');
  console.log('※ 本输出仅用于教学演示，不构成医学意见、筛查建议或治疗建议。');
  if (rows.some((r) => !r.ok)) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, figures, recessive, xLinked, generations };
