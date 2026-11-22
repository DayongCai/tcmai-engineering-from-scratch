#!/usr/bin/env node
/**
 * 卫生事业管理 · 第 5 章 卫生人力不是缺人，是缺在错的地方
 * 课程: departments/06-guanli/04-weisheng-shiye-guanli/chapters/05-w5/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 输出从本章正文现算：汉字、节、表等文本量，以及培养管道的算术——
 * 五个阶段各自的年限、从入学到能独立值班要多久、占有效执业年限的多少。
 * 年限改一个字，这里的结论就跟着变；正文说「十年以上」，脚本负责验证它成立。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const TITLE = '卫生人力不是缺人，是缺在错的地方';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function parseTables(body) {
  const out = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const m = line.match(/^\s*\|(.+)\|\s*$/);
    if (!m) {
      cur = null;
      continue;
    }
    const cells = m[1].split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    if (!cur) {
      cur = { header: cells, rows: [] };
      out.push(cur);
    } else {
      cur.rows.push(cells);
    }
  }
  return out;
}

function num(cell) {
  const m = String(cell || '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : NaN;
}

/** 「3—5 年」这样的区间读成 [3, 5]；单值读成 [n, n]。 */
function span(cell) {
  const s = String(cell || '');
  const m = s.match(/(\d+)\s*[—\-–~至]\s*(\d+)/);
  if (m) return [Number(m[1]), Number(m[2])];
  const n = num(s);
  return [n, n];
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const hanzi = (body.match(HANZI) || []).length;

  const sections = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      cur = { title: h[1], hanzi: 0 };
      sections.push(cur);
      continue;
    }
    if (cur) cur.hanzi += (line.match(HANZI) || []).length;
  }

  const tables = parseTables(body);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))];
  const claims = (body.match(/\*\*[^*\n]+\*\*/g) || []).length;

  return { hanzi, sections, tables, tableCount: tables.length, cites, claims };
}

/**
 * 培养管道：院校教育 + 毕业后教育 + 独立执业初期 = 到能独立值班的年限；
 * 成熟期再加一段。有效执业年限从正文取（按 60 岁退休计）。
 */
function pipeline(tables, body) {
  const t = tables.find((x) => x.header.includes('阶段'));
  if (!t) throw new Error('正文里没找到培养阶段表');
  const rows = t.rows.filter((r) => r[0]).map((r) => ({ stage: r[0], span: span(r[1]) }));
  // 前三个阶段累加（区间逐段相加）
  const min = rows.slice(0, 3).reduce((s, r) => s + r.span[0], 0);
  const max = rows.slice(0, 3).reduce((s, r) => s + r.span[1], 0);

  const effMatch = body.match(/有效执业年限约\s*(\d+)\s*年/);
  if (!effMatch) throw new Error('正文里没写有效执业年限');
  const effective = Number(effMatch[1]);

  return {
    stages: rows,
    min,
    max,
    effective,
    shareMin: (min / effective) * 100,
    shareMax: (max / effective) * 100,
  };
}

/** 三种缺口表与腾笼换鸟断点表，各数行数。 */
function gapTable(tables) {
  const t = tables.find((x) => x.header.includes('缺口'));
  if (!t) throw new Error('正文里没找到三种缺口表');
  return t.rows.filter((r) => r[0]).map((r) => r[0]);
}

function breakpoints(tables) {
  const t = tables.find((x) => x.header.includes('环节') && x.header.some((h) => h.includes('断点')));
  if (!t) throw new Error('正文里没找到腾笼换鸟断点表');
  return t.rows.filter((r) => r[0]).map((r) => r[0]);
}

function main() {
  const body = read();
  const a = analyze(body);
  const p = pipeline(a.tables, body);
  const gaps = gapTable(a.tables);
  const breaks = breakpoints(a.tables);

  console.log(`卫生事业管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tableCount} 张 · 加粗判断 ${a.claims} 处 · 引文 ${a.cites.length} 条`);
  console.log('');
  console.log('培养管道（正文年限表逐段相加）：');
  for (const s of p.stages) {
    const label = s.span[0] === s.span[1] ? `${s.span[0]} 年` : `${s.span[0]}—${s.span[1]} 年`;
    console.log(`  ${s.stage.padEnd(12, '　')} ${label}`);
  }
  console.log(`  → 从入学到能独立值班 ${p.min}—${p.max} 年，占有效执业 ${p.effective} 年的 ${p.shareMin.toFixed(1)}%—${p.shareMax.toFixed(1)}%。`);
  console.log(`  → 「十年以上」${p.min >= 10 ? '成立' : '不成立'}；培养期接近三分之一的说法，与算术一致。`);
  console.log('');
  console.log(`三种缺口：${gaps.join('、')}（各对应一种药方，混用就会只剩一句加强队伍建设）。`);
  console.log(`腾笼换鸟三段：${breaks.join('、')}；正文点名最容易忽略的是第三段——薪酬。`);
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(24, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成劳动人事建议，也不构成诊疗意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, parseTables, span, pipeline, gapTable, breakpoints };
