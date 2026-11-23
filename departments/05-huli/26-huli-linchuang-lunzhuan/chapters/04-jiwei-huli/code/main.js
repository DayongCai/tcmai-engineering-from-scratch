#!/usr/bin/env node
/**
 * 护理临床轮转 · 第 4 章 急危重症轮转先学排序：谁先看，比看得多快更重要：正文判断卡
 * 课程: departments/05-huli/26-huli-linchuang-lunzhuan/chapters/04-jiwei-huli/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：汉字数、节数、表格与数据行、四级分诊、五个信号、呼叫四段、
 * 记录三特点、考核五项与失效五条，以及开篇「40 人次按到达顺序排队 → 平均等 20 位 →
 * 最重的那一位前面还有 19 位」的算术，都由本脚本从正文读出并与正文写出的结果对账。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '4';
const SLUG = '04-jiwei-huli';
const TITLE = '急危重症轮转先学排序：谁先看，比看得多快更重要';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

// 记录样例取自本章「结论少、事实多」的对照写法。
const NOTE_SAMPLES = [
  { text: '病情稳定', note: '结论式，无法复核' },
  { text: '某时点：呼吸平稳、能完整说话、面色正常、无新发疼痛', note: '事实式，可复核' },
  { text: '患者不配合', note: '结论式，写丢了需要查的原因' },
  { text: '14:20 呼吸费力，需坐起，口唇发绀', note: '事实式，带时点' }
];

// 呼叫样例取自本章的四段格式与最常见的残缺形态。
const CALL_SAMPLES = [
  { text: '我是实习生小周，在三床；病人现在呼吸费力、口唇发紫；已给氧、已取监护仪；需要值班医生马上到，带吸引器', note: '四段齐' },
  { text: '三床不行了，快来人', note: '只有位置，其余三段都缺' }
];

const CALL_PARTS = [
  { name: '我是谁、在哪里', re: /(我是|我们|床|抢救室|分诊区|观察区)/ },
  { name: '现在是什么情况', re: /(呼吸|意识|面色|出血|疼痛|发绀|抽搐|情况)/ },
  { name: '我已经做了什么', re: /(已给|已经给|已取|已做|监测|按压|吸氧)/ },
  { name: '我需要什么', re: /(需要|请|马上到|尽快|带|多久)/ }
];

const HANDOVER_FAILURES = ['只交诊断不交变化', '只交处置不交反应', '只交结果不交待办'];

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

/** 开篇算术：按到达顺序处理时的平均等待位次，与最重者排在第 n 位时前面的人数 */
function problem(text) {
  const num = (re, name) => {
    const m = text.match(re);
    if (!m) throw new Error('正文里找不到这个数：' + name);
    return Number(m[1].replace(/,/g, ''));
  };
  const arrivals = num(/接诊\s*(\d+)\s*人次/, '接诊人次');
  const statedAverage = num(/平均每个人要等前面\s*(\d+)\s*个人/, '平均等待人数');
  const statedAhead = num(/他前面有\s*(\d+)\s*人次/, '最重者前面的人次');
  const statedSorted = num(/前面可能只有\s*(\d+)\s*位/, '排序后前面的人数');
  const averageWait = arrivals / 2;
  const worstAhead = averageWait - 1;
  return {
    arrivals, averageWait, worstAhead, sortedAhead: statedSorted,
    stated: { averageWait: statedAverage, worstAhead: statedAhead },
    consistent: averageWait === statedAverage && worstAhead === statedAhead
  };
}

/** 本章可数的结构：四级、五个信号、呼叫四段、记录三特点、交接三形态、考核五项、失效五条 */
function structure(text) {
  const lines = text.split(/\r?\n/);
  const rows = tableBlocks(lines).map((b) => dataRows(b).length);
  const numbered = (key) => (sectionText(text, key).match(/^\d+\.\s/gm) || []).length;
  return {
    triageLevels: rows[0],
    signals: numbered('优先级'),
    callParts: (sectionText(text, '团队与呼叫').match(/^-\s+\*\*/gm) || []).length,
    recordTraits: (sectionText(text, '记录与交接').match(/\*\*其[一二三四五]，/g) || []).length,
    handoverFailures: HANDOVER_FAILURES.filter((k) => text.includes(k)).length,
    examItems: numbered('出科考核项'),
    failures: (sectionText(text, '出科考核项与五种失效模式').match(/\*\*其[一二三四五六七八九]，/g) || []).length
  };
}

