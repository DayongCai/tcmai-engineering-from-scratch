#!/usr/bin/env node
/**
 * 第 9 章 · 证据链体检：正文那条示例输出，五个字段齐不齐、反对项有没有
 *
 *   数据: chapters/09-jieshi-shuchu/docs/zh.md（本章正文，唯一数据源）
 *   运行: node code/main.js
 *
 * 证据要能进解释，至少带五个字段：值、来源、时间、可信度、关系。
 * 这里逐条核对示例证据，算出字段完整率与支持/反对比，再看反事实是否写了。
 * 只核对结构，不评「解释得像不像」，那要靠复述测试与专家评审。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const FIELDS = ['item', 'value', 'source', 'time', 'reliability', 'relation'];
const RELATIONS = ['support', 'against'];

const loadDoc = () => fs.readFileSync(DOC, 'utf8');
const hanzi = (s) => (String(s).match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function sections(md) {
  const out = [{ heading: '（章首）', body: [] }];
  for (const line of md.split(/\r?\n/)) {
    if (/^##\s+/.test(line)) out.push({ heading: line.replace(/^##\s+/, '').trim(), body: [] });
    else out[out.length - 1].body.push(line);
  }
  return out.map((s) => ({ heading: s.heading, body: s.body.join('\n') }));
}

function tables(md) {
  const out = [];
  let cur = null;
  for (const line of md.split(/\r?\n/)) {
    if (!/^\s*\|.*\|\s*$/.test(line)) { cur = null; continue; }
    if (/^[\s:|-]+$/.test(line.replace(/\|/g, ''))) continue;
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (!cur) { cur = { header: cells, rows: [] }; out.push(cur); continue; }
    cur.rows.push(cells);
  }
  return out;
}

function blocks(md, lang) {
  const re = new RegExp('```' + lang + '\\n([\\s\\S]*?)```', 'g');
  return [...md.matchAll(re)].map((m) => m[1].trim());
}

/** 一条证据缺哪些字段 */
const missingFields = (ev) => FIELDS.filter((f) => ev[f] === undefined || ev[f] === null || ev[f] === '');

function audit(md = loadDoc()) {
  const secs = sections(md);
  const t = tables(md);
  const rowOf = (pred) => { const x = t.find(pred); return x ? x.rows.length : 0; };

  const raw = blocks(md, 'json')[0];
  let out = null;
  let parseError = '';
  try { out = JSON.parse(raw); } catch (e) { parseError = e.message; }

  const evidence = out && Array.isArray(out.evidence) ? out.evidence : [];
  const perItem = evidence.map((ev) => ({ item: ev.item, missing: missingFields(ev) }));
  const complete = perItem.filter((x) => x.missing.length === 0).length;
  const completeness = evidence.length ? complete / evidence.length : 0;
  const support = evidence.filter((e) => e.relation === 'support').length;
  const against = evidence.filter((e) => e.relation === 'against').length;
  const badRelation = evidence.filter((e) => !RELATIONS.includes(e.relation)).map((e) => e.item);
  const sources = [...new Set(evidence.map((e) => e.source))];
  const hasCounterfactual = Boolean(out && typeof out.counterfactual === 'string' && out.counterfactual.length > 0);

  const rows = {
    types: rowOf((x) => x.header.some((h) => /能否判对错/.test(h))),
    fields: rowOf((x) => x.header.some((h) => /缺失后果/.test(h))),
    attribution: rowOf((x) => x.header.some((h) => /主要失真/.test(h))),
    counterfactual: rowOf((x) => x.header.some((h) => /问法/.test(h))),
    evaluation: rowOf((x) => x.header.some((h) => /测法/.test(h))),
  };

  const missing = [];
  if (parseError) missing.push('示例输出无法解析');
  if (!evidence.length) missing.push('示例输出没有证据条目');
  if (completeness < 1) missing.push(`字段不完整：${perItem.filter((x) => x.missing.length).map((x) => x.item + '缺' + x.missing.join('/')).join('；')}`);
  if (against === 0) missing.push('只列支持项，解释成了单方面论证');
  if (badRelation.length) missing.push(`关系取值非法：${badRelation.join('/')}`);
  if (!hasCounterfactual) missing.push('没有写反事实');
  if (rows.types !== 3) missing.push(`三种解释表 ${rows.types} 行（应 3）`);
  if (rows.fields !== 4) missing.push(`字段缺失后果表 ${rows.fields} 行（应 4）`);
  if (rows.attribution !== 4) missing.push(`归因方法表 ${rows.attribution} 行（应 4）`);
  if (rows.counterfactual !== 3) missing.push(`反事实类型表 ${rows.counterfactual} 行（应 3）`);
  if (rows.evaluation !== 4) missing.push(`解释评估维度表 ${rows.evaluation} 行（应 4）`);

  return {
    sections: secs.map((s) => s.heading),
    hanzi: hanzi(md),
    evidence: evidence.length,
    perItem,
    completeness,
    support,
    against,
    sources,
    hasCounterfactual,
    rows,
    parseError,
    missing,
  };
}

function main() {
  const a = audit();
  console.log(`本章正文 ${a.sections.length - 1} 节 · ${a.hanzi} 汉字`);
  console.log('');
  console.log(`示例证据 ${a.evidence} 条 · 字段完整率 ${(a.completeness * 100).toFixed(0)}%`);
  for (const it of a.perItem) console.log(`  ${it.item}：${it.missing.length ? '缺 ' + it.missing.join('/') : '字段齐'}`);
  console.log(`支持项 ${a.support} 条 · 反对项 ${a.against} 条 · 来源 ${a.sources.join('/')}`);
  console.log(`反事实：${a.hasCounterfactual ? '已写' : '缺'}`);
  console.log('');
  console.log(`三种解释 ${a.rows.types} 行 · 归因失真 ${a.rows.attribution} 种 · 反事实类型 ${a.rows.counterfactual} 种 · 评估维度 ${a.rows.evaluation} 个`);
  console.log('');
  console.log(a.missing.length ? `缺口 ${a.missing.length} 处：${a.missing.join('；')}` : '缺口 0 处：字段、反对项、反事实三样都在，解释可被反驳。');
  console.log('');
  console.log('※ 只核对本章示例证据的结构，不含任何模型归因结果。');
  console.log('※ 本章讨论可解释输出的设计方法，不构成诊断或治疗建议。');
}

if (require.main === module) main();

module.exports = { DOC, FIELDS, RELATIONS, loadDoc, sections, tables, blocks, missingFields, audit };
