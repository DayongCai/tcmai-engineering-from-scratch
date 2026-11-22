#!/usr/bin/env node
/**
 * 医学生物学 · 第 5 章 细胞质：流水线的节点与三类病变，从正文里算出来
 * 课程: departments/09-jichu/04-yixue-shengwu-xue/chapters/05-xibao-zhi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：单向流水线有几个节点几步、线粒体几条结构要点、细胞质病变几类，
 * 都从本章正文读出后计算。正文改版后重跑即可复现。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '5';
const SLUG = '05-xibao-zhi';
const TITLE = '细胞质不是一锅汤，是一条有方向、有分区、要收费的流水线';

/** 本章论证链上的关键词：正文必须出现，否则说明正文与习题已经脱节 */
const CONCEPTS = ['通道化', '分区', '内膜系统', '共翻译', '翻译后', '马达蛋白', '内共生', '蓄积'];

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

/** 正文那条单向流水线：「**核膜 → 粗面内质网 → …**」 */
function pipeline(text = readDoc()) {
  const line = lines(text).find((l) => /→/.test(l) && /\*\*/.test(l));
  if (!line) return { nodes: [], steps: 0 };
  const body = line.replace(/\*\*/g, '').replace(/^[^：:]*[:：]/, '').trim();
  const nodes = body
    .split('→')
    .map((x) => x.replace(/[。\s]$/, '').replace(/^或/, '').trim())
    .filter(Boolean);
  return { nodes, steps: Math.max(0, nodes.length - 1) };
}

/** 「六、」节的三类病变表：类型 / 实质 / 形态学线索 */
function lesionTable(text = readDoc()) {
  const rows = [];
  for (const line of lines(text)) {
    if (!/^\|/.test(line) || /^\|[\s\-:|]+\|$/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length !== 3) continue;
    if (/^类型$/.test(cells[0])) continue;
    rows.push({ type: cells[0], substance: cells[1], clue: cells[2] });
  }
  return rows;
}

/** 「三、」节里编号的线粒体结构要点 */
function mitochondrionPoints(text = readDoc()) {
  const start = lines(text).findIndex((l) => /^##\s*三、线粒体/.test(l));
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < lines(text).length; i += 1) {
    const line = lines(text)[i].trim();
    if (/^##\s/.test(line)) break;
    if (/^\d+\.\s+\*\*/.test(line)) out.push((line.match(/\*\*([^*]+)\*\*/) || [, ''])[1]);
  }
  return out;
}

/** 「四、」节两条去路：带信号肽 / 不带信号肽 */
function proteinRoutes(text = readDoc()) {
  return lines(text)
    .filter((l) => /^-\s+\*\*(带内质网信号肽|不带信号肽)\*\*/.test(l))
    .map((l) => (l.match(/\*\*([^*]+)\*\*/) || [, ''])[1]);
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
    pipeline: pipeline(text),
    lesions: lesionTable(text),
    mitochondria: mitochondrionPoints(text),
    routes: proteinRoutes(text),
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
  console.log('单向流水线（正文现算）：' + s.pipeline.nodes.length + ' 个节点 · ' + s.pipeline.steps + ' 步');
  s.pipeline.nodes.forEach((n, i) => console.log('  ' + (i + 1) + '. ' + n));
  console.log('  → 位置由「经过哪一段」决定：分选出错时表型是东西出现在不该出现的地方。');
  console.log('');
  console.log('线粒体的结构要点 ' + s.mitochondria.length + ' 条：' + s.mitochondria.join('、'));
  console.log('蛋白的两条去路 ' + s.routes.length + ' 条：' + s.routes.join('／'));
  console.log('');
  console.log('细胞质病变（正文表格现算 ' + s.lesions.length + ' 类）：');
  for (const l of s.lesions) console.log('  ' + l.type + '：' + l.substance + '（线索：' + l.clue + '）');
  console.log('  → 判据顺序：多了什么 → 为什么没被清掉 → 清除系统靠什么供能。');
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
  readDoc, sections, hanzi, pipeline, lesionTable, mitochondrionPoints, proteinRoutes,
  conceptHits, missing, boundaries, summarize,
};