const CONCLUSION = /(病情稳定|稳定|好转|不配合|一般情况可|无特殊|尚可)/;
const FACT = /(\d{1,2}[:：]\d{2}|时点|呼吸平稳|能完整说话|无新发疼痛|呼吸费力|口唇发绀|面色正常)/;

/** 记录属于结论式还是事实式：急诊记录不写结论，写可复核的事实 */
function noteKind(sentence) {
  const t = String(sentence || '');
  if (FACT.test(t) && !CONCLUSION.test(t)) return '事实式';
  if (CONCLUSION.test(t)) return '结论式';
  return '未归类';
}

/** 四段式呼叫：返回命中的段 */
function callParts(sentence) {
  const t = String(sentence || '');
  return CALL_PARTS.filter((p) => p.re.test(t)).map((p) => p.name);
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
    notes: NOTE_SAMPLES.map((s) => ({ ...s, kind: noteKind(s.text) })),
    calls: CALL_SAMPLES.map((s) => ({ ...s, parts: callParts(s.text) }))
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
  console.log('排序算术:');
  console.log(`  ${m.arrivals} 人次按到达顺序处理，平均每人要等前面 ${m.averageWait} 位（${m.arrivals} ÷ 2 = ${m.averageWait}）`);
  console.log(`  最重的那一位排在第 ${m.averageWait} 位时，前面有 ${m.worstAhead} 人次（${m.averageWait} − 1 = ${m.worstAhead}）`);
  console.log(`  换成分级排序后，最重者的前面可能只有 ${m.sortedAhead} 位`);
  console.log(`  对账: 正文写出的 ${m.stated.averageWait}/${m.stated.worstAhead} 与重算${m.consistent ? '一致' : '不一致'}`);
  console.log(`  读法: 排序不是效率问题，是这位病人能不能等到的问题。`);
  console.log('');
  console.log(`结构: 四级分诊 ${s.triageLevels} 级 · 必须立即报告的信号 ${s.signals} 个 · 呼叫 ${s.callParts} 段 · 记录特点 ${s.recordTraits} 条 · 交接失败形态 ${s.handoverFailures} 种 · 考核 ${s.examItems} 项 · 失效模式 ${s.failures} 条`);
  console.log('');
  console.log('记录样例（结论式／事实式逐条判定）:');
  for (const x of r.notes) {
    const ok = x.kind === '事实式';
    console.log(`  ${ok ? '✅' : '❌'} ${x.kind} ← ${x.text}　〔${x.note}〕`);
  }
  console.log('');
  console.log('呼叫样例（四段逐条核对）:');
  for (const x of r.calls) {
    console.log(`  ${x.parts.length === 4 ? '✅' : '❌'} ${x.parts.length}/4 段 ← ${x.text}　〔${x.note}〕`);
    if (x.parts.length < 4) console.log(`      缺: ${CALL_PARTS.map((p) => p.name).filter((n) => !x.parts.includes(n)).join('、')}`);
  }
  console.log('');
  console.log(`结论: ${r.notes.length} 条记录里 ${r.notes.filter((x) => x.kind === '事实式').length} 条可复核；${r.calls.length} 次呼叫里 ${r.calls.filter((x) => x.parts.length === 4).length} 次四段齐。省掉第四段，对方来了还要在病人床边再问一遍。`);
  console.log('边界声明: 本输出为教学样例，数字由本章正文现算，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = {
  readDoc, hanzi, sectionTitles, sectionText, tableBlocks, dataRows,
  problem, structure, noteKind, callParts, CALL_PARTS, HANDOVER_FAILURES,
  report, NOTE_SAMPLES, CALL_SAMPLES, CHAPTER, SLUG, TITLE
};
