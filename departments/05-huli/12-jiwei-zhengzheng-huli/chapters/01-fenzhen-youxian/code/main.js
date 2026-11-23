#!/usr/bin/env node
/**
 * 急危重症护理学 · 第 1 章 分诊不是排队，是把有限的注意力按分钟重新分配：正文判断卡
 * 课程: departments/05-huli/12-jiwei-zhengzheng-huli/chapters/01-fenzhen-youxian/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：汉字数、节与小节、表格与数据行、分级级别数、升级条款数、
 * 失效模式条数，都从本章正文读出；候诊时间与分级样例由规则逐条跑出。
 * 改正文后重跑即可复现，不留手打数字。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '1';
const SLUG = '01-fenzhen-youxian';
const TITLE = '分诊不是排队，是把有限的注意力按分钟重新分配';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const EOL = /\r?\n/;

// 样例取自本章正文的写法示例，逐条过规则，看它能否被复核。
const SAMPLES = [
  { text: '十四时零三分到达，十四时零四分呼救，十四时零五分入抢救区，收缩压八十五，皮肤湿冷', note: '时刻加数值' },
  { text: '患者病情危重，已优先处理', note: '结论代替时刻' },
  { text: '血压一百一，稳定', note: '单次数无趋势' },
  { text: '较前次收缩压下降二十，皮肤由温转凉', note: '写变化' },
  { text: '十四时零三分到达，黄级，候诊区等待', note: '有时刻无生命体征' },
];

const CONCLUSION = /(病情危重|已优先处理|情况稳定|病情稳定|一般情况可|无明显异常|处理得当|已妥善安置)/;
const TREND = /(较前|较前次|变化|下降|上升|转凉|转冷|变浅|变快)/;
const TIME = /([零一二三四五六七八九十百千]+时[零一二三四五六七八九十]+分|\d{1,2}[:：]\d{2})/;
const VITAL = /(血压|收缩压|舒张压|血氧|心率|脉搏|呼吸|体温|尿量)[^，。；]{0,8}[零一二三四五六七八九十百千\d]/;

function readDoc() {
  return fs.readFileSync(DOC, 'utf8');
}

function hanzi(text) {
  return (text.match(/[\u4e00-\u9fff]/g) || []).length;
}

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
    } else {
      cur = null;
    }
  }
  return blocks;
}

function dataRows(block) {
  const body = block.filter((l) => !/^\|[\s:\-|]+\|$/.test(l));
  return body.slice(1);
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

/** 取包含某关键词的整节（含其下的小节） */
function blockOf(text, key) {
  return text.split(/\n(?=## )/).find((c) => c.includes(key)) || '';
}

/** 分级表：表头含「允许等待」的那张，返回级别与允许等待 */
function levelRows(lines) {
  const out = [];
  for (const b of tableBlocks(lines)) {
    const head = b[0].split('|').slice(1, -1).map((c) => c.trim());
    const wi = head.findIndex((c) => c.includes('允许等待'));
    if (wi < 0) continue;
    for (const row of dataRows(b)) {
      const cells = row.split('|').slice(1, -1).map((c) => c.trim());
      if (cells.length > wi) out.push({ level: cells[0], wait: cells[wi] });
    }
  }
  return out;
}

function classify(text) {
  if (CONCLUSION.test(text)) return '结论式';
  if (TIME.test(text) && VITAL.test(text)) return '可复算';
  if (TREND.test(text)) return '趋势式';
  return '单点式';
}

/** 候诊总时长：人数 × 每人分钟 */
function queueMinutes(people, minutesEach) {
  return people * minutesEach;
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

  const levels = levelRows(lines);
  const upgradeClauses = (sectionText(text, '判据与升级路径').match(/第[一二三四五六七八九十]，/g) || []).length;
  const modes = (sectionText(text, '失效模式').match(/失效模式[一二三四五六七八九]/g) || []).length;
  const layers = ['**第一层，', '**第二层，', '**第三层，', '**第四层，']
    .filter((k) => blockOf(text, '分层评估').includes(k)).length;

  const samples = SAMPLES.map((s) => ({ ...s, kind: classify(s.text) }));

  return {
    chapter: CHAPTER,
    title: TITLE,
    size,
    levels,
    upgradeClauses,
    modes,
    layers,
    queue: queueMinutes(14, 2),
    samples,
    ok: samples.filter((s) => s.kind === '可复算').length,
  };
}

function main() {
  const r = report();
  console.log(`急危重症护理学 · 第 ${r.chapter} 章 ${r.title}`);
  console.log(`正文: chapters/${SLUG}/docs/zh.md`);
  console.log('');
  console.log(`规模: 汉字 ${r.size.hanzi.toLocaleString('en-US')} · 节 ${r.size.sections} · 小节 ${r.size.subsections} · 表格 ${r.size.tables} 张（数据行 ${r.size.rows}）`);
  console.log(`分层: ${r.layers} 层（每层只回答一个问题，发现红线即停手）`);
  console.log(`分级: ${r.levels.length} 级 → ${r.levels.map((l) => `${l.level}（${l.wait}）`).join(' / ')}`);
  console.log(`升级条款: ${r.upgradeClauses} 条；失效模式: ${r.modes} 条`);
  console.log('');
  console.log(`演算: 候诊十四人，每人首次接触两分钟，末位等待 ${r.queue} 分钟；这段时间正是代偿期滑向失代偿的窗口。`);
  console.log('');
  console.log('样例分诊记录（规则逐条判定）:');
  for (const s of r.samples) {
    const mark = s.kind === '可复算' ? '✅' : '❌';
    console.log(`  ${mark} ${s.kind.padEnd(4)} ← ${s.text}　〔${s.note}〕`);
  }
  console.log('');
  console.log(`结论: ${r.samples.length} 条例句里 ${r.ok} 条带时刻与数值、可被复核；只写结论或只写单次数的记录无法追问「你凭什么这么排」。`);
  console.log('边界声明: 本输出为教学样例，数字由本章正文现算，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, hanzi, countHeadings, tableBlocks, dataRows, sectionText, blockOf, levelRows, classify, queueMinutes, report, SAMPLES, CHAPTER, SLUG, TITLE };
