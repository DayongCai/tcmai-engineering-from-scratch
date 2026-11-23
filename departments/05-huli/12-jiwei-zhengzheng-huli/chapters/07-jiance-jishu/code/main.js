#!/usr/bin/env node
/**
 * 急危重症护理学 · 第 7 章 监护仪给的是数，护士要给的是趋势：正文判断卡
 * 课程: departments/05-huli/12-jiwei-zhengzheng-huli/chapters/07-jiance-jishu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：汉字数、节与小节、表格与数据行、五条监测线、失效模式，
 * 都从本章正文读出；记录覆盖率与相邻两次的差值按采样序列现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '7';
const SLUG = '07-jiance-jishu';
const TITLE = '监护仪给的是数，护士要给的是趋势';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const EOL = /\r?\n/;
const SAMPLES_PER_MIN = 1;
const MINUTES_PER_SHIFT = 480;
const RECORDS_PER_SHIFT = 6;

// 正文举的对照：三个数都没越线，但方向是坏的。
const SERIES = [
  { t: '十四时', sbp: 125, hr: 92 },
  { t: '十五时', sbp: 118, hr: 98 },
  { t: '十六时', sbp: 110, hr: 105 },
];

const SAMPLES = [
  { text: '十六时血压一百一（较两小时前降十八），心率一百零五', note: '写差值' },
  { text: '血压一百一，正常', note: '只写绝对值' },
  { text: '已通知医师', note: '只有动作，无复评' },
  { text: '十六时尿量每小时十五毫升，较前两小时逐降', note: '趋势加差值' },
  { text: '监护仪未报警，病情稳定', note: '把不响当稳定' },
];

const CONCLUSION = /(正常|稳定|无异常|一般情况可)/;
const DELTA = /(较前|差值|降|升|逐降|逐升|回落)/;
const VALUE = /(血压|心率|血氧|尿量|呼吸|体温)[^，。；]{0,10}[零一二三四五六七八九十百千\d]/;

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

/** 一个班次内监护仪的采样总数 */
function samplesPerShift(minutes, perMin = SAMPLES_PER_MIN) {
  return minutes * perMin;
}

/** 记录只留下其中几个点：覆盖率 */
function coverage(records, minutes, perMin = SAMPLES_PER_MIN) {
  return records / samplesPerShift(minutes, perMin);
}

/** 相邻两次的差值序列 */
function deltas(series) {
  const out = [];
  for (let i = 1; i < series.length; i += 1) {
    out.push({
      from: series[i - 1].t,
      to: series[i].t,
      sbp: series[i].sbp - series[i - 1].sbp,
      hr: series[i].hr - series[i - 1].hr,
    });
  }
  return out;
}

/** 数值都在参考范围内，方向却在变坏 */
function silentDrift(series) {
  const d = deltas(series);
  const falling = d.every((x) => x.sbp < 0);
  const rising = d.every((x) => x.hr > 0);
  return { falling, rising, drift: falling && rising };
}

function classify(text) {
  if (CONCLUSION.test(text) && !DELTA.test(text)) return '结论式';
  if (VALUE.test(text) && DELTA.test(text)) return '带差值';
  return '单点式';
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
  let linesMonitored = 0;
  for (const b of blocks) {
    if (b[0].includes('监测线')) linesMonitored += dataRows(b).length;
  }

  const samples = SAMPLES.map((s) => ({ ...s, kind: classify(s.text) }));

  return {
    chapter: CHAPTER,
    title: TITLE,
    size,
    modes,
    linesMonitored,
    perShift: samplesPerShift(MINUTES_PER_SHIFT),
    coverage: coverage(RECORDS_PER_SHIFT, MINUTES_PER_SHIFT),
    series: SERIES,
    deltas: deltas(SERIES),
    drift: silentDrift(SERIES),
    samples,
    ok: samples.filter((s) => s.kind === '带差值').length,
  };
}

function main() {
  const r = report();
  console.log(`急危重症护理学 · 第 ${r.chapter} 章 ${r.title}`);
  console.log(`正文: chapters/${SLUG}/docs/zh.md`);
  console.log('');
  console.log(`规模: 汉字 ${r.size.hanzi.toLocaleString('en-US')} · 节 ${r.size.sections} · 小节 ${r.size.subsections} · 表格 ${r.size.tables} 张（数据行 ${r.size.rows}）`);
  console.log(`监测线 ${r.linesMonitored} 条；失效模式 ${r.modes} 条`);
  console.log('');
  console.log(`采样: 每分钟一次，八小时 ${r.perShift} 个数；记录六次，覆盖率 ${(r.coverage * 100).toFixed(2)}%。`);
  console.log('趋势（三个数都未越线，方向是坏的）:');
  for (const d of r.deltas) {
    console.log(`  ${d.from} → ${d.to}：收缩压 ${d.sbp > 0 ? '+' : ''}${d.sbp}，心率 ${d.hr > 0 ? '+' : ''}${d.hr}`);
  }
  console.log(`  → 压力在降 ${r.drift.falling ? '是' : '否'}，代偿在加快 ${r.drift.rising ? '是' : '否'}；最该报的时刻是斜率改变的时候，不是越线的时候。`);
  console.log('');
  console.log('样例记录（规则逐条判定）:');
  for (const s of r.samples) {
    const mark = s.kind === '带差值' ? '✅' : '❌';
    console.log(`  ${mark} ${s.kind.padEnd(4)} ← ${s.text}　〔${s.note}〕`);
  }
  console.log('');
  console.log(`结论: ${r.samples.length} 条例句里 ${r.ok} 条写了差值；只堆点不画线的记录，看不出「已经坏了四小时」。`);
  console.log('边界声明: 本输出为教学样例，数字由本章正文现算，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, hanzi, countHeadings, tableBlocks, dataRows, sectionText, blockOf, samplesPerShift, coverage, deltas, silentDrift, classify, report, SAMPLES, SERIES, CHAPTER, SLUG, TITLE };
