#!/usr/bin/env node
/**
 * 临床科研方法 · 第 8 章 方案书写在收第一例之前，因为收完之后它什么都改不了
 * 课程: departments/06-guanli/13-linchuang-keyan-fangfa/chapters/08-z138/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章 docs/zh.md 现算：汉字、节、加粗判断、问句；
 * 并复算本案例的整条代价链——三次退回 × 10 周 = 30 周、首例从第 4 个月推到第 11 个月、
 * 入组窗口从 12 个月压到 5 个月、142 例只完成 68 例、把握度从 0.80 掉到 0.46。
 * 任何一个数复算不出来，脚本直接报错——本章的论点是「方案的价钱在它漏掉的那几行」。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const TITLE = '方案书写在收第一例之前，因为收完之后它什么都改不了';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

/** 本章算术设定：教学合成数字，正文第六节已声明。 */
const REJECTIONS = 3;
const WEEKS_PER_REJECTION = 10;
const START_MONTH = 4;
const TOTAL_MONTHS = 24;
const ENROLL_MONTHS = 12;
const FOLLOW_MONTHS = 6;
const WRITE_MONTHS = 2;
const PLAN_PER_ARM = 71;
const REAL_PER_ARM = 34;
const SIGMA = 2.2;
const DELTA_ASSUMED = 1.5;
const DELTA_REAL = 1.0;
const Z_ALPHA = 1.959964;
const FIELDS = 10000;
const ERR_SINGLE = 0.008;
const ERR_DOUBLE = 0.0005;

const SKELETON = [
  '背景与立题依据', '研究目的与假设', '设计类型', '研究人群', '样本量',
  '干预方案', '对照', '随机化与分配隐藏', '盲法', '结局指标',
  '统计分析计划', '数据管理', '质量控制', '伦理与知情同意', '进度与预算',
];
const ETHICS_GATES = ['科学价值', '风险受益比', '知情同意'];
const DM_STEPS = ['建库', '录入', '核查', '质疑管理', '锁库', '存档'];
const CHAIN = ['源数据', '病例报告表', '数据库', '分析数据集'];

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

/** 正态分布函数：Abramowitz–Stegun 7.1.26 的 erf 近似。 */
function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return sign * y;
}
const phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2));

/** 两样本 t 的近似把握度：Φ(δ/σ·√(n/2) − 1.96)。 */
const power = (delta, n, sigma = SIGMA) => Number(phi((delta / sigma) * Math.sqrt(n / 2) - Z_ALPHA).toFixed(2));

/**
 * 延误的代价链：每次退回 10 周，三次 30 周 ≈ 7 个月；
 * 首例从第 4 个月推到第 11 个月，入组窗口从 12 个月压到 5 个月。
 */
function delayChain() {
  const lostWeeks = REJECTIONS * WEEKS_PER_REJECTION;
  const lostMonths = Math.round(lostWeeks / 4.345);
  return {
    lostWeeks,
    lostMonths,
    firstEnrollMonth: START_MONTH + lostMonths,
    windowBefore: ENROLL_MONTHS,
    windowAfter: ENROLL_MONTHS - lostMonths,
  };
}

/** 计划 142 例（71/组），只完成 68 例（34/组）。 */
function enrollment() {
  const planned = PLAN_PER_ARM * 2;
  const real = REAL_PER_ARM * 2;
  return { planned, real, perArm: REAL_PER_ARM, share: Math.round((real / planned) * 100) };
}

/** 24 个月的合理切分：准备 4 + 入组 12 + 随访 6 + 成文 2。 */
function schedule() {
  const prep = TOTAL_MONTHS - ENROLL_MONTHS - FOLLOW_MONTHS - WRITE_MONTHS;
  return { prep, enroll: ENROLL_MONTHS, follow: FOLLOW_MONTHS, write: WRITE_MONTHS, total: prep + ENROLL_MONTHS + FOLLOW_MONTHS + WRITE_MONTHS };
}

function auditStructure(sections) {
  const s1 = sectionOf(sections, '方案书的骨架');
  const s2 = sectionOf(sections, '伦理审查');
  const s3 = sectionOf(sections, '数据管理计划');
  const s4 = sectionOf(sections, '监查与证据链');
  const s5 = sectionOf(sections, '进度与风险');

  const items = (s1.text.match(/^\s*\d+\.\s+\*\*/gm) || []).length;
  const gates = ETHICS_GATES.filter((g) => boldTerms(s2.text).some((b) => b.startsWith('第') && b.includes(g)));
  const steps = DM_STEPS.filter((s) => boldTerms(s3.text).some((b) => b.endsWith(s + '。')));
  const chain = CHAIN.filter((c) => boldTerms(s4.text).includes(c));
  const risks = (s5.text.match(/^\| (入组|失访|不良事件|关键人员)/gm) || []).length;

  return { items, gates, steps, chain, risks };
}

