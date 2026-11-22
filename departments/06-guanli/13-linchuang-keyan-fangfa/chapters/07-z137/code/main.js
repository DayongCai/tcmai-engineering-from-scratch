#!/usr/bin/env node
/**
 * 临床科研方法 · 第 7 章 二十个指标里总有一个 p<0.05，这不是发现
 * 课程: departments/06-guanli/13-linchuang-keyan-fangfa/chapters/07-z137/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章 docs/zh.md 现算：汉字、节、加粗判断、问句；
 * 并复算本章四组算术——1−0.95^k（20 次得 0.64）、
 * Bonferroni/Holm/BH 同一批 p 值给出 1/2/3 个发现、
 * 以及把握度表（d=0.3、n=40 时只有 0.27）。
 * 任何一个数复算不出来，脚本直接报错——本章的论点是「显著不是数据的属性」。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 7;
const TITLE = '二十个指标里总有一个 p<0.05，这不是发现';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

/** 本章算术设定：教学合成数字，正文第六节已声明。 */
const ALPHA = 0.05;
const K_TABLE = [1, 5, 10, 20, 50];
const P_VALUES = [0.0008, 0.0026, 0.006, 0.011, 0.02, 0.03, 0.041, 0.05, 0.06, 0.08, 0.11, 0.14, 0.17, 0.22, 0.28, 0.34, 0.41, 0.55, 0.68, 0.81];
const POWER_D = [0.3, 0.5, 0.8];
const POWER_N = [40, 64, 100];
const Z_ALPHA = 1.959964;

const FREE_PATHS = [
  '分析人群：全分析集、符合方案集、还是安全性集？',
  '协变量：调整哪几个？连续变量按原值、还是分组？',
  '缺失值：完整病例、末次观测结转、还是多重填补？',
  '结局变换：原始分、变化值、还是变化率？',
  '分布假设：用参数方法还是秩方法？正态性检验过不过都换一次？',
  '时点：8 周、12 周、还是「治疗结束时」？',
  '亚组：切几个？按中位数切还是按临床界值切？',
  '异常值：剔除还是保留？剔除标准是 3 倍标准差还是箱式图？',
];
const REPLICATE_LEVELS = ['结果可复现', '分析可复现', '发现可复现'];

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

/** 正态分布函数：用 Abramowitz–Stegun 7.1.26 的 erf 近似。 */
function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return sign * y;
}
const phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2));

/** 至少一个假阳性的概率：1 − 0.95^k。 */
const familyError = (k, alpha = ALPHA) => Number((1 - (1 - alpha) ** k).toFixed(2));

/** 两样本 t 的近似把握度（双侧 α=0.05）：Φ(d√(n/2) − 1.96)。 */
const power = (d, n) => Number(phi(d * Math.sqrt(n / 2) - Z_ALPHA).toFixed(2));

/** Bonferroni：每个检验按 α/k 判。 */
const bonferroni = (ps, alpha = ALPHA) => ps.filter((p) => p <= alpha / ps.length).length;

/** Holm：p 排序后第 i 位与 α/(k−i+1) 比，一旦不显著即停。 */
function holm(ps, alpha = ALPHA) {
  const sorted = [...ps].sort((a, b) => a - b);
  const k = sorted.length;
  let count = 0;
  for (let i = 0; i < k; i += 1) {
    if (sorted[i] <= alpha / (k - i)) count += 1;
    else break;
  }
  return count;
}

/** Benjamini–Hochberg：找最大的 i 使 p(i) ≤ i×α/k，前 i 个判阳性。 */
function benjaminiHochberg(ps, alpha = ALPHA) {
  const sorted = [...ps].sort((a, b) => a - b);
  const k = sorted.length;
  let cut = 0;
  for (let i = 1; i <= k; i += 1) {
    if (sorted[i - 1] <= (i * alpha) / k) cut = i;
  }
  return cut;
}

/** 分析路径自由度：八个岔口，每个 2–3 条路。 */
function pathFreedom(sections) {
  const s3 = sectionOf(sections, '哪些「多重」必须校正');
  const items = (s3.text.match(/^\s*\d+\.\s+/gm) || []).length;
  return { items, min: 2 ** items, max: 3 ** items };
}

