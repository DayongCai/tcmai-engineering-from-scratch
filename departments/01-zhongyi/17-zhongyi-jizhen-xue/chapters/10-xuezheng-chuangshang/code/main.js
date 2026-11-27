#!/usr/bin/env node
/**
 * 中医急诊学 · 第 10 章 血证与创伤急症 · 本章表内条数现算
 * 课程: departments/01-zhongyi/17-zhongyi-jizhen-xue/chapters/10-xuezheng-chuangshang/docs/zh.md
 * 数据: 只读本章正文 docs/zh.md —— 表头、表行、条目、数字全部从正文解析
 * 依赖: 仅 Node.js 标准库；正文改一次，下面每个数就跟着变一次
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 10;
const TITLE = '血往哪里流：看得见的血好算，看不见的血难算';

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const hanzi = (s) => (String(s).match(/[\u4e00-\u9fff]/g) || []).length;
const countOf = (s, re) => (String(s).match(re) || []).length;
const nums = (s) => (String(s).match(/\d+(?:\.\d+)?/g) || []).map(Number);
const sum = (a) => a.reduce((x, y) => x + y, 0);

function cells(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

/** 连续以 | 开头的行是一张表；首行作表头，分隔行丢掉 */
function tables(text) {
  const blocks = [];
  let cur = null;
  for (const line of String(text).split(/\r?\n/)) {
    if (/^\s*\|/.test(line)) {
      if (!cur) { cur = []; blocks.push(cur); }
      cur.push(line);
    } else cur = null;
  }
  return blocks
    .map((lines) => lines.map(cells))
    .filter((rows) => rows.length >= 2)
    .map((rows) => ({
      header: rows[0],
      rows: rows.slice(1).filter((r) => !r.every((c) => /^:?-{2,}:?$/.test(c))),
    }));
}

/** 按表头关键词取表，取不到就报错，不让缺表悄悄变成 0 */
function table(text, word) {
  const hit = tables(text).find((t) => t.header.join('|').includes(word));
  if (!hit) throw new Error(`正文里找不到表头含「${word}」的表`);
  return hit;
}

const LABELS = {
  tables: '正文表格数',
  hidden: '内出血六处表行数',
  exits: '血证七处出口条数',
  steps: '创伤五步条数',
  inhale: '吸入性损伤判据条数',
  clockRows: '血证与创伤分钟表行数',
  clockCells: '分钟表格数（时段×入口）',
  hanzi: '本章汉字数',
};

function measure(text = readDoc()) {
  const hidden = table(text, '容易漏在哪');
  const clock = table(text, '血证／内出血');
  const exits = ['咯（气道肺）', '呕（上消化道）', '便（下消化道）', '尿（泌尿）',
    '阴道（妇科）', '伤口', '鼻腔咽部'].filter((s) => text.includes(s)).length;
  const inhale = ['面部烧伤', '鼻毛烧焦', '声音嘶哑', '咳出烟灰样痰', '密闭空间火灾', '意识不清']
    .filter((s) => text.includes(s)).length;
  return {
    tables: tables(text).length,
    hidden: hidden.rows.length,
    exits,
    steps: countOf(text, /^\d+\.\s\*\*(气道|呼吸|循环|意识|暴露与保暖)\*\*/gm),
    inhale,
    clockRows: clock.rows.length,
    clockCells: clock.rows.length * (clock.header.length - 1),
    hanzi: hanzi(text),
  };
}

function report(m) {
  console.log(`═══ 中医急诊学 · 第 ${CHAPTER} 章 ${TITLE} ═══`);
  for (const [k, v] of Object.entries(m)) {
    console.log(`  ${LABELS[k] || k}：${Array.isArray(v) ? v.join(' / ') : v}`);
  }
  console.log('');
  console.log('※ 教学样例：以上数字全部由本章正文现算，用于核对正文自身的表与条目，不构成诊疗建议。');
}

module.exports = { CHAPTER, TITLE, DOC, readDoc, tables, table, cells, hanzi, countOf, nums, sum, measure, report };

if (require.main === module) report(measure());
