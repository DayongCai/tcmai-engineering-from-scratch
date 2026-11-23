#!/usr/bin/env node
/**
 * 护理临床轮转 · 第 2 章 外科轮转的核心在术前那一天与术后那几个窗口：正文判断卡
 * 课程: departments/05-huli/26-huli-linchuang-lunzhuan/chapters/02-waike-huli/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：汉字数、节数、表格与数据行、三段／四类准备／四个窗口的条数、
 * 以及开篇那串「住院天数 = 术前 + 术后」与「漏 1 项 × 术后 4 天 = 4 次额外核对」的算术，
 * 都由本脚本从正文读出并与正文写出的结果对账。改正文后重跑即可复现。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '2';
const SLUG = '02-waike-huli';
const TITLE = '外科轮转的核心在术前那一天与术后那几个窗口';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

// 疼痛记录样例取自本章正文关于「疼痛最容易写坏」的两种形态与三段写法。
const PAIN_SAMPLES = [
  { text: '疼痛可忍', note: '评价代替观察，没有依据' },
  { text: '疼痛评分 3 分', note: '只有分数，没有情形' },
  { text: '翻身时切口处疼，静卧可缓解，昨夜起持续约十分钟', note: '三段齐' },
  { text: '昨晚开始疼，今晨加重', note: '有时点无动作，仍不可用' }
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

/** 开篇算术：住院天数拆成术前与术后；漏一项会在术后每一天多补一次核对 */
function problem(text) {
  const num = (re, name) => {
    const m = text.match(re);
    if (!m) throw new Error('正文里找不到这个数：' + name);
    return Number(m[1].replace(/,/g, ''));
  };
  const stayDays = num(/住院\s*(\d+)\s*天/, '住院天数');
  const preDays = num(/术前\s*(\d+)\s*天/, '术前天数');
  const postDays = num(/术后\s*(\d+)\s*天/, '术后天数');
  const missed = num(/(\d+)\s*项\s*×\s*\d+\s*天\s*=\s*\d+\s*次/, '漏掉的项数');
  const statedExtra = num(/\d+\s*项\s*×\s*(\d+)\s*天\s*=\s*\d+\s*次/, '重复的术后天数');
  const statedTimes = num(/\d+\s*项\s*×\s*\d+\s*天\s*=\s*(\d+)\s*次/, '额外核对次数');
  const extraChecks = missed * postDays;
  return {
    stayDays, preDays, postDays, missed, extraChecks,
    stated: { stayDaysSplit: preDays + postDays, extraChecks: statedTimes, postDays: statedExtra },
    consistent: stayDays === preDays + postDays && extraChecks === statedTimes && statedExtra === postDays
  };
}

/** 本章可数的结构：三段性质、术前四类、术后四窗、三个断点、考核五项、失效五条 */
function structure(text) {
  const lines = text.split(/\r?\n/);
  const rows = tableBlocks(lines).map((b) => dataRows(b).length);
  const numbered = (key) => (sectionText(text, key).match(/^\d+\.\s/gm) || []).length;
  const boundaries = ['手术室与病房之间', '班次之间', '出院与社区之间'];
  return {
    phases: rows[0],
    prepCategories: rows[1],
    windows: rows[2],
    boundaries: boundaries.filter((b) => text.includes(b)).length,
    examItems: numbered('出科考核项'),
    failures: (sectionText(text, '出科考核项与五种失效模式').match(/\*\*其[一二三四五六七八九]，/g) || []).length
  };
}

const PAIN_TIME = /(晨|夜|昨|今|术后第|持续|分钟|小时|开始)/;
const PAIN_ACTION = /(翻身|咳|下床|活动|行走|坐起|按压|进食|更换体位|咳痰)/;
const PAIN_RELIEF = /(缓解|减轻|静卧|热敷|止痛后|消失|可减)/;
const PAIN_EVAL = /(可忍|尚可|能耐受|还好)/;

/**
 * 疼痛记录的三段判定：什么时候疼、做什么的时候疼、什么情况下减轻。
 * kind：三段齐 / 缺动作 / 只有分数 / 评价式 / 不全
 */
function painNote(sentence) {
  const t = String(sentence || '');
  const parts = [];
  if (PAIN_TIME.test(t)) parts.push('时点');
  if (PAIN_ACTION.test(t)) parts.push('动作');
  if (PAIN_RELIEF.test(t)) parts.push('减轻');
  let kind;
  if (PAIN_EVAL.test(t) && !PAIN_ACTION.test(t)) kind = '评价式';
  else if (/\d+\s*分/.test(t) && !PAIN_ACTION.test(t)) kind = '只有分数';
  else if (parts.length === 3) kind = '三段齐';
  else if (!PAIN_ACTION.test(t)) kind = '缺动作';
  else kind = '不全';
  return { parts, kind };
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
    pain: PAIN_SAMPLES.map((s) => ({ ...s, ...painNote(s.text) }))
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
  console.log('术前术后算术:');
  console.log(`  住院 ${m.stayDays} 天 = 术前 ${m.preDays} 天 + 术后 ${m.postDays} 天`);
  console.log(`  漏 ${m.missed} 项 × 术后 ${m.postDays} 天 = ${m.extraChecks} 次计划外的额外核对`);
  console.log(`  对账: 正文写出的拆分与次数（${m.stated.stayDaysSplit}/${m.stated.extraChecks}）与重算${m.consistent ? '一致' : '不一致'}`);
  console.log(`  读法: 术前少做一项，这项准备不会消失，它变成术后每天多补一次、且靠临时想起来。`);
  console.log('');
  const s = r.structure;
  console.log(`结构: 三段性质 ${s.phases} 行 · 术前准备 ${s.prepCategories} 类 · 术后窗口 ${s.windows} 个 · 交接断点 ${s.boundaries} 处 · 考核 ${s.examItems} 项 · 失效模式 ${s.failures} 条`);
  console.log('');
  console.log('疼痛记录样例（三段规则逐条判定）:');
  for (const p of r.pain) {
    const ok = p.kind === '三段齐';
    console.log(`  ${ok ? '✅' : '❌'} ${p.kind.padEnd(4)} 段数 ${p.parts.length}/3 ← ${p.text}　〔${p.note}〕`);
  }
  const ok = r.pain.filter((p) => p.kind === '三段齐').length;
  console.log('');
  console.log(`结论: ${r.pain.length} 条记录里 ${ok} 条三段齐全，可被下一班使用；「可忍」是评价、「3 分」只是一半，两者都不能直接交接。`);
  console.log('边界声明: 本输出为教学样例，数字由本章正文现算，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = {
  readDoc, hanzi, sectionTitles, sectionText, tableBlocks, dataRows,
  problem, structure, painNote, report, PAIN_SAMPLES, CHAPTER, SLUG, TITLE
};
