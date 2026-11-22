#!/usr/bin/env node
/**
 * 脉诊客观化 · 第 6 章 端到端学习：省掉特征工程，也省掉了「谁在负责」
 * 课程: departments/07-zhineng/08-maizhen-keguanhua/chapters/06-m6/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文的层配置表逐层重算参数量并与表内值对照；再算感受野与时窗、
 * 按段划分的泄漏比例、设计效应与有效样本量。数字都是正文的演算设定。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const TITLE = '端到端学习：省掉特征工程，也省掉了「谁在负责」';
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

/** 一维卷积层参数量：输入通道 × 输出通道 × 核长 + 输出通道 */
const convParams = (inC, outC, k) => inC * outC * k + outC;

/** 总感受野：1 + Σ(核长 − 1) */
const receptiveField = (kernels) => 1 + kernels.reduce((a, k) => a + (k - 1), 0);

/** 每人 s 段、训练集占 t 时，某人的 s 段全在训练集里的概率 */
function pAllInTrain(s, t) {
  if (!(s >= 1) || !(t > 0 && t < 1)) throw new Error('参数越界: ' + s + ',' + t);
  return t ** s;
}

/** 设计效应与区间放大倍数 */
function design(m, rho) {
  if (!(m >= 1) || !(rho >= 0 && rho <= 1)) throw new Error('参数越界: ' + m + ',' + rho);
  const de = 1 + (m - 1) * rho;
  return { m, rho, de, inflation: Math.sqrt(de) };
}

function grab(re, text) {
  const m = String(text).match(re);
  return m ? Number(String(m[1]).replace(/,/g, '')) : NaN;
}

function analyze(text) {
  const body = String(text).replace(/\r\n/g, '\n');
  const tbl = tables(body);

  const paramT = tbl.find((t) => t.header.join('').includes('参数量'));
  const layers = paramT ? paramT.rows.map((r) => {
    const m = r[1].match(/(\d+)\s*→\s*(\d+)，k=(\d+)/);
    return m ? { inC: Number(m[1]), outC: Number(m[2]), k: Number(m[3]), stated: num(r[2]) } : null;
  }).filter(Boolean) : [];
  for (const L of layers) L.params = convParams(L.inC, L.outC, L.k);

  const total = layers.reduce((a, L) => a + L.params, 0);
  const rf = receptiveField(layers.map((L) => L.k));

  const rate = grab(/(\d+)\s*Hz/, body);
  const secs = grab(/(\d+)\s*秒的脉图/, body);
  const cases = grab(/(\d+)\s*例、每人三段/, body);
  const segParam = grab(/是\s*([\d,]+)\s*段/, body);
  const perCaseDesign = grab(/每人\s*(\d+)\s*段、段内相关系数/, body);
  const rho = grab(/段内相关系数按\s*([\d.]+)\s*估/, body);
  const nominal = grab(/([\d,]+)\s*段的有效样本量/, body);
  const leakM = body.match(/=\s*([\d.]+)⁸\s*=\s*([\d.]+)/);
  const trainShare = leakM ? Number(leakM[1]) : NaN;
  const segPerPerson = grab(/某人的\s*(\d+)\s*段全在训练集/, body);
  const bpm = grab(/(\d+)\s*次\/分时约/, body);

  const d = design(perCaseDesign, rho);
  return {
    hanzi: (body.match(HANZI) || []).length,
    tables: tbl.length,
    layers,
    total,
    rf,
    rate,
    secs,
    points: rate * secs,
    cases,
    segParam,
    paramsPerSegment: total / segParam,
    trainShare,
    segPerPerson,
    pAll: pAllInTrain(segPerPerson, trainShare),
    pLeak: 1 - pAllInTrain(segPerPerson, trainShare),
    design: d,
    nominal,
    effective: Math.round(nominal / d.de),
    bpm,
  };
}

function main() {
  const text = read();
  const a = analyze(text);

  console.log(`脉诊客观化 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 表格 ${a.tables} 张`);
  console.log(`信号：${a.secs} 秒 × ${a.rate} Hz ＝ ${a.points.toLocaleString('en-US')} 个采样点`);
  console.log('');
  console.log('逐层参数量（输入×输出×核长＋输出，重算值 / 表内值）：');
  for (const L of a.layers) {
    const ok = L.params === L.stated ? '一致' : `表内 ${L.stated}`;
    console.log(`  ${String(L.inC).padStart(2)} → ${String(L.outC).padStart(2)}，k=${L.k}  ${String(L.params).padStart(6)}（${ok}）`);
  }
  console.log(`  合计 ${a.total.toLocaleString('en-US')} 个参数（不含全连接与批归一化）`);
  console.log('');
  console.log(`数据：${a.cases} 例 × 每人三段 ＝ ${a.segParam.toLocaleString('en-US')} 段`);
  console.log(`  ${a.total.toLocaleString('en-US')} ÷ ${a.segParam.toLocaleString('en-US')} ≈ ${a.paramsPerSegment.toFixed(0)} —— 每段波形养活这么多个参数`);
  console.log('');
  console.log(`感受野：1 + Σ(k−1) ＝ ${a.rf} 个采样点；${a.rate} Hz 下 ${((a.rf / a.rate) * 1000).toFixed(0)} 毫秒`);
  if (a.bpm) {
    const beat = 60000 / a.bpm;
    console.log(`  一个心动周期在 ${a.bpm} 次/分时 ${beat.toFixed(0)} 毫秒 → 只覆盖周期的 ${(((a.rf / a.rate) * 1000) / beat * 100).toFixed(0)}%`);
  }
  console.log('');
  console.log(`按段随机划分的泄漏（每人 ${a.segPerPerson} 段、训练集占 ${a.trainShare}）：`);
  console.log(`  ${a.segPerPerson} 段全在训练集 ${a.pAll.toFixed(3)}；至少 1 段进验证集 ${a.pLeak.toFixed(3)}`);
  console.log('  → 八成以上的患者在验证集里露过脸，模型只要学会认人就能拿高分。');
  console.log('');
  console.log(`设计效应（每人 ${a.design.m} 段、段内相关 ${a.design.rho}）：1 + (${a.design.m}−1)×${a.design.rho} ＝ ${a.design.de.toFixed(1)}`);
  console.log(`  名义 ${a.nominal.toLocaleString('en-US')} 段的有效样本量 ≈ ${String(a.effective).padStart(3)}；区间宽度放大 ${a.design.inflation.toFixed(2)} 倍`);
  console.log('');
  console.log('※ 参数量、感受野、泄漏比例与设计效应都是正文的演算设定，不来自任何实测模型或数据集。');
  console.log('※ 本章不推荐网络结构，也不给参数量与样本量的配比；配比以本机构数据与验证结果确定。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, tables, convParams, receptiveField, pAllInTrain, design };
