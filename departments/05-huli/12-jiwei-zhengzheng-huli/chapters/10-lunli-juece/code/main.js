#!/usr/bin/env node
/**
 * 急危重症护理学 · 第 10 章 抢救记录写的是可复核的时刻，不是事后的叙述：正文判断卡
 * 课程: departments/05-huli/12-jiwei-zhengzheng-huli/chapters/10-lunli-juece/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：汉字数、节与小节、表格与数据行、记录列数、质量式子、伦理底线与失效模式，
 * 都从本章正文读出；补记误差按单个时点误差与总时长逐次算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '10';
const SLUG = '10-lunli-juece';
const TITLE = '抢救记录写的是可复核的时刻，不是事后的叙述';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const EOL = /\r?\n/;
const TIME_POINTS = 12;
const ERROR_PER_POINT = 2;
const DURATION = 30;

const SAMPLES = [
  { text: '十四时零三分发现，十四时零四分启动抢救，十四时零六分首次除颤', note: '时刻加动作' },
  { text: '经全力抢救，患者恢复自主循环', note: '叙述代替时刻' },
  { text: '十五时二十分告知患者长子：病情危重、正在抢救', note: '告知写时刻与对象' },
  { text: '记录发现写错，已划掉重写', note: '涂改原件' },
  { text: '患者安静入睡，未诉不适', note: '主观描述掩盖灌注' },
];

const ALTER = /(划掉重写|覆盖原字|涂改|撕毁|重新抄写)/;
const NARRATIVE = /(经全力抢救|全力抢救|恢复自主循环|安静入睡|未诉不适|抢救成功)/;
const TIME = /([零一二三四五六七八九十百千]+时[零一二三四五六七八九十]+分|\d{1,2}[:：]\d{2})/;
const ACT = /(发现|启动|除颤|告知|记录|建立|给药|转运)/;

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

/** 抢救记录列数：正文「十二列：…」后按顿号切 */
function recordColumns(text) {
  const m = /十二列：([^。]+)。/.exec(text);
  return m ? m[1].split('、').map((s) => s.trim()).filter(Boolean) : [];
}

/** 三重身份：临床文书、法律文书、质量数据 */
function identities(text) {
  return ['临床文书', '法律文书', '质量数据'].filter((k) => text.includes(k));
}

/** 三个质量式子 */
function formulas(text) {
  return ['时间戳完整率', '变更留痕率', '交接复诵率'].filter((k) => text.includes(k));
}

/** 四条伦理底线：以「其一…其四」的措辞定位 */
function ethicsBottomLines(text) {
  return ['紧急情况下先救人', '不复苏意愿必须核对文书', '冲突不停止照护', '报告不等于认错']
    .filter((k) => text.includes(k));
}

/** 单个时点的误差占总时长的比例 */
function errorRate(errPerPoint, duration) {
  return errPerPoint / duration;
}

function classify(text) {
  if (ALTER.test(text)) return '涂改式';
  if (TIME.test(text) && ACT.test(text)) return '可复核';
  if (NARRATIVE.test(text)) return '叙述式';
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
  const cols = recordColumns(text);
  const samples = SAMPLES.map((s) => ({ ...s, kind: classify(s.text) }));

  return {
    chapter: CHAPTER,
    title: TITLE,
    size,
    modes,
    columns: cols,
    identities: identities(text),
    formulas: formulas(text),
    ethics: ethicsBottomLines(text),
    rate: errorRate(ERROR_PER_POINT, DURATION),
    points: TIME_POINTS,
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
  console.log(`记录 ${r.columns.length} 列；三重身份 ${r.identities.length} 重；质量式子 ${r.formulas.length} 个；伦理底线 ${r.ethics.length} 条；失效模式 ${r.modes} 条`);
  console.log('');
  console.log(`演算: 三十分钟抢救，事后凭回忆补 ${r.points} 个时点，每个按正负 ${ERROR_PER_POINT} 分钟误差，误差占比 ${(r.rate * 100).toFixed(1)}%。`);
  console.log('  → 复盘常问「首次除颤距骤停几分钟」，误差两分钟就足以把「及时」改写成「延误」，两种结论指向完全不同的整改方向。');
  console.log('');
  console.log('样例记录（规则逐条判定）:');
  for (const s of r.samples) {
    const mark = s.kind === '可复核' ? '✅' : '❌';
    console.log(`  ${mark} ${s.kind.padEnd(4)} ← ${s.text}　〔${s.note}〕`);
  }
  console.log('');
  console.log(`结论: ${r.samples.length} 条例句里 ${r.ok} 条可复核；叙述式与涂改式的记录，事后既无法重建现场，也无法回答「什么时候、谁、做了什么」。`);
  console.log('边界声明: 本输出为教学样例，数字由本章正文现算，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, hanzi, countHeadings, tableBlocks, dataRows, sectionText, blockOf, recordColumns, identities, formulas, ethicsBottomLines, errorRate, classify, report, SAMPLES, ERROR_PER_POINT, DURATION, CHAPTER, SLUG, TITLE };
