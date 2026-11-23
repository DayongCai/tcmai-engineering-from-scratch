#!/usr/bin/env node
/**
 * 急危重症护理学 · 第 4 章 呼吸急症先保氧合，病因留到气道通了再谈：正文判断卡
 * 课程: departments/05-huli/12-jiwei-zhengzheng-huli/chapters/04-huxishuai-tongqi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：汉字数、节与小节、表格与数据行、分层层数、界值项与失效模式，
 * 都从本章正文读出；有效肺泡通气按潮气量减死腔后逐组算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '4';
const SLUG = '04-huxishuai-tongqi';
const TITLE = '呼吸急症先保氧合，病因留到气道通了再谈';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const EOL = /\r?\n/;
const DEAD_SPACE = 150;

// 正文的对照算例：浅快与慢深，粗看前者多，扣掉死腔后反而少。
const CASES = [
  { label: '甲（浅快）', rate: 30, tidal: 300 },
  { label: '乙（慢深）', rate: 12, tidal: 600 },
];

const SAMPLES = [
  { text: '吸氧两升时血氧九十二，给氧后复测九十五，能连说八字', note: '条件加反应' },
  { text: '已给氧', note: '只写动作' },
  { text: '血氧九十二', note: '缺给氧条件' },
  { text: '呼吸三十四次，三凹征明显，未吸氧时血氧八十八', note: '条件加呼吸功' },
  { text: '呼吸三十四次降至二十二次，幅度变浅', note: '缺给氧条件' },
];

const SUMMARY = /(已给氧|呼吸困难加重|病情稳定|一般情况可|处理得当)/;
const CONDITION = /(吸氧|鼻导管|面罩|储氧|未吸氧)/;
const VALUE = /(血氧|呼吸|二氧化碳|氧分压|潮气)[^，。；]{0,8}[零一二三四五六七八九十百千\d]/;

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

/** 有效肺泡通气：(潮气量 − 死腔) × 频率 */
function alveolar(tidal, rate, dead = DEAD_SPACE) {
  return (tidal - dead) * rate;
}

/** 分钟通气量：潮气量 × 频率 */
function minuteVolume(tidal, rate) {
  return tidal * rate;
}

function classify(text) {
  if (SUMMARY.test(text)) return '结论式';
  if (CONDITION.test(text) && VALUE.test(text)) return '可解释';
  return '缺条件';
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

  const layers = ['**第一层，', '**第二层，', '**第三层，', '**第四层，', '**第五层，']
    .filter((k) => blockOf(text, '分层评估').includes(k)).length;
  const modes = (sectionText(text, '失效模式').match(/失效模式[一二三四五六七八九]/g) || []).length;

  let thresholdRows = 0;
  for (const b of blocks) {
    if (b[0].includes('教学参考界值')) thresholdRows += dataRows(b).length;
  }

  const cases = CASES.map((c) => ({
    ...c,
    mv: minuteVolume(c.tidal, c.rate),
    av: alveolar(c.tidal, c.rate),
  }));
  const samples = SAMPLES.map((s) => ({ ...s, kind: classify(s.text) }));

  return {
    chapter: CHAPTER,
    title: TITLE,
    size,
    layers,
    modes,
    thresholds: thresholdRows,
    cases,
    samples,
    ok: samples.filter((s) => s.kind === '可解释').length,
  };
}

function main() {
  const r = report();
  console.log(`急危重症护理学 · 第 ${r.chapter} 章 ${r.title}`);
  console.log(`正文: chapters/${SLUG}/docs/zh.md`);
  console.log('');
  console.log(`规模: 汉字 ${r.size.hanzi.toLocaleString('en-US')} · 节 ${r.size.sections} · 小节 ${r.size.subsections} · 表格 ${r.size.tables} 张（数据行 ${r.size.rows}）`);
  console.log(`分层: ${r.layers} 层；界值项 ${r.thresholds} 项；失效模式 ${r.modes} 条`);
  console.log('');
  console.log(`演算（死腔 ${DEAD_SPACE} 毫升）:`);
  for (const c of r.cases) {
    console.log(`  ${c.label}：${c.rate} 次 × ${c.tidal} 毫升 = 分钟通气 ${c.mv}；有效肺泡通气 ${c.av}。`);
  }
  console.log(`  → 粗看甲多 ${r.cases[0].mv - r.cases[1].mv}，扣掉死腔后甲反少 ${r.cases[1].av - r.cases[0].av}；按次数判呼吸好坏正好判反。`);
  console.log('');
  console.log('样例呼吸记录（规则逐条判定）:');
  for (const s of r.samples) {
    const mark = s.kind === '可解释' ? '✅' : '❌';
    console.log(`  ${mark} ${s.kind.padEnd(4)} ← ${s.text}　〔${s.note}〕`);
  }
  console.log('');
  console.log(`结论: ${r.samples.length} 条例句里 ${r.ok} 条同时写了给氧条件与数值；只写「已给氧」或孤零零一个读数，换了班就无法解释。`);
  console.log('边界声明: 本输出为教学样例，数字由本章正文现算，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, hanzi, countHeadings, tableBlocks, dataRows, sectionText, blockOf, alveolar, minuteVolume, classify, report, SAMPLES, CASES, DEAD_SPACE, CHAPTER, SLUG, TITLE };
