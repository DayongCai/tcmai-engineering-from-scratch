#!/usr/bin/env node
/**
 * 医学遗传学 · 第 1 章 遗传学的医学价值不在「找到那个基因」，在「把个体风险从人群平均里拆出来」
 * 课程: departments/09-jichu/09-yixue-yichuan-xue/chapters/01-yichuanxue-gailun/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的算式全部从正文现算：正文明写的输入（q = 1/100、灵敏度 90%、携带率 1/50）进公式，
 * 算出的结果再与正文里写下的同一个数对照。正文改一个输入，这里立刻对不上——手打的数会静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const TITLE = '遗传学的医学价值不在「找到那个基因」，在「把个体风险从人群平均里拆出来」';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 结构量：汉字数、节（## 标题）、表格、加粗判断、代码块 */
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
    fences: (body.match(/^```/gm) || []).length / 2,
  };
}

/** 三道换算：每一个数都由正文写下的输入算出来，再与正文写下的结果对照 */
function figures(text) {
  const q = 0.01;               // 正文：q = 1/100
  const p = 1 - q;
  const carrier = 2 * p * q;    // 2pq
  const affected = q * q;       // q²
  const sens = 0.9;             // 正文：灵敏度 90%
  const priorCarrier = 0.02;    // 正文：携带率 1/50
  // 正文：(0.1×0.02) / (0.1×0.02 + 0.98×1)，其中 0.98 = 1 − 0.02 为非携带者比例
  const postNeg = (1 - sens) * priorCarrier / ((1 - sens) * priorCarrier + (1 - priorCarrier) * 1);

  return [
    { name: '患者频率 q²', got: affected, stated: 1 / 10000, token: '1/10000' },
    { name: '携带者频率 2pq', got: carrier, stated: 1 / 50, token: '1/50' },
    { name: '携带者∶患者 2p/q', got: carrier / affected, stated: 200, token: '200∶1' },
    { name: '患者×人群成员的子代风险', got: 1 * priorCarrier * 0.5, stated: 1 / 100, token: '1/100' },
    { name: '表型正常同胞为携带者', got: 0.5 / 0.75, stated: 2 / 3, token: '2/3' },
    { name: '阴性后的残余携带概率', got: postNeg, stated: 1 / 490, token: '1/490' },
  ].map((f) => ({ ...f, ok: Math.abs(f.got - f.stated) <= 0.03 * Math.abs(f.stated) }));
}

function fmt(x) {
  if (x >= 100) return x.toFixed(0);
  if (x >= 1) return x.toFixed(2);
  return x.toPrecision(4);
}

function main() {
  const text = read();
  const a = analyze(text);
  const rows = figures(text);

  console.log(`医学遗传学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算，或由正文明写的输入代入公式算得）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tables} 张 · 加粗判断 ${a.claims} 处`);
  console.log('');
  console.log('三道换算：');
  for (const r of rows) {
    const mark = r.ok ? '✓' : '✗ 与正文不符';
    console.log(`  ${r.name.padEnd(16, '　')} 算得 ${fmt(r.got).padStart(9)} · 正文 ${r.token}  ${mark}`);
  }
  console.log('');
  console.log('读法：人群频率是分母，家系信息切开分母，检验结果再切一次；每切一次都在剔除一类人。');
  console.log('※ 1/50、90%、1/490、200∶1 均为教学设定或常引口径，只演示换算结构，不代表任何人群的实测值。');
  console.log('※ 本输出仅用于教学演示，不构成医学意见、诊断或遗传咨询结论。');
  if (rows.some((r) => !r.ok)) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, figures };
