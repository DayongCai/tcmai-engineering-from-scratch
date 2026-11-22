#!/usr/bin/env node
/**
 * 临床科研方法 · 第 3 章 样本量不是越多越好，是够看清你要看的那点差
 * 课程: departments/06-guanli/13-linchuang-keyan-fangfa/chapters/03-z133/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章 docs/zh.md 现算：汉字、节、加粗判断、问句；
 * 并复算本章四组算术——均数设计的 34 例/组、δ 缩小的平方关系、
 * 率设计的 96 例/组、失访膨胀后的 40/43/113 例，以及 κ=0.56 与设计效应 2.2。
 * 任何一个数复算不出来，脚本直接报错——本章的论点是「样本量是你要看清的那点差的倒数」。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const TITLE = '样本量不是越多越好，是够看清你要看的那点差';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

/** 标准正态分位数：双侧 α=0.05 → z=1.96；把握度 0.80 → z=0.842。 */
const Z_ALPHA = 1.959964;
const Z_BETA = 0.841621;

/** 本章算术设定：教学合成数字，正文第六节已声明。 */
const SIGMA = 2.2;
const DELTA_MAIN = 1.5;
const DELTA_TABLE = [1.5, 1.2, 1.0, 0.8];
const P1 = 0.55;
const P2 = 0.35;
const LOSS_RATES = [0.15, 0.2];
const KAPPA_OBS = 0.8;
const KAPPA_EXP = 0.55;
const ICC = 0.05;
const CLUSTER = 25;
const NOMINAL = 100;

const SAMPLING_PATHS = ['单纯随机抽样', '系统抽样', '分层抽样', '整群抽样'];

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function parseSections(body) {
  const out = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = { title: h[1], lines: [] }; out.push(cur); continue; }
    if (cur) cur.lines.push(line);
  }
  return out.map((s) => ({
    title: s.title,
    text: s.lines.join('\n'),
    hanzi: (s.lines.join('\n').match(HANZI) || []).length,
  }));
}

const boldTerms = (text) => [...String(text).matchAll(/\*\*([^*\n]+)\*\*/g)].map((m) => m[1]);

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const sections = parseSections(body);
  return {
    hanzi: (body.match(HANZI) || []).length,
    sections,
    claims: boldTerms(body).length,
    quotes: [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))],
    questions: (body.match(/？/g) || []).length,
  };
}

const sectionOf = (sections, kw) => {
  const s = sections.find((x) => x.title.includes(kw));
  if (!s) throw new Error('正文里没找到含「' + kw + '」的节');
  return s;
};

/** 两样本均数比较：n = 2σ²(z_{1−α/2}+z_{1−β})² / δ²。 */
const nMean = (delta, sigma = SIGMA) => (2 * sigma ** 2 * (Z_ALPHA + Z_BETA) ** 2) / delta ** 2;

/** 两样本率比较：n = [z√(2p̄q̄) + z√(p1q1+p2q2)]² / (p1−p2)²。 */
function nRate(p1 = P1, p2 = P2) {
  const pbar = (p1 + p2) / 2;
  const term1 = Z_ALPHA * Math.sqrt(2 * pbar * (1 - pbar));
  const term2 = Z_BETA * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  return (term1 + term2) ** 2 / (p1 - p2) ** 2;
}

/** δ 缩小时的例数表：平方关系，倍数是相对 δ=1.5 的。 */
function deltaTable() {
  const base = Math.ceil(nMean(DELTA_MAIN));
  return DELTA_TABLE.map((d) => {
    const n = Math.ceil(nMean(d));
    return { delta: d, n, multiple: Number((n / base).toFixed(2)) };
  });
}

/** 失访膨胀：入组例数 = ceil(可分析例数 ÷ (1−失访率))。 */
const inflate = (analyzable, loss) => Math.ceil(analyzable / (1 - loss));

/** 两个判定者的一致性：κ = (Po − Pe) / (1 − Pe)。 */
const kappa = (po = KAPPA_OBS, pe = KAPPA_EXP) => (po - pe) / (1 - pe);

/** 整群抽样的设计效应：1 + (m−1)×ICC。 */
const designEffect = (m = CLUSTER, icc = ICC) => 1 + (m - 1) * icc;

