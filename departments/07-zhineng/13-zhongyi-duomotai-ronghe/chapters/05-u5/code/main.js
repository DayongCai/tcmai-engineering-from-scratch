#!/usr/bin/env node
/**
 * 中医多模态融合 · 第 5 章：学到的表征，未必是你想要的那个
 * 正文: departments/07-zhineng/13-zhongyi-duomotai-ronghe/chapters/05-u5/docs/zh.md
 * 取数: 解析正文开篇的 AUROC 落差与编码器参数分项
 * 依赖: 仅 Node.js 标准库
 *
 * 现算：各编码器参数合计、参数与样本比、训练与留出的落差、切分方式造成的落差。
 * 参数分项与 AUROC 都从正文读，改一个数，结论跟着变。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

function parseDoc(text) {
  const lines = String(text).split(/\r?\n/);
  const titleLine = lines.find((l) => /^#\s+/.test(l)) || '';
  const heading = titleLine.replace(/^#\s+/, '').trim();
  const chapterNo = Number((heading.match(/第\s*(\d+)\s*章/) || [])[1]) || null;
  const title = heading.replace(/^第\s*\d+\s*章\s*·?\s*/, '');
  const problem = (text.match(/\*\*PROBLEM:\*\*\s*([\s\S]*?)\r?\n\r?\n/) || [])[1] || '';
  const sections = lines.filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
  const tables = [];
  let cur = null;
  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith('|')) { cur = null; continue; }
    const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    if (!cur) { cur = []; tables.push(cur); }
    cur.push(cells);
  }
  const hanzi = (text.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
  return { text, title, chapterNo, problem, sections, tables, hanzi };
}

function encoderBudget(doc) {
  const m = doc.text.match(
    /图像编码器\s*([\d.]+)\s*M、脉图\s*([\d.]+)\s*M、语音\s*([\d.]+)\s*M、文本\s*([\d.]+)\s*M，融合头\s*([\d.]+)\s*M/
  );
  if (!m) return { parts: [], totalM: NaN };
  const parts = [
    { name: '图像', m: Number(m[1]) },
    { name: '脉图', m: Number(m[2]) },
    { name: '语音', m: Number(m[3]) },
    { name: '文本', m: Number(m[4]) },
    { name: '融合头', m: Number(m[5]) },
  ];
  return { parts, totalM: parts.reduce((a, b) => a + b.m, 0) };
}

function analyze(doc) {
  const budget = encoderBudget(doc);
  const samples = Number((doc.problem.match(/(\d+)\s*例、\s*4\s*模态/) || [])[1]);
  const overfit = doc.text.match(/训练集 AUROC\s*([\d.]+)，留出集\s*([\d.]+)/);
  const split = doc.text.match(/按记录随机切分时 AUROC\s*([\d.]+)，按患者切分时\s*([\d.]+)/);
  return {
    budget,
    samples,
    ratio: (budget.totalM * 1e6) / samples,
    trainAuroc: overfit ? Number(overfit[1]) : NaN,
    holdoutAuroc: overfit ? Number(overfit[2]) : NaN,
    overfitGap: overfit ? Number(overfit[1]) - Number(overfit[2]) : NaN,
    recordSplit: split ? Number(split[1]) : NaN,
    patientSplit: split ? Number(split[2]) : NaN,
    splitGap: split ? Number(split[1]) - Number(split[2]) : NaN,
  };
}

function main() {
  const doc = parseDoc(fs.readFileSync(DOC, 'utf8'));
  const a = analyze(doc);

  console.log(`中医多模态融合 · 第 ${doc.chapterNo} 章 ${doc.title}`);
  console.log('');
  console.log(`正文 ${doc.hanzi.toLocaleString('en-US')} 汉字 · ${doc.sections.length} 节 · ${doc.tables.length} 张表`);
  console.log('');
  console.log('参数量分项（正文给出）：');
  for (const p of a.budget.parts) console.log(`  ${p.name}：${p.m} M`);
  console.log(`  合计：${a.budget.totalM.toFixed(1)} M`);
  console.log('');
  console.log(`配对样本 ${a.samples} 组 → 参数与样本比 ${Math.round(a.ratio).toLocaleString('en-US')} : 1`);
  console.log(`  训练集 ${a.trainAuroc} / 留出集 ${a.holdoutAuroc} → 落差 ${a.overfitGap.toFixed(2)}`);
  console.log(`  按记录切分 ${a.recordSplit} / 按患者切分 ${a.patientSplit} → 落差 ${a.splitGap.toFixed(2)}（全部来自记住了人）`);
  console.log('');
  console.log('※ 教学样例：数字由本章正文现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出不构成诊断模型的设计规范或性能承诺。');
}

if (require.main === module) main();

module.exports = { DOC, parseDoc, analyze, encoderBudget };
