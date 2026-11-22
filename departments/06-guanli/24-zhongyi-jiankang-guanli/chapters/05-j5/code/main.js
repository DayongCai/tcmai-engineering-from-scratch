#!/usr/bin/env node
/**
 * 中医健康管理 · 第 5 章 干预方案不是最优解，是这个人做得到的那一版
 * 课程: departments/06-guanli/24-zhongyi-jiankang-guanli/chapters/05-j5/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 三因、三档强度、方案五要素、依从性四方向、随访三步、转介红线，全部从正文读出；
 * 条数再与文中的中文数字对账。开头那组负荷数字也现算一遍：8 条建议 30 天后剩 1.4 条，
 * 留存率与落空条数由脚本算，不手打。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const TITLE = '干预方案不是最优解，是这个人做得到的那一版';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function hanzi(text) {
  return (String(text || '').match(HANZI) || []).length;
}

function sections(body) {
  const out = [];
  let cur = { title: '', lines: [], hanzi: 0 };
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      cur = { title: h[1], lines: [], hanzi: 0 };
      out.push(cur);
      continue;
    }
    cur.lines.push(line);
    cur.hanzi += hanzi(line);
  }
  return out;
}

function sectionText(body, prefix) {
  const s = sections(body).find((x) => x.title.startsWith(prefix));
  if (!s) throw new Error('正文里没有以「' + prefix + '」开头的一节');
  return s.lines.join('\n');
}

function cells(line) {
  return line.split('|').map((c) => c.trim()).filter(Boolean);
}
const isSep = (line) => /^\|[\s|:-]+\|?$/.test(line.trim());

function splitTop(str, sep = '、') {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of String(str)) {
    if (ch === '（' || ch === '(') depth += 1;
    if (ch === '）' || ch === ')') depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}

/** 第一节：因时、因地、因人。 */
function constraints(body) {
  return [...sectionText(body, '一、').matchAll(/^\*\*(因[时地人])\*\*/gm)].map((m) => m[1]);
}

/** 第一节：因人问的三条（体力、经济、社会）。 */
function personFactors(body) {
  const t = sectionText(body, '一、');
  const m = t.match(/\*\*因人\*\*问的是三条：([^。]+)。/);
  if (!m) throw new Error('正文里没有「因人问的是三条」这句');
  return splitTop(m[1]);
}

/** 第二节：三档强度表（档位／服务形态／方案重点／典型间隔）。 */
function tiers(body) {
  const rows = sectionText(body, '二、')
    .split('\n')
    .filter((l) => l.trim().startsWith('|') && !isSep(l))
    .map(cells);
  return rows.slice(1).map((c) => ({ tier: c[0], form: c[1], focus: c[2], gap: c[3] }));
}

/** 第二节的反直觉规则。 */
function tierRule(body) {
  const m = body.match(/\*\*(档位越高[^*\n]+?)\*\*/);
  if (!m) throw new Error('正文里没有「档位越高……」这条规则');
  return m[1].trim();
}

/** 第三节：方案五要素。 */
function planElements(body) {
  return [...sectionText(body, '三、').matchAll(/^\*\*([^*\n]{2,6}?)。\*\*/gm)].map((m) => m[1].trim());
}

/** 第四节：依从性的四个方向。 */
function adherence(body) {
  return [...sectionText(body, '四、').matchAll(/^\*\*([^*\n]+?)。\*\*/gm)].map((m) => m[1].trim());
}

/** 第五节：随访三步。 */
function followupSteps(body) {
  return [...sectionText(body, '五、').matchAll(/^\*\*(先看安全|再看执行|最后调方案)。\*\*/gm)].map((m) => m[1]);
}

/** 第五节：转介红线（以分号分隔的几条）。 */
function referralLines(body) {
  const m = sectionText(body, '五、').match(/通用的几条：([^。]+)。/);
  if (!m) throw new Error('正文里没有「通用的几条：」这句');
  return splitTop(m[1], '；');
}

/** 开头的负荷复算：8 条建议 30 天后剩 1.4 条。 */
function loadMath(body) {
  const written = Number((body.match(/写下\s*(\d+)\s*条建议/) || [])[1]);
  const kept = Number((body.match(/仍在执行的条目平均\s*([\d.]+)\s*条/) || [])[1]);
  if (!written || !kept) throw new Error('正文里没有完整的负荷数字');
  return {
    written,
    kept,
    dropped: Number((written - kept).toFixed(1)),
    share: Number(((kept / written) * 100).toFixed(1)),
  };
}

function audit(body) {
  const cons = constraints(body);
  const person = personFactors(body);
  const ts = tiers(body);
  const rule = tierRule(body);
  const elems = planElements(body);
  const adh = adherence(body);
  const steps = followupSteps(body);
  const referral = referralLines(body);
  const load = loadMath(body);

  const claims = [
    { label: '三因三条', want: 3, got: cons.length },
    { label: '因人三条', want: 3, got: person.length },
    { label: '三档', want: 3, got: ts.length },
    { label: '方案五要素', want: 5, got: elems.length },
    { label: '依从四方向', want: 4, got: adh.length },
    { label: '随访三步', want: 3, got: steps.length },
    { label: '转介红线四类', want: 4, got: referral.length },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);
  return { cons, person, ts, rule, elems, adh, steps, referral, load, claims, mismatched };
}

function main() {
  const body = read();
  const a = audit(body);
  const secs = sections(body).filter((s) => s.title);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))];

  console.log(`中医健康管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下条数、负荷与汉字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi(body)} 字 · 节 ${secs.length} 节 · 引书 ${cites.length} 部`);
  console.log('');
  console.log(`三因是三条硬约束：${a.cons.join('／')}`);
  console.log(`  因人问的三条：${a.person.join('／')}`);
  console.log(`三档强度：${a.ts.map((t) => `${t.tier}（${t.form}）`).join(' ')}`);
  console.log(`  档位与条目：${a.rule}`);
  console.log(`方案五要素：${a.elems.join('／')}`);
  console.log(`依从性四方向：${a.adh.join('／')}`);
  console.log(`随访三步：${a.steps.join(' → ')}`);
  console.log(`转介红线 ${a.referral.length} 类：${a.referral.join('；')}`);
  console.log('');
  console.log(`负荷复算：写 ${a.load.written} 条，30 天后仍在执行 ${a.load.kept} 条 → ` +
    `留存 ${a.load.share}%，落空 ${a.load.dropped} 条。`);
  console.log(`  一条方案五件齐不齐，比八条方案齐不齐更决定结果。`);
  console.log('');
  console.log(`条数对账：${a.mismatched.length ? '不一致，须改稿 —— ' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('→ 判据：方案的质量不看它有多全，看第二天早上对象知不知道先做哪一件。');
  console.log('※ 条数、负荷与汉字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成诊疗意见，也不构成任何具体干预处方。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, hanzi, sections, sectionText, splitTop,
  constraints, personFactors, tiers, tierRule, planElements, adherence, followupSteps, referralLines, loadMath, audit,
};
