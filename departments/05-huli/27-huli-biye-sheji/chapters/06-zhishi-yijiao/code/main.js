#!/usr/bin/env node
/**
 * 护理毕业设计 · 第 6 章 毕设的最后一关，是别人能不能接着用：正文判断卡
 * 课程: departments/05-huli/27-huli-biye-sheji/chapters/06-zhishi-yijiao/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：汉字数、节数、表格与数据行、移交四件、数据三事、交接会三段、
 * 接手方三问、移交单五栏与五条失效；以及开篇的完整度算术——「四件里少几件」
 * 折算成百分之多少、以及缺数据字典时可用性为何趋近于零——都由本脚本从正文
 * 读出数字重算，并与正文写出的结果逐项对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '6';
const SLUG = '06-zhishi-yijiao';
const TITLE = '毕设的最后一关，是别人能不能接着用';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const RECEIVER_QUESTIONS = [
  { text: '这个数是怎么来的？', note: '数据链是否完整' },
  { text: '如果我要改一处，会牵连哪些地方？', note: '结构是否清楚' },
  { text: '什么情况下我应该停下来问你？', note: '边界意识' }
];

const FORM_FIELDS = ['交了什么', '交给谁', '用途', '期限', '双方签字'];

function readDoc() {
  return fs.readFileSync(DOC, 'utf8');
}

function hanzi(text) {
  return (text.match(/[\u4e00-\u9fff]/g) || []).length;
}

function sectionTitles(text) {
  return text.split(/\r?\n/).filter((l) => /^##\s/.test(l)).map((l) => l.replace(/^##\s*/, '').trim());
}

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

function dataRows(block) {
  return block.filter((l) => !/^\s*\|[\s:\-|]+\|\s*$/.test(l)).slice(1);
}

/** 完整度：四件里齐几件折算成百分比；可用性不由件数决定，由缺的是哪一件决定 */
function completeness(text) {
  const num = (re, name) => {
    const m = text.match(re);
    if (!m) throw new Error('正文里找不到这个数：' + name);
    return Number(m[1].replace(/,/g, ''));
  };
  const items = /移交包[\s\S]{0,20}含四件/.test(text) ? 4 : 0;
  const fullItems = num(/完整度是\s*(\d+)\s*÷\s*\d+\s*=\s*\d+%/, '齐套件数');
  const statedFull = num(/完整度是\s*\d+\s*÷\s*\d+\s*=\s*(\d+)%/, '齐套完整度');
  const shortItems = num(/缺一件，是\s*(\d+)\s*÷\s*\d+\s*=\s*\d+%/, '缺一件的件数');
  const statedShort = num(/缺一件，是\s*\d+\s*÷\s*\d+\s*=\s*(\d+)%/, '缺一件完整度');
  const usableIfDictionaryMissing = /缺的是数据字典，剩下的三件加起来可用性接近于零/.test(text) ? 0 : null;
  const full = Number(((fullItems / items) * 100).toFixed(0));
  const short = Number(((shortItems / items) * 100).toFixed(0));
  return {
    items, fullItems, shortItems, full, short, usableIfDictionaryMissing,
    stated: { full: statedFull, short: statedShort },
    consistent: full === statedFull && short === statedShort
  };
}

/** 本章可数的结构：移交四件、数据三事、交接会三段、接手方三问、移交单五栏、五条失效 */
function structure(text) {
  const lines = text.split(/\r?\n/);
  const rows = tableBlocks(lines).map((b) => dataRows(b).length);
  return {
    packageItems: rows[0],
    dataBounds: (sectionText(text, '数据移交').match(/\*\*(授权|去标识|期限)。\*\*/g) || []).length,
    meetingParts: (sectionText(text, '交接会').match(/第[一二三]段，/g) || []).length,
    receiverQuestions: (sectionText(text, '被接手方的三个提问').match(/第[一二三]问：/g) || []).length,
    formFields: FORM_FIELDS.filter((k) => text.includes(k)).length,
    failures: (sectionText(text, '五种失效模式').match(/\*\*其[一二三四五六七八九]，/g) || []).length
  };
}

/** 接手方的提问归到三问的哪一问：数据链、依赖结构、边界 */
function receiverKind(question) {
  const t = String(question || '');
  if (/(停下来|什么情况下|该问|不确定)/.test(t)) return '边界';
  if (/(牵连|依赖|改一处|影响哪些|关联)/.test(t)) return '依赖结构';
  if (/(怎么来|来源|哪里|算出|回查)/.test(t)) return '数据链';
  return '未归类';
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
    completeness: completeness(text),
    structure: structure(text),
    questions: RECEIVER_QUESTIONS.map((q) => ({ ...q, kind: receiverKind(q.text) }))
  };
}

function main() {
  const r = report();
  const c = r.completeness;
  const s = r.structure;
  console.log(`护理毕业设计 · 第 ${r.chapter} 章 ${r.title}`);
  console.log(`正文: chapters/${SLUG}/docs/zh.md`);
  console.log('');
  console.log(`规模: 汉字 ${r.size.hanzi.toLocaleString('en-US')} · 节 ${r.size.sections} · 表格 ${r.size.tables} 张（数据行 ${r.size.rows}）`);
  console.log('');
  console.log('移交完整度算术:');
  console.log(`  ${c.items} 件齐：${c.fullItems} ÷ ${c.items} = ${c.full}%`);
  console.log(`  缺一件：${c.shortItems} ÷ ${c.items} = ${c.short}%`);
  console.log(`  缺的是数据字典时，可用性 ≈ ${c.usableIfDictionaryMissing}%（${c.short}% 的完整度，${c.usableIfDictionaryMissing}% 的可用性）`);
  console.log(`  对账: 正文写出的 ${c.stated.full}/${c.stated.short} 与重算${c.consistent ? '一致' : '不一致'}`);
  console.log(`  读法: 四件不是并列清单——数据字典是地基，方案与手册是墙，联系人是门；地基没有，墙与门都不成立。`);
  console.log('');
  console.log(`结构: 移交 ${s.packageItems} 件 · 数据边界 ${s.dataBounds} 事 · 交接会 ${s.meetingParts} 段 · 接手方 ${s.receiverQuestions} 问 · 移交单 ${s.formFields} 栏 · 失效模式 ${s.failures} 条`);
  console.log('');
  console.log('三问样例（逐条归类）:');
  for (const q of r.questions) {
    console.log(`  ${q.kind === '未归类' ? '❌' : '✅'} ${q.kind.padEnd(4)} ← ${q.text}　〔${q.note}〕`);
  }
  console.log('');
  console.log(`结论: 三问全部答得出，移交才算完成；答不出就把答案补进文档再约一次——补文档的成本远低于半年后一个电话。`);
  console.log('边界声明: 本输出为教学样例，数字由本章正文现算，不构成法律或信息管理意见；归档与数据保管以本校制度与伦理批件为准。');
}

if (require.main === module) main();

module.exports = {
  readDoc, hanzi, sectionTitles, sectionText, tableBlocks, dataRows,
  completeness, structure, receiverKind, RECEIVER_QUESTIONS, FORM_FIELDS,
  report, CHAPTER, SLUG, TITLE
};