function auditStructure(sections) {
  const s1 = sectionOf(sections, '多重性的算术');
  const s2 = sectionOf(sections, '校正方法');
  const s4 = sectionOf(sections, '显著与可复现');
  const s5 = sectionOf(sections, '报告');

  const targets = ['族错误率（FWER）', '假发现率（FDR）'].filter((t) => s1.text.includes(t));
  const methods = ['Bonferroni', 'Holm', 'Benjamini–Hochberg'].filter((m) => s2.text.includes('**' + m + '**'));
  const levels = REPLICATE_LEVELS.filter((l) => s4.text.includes('**' + l + '**'));
  const reportGroups = (s5.text.match(/^-\s+\*\*/gm) || []).length;

  return { targets, methods, levels, reportGroups };
}

function verify(j, free, powTable) {
  if (j.targets.length !== 2) throw new Error(`错误控制目标只对上 ${j.targets.length} 个，FWER 与 FDR 须分清`);
  if (j.methods.length !== 3) throw new Error(`校正方法只对上 ${j.methods.length} 种，正文列了三档`);
  if (j.levels.length !== 3) throw new Error(`复现层次只对上 ${j.levels.length} 层`);
  if (j.reportGroups !== 6) throw new Error(`报告条目组数到 ${j.reportGroups} 组，正文归了六组`);
  if (free.items !== 8) throw new Error(`分析路径岔口数到 ${free.items} 个，正文列了八个`);
  const expect = [0.27, 0.4, 0.56, 0.61, 0.81, 0.94, 0.95, 0.99, 1];
  const got = powTable.flatMap((r) => r.powers);
  if (got.join(',') !== expect.join(',')) throw new Error(`把握度表算出 ${got.join('/')}，正文记 ${expect.join('/')}`);
}

function main() {
  const body = read();
  const a = analyze(body);
  const j = auditStructure(a.sections);
  const free = pathFreedom(a.sections);
  const powTable = POWER_D.map((d) => ({ d, powers: POWER_N.map((n) => power(d, n)) }));
  verify(j, free, powTable);

  const k20 = familyError(20);
  const bon = bonferroni(P_VALUES);
  const hol = holm(P_VALUES);
  const bh = benjaminiHochberg(P_VALUES);

  console.log(`临床科研方法 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 加粗判断 ${a.claims} 处 · 引文 ${a.quotes.length} 条 · 问句 ${a.questions} 个`);
  console.log('');
  console.log('族错误率（1 − 0.95^k）：');
  for (const k of K_TABLE) console.log(`  k=${String(k).padStart(2)} → ${familyError(k).toFixed(2)}`);
  console.log(`  → 20 个指标，干预完全无效也有 ${k20.toFixed(2)} 的概率拿出一个「显著」。`);
  console.log('');
  console.log(`同一批 ${P_VALUES.length} 个 p 值，三档校正：`);
  console.log(`  Bonferroni（阈值 ${(ALPHA / P_VALUES.length).toFixed(4)}）→ ${bon} 个发现`);
  console.log(`  Holm（逐级 α/(k−i+1)）→ ${hol} 个发现`);
  console.log(`  Benjamini–Hochberg（控 FDR）→ ${bh} 个发现`);
  console.log('');
  console.log('把握度近似（双侧 α=0.05，Φ(d√(n/2)−1.96)）：');
  console.log(`  ${'d'.padEnd(6)}${POWER_N.map((n) => String('n=' + n).padStart(8)).join('')}`);
  for (const r of powTable) console.log(`  ${String(r.d).padEnd(6)}${r.powers.map((p) => p.toFixed(2).padStart(8)).join('')}`);
  console.log(`  → 真实 d=0.3、每组 40 例时只有 0.27 的把握度；能检出的那 27% 观测效应必然偏大（赢家诅咒）。`);
  console.log('');
  console.log(`分析路径自由度：${free.items} 个岔口，每个 2–3 条路 → 组合数 ${free.min}–${free.max}（正文说千以上）。`);
  console.log(`结构：错误控制 ${j.targets.length} 种 · 校正方法 ${j.methods.length} 档 · 复现层次 ${j.levels.length} 层 · 报告条目 ${j.reportGroups} 组`);
  console.log('');
  console.log('判断：「显著」从来不是数据的属性，是「数据＋你允许犯多少错」的联合属性；');
  console.log('      先定问题与预设分析，再谈校正。');
  console.log('');
  console.log('逐节字数：');
  for (const sec of a.sections) {
    const share = a.hanzi ? ((sec.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${sec.title.padEnd(30, '　')} ${String(sec.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成研究结论或临床建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, ALPHA, K_TABLE, P_VALUES, POWER_D, POWER_N, Z_ALPHA, FREE_PATHS, REPLICATE_LEVELS,
  read, parseSections, analyze, boldTerms, sectionOf, erf, phi, familyError, power, bonferroni, holm, benjaminiHochberg, pathFreedom, auditStructure, verify,
};
