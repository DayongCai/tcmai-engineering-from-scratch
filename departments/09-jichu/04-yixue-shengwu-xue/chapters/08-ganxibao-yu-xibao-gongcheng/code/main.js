#!/usr/bin/env node
/**
 * 医学生物学 · 第 8 章 干细胞与细胞工程：判据与工艺，从正文里算出来
 * 课程: departments/09-jichu/04-yixue-shengwu-xue/chapters/08-ganxibao-yu-xibao-gongcheng/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：潜能三层的条数、工艺四关的条数、重编程三条路与微环境三样，
 * 以及「十万亿细胞分到二百种类型」这笔账，都从本章正文读出后计算。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '8';
const SLUG = '08-ganxibao-yu-xibao-gongcheng';
const TITLE = '干细胞的门槛不是「什么都能变」，是「变了还能变回来」';

/** 本章论证链上的关键词：正文必须出现，否则说明正文与习题已经脱节 */
const CONCEPTS = ['自我更新', '分化潜能', '干细胞龛', '重编程', '类器官', '过程控制', '畸胎瘤'];

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

/** 「十万亿」「二百」读成整数 */
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

/** 潜能三层表：层级 / 能产生什么 / 典型来源 / 关键限制 */
function potencyTable(text = readDoc()) {
  const rows = [];
  for (const line of lines(text)) {
    if (!/^\|/.test(line) || /^\|[\s\-:|]+\|$/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length !== 4) continue;
    if (/^层级$/.test(cells[0])) continue;
    rows.push({ level: cells[0], gives: cells[1], source: cells[2], limit: cells[3] });
  }
  return rows;
}

/** 「五、」节四条工艺线：「**第一关，扩增。**」 */
function craftGates(text = readDoc()) {
  return lines(text)
    .filter((l) => /^\*\*第[一二三四]关，/.test(l))
    .map((l) => {
      const m = l.match(/\*\*第[一二三四]关，([^*。]+)。\*\*/);
      return m ? m[1] : '';
    })
    .filter(Boolean);
}

/** 「四、」节三条重编程路径 */
function reprogramPaths(text = readDoc()) {
  const start = lines(text).findIndex((l) => /^##\s*四、重编程/.test(l));
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

/** 「三、」节干细胞龛三样 */
function nicheFactors(text = readDoc()) {
  const start = lines(text).findIndex((l) => /^##\s*三、命运不全由细胞自己决定/.test(l));
  if (start < 0) return [];
  const ls = lines(text);
  const out = [];
  for (let i = start + 1; i < ls.length; i += 1) {
    const line = ls[i].trim();
    if (/^##\s/.test(line)) break;
    if (/^-\s+\*\*/.test(line)) out.push((line.match(/\*\*([^*]+)\*\*/) || [, ''])[1]);
  }
  return out;
}

/** 正文口径：细胞总数（十万亿）与细胞类型（二百种上下） */
function scaleClaims(text = readDoc()) {
  const cells = text.match(/细胞数量长到([一二两三四五六七八九十百千万亿]+)量级/);
  const types = text.match(/细胞类型分化出([一二两三四五六七八九十百]+)种/);
  const total = cells ? cnToNumber(cells[1]) : null;
  const kinds = types ? cnToNumber(types[1]) : null;
  return { total, kinds, perType: total && kinds ? Math.round(total / kinds) : null };
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
    potency: potencyTable(text),
    gates: craftGates(text),
    paths: reprogramPaths(text),
    niche: nicheFactors(text),
    scale: scaleClaims(text),
    concepts: conceptHits(text),
    boundaries: boundaries(text),
  };
}

function main() {
  const s = summarize();
  console.log('医学生物学 · 第 ' + CHAPTER + ' 章 ' + TITLE);
  console.log('');
  console.log('正文 ' + s.hanzi.toLocaleString('en-US') + ' 汉字 · ' + s.sections.length + ' 节 · 边界 '
    + s.boundaries.length + ' 条');
  console.log('');
  console.log('潜能三层（正文表格现算 ' + s.potency.length + ' 层）：');
  for (const p of s.potency) console.log('  ' + p.level + '：' + p.gives + '（限制：' + p.limit + '）');
  console.log('');
  const k = s.scale;
  console.log('规模口径（正文常引口径，读后现算）：细胞 ' + k.total.toExponential(0)
    + ' 个 · 类型 ' + k.kinds + ' 种 → 平均每种类型摊到 '
    + k.perType.toExponential(1) + ' 个细胞。');
  console.log('');
  console.log('重编程三条路（' + s.paths.length + ' 条）：' + s.paths.join('、'));
  console.log('  共同机制：分化状态是被锁住的，而不是被删掉的。');
  console.log('');
  console.log('干细胞龛三样（' + s.niche.length + ' 样）：' + s.niche.join('、'));
  console.log('工艺四关（' + s.gates.length + ' 关）：' + s.gates.join(' → '));
  console.log('  最易低估的是质量控制：不能终端灭菌、不能简单纯化，体系只能建在过程控制上。');
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
  readDoc, sections, hanzi, cnToNumber, potencyTable, craftGates, reprogramPaths,
  nicheFactors, scaleClaims, conceptHits, missing, boundaries, summarize,
};
