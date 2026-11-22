#!/usr/bin/env node
/**
 * 医院管理学 · 第 2 章 组织图画的不是权力，是签字与担责的错位
 * 课程: departments/06-guanli/06-yiyuan-guanli-xue/chapters/02-y2/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章 docs/zh.md 现算：汉字、节、加粗判断、引文与问句。
 * 并复算本章的组织结构账——四种结构、矩阵三件事、双头指挥四场景、人力三本账。
 * 结构数对不上，脚本直接报错，因为本章的立论是“先选愿意长期承受的那种矛盾”。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '组织图画的不是权力，是签字与担责的错位';
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

const STRUCTURES = ['直线制', '职能制', '直线职能制', '矩阵制'];
const SCENES = ['人力调配。', '考核打分。', '质量责任。', '中医护理技术的准入。'];
const RIGHTS = ['调配权', '异议权', '事后核算权'];

/** 从「三件事——……。」这样的破折号长句里数出并列项。 */
function dashList(text, head) {
  const m = String(text).match(new RegExp(head + '[^。]*'));
  if (!m) return [];
  return m[0].split('—').pop().replace(/。$/, '').split('、').map((s) => s.trim()).filter(Boolean);
}

/**
 * 复算四种结构、矩阵三件事、双头指挥四场景与人力三本账。
 * 本章的判断是“结构选择即矛盾选择”，四项不齐就无法比较。
 */
function auditOrganisation(sections) {
  const s1 = sectionOf(sections, '四种结构');
  const s2 = sectionOf(sections, '双头指挥');
  const s4 = sectionOf(sections, '三本账');

  const structures = STRUCTURES.filter((x) => boldTerms(s1.text).some((b) => b === x));
  const matrixItems = dashList(s1.text, '三件事——');
  const scenes = SCENES.filter((x) => boldTerms(s2.text).some((b) => b === x));
  const rights = RIGHTS.filter((r) => s2.text.includes(r));
  const books = boldTerms(s4.text).filter((b) => b.startsWith('第'));

  return { structures, matrixItems, scenes, rights, books };
}

function verify(a) {
  if (a.structures.length !== 4) throw new Error(`结构只数到 ${a.structures.length} 种，四种并列才谈得上取舍`);
  if (a.matrixItems.length !== 3) throw new Error(`矩阵前置条件数到 ${a.matrixItems.length} 项，须三项齐全`);
  if (a.scenes.length !== 4) throw new Error(`双头指挥场景数到 ${a.scenes.length} 个，须四个`);
  if (a.books.length !== 3) throw new Error(`人力账本数到 ${a.books.length} 本，须三本`);
}

function main() {
  const a = analyze(read());
  const o = auditOrganisation(a.sections);
  verify(o);

  console.log(`医院管理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 加粗判断 ${a.claims} 处 · 引文 ${a.quotes.length} 条 · 问句 ${a.questions} 个`);
  console.log('');
  console.log(`组织结构 ${o.structures.length}/4：${o.structures.join('／')}`);
  console.log(`矩阵前置条件 ${o.matrixItems.length}/3：${o.matrixItems.join('、')}`);
  console.log(`双头指挥场景 ${o.scenes.length}/4：${o.scenes.map((x) => x.replace(/。$/, '')).join('／')}`);
  if (o.rights.length !== 3) throw new Error('人力调配的三项权利不齐：调配权／异议权／事后核算权');
  console.log(`人力调配三权 ${o.rights.length}/3：${o.rights.join('／')}`);
  console.log('');
  console.log('判断：结构没有最优解，只有“哪种矛盾你愿意长期承受”；');
  console.log('      图上的线叫权力，线上的字叫责任，两者对不上时，摩擦成本就会固化。');
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(28, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成管理咨询或人事处理依据。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseSections, analyze, boldTerms, sectionOf, dashList, auditOrganisation, verify, STRUCTURES, SCENES, RIGHTS };
