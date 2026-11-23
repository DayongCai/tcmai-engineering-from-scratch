#!/usr/bin/env node
/**
 * 急危重症护理学 · 第 3 章 休克先看灌注够不够，再问血压低不低：正文判断卡
 * 课程: departments/05-huli/12-jiwei-zhengzheng-huli/chapters/03-xiuke-fusu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：汉字数、节与小节、表格与数据行、灌注窗口、负荷判断项、分型与失效模式，
 * 都从本章正文读出；血压降幅按基础值逐对算绝对值与百分比。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '3';
const SLUG = '03-xiuke-fusu';
const TITLE = '休克先看灌注够不够，再问血压低不低';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const EOL = /\r?\n/;

// 正文反复讲的对照：同样的灌注损失，按绝对值判会漏掉平素血压偏高的人。
const PAIRS = [
  { base: 150, now: 110, note: '降幅超过四分之一，绝对值仍在常见范围' },
  { base: 120, now: 90, note: '降三十，报警' },
  { base: 100, now: 95, note: '降五，绝对值好看' },
];

const SAMPLES = [
  { text: '皮肤湿冷、尿量每小时十五毫升、意识嗜睡，血压一百一', note: '四窗口先说话' },
  { text: '血压一百一，循环稳定', note: '单次数加结论' },
  { text: '颈静脉平，皮肤冷，尿量逐小时下降', note: '负荷三项加趋势' },
  { text: '入量一千，出量二百', note: '累计代替时段' },
  { text: '烦躁，先按不配合约束', note: '把灌注不足当情绪' },
];

const CONCLUSION = /(循环稳定|病情稳定|生命体征平稳|一般情况可|无明显异常|已妥善处理)/;
const WINDOW = /(皮肤|尿量|意识|末梢)/;
const TREND = /(较前|逐小时|下降|上升|转凉|转冷|变浅|变快)/;
const BAD_READ = /(不配合|约束|情绪问题)/;

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

/** 从「灌注看四个窗口：A、B、C、D。」里取出窗口名 */
function windows(text) {
  const m = /灌注看四个窗口：([^。]+)。/.exec(text);
  return m ? m[1].split('、').map((s) => s.trim()).filter(Boolean) : [];
}

/** 从「三分钟，加三项负荷判断。」后的列举里取项数 */
function loadItems(text) {
  const m = /颈静脉是否充盈、肺部有无湿啰音、能否平卧/.exec(text);
  return m ? m[0].split('、').length : 0;
}

/** 表头含「床边线索」的那张四类机制表 */
function mechanismRows(lines) {
  let n = 0;
  for (const b of tableBlocks(lines)) {
    if (b[0].includes('床边线索')) n += dataRows(b).length;
  }
  return n;
}

/** 血压较基础值的绝对降幅与相对降幅 */
function drop(base, now) {
  const abs = base - now;
  return { abs, pct: abs / base };
}

function classify(text) {
  if (BAD_READ.test(text)) return '读错';
  if (CONCLUSION.test(text)) return '结论式';
  if (WINDOW.test(text) && (TREND.test(text) || /尿量/.test(text))) return '看灌注';
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
  const win = windows(text);
  const load = loadItems(text);
  const mech = mechanismRows(lines);

  const pairs = PAIRS.map((p) => ({ ...p, ...drop(p.base, p.now) }));
  const samples = SAMPLES.map((s) => ({ ...s, kind: classify(s.text) }));

  return {
    chapter: CHAPTER,
    title: TITLE,
    size,
    modes,
    windows: win,
    load,
    mechanisms: mech,
    pairs,
    samples,
    ok: samples.filter((s) => s.kind === '看灌注').length,
  };
}

function main() {
  const r = report();
  console.log(`急危重症护理学 · 第 ${r.chapter} 章 ${r.title}`);
  console.log(`正文: chapters/${SLUG}/docs/zh.md`);
  console.log('');
  console.log(`规模: 汉字 ${r.size.hanzi.toLocaleString('en-US')} · 节 ${r.size.sections} · 小节 ${r.size.subsections} · 表格 ${r.size.tables} 张（数据行 ${r.size.rows}）`);
  console.log(`灌注窗口 ${r.windows.length} 个 → ${r.windows.join('、')}；负荷判断 ${r.load} 项；分型 ${r.mechanisms} 类；失效模式 ${r.modes} 条`);
  console.log('');
  console.log('血压降幅（绝对值与相对值逐对算）:');
  for (const p of r.pairs) {
    console.log(`  ${p.base} → ${p.now}：降 ${p.abs}，降幅 ${(p.pct * 100).toFixed(1)}%　〔${p.note}〕`);
  }
  console.log(`  → 平素 ${r.pairs[0].base} 的人降到 ${r.pairs[0].now}，降幅 ${(r.pairs[0].pct * 100).toFixed(1)}%，绝对值却仍在常见范围；按绝对值判就会漏掉。`);
  console.log('');
  console.log('样例记录（规则逐条判定）:');
  for (const s of r.samples) {
    const mark = s.kind === '看灌注' ? '✅' : '❌';
    console.log(`  ${mark} ${s.kind.padEnd(4)} ← ${s.text}　〔${s.note}〕`);
  }
  console.log('');
  console.log(`结论: ${r.samples.length} 条例句里 ${r.ok} 条先写灌注窗口；只写单次数、只写结论或把烦躁当不配合的，都会在代偿跨过去之前放过病人。`);
  console.log('边界声明: 本输出为教学样例，数字由本章正文现算，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, hanzi, countHeadings, tableBlocks, dataRows, sectionText, blockOf, windows, loadItems, mechanismRows, drop, classify, report, SAMPLES, PAIRS, CHAPTER, SLUG, TITLE };
