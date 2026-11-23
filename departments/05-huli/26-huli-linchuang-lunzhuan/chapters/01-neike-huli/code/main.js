#!/usr/bin/env node
/**
 * 护理临床轮转 · 第 1 章 内科轮转的前三天，决定这一站还能学到什么：正文判断卡
 * 课程: departments/05-huli/26-huli-linchuang-lunzhuan/chapters/01-neike-huli/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：汉字数、节数、表格与数据行、交接四段的条数、失效模式条数，
 * 以及本章开篇那串「站 × 周 → 工作日 − 考核 → 剩余天数」的算术，都由本脚本从正文读出，
 * 并与正文自己写出的结果对账。改正文后重跑即可复现，不留手打数字。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '1';
const SLUG = '01-neike-huli';
const TITLE = '内科轮转的前三天，决定这一站还能学到什么';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

// 交接样例取自本章正文的四段写法与失效模式，逐条过规则，看它落在哪一段。
const SAMPLES = [
  { text: '诊断类别、当前主要问题、当前措施', note: '第一段·现状' },
  { text: '与前一班相比，哪几项变了，朝哪个方向变', note: '第二段·变化' },
  { text: '哪些结果没回、哪些观察还没结论、哪些事等下一班做', note: '第三段·未决' },
  { text: '接班后先复测一次，若仍偏移即报告', note: '第四段·下一步' },
  { text: '密切观察', note: '第四段写成了空话' }
];

function readDoc() {
  return fs.readFileSync(DOC, 'utf8');
}

function hanzi(text) {
  return (text.match(/[\u4e00-\u9fff]/g) || []).length;
}

function sectionTitles(text) {
  return text.split(/\r?\n/).filter((l) => /^##\s/.test(l)).map((l) => l.replace(/^##\s*/, '').trim());
}

/** 取出某个二级标题下的正文（不含该标题行） */
function sectionText(text, key) {
  const out = [];
  let on = false;
  for (const line of text.split(/\r?\n/)) {
    const m = /^##\s+(.*)$/.exec(line);
    if (m) { on = m[1].includes(key); continue; }
    if (on) out.push(line);
  }
  return out.join('\n');
}

/** 连续以 | 开头的行算一张表 */
function tableBlocks(lines) {
  const blocks = [];
  let cur = null;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('|')) {
      if (!cur) { cur = []; blocks.push(cur); }
      cur.push(t);
    } else {
      cur = null;
    }
  }
  return blocks;
}

/** 表头之外的数据行 */
function dataRows(block) {
  return block.filter((l) => !/^\|[\s:\-|]+\|$/.test(l)).slice(1);
}

/** 章节开篇那串算术：站 × 周、工作日 − 考核、再扣掉开头几天 */
function problem(text) {
  const num = (re, name) => {
    const m = text.match(re);
    if (!m) throw new Error('正文里找不到这个数：' + name);
    return Number(m[1].replace(/,/g, ''));
  };
  const stations = num(/按\s*(\d+)\s*站/, '站数');
  const weeksPer = num(/每站\s*(\d+)\s*周/, '每站周数');
  const workdays = num(/一站约\s*(\d+)\s*个工作日/, '每站工作日');
  const examDays = num(/占用的\s*(\d+)\s*天/, '两次考核占用的天数');
  const frontDays = num(/若前\s*(\d+)\s*天/, '开头几天');
  const totalWeeks = stations * weeksPer;
  const realDays = workdays - examDays;
  const restDays = realDays - frontDays;
  const stated = {
    totalWeeks: num(/一轮共\s*(\d+)\s*周/, '一轮周数'),
    realDays: num(/能真正跟班的是\s*(\d+)\s*天/, '真正跟班天数'),
    restDays: num(/剩下\s*(\d+)\s*天/, '剩余天数')
  };
  return {
    stations, weeksPer, workdays, examDays, frontDays,
    totalWeeks, realDays, restDays,
    stated,
    consistent: totalWeeks === stated.totalWeeks && realDays === stated.realDays && restDays === stated.restDays
  };
}

/** 本章可数的结构：三问、学习目标、观察项、交接段、考核项、失效模式 */
function structure(text) {
  const lines = text.split(/\r?\n/);
  const rows = tableBlocks(lines).map((b) => dataRows(b).length);
  const numbered = (key) => (sectionText(text, key).match(/^\d+\.\s/gm) || []).length;
  return {
    questions: rows[0],
    goals: rows[1],
    observations: rows[2],
    handoverParts: numbered('交接'),
    examItems: numbered('出科考核项'),
    failures: (sectionText(text, '出科考核项与五种失效模式').match(/\*\*其[一二三四五六七八九]，/g) || []).length
  };
}

