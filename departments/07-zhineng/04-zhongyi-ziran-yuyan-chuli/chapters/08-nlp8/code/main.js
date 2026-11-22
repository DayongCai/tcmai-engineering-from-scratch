#!/usr/bin/env node
/**
 * 中医自然语言处理 · 第 8 章 规则不是模型的补丁，是模型的天花板
 * 正文: departments/07-zhineng/04-zhongyi-ziran-yuyan-chuli/chapters/08-nlp8/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：条文规则块与四层仲裁顺序都从正文的代码块与编号列表解析出来；
 * 仲裁函数按正文给的优先级工作，条件分级的判据也取自正文。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 8;
const SLUG = '08-nlp8';
const TITLE = '规则不是模型的补丁，是模型的天花板';
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

function codeBlocks(text) {
  return [...text.matchAll(/```[a-z]*\r?\n([\s\S]*?)```/g)].map((m) => m[1]);
}

/** 条文到规则：解析正文里 IF/AND/THEN/WITH 那块文本代码 */
function parseRuleBlock(text) {
  const block = codeBlocks(text).find((b) => /^\s*IF\b/m.test(b));
  if (!block) throw new Error('正文里找不到以 IF 开头的规则块');
  const rule = { conditions: [], then: null, modality: null, source: null };
  for (const raw of block.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    let m;
    if ((m = line.match(/^IF\s+(.+)$/))) rule.conditions.push(m[1].trim());
    else if ((m = line.match(/^AND\s+source\s*=\s*(.+)$/i))) rule.source = m[1].trim();
    else if ((m = line.match(/^AND\s+(.+)$/i))) rule.conditions.push(m[1].trim());
    else if ((m = line.match(/^THEN\s+(.+)$/i))) rule.then = m[1].trim();
    else if ((m = line.match(/^WITH\s+(.+)$/i))) rule.modality = m[1].trim();
  }
  if (!rule.then || !rule.modality || !rule.source) throw new Error('规则块缺 THEN/WITH/source');
  return rule;
}

/** 四层仲裁：取「三、仲裁顺序」下的编号条目 */
function arbitrationLayers(text) {
  const sec = text.slice(text.indexOf('## 三、'), text.indexOf('## 四、'));
  const out = [];
  for (const m of sec.matchAll(/^\d+\.\s+\*\*(.+?)\*\*/gm)) out.push(m[1].replace(/[：:].*$/, '').trim());
  if (out.length !== 4) throw new Error(`仲裁层应为 4 层，实读 ${out.length} 层`);
  return out;
}

/**
 * 按正文的四层顺序裁决：硬约束违反即拒绝；有条文即用条文；
 * 否则退回模型候选（带「无条文支持」），再不行退回人。
 */
function arbitrate({ illegal = false, ruleHit = false, modelHit = false } = {}) {
  if (illegal) return { layer: '值域与硬约束', output: null, label: '拒绝' };
  if (ruleHit) return { layer: '条文规则', output: 'rule', label: '条文支持' };
  if (modelHit) return { layer: '统计模型', output: 'model', label: '无条文支持' };
  return { layer: '人', output: null, label: '退回人判' };
}

/** 条件分级：硬条件进前提，软条件进权重 */
function conditionTiers(text) {
  const hard = text.includes('硬条件');
  const soft = text.includes('软条件');
  if (!hard || !soft) throw new Error('正文缺硬／软条件的分级');
  return { hard, soft };
}

function stats() {
  const text = readDoc();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    hanzi: hanzi(text),
    sections: headings(text).length,
    codeBlocks: codeBlocks(text).length,
    rule: parseRuleBlock(text),
    layers: arbitrationLayers(text),
    demo: arbitrate({ illegal: false, ruleHit: true, modelHit: true }),
    modelOnly: arbitrate({ modelHit: true }),
    fallback: arbitrate({}),
    tiers: conditionTiers(text),
    disclaimer: /免责声明/.test(text),
  };
}

function main() {
  const s = stats();
  console.log(`中医自然语言处理 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字            ${s.hanzi.toLocaleString('en-US')}`);
  console.log(`  节 / 代码块     ${s.sections} / ${s.codeBlocks}`);
  console.log('');
  console.log('条文规则（正文代码块解析）：');
  for (const c of s.rule.conditions) console.log(`  条件  ${c}`);
  console.log(`  结论  ${s.rule.then}`);
  console.log(`  语气  ${s.rule.modality}`);
  console.log(`  出处  ${s.rule.source}`);
  console.log('');
  console.log(`仲裁顺序（${s.layers.length} 层，从硬到软）：${s.layers.join(' → ')}`);
  console.log(`  条文与模型同时命中 → ${s.demo.layer}（${s.demo.label}）`);
  console.log(`  只有模型命中       → ${s.modelOnly.layer}（${s.modelOnly.label}）`);
  console.log(`  都没有             → ${s.fallback.layer}（${s.fallback.label}）`);
  console.log('');
  console.log(`条件分级：硬条件 ${s.tiers.hard ? '有' : '无'}／软条件 ${s.tiers.soft ? '有' : '无'}`);
  console.log('');
  console.log('※ 规则块与仲裁层由本目录 docs/zh.md 解析读出；本章不给任何具体方证结论。');
  console.log('※ 本章只做规则工程的讨论，不构成诊断、辨证或治疗建议。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC, readDoc, headings, codeBlocks,
  parseRuleBlock, arbitrationLayers, arbitrate, conditionTiers, hanzi, stats, main,
};
