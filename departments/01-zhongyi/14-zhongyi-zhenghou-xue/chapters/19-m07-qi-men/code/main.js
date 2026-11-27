#!/usr/bin/env node
/**
 * 中医证候学 · 第 19 章 气证门（M07）
 * 正文: departments/01-zhongyi/14-zhongyi-zhenghou-xue/chapters/19-m07-qi-men/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部由本脚本从 docs/zh.md 现算：汉字、节与每节字数、表与表行、
 * 节均字数、关键词计数与其在本章三项词频中的占比。正文改一处，重跑即复现。
 * 本脚本不读任何外部数据层，也不抄写结论。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 19;
const TITLE = '气证门：判据是走窜与得泄则松，胀而拒按不属气';
const SLUG = '19-m07-qi-men';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

/** 本章的抓手词：计数与占比只在这一组词之间算 */
const TERMS = ['气', '走窜', '得泄'];

const BOUNDARY = '— 数字由本章正文 docs/zh.md 现算；本章只讲结构、判据与边界，不构成诊疗建议。';

const hanzi = (s) => (String(s).match(/[\u4e00-\u9fff]/g) || []).length;

function readDoc() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8');
}

/** 按 H2 切节；H1 题名与题记不计入节，标题改写不影响节数 */
function sectionsOf(doc) {
  const out = [];
  let cur = null;
  for (const l of doc.split(/\r?\n/)) {
    const m = /^##\s+(.*)$/.exec(l);
    if (m) { cur = { title: m[1].trim(), body: [] }; out.push(cur); continue; }
    if (cur) cur.body.push(l);
  }
  return out.map((s, i) => ({ no: i + 1, title: s.title, hanzi: hanzi(s.body.join('\n')) }));
}

/** 表格：连续的 \| 行成块，第二行是分隔行；行数不含表头与分隔行 */
function tablesOf(doc) {
  const out = [];
  let buf = [];
  const flush = () => {
    if (buf.length >= 2 && /^\|[\s:|-]+\|?$/.test(buf[1])) {
      out.push({ rows: buf.length - 2, cols: (buf[0].match(/\|/g) || []).length - 1 });
    }
    buf = [];
  };
  for (const line of doc.split(/\r?\n/)) {
    const t = line.trim();
    if (/^\|/.test(t)) buf.push(t); else flush();
  }
  flush();
  return out;
}

/** 子串计数：互不重叠，逐个前移 */
function countTerm(doc, term) {
  let n = 0;
  let i = doc.indexOf(term);
  while (i !== -1) { n += 1; i = doc.indexOf(term, i + term.length); }
  return n;
}

function stats() {
  const doc = readDoc();
  const secs = sectionsOf(doc);
  const tabs = tablesOf(doc);
  const total = hanzi(doc);
  const counts = TERMS.map((t) => ({ term: t, n: countTerm(doc, t) }));
  const sum = counts.reduce((a, c) => a + c.n, 0) || 1;
  const shares = counts.map((c) => Math.round((c.n / sum) * 1000) / 10);
  const top = secs.slice().sort((a, b) => b.hanzi - a.hanzi)[0];
  return {
    chapter: CHAPTER,
    total,
    sections: secs,
    sectionCount: secs.length,
    tables: tabs,
    tableCount: tabs.length,
    tableRows: tabs.reduce((a, t) => a + t.rows, 0),
    perSection: Math.round(total / secs.length),
    counts,
    shares,
    top: { no: top.no, title: top.title, hanzi: top.hanzi },
    maxSection: Math.max(...secs.map((s) => s.hanzi)),
  };
}

function report() {
  const s = stats();
  console.log('中医证候学 · 第 ' + s.chapter + ' 章 ' + TITLE);
  console.log('');
  console.log('正文汉字 ' + s.total + ' · 节 ' + s.sectionCount + ' · 表 ' + s.tableCount + ' · 表行 ' + s.tableRows);
  console.log('节均 ' + s.perSection + ' 汉字 · 最长节 第 ' + s.top.no + ' 节「' + s.top.title + '」' + s.top.hanzi + ' 汉字');
  console.log('');
  console.log('关键词词频与其在本组词中的占比：');
  s.counts.forEach((c, i) => {
    console.log('  ' + c.term.padEnd(4, ' ') + String(c.n).padStart(5, ' ') + ' 次 · ' + s.shares[i].toFixed(1) + '%');
  });
  console.log('');
  console.log('节清单：');
  s.sections.forEach((x) => console.log('  ' + x.no + '. ' + x.title + '（' + x.hanzi + ' 汉字）'));
  console.log('');
  console.log(BOUNDARY);
  return s;
}

if (require.main === module) report();

module.exports = { CHAPTER, TITLE, SLUG, TERMS, BOUNDARY, readDoc, sectionsOf, tablesOf, countTerm, stats, report, hanzi };
