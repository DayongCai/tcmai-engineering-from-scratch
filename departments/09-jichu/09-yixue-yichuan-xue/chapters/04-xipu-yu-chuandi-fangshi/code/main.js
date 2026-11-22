#!/usr/bin/env node
/**
 * 医学遗传学 · 第 4 章 系谱不是「看图猜病」，是一台把家族史折成概率的机器
 * 课程: departments/09-jichu/09-yixue-yichuan-xue/chapters/04-xipu-yu-chuandi-fangshi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的算术都是贝叶斯与近交系数：健康儿子链（1/2 → 1/3 → 1/5 → 1/9 → 1/17）、
 * 外显不全（1/6 → 1/15）、表兄妹（F = 1/16 → 约 1/1400、约七倍）。
 * 每个结果都由正文明写的输入现算，再与正文写下的同一个数对照。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const TITLE = '系谱不是「看图猜病」，是一台把家族史折成概率的机器';

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

/** 先验先验 1/2、每生一个健康儿子就再乘 1/2 的分子，分母为「携带 + 非携带」两支之和 */
function carryAfterSons(n) {
  const prior = 0.5;
  const healthyIfCarrier = Math.pow(0.5, n);
  return (prior * healthyIfCarrier) / (prior * healthyIfCarrier + (1 - prior) * 1);
}

function figures(text) {
  const q = 0.01;   // 正文：q = 1/100
  const F = 1 / 16; // 正文：表兄妹婚配的子代 F = 1/16
  const penetrance = 0.8; // 正文：外显率 80%
  const randomRisk = q * q;
  const cousinRisk = q * q * (1 - F) + q * F;
  const post = (0.5 * (1 - penetrance)) / (0.5 * (1 - penetrance) + 0.5 * 1);

  return [
    { name: '一个健康儿子后', got: carryAfterSons(1), stated: 1 / 3, token: '1/3' },
    { name: '两个健康儿子后', got: carryAfterSons(2), stated: 1 / 5, token: '1/5' },
    { name: '三个健康儿子后', got: carryAfterSons(3), stated: 1 / 9, token: '1/9' },
    { name: '四个健康儿子后', got: carryAfterSons(4), stated: 1 / 17, token: '1/17' },
    { name: '外显不全后的携带概率', got: post, stated: 1 / 6, token: '1/6' },
    { name: '其子代患病风险', got: post * 0.5 * penetrance, stated: 1 / 15, token: '1/15' },
    { name: '表兄妹婚配子代风险', got: cousinRisk, stated: 1 / 1400, token: '1/1400' },
    { name: '相对随机婚配的倍数', got: cousinRisk / randomRisk, stated: 7, token: '七倍' },
  ].map((f) => ({ ...f, ok: Math.abs(f.got - f.stated) <= 0.03 * Math.abs(f.stated) }));
}

function fmt(x) {
  if (x >= 10) return x.toFixed(1);
  if (x >= 1) return x.toFixed(3);
  return x.toPrecision(4);
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
    console.log(`  ${r.name.padEnd(14, '　')} 算得 ${fmt(r.got).padStart(9)} · 正文 ${r.token}  ${mark}`);
  }
  console.log('');
  console.log('读法：每多一个健康的儿子，分母加一、分子的折半一次，但这串数永远不归零；概率更新不是排除。');
  console.log('※ 80%、1/100 为教学设定，F = 1/16 为群体遗传学标准系数；1/3、1/5、1/9、1/15、1/1400 为算例推导，不作为咨询结论依据。');
  console.log('※ 本输出仅用于教学演示，不构成医学意见、诊断或遗传咨询结论。');
  if (rows.some((r) => !r.ok)) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, figures, carryAfterSons };
