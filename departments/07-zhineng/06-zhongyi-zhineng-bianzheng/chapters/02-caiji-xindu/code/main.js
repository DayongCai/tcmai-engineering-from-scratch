#!/usr/bin/env node
/**
 * 第 2 章 · 采集契约体检：正文的十问清单、四值字段、示例采集记录，逐项在正文里核对
 *
 *   数据: chapters/02-caiji-xindu/docs/zh.md（本章正文，唯一数据源）
 *   运行: node code/main.js
 *
 * 算的都是正文里写得出的东西：十问能拆出几项、示例记录里四值各出现几次、
 * 未问率是多少、信度指标表列了几行。正文没有的项报「缺」，不补数。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const STATES = ['present', 'absent', 'not_asked', 'not_applicable'];

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
  return [...matchAll(md, re)].map((m) => m[1].trim());
}
function matchAll(text, re) { return [...String(text).matchAll(re)]; }

/** 正文「十问」清单：从「寒热、…，逐项过一遍」那一句里拆 */
function tenQuestions(md) {
  const s = sections(md).find((x) => /问诊是排查/.test(x.heading));
  const line = (s ? s.body : '').split('\n').find((l) => /寒热、/.test(l) && /逐项过一遍/.test(l));
  if (!line) return [];
  const m = line.match(/(寒热、[^，。]*?)，逐项过一遍/);
  if (!m) return [];
  return m[1].split('、').map((x) => x.trim()).filter(Boolean);
}

function audit(md = loadDoc()) {
  const secs = sections(md);
  const ten = tenQuestions(md);
  const raw = blocks(md, 'json')[0];
  let contract = null;
  let contractError = '';
  try { contract = JSON.parse(raw); } catch (e) { contractError = e.message; }

  const items = (contract && Array.isArray(contract.items)) ? contract.items : [];
  const stateCounts = Object.fromEntries(STATES.map((k) => [k, 0]));
  const badState = [];
  const missingAnchor = [];
  for (const it of items) {
    if (!it.code) missingAnchor.push('（无 code 的条目）');
    if (!STATES.includes(it.state)) { badState.push(it.state); continue; }
    stateCounts[it.state] += 1;
    if ((it.state === 'present' || it.state === 'absent') && !it.anchor) missingAnchor.push(it.code);
  }
  const total = items.length;
  const notAskedRate = total ? stateCounts.not_asked / total : null;
  const missingStates = STATES.filter((s) => stateCounts[s] === 0);

  const relTable = tables(md).find((t) => t.header.some((h) => /适用/.test(h)));
  const anchorTable = tables(md).find((t) => t.header.some((h) => /锚点要求/.test(h)));

  const missing = [];
  if (ten.length !== 10) missing.push(`十问拆出 ${ten.length} 项`);
  if (contractError) missing.push('采集契约无法解析');
  if (!items.length) missing.push('采集契约里没有条目');
  if (badState.length) missing.push(`非法取值：${badState.join('/')}`);
  if (stateCounts.absent === 0) missing.push('示例里没有 absent，阴性无从记录');
  if (stateCounts.not_asked === 0) missing.push('示例里没有 not_asked，未问与无无法区分');
  if (missingAnchor.length) missing.push(`有/无条目不完整的：${missingAnchor.join('/')}`);
  if (!relTable) missing.push('信度指标表缺失');

  return {
    sections: secs.map((s) => s.heading),
    hanzi: hanzi(md),
    ten,
    items: total,
    stateCounts,
    notAskedRate,
    missingStates,
    badState,
    missingAnchor,
    relRows: relTable ? relTable.rows.length : 0,
    anchorRows: anchorTable ? anchorTable.rows.length : 0,
    contractError,
    missing,
  };
}

function main() {
  const a = audit();
  console.log(`本章正文 ${a.sections.length - 1} 节 · ${a.hanzi} 汉字`);
  console.log('');
  console.log(`十问清单：${a.ten.length} 项（${a.ten.join('、')}）`);
  console.log('');
  console.log(`示例采集记录：${a.items} 条`);
  for (const s of STATES) console.log(`  ${s}：${a.stateCounts[s]}`);
  console.log(`  未问率：${a.notAskedRate === null ? '—' : (a.notAskedRate * 100).toFixed(1) + '%'}`);
  console.log(`  四值覆盖：${STATES.length - a.missingStates.length}/${STATES.length}${a.missingStates.length ? '，缺 ' + a.missingStates.join('/') : ''}`);
  console.log('');
  console.log(`信度指标表 ${a.relRows} 行；变量锚点表 ${a.anchorRows} 行。`);
  console.log(a.missing.length ? `缺口 ${a.missing.length} 处：${a.missing.join('；')}` : '缺口 0 处：四值、锚点、信度三条都在正文里立住了。');
  console.log('');
  console.log('※ 统计对象仅为本章正文与其中示例记录，不涉及真实病历或模型运行结果。');
  console.log('※ 本章讨论症状采集与信度评估的方法，不构成诊断或治疗建议。');
}

if (require.main === module) main();

module.exports = { DOC, STATES, loadDoc, sections, tables, blocks, tenQuestions, audit };
