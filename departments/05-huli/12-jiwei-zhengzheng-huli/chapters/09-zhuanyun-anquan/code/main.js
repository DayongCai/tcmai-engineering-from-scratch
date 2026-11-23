#!/usr/bin/env node
/**
 * 急危重症护理学 · 第 9 章 转运是一次可控的病情恶化，不是一段路程：正文判断卡
 * 课程: departments/05-huli/12-jiwei-zhengzheng-huli/chapters/09-zhuanyun-anquan/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：汉字数、节与小节、表格与数据行、易损段、分级、特殊人群与失效模式，
 * 都从本章正文读出；三次交接的信息保真按连乘逐次算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '9';
const SLUG = '09-zhuanyun-anquan';
const TITLE = '转运是一次可控的病情恶化，不是一段路程';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const EOL = /\r?\n/;
const KEEP_PER_HANDOFF = 0.8;
const HANDOFFS = 3;

const SAMPLES = [
  { text: '氧量预计可用四十分钟，行程预计十五分钟', note: '写可用时长' },
  { text: '氧气充足，路上尚平稳', note: '结论代替时刻' },
  { text: '途中血氧降至八十八，加大氧流量后回升至九十四，用时两分钟', note: '事件加处理' },
  { text: '气管刚建立，分泌物多，随时可能堵；接下来两小时盯血氧与吸引', note: '四句交接含风险' },
  { text: '已交接，接收方清楚', note: '无复诵与签字' },
];

const OK_OXY = /(预计可用|可用[^，。；]{0,6}(分钟|小时)|够用[^，。；]{0,6}(分钟|小时))/;
const CONCLUSION = /(充足|尚平稳|已交接|清楚|病情稳定|一切正常)/;
const EVENT = /(降至|降至|回升|处理|加大氧流量|停靠)/;

function readDoc() { return fs.readFileSync(DOC, 'utf8'); }
function hanzi(text) { return (text.match(/[\u4e00-\u9fff]/g) || []).length; }

function countHeadings(text, prefix) {
  return text.split(EOL).filter((line) => line.startsWith(prefix) && !line.startsWith(prefix + '#')).length;
}

function tableBlocks(lines) {
  const blocks = [];
  let cur = null;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('|')) {
      if (!cur) { cur = []; blocks.push(cur); }
      cur.push(t);
    } else { cur = null; }
  }
  return blocks;
}

function dataRows(block) {
  return block.filter((l) => !/^\|[\s:\-|]+\|$/.test(l)).slice(1);
}

function sectionText(text, key) {
  const out = [];
  let on = false;
  for (const line of text.split(EOL)) {
    const m = /^##\s+(.*)$/.exec(line);
    if (m) { on = m[1].includes(key); continue; }
    if (on) out.push(line);
  }
  return out.join('\n');
}

function blockOf(text, key) {
  return text.split(/\n(?=## )/).find((c) => c.includes(key)) || '';
}

/** 三个易损段：正文加粗的移动、途中、交接 */
function vulnerableSegments(text) {
  return ['**第一段是移动', '**第二段是途中', '**第三段是交接', '**第四段是']
    .filter((k) => text.includes(k)).length;
}

/** 四类特殊人群：正文加粗的老年、孕产、儿童、精神与认知障碍 */
function specialGroups(text) {
  return ['**老年', '**孕产', '**儿童', '**精神与认知障碍'].filter((k) => text.includes(k));
}

/** 分级表：表头含「随行」的那张 */
function gradeRows(lines) {
  let n = 0;
  for (const b of tableBlocks(lines)) {
    if (b[0].includes('随行')) n += dataRows(b).length;
  }
  return n;
}

/** 若干次交接后仍保住信息的比例 */
function retention(perHandoff, times) {
  return Math.pow(perHandoff, times);
}

function classify(text) {
  if (OK_OXY.test(text) || (EVENT.test(text) && /(分钟|时)/.test(text))) return '可判断';
  if (CONCLUSION.test(text)) return '结论式';
  return '缺项';
}

function report() {
  const text = readDoc();
  const lines = text.split(EOL);
  const blocks = tableBlocks(lines);
  const rows = blocks.reduce((n, b) => n + dataRows(b).length, 0);

  const size = {
    hanzi: hanzi(text),
    sections: countHeadings(text, '## '),
    subsections: countHeadings(text, '### '),
    tables: blocks.length,
    rows,
  };

  const modes = (sectionText(text, '失效模式').match(/失效模式[一二三四五六七八九]/g) || []).length;
  const samples = SAMPLES.map((s) => ({ ...s, kind: classify(s.text) }));

  return {
    chapter: CHAPTER,
    title: TITLE,
    size,
    modes,
    segments: vulnerableSegments(text),
    grades: gradeRows(lines),
    groups: specialGroups(text),
    keep: retention(KEEP_PER_HANDOFF, HANDOFFS),
    samples,
    ok: samples.filter((s) => s.kind === '可判断').length,
  };
}

function main() {
  const r = report();
  console.log(`急危重症护理学 · 第 ${r.chapter} 章 ${r.title}`);
  console.log(`正文: chapters/${SLUG}/docs/zh.md`);
  console.log('');
  console.log(`规模: 汉字 ${r.size.hanzi.toLocaleString('en-US')} · 节 ${r.size.sections} · 小节 ${r.size.subsections} · 表格 ${r.size.tables} 张（数据行 ${r.size.rows}）`);
  console.log(`易损段 ${r.segments} 段；分级 ${r.grades} 级；特殊人群 ${r.groups.length} 类 → ${r.groups.map((g) => g.replace(/\*/g, '')).join('、')}；失效模式 ${r.modes} 条`);
  console.log('');
  console.log(`演算: 每次交接保住 ${(KEEP_PER_HANDOFF * 100).toFixed(0)}%，三次连乘 ${KEEP_PER_HANDOFF}³ ＝ ${r.keep.toFixed(3)}，约 ${(r.keep * 100).toFixed(0)}%。`);
  console.log('  → 一半的信息在二十分钟里蒸发；漏掉的那一半，往往正是接手方最需要的「为什么」。');
  console.log('');
  console.log('样例交接（规则逐条判定）:');
  for (const s of r.samples) {
    const mark = s.kind === '可判断' ? '✅' : '❌';
    console.log(`  ${mark} ${s.kind.padEnd(4)} ← ${s.text}　〔${s.note}〕`);
  }
  console.log('');
  console.log(`结论: ${r.samples.length} 条例句里 ${r.ok} 条能直接判断；只写「氧气充足」「路上尚平稳」的交接，接手方只能照做，不能判断。`);
  console.log('边界声明: 本输出为教学样例，数字由本章正文现算，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, hanzi, countHeadings, tableBlocks, dataRows, sectionText, blockOf, vulnerableSegments, specialGroups, gradeRows, retention, classify, report, SAMPLES, KEEP_PER_HANDOFF, HANDOFFS, CHAPTER, SLUG, TITLE };
