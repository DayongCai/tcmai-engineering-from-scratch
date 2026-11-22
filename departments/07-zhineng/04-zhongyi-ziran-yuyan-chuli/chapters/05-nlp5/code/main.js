#!/usr/bin/env node
/**
 * 中医自然语言处理 · 第 5 章 标注不是把词圈出来，是把边界争议写下来
 * 正文: departments/07-zhineng/04-zhongyi-ziran-yuyan-chuli/chapters/05-nlp5/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：六类实体与颗粒度处理从正文表格读出；BIO 标注、Cohen's kappa、按字符的
 * 标注成本都由正文的例句与参数现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 5;
const SLUG = '05-nlp5';
const TITLE = '标注不是把词圈出来，是把边界争议写下来';
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

/** 六类实体：类、例、边界争议点、本章的处理 */
function entityTypes(text) {
  return findTable(text, '类').rows.map((r) => ({
    type: r[0], example: r[1], dispute: r[2], handling: r[3],
  }));
}

/** BIO 标注：spans 为 [{start,end,type}]，其余字符记 O */
function bioTags(sentence, spans) {
  const tags = new Array(sentence.length).fill('O');
  for (const s of spans) {
    for (let i = s.start; i < s.end; i += 1) tags[i] = `${i === s.start ? 'B' : 'I'}-${s.type}`;
  }
  return tags;
}

/** 正文里的 BIO 示例串（若正文改了示例，这里读到的也随之改变） */
function docBioExample(text) {
  const m = text.match(/`(B-[A-Z]+(?: [BIO](?:-[A-Z]+)?)+)`/);
  return m ? m[1] : null;
}

/** Cohen's kappa：扣掉碰巧一致 */
function kappa(a, b) {
  if (!a.length || a.length !== b.length) return null;
  const n = a.length;
  const agree = a.filter((x, i) => x === b[i]).length / n;
  const labels = new Set([...a, ...b]);
  let pe = 0;
  for (const l of labels) {
    const ca = a.filter((x) => x === l).length / n;
    const cb = b.filter((x) => x === l).length / n;
    pe += ca * cb;
  }
  if (pe === 1) return 1;
  return (agree - pe) / (1 - pe);
}

/** 按字符算的标注成本：决策次数 = 字数 × 条数 */
function annotationCost({ chars = 300, records = 1000, dispute = 0.1 } = {}) {
  const decisions = chars * records;
  const double = decisions * 2;
  const arbitration = Math.round(double * dispute);
  return { decisions, double, arbitration };
}

function stats() {
  const text = readDoc();
  const types = entityTypes(text);
  const sentence = '头项强痛而恶寒';
  const spans = [{ start: 0, end: 4, type: 'SYM' }, { start: 5, end: 7, type: 'SYM' }];
  const tags = bioTags(sentence, spans).join(' ');
  // 90% 是 O 的典型序列：19 条一致、1 条边界分歧
  const a = [...Array(18).fill('O'), 'B', 'I'];
  const b = [...Array(18).fill('O'), 'B', 'O'];
  const raw = a.filter((x, i) => x === b[i]).length / a.length;
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    hanzi: hanzi(text),
    sections: headings(text).length,
    types,
    bio: { sentence, tags, docExample: docBioExample(text) },
    kappa: { raw, value: kappa(a, b) },
    cost: annotationCost(),
    disclaimer: /免责声明/.test(text),
  };
}

function main() {
  const s = stats();
  console.log(`中医自然语言处理 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字            ${s.hanzi.toLocaleString('en-US')}`);
  console.log(`  实体类别        ${s.types.length}：${s.types.map((t) => t.type).join('／')}`);
  for (const t of s.types) console.log(`    · ${t.type}：${t.handling}`);
  console.log('');
  console.log(`BIO 示例：${s.bio.sentence}`);
  console.log(`  本脚本标注    ${s.bio.tags}`);
  console.log(`  正文示例      ${s.bio.docExample || '（未找到）'}`);
  console.log(`  两者一致      ${s.bio.tags === s.bio.docExample ? '是' : '否'}`);
  console.log('');
  console.log(`一致性（18 个 O + 1 处边界分歧，20 个位置）：`);
  console.log(`  原始一致率    ${(s.kappa.raw * 100).toFixed(0)}%`);
  console.log(`  Cohen's kappa ${s.kappa.value.toFixed(3)}——碰巧一致被扣掉`);
  console.log('');
  console.log(`按字符算（300 字/条 × 1,000 条）：`);
  console.log(`  边界决策      ${s.cost.decisions.toLocaleString('en-US')} 次`);
  console.log(`  加双标        ${s.cost.double.toLocaleString('en-US')} 次`);
  console.log(`  10% 争议仲裁  ${s.cost.arbitration.toLocaleString('en-US')} 次`);
  console.log('');
  console.log('※ 数字由本目录 docs/zh.md 的表格、例句与演算参数现算；成本为演算设定，不是任何机构的实测。');
  console.log('※ 本章只做标注工程的讨论，不构成诊断、辨证或治疗建议。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC, readDoc, headings, tableBlocks, splitRow, findTable,
  entityTypes, bioTags, docBioExample, kappa, annotationCost, hanzi, stats, main,
};
