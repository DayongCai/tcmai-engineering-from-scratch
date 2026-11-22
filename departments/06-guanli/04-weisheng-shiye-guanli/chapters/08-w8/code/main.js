#!/usr/bin/env node
/**
 * 卫生事业管理 · 第 8 章 并重写在方针里，落在编制与支付上
 * 课程: departments/06-guanli/04-weisheng-shiye-guanli/chapters/08-w8/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 输出从本章正文现算：汉字、节、表等文本量，以及几处结构性计数——
 * 三道窄门、三种筹资模式、四个比较的坑、四道移植的坎，以及正文点名的短板。
 * 这些是本章的骨架，数不出来说明正文只是把名目摆了一遍。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const TITLE = '并重写在方针里，落在编制与支付上';

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

/** 三道窄门：正文 PROBLEM 里以「A、B、C」并列给出。 */
function threeGates(body) {
  const m = body.match(/三道窄门：([^。]+)/);
  if (!m) throw new Error('正文里没找到三道窄门');
  return m[1].split('、').map((s) => s.trim());
}

/** 三种筹资模式：表里逐行读出。 */
function financingModes(tables) {
  const t = tables.find((x) => x.header.some((h) => h.includes('主要资金来源')));
  if (!t) throw new Error('正文里没找到筹资模式表');
  return t.rows.filter((r) => r[0]).map((r) => r[0]);
}

/** 比较的四个坑：正文以「其一」「其二」标注。 */
function comparisonPits(body) {
  return [...body.matchAll(/其([一二三四])，([^。]+)。/g)].map((m) => ({ n: m[1], name: m[2] }));
}

/** 四道坎：正文用加粗词标出，并点名最易低估的一项。 */
function transplantGates(body) {
  const m = body.match(/移植不是不可能，但要过四道坎。([\s\S]*?)四道坎里/);
  if (!m) throw new Error('正文里没找到四道坎的列举');
  const gates = [...m[1].matchAll(/^\*\*([^*]+)。\*\*/gm)].map((x) => x[1]);
  const weak = body.match(/四道坎里，([^，。]{1,8})最容易被低估/);
  return { gates, weakest: weak ? weak[1] : null };
}

/** 比较用的四个指标。 */
function indicators(tables) {
  const t = tables.find((x) => x.header.some((h) => h.includes('反映什么')));
  if (!t) throw new Error('正文里没找到比较指标表');
  return t.rows.filter((r) => r[0]).map((r) => r[0]);
}

function main() {
  const body = read();
  const a = analyze(body);
  const gates = threeGates(body);
  const modes = financingModes(a.tables);
  const pits = comparisonPits(body);
  const tg = transplantGates(body);
  const inds = indicators(a.tables);

  console.log(`卫生事业管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tableCount} 张 · 加粗判断 ${a.claims} 处 · 引文 ${a.cites.length} 条`);
  console.log('');
  console.log(`并重落地要过 ${gates.length} 道窄门：${gates.join('、')}`);
  console.log(`筹资模式 ${modes.length} 种：${modes.join('、')}；正文的结论是没有优劣，只有匹配。`);
  console.log(`国际比较的坑 ${pits.length} 个：${pits.map((p) => p.name).join('、')}`);
  console.log(`比较指标 ${inds.length} 个：${inds.join('、')}；四个一起看，结论才稳。`);
  console.log(`制度移植 ${tg.gates.length} 道坎：${tg.gates.join('、')}；正文点名最易低估的是「${tg.weakest}」。`);
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(24, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成诊疗意见，也不构成对任何国家制度优劣的最终判断。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, analyze, parseTables,
  threeGates, financingModes, comparisonPits, transplantGates, indicators,
};
