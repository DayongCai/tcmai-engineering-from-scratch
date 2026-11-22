#!/usr/bin/env node
/**
 * 第 10 章 · 试用方案体检：终点三层能不能互相顶替、盲法最少要做到哪两层
 *
 *   数据: chapters/10-shiyong-baogao/docs/zh.md（本章正文，唯一数据源）
 *   运行: node code/main.js
 *
 * 现算两件事：
 *   1) 终点层级 —— 同层回答成立 3 种，跨层回答 6 种全部不成立（过程不能说准不准，
 *      结果不能说病人受益）。越级即失真，这是「效率提升」撑不起「诊疗质量提高」的原因。
 *   2) 盲法底线 —— 正文说至少做到判读者盲 + 分配隐藏，四条里占两条；缺一条结论只能算可行性数据。
 * 不编造任何样本量、效应量或试验结果。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const LAYERS = ['过程', '结果', '结局'];
const BLIND_LAYERS = ['判读者盲', '患者盲', '统计者盲', '分配隐藏'];
const BLIND_MINIMUM = ['判读者盲', '分配隐藏'];

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

/** 同层回答成立，跨层回答不成立：返回可成立的层数与越级的对数 */
function endpointPairs(layers) {
  let same = 0;
  let cross = 0;
  for (const a of layers) for (const b of layers) (a === b ? (same += 1) : (cross += 1));
  return { same, cross };
}

function audit(md = loadDoc()) {
  const secs = sections(md);
  const t = tables(md);
  const rowOf = (pred) => { const x = t.find(pred); return x ? x.rows.length : 0; };

  const endpointRows = rowOf((x) => x.header.some((h) => /能回答/.test(h)));
  const designRows = rowOf((x) => x.header.some((h) => /偏倚/.test(h)));
  const assumptionRows = rowOf((x) => x.header.some((h) => /需要事先写/.test(h)));
  const reportRows = rowOf((x) => x.header.some((h) => /为什么必须有/.test(h)));

  const pairs = endpointPairs(LAYERS);
  const blindPresent = BLIND_LAYERS.filter((k) => md.includes(k));
  const blindMinimumMet = BLIND_MINIMUM.every((k) => md.includes(k));
  const reportItems = ['版本号', '纳排标准', '终点定义', '缺失处理', '方案偏离', '不良事件'].filter((k) => md.includes(k));

  const missing = [];
  if (endpointRows !== 3) missing.push(`终点三层表 ${endpointRows} 行（应 3）`);
  if (designRows !== 4) missing.push(`对照设计表 ${designRows} 行（应 4）`);
  if (assumptionRows !== 4) missing.push(`假设类型表 ${assumptionRows} 行（应 4）`);
  if (reportRows !== 6) missing.push(`报告清单 ${reportRows} 项（应 6）`);
  if (blindPresent.length !== 4) missing.push(`盲法层次缺：${BLIND_LAYERS.filter((k) => !blindPresent.includes(k)).join('/')}`);
  if (!blindMinimumMet) missing.push('未写明盲法底线（判读者盲 + 分配隐藏）');
  if (reportItems.length !== 6) missing.push(`报告条目缺：${['版本号', '纳排标准', '终点定义', '缺失处理', '方案偏离', '不良事件'].filter((k) => !reportItems.includes(k)).join('/')}`);

  return {
    sections: secs.map((s) => s.heading),
    hanzi: hanzi(md),
    endpointRows,
    designRows,
    assumptionRows,
    reportRows,
    pairs,
    blindPresent,
    blindMinimumMet,
    reportItems,
    missing,
  };
}

function main() {
  const a = audit();
  console.log(`本章正文 ${a.sections.length - 1} 节 · ${a.hanzi} 汉字`);
  console.log('');
  console.log(`终点三层：${LAYERS.join(' → ')}（表 ${a.endpointRows} 行）`);
  console.log(`  同层回答成立 ${a.pairs.same} 种；跨层回答 ${a.pairs.cross} 种全部不成立`);
  console.log('  → 「效率提升」是过程指标，撑不起「诊疗质量提高」；越级即失真。');
  console.log('');
  console.log(`对照设计 ${a.designRows} 种 · 假设类型 ${a.assumptionRows} 种 · 报告清单 ${a.reportRows} 项`);
  console.log(`盲法层次：${a.blindPresent.join(' / ')}（${a.blindPresent.length}/4）`);
  console.log(`  底线（判读者盲 + 分配隐藏）：${a.blindMinimumMet ? '已写明' : '未写明'}`);
  console.log('');
  console.log(a.missing.length ? `缺口 ${a.missing.length} 处：${a.missing.join('；')}` : '缺口 0 处：终点分层、对照、盲法、报告四条都能落到清单上。');
  console.log('');
  console.log('※ 只核对本章正文给出的设计与报告要素，不含任何试验数据或效应量。');
  console.log('※ 本章讨论临床试用的设计与报告方法，不构成诊疗建议。');
}

if (require.main === module) main();

module.exports = { DOC, LAYERS, BLIND_LAYERS, BLIND_MINIMUM, loadDoc, sections, tables, endpointPairs, audit };
