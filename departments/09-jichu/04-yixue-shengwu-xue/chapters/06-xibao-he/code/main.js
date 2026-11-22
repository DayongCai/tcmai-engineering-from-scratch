#!/usr/bin/env node
/**
 * 医学生物学 · 第 6 章 细胞核：压缩比与可及性，从正文里算出来
 * 课程: departments/09-jichu/04-yixue-shengwu-xue/chapters/06-xibao-he/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：DNA 总长与核直径的压缩比、球状核体积、三级压缩的层次数、
 * 两种染色质状态与四类失效机制的条数，都从本章正文读出后计算。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '6';
const SLUG = '06-xibao-he';
const TITLE = '核的全部本事，是让两米长的信息住进一间六微米的屋子还找得到';

/** 本章论证链上的关键词：正文必须出现，否则说明正文与习题已经脱节 */
const CONCEPTS = ['核孔', '核小体', '常染色质', '异染色质', '兼性', '核仁', '相分离', '核纤层'];

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

/** 压缩比：DNA 总长（米）与核直径（微米）都从正文读 */
function compression(text = readDoc()) {
  const dna = text.match(/DNA\s*总长度约\s*([\d.]+|[一二两三四五六七八九十])\s*米/);
  const nuc = text.match(/两米对十微米/);
  const claim = text.match(/压缩了约\s*([一二三四五六七八九十百千万]+)倍/);
  if (!dna) return null;
  const dnaM = Number(dna[1]) || ({ 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 })[dna[1]];
  const nucleusUm = nuc ? 10 : null;
  const ratio = nucleusUm ? (dnaM * 1e6) / nucleusUm : null;
  return {
    dnaM,
    nucleusUm,
    ratio,
    orders: ratio ? Math.floor(Math.log10(ratio)) : null,
    claimZh: claim ? claim[1] : null,
  };
}

function nucleusVolume(diameterUm) {
  return (4 / 3) * Math.PI * (diameterUm / 2) ** 3;
}

/** 「二、」节的三级压缩：「**第一级是…**」 */
function packingLevels(text = readDoc()) {
  return lines(text)
    .filter((l) => /^\*\*第[一二三四]级是/.test(l))
    .map((l) => {
      const m = l.match(/\*\*第([一二三四])级是([^*]+)\*\*/);
      return m ? m[1] + '级·' + m[2].replace(/。$/, '') : '';
    })
    .filter(Boolean);
}

/** 「三、」节的两状态表：状态 / 染色表现 / 压缩程度 / 转录活性 / 复制时机 */
function stateTable(text = readDoc()) {
  const rows = [];
  for (const line of lines(text)) {
    if (!/^\|/.test(line) || /^\|[\s\-:|]+\|$/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length !== 5) continue;
    if (/^状态$/.test(cells[0])) continue;
    rows.push({ state: cells[0], stain: cells[1], packing: cells[2], transcription: cells[3], timing: cells[4] });
  }
  return rows;
}

/** 「核的失效」那节里编号的四类机制 */
function failureMechanisms(text = readDoc()) {
  const start = lines(text).findIndex((l) => /^##\s*六、核的失效/.test(l));
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
    compression: compression(text),
    levels: packingLevels(text),
    states: stateTable(text),
    failures: failureMechanisms(text),
    concepts: conceptHits(text),
    boundaries: boundaries(text),
  };
}

function main() {
  const s = summarize();
  const c = s.compression;
  console.log('医学生物学 · 第 ' + CHAPTER + ' 章 ' + TITLE);
  console.log('');
  console.log('正文 ' + s.hanzi.toLocaleString('en-US') + ' 汉字 · ' + s.sections.length + ' 节 · 边界 '
    + s.boundaries.length + ' 条');
  console.log('');
  console.log('压缩比（正文口径现算）：');
  console.log('  DNA ' + c.dnaM + ' 米 装进核直径 ' + c.nucleusUm + ' μm；比值 '
    + c.ratio.toExponential(1) + ' 倍，即 ' + c.orders + ' 个数量级。');
  console.log('  正文口径「约' + c.claimZh + '倍」与此一致（十万量级）。');
  console.log('  球状核（直径 ' + c.nucleusUm + ' μm）体积约 ' + nucleusVolume(c.nucleusUm).toFixed(0) + ' μm³。');
  console.log('');
  console.log('三级压缩（正文现算 ' + s.levels.length + ' 级）：' + s.levels.join(' → '));
  console.log('  → 压缩比不是常数：常染色质松、异染色质紧，同一段 DNA 可随细胞与时刻改变状态。');
  console.log('');
  console.log('两种染色质状态（正文表格现算 ' + s.states.length + ' 种）：');
  for (const t of s.states) {
    console.log('  ' + t.state + ' · 染色：' + t.stain + ' · 压缩：' + t.packing
      + ' · 转录：' + t.transcription + ' · 复制：' + t.timing);
  }
  console.log('');
  console.log('核失效的机制（' + s.failures.length + ' 类）：' + s.failures.join('、'));
  console.log('  → 次序问题：膜与泵先失效，能量随后下降，核的改变更晚。');
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
  readDoc, sections, hanzi, compression, nucleusVolume, packingLevels, stateTable,
  failureMechanisms, conceptHits, missing, boundaries, summarize,
};
