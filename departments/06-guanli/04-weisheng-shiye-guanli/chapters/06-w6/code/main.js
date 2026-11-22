#!/usr/bin/env node
/**
 * 卫生事业管理 · 第 6 章 支付方式是一根杠杆，撬动的是医生的手
 * 课程: departments/06-guanli/04-weisheng-shiye-guanli/chapters/06-w6/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 输出从本章正文现算：汉字、节、表等文本量，以及正文风险调整算例的复算——
 * 支付标准减实际成本得到盈亏，合并症病例要上浮多少才不亏。
 * 算例是讲义里唯一能算的地方，也是「不调整就推诿」这句话的全部依据。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const TITLE = '支付方式是一根杠杆，撬动的是医生的手';

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

/** 负号有 U+2212（−）与 ASCII 两种写法，统一后再取数。 */
function num(cell) {
  const s = String(cell || '').replace(/,/g, '').replace(/[−–—]/g, '-');
  const m = s.match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : NaN;
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
 * 风险调整算例：盈亏 = 支付标准 − 实际成本；
 * 合并症病例要多少上浮才不亏 = 成本 ÷ 支付标准 − 1。
 * 同时核对表里写的盈亏，避免正文自相矛盾。
 */
function riskAdjustment(tables) {
  const t = tables.find((x) => x.header.some((h) => h.includes('实际成本')));
  if (!t) throw new Error('正文里没找到风险调整算例表');
  const idx = (kw) => t.header.findIndex((h) => h.includes(kw));
  const ic = idx('实际成本');
  const ip = idx('支付标准');
  const ig = idx('盈亏');
  const cases = t.rows.filter((r) => r[0]).map((r) => ({
    name: r[0],
    cost: num(r[ic]),
    pay: num(r[ip]),
    stated: num(r[ig]),
  }));
  for (const c of cases) c.surplus = c.pay - c.cost;
  const ok = cases.every((c) => Math.abs(c.surplus - c.stated) < 1e-6);
  const worst = cases.reduce((m, c) => (c.surplus < m.surplus ? c : m), cases[0]);
  const uplift = (worst.cost / worst.pay - 1) * 100;
  return { cases, ok, worst, uplift };
}

/** 支付方式表与基金购买策略表，各数行数（正文的四种应对、三种策略）。 */
function paymentMethods(tables) {
  const t = tables.find((x) => x.header.some((h) => h.includes('核心激励')));
  if (!t) throw new Error('正文里没找到支付方式对照表');
  return t.rows.filter((r) => r[0]).map((r) => r[0]);
}

function purchaseStrategies(tables) {
  const t = tables.find((x) => x.header.includes('策略'));
  if (!t) throw new Error('正文里没找到基金购买策略表');
  return t.rows.filter((r) => r[0]).map((r) => r[0]);
}

function main() {
  const a = analyze(read());
  const r = riskAdjustment(a.tables);
  const methods = paymentMethods(a.tables);
  const strategies = purchaseStrategies(a.tables);

  console.log(`卫生事业管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tableCount} 张 · 加粗判断 ${a.claims} 处 · 引文 ${a.cites.length} 条`);
  console.log('');
  console.log('风险调整算例复算（盈亏 = 支付标准 − 实际成本）：');
  for (const c of r.cases) {
    const sign = c.surplus >= 0 ? '+' : '';
    console.log(`  ${c.name}：${c.pay} − ${c.cost} = ${sign}${c.surplus} 元（表载 ${c.stated}）`);
  }
  console.log(`  → 表算${r.ok ? '一致' : '不一致，须改稿'}；最亏的一类要上浮 ${r.uplift.toFixed(0)}% 才不亏，这就是风险调整的必要性。`);
  console.log('');
  console.log(`支付方式 ${methods.length} 种：${methods.join('、')}。`);
  console.log(`基金购买策略 ${strategies.length} 种：${strategies.join('、')}；正文的判断是压价最快、买值最持久。`);
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(24, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成诊疗意见，也不构成保险或投资建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, analyze, parseTables, num,
  riskAdjustment, paymentMethods, purchaseStrategies,
};
