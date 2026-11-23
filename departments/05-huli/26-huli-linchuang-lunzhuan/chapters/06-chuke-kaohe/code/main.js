#!/usr/bin/env node
/**
 * 护理临床轮转 · 第 6 章 出科考的是一例能不能讲透，不是做过多少项：正文判断卡
 * 课程: departments/05-huli/26-huli-linchuang-lunzhuan/chapters/06-chuke-kaohe/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：汉字数、节数、表格与数据行、三层能力、复盘六栏、评价六维、
 * 迁移三形态与失效五条，以及开篇「6 站 × 1 次 → 8 项勾选 × 6 份 → 6 栏 × 6 例 →
 * 3 条 × 6 站」的算术，都由本脚本从正文读出并与正文写出的结果对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '6';
const SLUG = '06-chuke-kaohe';
const TITLE = '出科考的是一例能不能讲透，不是做过多少项';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const REVIEW_ITEMS = [
  { name: '一、情形', re: /(情形|基本情况|为什么来|最突出的问题)/ },
  { name: '二、我看到的', re: /(我看到的|观察|时点|数值|变化)/ },
  { name: '三、我当时怎么想', re: /(当时|判断|依据|不确定|考虑|以为)/ },
  { name: '四、我做了什么', re: /(我做了什么|措施|执行|协助|指导下|我负责)/ },
  { name: '五、结果如何', re: /(结果|反应|好转|没效果|复测|改)/ },
  { name: '六、换个做法会怎样', re: /(换个做法|若再遇到|可以不同|代价)/ }
];

// 复盘样例取自本章「写不好是什么样」与第六栏的三段写法。
const REVIEW_SAMPLES = [
  { text: '我按规范做了，结果良好', note: '只交代结果，判断与反思都空着' },
  {
    text: '情形：术后第二天的病人，主诉切口疼；我看到的：14:00 疼痛评分 4 分，翻身时加重；我当时怎么想：考虑与活动有关，依据是静卧可缓解；我做了什么：在指导下协助翻身并记录；结果如何：半小时后复测 2 分；换个做法：若再遇到同类情形，我会先问镇痛效果再协助翻身，因为上次漏了用药时点，代价是多花两分钟',
    note: '六栏齐，第六栏 X/Y/Z 齐全'
  },
  { text: '考虑可能是操作不熟练，今后要更加努力', note: '反思停在态度层面，无法执行' }
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

/** 开篇算术：考核次数、勾选总数、复盘栏数、可迁移判断条数 */
function problem(text) {
  const num = (re, name) => {
    const m = text.match(re);
    if (!m) throw new Error('正文里找不到这个数：' + name);
    return Number(m[1].replace(/,/g, ''));
  };
  const stations = num(/一轮\s*(\d+)\s*站/, '站数');
  const perExam = num(/每站\s*(\d+)\s*次出科考/, '每站考核次数');
  const statedExams = num(/共\s*(\d+)\s*次/, '考核总次数');
  const perChecklist = num(/平均\s*(\d+)\s*项勾选/, '每份清单勾选数');
  const statedChecks = num(/六份合计\s*(\d+)\s*个勾选/, '勾选总数');
  const statedColumns = num(/六例合计\s*(\d+)\s*栏/, '复盘总栏数');
  const perCase = num(/每例至少能带出\s*(\d+)\s*条/, '每例可迁移判断');
  const statedTransfer = num(/全轮约\s*(\d+)\s*条/, '全轮可迁移判断');
  const columnsPerCase = 6;
  const exams = stations * perExam;
  const checks = perChecklist * exams;
  const columns = columnsPerCase * exams;
  const transfer = perCase * exams;
  return {
    stations, perExam, exams, perChecklist, checks, columnsPerCase, columns, perCase, transfer,
    stated: { exams: statedExams, checks: statedChecks, columns: statedColumns, transfer: statedTransfer },
    consistent: exams === statedExams && checks === statedChecks
      && columns === statedColumns && transfer === statedTransfer
  };
}

