#!/usr/bin/env node
/**
 * 第 8 章 · 阈值体检：把正文「漏判代价是误判九倍 → 阈值降到 0.1 附近」现算一遍
 *
 *   数据: chapters/08-anquan-daijia/docs/zh.md（本章正文，唯一数据源）
 *   运行: node code/main.js
 *
 * 正文给的判据是 p / (1 − p) > C_FP / C_FN，等价于 p > C_FP / (C_FP + C_FN)。
 * 于是代价比 1 : 9 的阈值是 1/10 = 0.1 —— 这不是经验值，是算出来的。
 * 再核对：三类高危错误、四种失效、五个监测数、四条红线是否都在正文里。
 * 不评估任何系统的灵敏度，也不给对照组数据。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CN_DIGITS = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

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

/** 中文数字（一到十）→ 阿拉伯数字 */
function cnToInt(s) {
  const t = String(s).trim();
  if (CN_DIGITS[t] !== undefined) return CN_DIGITS[t];
  if (/^\d+$/.test(t)) return Number(t);
  if (t.length === 2 && t[0] === '十') return 10 + (CN_DIGITS[t[1]] || 0);
  if (t.length === 2 && t[1] === '十') return (CN_DIGITS[t[0]] || 0) * 10;
  if (t.length === 3 && t[1] === '十') return (CN_DIGITS[t[0]] || 0) * 10 + (CN_DIGITS[t[2]] || 0);
  return NaN;
}

/** 判正类的期望代价最小处，即阈值 C_FP / (C_FP + C_FN) */
const costThreshold = (cfp, cfn) => cfp / (cfp + cfn);
/** 给定概率下的期望代价对比：判正 vs 判负 */
const expectedCost = (p, cfp, cfn) => ({ positive: cfp * (1 - p), negative: cfn * p });

/** 从正文取「漏判的代价是误判的 X 倍，阈值就应降到 Y 附近」 */
function costClaim(md) {
  const sec = sections(md).find((s) => /把代价写成矩阵/.test(s.heading));
  const body = sec ? sec.body : '';
  const m = body.match(/漏判的代价是误判的([一二两三四五六七八九十\d]+)倍，阈值就应降到\s*([\d.]+)\s*附近/);
  if (!m) return null;
  return { ratio: cnToInt(m[1]), threshold: Number(m[2]) };
}

function audit(md = loadDoc()) {
  const secs = sections(md);
  const t = tables(md);
  const rowOf = (pred) => { const x = t.find(pred); return x ? x.rows.length : 0; };

  const claim = costClaim(md);
  const computed = claim ? costThreshold(1, claim.ratio) : null;
  const agrees = Boolean(claim && Math.abs(computed - claim.threshold) < 1e-9);

  const ladder = [1, 3, 9, 20].map((r) => ({ ratio: `1:${r}`, threshold: +costThreshold(1, r).toFixed(4) }));

  const highRiskRows = rowOf((x) => x.header.some((h) => /识别信号/.test(h)));
  const failRows = rowOf((x) => x.header.some((h) => /触发条件/.test(h)));

  const monitorSec = secs.find((s) => /失效模式/.test(s.heading));
  const monitorLine = (monitorSec ? monitorSec.body : '').split('\n').find((l) => /监测要落到可执行的几个数/.test(l)) || '';
  const monitorItems = monitorLine.replace(/^.*?：/, '').split('。')[0].split('、').map((s) => s.trim()).filter(Boolean);

  const redSec = secs.find((s) => /人机分工与红线/.test(s.heading));
  const redLines = (redSec ? redSec.body : '').split('\n').filter((l) => /^-\s+/.test(l)).map((l) => l.replace(/^-\s+/, ''));

  const formula = blocks(md, 'text').join('\n');
  const missing = [];
  if (!claim) missing.push('没取出「九倍 → 0.1」这条判据');
  else if (!agrees) missing.push(`重算阈值 ${computed} 与正文 ${claim.threshold} 不一致`);
  if (!/C_FP\s*\/\s*C_FN/.test(formula)) missing.push('正文没写出代价比的判据式');
  if (highRiskRows !== 3) missing.push(`高危错误表 ${highRiskRows} 行（应 3）`);
  if (failRows !== 4) missing.push(`失效模式表 ${failRows} 行（应 4）`);
  if (monitorItems.length !== 5) missing.push(`监测数 ${monitorItems.length} 个（正文说五个）`);
  if (redLines.length !== 4) missing.push(`红线 ${redLines.length} 条（应 4）`);

  return {
    sections: secs.map((s) => s.heading),
    hanzi: hanzi(md),
    claim,
    computed,
    agrees,
    ladder,
    highRiskRows,
    failRows,
    monitorItems,
    redLines,
    missing,
  };
}

function main() {
  const a = audit();
  console.log(`本章正文 ${a.sections.length - 1} 节 · ${a.hanzi} 汉字`);
  console.log('');
  if (a.claim) {
    console.log(`正文判据：漏判代价是误判的 ${a.claim.ratio} 倍 → 阈值 ${a.claim.threshold}`);
    console.log(`  按 p > C_FP/(C_FP+C_FN) 重算：1/(1+${a.claim.ratio}) = ${a.computed} → ${a.agrees ? '一致' : '不一致'}`);
  }
  console.log('');
  console.log('代价比 → 阈值（同一公式）：');
  for (const row of a.ladder) console.log(`  ${row.ratio}：${row.threshold}`);
  console.log('  → 漏判越贵，阈值越低；所以阈值必须按证型分别设，不能统一 0.5。');
  console.log('');
  console.log(`高危错误 ${a.highRiskRows} 类 · 失效模式 ${a.failRows} 种`);
  console.log(`监测数：${a.monitorItems.length} 个 —— ${a.monitorItems.join('；')}`);
  console.log(`红线：${a.redLines.length} 条`);
  console.log('');
  console.log(a.missing.length ? `缺口 ${a.missing.length} 处：${a.missing.join('；')}` : '缺口 0 处：阈值可复算，三类错误、四类失效、五个监测数、四条红线齐全。');
  console.log('');
  console.log('※ 以上只算代价比与阈值的关系，不含任何系统的灵敏度或对照组结果。');
  console.log('※ 本章讨论辅助辨证系统的安全设计，不构成诊断或治疗建议。');
}

if (require.main === module) main();

module.exports = { DOC, loadDoc, sections, tables, blocks, cnToInt, costThreshold, expectedCost, costClaim, audit };
