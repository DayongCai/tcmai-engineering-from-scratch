#!/usr/bin/env node
/**
 * 第 4 章 · 概率建模体检：把正文自己给的参数量级重算一遍，再核对三处结构
 *
 *   数据: chapters/04-beiyesi-tuili/docs/zh.md（本章正文，唯一数据源）
 *   运行: node code/main.js
 *
 * 正文说「十个二值变量联合分布需要 2^10 − 1 个参数，三十个变量超过十亿」，
 * 这里直接算：2^10 − 1 = ?，2^30 − 1 到底过没过十亿，线性结构又要多少参数。
 * 再核对：先验三来源、推理三用法、结构学习四坑，是否各带失效与处置。
 * 不构造任何概率值，也不给模型打分。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

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

/** 联合分布参数量：n 个二值变量 → 2^n − 1 */
const fullJointParams = (n) => 2 ** n - 1;
/** 线性结构（每个变量只依赖类标签）：n 个二值症状 × 2 值 + 1 个先验 */
const linearParams = (n) => n * 2 + 1;

function audit(md = loadDoc()) {
  const secs = sections(md);
  const t = tables(md);
  const rowOf = (pred) => { const x = t.find(pred); return x ? x.rows.length : 0; };

  const structRows = rowOf((x) => x.header.some((h) => /参数量级/.test(h)));
  const priorRows = rowOf((x) => x.header.some((h) => /能支持什么/.test(h)) && x.header.some((h) => /不能支持什么/.test(h)));
  const usageRows = rowOf((x) => x.header.some((h) => /常见失效/.test(h)));
  const pitRows = rowOf((x) => x.header.some((h) => /处置/.test(h)) && x.header.some((h) => /症状/.test(h)));

  const priors = ['条文', '专家', '病历'].filter((k) => md.includes(k + '来源') || md.includes(k + '赋值') || md.includes(k + '统计'));
  const usages = ['诊断推理', '预测推理', '解释推理'].filter((k) => md.includes(k));
  const pitfalls = ['结构不稳', '隐藏混杂', '因果误读', '时齐'].filter((k) => md.includes(k));
  const independence = /症状在证下独立|症状在给定证型下相互独立/.test(md);
  const overBillion = fullJointParams(30) > 1e9;

  const missing = [];
  if (structRows !== 4) missing.push(`结构表 ${structRows} 行（应 4）`);
  if (priorRows !== 3) missing.push(`先验表 ${priorRows} 行（应 3）`);
  if (usageRows !== 3) missing.push(`推理用法表 ${usageRows} 行（应 3）`);
  if (pitRows !== 4) missing.push(`结构学习坑表 ${pitRows} 行（应 4）`);
  if (!independence) missing.push('没写清朴素贝叶斯的独立性假设');
  if (usages.length !== 3) missing.push(`推理用法缺：${['诊断推理', '预测推理', '解释推理'].filter((k) => !usages.includes(k)).join('/')}`);
  if (pitfalls.length !== 4) missing.push(`结构学习坑缺：${['结构不稳', '隐藏混杂', '因果误读', '时齐'].filter((k) => !pitfalls.includes(k)).join('/')}`);

  return {
    sections: secs.map((s) => s.heading),
    hanzi: hanzi(md),
    fullJoint10: fullJointParams(10),
    fullJoint30: fullJointParams(30),
    linear30: linearParams(30),
    ratio: +(fullJointParams(30) / linearParams(30)).toFixed(0),
    overBillion,
    structRows,
    priorRows,
    usageRows,
    pitRows,
    priors,
    usages,
    pitfalls,
    independence,
    missing,
  };
}

function main() {
  const a = audit();
  console.log(`本章正文 ${a.sections.length - 1} 节 · ${a.hanzi} 汉字`);
  console.log('');
  console.log('联合分布参数量（正文第一条论据，现算）：');
  console.log(`  10 个二值变量：2^10 − 1 = ${a.fullJoint10}`);
  console.log(`  30 个二值变量：2^30 − 1 = ${a.fullJoint30}　${a.overBillion ? '> 十亿，正文的「超过十亿」成立' : '未超过十亿'}`);
  console.log(`  线性结构（每症状 2 参数 + 1 先验）：${a.linear30} 个`);
  console.log(`  → 两数量级之比约 ${a.ratio.toLocaleString('en-US')} 倍，这就是必须拆条件独立的原因`);
  console.log('');
  console.log(`先验三来源：${a.priors.join(' / ')}（表 ${a.priorRows} 行）`);
  console.log(`推理三用法：${a.usages.join(' / ')}（表 ${a.usageRows} 行）`);
  console.log(`结构学习四坑：${a.pitfalls.join(' / ')}（表 ${a.pitRows} 行）`);
  console.log('');
  console.log(a.missing.length ? `缺口 ${a.missing.length} 处：${a.missing.join('；')}` : '缺口 0 处：参数量、三来源、三用法、四坑均可复算。');
  console.log('');
  console.log('※ 以上只重算正文给出的参数量级，未运行任何模型、未构造概率值。');
  console.log('※ 本章讨论概率图模型的建模方法，不构成诊断或治疗建议。');
}

if (require.main === module) main();

module.exports = { DOC, loadDoc, sections, tables, fullJointParams, linearParams, audit };
