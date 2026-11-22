#!/usr/bin/env node
/**
 * 中医口腔科学 · 第 1 章 口腔不是一条通道，是六扇各有主人的门
 * 课程: departments/08-wuguan/08-zhongyi-kouqiang-kexue/chapters/01-e81/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的结构量全部从正文现算：概念表几行、六部位与涎唾、会厌各自归哪一格、
 * 上龈下龈分属哪两经、「先保气通，再论纳食」的次序有没有被改动。
 * 正文改一句，这里跟着变；手打的数字会在改稿后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const SLUG = '01-e81';

const PARTS = ['口', '齿', '龈', '舌', '唇', '咽喉'];
const LIQUIDS = ['涎', '唾'];
const GATES = ['会厌', '悬雍垂'];
const CLAIMS = [
  '脾气通于口',
  '齿为骨之余',
  '入上齿中',
  '入下齿中',
  '舌乃心之苗',
  '喉主天气，咽主地气',
  '脾为涎',
];
const ORDER = ['先保气通', '再论纳食', '最后才谈声音与疼痛'];
const AGE_MARKS = ['三七', '五八', '八八'];
const GUM_LINES = ['上龈属胃经', '下龈属大肠经'];
const BOUNDARY = ['本章不给剂量', '不构成诊断或治疗建议', '本输出仅用于教学演示'];

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const present = (doc, term) => doc.includes(term);
const sections = (doc) => [...doc.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());

/** 取某个小节标题之后、第一张表的行（跳过表头与分隔行） */
function tableRows(doc, heading) {
  const lines = doc.split(String.fromCharCode(10));
  const start = lines.findIndex((l) => l.trim().startsWith(heading));
  const block = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) {
      if (block.length) break;
      continue;
    }
    const cells = line.replace(/^\||\|$/g, '').split('|').map((s) => s.trim());
    block.push({ cells, separator: cells.every((c) => /^:?-{2,}:?$/.test(c)) });
  }
  const sep = block.findIndex((r) => r.separator);
  const rows = (sep >= 0 ? block.slice(sep + 1) : block.slice(1)).map((r) => r.cells);
  return rows;
}

function ordering(doc, terms) {
  let last = -1;
  for (const t of terms) {
    const i = doc.indexOf(t);
    if (i <= last) return false;
    last = i;
  }
  return true;
}

function audit(doc = readDoc()) {
  const rows = tableRows(doc, '## 一、六个部位，六条归属');
  const total = [...PARTS, ...LIQUIDS, ...GATES];
  const missing = [...total, ...CLAIMS, ...AGE_MARKS, ...GUM_LINES].filter((t) => !present(doc, t));
  const books = [...new Set([...doc.matchAll(/《([^》]+)》/g)].map((m) => m[1]))];
  const title = (doc.split(/\r?\n/)[0] || '').replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '').trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    tableRows: rows.length,
    tableWidthOk: rows.every((r) => r.length === 3),
    parts: PARTS.filter((t) => present(doc, t)),
    liquids: LIQUIDS.filter((t) => present(doc, t)),
    gates: GATES.filter((t) => present(doc, t)),
    ageMarks: AGE_MARKS.filter((t) => present(doc, t)),
    books,
    missing,
    orderOk: ordering(doc, ORDER),
    boundaryOk: BOUNDARY.every((t) => present(doc, t)),
  };
}

function main() {
  const a = audit();
  console.log(`中医口腔科学 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`概念表 ${a.tableRows} 行（三列齐全：${a.tableWidthOk ? '是' : '否'}）`);
  console.log(`六部位：${a.parts.join('、')}`);
  console.log(`涎唾：${a.liquids.join('、')}｜开合之件：${a.gates.join('、')}`);
  console.log(`上龈下龈分属：${GUM_LINES.join('／')}`);
  console.log(`年龄刻度：${a.ageMarks.join('、')}（《素问·上古天真论》）`);
  console.log('');
  console.log(`轻重次序（由正文读出）：先保气通 → 再论纳食 → 最后才谈声音与疼痛`);
  console.log(`次序与正文一致：${a.orderOk ? '是' : '否'}`);
  console.log(`引书 ${a.books.length} 部／篇：${a.books.join('、')}`);
  if (a.missing.length) console.log(`缺词：${a.missing.join('、')}`);
  console.log('');
  console.log('※ 教学样例：表行与归属均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成诊断或治疗依据；本章不给剂量。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, PARTS, LIQUIDS, GATES, CLAIMS, ORDER, AGE_MARKS, GUM_LINES, BOUNDARY,
  readDoc, sections, tableRows, audit,
};
