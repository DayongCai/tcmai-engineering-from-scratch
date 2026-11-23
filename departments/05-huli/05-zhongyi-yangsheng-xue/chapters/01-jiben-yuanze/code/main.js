#!/usr/bin/env node
/**
 * 中医养生学 · 第 1 章 养生的基本原则：天人相应：正文结构自检
 * 正文: departments/05-huli/05-zhongyi-yangsheng-xue/chapters/01-jiben-yuanze/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的节数、四项评估、分档、失效类型与边界用词，全部由脚本从正文读入后现算。
 * 手打的数字会在正文修订后静默过期。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 1;
const SLUG = '01-jiben-yuanze';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const readDoc = () => fs.readFileSync(DOC, 'utf8');
const hanzi = (s) => (s.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function sections(doc) {
  return (doc.match(/^##\s+.+$/gm) || []).map((l) => l.replace(/^##\s+/, '').trim());
}

function tables(doc) {
  const out = [];
  let cur = [];
  for (const line of doc.split(/\r?\n/)) {
    if (/^\s*\|/.test(line)) cur.push(line.split('|').slice(1, -1).map((c) => c.trim()));
    else { if (cur.length >= 2) out.push(cur); cur = []; }
  }
  if (cur.length >= 2) out.push(cur);
  return out;
}

function rowsOf(ts, header) {
  const t = ts.find((tb) => tb.some((row) => row.includes(header)));
  if (!t) throw new Error('正文缺少表头含「' + header + '」的表格');
  const i = t.findIndex((row) => row.includes(header));
  return t.slice(i + 1).filter((r) => r.length > 1 && !r.every((c) => /^:?-{2,}:?$/.test(c)));
}

const count = (doc, word) => doc.split(word).length - 1;

function analyze() {
  const doc = readDoc();
  const ts = tables(doc);
  const cols = rowsOf(ts, '栏').map((r) => r[0]);
  const tiers = rowsOf(ts, '档');
  const fails = rowsOf(ts, '失效');
  return {
    hanzi: hanzi(doc),
    sections: sections(doc).length,
    tables: ts.length,
    cols,
    tiers: tiers.map((r) => r[0]),
    tiersWithBoundary: tiers.filter((r) => r[3] && r[3].length > 0).length,
    fails: fails.length,
    boundary: ['不能', '停', '转介', '就医'].map((w) => [w, count(doc, w)]),
  };
}

function main() {
  const s = analyze();
  console.log('中医养生学 · 第 ' + CHAPTER + ' 章 养生的基本原则：天人相应');
  console.log('');
  console.log('正文 ' + s.hanzi + ' 汉字 · ' + s.sections + ' 节 · ' + s.tables + ' 张表');
  console.log('');
  console.log('四项评估：' + s.cols.join(' / ') + '（' + s.cols.length + ' 栏）');
  console.log('判据分档：' + s.tiers.join(' / '));
  console.log('  每档都写「不能做」：' + s.tiersWithBoundary + ' / ' + s.tiers.length);
  console.log('失效模式：' + s.fails + ' 类');
  console.log('边界用词：' + s.boundary.map(([w, n]) => w + '×' + n).join(' · '));
  console.log('');
  console.log('※ 数字由本章正文现算，正文改动后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { analyze, readDoc, CHAPTER, SLUG };
