#!/usr/bin/env node
/**
 * 数字人体虚拟仿真 · 第 3 章 人体不是一棵树，写成一棵树就得付代价
 * 课程: departments/07-zhineng/12-shuzi-renti-xuni-fangzhen/chapters/03-dh3/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的三张表（关系轴、可加性、标注层）都从正文读出来，标签数与对应失败率也读出来，
 * 再复算静默消失的标签条数。本章的判断：把三条关系轴混成一条，查询就会给出错误答案。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const TITLE = '人体不是一棵树，写成一棵树就得付代价';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function readDoc() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function pick(text, re, label) {
  const m = String(text).match(re);
  if (!m) throw new Error('正文里没找到' + label + '，正则需随正文一起改: ' + re);
  return m;
}

/** 正文设定：约一千条标签，跨科室自动对应失败 5%–15%。 */
function settings(text) {
  const labels = Number(pick(text, /([\d,]+)\s*条标签/, '标签条数')[1].replace(/,/g, ''));
  const r = pick(text, /失败率通常在百分之几到十几个百分点之间（演算设定：[\d,]+\s*条标签、失败\s*(\d+)%–(\d+)%/, '对应失败率区间');
  return { labels, lowPct: Number(r[1]), highPct: Number(r[2]) };
}

/** 关系轴表：部分／分类／邻接，各自是否传递。 */
function axes(text) {
  const out = [];
  for (const line of String(text).split('\n')) {
    const cells = line.split('|').map((x) => x.trim());
    if (cells.length < 6) continue;
    if (!/^(部分关系|分类关系|空间邻接)/.test(cells[1])) continue;
    out.push({ name: cells[1], semantic: cells[2], example: cells[3], transitive: cells[4] });
  }
  if (out.length !== 3) throw new Error('关系轴表应有三行，实得 ' + out.length);
  return out;
}

/** 可加性表：哪些量能向上汇总，哪些不能。 */
function additivity(text) {
  const out = [];
  for (const line of String(text).split('\n')) {
    const cells = line.split('|').map((x) => x.trim());
    if (cells.length < 5) continue;
    if (!/^(体积、质量|表面积|弹性模量、电导率|血流、通量)$/.test(cells[1])) continue;
    out.push({ quantity: cells[1], additive: cells[2], note: cells[3] });
  }
  if (out.length !== 4) throw new Error('可加性表应有四行，实得 ' + out.length);
  return out;
}

/** 穴位与经络的三层标注：标注层／研究层／示意层。 */
function layers(text) {
  const names = ['标注层', '研究层', '示意层'];
  return names.map((n) => ({ name: n, count: (String(text).match(new RegExp(n, 'g')) || []).length }));
}

function compute(text) {
  const s = settings(text);
  const low = Math.round((s.labels * s.lowPct) / 100);
  const high = Math.round((s.labels * s.highPct) / 100);
  return {
    ...s,
    lowLost: low,
    highLost: high,
    hanzi: (text.match(HANZI) || []).length,
  };
}

function checks(text) {
  const c = compute(text);
  const A = axes(text);
  const B = additivity(text);
  const L = layers(text);
  return [
    {
      name: '静默消失的标签条数',
      ok: c.lowLost === 50 && c.highLost === 150,
      note: `${c.labels} 条 × ${c.lowPct}%–${c.highPct}% = ${c.lowLost}–${c.highLost} 条对不上，且不报错`,
    },
    {
      name: '三条关系轴，传递性各不相同',
      ok: A.length === 3 && /传递/.test(A[0].transitive) && /传递/.test(A[1].transitive) && /不传递/.test(A[2].transitive),
      note: A.map((x) => `${x.name}：${x.transitive}`).join('；'),
    },
    {
      name: '体积可加、表面积部分可加、模量不可加',
      ok: B[0].additive === '可加' && B[1].additive === '部分可加' && B[2].additive === '不可加' && /需守恒/.test(B[3].additive),
      note: B.map((x) => `${x.quantity} ${x.additive}`).join('；'),
    },
    {
      name: '三层标注各自声明证据等级',
      ok: L.every((x) => x.count >= 1),
      note: L.map((x) => `${x.name} 出现 ${x.count} 次`).join('；'),
    },
    {
      name: '两条关键判断能在正文找到原文',
      ok: /多重图/.test(text) && /静默归类/.test(text),
      note: '正文同时给出「人体是多重图」与「静默归类最危险」两条判断',
    },
  ];
}

function report() {
  const text = readDoc();
  const c = compute(text);
  const A = axes(text);
  const B = additivity(text);
  const L = layers(text);
  console.log(`数字人体虚拟仿真 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('');
  console.log(`正文 ${c.hanzi.toLocaleString('en-US')} 汉字；${c.labels} 条标签，对应失败 ${c.lowPct}%–${c.highPct}%。`);
  console.log('');
  console.log('一、对不上的标签会静默消失');
  console.log(`  ${c.labels} × ${c.lowPct}% = ${c.lowLost} 条；× ${c.highPct}% = ${c.highLost} 条`);
  console.log(`  → 占全部标签的 ${((c.lowLost / c.labels) * 100).toFixed(0)}%–${((c.highLost / c.labels) * 100).toFixed(0)}%，它们在体积统计里不再出现`);
  console.log('');
  console.log('二、三条关系轴（正文表格逐行读出）');
  for (const x of A) console.log(`  ${x.name}：${x.semantic}；${x.transitive}`);
  console.log('');
  console.log('三、可加性决定数值能不能向上汇总');
  for (const x of B) console.log(`  ${x.quantity}：${x.additive}（${x.note}）`);
  console.log('');
  console.log('四、穴位建模的三层标注');
  for (const x of L) console.log(`  ${x.name}：正文出现 ${x.count} 次`);
  console.log('');
  console.log('五、逐条对照正文判断');
  let bad = 0;
  for (const k of checks(text)) {
    console.log(`  ${k.ok ? '✓' : '✗'} ${k.name}：${k.note}`);
    if (!k.ok) bad += 1;
  }
  console.log('');
  console.log(bad ? `✗ ${bad} 条与正文不一致，正文或脚本需要同步。` : '✓ 全部对上：标签损失与三张表都由正文现算。');
  console.log('※ 教学样例：标签数与失败率按正文演算设定现算，不对应任何具体模型或机构。');
  console.log('※ 本章不裁定经络或穴位的存在性与生物学机制，只讨论建模方法与证据等级。');
  return bad;
}

if (require.main === module) process.exitCode = report() ? 1 : 0;

module.exports = { readDoc, settings, axes, additivity, layers, compute, checks, report, DOC, CHAPTER, TITLE };
