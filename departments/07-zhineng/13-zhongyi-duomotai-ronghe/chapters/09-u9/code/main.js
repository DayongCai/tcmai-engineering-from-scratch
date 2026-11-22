#!/usr/bin/env node
/**
 * 中医多模态融合 · 第 9 章：说多模态更好之前，先让它可被反驳
 * 正文: departments/07-zhineng/13-zhongyi-duomotai-ronghe/chapters/09-u9/docs/zh.md
 * 取数: 解析正文开篇的 AUROC 与置信区间、性能—缺失率曲线、效能表
 * 依赖: 仅 Node.js 标准库
 *
 * 现算：增益是否跨过零、缺失曲线的交叉点、检出各差值所需的样本与现有样本的 power。
 * 「不显著」这个判断由区间端点比较得出，不是写死的字符串。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

function parseDoc(text) {
  const lines = String(text).split(/\r?\n/);
  const titleLine = lines.find((l) => /^#\s+/.test(l)) || '';
  const heading = titleLine.replace(/^#\s+/, '').trim();
  const chapterNo = Number((heading.match(/第\s*(\d+)\s*章/) || [])[1]) || null;
  const title = heading.replace(/^第\s*\d+\s*章\s*·?\s*/, '');
  const problem = (text.match(/\*\*PROBLEM:\*\*\s*([\s\S]*?)\r?\n\r?\n/) || [])[1] || '';
  const sections = lines.filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
  const tables = [];
  let cur = null;
  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith('|')) { cur = null; continue; }
    const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    if (!cur) { cur = []; tables.push(cur); }
    cur.push(cells);
  }
  const hanzi = (text.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
  return { text, title, chapterNo, problem, sections, tables, hanzi };
}

const nums = (s) => (String(s).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/g) || []).map(Number);

function missingCurve(doc) {
  const t = doc.tables.find((x) => x[0] && x[0].some((c) => c.includes('缺失率')));
  if (!t) return [];
  return t.slice(1).map((r) => {
    const n = nums(r[0]);
    const f = nums(r[1]);
    const l = nums(r[2]);
    const g = nums(r[3]);
    return { rate: n[0], fusion: f[0], late: l[0], tongue: g[0] };
  });
}

function powerTable(doc) {
  const t = doc.tables.find((x) => x[0] && x[0].some((c) => c.includes('power')));
  if (!t) return [];
  return t.slice(1).map((r) => {
    const d = nums(r[0]);
    const n = nums(r[1]);
    const p = nums(r[2]);
    return { delta: d[0], need: n[0], power: p[0] };
  });
}

function analyze(doc) {
  const full = Number((doc.problem.match(/全模态 AUROC\s*([\d.]+)/) || [])[1]);
  const single = Number((doc.problem.match(/最好的单模态\s*([\d.]+)/) || [])[1]);
  const ciM = doc.problem.match(/置信区间是\s*[\[［]\s*([−-]?[\d.]+)\s*,\s*([\d.]+)\s*[\]］]/);
  const ci = ciM ? [Number(ciM[1].replace('−', '-')), Number(ciM[2])] : [];
  const n = Number((doc.problem.match(/n\s*=\s*(\d+)/) || [])[1]);
  const curve = missingCurve(doc);
  const cross = curve.find((r) => r.tongue > r.fusion);
  const powers = powerTable(doc);
  const at300 = powers.find((p) => p.delta === 0.02);
  return {
    full, single, delta: full - single, ci,
    spansZero: ci.length === 2 && ci[0] < 0 && ci[1] > 0,
    n, curve,
    crossover: cross ? cross.rate : NaN,
    powers, at300,
    underpowered: at300 ? at300.power < 0.8 && at300.need > n : false,
  };
}

function main() {
  const doc = parseDoc(fs.readFileSync(DOC, 'utf8'));
  const a = analyze(doc);

  console.log(`中医多模态融合 · 第 ${doc.chapterNo} 章 ${doc.title}`);
  console.log('');
  console.log(`正文 ${doc.hanzi.toLocaleString('en-US')} 汉字 · ${doc.sections.length} 节 · ${doc.tables.length} 张表`);
  console.log('');
  console.log(`全模态 ${a.full} vs 最佳单模态 ${a.single} → 增益 ${a.delta.toFixed(2)}。`);
  console.log(`  95% CI [${a.ci[0]}, ${a.ci[1]}]，n = ${a.n} → 跨过零：${a.spansZero ? '是（与无差别不可区分）' : '否'}`);
  console.log('');
  console.log('性能—缺失率曲线（融合 / 晚期 / 退化到舌象）：');
  for (const r of a.curve) console.log(`  ${r.rate}%：${r.fusion} / ${r.late} / ${r.tongue}`);
  console.log(`  → 退化到舌象首次反超全模态融合的缺失率：${a.crossover}%`);
  console.log('');
  console.log('效能（300 例时）：');
  for (const p of a.powers) console.log(`  ΔAUROC ${p.delta}：需 ${p.need} 例，实际 power ${p.power}`);
  console.log(`  → 检出 ${a.at300.delta} 的差异${a.underpowered ? '属于样本量不足，而不是没有差异' : '尚可'}。`);
  console.log('');
  console.log('※ 教学样例：数字由本章正文现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出不构成临床效能结论或产品性能评价。');
}

if (require.main === module) main();

module.exports = { DOC, parseDoc, analyze, missingCurve, powerTable };
