#!/usr/bin/env node
/**
 * 中医急诊学 · 第 2 章 理论基础 · 本章表内条数现算
 * 课程: departments/01-zhongyi/17-zhongyi-jizhen-xue/chapters/02-lilun-jichu/docs/zh.md
 * 数据: 只读本章正文 docs/zh.md —— 表头、表行、条目、数字全部从正文解析
 * 依赖: 仅 Node.js 标准库；正文改一次，下面每个数就跟着变一次
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '邪盛正衰不是一句断言，是一条能读出方向的轴';

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
  doors: '病因入口表行数',
  pairRows: '闭脱对照表行数',
  pairCells: '闭脱对照点数（行×证）',
  shifts: '治则班次数',
  shiftEnd: '前几班覆盖到第几分钟',
  faults: '四类失效条目数',
  teachSet: '正文标注教学设定的次数',
  hanzi: '本章汉字数',
};

function measure(text = readDoc()) {
  const doors = table(text, '典型情形');
  const pair = table(text, '闭');
  const shifts = table(text, '班次');
  const bounds = shifts.rows.map((r) => nums(r[3]).slice(-1)[0]).filter((x) => Number.isFinite(x));
  const faults = countOf(text, /^- \*\*(见闭忘脱|见热忘瘀|把虚实当二分|用证名代替判据)/gm);
  return {
    tables: tables(text).length,
    doors: doors.rows.length,
    pairRows: pair.rows.length,
    pairCells: pair.rows.length * (pair.header.length - 1),
    shifts: shifts.rows.length,
    shiftEnd: Math.max(...bounds),
    faults,
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
