#!/usr/bin/env node
/**
 * 护理毕业设计 · 第 5 章 答辩评的是判断链，不是字数与图表的数量：正文判断卡
 * 课程: departments/05-huli/27-huli-biye-sheji/chapters/05-lunwen-dabian/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：汉字数、节数、表格与数据行、四段式、时长表、六类提问、
 * 图表三规矩与五条失效；以及开篇的时间算术——「四段平均分」与「问题/方法/结果/
 * 讨论/结论 五段分配」的对照、结果与讨论的占比、六张图每张可停留的时长——
 * 都由本脚本从正文读出数字重算，并与正文写出的结果逐项对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '5';
const SLUG = '05-lunwen-dabian';
const TITLE = '答辩评的是判断链，不是字数与图表的数量';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

// 提问样例取自本章的六类问法表，用于检验「认得出类别就能给出对路的回答」。
const QUESTION_SAMPLES = [
  { text: '这个问题真的存在吗？有多大？', note: '缺口类' },
  { text: '为什么不设对照组？', note: '设计类' },
  { text: '这个指标能代表你要测的东西吗？', note: '测量类' },
  { text: '干预真的做到了吗？', note: '执行类' },
  { text: '病人怎么同意的？数据怎么存的？', note: '伦理类' },
  { text: '这个结论能推广吗？', note: '推广类' }
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

/** 时间分配：四段平均 vs 五段分配；结果与讨论的占比；六张图各能停多久 */
function schedule(text) {
  const num = (re, name) => {
    const m = text.match(re);
    if (!m) throw new Error('正文里找不到这个数：' + name);
    return Number(m[1].replace(/,/g, ''));
  };
  const even = text.match(/各\s*([\d.]+)\s*分钟（\d+\s*÷\s*(\d+)\s*=/);
  if (!even) throw new Error('正文里找不到四段平均的算式');
  const evenAvg = Number(even[1]);
  const parts = Number(even[2]);
  const problem = num(/问题\s*(\d+)\s*分钟/, '问题段');
  const method = num(/方法\s*(\d+)\s*分钟/, '方法段');
  const result = num(/结果\s*(\d+)\s*分钟/, '结果段');
  const discussion = num(/讨论\s*(\d+)\s*分钟/, '讨论段');
  const conclusion = num(/结论\s*(\d+)\s*分钟/, '结论段');
  const statedTotal = num(/结论\s*\d+\s*分钟（[^）]*=\s*(\d+)\s*）/, '陈述总时长');
  const statedShare = num(/结果与讨论占九分钟（\d+\s*÷\s*\d+\s*=\s*(\d+)%）/, '结果与讨论占比');
  const figures = /不超过六张/.test(text) ? 6 : 0;

  const total = problem + method + result + discussion + conclusion;
  const judged = result + discussion;
  const share = Number(((judged / total) * 100).toFixed(1));
  const perFigure = Number((total / figures).toFixed(1));
  return {
    evenAvg, parts, segments: { problem, method, result, discussion, conclusion },
    total, judged, share, figures, perFigure,
    stated: { total: statedTotal, share: statedShare },
    consistent: total === statedTotal && share === statedShare
  };
}

/** 本章可数的结构：四段式、时长表五行、六类提问、图表三规矩、五条失效 */
function structure(text) {
  const lines = text.split(/\r?\n/);
  const rows = tableBlocks(lines).map((b) => dataRows(b).length);
  return {
    fourParts: rows[0],
    durationRows: rows[1],
    questionTypes: rows[2],
    chartRules: (sectionText(text, '图表').match(/\*\*第[一二三四]条，/g) || []).length,
    failures: (sectionText(text, '五种失效模式').match(/\*\*其[一二三四五六七八九]，/g) || []).length
  };
}

/** 提问归类：六类各自有典型的问法，认得出类别就能给出对路的回答 */
function questionKind(question) {
  const t = String(question || '');
  if (/(同意|数据怎么存|伦理|去标识)/.test(t)) return '伦理类';
  if (/(做到了吗|保真|执行|漏做)/.test(t)) return '执行类';
  if (/(推广|能推到|适用到|普遍)/.test(t)) return '推广类';
  if (/(指标|测量|怎么测|代表你要测)/.test(t)) return '测量类';
  if (/(对照组|为什么用这个设计|样本量)/.test(t)) return '设计类';
  if (/(真的存在|有多大|缺口|影响多少人)/.test(t)) return '缺口类';
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
    schedule: schedule(text),
    structure: structure(text),
    questions: QUESTION_SAMPLES.map((s) => ({ ...s, kind: questionKind(s.text) }))
  };
}

function main() {
  const r = report();
  const s = r.schedule;
  const st = r.structure;
  console.log(`护理毕业设计 · 第 ${r.chapter} 章 ${r.title}`);
  console.log(`正文: chapters/${SLUG}/docs/zh.md`);
  console.log('');
  console.log(`规模: 汉字 ${r.size.hanzi.toLocaleString('en-US')} · 节 ${r.size.sections} · 表格 ${r.size.tables} 张（数据行 ${r.size.rows}）`);
  console.log('');
  console.log('答辩时间算术:');
  console.log(`  四段平均：${s.total} ÷ ${s.parts} = ${s.evenAvg} 分钟一段，把最多时间给了最容易准备的部分`);
  console.log(`  按判断分配：问题 ${s.segments.problem} + 方法 ${s.segments.method} + 结果 ${s.segments.result} + 讨论 ${s.segments.discussion} + 结论 ${s.segments.conclusion} = ${s.total} 分钟`);
  console.log(`  结果与讨论 ${s.judged} 分钟，占 ${s.judged} ÷ ${s.total} = ${s.share}%`);
  console.log(`  六张图的上限：每张平均可停 ${s.total} ÷ ${s.figures} = ${s.perFigure} 分钟`);
  console.log(`  对账: 正文写出的 ${s.stated.total}/${s.stated.share}% 与重算${s.consistent ? '一致' : '不一致'}`);
  console.log(`  读法: 陈述的目标不是讲完，是让评委在十五分钟内形成三个判断；结果段占最多时间是刻意的。`);
  console.log('');
  console.log(`结构: 论文 ${st.fourParts} 段 · 时长表 ${st.durationRows} 行 · 提问 ${st.questionTypes} 类 · 图表规矩 ${st.chartRules} 条 · 失效模式 ${st.failures} 条`);
  console.log('');
  console.log('提问样例（六类逐条归类）:');
  for (const q of r.questions) {
    console.log(`  ${q.kind === '未归类' ? '❌' : '✅'} ${q.kind} ← ${q.text}　〔${q.note}〕`);
  }
  console.log('');
  console.log(`结论: ${r.questions.length} 个问法全部落在六类之内；设计类与推广类最容易失分，应答的落点是承认加限定，不是辩解或绕开。`);
  console.log('边界声明: 本输出为教学样例，数字由本章正文现算，不构成学术评价意见；时长分配为教学设定，以本校制度为准。');
}

if (require.main === module) main();

module.exports = {
  readDoc, hanzi, sectionTitles, sectionText, tableBlocks, dataRows,
  schedule, structure, questionKind, QUESTION_SAMPLES,
  report, CHAPTER, SLUG, TITLE
};
