#!/usr/bin/env node
/**
 * 卫生事业管理 · 第 3 章 分级诊疗不是把病人往下推，是让下面接得住
 * 课程: departments/06-guanli/04-weisheng-shiye-guanli/chapters/03-w3/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 输出从本章正文现算：汉字、节、表等文本量，以及正文里三张结构表的复算——
 * 四件事是否凑齐、四个层级的功能是否全部错位、下转在两种床位状态下的意愿、
 * 四种下沉形式里有几种是输血。这几项都是正文的论断，数字只能从表里数出来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const TITLE = '分级诊疗不是把病人往下推，是让下面接得住';

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

/** 四件事：正文写「四件事：A、B、C、D」，逐项数出来。 */
function fourThings(body) {
  const m = body.match(/四件事：([^。]+)/);
  if (!m) throw new Error('正文里没找到「四件事」的列举');
  return m[1].split('、').map((s) => s.trim()).filter(Boolean);
}

/** 层级功能表：设计功能与实际承担逐行比对，错位即两格文字不同。 */
function tierDrift(tables) {
  const t = tables.find((x) => x.header.includes('层级'));
  if (!t) throw new Error('正文里没找到层级功能对照表');
  const rows = t.rows.filter((r) => r[0]);
  const drifted = rows.filter((r) => String(r[1] || '') !== String(r[2] || '')).length;
  const shrink = rows.filter((r) => /萎缩/.test(String(r[2] || ''))).map((r) => r[0]);
  return { rows: rows.length, drifted, shrink };
}

/** 下转意愿表：两种床位状态下，愿意下转的情形有几个。 */
function referralWill(tables) {
  const t = tables.find((x) => x.header.includes('情形') && x.header.some((h) => h.includes('下转')));
  if (!t) throw new Error('正文里没找到下转得失表');
  const rows = t.rows.filter((r) => r[0]);
  const willing = rows.filter((r) => {
    const cell = String(r[r.length - 1] || '');
    return cell.includes('愿意下转') && !cell.includes('不愿下转');
  }).length;
  return { rows: rows.length, willing };
}

/** 下沉四形式：形式里带「培养」的算造血，其余算输血。 */
function sinkingForms(tables) {
  const t = tables.find((x) => x.header.includes('形式') && x.header.some((h) => h.includes('可持续')));
  if (!t) throw new Error('正文里没找到能力下沉形式表');
  const rows = t.rows.filter((r) => r[0]);
  const graft = rows.filter((r) => String(r[0]).includes('培养')).length;
  return { rows: rows.length, graft, transfuse: rows.length - graft };
}

/** 承接确认的两个指标：正文以「A与B」并列给出。 */
function handoverIndicators(body) {
  const m = body.match(/看下转病人的(四周内再入院率与随访完成率)/);
  if (!m) throw new Error('正文里没找到承接确认指标');
  return m[1].split('与').map((s) => s.trim());
}

function main() {
  const a = analyze(read());
  const body = read();
  const things = fourThings(body);
  const tiers = tierDrift(a.tables);
  const will = referralWill(a.tables);
  const sink = sinkingForms(a.tables);
  const indicators = handoverIndicators(body);

  console.log(`卫生事业管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 表格 ${a.tableCount} 张 · 加粗判断 ${a.claims} 处 · 引文 ${a.cites.length} 条`);
  console.log('');
  console.log(`四件事（${things.length} 件）：${things.join(' / ')}`);
  console.log(`层级功能表 ${tiers.rows} 行，设计功能与实际承担错位 ${tiers.drifted} 行；能力标注为萎缩的层级：${tiers.shrink.join('、') || '无'}。`);
  console.log(`下转得失 ${will.rows} 种床位状态，愿意下转的 ${will.willing} 种——这正是「一床难求时最积极」的来源。`);
  console.log(`能力下沉 ${sink.rows} 种形式：输血 ${sink.transfuse} 种、造血 ${sink.graft} 种。`);
  console.log(`承接确认看两项：${indicators.join('、')}。`);
  console.log('');
  console.log('逐节字数：');
  for (const s of a.sections) {
    const share = a.hanzi ? ((s.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(24, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成诊疗意见，也不构成对具体就医路径的建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, analyze, parseTables,
  fourThings, tierDrift, referralWill, sinkingForms, handoverIndicators,
};