/** 交接一句话落在四段中的哪一段；都不是则算空话 */
function handoverSegment(sentence) {
  const t = String(sentence || '');
  if (/(密切观察|注意观察|继续观察|情况稳定|一般情况可)/.test(t)) return '空话';
  if (/(没回|未回|还没结论|等下一班|等结果|未决)/.test(t)) return '未决';
  if (/(接班后|下一步|先复测|立即报告|第一件)/.test(t)) return '下一步';
  if (/(相比|变了|偏移|趋势|朝哪个方向)/.test(t)) return '变化';
  if (/(诊断类别|当前主要问题|当前措施|现状)/.test(t)) return '现状';
  return '未归类';
}

/** 四段是否齐全：现状、变化、未决、下一步各至少一句 */
function handoverCoverage(sentences) {
  const got = new Set(sentences.map(handoverSegment));
  const need = ['现状', '变化', '未决', '下一步'];
  return { got: need.filter((k) => got.has(k)), missing: need.filter((k) => !got.has(k)) };
}

function report() {
  const text = readDoc();
  const lines = text.split(/\r?\n/);
  const blocks = tableBlocks(lines);
  let rows = 0;
  for (const b of blocks) rows += dataRows(b).length;
  return {
    chapter: CHAPTER,
    title: TITLE,
    size: { hanzi: hanzi(text), sections: sectionTitles(text).length, tables: blocks.length, rows },
    math: problem(text),
    structure: structure(text),
    samples: SAMPLES.map((s) => ({ ...s, segment: handoverSegment(s.text) })),
    coverage: handoverCoverage(SAMPLES.slice(0, 4).map((s) => s.text))
  };
}

function main() {
  const r = report();
  const m = r.math;
  console.log(`护理临床轮转 · 第 ${r.chapter} 章 ${r.title}`);
  console.log(`正文: chapters/${SLUG}/docs/zh.md`);
  console.log('');
  console.log(`规模: 汉字 ${r.size.hanzi.toLocaleString('en-US')} · 节 ${r.size.sections} · 表格 ${r.size.tables} 张（数据行 ${r.size.rows}）`);
  console.log('');
  console.log('入科算术:');
  console.log(`  ${m.stations} 站 × 每站 ${m.weeksPer} 周 = ${m.totalWeeks} 周`);
  console.log(`  一站 ${m.workdays} 个工作日 − 两次考核 ${m.examDays} 天 = ${m.realDays} 天`);
  console.log(`  能跟班 ${m.realDays} 天 − 开头 ${m.frontDays} 天 = ${m.restDays} 天`);
  console.log(`  对账: 正文写出的 ${m.stated.totalWeeks}/${m.stated.realDays}/${m.stated.restDays} 与重算${m.consistent ? '一致' : '不一致'}`);
  console.log(`  读法: 前 ${m.frontDays} 天不建立参照系，后 ${m.restDays} 天只能「跟着走」，不是「有靶子的看」。`);
  console.log('');
  const s = r.structure;
  console.log(`结构: 入科三问 ${s.questions} 行 · 学习目标 ${s.goals} 行 · 观察项 ${s.observations} 行 · 交接 ${s.handoverParts} 段 · 考核 ${s.examItems} 项 · 失效模式 ${s.failures} 条`);
  console.log('');
  console.log('交接样例（规则逐条判定）:');
  for (const x of r.samples) {
    const ok = x.segment !== '空话' && x.segment !== '未归类';
    console.log(`  ${ok ? '✅' : '❌'} ${x.segment.padEnd(4)} ← ${x.text}　〔${x.note}〕`);
  }
  console.log('');
  console.log(`结论: ${r.samples.length} 条例句里 ${r.samples.filter((x) => x.segment !== '空话' && x.segment !== '未归类').length} 条落在四段之内；四段齐全度 ${r.coverage.got.length}/4，缺的段一旦漏掉，接班的人就要在病人床边重问一遍。`);
  console.log('边界声明: 本输出为教学样例，数字由本章正文现算，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = {
  readDoc, hanzi, sectionTitles, sectionText, tableBlocks, dataRows,
  problem, structure, handoverSegment, handoverCoverage, report,
  SAMPLES, CHAPTER, SLUG, TITLE
};
