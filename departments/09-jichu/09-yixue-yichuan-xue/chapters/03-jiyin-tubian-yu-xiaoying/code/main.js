#!/usr/bin/env node
/**
 * 医学遗传学 · 第 3 章 突变的后果不取决于它多大，取决于它落在哪一格、以及阅读框还在不在
 * 课程: departments/09-jichu/09-yixue-yichuan-xue/chapters/03-jiyin-tubian-yu-xiaoying/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的算术只有两条：密码子层面的 3/64（移码撞终止的期望），与比数层面的 2/3（同胞携带）。
 * 两条都从正文明写的输入重算，再与正文写下的结果对照。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const TITLE = '突变的后果不取决于它多大，取决于它落在哪一格、以及阅读框还在不在';

const PROTEIN = 500; // 正文：一个编码 500 个氨基酸的蛋白

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

/**
 * 两条算术：
 *   移码撞终止——64 个密码子中 3 个终止，期望间隔 64/3 个密码子；
 *   同胞携带——比数 1/4 : 1/2 : 1/4，已知未患病后在剩余 3/4 中重算。
 * 另附 500 个氨基酸的蛋白在中段移码后剩余可译长度的期望。
 */
function figures(text) {
  const codons = 64;
  const stops = 3;
  const pStop = stops / codons;
  const gap = 1 / pStop;

  return [
    { name: '终止密码子占比', got: pStop, stated: 1 / 21, token: '1/21' },
    { name: '撞终止的期望间隔', got: gap, stated: 21, token: '21 个密码子' },
    { name: '同胞为携带者', got: (1 / 2) / (3 / 4), stated: 2 / 3, token: '2/3' },
    { name: '复合杂合生患儿的组合', got: (1 / 2) * (1 / 2), stated: 1 / 4, token: '概率 1/4' },
  ].map((f) => ({ ...f, ok: Math.abs(f.got - f.stated) <= 0.03 * Math.abs(f.stated) }));
}

function fmt(x) {
  if (x >= 10) return x.toFixed(1);
  if (x >= 1) return x.toFixed(3);
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
    console.log(`  ${r.name.padEnd(14, '　')} 算得 ${fmt(r.got).padStart(8)} · 正文 ${r.token}  ${mark}`);
  }
  console.log('');
  const stopAt = PROTEIN / 2 + 64 / 3;
  console.log(`中段移码的 ${PROTEIN} 氨基酸蛋白：期望在第 ${Math.round(stopAt)} 位遇到终止，约为原长的 ${((stopAt / PROTEIN) * 100).toFixed(0)}%。`);
  console.log('读法：64 个密码子里有 3 个终止，移码后的序列平均二十来个密码子就断；截短不等于功能丧失，要看产物还能不能干扰正常拷贝。');
  console.log('※ 64/3/1/21 为通用事实与算术推导；1/100 的等位基因频率为教学设定，2/3 为可推导的比数结果。');
  console.log('※ 本输出仅用于教学演示，不构成变异致病性判定或医学意见。');
  if (rows.some((r) => !r.ok)) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, figures };
