#!/usr/bin/env node
/**
 * 医学生物学 · 第 11 章 单基因遗传：配子算术与二项分布，从正文里算出来
 * 课程: departments/09-jichu/04-yixue-shengwu-xue/chapters/11-dan-jiyin-yichuan/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：庞纳特方格给 1∶2∶1 与 3∶1，二项分布给「四个孩子里恰好一个」
 * 与「至少一个」，都从本章正文的参数读出后计算。正文改版后重跑即可复现。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '11';
const SLUG = '11-dan-jiyin-yichuan';
const TITLE = '3∶1 不是疾病的规律，是配子随机结合的算术';

/** 本章论证链上的关键词：正文必须出现，否则说明正文与习题已经脱节 */
const CONCEPTS = ['配子', '杂合', '半合子', '外显率', '拟表型', '近亲婚配', '亲缘系数', '纳入偏倚'];

function readDoc(file) {
  return fs.readFileSync(file || DOC, 'utf8');
}

function lines(text) {
  return text.split(/\r?\n/);
}

function sections(text = readDoc()) {
  return lines(text)
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

function hanzi(text = readDoc()) {
  return (text.match(/[\u4e00-\u9fff]/g) || []).length;
}

const DIGIT = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

function cnToNumber(text) {
  const s = String(text).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  let value = 0;
  let num = 0;
  for (const ch of s) {
    if (DIGIT[ch] !== undefined) num = DIGIT[ch];
    else if (ch === '十' || ch === '百') {
      value += (num || 1) * (ch === '十' ? 10 : 100);
      num = 0;
    } else if (ch === '万' || ch === '亿') {
      value = (value + num) * (ch === '万' ? 1e4 : 1e8);
      num = 0;
    }
  }
  return value + num;
}

/** 两个杂合亲代：配子各两种、等半；四种组合等可能 */
function punnett() {
  const gametes = [
    { g: 'A', p: 0.5 },
    { g: 'a', p: 0.5 },
  ];
  const cells = [];
  for (const m of gametes) {
    for (const f of gametes) {
      const geno = [m.g, f.g].sort().join('');
      cells.push({ geno, p: m.p * f.p });
    }
  }
  const byGeno = {};
  for (const c of cells) byGeno[c.geno] = (byGeno[c.geno] || 0) + c.p;
  const dominant = Object.entries(byGeno)
    .filter(([g]) => g.includes('A'))
    .reduce((a, [, p]) => a + p, 0);
  return {
    cells: cells.length,
    genotypes: byGeno,
    dominantRatio: dominant,
    recessiveRatio: 1 - dominant,
  };
}

/** 二项分布：n 次生育，每次患病概率 p */
function binomial(n, p, k) {
  const choose = (a, b) => {
    let r = 1;
    for (let i = 1; i <= b; i += 1) r = (r * (a - b + i)) / i;
    return r;
  };
  return choose(n, k) * p ** k * (1 - p) ** (n - k);
}

function familyRisks(n = 4, p = 0.25) {
  const dist = [];
  for (let k = 0; k <= n; k += 1) dist.push({ k, p: binomial(n, p, k) });
  const atLeastOne = 1 - binomial(n, p, 0);
  return {
    n,
    p,
    exactlyOne: binomial(n, p, 1),
    atLeastOne,
    none: binomial(n, p, 0),
    dist,
  };
}

/** 正文口径：四分之一、约 42%、约 68% */
function claimCheck(text = readDoc()) {
  const quarter = /四分之一/.test(text);
  const exactly = text.match(/恰好一个患病的概率约为\s*(\d+)%/);
  const atLeast = text.match(/至少一个[^，。]*的概率约为\s*(\d+)%/);
  return {
    quarter,
    exactlyPct: exactly ? Number(exactly[1]) : null,
    atLeastPct: atLeast ? Number(atLeast[1]) : null,
  };
}

/** 三列表格：传递方式表 / 偏离原因表 / 机制分档表 */
function threeColTables(text = readDoc()) {
  const tables = [];
  let current = null;
  for (const line of lines(text)) {
    if (!/^\|/.test(line)) {
      current = null;
      continue;
    }
    if (/^\|[\s\-:|]+\|$/.test(line)) continue; // 分隔行不打断表格
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length !== 4 && cells.length !== 3) {
      current = null;
      continue;
    }
    const key = cells.length;
    if (!current || current.cols !== key) {
      current = { cols: key, header: cells, rows: [] };
      tables.push(current);
      continue;
    }
    current.rows.push(cells);
  }
  return tables;
}

const modeTable = (text = readDoc()) => threeColTables(text).find((t) => /方式/.test(t.header[0]));
const deviationTable = (text = readDoc()) => threeColTables(text).find((t) => /原因/.test(t.header[0]));
const mechanismTable = (text = readDoc()) => threeColTables(text).find((t) => /^机制$/.test(t.header[0]));

