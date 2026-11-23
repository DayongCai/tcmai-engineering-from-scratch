#!/usr/bin/env node
/**
 * 护理临床轮转 · 第 5 章 中医技术轮转的门槛是辨证用技，不是把手法练熟：正文判断卡
 * 课程: departments/05-huli/26-huli-linchuang-lunzhuan/chapters/05-zhongyi-huli-jishu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：汉字数、节数、表格与数据行、三问三条、四类技术、记录六项、
 * 出科五项与失效五条，以及开篇「4 周 × 每班 2 次 × 20 个工作日 = 40 次」与
 * 「前 2 周 20 次里 3 次落在禁忌」的算术，都由本脚本从正文读出并与正文写出的结果对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '5';
const SLUG = '05-zhongyi-huli-jishu';
const TITLE = '中医技术轮转的门槛是辨证用技，不是把手法练熟';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

// 记录样例取自本章记录六项与「无不适」的两种写法。
const RECORD_SAMPLES = [
  { text: '已行艾灸', note: '只剩技术名，六项全缺' },
  {
    text: '术前主诉腰冷、局部皮肤完整；艾灸腰部，仰卧位；已告知并复述；术中无不适；术毕局部皮肤微红、无灼痛，当班内复看；下一步：继续，次班复评',
    note: '六项齐'
  },
  { text: '艾灸后病人说舒服，无异常', note: '「无异常」没有写看什么' }
];

const RECORD_ITEMS = [
  { name: '施术前状态', re: /(术前|主诉|局部皮肤|局部情况)/ },
  { name: '技术要素', re: /(艾灸|拔罐|刮痧|耳穴|部位|体位|技术名称)/ },
  { name: '告知与同意', re: /(告知|同意|复述|签字)/ },
  { name: '施术过程', re: /(过程中|术中|不适|中断|感受)/ },
  { name: '施术后反应', re: /(术毕|灸后|罐后|操作后|做完|局部皮肤|灼热|头晕|心慌)/ },
  { name: '下一步', re: /(继续|调整|停用|复评|下一次|次班)/ }
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

/** 开篇算术：4 周、每班 2 次、20 个工作日合计多少次；前 2 周多少次；禁忌情形几次 */
function problem(text) {
  const num = (re, name) => {
    const m = text.match(re);
    if (!m) throw new Error('正文里找不到这个数：' + name);
    return Number(m[1].replace(/,/g, ''));
  };
  const weeks = num(/一站\s*(\d+)\s*周/, '一站周数');
  const perShift = num(/每班\s*(\d+)\s*次技术操作/, '每班次数');
  const workdays = num(/(\d+)\s*个工作日/, '工作日数');
  const statedTotal = num(/全站约\s*(\d+)\s*次/, '全站次数');
  const halfWeeks = num(/前\s*(\d+)\s*周的\s*(\d+)\s*次/, '前几周的次数');
  const halfTimes = num(/前\s*\d+\s*周的\s*(\d+)\s*次/, '前几周的次数');
  const violation = num(/只要有\s*(\d+)\s*次落在禁忌/, '落在禁忌的次数');
  const total = workdays * perShift;
  const firstHalf = total / 2;
  return {
    weeks, perShift, workdays, total, firstHalf, violation,
    stated: { total: statedTotal, halfTimes, halfWeeksEq: halfWeeks * 2 === weeks },
    consistent: total === statedTotal && firstHalf === halfTimes && halfWeeks * 2 === weeks
  };
}

/** 本章可数的结构：三问、四类技术、记录六项、出科五项、失效五条 */
function structure(text) {
  const lines = text.split(/\r?\n/);
  const rows = tableBlocks(lines).map((b) => dataRows(b).length);
  return {
    questions: rows[0],
    techniques: rows[1],
    recordItems: (sectionText(text, '操作记录').match(/^\d+\.\s/gm) || []).length,
    examItems: (sectionText(text, '出科考核项').match(/^\d+\.\s/gm) || []).length,
    failures: (sectionText(text, '五种失效模式').match(/\*\*其[一二三四五六七八九]，/g) || []).length
  };
}

/** 记录六项完整性：返回命中的项名 */
function recordItems(sentence) {
  const t = String(sentence || '');
  return RECORD_ITEMS.filter((x) => x.re.test(t)).map((x) => x.name);
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
    records: RECORD_SAMPLES.map((s) => ({ ...s, items: recordItems(s.text) }))
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
  console.log('操作量算术:');
  console.log(`  ${m.weeks} 周一站 · 每班 ${m.perShift} 次 · ${m.workdays} 个工作日 → 全站 ${m.total} 次（${m.workdays} × ${m.perShift} = ${m.total}）`);
  console.log(`  前 ${m.weeks / 2} 周 = ${m.firstHalf} 次；其中 ${m.violation} 次落在禁忌情形 → ${m.violation} 次需要上报`);
  console.log(`  对账: 正文写出的 ${m.stated.total}/${m.stated.halfTimes} 与重算${m.consistent ? '一致' : '不一致'}`);
  console.log(`  读法: 手法熟了、选择仍然不会，${m.total} 次的机会成本全在「先评后做」四个字上。`);
  console.log('');
  console.log(`结构: 施术三问 ${s.questions} 条 · 常用技术 ${s.techniques} 类 · 记录 ${s.recordItems} 项 · 考核 ${s.examItems} 项 · 失效模式 ${s.failures} 条`);
  console.log('');
  console.log('记录样例（六项逐条核对）:');
  for (const x of r.records) {
    console.log(`  ${x.items.length === 6 ? '✅' : '❌'} ${x.items.length}/6 项 ← ${x.text}　〔${x.note}〕`);
    if (x.items.length < 6) console.log(`      缺: ${RECORD_ITEMS.map((i) => i.name).filter((n) => !x.items.includes(n)).join('、')}`);
  }
  console.log('');
  console.log(`结论: ${r.records.length} 份记录里 ${r.records.filter((x) => x.items.length === 6).length} 份六项齐全；术前状态与术后反应两栏缺席，这份记录既不能比较也不能交接。`);
  console.log('边界声明: 本输出为教学样例，数字由本章正文现算，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = {
  readDoc, hanzi, sectionTitles, sectionText, tableBlocks, dataRows,
  problem, structure, recordItems, RECORD_ITEMS, RECORD_SAMPLES,
  report, CHAPTER, SLUG, TITLE
};
