#!/usr/bin/env node
/**
 * 中医自然语言处理 · 第 4 章 词袋分得开科室，分不开证型
 * 正文: departments/07-zhineng/04-zhongyi-ziran-yuyan-chuli/chapters/04-nlp4/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：四类任务的标签来源与成本从正文表格读出；词袋的否定失效、字符 bigram
 * 对分词的不敏感、多数类基线，都在正文给的例子上现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 4;
const SLUG = '04-nlp4';
const TITLE = '词袋分得开科室，分不开证型';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s).match(HANZI) || []).length;
const readDoc = () => fs.readFileSync(DOC, 'utf8');

function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

function tableBlocks(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\|[\s:|-]*---[\s:|-]*\|$/.test(lines[i].trim())) continue;
    const header = i > 0 ? splitRow(lines[i - 1]) : [];
    const rows = [];
    let j = i + 1;
    while (j < lines.length && /^\|/.test(lines[j].trim())) {
      rows.push(splitRow(lines[j]));
      j += 1;
    }
    out.push({ header, rows });
  }
  return out;
}

function findTable(text, key) {
  const tb = tableBlocks(text).find((t) => t.header.some((h) => h.includes(key)));
  if (!tb) throw new Error(`正文里没有表头含「${key}」的表`);
  return tb;
}

/** 四个分类任务：标签从哪来、标注成本、可分性、主要风险 */
function tasks(text) {
  return findTable(text, '任务').rows.map((r) => ({
    task: r[0], labelSource: r[1], cost: r[2], separability: r[3], risk: r[4],
  }));
}

/** 词袋：词 -> 次数，丢掉顺序 */
function bag(words) {
  const m = new Map();
  for (const w of words) m.set(w, (m.get(w) || 0) + 1);
  return m;
}

/** 两个词袋的差异：共享维度、各自独有维度 */
function bagDiff(a, b) {
  const shared = [...a.keys()].filter((k) => b.has(k));
  const onlyA = [...a.keys()].filter((k) => !b.has(k));
  const onlyB = [...b.keys()].filter((k) => !a.has(k));
  return { shared, onlyA, onlyB };
}

/** 字符 bigram：只看相邻两字，与分词结果无关 */
function charBigrams(s) {
  const out = [];
  for (let i = 0; i + 1 < s.length; i += 1) out.push(s.slice(i, i + 2));
  return out;
}

/** 多数类基线：全判多数类时的准确率，等于多数类的样本占比 */
function majorityBaseline(labels) {
  if (!labels.length) return 0;
  const m = new Map();
  for (const l of labels) m.set(l, (m.get(l) || 0) + 1);
  return Math.max(...m.values()) / labels.length;
}

function stats() {
  const text = readDoc();
  const t = tasks(text);
  const neg = bagDiff(bag(['恶寒']), bag(['不', '恶寒']));
  const segA = charBigrams('头项强痛');
  const segB = charBigrams(['头项', '强痛'].join(''));
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    hanzi: hanzi(text),
    sections: headings(text).length,
    tasks: t,
    syndrome: t.find((x) => x.task.includes('证型')) || null,
    negation: neg,
    charBigrams: segA,
    segmentationInvariant: segA.join('|') === segB.join('|'),
    majority: majorityBaseline(['肝郁', '肝郁', '肝郁', '肝郁', '肝郁', '肝郁', '脾虚', '脾虚', '脾虚', '湿热']),
    disclaimer: /免责声明/.test(text),
  };
}

function main() {
  const s = stats();
  console.log(`中医自然语言处理 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字            ${s.hanzi.toLocaleString('en-US')}`);
  console.log(`  分类任务        ${s.tasks.length} 类`);
  for (const t of s.tasks) console.log(`    · ${t.task}｜标签：${t.labelSource}｜成本：${t.cost}｜可分性：${t.separability}`);
  console.log('');
  console.log(`词袋失效（否定）：共享维度 ${s.negation.shared.join('、') || '无'}；只差 ${s.negation.onlyB.join('、') || '无'}`);
  console.log(`  于是「不恶寒」与「恶寒」在词袋里只差一个维度，临床含义相反。`);
  console.log('');
  console.log(`字符 bigram「头项强痛」：${s.charBigrams.join(' / ')}`);
  console.log(`  切开成「头项／强痛」后结果不变：${s.segmentationInvariant ? '是' : '否'}`);
  console.log('');
  console.log(`多数类基线（演算样本 10 条，最长类 6 条）：${(s.majority * 100).toFixed(0)}%——什么都没学也有的分。`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 的表格与例句现算；本章不给任何准确率、AUC 或 F1 数值。');
  console.log('※ 本章只做文本分类的方法讨论，不构成诊断、辨证或治疗建议。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC, readDoc, headings, tableBlocks, splitRow, findTable,
  tasks, bag, bagDiff, charBigrams, majorityBaseline, hanzi, stats, main,
};
