#!/usr/bin/env node
/**
 * 中医自然语言处理 · 第 10 章 抽得出「舌红苔黄」，断不出「此为热证」
 * 正文: departments/07-zhineng/04-zhongyi-ziran-yuyan-chuli/chapters/10-nlp10/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：三档来源、四类不该自动化的动作、失败降级表都从正文读出；
 * 抽取函数只返回文本里逐字可查的 span，抽不到就返回空，绝不填默认值。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 10;
const SLUG = '10-nlp10';
const TITLE = '抽得出「舌红苔黄」，断不出「此为热证」';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s).match(HANZI) || []).length;
const readDoc = () => fs.readFileSync(DOC, 'utf8');

function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

function tableBlocks(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\|[\s:|-]*---[\s:|-]*\|$/.test(lines[i].trim())) continue;
    const header = i > 0 ? splitRow(lines[i - 1]) : [];
    const rows = [];
    let j = i + 1;
    while (j < lines.length && /^\|/.test(lines[j].trim())) {
      rows.push(splitRow(lines[j]));
      j += 1;
    }
    out.push({ header, rows });
  }
  return out;
}

function findTable(text, key) {
  const tb = tableBlocks(text).find((t) => t.header.some((h) => h.includes(key)));
  if (!tb) throw new Error(`正文里没有表头含「${key}」的表`);
  return tb;
}

/** 三档来源：档、含义、例、可否作为结论 */
function sourceTiers(text) {
  return findTable(text, '档').rows.map((r) => ({ tier: r[0], meaning: r[1], example: r[2], usable: r[3] }));
}

/** 四类不该自动化的动作：取「三、」节里以「**X。**」开头的条目 */
function forbiddenActions(text) {
  const sec = text.slice(text.indexOf('## 三、'), text.indexOf('## 四、'));
  return [...sec.matchAll(/\*\*([^*]+?)。\*\*/g)].map((m) => m[1].trim());
}

/** 失败降级表：输入情形、系统行为、输出 */
function failureTable(text) {
  return findTable(text, '输入情形').rows.map((r) => ({ input: r[0], action: r[1], output: r[2] }));
}

/** 抽取：只返回正文里逐字可查的 span；一个都没有就返回空，不补默认值 */
function extract(text, lexicon) {
  const hits = [];
  for (const term of lexicon) {
    let at = text.indexOf(term);
    while (at >= 0) {
      hits.push({ term, start: at, end: at + term.length });
      at = text.indexOf(term, at + 1);
    }
  }
  hits.sort((a, b) => a.start - b.start);
  return hits;
}

/** 结论分档：有 span 才算原文直述；有明确条文依据算规则推出；否则只能是模型猜测 */
function classify({ span = false, rule = false } = {}) {
  if (span) return '原文直述';
  if (rule) return '规则推出';
  return '模型猜测';
}

/** 四类不该自动化的动作，返回允许的输出形态 */
function decide(action) {
  const table = {
    证型定论: '只给候选与依据',
    方药剂量: '只存原文，不换算不给克数',
    配伍禁忌的放行: '只能拦，不能放',
    预后判断: '不自动化，退回人判',
  };
  return table[action] || '未知动作，拒绝';
}

function stats() {
  const text = readDoc();
  const lexicon = ['舌红苔黄', '舌淡红', '脉浮', '恶寒', '无汗'];
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    hanzi: hanzi(text),
    sections: headings(text).length,
    tiers: sourceTiers(text),
    forbidden: forbiddenActions(text),
    failures: failureTable(text),
    extracted: extract('舌红苔黄，脉浮数。', lexicon),
    empty: extract('患者自觉尚可。', lexicon),
    tiersDemo: [classify({ span: true }), classify({ rule: true }), classify({})],
    disclaimer: /免责声明/.test(text),
  };
}

function main() {
  const s = stats();
  console.log(`中医自然语言处理 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字            ${s.hanzi.toLocaleString('en-US')}`);
  console.log(`  来源档          ${s.tiers.length}：${s.tiers.map((t) => t.tier).join('／')}`);
  for (const t of s.tiers) console.log(`    · ${t.tier}：${t.usable}`);
  console.log('');
  console.log(`不该自动化的动作 ${s.forbidden.length} 类：${s.forbidden.join('／')}`);
  console.log('');
  console.log(`抽取「舌红苔黄，脉浮数。」→ ${s.extracted.map((h) => h.term).join('、') || '（空）'}`);
  console.log(`抽取「患者自觉尚可。」  → ${s.empty.length ? s.empty.map((h) => h.term).join('、') : '空，不填默认值'}`);
  console.log(`分档演示：span→${s.tiersDemo[0]}｜条文→${s.tiersDemo[1]}｜无依据→${s.tiersDemo[2]}`);
  console.log('');
  console.log(`失败降级表 ${s.failures.length} 行：`);
  for (const f of s.failures) console.log(`  ${f.input} → ${f.action}：${f.output}`);
  console.log('');
  console.log('※ 档位、动作与降级表由本目录 docs/zh.md 现算；本章不给任何诊疗结论。');
  console.log('※ 本章只做系统边界与合规的讨论，不构成诊断、辨证或治疗建议。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC, readDoc, headings, tableBlocks, splitRow, findTable,
  sourceTiers, forbiddenActions, failureTable, extract, classify, decide, hanzi, stats, main,
};
