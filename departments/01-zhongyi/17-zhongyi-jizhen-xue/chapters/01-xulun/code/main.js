#!/usr/bin/env node
/**
 * 中医急诊学 · 第 1 章 绪论 · 本章表内条数现算
 * 课程: departments/01-zhongyi/17-zhongyi-jizhen-xue/chapters/01-xulun/docs/zh.md
 * 数据: 只读本章正文 docs/zh.md —— 表头、表行、条目、数字全部从正文解析
 * 依赖: 仅 Node.js 标准库；正文改一次，下面每个数就跟着变一次
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const TITLE = '绪论：急诊学研究的不是病，是「正在恶化的人」';

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
  triageRows: '分诊层级表的层数',
  waits: '各层允许等待（分钟，按序的层不计）',
  waitTotal: '允许等待合计分钟',
  waitMean: '平均每层允许等待分钟',
  clockRows: '首个小时时段表段数',
  clockEnd: '分钟表覆盖到第几分钟',
  minutesPerSpan: '平均每段分钟',
  criticalFive: '危候五项条目数',
  teachSet: '正文标注教学设定的次数',
  hanzi: '本章汉字数',
};

function measure(text = readDoc()) {
  const triage = table(text, '允许等待');
  const clock = table(text, '必做');
  const waits = triage.rows.map((r) => nums(r[3])[0]).filter((x) => Number.isFinite(x));
  const spans = clock.rows.map((r) => nums(r[0]).slice(-1)[0]);
  return {
    tables: tables(text).length,
    triageRows: triage.rows.length,
    waits: waits.join('、'),
    waitTotal: sum(waits),
    waitMean: +(sum(waits) / waits.length).toFixed(1),
    clockRows: clock.rows.length,
    clockEnd: Math.max(...spans),
    minutesPerSpan: Math.max(...spans) / clock.rows.length,
    criticalFive: countOf(text, /^\d+\.\s\*\*(气道|呼吸|循环|意识|出血)\*\*/gm),
    teachSet: countOf(text, /教学设定/g),
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
