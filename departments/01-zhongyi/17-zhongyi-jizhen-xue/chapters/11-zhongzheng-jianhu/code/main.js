#!/usr/bin/env node
/**
 * 中医急诊学 · 第 11 章 重症与监护协同 · 本章表内条数现算
 * 课程: departments/01-zhongyi/17-zhongyi-jizhen-xue/chapters/11-zhongzheng-jianhu/docs/zh.md
 * 数据: 只读本章正文 docs/zh.md —— 表头、表行、条目、数字全部从正文解析
 * 依赖: 仅 Node.js 标准库；正文改一次，下面每个数就跟着变一次
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 11;
const TITLE = '分清谁能做：重症协同不是把中医搬进监护室，是把判断做在床旁';

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
  windows: '脓毒性休克三窗口表行数',
  capability: '能力边界表行数',
  capabilityCells: '能力边界表格数（项目×三档）',
  localOnly: '最后一档为空的项目数',
  forms: '协同形式条数',
  rules: '边界纪律条数',
  hanzi: '本章汉字数',
};

function measure(text = readDoc()) {
  const win = table(text, '中医的位置');
  const cap = table(text, '可就地做');
  return {
    tables: tables(text).length,
    windows: win.rows.length,
    capability: cap.rows.length,
    capabilityCells: cap.rows.length * (cap.header.length - 1),
    localOnly: cap.rows.filter((r) => r[r.length - 1] === '—').length,
    forms: countOf(text, /^\d+\.\s\*\*(会诊式|共管式|参与式|康复式)\*\*/gm),
    rules: countOf(text, /^- (能立刻做的不等|需要会诊的不猜|需要转诊的不拖|不会做的不装会做)/gm),
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
