#!/usr/bin/env node
/**
 * 卫生事业管理 · 第 1 章 谁都能管，等于谁都不管：卫生管理体制的责任链
 * 课程: departments/06-guanli/04-weisheng-shiye-guanli/chapters/01-w1/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 输出全部从本章正文现算：汉字数、节数、表格数、加粗判断条数、引文条数，
 * 以及正文里那张共同事权算术表的复算结果（人口 × 人均标准 → 中央与县级分担）。
 * 表里的数一改，这里的复算就跟着变；表与文字对不上，脚本会明确报不一致。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const TITLE = '谁都能管，等于谁都不管：卫生管理体制的责任链';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** Markdown 表格切成 { header, rows }；分隔行不计。 */
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

/** 只取单元格里的第一个数（去千分位）。 */
function num(cell) {
  const m = String(cell || '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
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
 * 复算共同事权的算术：项目总额 = 常住人口 × 人均补助标准；
 * 中央分担 = 总额 × 中央比例；县级配套 = 余额。
 * 同时读回表里写的三个结果，用于核对「表算一致」。
 */
function auditSharedTask(tables) {
  const t = tables.find((x) => x.rows.some((r) => r[0] && r[0].includes('常住人口')));
  if (!t) throw new Error('正文里没找到共同事权算术表');
  const pick = (kw) => {
    const r = t.rows.find((row) => row[0] && row[0].includes(kw));
    if (!r) throw new Error('算术表缺行: ' + kw);
    return r;
  };
  const population = num(pick('常住人口')[1]); // 万人
  const perCapita = num(pick('人均补助标准')[1]); // 元/年
  const centralShare = num(pick('中央分担比例')[1]); // %

  const total = population * perCapita; // 万元
  const central = (total * centralShare) / 100;
  const county = total - central;

  const stated = {
    total: num(pick('人均补助标准')[2]),
    central: num(pick('中央分担比例')[2]),
    county: num(pick('县级配套')[2]),
  };
  const ok = Math.abs(total - stated.total) < 1e-6
    && Math.abs(central - stated.central) < 1e-6
    && Math.abs(county - stated.county) < 1e-6;

  return { population, perCapita, centralShare, total, central, county, stated, ok };
}

/** 三列对应表里，问责落到政府名下的行数（问责合并的量化）。 */
function auditAccountability(tables) {
  const t = tables.find((x) => x.header.includes('职责') || x.header.some((h) => h.includes('问责')));
  if (!t) throw new Error('正文里没找到职责-资源-问责对应表');
  const idx = t.header.findIndex((h) => h.includes('问责'));
  const rows = t.rows.filter((r) => r[0]);
  const toGovernment = rows.filter((r) => String(r[idx] || '').includes('政府')).length;
  return { rows: rows.length, columns: t.header.length, toGovernment };
}

function main() {
  const a = analyze(read());
  const arith = auditSharedTask(a.tables);
  const acc = auditAccountability(a.tables);

  console.log(`卫生事业管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tableCount} 张 · 加粗判断 ${a.claims} 处 · 引文 ${a.cites.length} 条`);
  console.log('');
  console.log(`三列对应表：${acc.rows} 行事项 × ${acc.columns} 列；问责落在政府名下的 ${acc.toGovernment} 行。`);
  console.log('→ 职责分开写、资源分开出，问责却多数合并到政府：这就是本章说的「切开、分流、合并」。');
  console.log('');
  console.log('共同事权算术复算：');
  console.log(`  常住人口 ${arith.population} 万 × 人均 ${arith.perCapita} 元 = 总额 ${arith.total} 万元（表载 ${arith.stated.total}）`);
  console.log(`  中央 ${arith.centralShare}% = ${arith.central} 万元（表载 ${arith.stated.central}）`);
  console.log(`  县级配套 ${100 - arith.centralShare}% = ${arith.county} 万元（表载 ${arith.stated.county}）`);
  console.log(`  → 表算${arith.ok ? '一致' : '不一致，须改稿'}；县级配套相当于人均 ${(arith.county / arith.population).toFixed(1)} 元。`);
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(22, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成行政决策建议，也不构成诊疗意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, parseTables, num, auditSharedTask, auditAccountability };
