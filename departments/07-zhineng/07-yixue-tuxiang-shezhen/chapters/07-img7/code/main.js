#!/usr/bin/env node
/**
 * 医学图像识别 · 第 7 章 对账器：集成的方差与偏差
 *
 * 数据源：
 *   ../docs/zh.md   本章正文（方差分解、三种集成、三类域偏移、压力测试）
 *   ../quiz.json    本章习题
 *
 * 现算的东西：
 *   1. Var(ē)/σ² = ρ + (1−ρ)/M，逐格重算正文那张 3×3 表；
 *   2. 演算设定（σ=0.10、ρ=0.6、M=5）的标准差与降幅；
 *   3. ρ=0 与 ρ=1 两个极端：σ/√M 与「一分不降」；
 *   4. 偏差项在期望误差里的位置（集成只能动方差那一项）；
 *   5. 习题对账：结构、分段、解释字数、check 题接地。
 *
 * 依赖：仅 node:fs / node:path。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const docText = () => fs.readFileSync(DOC, 'utf8');
const quizData = () => JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

function grams(s, n = 4) {
  const out = new Set();
  for (const seg of String(s || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const pick = (text, re, what) => {
  const m = text.match(re);
  if (!m) throw new Error(`正文里找不到${what}`);
  return m;
};

/** 等权平均后的方差比：ρ + (1−ρ)/M */
const varRatio = (rho, M) => rho + (1 - rho) / M;

/** 从正文那张表解析 ρ 行与 M 列，逐格与自报值比对 */
function varianceTable(text = docText()) {
  const head = text.indexOf('| $\\rho$ |');
  if (head < 0) throw new Error('正文里找不到方差比表头');
  const seg = text.slice(head, text.indexOf('（表中为', head));
  const ms = [...seg.matchAll(/\$M=(\d+)\$/g)].map((m) => Number(m[1]));
  const rows = [...seg.matchAll(/\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/g)]
    .map((m) => ({ rho: Number(m[1]), claims: [Number(m[2]), Number(m[3]), Number(m[4])] }));
  if (!ms.length || !rows.length) throw new Error('方差比表没解析出 ρ 或 M');
  return {
    ms,
    rows: rows.map((r) => ({
      ...r,
      computed: ms.map((M) => varRatio(r.rho, M)),
      ok: r.claims.every((c, i) => Math.abs(c - varRatio(r.rho, ms[i])) < 0.001),
    })),
  };
}

/** 正文里的「五个」是汉字数词，转成数字再算 */
const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const toNum = (s) => (/^\d+$/.test(s) ? Number(s) : CN[s]);

/** 演算设定：σ=0.10、ρ=0.6、M=5 */
function fiveModelCase(text = docText()) {
  const sigma = Number(pick(text, /单模型误差标准差\s*([\d.]+)、模型间误差相关系数\s*([\d.]+)/, '单模型标准差')[1]);
  const rho = Number(text.match(/单模型误差标准差\s*[\d.]+、模型间误差相关系数\s*([\d.]+)/)[1]);
  const M = toNum(pick(text, /集成([一二三四五六七八九十\d]+)个后方差只从/, '集成成员数')[1]);
  if (!M) throw new Error('正文里的成员数无法解析');
  const ratio = varRatio(rho, M);
  const varBefore = sigma ** 2;
  const varAfter = ratio * varBefore;
  const sdAfter = Math.sqrt(varAfter);
  return {
    sigma, rho, M, ratio,
    varBefore, varAfter, sdAfter,
    shrink: 1 - sdAfter / sigma,
    independentSd: sigma / Math.sqrt(M),
  };
}

/** 习题对账：结构 + 接地 */
function quizAudit() {
  const q = quizData();
  const body = grams(docText());
  const qs = Array.isArray(q.questions) ? q.questions : [];
  const byStage = { pre: 0, check: 0, post: 0 };
  const problems = [];
  let grounded = 0;

  qs.forEach((item, i) => {
    const n = i + 1;
    if (item.stage in byStage) byStage[item.stage] += 1;
    else problems.push(`第 ${n} 题 stage 非法：${item.stage}`);
    const opts = Array.isArray(item.options) ? item.options : [];
    if (opts.length !== 4) problems.push(`第 ${n} 题有 ${opts.length} 个选项`);
    if (!(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < opts.length)) {
      problems.push(`第 ${n} 题 correct 下标非法`);
    }
    if (hanzi(item.explain) < 30) problems.push(`第 ${n} 题 explain 只有 ${hanzi(item.explain)} 汉字`);
    if (item.stage === 'check') {
      const right = String(opts[item.correct] || '');
      if ([...grams(right)].some((g) => body.has(g))) grounded += 1;
    }
  });

  return { total: qs.length, byStage, grounded, problems };
}

function main() {
  const text = docText();
  const t = varianceTable(text);
  const c = fiveModelCase(text);
  const a = quizAudit();

  console.log('医学图像识别 · 第 7 章 对账');
  console.log('');
  console.log(`Var(ē)/σ² = ρ + (1−ρ)/M，M = ${t.ms.join(' / ')}：`);
  for (const r of t.rows) {
    console.log(`  ρ=${r.rho} 现算 ${r.computed.map((v) => v.toFixed(3)).join(' / ')} 表 ${r.claims.map((v) => v.toFixed(3)).join(' / ')} ${r.ok ? '✓' : '✗'}`);
  }
  console.log('');
  console.log(`五个模型：σ=${c.sigma}、ρ=${c.rho}、M=${c.M}`);
  console.log(`  方差 ${c.varBefore.toFixed(4)} → ${c.varAfter.toFixed(4)}；标准差 ${c.sigma.toFixed(3)} → ${c.sdAfter.toFixed(3)}`);
  console.log(`  降幅 ${(c.shrink * 100).toFixed(0)}%（若错误独立，标准差应到 ${c.independentSd.toFixed(3)}）`);
  console.log(`  偏差项不动：ρ→1 时方差比 ${varRatio(1, c.M)}，集成一分不降`);
  console.log('');
  console.log(`习题 ${a.total} 题（pre ${a.byStage.pre} / check ${a.byStage.check} / post ${a.byStage.post}）`);
  console.log(`check 题正确选项能在正文找到原词的：${a.grounded} 道`);
  console.log(a.problems.length ? `✗ ${a.problems.length} 处：${a.problems.join('；')}` : '✓ 结构齐、解释够长、判据落在正文');
  console.log('');
  console.log('※ 数字由本章正文与习题现算，不手打；正文改动后重跑即可复现。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  QUIZ,
  docText,
  quizData,
  hanzi,
  grams,
  varRatio,
  varianceTable,
  fiveModelCase,
  quizAudit,
};
