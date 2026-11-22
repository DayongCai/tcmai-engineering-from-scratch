#!/usr/bin/env node
/**
 * 卫生事业管理 · 第 4 章 公共卫生买的是项目，健康要的是结果
 * 课程: departments/06-guanli/04-weisheng-shiye-guanli/chapters/04-w4/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 输出从本章正文现算：汉字、节、表等文本量，以及三处结构性计数——
 * 死档的四层成因、项目表的行数、应急能力的四要素、处置闭环的三个及时率。
 * 这些都是正文的论断，数不出来就说明正文没写清。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const TITLE = '公共卫生买的是项目，健康要的是结果';

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

/** 死档四层：正文用「第一层，…」到「第四层，…」逐层交代。 */
function deadLayers(body) {
  const out = [];
  for (const m of body.matchAll(/第([一二三四五])层，([^。]{2,20})。/g)) {
    out.push({ n: m[1], name: m[2] });
  }
  return out;
}

/** 项目表：可交付的动作与想要的结果逐行对照。 */
function projectRows(tables) {
  const t = tables.find((x) => x.header.some((h) => h.includes('可交付')));
  if (!t) throw new Error('正文里没找到项目-动作-结果对照表');
  return t.rows.filter((r) => r[0]).map((r) => r[0]);
}

/** 应急四要素：监测、储备、演练、授权。 */
function emergencyElements(tables) {
  const t = tables.find((x) => x.header.includes('要素'));
  if (!t) throw new Error('正文里没找到应急要素表');
  const rows = t.rows.filter((r) => r[0]).map((r) => r[0]);
  return { rows: rows.length, names: rows };
}

/** 处置闭环的三个及时率。 */
function timelinessIndicators(body) {
  const m = body.match(/(报告及时率、流调及时率、管理完成率)/);
  if (!m) throw new Error('正文里没找到三个及时率');
  return m[1].split('、');
}

function main() {
  const body = read();
  const a = analyze(body);
  const layers = deadLayers(body);
  const projects = projectRows(a.tables);
  const em = emergencyElements(a.tables);
  const rates = timelinessIndicators(body);

  console.log(`卫生事业管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tableCount} 张 · 加粗判断 ${a.claims} 处 · 引文 ${a.cites.length} 条`);
  console.log('');
  console.log(`项目对照表 ${projects.length} 行：${projects.join('、')}`);
  console.log('→ 动作都在基层手里，结果由药品可及性、居民依从性、上级医院水平、经济条件共同决定。');
  console.log('');
  console.log(`死档成因 ${layers.length} 层：${layers.map((l) => `第${l.n}层 ${l.name}`).join('；')}`);
  console.log(`应急能力 ${em.rows} 要素：${em.names.join('、')}；正文点名的短板是第四项——授权。`);
  console.log(`处置闭环 ${rates.length} 个及时率：${rates.join('、')}。`);
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(24, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成诊疗意见，也不构成对具体防控措施的建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, analyze, parseTables,
  deadLayers, projectRows, emergencyElements, timelinessIndicators,
};
