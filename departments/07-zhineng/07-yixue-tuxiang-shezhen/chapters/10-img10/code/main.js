#!/usr/bin/env node
/**
 * 医学图像识别 · 第 10 章 对账器：输入漂移与验证阶梯
 *
 * 数据源：
 *   ../docs/zh.md   本章正文（四级验证、PSI 算例、监测三件、隐私四条、上线清单）
 *   ../quiz.json    本章习题
 *
 * 现算的东西：
 *   1. PSI = Σ(a_b − e_b)·ln(a_b/e_b)，由正文的分箱占比现算，与 0.135 比对；
 *   2. 常用口径的三档阈值（0.1 / 0.25）与本次结果落在哪一档；
 *   3. 验证阶梯 0.92 → 0.87 → 0.78，逐级落差与累计落差；
 *   4. 版本冻结的四样东西（模型、预处理参数、校正矩阵、阈值）；
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

/** 群体稳定性指数：Σ(a − e)·ln(a/e)；某箱占比为 0 时该项按 0 计（ln 无定义） */
function psi(baseline, current) {
  if (baseline.length !== current.length) throw new Error('基线箱数与当前箱数不一致');
  return baseline.reduce((s, e, i) => {
    const a = current[i];
    if (a === 0 || e === 0) return s;
    return s + (a - e) * Math.log(a / e);
  }, 0);
}

/** 从正文读出分箱占比：基线各 20%，当前 30/25/20/15/10 */
function psiFromDoc(text = docText()) {
  const m = pick(text, /五个分箱、基线各\s*(\d+)%，当前为\s*([\d%、]+)/, 'PSI 的分箱占比');
  const e = Number(m[1]) / 100;
  const a = m[2].split('、').filter(Boolean).map((x) => Number(x.replace('%', '')) / 100);
  const baseline = a.map(() => e);
  const value = psi(baseline, a);
  const band = value < 0.1 ? 'stable' : value < 0.25 ? 'medium' : 'severe';
  return { bins: a.length, baseline, current: a, value, claimed: 0.135, band, sumsTo1: Math.abs(a.reduce((s, v) => s + v, 0) - 1) < 1e-9 };
}

/** 验证阶梯：内部 → 时间外推 → 外部 */
function verificationLadder(text = docText()) {
  const m = pick(text, /内部\s*([\d.]+) → 时间外推\s*([\d.]+) → 外部\s*([\d.]+)/, '验证阶梯的三个 AUC');
  const levels = [Number(m[1]), Number(m[2]), Number(m[3])];
  return {
    levels,
    stepDrops: levels.slice(1).map((v, i) => levels[i] - v),
    totalDrop: levels[0] - levels[2],
  };
}

/** 版本冻结的四样：模型文件、预处理参数、色卡校正矩阵、阈值 */
function freezeSet(text = docText()) {
  const line = pick(text, /模型文件、预处理参数、色卡校正矩阵、阈值/, '版本冻结的四样东西')[0];
  return line.split('、');
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
  const p = psiFromDoc(text);
  const l = verificationLadder(text);
  const f = freezeSet(text);
  const a = quizAudit();

  console.log('医学图像识别 · 第 10 章 对账');
  console.log('');
  console.log(`分箱 ${p.bins} 个：基线 ${p.baseline.map((v) => v.toFixed(2)).join('/')}`);
  console.log(`            当前 ${p.current.map((v) => v.toFixed(2)).join('/')}（合计为 1：${p.sumsTo1}）`);
  console.log(`PSI 现算 ${p.value.toFixed(3)}（正文 ${p.claimed}）→ 落在 ${p.band} 档（阈值 0.10 / 0.25）`);
  console.log('');
  console.log(`验证阶梯：内部 ${l.levels[0]} → 时间外推 ${l.levels[1]} → 外部 ${l.levels[2]}`);
  console.log(`  逐级落差 ${l.stepDrops.map((d) => d.toFixed(2)).join(' / ')}；累计 ${l.totalDrop.toFixed(2)}`);
  console.log(`版本冻结四样：${f.join('、')}`);
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
  psi,
  psiFromDoc,
  verificationLadder,
  freezeSet,
  quizAudit,
};