function verify(j, delay, enr, sched) {
  if (j.items !== 15) throw new Error(`方案骨架数到 ${j.items} 项，正文列了十五项`);
  if (j.gates.length !== 3) throw new Error(`伦理三关只对上 ${j.gates.length} 关`);
  if (j.steps.length !== 6) throw new Error(`数据管理步数到 ${j.steps.length} 步，正文列了六步`);
  if (j.chain.length !== 4) throw new Error(`证据链只对上 ${j.chain.length} 环，缺一环整条链就断`);
  if (j.risks !== 4) throw new Error(`风险预案表数到 ${j.risks} 行`);
  if (delay.lostWeeks !== 30 || delay.firstEnrollMonth !== 11) throw new Error(`延误链与正文不符：${delay.lostWeeks} 周 / 第 ${delay.firstEnrollMonth} 个月`);
  if (delay.windowAfter !== 5) throw new Error(`入组窗口算出 ${delay.windowAfter} 个月，正文记 5`);
  if (enr.planned !== 142 || enr.real !== 68) throw new Error(`入组例数与正文 142/68 不符：${enr.planned}/${enr.real}`);
  if (sched.total !== TOTAL_MONTHS) throw new Error(`进度切分加起来 ${sched.total} 个月，正文是 24 个月`);
}

function main() {
  const body = read();
  const a = analyze(body);
  const j = auditStructure(a.sections);
  const delay = delayChain();
  const enr = enrollment();
  const sched = schedule();
  verify(j, delay, enr, sched);

  const pAssumed = power(DELTA_ASSUMED, REAL_PER_ARM);
  const pReal = power(DELTA_REAL, REAL_PER_ARM);
  const pMinusOne = power(DELTA_ASSUMED, REAL_PER_ARM - 1);
  const err = { single: FIELDS * ERR_SINGLE, double: FIELDS * ERR_DOUBLE };

  console.log(`临床科研方法 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 加粗判断 ${a.claims} 处 · 引文 ${a.quotes.length} 条 · 问句 ${a.questions} 个`);
  console.log('');
  console.log(`延误链：伦理退回 ${REJECTIONS} 次 × ${WEEKS_PER_REJECTION} 周 = ${delay.lostWeeks} 周 ≈ ${delay.lostMonths} 个月；`);
  console.log(`  首例入组从第 ${START_MONTH} 个月推到第 ${delay.firstEnrollMonth} 个月，入组窗口 ${delay.windowBefore} 个月 → ${delay.windowAfter} 个月。`);
  console.log(`  计划 ${enr.planned} 例（${PLAN_PER_ARM}/组），实际完成 ${enr.real} 例（${enr.perArm}/组），占计划的 ${enr.share}%。`);
  console.log('');
  console.log('把握度（σ=2.2，双侧 α=0.05）：');
  console.log(`  δ=${DELTA_ASSUMED}、每组 34 例 → ${pAssumed.toFixed(2)}（勉强过线）`);
  console.log(`  δ=${DELTA_ASSUMED}、每组 33 例 → ${pMinusOne.toFixed(2)}（少一例就跌破）`);
  console.log(`  δ=${DELTA_REAL}、每组 34 例 → ${pReal.toFixed(2)}（真实差值只有 1 分时）`);
  console.log('');
  console.log(`进度切分（${TOTAL_MONTHS} 个月）：准备 ${sched.prep} + 入组 ${sched.enroll} + 随访 ${sched.follow} + 成文 ${sched.write} = ${sched.total} 个月；最不该压的是准备 ${sched.prep} 个月。`);
  console.log(`双录入：${FIELDS} 个字段，单录约 ${err.single} 处错误，双录约 ${err.double} 处。`);
  console.log('');
  console.log(`结构：骨架 ${j.items} 项 · 伦理 ${j.gates.length} 关 · 数据管理 ${j.steps.length} 步 · 证据链 ${j.chain.length} 环 · 风险预案 ${j.risks} 行`);
  console.log(`  伦理三关：${j.gates.join('／')}`);
  console.log(`  数据管理：${j.steps.join(' → ')}`);
  console.log(`  证据链：${j.chain.join(' → ')}`);
  console.log('');
  console.log('判断：方案的价钱不在写它的那两周，在它漏掉的那几行；');
  console.log('      入组开始后再改对照、改结局、改随机方法，都只能算方案偏离。');
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
  DOC, CHAPTER, TITLE, REJECTIONS, WEEKS_PER_REJECTION, START_MONTH, TOTAL_MONTHS, ENROLL_MONTHS, FOLLOW_MONTHS,
  WRITE_MONTHS, PLAN_PER_ARM, REAL_PER_ARM, SIGMA, DELTA_ASSUMED, DELTA_REAL, Z_ALPHA, FIELDS,
  read, parseSections, analyze, boldTerms, sectionOf, erf, phi, power, delayChain, enrollment, schedule, auditStructure, verify,
};
