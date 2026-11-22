#!/usr/bin/env node
/**
 * 数字人体虚拟仿真 · 第 8 章 去掉了姓名，人体数据仍然是一个人
 * 课程: departments/07-zhineng/12-shuzi-renti-xuni-fangzhen/chapters/08-dh8/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的重识别算例从正文现算：读正文给出的分箱数、样本量与正文自己的泊松近似结果，
 * 用 λe^-λ 复算独占一格的期望人数与占比，再看把身高档数压紧之后 k 与信息量如何互换。
 * 本章的判断：去标识处理的是名字，重识别利用的是组合。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const TITLE = '去掉了姓名，人体数据仍然是一个人';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function readDoc() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 把正文的 LaTeX 小记号洗成可以取数的样子。 */
function normalize(text) {
  return String(text)
    .replace(/\\times/g, '×')
    .replace(/\\approx/g, '≈')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\(?:text|mathrm)\{([^}]*)\}/g, '$1')
    .replace(/\{,\}/g, ',')
    .replace(/\^\{([^}]*)\}/g, '^$1')
    .replace(/\$/g, '')
    .replace(/\\/g, '');
}

function pick(text, re, label) {
  const m = String(text).match(re);
  if (!m) throw new Error('正文里没找到' + label + '，正则需随正文一起改: ' + re);
  return m;
}

/** 正文设定：分箱、样本量、正文给出的 λ、独占概率与占比。 */
function settings(text) {
  const t = normalize(text);
  const b = pick(t, /(\d+)×(\d+)×(\d+)=([\d,]+)\s*个格子/, '分箱与格子数');
  return {
    bins: [Number(b[1]), Number(b[2]), Number(b[3])],
    statedCells: Number(b[4].replace(/,/g, '')),
    n: Number(pick(t, /([\d,]+)\s*例样本随机落入/, '样本量')[1].replace(/,/g, '')),
    lambdaStated: Number(pick(t, /λ\s*=\s*[\d,]+\/[\d,]+\s*=\s*([\d.]+)/, '正文 λ')[1]),
    p1Stated: Number(pick(t, /e\^-0\.5≈\s*([\d.]+)/, '正文独占概率')[1]),
    expectedStated: Number(pick(t, /≈(\d+)，占/, '正文独占人数')[1]),
    shareStated: Number(pick(t, /占\s*[\d,]+\s*例的\s*\*{0,2}(\d+)%/i, '正文独占占比')[1]),
    tightBins: Number(pick(t, /把身高从\s*(\d+)\s*档压到\s*(\d+)\s*档/, '身高档数压缩')[2]),
  };
}

/** 泊松：一格恰有 k 人的概率。 */
function poisson(k, lambda) {
  let fact = 1;
  for (let i = 1; i <= k; i += 1) fact *= i;
  return (lambda ** k) * Math.exp(-lambda) / fact;
}

function compute(text) {
  const s = settings(text);
  const cells = s.bins.reduce((a, b) => a * b, 1);
  const lambda = s.n / cells;
  const p1 = poisson(1, lambda);
  const expected = cells * p1;
  const share = (expected / s.n) * 100;
  const tightCells = s.tightBins * s.bins[1] * s.bins[2];
  const tightLambda = s.n / tightCells;
  return {
    ...s,
    cells,
    lambda,
    p1,
    expected,
    share,
    tightCells,
    tightLambda,
    hanzi: (text.match(HANZI) || []).length,
  };
}

function checks(text) {
  const c = compute(text);
  const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-9);
  return [
    {
      name: '格子数等于三档相乘',
      ok: c.cells === c.statedCells && c.bins.reduce((a, b) => a * b, 1) === 1000,
      note: `${c.bins.join('×')} = ${c.cells.toLocaleString('en-US')} 个格子（正文 ${c.statedCells.toLocaleString('en-US')}）`,
    },
    {
      name: '平均每格人数 = 样本 ÷ 格子',
      ok: rel(c.lambda, c.lambdaStated) < 1e-9,
      note: `${c.n} ÷ ${c.cells} = ${c.lambda} 人/格（正文 λ = ${c.lambdaStated}）`,
    },
    {
      name: '独占概率按 λe^-λ 复算',
      ok: Math.abs(c.p1 - c.p1Stated) < 0.002,
      note: `λe^-λ = ${c.lambda}×e^-${c.lambda} = ${c.p1.toFixed(4)}（正文 ≈ ${c.p1Stated}）`,
    },
    {
      name: '独占一格的期望人数',
      ok: Math.round(c.expected) === c.expectedStated,
      note: `${c.cells} × ${c.p1.toFixed(3)} = ${c.expected.toFixed(1)}，取整 ${Math.round(c.expected)}（正文 ≈ ${c.expectedStated}）`,
    },
    {
      name: '独占比例',
      ok: Math.round(c.share) === c.shareStated,
      note: `${c.expected.toFixed(1)} ÷ ${c.n} = ${c.share.toFixed(1)}%（正文 ${c.shareStated}%）`,
    },
    {
      name: '压紧档数换来更粗的等价类',
      ok: c.tightCells === 300 && c.tightLambda > 1.5,
      note: `身高压到 ${c.tightBins} 档 → ${c.tightCells} 个格子、${c.tightLambda.toFixed(2)} 人/格：k 上去了，身高的解释力掉下来`,
    },
  ];
}

function report() {
  const text = readDoc();
  const c = compute(text);
  console.log(`数字人体虚拟仿真 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('');
  console.log(`正文 ${c.hanzi.toLocaleString('en-US')} 汉字；${c.bins.join('×')} 分箱、${c.n} 例样本。`);
  console.log('');
  console.log('一、准标识组合的重识别算例');
  console.log(`  格子 ${c.cells.toLocaleString('en-US')}，λ = ${c.n}/${c.cells} = ${c.lambda} 人/格`);
  console.log(`  一格恰有一人的概率 λe^-λ = ${c.p1.toFixed(4)}`);
  console.log(`  期望独占人数 ${c.expected.toFixed(1)}，占 ${c.share.toFixed(1)}%`);
  console.log('  → 三个粗粒度形态量就足以让六成人成为「唯一的那一个」');
  console.log('');
  console.log('二、k 与信息量的互换');
  console.log(`  身高 10 档 → ${c.cells} 格、${c.lambda} 人/格`);
  console.log(`  身高 3 档 → ${c.tightCells} 格、${c.tightLambda.toFixed(2)} 人/格；k 变大，身高对模型的解释力变小`);
  console.log('');
  console.log('三、逐条对照正文数字');
  let bad = 0;
  for (const k of checks(text)) {
    console.log(`  ${k.ok ? '✓' : '✗'} ${k.name}：${k.note}`);
    if (!k.ok) bad += 1;
  }
  console.log('');
  console.log(bad ? `✗ ${bad} 条与正文不一致，正文或脚本需要同步。` : '✓ 全部对上：重识别比例由分箱与样本量现算，不靠手打。');
  console.log('※ 教学样例：分箱与样本量按正文演算设定现算，不对应任何真实数据集；泊松近似假设样本独立同分布。');
  console.log('※ 本章不引用法规条文，也不构成合规结论或法律意见。');
  return bad;
}

if (require.main === module) process.exitCode = report() ? 1 : 0;

module.exports = { readDoc, normalize, settings, poisson, compute, checks, report, DOC, CHAPTER, TITLE };
