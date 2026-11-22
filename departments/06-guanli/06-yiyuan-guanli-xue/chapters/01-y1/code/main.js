#!/usr/bin/env node
/**
 * 医院管理学 · 第 1 章 医院管理的第一道分界，是住院能力而不是招牌
 * 课程: departments/06-guanli/06-yiyuan-guanli-xue/chapters/01-y1/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章 docs/zh.md 现算：汉字、节、加粗判断、引文与问句。
 * 并复算本章三组判据——三条准入判据、四项公益性内涵、四个职能改写；
 * 任何一组不齐，脚本直接报错，因为本章的结论正是“缺一条就不成其为医院”。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const TITLE = '医院管理的第一道分界，是住院能力而不是招牌';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 按二级标题切节；标题下的正文一并带回，用于分组复算。 */
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

const CRITERIA = ['有床，且床是可分配的责任单位', '有建制科室', '有连续的运行能力'];
const PUBLIC = ['可及性', '公平性', '适宜性', '非营利性'];
const DUTIES = ['计划', '组织', '领导', '控制'];

/**
 * 复算三条准入判据、四项公益内涵、四个职能改写。
 * 这三组是本章全部判断的骨架：准入看三条，公益看四项，职能看四改。
 */
function auditJudgement(sections) {
  const s1 = sectionOf(sections, '医院之所以是医院');
  const s2 = sectionOf(sections, '公益性与经济性');
  const s3 = sectionOf(sections, '四个职能');
  const s4 = sectionOf(sections, '合成一个难看的医院');

  const criteria = CRITERIA.filter((c) => s1.text.includes(c));
  const publicWelfare = PUBLIC.filter((p) => boldTerms(s2.text).some((b) => b === p));
  const duties = DUTIES.filter((d) => boldTerms(s3.text).some((b) => b === d + '。'));
  const gaugeQuestions = (s4.text.match(/？/g) || []).length;

  return { criteria, publicWelfare, duties, gaugeQuestions };
}

function verify(a) {
  if (a.criteria.length !== 3) throw new Error(`准入判据只数到 ${a.criteria.length} 条，本章立论要求三条齐全`);
  if (a.publicWelfare.length !== 4) throw new Error(`公益性内涵只数到 ${a.publicWelfare.length} 项，缺一项就落不了地`);
  if (a.duties.length !== 4) throw new Error(`职能改写只数到 ${a.duties.length} 项，四项须逐一改写`);
  if (a.gaugeQuestions !== 3) throw new Error(`口径三问数到 ${a.gaugeQuestions} 问，三问不齐则数字无法互校`);
}

function main() {
  const a = analyze(read());
  const j = auditJudgement(a.sections);
  verify(j);

  console.log(`医院管理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 加粗判断 ${a.claims} 处 · 引文 ${a.quotes.length} 条 · 问句 ${a.questions} 个`);
  console.log('');
  console.log(`准入判据 ${j.criteria.length}/3：${j.criteria.join('／')}`);
  console.log(`公益性内涵 ${j.publicWelfare.length}/4：${j.publicWelfare.join('／')}`);
  console.log(`职能改写 ${j.duties.length}/4：${j.duties.join('／')}`);
  console.log(`口径三问 ${j.gaugeQuestions}/3：分子分母、时间窗、责任人`);
  console.log('');
  console.log('判断：招牌与床位编制都不构成医院，能同时收住、复核、连续运行的才构成；');
  console.log('      三张报表互相抵消时，先统一口径，再谈规模。');
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(28, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成管理咨询或医疗意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseSections, analyze, boldTerms, sectionOf, auditJudgement, verify, CRITERIA, PUBLIC, DUTIES };