function auditStructure(sections) {
  const s1 = sectionOf(sections, '抽样');
  const s2 = sectionOf(sections, '三个输入');
  const s5 = sectionOf(sections, '测量');

  const paths = SAMPLING_PATHS.filter((p) => boldTerms(s1.text).some((b) => b === p + '把全部' || b.startsWith(p)));
  const inputs = ['δ（预期差值）', 'σ（标准差）', '把握度（1−β）'].filter((k) => s2.text.includes('**' + k + '**'));
  const improvePaths = (s5.text.match(/一是|二是|三是/g) || []).length;

  return { paths, inputs, improvePaths };
}

function verify(j, table, rateN, inflated) {
  if (j.paths.length !== 4) throw new Error(`概率抽样路径只对上 ${j.paths.length} 条，正文列了四条`);
  if (j.inputs.length !== 3) throw new Error(`样本量输入只对上 ${j.inputs.length} 个，三个输入缺一不可`);
  if (j.improvePaths !== 3) throw new Error(`提高一致性的路径数到 ${j.improvePaths} 条，正文列了三条`);
  const expect = [34, 53, 76, 119];
  const got = table.map((r) => r.n);
  if (got.join(',') !== expect.join(',')) throw new Error(`δ 表算出 ${got.join('/')}，正文记 ${expect.join('/')}`);
  if (rateN !== 96) throw new Error(`率设计算出 ${rateN} 例/组，正文记 96`);
  if (inflated[0] !== 40 || inflated[1] !== 43) throw new Error(`失访膨胀算出 ${inflated.join('/')}，正文记 40/43`);
}

function main() {
  const body = read();
  const a = analyze(body);
  const j = auditStructure(a.sections);
  const table = deltaTable();
  const rateN = Math.ceil(nRate());
  const inflated = LOSS_RATES.map((p) => inflate(Math.ceil(nMean(DELTA_MAIN)), p));
  const rateInflated = inflate(rateN, 0.15);
  verify(j, table, rateN, inflated);

  const k = kappa();
  const de = designEffect();
  const effective = Math.round(NOMINAL / de);

  console.log(`临床科研方法 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 加粗判断 ${a.claims} 处 · 引文 ${a.quotes.length} 条 · 问句 ${a.questions} 个`);
  console.log('');
  console.log(`均数设计（σ=${SIGMA}、δ=${DELTA_MAIN}、α=0.05 双侧、把握度 0.80）：`);
  console.log(`  n = 2×${SIGMA}²×(${Z_ALPHA.toFixed(3)}+${Z_BETA.toFixed(3)})² ÷ ${DELTA_MAIN}² = ${nMean(DELTA_MAIN).toFixed(2)} → 每组 ${Math.ceil(nMean(DELTA_MAIN))} 例`);
  console.log('');
  console.log('δ 缩小，例数按平方关系上涨：');
  for (const r of table) console.log(`  δ=${r.delta.toFixed(1)} 分 → ${String(r.n).padStart(3)} 例/组（×${r.multiple.toFixed(2)}）`);
  console.log('');
  console.log(`率设计（${Math.round(P2 * 100)}% → ${Math.round(P1 * 100)}%）算出 ${nRate().toFixed(2)} → 每组 ${rateN} 例；同样的 20 个百分点，均数设计只要 34 例/组。`);
  console.log('');
  console.log(`失访膨胀：34 例按 15% → ${inflated[0]} 例/组；按 20% → ${inflated[1]} 例/组；率的 96 例按 15% → ${rateInflated} 例/组。`);
  console.log('');
  console.log(`测量：一致 ${KAPPA_OBS * 100}%、机遇一致 ${KAPPA_EXP} → κ = (${KAPPA_OBS}−${KAPPA_EXP})÷(1−${KAPPA_EXP}) = ${k.toFixed(3)} → ${k.toFixed(2)}（中等一致）。`);
  console.log(`整群设计效应：1+(${CLUSTER}−1)×${ICC} = ${de.toFixed(1)}；名义 ${NOMINAL} 例的有效样本量 ≈ ${effective} 例。`);
  console.log('');
  console.log('判断：样本量不是「越多越好」，是你要看清那点差的倒数；');
  console.log('      先问这个差值值不值得招这么多，再问招多少。');
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(28, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成研究结论或临床建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, Z_ALPHA, Z_BETA, SIGMA, DELTA_MAIN, DELTA_TABLE, P1, P2, KAPPA_OBS, KAPPA_EXP, ICC, CLUSTER,
  read, parseSections, analyze, boldTerms, sectionOf, nMean, nRate, deltaTable, inflate, kappa, designEffect, auditStructure, verify,
};
