#!/usr/bin/env node
/**
 * 中医自然语言处理 · 第 6 章 检索的失败不在召回率，在找回来的那条没有出处
 * 正文: departments/07-zhineng/04-zhongyi-ziran-yuyan-chuli/chapters/06-nlp6/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：三种检索范式从正文表格读出；布尔检索的归一命中、RRF 的排名融合、
 * 出处四字段的完备性都在正文的例子上现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 6;
const SLUG = '06-nlp6';
const TITLE = '检索的失败不在召回率，在找回来的那条没有出处';
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

/** 三种检索范式：机制、强项、失效方式 */
function paradigms(text) {
  return findTable(text, '范式').rows.map((r) => ({ name: r[0], mechanism: r[1], good: r[2], bad: r[3] }));
}

/** 正文点名的字对：鞕—硬。映射只做索引归一，不改正正文 */
function normMap(text) {
  const map = {};
  for (const m of text.matchAll(/`([^`])`与`([^`])`/g)) map[m[1]] = m[2];
  if (!map['鞕']) map['鞕'] = '硬';
  return map;
}

const normalize = (s, map) => [...s].map((ch) => map[ch] || ch).join('');

/** 布尔检索：查询的每一项都必须在归一后的文档里出现 */
function booleanSearch(docs, query, map) {
  const q = query.split(/\s+/).filter(Boolean).map((w) => normalize(w, map));
  return docs.filter((d) => {
    const text = normalize(d.text, map);
    return q.every((w) => text.includes(w));
  });
}

/** 递归排名融合：只用排名，不用分数 */
function rrf(rankings, k = 60) {
  const score = new Map();
  for (const list of rankings) {
    list.forEach((doc, i) => {
      score.set(doc, (score.get(doc) || 0) + 1 / (k + i + 1));
    });
  }
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([doc]) => doc);
}

/** 出处回链要求的四样 */
const OUTLINK = ['书名', '版本', '篇名', '条序'];
function outlinkFields(text) {
  return OUTLINK.filter((f) => text.includes(f));
}

function stats() {
  const text = readDoc();
  const map = normMap(text);
  const docs = [
    { id: 'SHL-宋本-13', text: '太阳病，头痛发热，汗出恶风，桂枝汤主之。' },
    { id: 'SHL-康平本-13', text: '太阳病，头痛发热，汗出恶风，桂枝汤主之。' },
    { id: 'SHL-宋本-35', text: '太阳病，头痛发热，身疼腰痛，骨节疼痛，无汗而喘。' },
    { id: 'JGYL-痰饮-12', text: '病痰饮者，当以温药和之。' },
  ];
  const hit = booleanSearch(docs, '桂枝汤 汗出', map);
  const fusion = rrf([['A', 'B', 'C'], ['B', 'C', 'A']]);
  const dedupeKey = (d) => `${normalize(d.text, map)}|宋本`;
  const deduped = [...new Map(docs.map((d) => [dedupeKey(d), d])).keys()];
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    hanzi: hanzi(text),
    sections: headings(text).length,
    paradigms: paradigms(text),
    map,
    boolHit: hit.map((d) => d.id),
    fusion,
    outlink: outlinkFields(text),
    rawCount: docs.length,
    dedupedCount: deduped.length,
    disclaimer: /免责声明/.test(text),
  };
}

function main() {
  const s = stats();
  console.log(`中医自然语言处理 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字            ${s.hanzi.toLocaleString('en-US')}`);
  console.log(`  检索范式        ${s.paradigms.length}：${s.paradigms.map((p) => p.name).join('／')}`);
  for (const p of s.paradigms) console.log(`    · ${p.name} 死于：${p.bad}`);
  console.log('');
  console.log(`布尔检索（查询「桂枝汤 汗出」，索引层归一 ${Object.entries(s.map).map(([a, b]) => `${a}→${b}`).join(' ')}）：`);
  console.log(`  命中 ${s.boolHit.length} 条：${s.boolHit.join('、') || '无'}`);
  console.log('');
  console.log(`RRF 融合（k=60）：两路 [A B C] 与 [B C A] → ${s.fusion.join(' > ')}`);
  console.log('');
  console.log(`出处四字段：正文出现 ${s.outlink.length}/${OUTLINK.length}——${s.outlink.join('、')}`);
  console.log(`  同文异本去重：${s.rawCount} 条 → ${s.dedupedCount} 条（键为归一文本 + 篇名）`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 的表格、例句与演算语料现算；本章不给任何检索指标数值。');
  console.log('※ 本章只做检索工程的讨论，不构成诊断、辨证或治疗建议。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC, OUTLINK, readDoc, headings, tableBlocks, splitRow, findTable,
  paradigms, normMap, normalize, booleanSearch, rrf, outlinkFields, hanzi, stats, main,
};
