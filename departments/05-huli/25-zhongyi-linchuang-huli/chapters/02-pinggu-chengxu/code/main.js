#!/usr/bin/env node
/**
 * 中医临床护理学 · 第 2 章 临床护理评估与护理程序：正文自查
 * 正文: departments/05-huli/25-zhongyi-linchuang-huli/chapters/02-pinggu-chengxu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 只读正文现算：汉字数、分节、表格行数、关键术语出现次数；再把正文自称的
 * 结构数字（几项、几类、几列）与对应表格或清单的实测条数对账。手法同本章：
 * 先看数与表是否对得上，再谈结论。正文一改，数字随之改变，不手打。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const SLUG = '02-pinggu-chengxu';
const TITLE = '护理评估的价值在于把「说不清」变成可复核的记录';

function readDoc() {
  return fs.readFileSync(DOC, 'utf8');
}

function cells(line) {
  return line.trim().replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map((s) => s.trim());
}

function parseTables(doc) {
  const lines = doc.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\s*\|/.test(lines[i])) continue;
    if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) continue;
    const header = cells(lines[i]);
    const rows = [];
    let j = i + 2;
    while (j < lines.length && /^\s*\|/.test(lines[j])) { rows.push(cells(lines[j])); j += 1; }
    out.push({ header, rows, text: header.join(' ') + ' ' + rows.map((r) => r.join(' ')).join(' ') });
    i = j - 1;
  }
  return out;
}

function sections(doc) {
  return doc.split(/\r?\n/).filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
}

function listCount(doc, headingRe) {
  let inside = false;
  let n = 0;
  for (const line of doc.split(/\r?\n/)) {
    if (/^##\s+/.test(line)) { inside = headingRe.test(line); continue; }
    if (inside && /^\d+\.\s+/.test(line)) n += 1;
  }
  return n;
}

/** 探针：claim 是从正文 PROBLEM 段里读出的自称数字，measured 是表格/清单实测条数 */
const PROBES = [
  { id: 'bedside-questions', label: '十二个床边问题', kind: 'table', find: /记录字段/, claim: /拆成 (\d+) 个床边问题/ },
  { id: 'data-layers', label: '资料三层', kind: 'table', find: /定基线/ },
  { id: 'eval-points', label: '评价三时点', kind: 'table', find: /措施后即刻/ },
  { id: 'assess-items', label: '考核项', kind: 'table', find: /十二问的完整采集/ }
];

/** 关键术语：只在正文里数出现次数，不预设应有多少 */
const TERMS = ['问题固定', '医师辨为', '同一条件', '晨起未食', '急症状态下采集'];

function probeValue(doc, p) {
  if (p.kind === 'list') return listCount(doc, p.find);
  const t = parseTables(doc).find((tb) => p.find.test(tb.text));
  return t ? t.rows.length : 0;
}

function measure(doc) {
  const tables = parseTables(doc);
  const terms = {};
  for (const t of TERMS) terms[t] = doc.split(t).length - 1;
  const probes = PROBES.map((p) => {
    const measured = probeValue(doc, p);
    let declared = null;
    if (p.claim) {
      const m = doc.match(p.claim);
      if (m) declared = Number(m[1]);
    }
    return { id: p.id, label: p.label, measured, declared, agree: declared === null ? null : declared === measured };
  });
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    hanzi: (doc.match(/[\u4e00-\u9fff]/g) || []).length,
    sections: sections(doc),
    tables: tables.length,
    tableRows: tables.reduce((a, b) => a + b.rows.length, 0),
    terms,
    probes,
  };
}

function main() {
  const doc = readDoc();
  const m = measure(doc);
  console.log(`中医临床护理学 · 第 ${m.chapter} 章 ${m.title}`);
  console.log('');
  console.log(`正文 ${m.hanzi.toLocaleString('en-US')} 汉字 · ${m.sections.length} 节 · ${m.tables} 张表（${m.tableRows} 行）`);
  console.log('');
  for (const s of m.sections) console.log(`  · ${s}`);
  console.log('');
  console.log('结构对账（正文自称 vs 表格/清单实测）：');
  for (const p of m.probes) {
    const head = p.declared === null
      ? `  ${p.label}：实测 ${p.measured} 条`
      : `  ${p.label}：正文称 ${p.declared}，实测 ${p.measured} ${p.agree ? '一致' : '不一致'}`;
    console.log(head);
  }
  const checked = m.probes.filter((p) => p.declared !== null);
  const bad = checked.filter((p) => !p.agree);
  console.log(`  → ${checked.length} 项自称结构数字，${checked.length - bad.length} 项与实测一致`);
  console.log('');
  console.log('术语出现次数（正文原词计数）：');
  for (const [k, v] of Object.entries(m.terms)) console.log(`  ${k}：${v}`);
  console.log('');
  console.log('※ 数字全部来自本章正文；改正文后重跑即可复现，不手打。');
  console.log('※ 本输出为教学自查，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { measure, readDoc, parseTables, sections, listCount, CHAPTER, SLUG, TITLE, PROBES, TERMS };
