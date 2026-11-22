#!/usr/bin/env node
/**
 * 第 1 章 · 判据结构体检：正文写的四种句法、三条硬判据、一条证记录，逐项在正文里核对
 *
 *   数据: chapters/01-xingshihua-guize/docs/zh.md（本章正文，唯一数据源）
 *   运行: node code/main.js
 *
 * 只统计正文里确实写着的东西：句法是否出现、表格有几行、示例记录是否把
 * required / scored / excluded_by / evidence_state 分开。正文里没有的项，
 * 一律报「缺」，不补数、不假设任何模型成绩。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const SYNTAXES = ['必具', '但见', '计分', '排除'];
const HARD = ['可标', '可分', '可退'];

const loadDoc = () => fs.readFileSync(DOC, 'utf8');
const hanzi = (s) => (String(s).match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

/** 按二级标题切段，返回 [{ heading, body }]，首段是标题与题记 */
function sections(md) {
  const out = [{ heading: '（章首）', body: [] }];
  for (const line of md.split(/\r?\n/)) {
    if (/^##\s+/.test(line)) out.push({ heading: line.replace(/^##\s+/, '').trim(), body: [] });
    else out[out.length - 1].body.push(line);
  }
  return out.map((s) => ({ heading: s.heading, body: s.body.join('\n') }));
}

/** 解析所有 markdown 表格，返回 [{ header, rows }] */
function tables(md) {
  const out = [];
  let cur = null;
  for (const line of md.split(/\r?\n/)) {
    const isRow = /^\s*\|.*\|\s*$/.test(line);
    if (!isRow) { cur = null; continue; }
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (/^[\s:|-]+$/.test(line.replace(/\|/g, ''))) continue;
    if (!cur) { cur = { header: cells, rows: [] }; out.push(cur); continue; }
    cur.rows.push(cells);
  }
  return out;
}

/** 取出指定语言的代码块内容 */
function blocks(md, lang) {
  const re = new RegExp('```' + lang + '\\n([\\s\\S]*?)```', 'g');
  return [...md.matchAll(re)].map((m) => m[1].trim());
}

function countOf(text, term) {
  return (text.match(new RegExp(term, 'g')) || []).length;
}

/** 正文中「五、形式化的三条硬判据」那一段 */
function hardSection(md) {
  return sections(md).find((s) => /三条硬判据/.test(s.heading)) || { heading: '', body: '' };
}

function audit(md = loadDoc()) {
  const secs = sections(md);
  const s5 = hardSection(md);
  const syntaxCounts = Object.fromEntries(SYNTAXES.map((k) => [k, countOf(md, k)]));
  const hardCounts = Object.fromEntries(HARD.map((k) => [k, countOf(s5.body, k)]));

  // 每种句法是否在正文里给出了「典型失效」——靠表格列数判断，不靠关键词猜
  const syntaxTable = tables(md).find((t) => t.header.some((h) => /逻辑形式/.test(h)));
  const failureColumn = syntaxTable ? syntaxTable.header.findIndex((h) => /失效/.test(h)) : -1;
  const syntaxesWithFailure = syntaxTable && failureColumn > 0
    ? syntaxTable.rows.filter((r) => r[failureColumn]).length
    : 0;

  // 示例证记录：结构是否把判据句法保住了
  const raw = blocks(md, 'json')[0];
  let record = null;
  let recordError = '';
  try { record = JSON.parse(raw); } catch (e) { recordError = e.message; }
  const criteriaKeys = record && record.criteria ? Object.keys(record.criteria) : [];
  const split = Boolean(record && record.criteria
    && Array.isArray(record.criteria.required)
    && Array.isArray(record.criteria.scored)
    && record.criteria.required !== record.criteria.scored);

  const missing = [];
  for (const k of SYNTAXES) if (!syntaxCounts[k]) missing.push(`句法「${k}」`);
  for (const k of HARD) if (!hardCounts[k]) missing.push(`硬判据「${k}」`);
  if (!split) missing.push('示例记录未把 required 与 scored 分开');
  if (!record || !record.evidence_state) missing.push('示例记录缺 evidence_state');
  if (syntaxesWithFailure < SYNTAXES.length) missing.push('句法表未逐条给出典型失效');

  return {
    sections: secs.map((s) => s.heading),
    hanzi: hanzi(md),
    tables: tables(md).length,
    syntaxCounts,
    hardCounts,
    syntaxTableRows: syntaxTable ? syntaxTable.rows.length : 0,
    syntaxesWithFailure,
    criteriaKeys,
    split,
    evidenceState: record ? record.evidence_state : null,
    recordError,
    missing,
  };
}

function main() {
  const a = audit();
  console.log(`本章正文 ${a.sections.length - 1} 节 · ${a.hanzi} 汉字 · 表格 ${a.tables} 张`);
  console.log('');
  console.log('判据句法（正文出现次数）：');
  for (const [k, v] of Object.entries(a.syntaxCounts)) console.log(`  ${k}式：${v}`);
  console.log(`  句法表 ${a.syntaxTableRows} 行，其中写明典型失效 ${a.syntaxesWithFailure} 行`);
  console.log('');
  console.log('三条硬判据（第五节内出现次数）：');
  for (const [k, v] of Object.entries(a.hardCounts)) console.log(`  ${k}：${v}`);
  console.log('');
  console.log(`示例证记录：criteria 字段 ${a.criteriaKeys.join(' / ') || '（无法解析）'}`);
  console.log(`  required 与 scored 分开：${a.split ? '是' : '否'}；evidence_state：${a.evidenceState ?? '缺'}`);
  if (a.recordError) console.log(`  解析失败：${a.recordError}`);
  console.log('');
  console.log(a.missing.length ? `缺口 ${a.missing.length} 处：${a.missing.join('；')}` : '缺口 0 处：四条句法与三条硬判据都在正文里立住了。');
  console.log('');
  console.log('※ 统计对象仅为本章正文文本，不涉及任何模型运行结果。');
  console.log('※ 本章讨论辨证信息的形式化方法，不构成诊断或治疗建议。');
}

if (require.main === module) main();

module.exports = { DOC, SYNTAXES, HARD, loadDoc, sections, tables, blocks, audit };