/** 本章可数的结构：三层能力、六栏、六个评价维度、三种迁移、五条失效 */
function structure(text) {
  const lines = text.split(/\r?\n/);
  const rows = tableBlocks(lines).map((b) => dataRows(b).length);
  return {
    layers: rows[0],
    reviewColumns: rows[1],
    evalDims: rows[2],
    transfers: (sectionText(text, '六站之间').match(/\*\*第[一二三四]种，/g) || []).length,
    failures: (sectionText(text, '五种失效模式').match(/\*\*其[一二三四五六七八九]，/g) || []).length
  };
}

/** 复盘六栏完整性：返回命中的栏名 */
function reviewItems(sentence) {
  const t = String(sentence || '');
  return REVIEW_ITEMS.filter((x) => x.re.test(t)).map((x) => x.name);
}

/** 第六栏的分量：X（先做什么）／Y（因为什么）／Z（代价是什么） */
function sixthColumn(sentence) {
  const t = String(sentence || '');
  const parts = [];
  if (/(我会先|先做|先问|先复测|先核对)/.test(t)) parts.push('X');
  if (/因为/.test(t)) parts.push('Y');
  if (/代价/.test(t)) parts.push('Z');
  return parts;
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
    reviews: REVIEW_SAMPLES.map((s) => ({ ...s, items: reviewItems(s.text), sixth: sixthColumn(s.text) }))
  };
}

function main() {
  const r = report();
  const m = r.math;
  const s = r.structure;
  console.log(`护理临床轮转 · 第 ${r.chapter} 章 ${r.title}`);
  console.log(`正文: chapters/${SLUG}/docs/zh.md`);
  console.log('');
  console.log(`规模: 汉字 ${r.size.hanzi.toLocaleString('en-US')} · 节 ${r.size.sections} · 表格 ${r.size.tables} 张（数据行 ${r.size.rows}）`);
  console.log('');
  console.log('出科考核算术:');
  console.log(`  ${m.stations} 站 × 每站 ${m.perExam} 次 = ${m.exams} 次出科考`);
  console.log(`  只交操作清单：每份 ${m.perChecklist} 项 × ${m.exams} 次 = ${m.checks} 个勾选，可迁移判断 0 条`);
  console.log(`  改为一例复盘：每例 ${m.columnsPerCase} 栏 × ${m.exams} 例 = ${m.columns} 栏；每例至少 ${m.perCase} 条 → 全轮约 ${m.transfer} 条`);
  console.log(`  对账: 正文写出的 ${m.stated.exams}/${m.stated.checks}/${m.stated.columns}/${m.stated.transfer} 与重算${m.consistent ? '一致' : '不一致'}`);
  console.log(`  读法: 同样的 ${m.exams} 次机会，勾选记录的是「做过」，复盘记录的是「会判断」。`);
  console.log('');
  console.log(`结构: 能力 ${s.layers} 层 · 复盘 ${s.reviewColumns} 栏 · 评价维度 ${s.evalDims} 个 · 迁移形态 ${s.transfers} 种 · 失效模式 ${s.failures} 条`);
  console.log('');
  console.log('复盘样例（六栏逐条核对，第六栏 X/Y/Z）:');
  for (const x of r.reviews) {
    const ok = x.items.length === 6 && x.sixth.length === 3;
    console.log(`  ${ok ? '✅' : '❌'} 栏 ${x.items.length}/6 · 第六栏 ${x.sixth.join('') || '—'} ← ${x.text.slice(0, 30)}…　〔${x.note}〕`);
    if (x.items.length < 6) console.log(`      缺: ${REVIEW_ITEMS.map((i) => i.name).filter((n) => !x.items.includes(n)).join('、')}`);
  }
  console.log('');
  console.log(`结论: ${r.reviews.length} 份复盘里 ${r.reviews.filter((x) => x.items.length === 6).length} 份六栏齐；第六栏缺了代价，那条经验下一次就调用不出来。`);
  console.log('边界声明: 本输出为教学样例，数字由本章正文现算，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = {
  readDoc, hanzi, sectionTitles, sectionText, tableBlocks, dataRows,
  problem, structure, reviewItems, sixthColumn, REVIEW_ITEMS, REVIEW_SAMPLES,
  report, CHAPTER, SLUG, TITLE
};
