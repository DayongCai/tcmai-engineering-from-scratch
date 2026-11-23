#!/usr/bin/env node
/**
 * 急危重症护理学 · 第 2 章 复苏的成败不在手法漂亮，而在中断的那几十秒：正文判断卡
 * 课程: departments/05-huli/12-jiwei-zhengzheng-huli/chapters/02-fusu-chuchan/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：汉字数、节与小节、表格与数据行、分层步数、停手由头、失效模式，
 * 都从本章正文读出；按压效率与累计丢失时长由停手秒数逐轮累加算出。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '2';
const SLUG = '02-fusu-chuchan';
const TITLE = '复苏的成败不在手法漂亮，而在中断的那几十秒';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const EOL = /\r?\n/;

// 本章正文点名的五种停手由头与其中必须停的一种。
const SAMPLES = [
  { text: '十四时零二分判断无反应、无正常呼吸，十四时零二分开始按压并呼救', note: '时刻加动作' },
  { text: '经全力抢救，患者恢复自主循环', note: '总结代替时刻' },
  { text: '按压两分钟后换人，换人间隔约十秒', note: '有动作无时刻' },
  { text: '十四时零五分贴电极片，十四时零六分首次除颤，节律为可除颤', note: '时刻加节律' },
  { text: '未除颤，因节律不可除颤', note: '阴性发现，仍缺时刻' },
];

const SUMMARY = /(经全力抢救|全力抢救|抢救成功|效果良好|病情稳定|恢复自主循环。?$)/;
const TIME = /([零一二三四五六七八九十百千]+时[零一二三四五六七八九十]+分|\d{1,2}[:：]\d{2})/;
const ACTION = /(按压|呼救|除颤|通气|识别|气管|换人|轮换)/;

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

/** 从「停手有五种由头：A、B、C…。」里取出各条 */
function interruptionCauses(text) {
  const m = /停手有[一二三四五六七八九十]+种由头：([^。]+)。/.exec(text);
  return m ? m[1].split('、').map((s) => s.trim()).filter(Boolean) : [];
}

/** 一轮有效按压秒数与效率 */
function roundEfficiency(roundSeconds, stops) {
  const lost = stops.reduce((a, b) => a + b, 0);
  const effective = roundSeconds - lost;
  return { effective, lost, ratio: effective / roundSeconds };
}

/** 若干轮累计丢失秒数 */
function cumulativeLost(roundSeconds, stops, rounds) {
  return roundEfficiency(roundSeconds, stops).lost * rounds;
}

function classify(text) {
  if (SUMMARY.test(text)) return '总结式';
  if (TIME.test(text) && ACTION.test(text)) return '时刻式';
  return '缺时刻';
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

  const steps = ['**第一步，', '**第二步，', '**第三步，', '**第四步，', '**第五步，']
    .filter((k) => blockOf(text, '分层评估').includes(k)).length;
  const causes = interruptionCauses(text);
  const modes = (sectionText(text, '失效模式').match(/失效模式[一二三四五六七八九]/g) || []).length;

  const round = 120;
  const stops = [10, 8];
  const eff = roundEfficiency(round, stops);
  const samples = SAMPLES.map((s) => ({ ...s, kind: classify(s.text) }));

  return {
    chapter: CHAPTER,
    title: TITLE,
    size,
    steps,
    causes,
    modes,
    round,
    stops,
    eff,
    lostFive: cumulativeLost(round, stops, 5),
    samples,
    ok: samples.filter((s) => s.kind === '时刻式').length,
  };
}

function main() {
  const r = report();
  console.log(`急危重症护理学 · 第 ${r.chapter} 章 ${r.title}`);
  console.log(`正文: chapters/${SLUG}/docs/zh.md`);
  console.log('');
  console.log(`规模: 汉字 ${r.size.hanzi.toLocaleString('en-US')} · 节 ${r.size.sections} · 小节 ${r.size.subsections} · 表格 ${r.size.tables} 张（数据行 ${r.size.rows}）`);
  console.log(`分层: ${r.steps} 步；失效模式: ${r.modes} 条`);
  console.log(`停手由头 ${r.causes.length} 种 → ${r.causes.join(' / ')}；其中必须停的只有「${r.causes.includes('贴电极片') ? '贴电极片' : '无'}」。`);
  console.log('');
  console.log(`演算: 一轮 ${r.round} 秒，停手 ${r.stops.join('＋')} 秒，有效按压 ${r.eff.effective} 秒，效率 ${(r.eff.ratio * 100).toFixed(1)}%；连做五轮累计丢掉 ${r.lostFive} 秒。`);
  console.log('');
  console.log('样例复苏记录（规则逐条判定）:');
  for (const s of r.samples) {
    const mark = s.kind === '时刻式' ? '✅' : '❌';
    console.log(`  ${mark} ${s.kind.padEnd(4)} ← ${s.text}　〔${s.note}〕`);
  }
  console.log('');
  console.log(`结论: ${r.samples.length} 条例句里 ${r.ok} 条可重建现场；总结句与缺时刻的条目，复盘时都无法回答「首次除颤距骤停几分钟」。`);
  console.log('边界声明: 本输出为教学样例，数字由本章正文现算，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, hanzi, countHeadings, tableBlocks, dataRows, sectionText, blockOf, interruptionCauses, roundEfficiency, cumulativeLost, classify, report, SAMPLES, CHAPTER, SLUG, TITLE };