/** 「三、」节系谱的三条线索 */
function pedigreeClues(text = readDoc()) {
  const start = lines(text).findIndex((l) => /^##\s*三、系谱只给三条线索/.test(l));
  if (start < 0) return [];
  const ls = lines(text);
  const out = [];
  for (let i = start + 1; i < ls.length; i += 1) {
    const line = ls[i].trim();
    if (/^##\s/.test(line)) break;
    if (/^\d+\.\s+\*\*/.test(line)) out.push((line.match(/\*\*([^*]+)\*\*/) || [, ''])[1]);
  }
  return out;
}

function conceptHits(text = readDoc()) {
  return CONCEPTS.map((term) => ({ term, hits: text.split(term).length - 1 }));
}

function missing(text = readDoc()) {
  return conceptHits(text).filter((c) => c.hits === 0).map((c) => c.term);
}

function boundaries(text = readDoc()) {
  const ls = lines(text);
  const start = ls.findIndex((l) => /^##\s*代价与边界/.test(l));
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < ls.length; i += 1) {
    const line = ls[i].trim();
    if (/^##\s/.test(line)) break;
    if (/^-\s+/.test(line)) out.push(line.replace(/^-\s+/, ''));
  }
  return out;
}

function summarize(text = readDoc()) {
  return {
    hanzi: hanzi(text),
    sections: sections(text),
    punnett: punnett(),
    risks: familyRisks(4, 0.25),
    claims: claimCheck(text),
    modes: modeTable(text),
    deviations: deviationTable(text),
    mechanisms: mechanismTable(text),
    clues: pedigreeClues(text),
    concepts: conceptHits(text),
    boundaries: boundaries(text),
  };
}

function main() {
  const s = summarize();
  const p = s.punnett;
  const r = s.risks;
  const c = s.claims;
  console.log('医学生物学 · 第 ' + CHAPTER + ' 章 ' + TITLE);
  console.log('');
  console.log('正文 ' + s.hanzi.toLocaleString('en-US') + ' 汉字 · ' + s.sections.length + ' 节 · 边界 '
    + s.boundaries.length + ' 条');
  console.log('');
  console.log('配子算术（本脚本现算）：两杂合亲代 × 两种配子 → ' + p.cells + ' 种组合');
  console.log('  基因型：AA 型 ' + p.genotypes.AA + ' · Aa ' + p.genotypes.Aa + ' · aa ' + p.genotypes.aa);
  console.log('  表型比：显性 ' + p.dominantRatio + ' ∶ 隐性 ' + p.recessiveRatio);
  console.log('');
  console.log('同一组参数、不同的问法（二项分布 n=' + r.n + ', p=' + r.p + ' 现算）：');
  console.log('  四个孩子里恰好一个患病：' + (r.exactlyOne * 100).toFixed(1) + '%（正文写约 ' + c.exactlyPct + '%）');
  console.log('  至少一个患病：' + (r.atLeastOne * 100).toFixed(1) + '%（正文写约 ' + c.atLeastPct + '%）');
  console.log('  一个都不病：' + (r.none * 100).toFixed(1) + '%');
  console.log('  → 比例不是每个家庭的预测，是单次事件的概率。');
  console.log('');
  if (s.modes) {
    console.log('五种传递方式（正文表格现算 ' + s.modes.rows.length + ' 种）：');
    for (const row of s.modes.rows) console.log('  ' + row[0] + ' · ' + row[2] + ' · ' + row[3]);
  }
  console.log('');
  console.log('系谱三条线索（' + s.clues.length + ' 条）：' + s.clues.join('、'));
  if (s.deviations) console.log('偏离理论比例的原因（' + s.deviations.rows.length + ' 类）：'
    + s.deviations.rows.map((x) => x[0]).join('、'));
  if (s.mechanisms) console.log('机制分档（' + s.mechanisms.rows.length + ' 档）：'
    + s.mechanisms.rows.map((x) => x[0]).join('、'));
  console.log('');
  console.log('判据词命中（正文现算）：');
  for (const x of s.concepts) console.log('  ' + (x.hits ? '✓' : '✗') + ' ' + x.term + '：' + x.hits);
  console.log('');
  console.log('边界（「代价与边界」一节，取前 3 条）：');
  s.boundaries.slice(0, 3).forEach((b) => console.log('  - ' + b));
  console.log('');
  console.log('※ 现算自 ' + SLUG + '/docs/zh.md；正文改版后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, TITLE, CONCEPTS,
  readDoc, sections, hanzi, cnToNumber, punnett, binomial, familyRisks, claimCheck,
  threeColTables, modeTable, deviationTable, mechanismTable, pedigreeClues,
  conceptHits, missing, boundaries, summarize,
};
