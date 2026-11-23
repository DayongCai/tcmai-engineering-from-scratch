#!/usr/bin/env node
/**
 * 急危重症护理学 · 第 5 章 中毒先问时间与途径，解毒从来不是第一动作：正文判断卡
 * 课程: departments/05-huli/12-jiwei-zhengzheng-huli/chapters/05-zhongdu-huli/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：汉字数、节与小节、表格与数据行、时间线条数与体征项数、
 * 综合征组数与失效模式，都从本章正文读出；体液容积与洗胃可比量按体重现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '5';
const SLUG = '05-zhongdu-huli';
const TITLE = '中毒先问时间与途径，解毒从来不是第一动作';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const EOL = /\r?\n/;
const BODY_WATER_RATIO = 0.6;

// 正文的算术：全身分布的物质要减半，需要清除的容积远大于洗胃能带出的量。
const WEIGHT = 60;
const WASH_ML = 200; // 正文只说「以百毫升计」，取两百毫升作对照量级

const SAMPLES = [
  { text: '约两小时前摄入（家属述），十四时十分到院', note: '标估计并写来源' },
  { text: '有机磷中毒，已按此处置', note: '推断当事实' },
  { text: '十四时十分到院，恶心呕吐', note: '缺物质与来源' },
  { text: '十四时二十分记录：疑似有机磷（家属述），瞳孔缩小、大汗、流涎', note: '疑加来源' },
  { text: '服药时间不详', note: '缺时刻' },
];

const INFER = /(有机磷中毒|阿片中毒|确诊中毒|诊断为.{0,4}中毒)/;
const SOURCE = /(家属述|病人述|同伴述|现场|自述)/;
const EST = /(约|估计|疑似|可能|大约|不详)/;
const TIME = /([零一二三四五六七八九十百千]+时[零一二三四五六七八九十]+分|\d{1,2}[:：]\d{2})/;

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

/** 四条时间线：含「四条时间线」的小节里以「时刻**」收尾的条目数 */
function timelineCount(text) {
  return (blockOf(text, '四条时间线').match(/时刻\*\*/g) || []).length;
}

/** 五个体征：正文列出的瞳孔、皮肤、分泌物、体温、肌张力 */
function signItems(text) {
  const m = /瞳孔大小与反应、皮肤干湿与色泽、分泌物多少、体温、肌张力/.exec(text);
  return m ? m[0].split('、').map((s) => s.trim()).filter(Boolean) : [];
}

/** 综合征表：表头含「常见指向」的那张 */
function syndromeRows(lines) {
  let n = 0;
  for (const b of tableBlocks(lines)) {
    if (b[0].includes('常见指向')) n += dataRows(b).length;
  }
  return n;
}

function bodyWater(weight, ratio = BODY_WATER_RATIO) {
  return weight * ratio;
}

function classify(text) {
  if (INFER.test(text)) return '推断当事实';
  if (TIME.test(text) && (SOURCE.test(text) || EST.test(text))) return '可复核';
  if (TIME.test(text)) return '缺来源';
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

  const modes = (sectionText(text, '失效模式').match(/失效模式[一二三四五六七八九]/g) || []).length;
  const water = bodyWater(WEIGHT);
  const samples = SAMPLES.map((s) => ({ ...s, kind: classify(s.text) }));

  return {
    chapter: CHAPTER,
    title: TITLE,
    size,
    modes,
    timeline: timelineCount(text),
    signs: signItems(text),
    syndromes: syndromeRows(lines),
    water,
    half: water / 2,
    wash: WASH_ML,
    samples,
    ok: samples.filter((s) => s.kind === '可复核').length,
  };
}

function main() {
  const r = report();
  console.log(`急危重症护理学 · 第 ${r.chapter} 章 ${r.title}`);
  console.log(`正文: chapters/${SLUG}/docs/zh.md`);
  console.log('');
  console.log(`规模: 汉字 ${r.size.hanzi.toLocaleString('en-US')} · 节 ${r.size.sections} · 小节 ${r.size.subsections} · 表格 ${r.size.tables} 张（数据行 ${r.size.rows}）`);
  console.log(`时间线 ${r.timeline} 条；体征 ${r.signs.length} 项 → ${r.signs.join('、')}；综合征 ${r.syndromes} 组；失效模式 ${r.modes} 条`);
  console.log('');
  console.log(`演算: ${WEIGHT} 公斤成人，体液约 ${r.water} 升；血中浓度减半需清除约 ${r.half} 升；洗胃带出量以百毫升计（对照 ${r.wash} 毫升）。`);
  console.log(`  → ${r.half} 升与 ${(r.wash / 1000).toFixed(1)} 升差约 ${Math.round(r.half / (r.wash / 1000))} 倍，量级不同，「洗胃解毒」在算术上不成立。`);
  console.log('');
  console.log('样例记录（规则逐条判定）:');
  for (const s of r.samples) {
    const mark = s.kind === '可复核' ? '✅' : '❌';
    console.log(`  ${mark} ${s.kind.padEnd(5)} ← ${s.text}　〔${s.note}〕`);
  }
  console.log('');
  console.log(`结论: ${r.samples.length} 条例句里 ${r.ok} 条标了估计、写了来源；把推断写成诊断的条目，事后既无法复核，也可能把处置引向错误方向。`);
  console.log('边界声明: 本输出为教学样例，数字由本章正文现算，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, hanzi, countHeadings, tableBlocks, dataRows, sectionText, blockOf, timelineCount, signItems, syndromeRows, bodyWater, classify, report, SAMPLES, WEIGHT, CHAPTER, SLUG, TITLE };
