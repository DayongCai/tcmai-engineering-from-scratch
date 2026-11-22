#!/usr/bin/env node
/**
 * 大模型与中医智能体 · 第 8 章 对齐不是让模型更聪明，是让它在该停的地方停
 * 课程: departments/07-zhineng/10-llm-yu-zhongyi-zhinengti/chapters/08-llm8/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现读并复算四件事：
 *   ① 越权率与其抽样区间（七次越界到底估得准不准）；
 *   ② 对齐税的量化口径（掉几个点是成本，收益在边界表）；
 *   ③ 偏好标注一致性：200 对、0.65，一致与分歧各多少；
 *   ④ 分层拒答率：单看总率会漏掉「只是保守、没有区分能力」。
 * 拒答分级的等级与处理是正文表原样读出；示例日志是教学构造，不是任何系统的日志。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const readDoc = () => fs.readFileSync(DOC, 'utf8');
const toInt = (s) => Number(String(s).replace(/,/g, ''));

/** 「在 100 次问诊式对话里有 7 次越界」 */
function parseOverreach(text) {
  const m = text.match(/([\d,]+)\s*次问诊式对话里有\s*(\d+)\s*次越界/);
  if (!m) throw new Error('正文里没找到越权次数');
  return { dialogues: toInt(m[1]), overreach: Number(m[2]) };
}

/** 「对齐后通用问答得分可能掉 3 个点」 */
function parseAlignmentTax(text) {
  const m = text.match(/通用问答得分可能掉\s*(\d+)\s*个点/);
  if (!m) throw new Error('正文里没找到对齐税的点数');
  return Number(m[1]);
}

/** 「同一批 200 对样本，两位医师标注的一致率可能只有 0.65」 */
function parsePreferenceAgreement(text) {
  const m = text.match(/([\d,]+)\s*对样本，两位医师标注的一致率可能只有\s*(0\.\d+)/);
  if (!m) throw new Error('正文里没找到偏好标注的一致率');
  return { pairs: toInt(m[1]), agreement: Number(m[2]) };
}

/** 「人工抽检 100 条，数「给出诊断或处方」的条数」 */
function parseAuditSize(text) {
  const m = text.match(/人工抽检\s*(\d+)\s*条/);
  if (!m) throw new Error('正文里没找到抽检条数');
  return Number(m[1]);
}

/** 拒答分级表：请求类型 / 应当 / 说明 */
function parseRefusalTable(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith('|') && l.includes('请求类型'));
  if (start < 0) throw new Error('正文里没找到拒答分级表');
  const rows = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (!lines[i].startsWith('|')) break;
    const cells = lines[i].split('|').map((c) => c.trim());
    cells.shift();
    cells.pop();
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    if (cells.length >= 3) rows.push({ request: cells[0], should: cells[1], note: cells[2] });
  }
  return rows;
}

const seBinom = (p, n) => Math.sqrt((p * (1 - p)) / n);

function main() {
  const doc = readDoc();
  const over = parseOverreach(doc);
  const tax = parseAlignmentTax(doc);
  const pref = parsePreferenceAgreement(doc);
  const auditN = parseAuditSize(doc);
  const table = parseRefusalTable(doc);

  const rate = over.overreach / over.dialogues;
  const se = seBinom(rate, over.dialogues);

  console.log('═══ 对齐不是让模型更聪明，是让它在该停的地方停 ═══');
  console.log('');

  console.log('一、越权率本身也是估出来的');
  console.log(`  ${over.dialogues} 次对话中 ${over.overreach} 次越界 ⇒ ${(rate * 100).toFixed(0)}%`);
  console.log(`  同一比例的 95% 区间约 ${((rate - 1.96 * se) * 100).toFixed(1)}%–${((rate + 1.96 * se) * 100).toFixed(1)}%（按二项估算，样本 ${over.dialogues}）`);
  console.log(`  边界表的抽检量是 ${auditN} 条 —— 这个样本量能看出「有没有越权」，看不出「越权降了几个点」。`);
  console.log('');

  console.log('二、对齐税（成本一侧，只需一个数）');
  console.log(`  通用问答可能掉 ${tax} 个点：这是成本的量化。`);
  console.log('  收益那一侧不能靠这个数，要靠分层拒答率与越权出现率；只报「拒答率提升」，等于只报了成本的一半。');
  console.log('');

  console.log('三、偏好数据的一致性');
  const agree = Math.round(pref.pairs * pref.agreement);
  console.log(`  ${pref.pairs} 对里一致 ${agree} 对、分歧 ${pref.pairs - agree} 对（一致率 ${pref.agreement}）`);
  console.log(`  对策是把偏好拆细：不问「哪个更好」，改问「哪个有越权表述」「哪个编造了出处」「哪个漏了红旗」。`);
  console.log('');

  console.log(`四、分层拒答率（${table.length} 档，正文表原样读出）`);
  table.forEach((r, i) => console.log(`  ${i + 1}. ${r.request} → ${r.should}（${r.note}）`));

  // 教学构造：一份「有区分能力」的日志与一份「一律保守」的日志，总量相同都是 100 条
  const types = ['概念解释', '文献检索', '病案分析', '个体化建议', '剂量用法'];
  const counts = [40, 30, 20, 8, 2];
  const good = [0, 0, 4, 8, 2];
  const total = (xs) => xs.reduce((a, b) => a + b, 0);
  const rateBy = (xs) => xs.map((x, i) => x / counts[i]);

  console.log('');
  console.log('五、单看总率会漏掉什么（示例日志为教学构造）');
  console.log(`  有区分能力：总拒答 ${total(good)}/${total(counts)} = ${((total(good) / total(counts)) * 100).toFixed(0)}%`);
  rateBy(good).forEach((r, i) => console.log(`    ${types[i]}：${(r * 100).toFixed(0)}%`));
  console.log(`  一律保守（每类都按同一比例拒）：总拒答 30/${total(counts)} = 30%`);
  types.forEach((t) => console.log(`    ${t}：30%`));
  const spread = (xs) => rateBy(xs)[types.length - 2] - rateBy(xs)[0];
  console.log(`  分层落差（个体化建议 − 概念解释）：有区分能力 ${(spread(good) * 100).toFixed(0)} 点，一律保守 0 点`);
  console.log('  后者把该拒的和不该拒的一起拒了：总率看着差不多，区分能力为零。');
  console.log('');
  console.log('※ 本章数字均从 docs/zh.md 现读现算；示例日志为教学构造；输出仅用于教学演示，不构成诊疗、用药或产品合规建议。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  readDoc,
  parseOverreach,
  parseAlignmentTax,
  parsePreferenceAgreement,
  parseAuditSize,
  parseRefusalTable,
  seBinom,
  main,
};
