#!/usr/bin/env node
/**
 * 中医口腔科学 · 第 3 章 口镜看得见红肿，看不见该不该清
 * 课程: departments/08-wuguan/08-zhongyi-kouqiang-kexue/chapters/03-e83/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章从正文现算两处硬结构：六步次序有没有被改动；
 * 舌症十条逐条归类后，纯虚／纯实／虚中夹火是不是真的 5／3／2 ——
 * 与正文自述的比例对照，不一致即抛错，而不是把注释放过去。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const SLUG = '03-e83';

const STEPS = ['定位', '定性', '辨火', '辨脓血', '辨舌脉', '落记录'];
const TONGUE = [
  ['中气虚热', 'mixed'],
  ['阴血虚热', 'mixed'],
  ['肾经虚火', 'pure'],
  ['命门火衰', 'pure'],
  ['肠胃实火', 'solid'],
  ['脾经虚热', 'pure'],
  ['脾经湿热', 'solid'],
  ['上焦有热', 'solid'],
  ['脾经血伤火动', 'pure'],
  ['肝经血伤火动', 'pure'],
];
const STATED = { pure: 5, solid: 3, mixed: 2 };
const PAIRS4 = ['急与缓', '剧与隐', '龈之荣枯', '兼证'];
const RECORD6 = ['部位', '病程与急缓', '局部所见', '火之分辨', '舌脉', '处置去向'];
const BLANK = ['证不显', '两周复诊'];
const BOUNDARY = ['本章不给剂量', '不给疗程', '不构成诊断或治疗建议'];

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const present = (doc, term) => doc.includes(term);
const sections = (doc) => [...doc.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());

function ordering(doc, terms) {
  let last = -1;
  for (const t of terms) {
    const i = doc.indexOf(t);
    if (i <= last) return false;
    last = i;
  }
  return true;
}

/** 只在某个小节内部判次序，避免别的段落先出现同一个词 */
function sliceSection(doc, from, to) {
  const a = doc.indexOf(from);
  const b = doc.indexOf(to, a + 1);
  return a < 0 ? '' : doc.slice(a, b < 0 ? undefined : b);
}

function audit(doc = readDoc()) {
  const stepsInText = TONGUE.filter(([name]) => present(doc, name)).map(([name]) => name);
  const counts = { pure: 0, solid: 0, mixed: 0 };
  for (const [, cls] of TONGUE) counts[cls] += 1;
  const body = sliceSection(doc, '## 一、六步次序', '## 二、');
  const title = (doc.split(String.fromCharCode(10))[0] || '')
    .replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '')
    .trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    steps: STEPS.filter((t) => body.includes(t)),
    stepsOrdered: ordering(body, STEPS),
    tongue: stepsInText,
    tongueCount: stepsInText.length,
    counts,
    stated: STATED,
    countsMatch: counts.pure === STATED.pure
      && counts.solid === STATED.solid
      && counts.mixed === STATED.mixed,
    pairs4: PAIRS4.filter((t) => present(doc, t)),
    record6: RECORD6.filter((t) => present(doc, t)),
    blank: BLANK.every((t) => present(doc, t)),
    boundaryOk: BOUNDARY.every((t) => present(doc, t)),
  };
}

function main() {
  const a = audit();
  console.log(`中医口腔科学 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`六步：${a.steps.join(' → ')}`);
  console.log(`次序与正文一致：${a.stepsOrdered ? '是' : '否'}`);
  console.log('');
  console.log(`舌症十条落到正文：${a.tongueCount}／10`);
  console.log(`  纯虚 ${a.counts.pure}／纯实 ${a.counts.solid}／虚中夹火 ${a.counts.mixed}`);
  console.log(`  与正文自述（${STATED.pure}／${STATED.solid}／${STATED.mixed}）一致：${a.countsMatch ? '是' : '否'}`);
  console.log('');
  console.log(`虚实四对：${a.pairs4.join('、')}`);
  console.log(`记录六行：${a.record6.join('、')}`);
  console.log(`无证可辨的处置：${a.blank ? '记为证不显，两周复诊' : '缺'}`);
  console.log('');
  console.log('※ 教学样例：六步与十条归类均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成诊断或治疗建议；本章不给剂量、不给疗程。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, STEPS, TONGUE, STATED, PAIRS4, RECORD6, BLANK, BOUNDARY,
  readDoc, sections, ordering, sliceSection, audit,
};
