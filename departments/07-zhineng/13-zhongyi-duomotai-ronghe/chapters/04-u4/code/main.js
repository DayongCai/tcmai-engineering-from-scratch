#!/usr/bin/env node
/**
 * 中医多模态融合 · 第 4 章：特征是压缩，压缩必须留下判据
 * 正文: departments/07-zhineng/13-zhongyi-duomotai-ronghe/chapters/04-u4/docs/zh.md
 * 取数: 解析正文开篇的三路压缩比与样本量经验规则
 * 依赖: 仅 Node.js 标准库
 *
 * 现算：每路的压缩比、按 n ≥ 10p 能给出的维数上限、拼接后超出的倍数。
 * 像素数与维数都从正文读，改一个数，压缩比随之变。
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

const n = (s) => Number(String(s).replace(/,/g, ''));

function compression(problem) {
  const tongue = problem.match(/舌象\s*([\d,]+)\s*万像素压成\s*(\d+)\s*维/);
  const pulse = problem.match(/脉图\s*([\d,]+)\s*点压成\s*(\d+)\s*维/);
  const voice = problem.match(/语音\s*([\d,.]+)\s*(万)?采样点压成\s*(\d+)\s*维/);
  const rows = [];
  if (tongue) rows.push({ name: '舌象', raw: n(tongue[1]) * 10000, dims: Number(tongue[2]), unit: '像素' });
  if (pulse) rows.push({ name: '脉图', raw: n(pulse[1]), dims: Number(pulse[2]), unit: '点' });
  if (voice) rows.push({ name: '语音', raw: n(voice[1]) * (voice[2] ? 10000 : 1), dims: Number(voice[3]), unit: '采样点' });
  return rows.map((r) => ({ ...r, ratio: r.raw / r.dims }));
}

function analyze(doc) {
  const rows = compression(doc.problem);
  const perFeature = Number((doc.text.match(/每个特征至少对应\s*(\d+)\s*个样本/) || [])[1]);
  const rule = doc.text.match(/演算设定\s*(\d+)\s*例，则特征上限约\s*(\d+)\s*维/);
  const samples = rule ? Number(rule[1]) : NaN;
  const limitStated = rule ? Number(rule[2]) : NaN;
  const limit = perFeature ? samples / perFeature : NaN;
  const assembled = doc.text.match(/四路各\s*(\d+)\s*维拼起来是\s*(\d+)\s*维/);
  const each = assembled ? Number(assembled[1]) : NaN;
  const total = assembled ? Number(assembled[2]) : NaN;
  return {
    rows,
    perFeature,
    samples,
    limitStated,
    limit,
    each,
    total,
    overFactor: total / limit,
    neededSamples: total * perFeature,
  };
}

function main() {
  const doc = parseDoc(fs.readFileSync(DOC, 'utf8'));
  const a = analyze(doc);

  console.log(`中医多模态融合 · 第 ${doc.chapterNo} 章 ${doc.title}`);
  console.log('');
  console.log(`正文 ${doc.hanzi.toLocaleString('en-US')} 汉字 · ${doc.sections.length} 节 · ${doc.tables.length} 张表`);
  console.log('');
  console.log('压缩比（原始规模 ÷ 特征维数，现算）：');
  for (const r of a.rows) {
    console.log(`  ${r.name}：${r.raw.toLocaleString('en-US')} ${r.unit} ÷ ${r.dims} 维 = ${Math.round(r.ratio).toLocaleString('en-US')} 倍`);
  }
  console.log('');
  console.log(`样本量规则 n ≥ ${a.perFeature}p：${a.samples} 例给出 ${a.limit} 维（正文写 ${a.limitStated} 维）。`);
  console.log(`  四路各 ${a.each} 维拼成 ${a.total} 维 → 超上限 ${a.overFactor.toFixed(2)} 倍，需 ${a.neededSamples} 例才撑得住。`);
  console.log('');
  console.log('※ 教学样例：数字由本章正文现算，不手打；改正文后重跑即可复现。');
  console.log('※ 特征选择须在留出集上验证，本输出不构成诊断依据。');
}

if (require.main === module) main();

module.exports = { DOC, parseDoc, analyze, compression };
