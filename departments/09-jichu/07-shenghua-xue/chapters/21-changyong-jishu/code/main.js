#!/usr/bin/env node
/**
 * 生物化学 · 第 21 章 分子技术的选择不看好坏，只看它那个致命假设你的样本能不能满足 —— 正文与习题自检
 * 课程: departments/09-jichu/07-shenghua-xue/chapters/21-changyong-jishu/docs/zh.md
 * 依赖: 仅 Node.js 标准库；只读 ../docs/zh.md 与 ../quiz.json，不读 standards/。
 *
 * 本章的「单元」就是正文的二级节：每一节各管一件事，节标题即单元名。
 * 输出的四个数：正文字数、单元数、题量与解释长度、习题接地数。接地数指 check 题的
 * 正确选项里至少有一段 >=6 汉字的原文真的出现在当章正文里 —— 习题必须与正文同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIR = __dirname;
const DOC = path.join(DIR, '..', 'docs', 'zh.md');
const QUIZ = path.join(DIR, '..', 'quiz.json');

const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

const CHAPTER = 21;
const SLUG = '21-changyong-jishu';
const TITLE = ((doc.match(/^#[^\n]*/m) || [''])[0])
  .replace(/^#\s*/, '')
  .replace(/^第\s*\d+\s*章\s*·\s*/, '')
  .trim();

const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

/** 正文主体：从第一个二级节起，去掉标题行（章题、引文块不计入单元） */
function bodyText() {
  const lines = String(doc).split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s+/.test(l));
  if (start < 0) return '';
  return lines.slice(start).filter((l) => !/^#/.test(l)).join('\n');
}

/** 二级节 = 本章的一个单元 */
function chapterKeys() {
  return String(doc).split(/\r?\n/)
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

/** 每个单元的规模：汉字、段数、首句 */
function chapterUnits() {
  const blocks = [];
  let cur = null;
  for (const line of String(doc).split(/\r?\n/)) {
    if (/^##\s+/.test(line)) {
      if (cur) blocks.push(cur);
      cur = { title: line.replace(/^##\s+/, '').trim(), lines: [] };
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  if (cur) blocks.push(cur);
  return blocks.map((b, i) => {
    const body = b.lines.join('\n');
    const paras = b.lines.map((l) => l.trim())
      .filter((l) => l && !/^[#>|]/.test(l) && !/^[-*+]\s/.test(l) && !/^\d+[.、]/.test(l) && !l.includes('|'));
    return {
      index: i + 1,
      title: b.title,
      hanzi: hanzi(body),
      paragraphs: paras.length,
      lead: (paras[0] || '').slice(0, 24),
    };
  });
}

/** 汇总：单元数、总字数、最长与最短一节 */
function summarize(units) {
  if (!Array.isArray(units)) throw new TypeError('summarize 需要 chapterUnits() 的返回数组');
  const total = units.reduce((a, u) => a + u.hanzi, 0);
  const longest = units.reduce((a, u) => (u.hanzi > a.hanzi ? u : a), units[0] || { hanzi: 0, title: '—' });
  const shortest = units.reduce((a, u) => (u.hanzi < a.hanzi ? u : a), units[0] || { hanzi: 0, title: '—' });
  return {
    units: units.length,
    hanzi: total,
    mean: units.length ? Math.round(total / units.length) : 0,
    longest: { title: longest.title, hanzi: longest.hanzi },
    shortest: { title: shortest.title, hanzi: shortest.hanzi },
  };
}

/** 正文里 n 字连续汉字片段 */
function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 接地判据：正确选项里最长的一段连续原文 */
const N = 6;
const BODY = shingles(doc, N);

function grounded(option) {
  const clean = String(option || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + N <= seg.length; i += 1) if (BODY.has(seg.slice(i, i + N))) return true;
  }
  return false;
}

const why = (q) => q.explain || q.explanation || '';

function audit() {
  const units = chapterUnits();
  const s = summarize(units);
  const stages = { pre: 0, check: 0, post: 0 };
  for (const q of quiz.questions) stages[q.stage] = (stages[q.stage] || 0) + 1;
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const lens = quiz.questions.map((q) => hanzi(why(q)));
  return {
    hanzi: hanzi(doc),
    units: units.length,
    sum: s,
    total: quiz.questions.length,
    stages,
    checkCount: checks.length,
    hit: checks.filter((q) => grounded(q.options[q.correct])).length,
    minExplain: Math.min(...lens),
    maxExplain: Math.max(...lens),
  };
}

function main() {
  const a = audit();
  console.log('生物化学 第 ' + CHAPTER + ' 章 · ' + TITLE);
  console.log('正文 ' + a.hanzi + ' 汉字 · 单元（二级节） ' + a.units + ' 个 · 平均 ' + a.sum.mean + ' 字/节');
  console.log('最长一节：' + a.sum.longest.title + '（' + a.sum.longest.hanzi + ' 字）· 最短一节：' + a.sum.shortest.title + '（' + a.sum.shortest.hanzi + ' 字）');
  console.log('习题 ' + a.total + ' 题 (pre ' + a.stages.pre + '/check ' + a.stages.check + '/post ' + a.stages.post + ')'
    + ' · 解释 ' + a.minExplain + '-' + a.maxExplain + ' 汉字');
  console.log('接地 check 题 ' + a.hit + '/' + a.checkCount);

  const ok = a.hanzi >= 2500 && a.units >= 4 && a.total >= 6
    && a.stages.pre >= 1 && a.stages.check >= 3 && a.stages.post >= 2
    && a.hit >= 3 && a.minExplain >= 40 && a.maxExplain <= 80;
  if (!ok) {
    console.error('自检未通过');
    process.exit(1);
  }
  console.log('※ 本章为教学材料，示例为教学设定，不构成诊断、用药或检验结果解释的依据。');
}

if (require.main === module) main();

module.exports = { chapterKeys, chapterUnits, summarize, audit, grounded, shingles, hanzi, why, bodyText, CHAPTER, SLUG, TITLE, DOC, QUIZ, doc, quiz };
