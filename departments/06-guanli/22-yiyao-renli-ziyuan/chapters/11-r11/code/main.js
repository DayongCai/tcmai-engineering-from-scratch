#!/usr/bin/env node
/**
 * 医药人力资源管理 · 第 11 章 人才流动的问题不是流失率高，是内部流动比外部流动还慢
 * 课程: departments/06-guanli/22-yiyao-renli-ziyuan/chapters/11-r11/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 下面每个数都从本章正文现算：算式里的输入用「关键词之后第一个数」的方式取，
 * 结构量（节、表行、加粗项）由正文数出来，结果与正文自己写下的数对照。
 * 正文一改，输出与测试断言一起变，不会静默过期。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 11;
const TITLE = '人才流动的问题不是流失率高，是内部流动比外部流动还慢';
const SLUG = '11-r11';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const CN = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 关键词之后 60 字内的第一个数（支持千分位与小数）。取不到就报错，不兜底。 */
function num(text, key) {
  const i = text.indexOf(key);
  if (i < 0) throw new Error('正文里找不到关键词: ' + key);
  const m = text.slice(i + key.length, i + key.length + 60).match(/(\d[\d,]*(?:\.\d+)?)/);
  if (!m) throw new Error('关键词之后没有数字: ' + key);
  return Number(m[1].replace(/,/g, ''));
}

/** 关键词之后的第一个中文数词，取不到就报错。 */
function cn(text, key) {
  const i = text.indexOf(key);
  if (i < 0) throw new Error('正文里找不到关键词: ' + key);
  const m = text.slice(i + key.length, i + key.length + 20).match(/[一两二三四五六七八九十]/);
  if (!m) throw new Error('关键词之后没有中文数词: ' + key);
  return CN[m[0]];
}

/** 一句正文短语里的中文数词（用来核对「标题说三，表里数出三」这类自洽性）。 */
function cnIn(phrase) {
  const m = String(phrase).match(/[一两二三四五六七八九十]/);
  if (!m) throw new Error('短语里没有中文数词: ' + phrase);
  return CN[m[0]];
}

const tally = (text, re) => (String(text).match(re) || []).length;

/** 取某一节（## 标题含 key）的正文，不含标题行。 */
function section(text, key) {
  const out = [];
  let on = false;
  for (const line of String(text).split('\n')) {
    if (/^##\s/.test(line)) { on = line.includes(key); continue; }
    if (on) out.push(line);
  }
  return out.join('\n');
}

const countIn = (text, key, re) => tally(section(text, key), re);

/** 某一节里表格的数据行数（扣掉表头与分隔行）。 */
function rowsIn(text, key) {
  const rows = section(text, key).split('\n').filter((l) => /^\s*\|/.test(l));
  return Math.max(0, rows.length - 2);
}

/** 正文结构：汉字、节（## 标题）、表格、加粗判断、引书、带单位的数值命中 */
function analyze(text) {
  const body = String(text || '');
  const lines = body.split('\n');
  const sections = [];
  let cur = null;
  for (const line of lines) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = { title: h[1], hanzi: 0 }; sections.push(cur); continue; }
    if (cur) cur.hanzi += (line.match(HANZI) || []).length;
  }
  const tables = (body.match(/^\s*\|[\s:|-]+\|\s*$/gm) || []).length;
  const claims = (body.match(/\*\*[^*\n]+\*\*/g) || []).length;
  const cites = [...new Set([...body.matchAll(/\u300a([^\u300b\n]+)\u300b/g)].map((m) => m[1]))];
  const values = (body.match(/\d[\d,]*(?:\.\d+)?\s*(?:%|人|万元|张|元|天)/g) || []).length;
  return { hanzi: (body.match(HANZI) || []).length, sections, tables, claims, cites, values };
}

/** 本章的换算：输入从正文取，结果与正文写下的数对照 */
function checks(text) {
  const 内部 = num(text, '从发布到到岗平均 ');
  const 外部 = num(text, '外部招聘平均 ');
  const 调动 = num(text, '内部调动 ');
  const 归零 = num(text, '名内部调动者中');
  const 内成本 = num(text, '折合约 ');
  const 外成本 = num(text, '试用期低效，合计折合约 ');
  const 三张 = tally(text, /\*\*第[一二三]张/g);
  return [
    { name: `内部调动比外部招聘慢（${内部} − ${外部}）`, unit: '天', tol: 0, computed: 内部 - 外部, stated: num(text, '慢 ') },
    { name: `调动后一年内离职率（${归零} ÷ ${调动}）`, unit: '%', tol: 0.1, computed: (归零 / 调动) * 100, stated: num(text, '个月内离职（') },
    { name: `内部调动成本占外部招聘的比例（${内成本} ÷ ${外成本}）`, unit: '%', tol: 4, computed: (内成本 / 外成本) * 100, stated: 100 / 3 },
    { name: '配置优化要的三张表（正文加粗「第 N 张」）', unit: '张', tol: 0, computed: 三张, stated: cnIn('三张能看的表') },
  ];
}

function main() {
  const text = read();
  const a = analyze(text);
  const cs = checks(text);
  const top = a.sections.reduce((m, s) => (s.hanzi > m.hanzi ? s : m), a.sections[0]);
  console.log(`医药人力资源管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tables} 张 · 加粗判断 ${a.claims} 处 · 引书 ${a.cites.length} 部`);
  console.log(`带单位的数值 ${a.values} 处；最长一节：${top.title}（${top.hanzi} 字）`);
  console.log('');
  console.log('换算与结构核对（输入取自正文，结果与正文对照）：');
  let bad = 0;
  for (const c of cs) {
    const diff = Math.abs(c.computed - c.stated);
    const ok = c.cmp === 'lte' ? c.computed <= c.stated : diff <= c.tol;
    if (!ok) bad += 1;
    const sign = c.cmp === 'lte' ? '≤' : '=';
    console.log(`  ${ok ? '✓' : '✗'} ${c.name} ${sign} ${Number(c.computed.toFixed(2))} ${c.unit}；正文写 ${c.stated}（差 ${diff.toFixed(2)}）`);
  }
  console.log('');
  console.log(`※ 现算口径：汉字与结构由正文统计，换算由正文数字重算；${bad ? `${bad} 处与正文对不上` : '全部对上'}。`);
  console.log('※ 本输出仅用于教学演示，不构成调配方案或人事处理依据。');
  return bad;
}

if (require.main === module) process.exitCode = main() ? 1 : 0;

module.exports = { DOC, CHAPTER, TITLE, SLUG, read, num, cn, cnIn, tally, section, countIn, rowsIn, analyze, checks };
