#!/usr/bin/env node
/**
 * 中医急诊学 · 第 8 章 脾胃肝胆急症 · 本章表内条数现算
 * 课程: departments/01-zhongyi/17-zhongyi-jizhen-xue/chapters/08-piwei-gandan-jizheng/docs/zh.md
 * 数据: 只读本章正文 docs/zh.md —— 表头、表行、条目、数字全部从正文解析
 * 依赖: 仅 Node.js 标准库；正文改一次，下面每个数就跟着变一次
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const TITLE = '脾胃肝胆急症：吐泻、急腹症、急黄';

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
  signs: '腹痛五征表行数',
  triageQs: '腹痛三问条数',
  dehydration: '脱水五项条数',
  dangerSigns: '急黄危险信号条数',
  clockRows: '三入口分钟表行数',
  clockCells: '分钟表格数（时段×入口）',
  hanzi: '本章汉字数',
};

function measure(text = readDoc()) {
  const signs = table(text, '观察方法');
  const clock = table(text, '吐泻');
  const dehydration = ['口渴与口腔黏膜', '尿量', '皮肤弹性与眼窝', '体位性头晕', '意识与四肢温度']
    .filter((s) => text.includes(s)).length;
  const danger = ['出血倾向', '尿量减少', '腹水短期明显增多', '肝浊音界进行性缩小']
    .filter((s) => text.includes(s)).length;
  return {
    tables: tables(text).length,
    signs: signs.rows.length,
    triageQs: countOf(text, /^\d+\.\s\*\*(起病方式|部位与迁移|通道)\*\*/gm),
    dehydration,
    dangerSigns: danger,
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
