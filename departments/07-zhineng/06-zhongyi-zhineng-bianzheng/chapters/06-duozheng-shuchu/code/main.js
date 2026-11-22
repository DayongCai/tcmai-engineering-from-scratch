#!/usr/bin/env node
/**
 * 第 6 章 · 输出结构体检：四种「多」能不能被字段表达，以及 softmax 到底封掉了多少组合
 *
 *   数据: chapters/06-duozheng-shuchu/docs/zh.md（本章正文，唯一数据源）
 *   运行: node code/main.js
 *
 * 两处现算：
 *   1) 输出组合数：k 个候选证型，独立 sigmoid 可表达 2^k 种并存组合，softmax 只能表达 k 种。
 *   2) 正文示例输出：主证、兼证、备选三者的分数是否有序，支持项与反对项是否都在。
 * 检查的都是字段够不够表达「主从 + 时序」，不评估任何模型的判别能力。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const RELATIONS = ['合病', '并病', '兼夹', '转化'];
const OUTPUT_BLOCKS = ['primary', 'secondary', 'conflicts', 'status', 'alt'];

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

/** 独立判定可表达的组合数；互斥输出只能表达单个标签 */
const independentCombos = (k) => 2 ** k;
const exclusiveOutputs = (k) => k;

function audit(md = loadDoc()) {
  const secs = sections(md);
  const t = tables(md);
  const rowOf = (pred) => { const x = t.find(pred); return x ? x.rows.length : 0; };

  const relationRows = rowOf((x) => x.header.some((h) => /时间结构/.test(h)));
  const constraintRows = rowOf((x) => x.header.some((h) => /强度/.test(h)));
  const metricRows = rowOf((x) => x.header.some((h) => /惩罚什么/.test(h)));

  const raw = blocks(md, 'json')[0];
  let out = null;
  let parseError = '';
  try { out = JSON.parse(raw); } catch (e) { parseError = e.message; }
  const keys = out ? Object.keys(out) : [];
  const support = out && out.primary && Array.isArray(out.primary.support) ? out.primary.support.length : 0;
  const against = out && out.primary && Array.isArray(out.primary.against) ? out.primary.against.length : 0;
  const ordered = Boolean(out && out.primary && Array.isArray(out.secondary) && Array.isArray(out.alt)
    && out.secondary.every((s) => s.score <= out.primary.score)
    && out.alt.every((a) => a.score <= out.primary.score));
  const altHasWhyNot = Boolean(out && Array.isArray(out.alt) && out.alt.length && out.alt.every((a) => a.why_not));

  const k = 5;
  const missing = [];
  for (const key of OUTPUT_BLOCKS) if (!keys.includes(key)) missing.push(`输出缺 ${key} 字段`);
  if (against === 0) missing.push('示例只列支持项，没有反对项');
  if (!ordered) missing.push('主证与兼证/备选的分数关系不成立');
  if (!altHasWhyNot) missing.push('备选没有 why_not');
  if (relationRows !== 4) missing.push(`四种关系表 ${relationRows} 行（应 4）`);
  if (constraintRows !== 5) missing.push(`约束表 ${constraintRows} 行（应 5）`);
  if (metricRows !== 5) missing.push(`多标签指标表 ${metricRows} 行（应 5）`);
  const relsMissing = RELATIONS.filter((r) => !md.includes(r));
  if (relsMissing.length) missing.push(`关系缺：${relsMissing.join('/')}`);

  return {
    sections: secs.map((s) => s.heading),
    hanzi: hanzi(md),
    relationRows,
    constraintRows,
    metricRows,
    keys,
    support,
    against,
    ordered,
    altHasWhyNot,
    k,
    independent: independentCombos(k),
    exclusive: exclusiveOutputs(k),
    relations: RELATIONS,
    parseError,
    missing,
  };
}

function main() {
  const a = audit();
  console.log(`本章正文 ${a.sections.length - 1} 节 · ${a.hanzi} 汉字`);
  console.log('');
  console.log(`输出组合空间（${a.k} 个候选证型）：`);
  console.log(`  独立判定（sigmoid）：${a.independent} 种并存组合`);
  console.log(`  互斥输出（softmax）：${a.exclusive} 种（每例只给一个证）`);
  console.log('  → 互斥输出封掉了合病、并病、兼夹三类关系的表达位');
  console.log('');
  console.log('四种「多」：' + a.relations.join(' / ') + `（表 ${a.relationRows} 行）`);
  console.log(`约束强度表 ${a.constraintRows} 行 · 多标签指标表 ${a.metricRows} 行`);
  console.log('');
  console.log(`示例输出字段：${a.keys.join(' / ') || '（无法解析）'}`);
  console.log(`  主证支持项 ${a.support} 条 · 反对项 ${a.against} 条 · 分数有序：${a.ordered ? '是' : '否'} · 备选带 why_not：${a.altHasWhyNot ? '是' : '否'}`);
  console.log('');
  console.log(a.missing.length ? `缺口 ${a.missing.length} 处：${a.missing.join('；')}` : '缺口 0 处：主从、时序、反对项与不确定都有位置。');
  console.log('');
  console.log('※ 组合数只是输出层可表达的空间大小，不代表任何模型的准确率。');
  console.log('※ 本章讨论多证并存时的输出设计，不构成诊断或治疗建议。');
}

if (require.main === module) main();

module.exports = { DOC, RELATIONS, OUTPUT_BLOCKS, loadDoc, sections, tables, blocks, independentCombos, exclusiveOutputs, audit };
