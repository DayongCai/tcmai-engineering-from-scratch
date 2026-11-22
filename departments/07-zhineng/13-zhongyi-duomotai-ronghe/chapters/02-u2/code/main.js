#!/usr/bin/env node
/**
 * 中医多模态融合 · 第 2 章：采集链上掉一次时钟，融合就少一分可信
 * 正文: departments/07-zhineng/13-zhongyi-duomotai-ronghe/chapters/02-u2/docs/zh.md
 * 取数: 解析本章的六段链路表、质控指标表与正文给出的合格率
 * 依赖: 仅 Node.js 标准库
 *
 * 现算整链合格率、每千例废数、可补救与不可补救的段数、脉图误差预算。
 * 单环合格率是从正文那句话读出来的，不是写在脚本里的常量。
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

const pickTable = (doc, word) => doc.tables.find((t) => t[0] && t[0].some((c) => c.includes(word)));

function analyze(doc) {
  const chain = pickTable(doc, '可事后补救') || [];
  const rows = chain.slice(1);
  const passRate = Number((doc.problem.match(/合格率都是\s*([\d.]+)\s*%/) || [])[1]);
  const stages = rows.length;
  const chainYield = Math.pow(passRate / 100, stages);
  const wastePerThousand = Math.round((1 - chainYield) * 1000);
  const unrecoverable = rows.filter((r) => /否/.test(r[4] || '')).length;
  const recoverable = rows.filter((r) => /^是/.test(r[4] || '')).length;
  const partial = rows.filter((r) => /部分/.test(r[4] || '')).length;
  const qc = (pickTable(doc, '演算设定阈值') || []).slice(1).length;
  return { rows, stages, passRate, chainYield, wastePerThousand, unrecoverable, recoverable, partial, qc };
}

function errorBudget(doc) {
  const rate = Number((doc.text.match(/脉图\s*(\d+)\s*Hz/) || [])[1]);
  const m = doc.text.match(/周期的\s*(\d+)%（(\d+)\s*ms）/);
  const driftMs = m ? Number(m[2]) : NaN;
  const cyclePct = m ? Number(m[1]) : NaN;
  const periodMs = 1000 / rate;
  return { rate, periodMs, driftMs, cyclePct, spreadPoints: driftMs / periodMs };
}

function main() {
  const doc = parseDoc(fs.readFileSync(DOC, 'utf8'));
  const a = analyze(doc);
  const e = errorBudget(doc);

  console.log(`中医多模态融合 · 第 ${doc.chapterNo} 章 ${doc.title}`);
  console.log('');
  console.log(`正文 ${doc.hanzi.toLocaleString('en-US')} 汉字 · ${doc.sections.length} 节 · ${doc.tables.length} 张表`);
  console.log('');
  console.log(`链路 ${a.stages} 段，单环合格率 ${a.passRate}%`);
  console.log(`  整链 = ${(a.passRate / 100).toFixed(2)}^${a.stages} = ${a.chainYield.toFixed(4)}`);
  console.log(`  → 每 1,000 例约 ${a.wastePerThousand} 例在某个环节已经废了`);
  console.log('');
  console.log('可补救性（读自链路表最后一列）：');
  console.log(`  不可事后补救：${a.unrecoverable} 段`);
  console.log(`  部分可补救：${a.partial} 段`);
  console.log(`  可重传或补录：${a.recoverable} 段`);
  console.log(`  → 结论：${a.unrecoverable > a.recoverable ? '力气要花在不能修的地方' : '力气花在能修的地方即可'}`);
  console.log('');
  console.log(`质控指标 ${a.qc} 项，均不依赖标签，可在现场拒收。`);
  console.log(`脉图误差预算：${e.rate} Hz → 每点 ${e.periodMs} ms；周期的 ${e.cyclePct}%（${e.driftMs} ms）跨 ${e.spreadPoints} 个采样点。`);
  console.log('');
  console.log('※ 教学样例：数字由本章正文现算，不手打；改正文后重跑即可复现。');
  console.log('※ 阈值随设备与人群重新标定，本输出不构成设备操作规范或临床建议。');
}

if (require.main === module) main();

module.exports = { DOC, parseDoc, analyze, errorBudget, pickTable };
