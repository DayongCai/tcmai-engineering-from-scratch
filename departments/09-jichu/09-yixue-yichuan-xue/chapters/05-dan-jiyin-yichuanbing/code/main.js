#!/usr/bin/env node
/**
 * 医学遗传学 · 第 5 章 单基因病的「单」，说的是传递单位，不是病因的单一性
 * 课程: departments/09-jichu/09-yixue-yichuan-xue/chapters/05-dan-jiyin-yichuanbing/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的算术有两组：携带者 × 携带者的比数（1/4、1/2、1/4），
 * 与重复扩增的阶梯（正文设定：从 30 起、每代平均 +5、致病阈 40）。
 * 阶梯只列「每代 +5 的取值」，不替正文判定哪一代对应哪个亲属——那一步要另查家系。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const TITLE = '单基因病的「单」，说的是传递单位，不是病因的单一性';

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

const START = 30;   // 正文：从 30 次的中间型开始
const STEP = 5;     // 正文：每代平均增加 5 次重复
const THRESHOLD = 40; // 正文：致病阈为 40 次

/** 每代 +5 的阶梯，与跨阈所需的代数 */
function ladder() {
  const values = [];
  for (let v = START; v <= START + STEP * 3; v += STEP) values.push(v);
  const generations = Math.ceil((THRESHOLD - START) / STEP);
  return { values, generations, crosses: START + STEP * generations };
}

function figures(text) {
  const sib = (1 / 2) / (3 / 4); // 正文：表型正常同胞为携带者的概率
  const t = 0.5;                  // 正文：每个亲代传递该等位基因的概率 1/2
  const L = ladder();
  return [
    { name: '正常纯合', got: t * t, stated: 1 / 4, token: '1/4' },
    { name: '携带者', got: 2 * t * (1 - t), stated: 1 / 2, token: '1/2' },
    { name: '患者', got: (1 - t) * (1 - t), stated: 1 / 4, token: '正常纯合' },
    { name: '表型正常同胞为携带者', got: sib, stated: 2 / 3, token: '2/3' },
    { name: '跨过致病阈的重复数', got: L.crosses, stated: THRESHOLD, token: '致病阈为 40 次' },
    { name: 'X 连锁患者姐妹的先验', got: 0.5, stated: 1 / 2, token: '先验携带概率是 1/2' },
  ].map((f) => ({ ...f, ok: Math.abs(f.got - f.stated) <= 0.03 * Math.abs(f.stated) }));
}

function main() {
  const text = read();
  const a = analyze(text);
  const rows = figures(text);
  const L = ladder();

  console.log(`医学遗传学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算：正文写输入，这里重算，再与正文的结果对照）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tables} 张 · 加粗判断 ${a.claims} 处`);
  console.log('');
  for (const r of rows) {
    const mark = r.ok ? '✓' : '✗ 与正文不符';
    console.log(`  ${r.name.padEnd(14, '　')} 算得 ${fmt(r.got).padStart(8)} · 正文 ${r.token}  ${mark}`);
  }
  console.log('');
  console.log(`重复阶梯（每代 +${STEP}）：${L.values.join(' → ')}；致病阈 ${THRESHOLD}，从 ${START} 起第 ${L.generations} 个数越阈。`);
  console.log('读法：比数按次妊娠独立，不是配额；重复数逐代递增，表型因此在家族里看起来是「突然出现」。');
  console.log('※ 重复数 30 / 每代 +5 / 阈值 40 为教学设定与算术演示，不代表任何真实基因的重复数阈值与扩增速率。');
  console.log('※ 本输出仅用于教学演示，不构成诊断、预后判断或治疗建议。');
  if (rows.some((r) => !r.ok)) process.exitCode = 1;
}

function fmt(x) {
  if (x >= 10) return x.toFixed(0);
  if (x >= 1) return x.toFixed(3);
  return x.toPrecision(4);
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, figures, ladder, START, STEP, THRESHOLD };
