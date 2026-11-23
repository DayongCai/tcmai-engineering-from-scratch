#!/usr/bin/env node
/**
 * 中医临床轮转 · 第 4 章 肾病科轮转：水肿与淋证的辨证接诊：正文自测口径
 * 课程: departments/01-zhongyi/21-zhongyi-linchuang-lunzhuan/chapters/04-shenbing-lunzhuan/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：只读本章 docs/zh.md 现算，不引其他章、不引外部数据、不手打数字。
 * 正文改一句，重跑即变；code/main.test.js 钉住的是本次实测值。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '肾病科轮转：水肿与淋证的辨证接诊';
const TERMS = [
  "水肿",
  "淋证",
  "阳水",
  "阴水",
  "小便",
  "出入量",
  "浮肿",
  "转诊"
];

const hanzi = (s) => (String(s).match(/[\u4e00-\u9fff]/g) || []).length;

function readDoc() {
  return fs.readFileSync(DOC, 'utf8');
}

/** 抽表：每张表给表头与数据行（不含表头分隔行） */
function tables(body) {
  const out = [];
  let cur = null;
  for (const line of String(body).split(/\r?\n/)) {
    const s = line.trim();
    if (!s.startsWith('|')) {
      cur = null;
      continue;
    }
    if (/^\|[\s:|-]+\|$/.test(s)) continue;
    const cells = s.replace(/^\||\|$/g, '').split('|').map((v) => v.trim());
    if (!cur) {
      cur = { header: cells, rows: [] };
      out.push(cur);
      continue;
    }
    cur.rows.push(cells);
  }
  return out;
}

/** 按「## 」切节；标题行本身不计入字数 */
function sections(text) {
  return String(text)
    .split(/^## /m)
    .slice(1)
    .map((part) => {
      const lines = part.split(/\r?\n/);
      const title = lines.shift().trim();
      const body = lines.join('\n');
      const t = tables(body);
      return {
        title,
        hanzi: hanzi(body),
        tables: t.length,
        rows: t.reduce((a, x) => a + x.rows.length, 0),
      };
    });
}

/** 找标题里含某词的那一节，返回该节第一张表 */
function sectionTable(text, keyword) {
  const parts = String(text).split(/^## /m).slice(1);
  for (const part of parts) {
    const lines = part.split(/\r?\n/);
    const title = lines.shift().trim();
    if (!title.includes(keyword)) continue;
    return { title, table: tables(lines.join('\n'))[0] || { header: [], rows: [] } };
  }
  return { title: null, table: { header: [], rows: [] } };
}

const count = (text, term) => String(text).split(term).length - 1;

function termCounts(text, list = TERMS) {
  return list
    .map((term) => ({ term, count: count(text, term) }))
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term, 'zh'));
}

function summary(text = readDoc()) {
  const secs = sections(text);
  const t = tables(text);
  return {
    hanzi: hanzi(text),
    sections: secs,
    tables: t.length,
    rows: t.reduce((a, x) => a + x.rows.length, 0),
    terms: termCounts(text),
  };
}

function criteriaTable(text = readDoc()) {
  return sectionTable(text, '判据');
}

function main() {
  const text = readDoc();
  const s = summary(text);
  const ct = criteriaTable(text);
  console.log(`═══ 中医临床轮转 · ${TITLE} ═══`);
  console.log(`正文 ${s.hanzi} 汉字 · ${s.sections.length} 小节 · ${s.tables} 张表 · ${s.rows} 行`);
  console.log('');
  console.log('按节：');
  for (const x of s.sections) console.log(`  ${x.title}\t${x.hanzi} 字 · ${x.tables} 表 ${x.rows} 行`);
  console.log('');
  console.log('正文抓手词频（原词计数）：');
  for (const x of s.terms) console.log(`  ${x.term}\t${x.count}`);
  console.log('');
  console.log(`判据表（${ct.table.header.join(' | ')}）：${ct.table.rows.length} 行`);
  if (ct.table.rows[0]) console.log(`  首行：${ct.table.rows[0].join(' / ')}`);
  const densest = s.sections.slice().sort((a, b) => b.hanzi - a.hanzi)[0];
  if (densest) console.log(`最长一节：${densest.title}（${densest.hanzi} 字）`);
  console.log('※ 教学样例：数字全部由本章 docs/zh.md 现算，不构成诊疗建议，不能替代医师面诊。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  TITLE,
  TERMS,
  hanzi,
  readDoc,
  sections,
  tables,
  sectionTable,
  termCounts,
  summary,
  criteriaTable,
  main,
};
