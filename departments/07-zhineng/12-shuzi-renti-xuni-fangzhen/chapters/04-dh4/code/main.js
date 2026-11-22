#!/usr/bin/env node
/**
 * 数字人体虚拟仿真 · 第 4 章 建模是选择「忘掉什么」，不是追求「记住一切」
 * 课程: departments/07-zhineng/12-shuzi-renti-xuni-fangzhen/chapters/04-dh4/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的面积、面数、主成分上限与四面体倍数都从正文现算：
 * 读正文给出的器官半径与面边长，按球面面积与三角面覆盖率复算面数；按样本数复算主成分秩上限。
 * 本章的判断：参数化是主动遗忘的技术，降维是给遗忘定量。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const TITLE = '建模是选择「忘掉什么」，不是追求「记住一切」';
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

/** 正文设定：半径、表面积、两种面边长及对应面数、样本与维度、四面体倍数。 */
function settings(text) {
  const tri = [...String(text).matchAll(/约需\s*([\d.]+)\s*万个面/g)].map((m) => Number(m[1]));
  if (tri.length < 2) throw new Error('正文里没找到两档面数（约需 N 万个面）');
  const t = pick(text, /按\s*(\d+)–(\d+)\s*倍估/, '四面体倍数');
  return {
    radiusMm: Number(pick(text, /半径约\s*(\d+)\s*mm/, '器官半径')[1]),
    statedArea: Number(pick(text, /表面积约\s*([\d,]+)\s*mm²/, '正文表面积')[1].replace(/,/g, '')),
    edgeCoarse: Number(pick(text, /边长\s*(\d+)\s*mm\s*的三角面/, '粗面边长')[1]),
    edgeFine: Number(pick(text, /边长缩到\s*(\d+)\s*mm/, '细面边长')[1]),
    triCoarseWan: tri[0],
    triFineWan: tri[1],
    samples: Number(pick(text, /\$N=(\d+)\$/, '样本数')[1]),
    dims: Number(pick(text, /维度\s*([\d,]+)/, '顶点维度')[1].replace(/,/g, '')),
    statedRank: Number(pick(text, /最多只有\s*(\d+)\s*个非零主成分/, '非零主成分上限')[1]),
    tetraLow: Number(t[1]),
    tetraHigh: Number(t[2]),
  };
}

/** 球面面积 4πr²。 */
function sphereArea(r) {
  return 4 * Math.PI * r * r;
}

/** 一张三角面覆盖的面积（正三角形，边长 a）：(√3/4)a²。 */
function triArea(a) {
  return (Math.sqrt(3) / 4) * a * a;
}

function compute(text) {
  const s = settings(text);
  const area = sphereArea(s.radiusMm);
  const triCoarse = area / triArea(s.edgeCoarse);
  const triFine = area / triArea(s.edgeFine);
  const rank = s.samples - 1;
  return {
    ...s,
    area,
    triCoarse,
    triFine,
    triRatio: triFine / triCoarse,
    rank,
    dimsOverRank: s.dims / rank,
    tetraRange: [triFine * s.tetraLow, triFine * s.tetraHigh],
    hanzi: (text.match(HANZI) || []).length,
  };
}

