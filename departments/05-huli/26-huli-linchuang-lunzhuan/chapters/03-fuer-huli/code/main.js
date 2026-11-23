#!/usr/bin/env node
/**
 * 护理临床轮转 · 第 3 章 妇儿轮转要写两个人的记录，一份也不能省：正文判断卡
 * 课程: departments/05-huli/26-huli-linchuang-lunzhuan/chapters/03-fuer-huli/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：汉字数、节数、表格与数据行、双对象与年龄段的条数、三条观察线与
 * 三类沟通话的条数，以及开篇「两科周数相加 → 工作日 × 每班两份 → 合计份数 →
 * 一半只写一个对象时缺多少条线」的算术，都由本脚本从正文读出并与正文写出的结果对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '3';
const SLUG = '03-fuer-huli';
const TITLE = '妇儿轮转要写两个人的记录，一份也不能省';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

// 家属沟通样例取自本章正文的三类话与越界例子。
const TALK_SAMPLES = [
  { text: '今天体温三十七度二，已经喂过两次', note: '第一类·事实' },
  { text: '这个手术肯定没问题', note: '越界承诺' },
  { text: '明天上午找张医生复诊', note: '第三类·安排' },
  { text: '我去问一下，稍后回复你', note: '判断类不越界的应答' }
];

const CARER_ITEMS = ['照护能力', '情绪状态', '依从情况', '家庭条件'];

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

/** 开篇算术：两科周数相加，工作日 × 每班两份，一半只写一个对象时缺的条数 */
function problem(text) {
  const num = (re, name) => {
    const m = text.match(re);
    if (!m) throw new Error('正文里找不到这个数：' + name);
    return Number(m[1].replace(/,/g, ''));
  };
  const weeksEach = num(/各\s*(\d+)\s*周/, '每科周数');
  const weeksTotal = num(/各\s*\d+\s*周共\s*(\d+)\s*周/, '两科合计周数');
  const workdays = num(/约\s*(\d+)\s*个工作日/, '工作日数');
  const objectsPerShift = /为两个对象各写一份/.test(text) ? 2 : 0;
  const statedRecords = num(/合计\s*(\d+)\s*份/, '全站记录份数');
  const statedMissing = num(/就有\s*(\d+)\s*份记录缺一条线/, '缺线份数');
  const records = workdays * objectsPerShift;
  const missing = records / 2;
  return {
    weeksEach,
    weeksTotal,
    workdays,
    objectsPerShift,
    records,
    missing,
    stated: { weeksTotal, records: statedRecords, missing: statedMissing },
    consistent: weeksEach * 2 === weeksTotal && records === statedRecords && missing === statedMissing
  };
}

/** 本章可数的结构：双对象表、年龄段表、三条观察线、照护者四类、三类沟通话 */
function structure(text) {
  const lines = text.split(/\r?\n/);
  const rows = tableBlocks(lines).map((b) => dataRows(b).length);
  const numbered = (key) => (sectionText(text, key).match(/^\d+\.\s/gm) || []).length;
  return {
    objectPairs: rows[0],
    ageBands: rows[1],
    observationLines: (sectionText(text, '产科').match(/第[一二三四]条，/g) || []).length,
    carerItems: CARER_ITEMS.filter((k) => text.includes(k)).length,
    talkClasses: (sectionText(text, '家属沟通').match(/第[一二三四]类，/g) || []).length,
    examItems: numbered('出科考核项'),
    failures: (sectionText(text, '出科考核项与五种失效模式').match(/\*\*其[一二三四五六七八九]，/g) || []).length
  };
}

/**
 * 家属沟通三类话：事实 / 判断 / 安排，另把越界承诺单列。
 * 越界承诺不是第四类话，它是「判断」这类话说过了头的样子，必须能被单独认出来。
 */
function talkClass(sentence) {
  const t = String(sentence || '');
  if (/(肯定|一定|保证|没问题|不会有事|包好|放心)/.test(t)) return '越界承诺';
  if (/(稍后|明天|下周|后天|找|约|安排|复诊|几点|什么时候)/.test(t)) return '安排';
  if (/(可能|说明|应该是|考虑|预后|会不会|要不要)/.test(t)) return '判断';
  if (/(\d|体温|血压|喂|吃了|结果是|已经)/.test(t)) return '事实';
  return '未归类';
}

function report() {
  const text = readDoc();
  const lines = text.split(/\r?\n/);
  const blocks = tableBlocks(lines);
  let rows = 0;
  for (const b of blocks) rows += dataRows(b).length;
  const m = problem(text);
  return {
    chapter: CHAPTER,
    title: TITLE,
    size: { hanzi: hanzi(text), sections: sectionTitles(text).length, tables: blocks.length, rows },
    math: m,
    structure: structure(text),
    talks: TALK_SAMPLES.map((s) => ({ ...s, kind: talkClass(s.text) }))
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
  console.log('双对象记录算术:');
  console.log(`  两科 ${m.weeksEach} 周 + ${m.weeksEach} 周 = ${m.weeksTotal} 周；约 ${m.workdays} 个工作日`);
  console.log(`  ${m.workdays} 个班 × 每班 ${m.objectsPerShift} 份 = ${m.records} 份记录`);
  console.log(`  一半只写了其中一个对象：${m.records} ÷ 2 = ${m.missing} 份缺一条线`);
  console.log(`  对账: 正文写出的 ${m.stated.weeksTotal}/${m.stated.records}/${m.stated.missing} 与重算${m.consistent ? '一致' : '不一致'}`);
  console.log(`  读法: 缺的那条线出院时补不回来——对方当时的状况已经过去了；分开写并不贵，三条线各两行，六行就够。`);
  console.log('');
  const s = r.structure;
  console.log(`结构: 双对象 ${s.objectPairs} 行 · 年龄段 ${s.ageBands} 档 · 产科观察线 ${s.observationLines} 条 · 照护者 ${s.carerItems} 类 · 沟通话 ${s.talkClasses} 类 · 考核 ${s.examItems} 项 · 失效模式 ${s.failures} 条`);
  console.log('');
  console.log('家属沟通样例（三类话逐条判定）:');
  for (const x of r.talks) {
    const ok = x.kind !== '越界承诺' && x.kind !== '未归类';
    console.log(`  ${ok ? '✅' : '❌'} ${x.kind.padEnd(4)} ← ${x.text}　〔${x.note}〕`);
  }
  console.log('');
  console.log(`结论: ${r.talks.length} 句里 ${r.talks.filter((x) => x.kind !== '越界承诺' && x.kind !== '未归类').length} 句落在三类话之内；越界承诺一出现就要改成「我去问一下，稍后回复你」，并真的回复。`);
  console.log('边界声明: 本输出为教学样例，数字由本章正文现算，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = {
  readDoc, hanzi, sectionTitles, sectionText, tableBlocks, dataRows,
  problem, structure, talkClass, report, TALK_SAMPLES, CARER_ITEMS, CHAPTER, SLUG, TITLE
};
