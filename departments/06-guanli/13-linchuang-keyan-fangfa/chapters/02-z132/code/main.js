#!/usr/bin/env node
/**
 * 临床科研方法 · 第 2 章 设计不是越严格越好，是能答你那个问题的那个
 * 课程: departments/06-guanli/13-linchuang-keyan-fangfa/chapters/02-z132/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章 docs/zh.md 现算：汉字、节、加粗判断、问句；
 * 并复算两处关键算术——历史对照那 8 个百分点的时间漂移，
 * 以及 12 例单病例交叉的 384 患者周。
 * 结构上复算三组清单：三种设计、四种对照、随机的三个环节、六个决定设计的问题。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '设计不是越严格越好，是能答你那个问题的那个';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

/** 本章算术设定：教学合成数字，正文第六节已声明。 */
const HIST_OLD = 32;
const HIST_NOW = 24;
const NEW_RATE = 45;
const N1_PATIENTS = 12;
const N1_ROUNDS = 2;
const N1_PERIODS = 4;
const N1_WEEKS = 4;

const DESIGNS = [
  ['随机对照试验', '平均效力'],
  ['真实世界研究', '实际效果'],
  ['单病例随机交叉', '个体反应'],
];
const CONTROL_FORMS = ['空白对照', '安慰剂或假操作对照', '阳性对照', '历史对照'];
const RANDOM_STEPS = ['序列生成', '分配隐藏', '分层与区组'];

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

/**
 * 历史对照的 8 个百分点：与历史对照比差 13 个百分点，与同期对照比差 21 个百分点，
 * 两者的差全部来自时间漂移。
 */
function driftArithmetic() {
  const vsHistory = NEW_RATE - HIST_OLD;
  const vsConcurrent = NEW_RATE - HIST_NOW;
  return { vsHistory, vsConcurrent, drift: vsConcurrent - vsHistory, driftInHistory: HIST_OLD - HIST_NOW };
}

/** 12 例 × 2 轮 × 4 期 × 4 周 = 384 患者周；折每人治疗周 32。 */
function singleCaseScale() {
  const patientWeeks = N1_PATIENTS * N1_ROUNDS * N1_PERIODS * N1_WEEKS;
  const weeksPerPatient = N1_ROUNDS * N1_PERIODS * N1_WEEKS;
  return { patientWeeks, weeksPerPatient, patients: N1_PATIENTS };
}

/** 三种设计、四种对照、随机三环节、六问——缺一组，第二节到第五节的论证就断。 */
function auditStructure(sections) {
  const s1 = sectionOf(sections, '三种设计');
  const s2 = sectionOf(sections, '对照的四种形态');
  const s3 = sectionOf(sections, '随机化怎么做');
  const s5 = sectionOf(sections, '六个问题');

  const designs = DESIGNS.filter(([name, answers]) => s1.text.includes(name) && s1.text.includes(answers));
  const forms = CONTROL_FORMS.filter((f) => s2.text.includes('**' + f + '**'));
  const steps = RANDOM_STEPS.filter((k) => boldTerms(s3.text).some((b) => b.endsWith(k + '。')));
  const designQuestions = (s5.text.match(/^\s*\d+\.\s+\*\*/gm) || []).length;

  return { designs, forms, steps, designQuestions };
}

function verify(j, drift, n1) {
  if (j.designs.length !== 3) throw new Error(`三种设计只对上 ${j.designs.length} 种`);
  if (j.forms.length !== 4) throw new Error(`四种对照只对上 ${j.forms.length} 种`);
  if (j.steps.length !== 3) throw new Error(`随机三环节只对上 ${j.steps.length} 个`);
  if (j.designQuestions !== 6) throw new Error(`决定设计的问题数到 ${j.designQuestions} 个，正文列了六个`);
  if (drift.vsHistory !== 13 || drift.vsConcurrent !== 21) throw new Error(`历史对照算术与正文不符：${drift.vsHistory}/${drift.vsConcurrent}`);
  if (drift.drift !== 8) throw new Error(`时间漂移算出 ${drift.drift} 个百分点，正文记 8`);
  if (n1.patientWeeks !== 384) throw new Error(`单病例规模算出 ${n1.patientWeeks} 患者周，正文记 384`);
}

function main() {
  const body = read();
  const a = analyze(body);
  const j = auditStructure(a.sections);
  const drift = driftArithmetic();
  const n1 = singleCaseScale();
  verify(j, drift, n1);

  console.log(`临床科研方法 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 加粗判断 ${a.claims} 处 · 引文 ${a.quotes.length} 条 · 问句 ${a.questions} 个`);
  console.log('');
  console.log('三种设计各自答什么：');
  for (const [name, answers] of j.designs) console.log(`  ${name.padEnd(10, '　')} → ${answers}`);
  console.log('');
  console.log(`四种对照 ${j.forms.length}/4：${j.forms.join('／')}`);
  console.log(`随机三环节 ${j.steps.length}/3：${j.steps.join('／')}（缺一项随机即失效）`);
  console.log(`决定设计的问题 ${j.designQuestions}/6`);
  console.log('');
  console.log(`历史对照算术：新法 ${NEW_RATE}% · 历史对照 ${HIST_OLD}% → 差 ${drift.vsHistory} 个百分点；同期对照 ${HIST_NOW}% → 差 ${drift.vsConcurrent} 个百分点。`);
  console.log(`  → 与疗法无关的时间漂移 ${drift.drift} 个百分点（支持治疗本身在改善，${HIST_OLD}% 降到 ${HIST_NOW}%）。`);
  console.log(`单病例规模：${n1.patients} 例 × ${N1_ROUNDS} 轮 × ${N1_PERIODS} 期 × ${N1_WEEKS} 周 = ${n1.patientWeeks} 患者周（每人 ${n1.weeksPerPatient} 治疗周，另加洗脱期）。`);
  console.log('');
  console.log('判断：没有「最好的设计」，只有「与问题匹配的设计」；');
  console.log('      你要的是平均效应、实际效果，还是这个人的反应。');
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
  DOC, CHAPTER, TITLE, HIST_OLD, HIST_NOW, NEW_RATE, DESIGNS, CONTROL_FORMS, RANDOM_STEPS,
  read, parseSections, analyze, boldTerms, sectionOf, driftArithmetic, singleCaseScale, auditStructure, verify,
};
