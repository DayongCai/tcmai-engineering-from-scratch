#!/usr/bin/env node
/**
 * 医学遗传学 · 第 6 章 多基因病不在某一条染色体上，在「易患性的分布」里
 * 课程: departments/09-jichu/09-yixue-yichuan-xue/chapters/06-duo-jiyin-yuzhi-moxing/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的算式只有一条：阈值模型给出的近似——一级亲属再发风险 ≈ √p。
 * 正文列了三组 p，这里按 √p 重算，再与正文写下的结果（3.2%、1.0%、10%）与倍数（32/10/3）对照。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const TITLE = '多基因病不在某一条染色体上，在「易患性的分布」里';

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

/** 一级亲属风险 ≈ √p，倍数 = √p / p = 1/√p */
const firstDegree = (p) => Math.sqrt(p);

function figures(text) {
  return [
    { name: 'p=1/1000 一级亲属', got: firstDegree(1 / 1000) * 100, stated: 3.2, token: '3.2%' },
    { name: 'p=1/1000 相对人群倍数', got: Math.round(firstDegree(1 / 1000) / (1 / 1000)), stated: 32, token: '32 倍' },
    { name: 'p=1/10000 一级亲属', got: firstDegree(1 / 10000) * 100, stated: 1.0, token: '1.0%' },
    { name: 'p=1/100 一级亲属', got: firstDegree(1 / 100) * 100, stated: 10, token: '10%' },
    { name: 'p=1/10 相对人群倍数', got: Math.round(firstDegree(0.1) / 0.1), stated: 3, token: '约 3 倍' },
  ].map((f) => ({ ...f, ok: Math.abs(f.got - f.stated) <= 0.03 * Math.abs(f.stated) }));
}

function fmt(x) {
  if (x >= 10) return x.toFixed(1);
  if (x >= 1) return x.toFixed(2);
  return x.toPrecision(3);
}

function main() {
  const text = read();
  const a = analyze(text);
  const rows = figures(text);
  const p = 1 / 1000;
  const f1 = firstDegree(p);

  console.log(`医学遗传学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算：按正文的 √p 近似重算，再与正文写下的结果对照）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tables} 张 · 加粗判断 ${a.claims} 处`);
  console.log('');
  for (const r of rows) {
    const mark = r.ok ? '✓' : '✗ 与正文不符';
    console.log(`  ${r.name.padEnd(18, '　')} 算得 ${fmt(r.got).padStart(7)} · 正文 ${r.token}  ${mark}`);
  }
  console.log('');
  console.log(`二级亲属 ≈ 一级 × 1/2 = ${(f1 / 2 * 100).toFixed(2)}%；三级 ≈ 一级 × 1/4 = ${(f1 / 4 * 100).toFixed(2)}%。`);
  console.log('读法：倍数随罕见程度放大，绝对风险仍低；风险是个位数百分比，与单基因病的十位数百分比差一个量级。');
  console.log('※ √p 为阈值模型的标准近似；1/1000、3.2%、32/10/3 倍为教学设定与由此推导的结果，不代表任何疾病的实测值。');
  console.log('※ 本输出仅用于教学演示，不构成医学意见、风险预测或治疗建议。');
  if (rows.some((r) => !r.ok)) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, figures, firstDegree };
