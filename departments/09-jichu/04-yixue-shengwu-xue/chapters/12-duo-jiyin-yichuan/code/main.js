#!/usr/bin/env node
/**
 * 医学生物学 · 第 12 章 多基因遗传：平方根近似与家族史三条，从正文里算出来
 * 课程: departments/09-jichu/04-yixue-shengwu-xue/chapters/12-duo-jiyin-yichuan/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：人群患病率的平方根、亲属风险相对人群风险的倍数、以及正文里
 * 关联研究「不能说明」的条数、家族史三条与评分四条边界，都从本章正文读出后计算。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = '12';
const SLUG = '12-duo-jiyin-yichuan';
const TITLE = '多基因病的遗传不是「传下去」，是「分布的一端被推过了线」';

/** 本章论证链上的关键词：正文必须出现，否则说明正文与习题已经脱节 */
const CONCEPTS = ['连续', '阈值', '微效', '遗传度', '关联', '多基因风险评分', '缺失的遗传度'];

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

/** 正文的患病率口径：只认「患病率…X分之Y」这种带上下文的写法 */
function prevalenceStatements(text = readDoc()) {
  const out = [];
  const re = /患病率(?:约为|约等于|约|升到|为)?\s*([一二两三四五六七八九十百千]+)分之([一二两三四五六七八九十]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const den = cnNum(m[1]);
    const num = cnNum(m[2]);
    if (!num || !den) continue;
    out.push({ p: num / den, zh: m[1] + '分之' + m[2], index: m.index, end: m.index + m[0].length });
  }
  return out;
}

function cnNum(s) {
  const D = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (/^\d+$/.test(s)) return Number(s);
  if (s === '十') return 10;
  if (s === '百') return 100;
  if (s === '千') return 1000;
  if (/^十[一二三四五六七八九]$/.test(s)) return 10 + D[s[1]];
  if (/^[一二三四五六七八九]十$/.test(s)) return D[s[0]] * 10;
  return D[s] || 0;
}

/** 患病率之后 160 字内的百分比结论：优先取 √p 的演算式 */
function statedFor(text, at, p) {
  const window = text.slice(at, at + 160);
  const sqrt = window.match(/√\s*([\d.]+)\s*≈\s*([\d.]+)%/);
  if (sqrt && Math.abs(Number(sqrt[1]) - p) / p < 0.05) return Number(sqrt[2]);
  const zh = window.match(/百分之([一二两三四五六七八九十]+)/);
  return zh ? cnNum(zh[1]) : null;
}

/** √p 近似：正文的患病率口径 → 现算的同胞风险 */
function sqrtApproximation(text = readDoc()) {
  const cases = prevalenceStatements(text).map((f) => {
    const root = Math.sqrt(f.p);
    return {
      p: f.p,
      label: f.zh,
      sqrt: root,
      sqrtPct: root * 100,
      statedPct: statedFor(text, f.end, f.p),
      fold: root / f.p,
    };
  });
  return { cases };
}

/** 正文的百分比口径是否与 √p 现算一致（允许 0.2 个百分点的取整误差） */
function claimDrift(text = readDoc()) {
  return sqrtApproximation(text).cases.filter(
    (c) => c.statedPct === null || Math.abs(c.sqrtPct - c.statedPct) > 0.25,
  );
}

/** 编号条目：某节里的 1. 2. 3. */
function numberedIn(text, headingRe) {
  const ls = lines(text);
  const start = ls.findIndex((l) => headingRe.test(l));
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < ls.length; i += 1) {
    const line = ls[i].trim();
    if (/^##\s/.test(line)) break;
    if (/^\d+\.\s+\*\*/.test(line)) out.push((line.match(/\*\*([^*]+)\*\*/) || [, ''])[1]);
  }
  return out;
}

/** 「五、」节评分四条边界（破折号条目） */
function scoreLimits(text = readDoc()) {
  const ls = lines(text);
  const start = ls.findIndex((l) => /^##\s*五、多基因风险评分/.test(l));
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < ls.length; i += 1) {
    const line = ls[i].trim();
    if (/^##\s/.test(line)) break;
    if (/^-\s+\*\*/.test(line)) out.push((line.match(/\*\*([^*]+)\*\*/) || [, ''])[1]);
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
    sqrt: sqrtApproximation(text),
    drift: claimDrift(text),
    associationLimits: numberedIn(text, /^##\s*四、关联研究/),
    familyHistory: numberedIn(text, /^##\s*六、临床读家族史/),
    scoreLimits: scoreLimits(text),
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
  console.log('平方根近似（正文口径读入后现算）：');
  for (const c of s.sqrt.cases) {
    console.log('  ' + c.label + '：√' + c.p + ' = ' + (c.sqrtPct).toFixed(1) + '%；正文写 '
      + (c.statedPct === null ? '—' : c.statedPct + '%')
      + '；相对人群风险 ' + c.fold.toFixed(0) + ' 倍');
  }
  console.log('  → 超差项：' + (s.drift.length ? s.drift.map((d) => d.label).join('、') : '无'));
  console.log('  → 相对风险高出数倍，绝对风险仍然很小：这正是家族史既不能忽略、也不能当判决的原因。');
  console.log('');
  console.log('关联研究不能说明的四件事（' + s.associationLimits.length + ' 件）：' + s.associationLimits.join('、'));
  console.log('评分的四条边界（' + s.scoreLimits.length + ' 条）：' + s.scoreLimits.join('、'));
  console.log('家族史只读三件事（' + s.familyHistory.length + ' 件）：' + s.familyHistory.join('、'));
  console.log('  → 评分用来决定谁该被更早关注，不用来决定谁是谁不是。');
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
  readDoc, sections, hanzi, sqrtApproximation, claimDrift, numberedIn, scoreLimits,
  conceptHits, missing, boundaries, summarize,
};
