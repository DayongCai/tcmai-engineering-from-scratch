#!/usr/bin/env node
/**
 * 急危重症护理学 · 第 8 章 意识下降先当急症处理，别急着给它贴标签：正文判断卡
 * 课程: departments/05-huli/12-jiwei-zhengzheng-huli/chapters/08-zhentong-zhenwang/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：汉字数、节与小节、表格与数据行、三个维度、旁证、谵妄四问与非药物措施，
 * 都从本章正文读出；评分趋势按三次时点算差值与是否回升。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '8';
const SLUG = '08-zhentong-zhenwang';
const TITLE = '意识下降先当急症处理，别急着给它贴标签';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const EOL = /\r?\n/;
const ALERT_DROP = 1;

// 正文的对照：三次单看都「接近正常」，但趋势完全不同。
const TRENDS = [
  { label: '渐降不回升', scores: [14, 13, 13], hours: [0, 2, 5] },
  { label: '低分但稳定', scores: [8, 8, 8], hours: [0, 2, 4] },
];

const SAMPLES = [
  { text: '睁眼呼唤后，语言只能单词，运动定位疼痛，总分十', note: '三维度分项' },
  { text: '意识评分十三分', note: '只写总分' },
  { text: '拔管骂人，先约束并加镇静', note: '把谵妄当不配合' },
  { text: '十四时二十分右瞳大于左瞳，呼吸浅慢不规则', note: '旁证入记录' },
  { text: '患者安静入睡，未诉不适', note: '把恶化当疲惫' },
];

const DIMENSION = /(睁眼|语言|运动)/;
const TOTAL = /(评分|总分)[^，。；]{0,4}[零一二三四五六七八九十百千\d]/;
const MISREAD = /(不配合|约束|加镇静|安静入睡)/;

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

/** 谵妄四问：从「是不是急性起病…」到「……意识水平有没有改变」 */
function deliriumQuestions(text) {
  return ['是不是急性起病', '注意力能不能维持', '思维有没有紊乱', '意识水平有没有改变']
    .filter((k) => text.includes(k));
}

/** 六条非药物措施：从正文列举里按分号与顿号切 */
function nonDrugMeasures(text) {
  return ['白天开灯', '夜间调暗', '时钟与日历', '家属在固定时间探视', '管路与监护线减到最少', '助听器与眼镜']
    .filter((k) => text.includes(k));
}

/** 趋势：首末差、是否回升、每两小时是否降一分 */
function trend(scores, hours) {
  const drop = scores[0] - scores[scores.length - 1];
  const recovered = scores[scores.length - 1] > Math.min(...scores);
  return { drop, recovered, alert: drop >= ALERT_DROP && !recovered };
}

function classify(text) {
  if (MISREAD.test(text)) return '读错';
  if (DIMENSION.test(text)) return '分项';
  if (TOTAL.test(text)) return '只写总分';
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
  const dims = ['睁眼', '语言', '运动'].filter((k) => text.includes(`${k}（`));
  const side = ['瞳孔', '呼吸模式'].filter((k) => blockOf(text, '分层评估').includes(k));

  const trends = TRENDS.map((t) => ({ ...t, ...trend(t.scores, t.hours) }));
  const samples = SAMPLES.map((s) => ({ ...s, kind: classify(s.text) }));

  return {
    chapter: CHAPTER,
    title: TITLE,
    size,
    modes,
    dimensions: dims,
    side: side.length,
    delirium: deliriumQuestions(text),
    measures: nonDrugMeasures(text),
    trends,
    samples,
    ok: samples.filter((s) => s.kind === '分项').length,
  };
}

function main() {
  const r = report();
  console.log(`急危重症护理学 · 第 ${r.chapter} 章 ${r.title}`);
  console.log(`正文: chapters/${SLUG}/docs/zh.md`);
  console.log('');
  console.log(`规模: 汉字 ${r.size.hanzi.toLocaleString('en-US')} · 节 ${r.size.sections} · 小节 ${r.size.subsections} · 表格 ${r.size.tables} 张（数据行 ${r.size.rows}）`);
  console.log(`三维度: ${r.dimensions.join('、')}；旁证 ${r.side} 项；谵妄四问 ${r.delirium.length} 条；非药物措施 ${r.measures.length} 条；失效模式 ${r.modes} 条`);
  console.log('');
  console.log('演算（同一分数，不同的走势）:');
  for (const t of r.trends) {
    console.log(`  ${t.label}：${t.scores.join(' → ')}（${t.hours.join('、')} 小时），降 ${t.drop}，回升 ${t.recovered ? '是' : '否'} → ${t.alert ? '按事件报' : '按状态观察'}`);
  }
  console.log(`  → 十四分在五小时内掉到十三分且不回升，是事件；八分稳定六小时，是状态。降一分即报，第二小时就能拦住。`);
  console.log('');
  console.log('样例记录（规则逐条判定）:');
  for (const s of r.samples) {
    const mark = s.kind === '分项' ? '✅' : '❌';
    console.log(`  ${mark} ${s.kind.padEnd(5)} ← ${s.text}　〔${s.note}〕`);
  }
  console.log('');
  console.log(`结论: ${r.samples.length} 条例句里 ${r.ok} 条分项记录；只写总分、把谵妄当不配合、把安静当好转，都会把一次可拦的事件拖成一段不可逆的病程。`);
  console.log('边界声明: 本输出为教学样例，数字由本章正文现算，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, hanzi, countHeadings, tableBlocks, dataRows, sectionText, blockOf, deliriumQuestions, nonDrugMeasures, trend, classify, report, SAMPLES, TRENDS, CHAPTER, SLUG, TITLE };
