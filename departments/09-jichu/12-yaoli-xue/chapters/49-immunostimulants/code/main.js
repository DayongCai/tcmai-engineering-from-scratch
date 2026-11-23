#!/usr/bin/env node
/**
 * 药理学 · 第 49 章 免疫增强药：方向相反，道理相同
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/49-immunostimulants/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：正文汉字、分节与小节的分布、表格行数、各节占比与最厚最薄的落差，
 * 都从本章 docs/zh.md 读出后计算。正文改版后重跑即可复现；手打的数字会静默过期。
 * 只读本章正文，不读任何标准件与底本。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '49';
const SLUG = '49-immunostimulants';
const TITLE = '免疫增强药：方向相反，道理相同';

/** 章题从正文 H1 现读：H1 改写后输出不会与正文脱节 */
function docTitle(file) {
  const raw = fs.readFileSync(file || DOC, 'utf8');
  const h1 = raw.split(String.fromCharCode(10)).find((l) => l.slice(0, 2) === '# ');
  if (!h1) return TITLE;
  const t = h1.slice(2).trim();
  const i = t.indexOf('章');
  return (i >= 0 ? t.slice(i + 1) : t).replace('·', '').trim();
}

/** 本章论证链上的关键词：正文必须出现，否则说明正文与习题已经脱节 */
const CONCEPTS = ['佐剂', '抗原', '细胞因子', '受体', '非特异性', '免疫应答', '过度激活', '观察'];

