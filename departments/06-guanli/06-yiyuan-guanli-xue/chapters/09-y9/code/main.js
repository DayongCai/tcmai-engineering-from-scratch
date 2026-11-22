#!/usr/bin/env node
/**
 * 医院管理学 · 第 9 章 中医院的难题不是多挂一块牌子，是让两套疗效判据互相承认
 * 课程: departments/06-guanli/06-yiyuan-guanli-xue/chapters/09-y9/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章 docs/zh.md 现算：汉字、节、加粗判断、引文与问句。
 * 并复算本章的双轨账——文化三层、双轨三冲突、优势病种四步、协同四形态。
 * 层数或项数对不上，脚本报错，因为本章的立论是“两套判据要互相承认”。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 9;
const TITLE = '中医院的难题不是多挂一块牌子，是让两套疗效判据互相承认';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

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

const CULTURE = ['物质层', '制度层', '精神层'];
const CONFLICTS = ['收治范围重叠。', '绩效口径不同。', '人才结构错位。'];
const STEPS = ['选病。', '定方案。', '建评价。', '做推广。'];
const SYNERGY = ['联合查房', '会诊', '共管病房', '双处方'];

/**
 * 复算文化三层、双轨三冲突、优势病种四步与协同四形态。
 * 本章判断：牌子和占比都不是判据，可核查的结构与主责划分才是。
 */
function auditDualTrack(sections) {
  const s1 = sectionOf(sections, '文化的三层');
  const s3 = sectionOf(sections, '科室设置的双轨');
  const s4 = sectionOf(sections, '优势病种');
  const s5 = sectionOf(sections, '治未病与协同');

  const culture = CULTURE.filter((x) => boldTerms(s1.text).some((b) => b === x));
  const conflicts = CONFLICTS.filter((x) => boldTerms(s3.text).some((b) => b === x));
  const steps = STEPS.filter((x) => boldTerms(s4.text).some((b) => b === x));
  const synergy = SYNERGY.filter((x) => s5.text.includes(x));
  const mainOwner = /按病种定主责/.test(s3.text);
  const window = /中医介入不能延误西医的时间窗/.test(s5.text);

  return { culture, conflicts, steps, synergy, mainOwner, window };
}

function verify(a) {
  if (a.culture.length !== 3) throw new Error(`文化只数到 ${a.culture.length} 层，须三层`);
  if (a.conflicts.length !== 3) throw new Error(`双轨冲突只数到 ${a.conflicts.length} 个，须三个`);
  if (a.steps.length !== 4) throw new Error(`优势病种只数到 ${a.steps.length} 步，须四步`);
  if (a.synergy.length !== 4) throw new Error(`协同形态只数到 ${a.synergy.length} 种，须四种`);
  if (!a.mainOwner) throw new Error('正文没有写按病种定主责');
  if (!a.window) throw new Error('正文没有写中医介入不能延误西医的时间窗');
}

function main() {
  const a = analyze(read());
  const d = auditDualTrack(a.sections);
  verify(d);

  console.log(`医院管理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 加粗判断 ${a.claims} 处 · 引文 ${a.quotes.length} 条 · 问句 ${a.questions} 个`);
  console.log('');
  console.log(`文化三层 ${d.culture.length}/3：${d.culture.join(' → ')}（单向：精神 → 制度 → 物质）`);
  console.log(`双轨冲突 ${d.conflicts.length}/3：${d.conflicts.map((x) => x.replace(/。$/, '')).join('／')}`);
  console.log(`优势病种 ${d.steps.length}/4：${d.steps.map((x) => x.replace(/。$/, '')).join(' → ')}`);
  console.log(`协同形态 ${d.synergy.length}/4：${d.synergy.join('／')}`);
  console.log(`主责划分：${d.mainOwner ? '按病种定主责，另一科作协同方' : '缺失'}`);
  console.log(`协同底线：${d.window ? '中医介入不能延误西医的时间窗' : '缺失'}`);
  console.log('');
  console.log('判断：特色在报表里，不在病历里；协同在文件里，不在科室之间；');
  console.log('      两套判据要互相承认，靠的是结构化记录与可复核的主责划分。');
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(28, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成诊疗意见或疗效评价结论。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseSections, analyze, boldTerms, sectionOf, auditDualTrack, verify, CULTURE, CONFLICTS, STEPS, SYNERGY };
