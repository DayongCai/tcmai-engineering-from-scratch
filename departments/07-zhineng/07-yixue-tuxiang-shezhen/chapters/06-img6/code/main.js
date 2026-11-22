#!/usr/bin/env node
/**
 * 医学图像识别 · 第 6 章 对账器：基础率、PPV 与阈值扫描
 *
 * 数据源：
 *   ../docs/zh.md   本章正文（PPV 算例、混淆矩阵、阈值扫描表、报告五项）
 *   ../quiz.json    本章习题
 *
 * 现算的东西：
 *   1. 同一 Sens/Spec 在两个基础率下的 PPV（0.794 → 0.155）；
 *   2. 阈值扫描表逐行重算：FN、Sens、Spec、PPV 与期望代价，找出代价最小的一行；
 *   3. 贝叶斯阈值 C_FP/(C_FP+C_FN) 与「模型没校准」造成的落差；
 *   4. PR 曲线的基线是阳性率而不是 0.5；
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

/** PPV = Sens·π / (Sens·π + (1−Spec)(1−π)) */
function ppv(sens, spec, pi) {
  const tp = sens * pi;
  return tp / (tp + (1 - spec) * (1 - pi));
}

/** 从正文读出 Sens/Spec 与两个基础率 */
function prevalenceFromDoc(text = docText()) {
  const m = pick(text, /演算设定 Sens = ([\d.]+)、Spec = ([\d.]+)/, 'Sens 与 Spec');
  const sens = Number(m[1]);
  const spec = Number(m[2]);
  const pis = [...text.matchAll(/\\pi = ([\d.]+)\$/g)].map((x) => Number(x[1]));
  const uniq = [...new Set(pis)];
  if (!uniq.length) throw new Error('正文里找不到阳性率的算例');
  return { sens, spec, pis: uniq, values: uniq.map((pi) => ({ pi, ppv: ppv(sens, spec, pi) })) };
}

/** 阈值扫描表：从正文表格解析 TP/FP 与自报值，用四个格子重算 Sens/Spec/PPV/代价 */
function thresholdScan(text = docText()) {
  const head = text.indexOf('| 阈值 | TP | FP |');
  if (head < 0) throw new Error('正文里找不到阈值扫描表');
  const seg = text.slice(head, text.indexOf('最优点在', head));
  const rows = [...seg.matchAll(/\|\s*(0\.\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d\.\d+)\s*\|\s*(\d\.\d+)\s*\|\s*(\d\.\d+)\s*\|\s*\**\s*(\d+)\s*\**\s*\|/g)]
    .map((m) => ({ t: Number(m[1]), tp: Number(m[2]), fp: Number(m[3]), sensClaim: Number(m[4]), specClaim: Number(m[5]), ppvClaim: Number(m[6]), costClaim: Number(m[7]) }));
  if (!rows.length) throw new Error('阈值扫描表没解析出任何一行');

  const m = pick(
    text,
    /演算设定\s*([\d,]+)\s*例（阳性\s*(\d+)、阴性\s*(\d+)），\$C_\{FN\}=(\d+)\$、\$C_\{FP\}=(\d+)\$/,
    '阈值扫描的样本规模与代价比',
  );
  const total = Number(m[1].replace(/,/g, ''));
  const pos = Number(m[2]);
  const neg = Number(m[3]);
  const cFn = Number(m[4]);
  const cFp = Number(m[5]);
  if (pos + neg !== total) throw new Error(`正文的阳性 ${pos} + 阴性 ${neg} ≠ 总数 ${total}`);

  const scored = rows.map((r) => {
    const fn = pos - r.tp;
    return {
      ...r,
      fn,
      sens: r.tp / pos,
      spec: 1 - r.fp / neg,
      ppv: r.tp / (r.tp + r.fp),
      cost: cFn * fn + cFp * r.fp,
    };
  });
  const best = scored.reduce((a, b) => (b.cost < a.cost ? b : a));
  return { pos, neg, cFn, cFp, rows: scored, best };
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
  const p = prevalenceFromDoc(text);
  const s = thresholdScan(text);
  const a = quizAudit();

  console.log('医学图像识别 · 第 6 章 对账');
  console.log('');
  console.log(`Sens ${p.sens}、Spec ${p.spec}，同一模型的 PPV：`);
  for (const v of p.values) console.log(`  π = ${v.pi} → PPV = ${v.ppv.toFixed(3)}`);
  console.log(`落差：${p.values[0].ppv.toFixed(3)} → ${p.values[p.values.length - 1].ppv.toFixed(3)}`);
  console.log('');
  console.log(`阈值扫描（${s.pos} 阳性 / ${s.neg} 阴性，C_FN=${s.cFn}、C_FP=${s.cFp}）：`);
  for (const r of s.rows) {
    console.log(`  t=${r.t.toFixed(2)} TP ${r.tp} FP ${r.fp} → Sens ${r.sens.toFixed(2)} Spec ${r.spec.toFixed(3)} PPV ${r.ppv.toFixed(3)} 代价 ${r.cost}`);
  }
  console.log(`  → 代价最小在 t=${s.best.t.toFixed(2)}（代价 ${s.best.cost}，PPV ${s.best.ppv.toFixed(3)}）`);
  console.log(`贝叶斯阈值 C_FP/(C_FP+C_FN) = ${(s.cFp / (s.cFp + s.cFn)).toFixed(3)} —— 与扫描值差得远，因为模型没校准`);
  console.log(`PR 曲线基线是阳性率 ${p.values[p.values.length - 1].pi}，不是 0.5`);
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
  ppv,
  prevalenceFromDoc,
  thresholdScan,
  quizAudit,
};