/** 读正文：去掉围栏代码块与首行章题；章题改写不应改变统计口径 */
function readDoc(file) {
  const raw = fs.readFileSync(file || DOC, 'utf8');
  return raw.replace(/```[\s\S]*?```/g, '').replace(/^#\s.*$/m, '');
}

const hanzi = (s) => (String(s).match(/[\u4e00-\u9fff]/g) || []).length;

/** 「## 」二级标题，按出现顺序 */
function sections(text) {
  const t = text === undefined ? readDoc() : text;
  return t.split(/\r?\n/).filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
}

/** 「#### 」三级标题（逐条落位）；部分章不设这一层，返回空数组 */
function subsections(text) {
  const t = text === undefined ? readDoc() : text;
  return t.split(/\r?\n/).filter((l) => /^####\s+/.test(l)).map((l) => l.replace(/^####\s+/, '').trim());
}

/** 表格：块数与数据行数（去掉表头分隔行） */
function tables(text) {
  const t = text === undefined ? readDoc() : text;
  const lines = t.split(/\r?\n/);
  const blocks = [];
  let cur = null;
  for (const l of lines) {
    if (/^\|/.test(l)) {
      if (!cur) { cur = []; blocks.push(cur); }
      if (!/^\|[\s\-:|]+\|$/.test(l)) cur.push(l);
    } else cur = null;
  }
  return blocks.map((b) => ({ rows: Math.max(0, b.length - 1) }));
}

/** 逐节汉字与占比 */
function sectionStats(text) {
  const t = text === undefined ? readDoc() : text;
  const lines = t.split(/\r?\n/);
  const out = [];
  let cur = null;
  for (const l of lines) {
    if (/^##\s+/.test(l)) {
      cur = { title: l.replace(/^##\s+/, '').trim(), hanzi: 0 };
      out.push(cur);
    } else if (cur) cur.hanzi += hanzi(l);
  }
  const total = out.reduce((n, s) => n + s.hanzi, 0) || 1;
  return out.map((s) => ({ ...s, share: Math.round((s.hanzi / total) * 1000) / 10 }));
}

/** 关键词命中：全章次数 + 出现在哪几节 */
function conceptHits() {
  const t = readDoc();
  const lines = t.split(/\r?\n/);
  return CONCEPTS.map((term) => {
    const total = t.split(term).length - 1;
    let cur = null;
    const where = new Set();
    for (const l of lines) {
      if (/^##\s+/.test(l)) cur = l.replace(/^##\s+/, '').trim();
      else if (cur && l.includes(term)) where.add(cur);
    }
    return { term, total, sections: where.size };
  });
}

/** 边界条目：「代价与边界」一节的列表项 */
function boundaries(text) {
  const t = text === undefined ? readDoc() : text;
  const lines = t.split(/\r?\n/);
  const i = lines.findIndex((l) => /^##\s*代价与边界/.test(l));
  if (i < 0) return [];
  const out = [];
  for (let k = i + 1; k < lines.length; k += 1) {
    if (/^##\s/.test(lines[k])) break;
    if (/^-\s+/.test(lines[k].trim())) out.push(lines[k].trim().replace(/^-\s+/, ''));
  }
  return out;
}

/** 本章算术：节均字、最厚最薄比、关键词密度（次/千字） */
function arithmetic(text) {
  const t = text === undefined ? readDoc() : text;
  const body = hanzi(t);
  const secs = sectionStats(t);
  const content = secs.filter((s) => !/课程信息|运行与验证|免责/.test(s.title));
  const avg = content.length ? Math.round(content.reduce((n, s) => n + s.hanzi, 0) / content.length) : 0;
  const sorted = [...content].sort((a, b) => a.hanzi - b.hanzi);
  const thin = sorted[0] || { title: '', hanzi: 0 };
  const thick = sorted[sorted.length - 1] || { title: '', hanzi: 0 };
  const ratio = thin.hanzi ? Math.round((thick.hanzi / thin.hanzi) * 100) / 100 : 0;
  const hits = conceptHits().reduce((n, c) => n + c.total, 0);
  return {
    body, avg, ratio,
    thin: { title: thin.title, hanzi: thin.hanzi },
    thick: { title: thick.title, hanzi: thick.hanzi },
    hits,
    density: body ? Math.round((hits / body) * 10000) / 10 : 0,
    sections: content.length,
  };
}

function summarize() {
  const t = readDoc();
  return {
    chapter: CHAPTER, slug: SLUG, title: docTitle(), hint: TITLE,
    hanzi: hanzi(t),
    sections: sections(t),
    subsections: subsections(t),
    tables: tables(t),
    sectionStats: sectionStats(t),
    concepts: conceptHits(),
    boundaries: boundaries(t),
    arithmetic: arithmetic(t),
  };
}

function main() {
  const s = summarize();
  const a = s.arithmetic;
  console.log('药理学 · 第 ' + CHAPTER + ' 章 ' + docTitle());
  console.log('');
  console.log('正文 ' + s.hanzi.toLocaleString('en-US') + ' 汉字 · 二级节 ' + s.sections.length
    + ' 个' + (s.subsections.length ? ' · 三级小节 ' + s.subsections.length + ' 个' : '')
    + ' · 表格 ' + s.tables.length + ' 张（数据行 ' + s.tables.reduce((n, x) => n + x.rows, 0) + ' 行）');
  console.log('');
  console.log('逐节汉字与占比（含表头节，故占比合计不足一百）：');
  for (const x of s.sectionStats) console.log('  ' + x.title + ' · ' + x.hanzi + ' 字 · ' + x.share + '%');
  console.log('');
  console.log('本章算术：论证节 ' + a.sections + ' 个，节均 ' + a.avg + ' 字；最厚「' + a.thick.title
    + '」' + a.thick.hanzi + ' 字，最薄「' + a.thin.title + '」' + a.thin.hanzi + ' 字，倍差 ' + a.ratio + ' 倍');
  console.log('关键词密度：' + a.hits + ' 次 / ' + a.body + ' 字 = ' + a.density + ' 次每千字');
  console.log('');
  console.log('关键词落位（正文现算）：');
  for (const c of s.concepts) {
    console.log('  ' + (c.total ? '✓' : '✗') + ' ' + c.term + '：' + c.total + ' 次，分布于 ' + c.sections + ' 节');
  }
  console.log('');
  console.log('边界条目 ' + s.boundaries.length + ' 条；首条：' + (s.boundaries[0] || '无').slice(0, 80));
  console.log('');
  console.log('※ 现算自 ' + SLUG + '/docs/zh.md；正文改版后重跑即可复现。');
  console.log('教学边界：本章只解释分类、机制、体内过程与观察口径，不写剂量与用法量值，不作适应证判定，不构成用药建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, TITLE, docTitle, CONCEPTS,
  readDoc, hanzi, sections, subsections, tables, sectionStats,
  conceptHits, boundaries, arithmetic, summarize,
};