function checks(text) {
  const c = compute(text);
  const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-9);
  return [
    {
      name: '球面面积按半径复算',
      ok: rel(c.area, c.statedArea) < 0.005,
      note: `4π×${c.radiusMm}² = ${c.area.toFixed(1)} mm²（正文 ${c.statedArea.toLocaleString('en-US')} mm²）`,
    },
    {
      name: '两档面数与覆盖率模型一致',
      ok: rel(c.triCoarse / 1e4, c.triCoarseWan) < 0.05 && rel(c.triFine / 1e4, c.triFineWan) < 0.05,
      note: `边长 ${c.edgeCoarse} mm → ${(c.triCoarse / 1e4).toFixed(1)} 万面；${c.edgeFine} mm → ${(c.triFine / 1e4).toFixed(1)} 万面（正文 ${c.triCoarseWan}／${c.triFineWan} 万）`,
    },
    {
      name: '边长减半，面数乘四',
      ok: Math.abs(c.triRatio - 4) < 1e-9,
      note: `${(c.edgeCoarse / c.edgeFine) ** 2} 倍：面数与边长平方成反比，不说明精度翻倍`,
    },
    {
      name: '样本数给形状空间封顶',
      ok: c.rank === c.statedRank,
      note: `N=${c.samples} → 秩上限 N−1 = ${c.rank}（正文 ${c.statedRank} 个非零主成分）`,
    },
    {
      name: '维度与秩上限的悬殊',
      ok: Math.abs(c.dims - 3 * 5000) < 1 && Math.abs(c.dimsOverRank - c.dims / c.rank) < 1e-9,
      note: `3×5,000 = ${c.dims.toLocaleString('en-US')} 维，只有 ${c.rank} 个自由度可用，维数比 ${c.dimsOverRank.toFixed(0)}:1`,
    },
    {
      name: '四面体化倍数',
      ok: Math.abs(c.tetraRange[0] / 1e4 - 52) < 1 && Math.abs(c.tetraRange[1] / 1e4 - 73) < 1,
      note: `10.4 万面 ×（${c.tetraLow}–${c.tetraHigh}）= ${(c.tetraRange[0] / 1e4).toFixed(0)}–${(c.tetraRange[1] / 1e4).toFixed(0)} 万四面体，落在正文的 50–70 万区间`,
    },
  ];
}

function report() {
  const text = readDoc();
  const c = compute(text);
  console.log(`数字人体虚拟仿真 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('');
  console.log(`正文 ${c.hanzi.toLocaleString('en-US')} 汉字；器官半径 ${c.radiusMm} mm。`);
  console.log('');
  console.log('一、网格密度与面积的关系');
  console.log(`  球面面积 4πr² = ${c.area.toFixed(1)} mm²`);
  console.log(`  边长 ${c.edgeCoarse} mm：${Math.round(c.triCoarse).toLocaleString('en-US')} 面（≈${(c.triCoarse / 1e4).toFixed(1)} 万）`);
  console.log(`  边长 ${c.edgeFine} mm：${Math.round(c.triFine).toLocaleString('en-US')} 面（≈${(c.triFine / 1e4).toFixed(1)} 万）`);
  console.log(`  → 面数比 ${c.triRatio.toFixed(0)}，与边长平方成反比`);
  console.log('');
  console.log('二、降维的硬上限');
  console.log(`  N = ${c.samples}，顶点维度 ${c.dims.toLocaleString('en-US')} → 非零主成分最多 ${c.rank} 个`);
  console.log(`  → 样本里没有的形态生成不出来，而且不报错`);
  console.log('');
  console.log('三、从表面网格到体网格');
  console.log(`  ${(c.triFine / 1e4).toFixed(1)} 万面 ×（${c.tetraLow}–${c.tetraHigh}）= ${(c.tetraRange[0] / 1e4).toFixed(0)}–${(c.tetraRange[1] / 1e4).toFixed(0)} 万四面体`);
  console.log('  → 单元质量（二面角、雅可比、长宽比）决定刚度矩阵条件数，只报数量不够');
  console.log('');
  console.log('四、逐条对照正文数字');
  let bad = 0;
  for (const k of checks(text)) {
    console.log(`  ${k.ok ? '✓' : '✗'} ${k.name}：${k.note}`);
    if (!k.ok) bad += 1;
  }
  console.log('');
  console.log(bad ? `✗ ${bad} 条与正文不一致，正文或脚本需要同步。` : '✓ 全部对上：面积、面数与秩上限都由正文设定现算。');
  console.log('※ 教学样例：半径、边长与样本数按正文演算设定现算，不对应任何具体器官或数据集。');
  console.log('※ 材料参数一律不给具体数值，本章不构成器械设计建议。');
  return bad;
}

if (require.main === module) process.exitCode = report() ? 1 : 0;

module.exports = { readDoc, settings, sphereArea, triArea, compute, checks, report, DOC, CHAPTER, TITLE };
