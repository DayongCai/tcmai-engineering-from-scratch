#!/usr/bin/env node
/**
 * 推拿功法学 · 第 12 章 正文与习题自检
 * 课程: departments/03-zhenjiu/18-tuina-gongfa-xue/chapters/12-xiandai-shuzihua/docs/zh.md
 * 依赖: 仅 Node.js 标准库；只读 ../docs/zh.md 与 ../quiz.json，不读 standards/。
 *
 * 输出四组数：正文字数、二级节数、题量与解释长度、习题接地数。接地数指 check 题的
 * 正确选项里至少有一段 >=6 汉字的原文真的出现在当章正文里 —— 习题必须与正文同源。
 * 任一项不达标，退出码为 1（可当作习题层的回归测试跑）。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIR = __dirname;
const ROOT = path.resolve(DIR, '..');
const DOC = path.join(ROOT, 'docs', 'zh.md');
const QUIZ = path.join(ROOT, 'quiz.json');

const SLUG = path.basename(ROOT);
const CHAPTER = String(Number(SLUG.slice(0, 2)));

const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

const hz = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;
const secs = (text) => (String(text || '').match(/^## /gm) || []).length;

const TITLE = ((doc.match(/^#[^\n]*/m) || [''])[0])
  .replace(/^#\s*/, '')
  .replace(/^第\s*\d+\s*章\s*·\s*/, '')
  .trim();

/** 正文里 n 字连续汉字片段集合 */
function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const N = 6;
const BODY = shingles(doc, N);

/** 接地：选项里有一段 >=N 汉字的连续原文 */
function grounded(option) {
  const clean = String(option || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + N <= seg.length; i += 1) if (BODY.has(seg.slice(i, i + N))) return true;
  }
  return false;
}

const why = (q) => q.explain || q.explanation || '';

/** 本章的单元：二级节各算一个，hanzi 是该节汉字数 */
function chapterUnits(text = doc) {
  const units = [];
  for (const line of String(text).split(/\r?\n/)) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) units.push({ key: 'h2-' + (units.length + 1), title: m[1], hanzi: 0 });
    else if (units.length) units[units.length - 1].hanzi += hz(line);
  }
  return units;
}

function chapterKeys(text = doc) {
  return chapterUnits(text).map((u) => u.key);
}

/** 习题层体检：题量、分段、选项、解释长度、接地 */
function summarize(q = quiz) {
  const list = Array.isArray(q.questions) ? q.questions : [];
  const stages = { pre: 0, check: 0, post: 0 };
  for (const it of list) stages[it.stage] = (stages[it.stage] || 0) + 1;
  const checks = list.filter((it) => it.stage === 'check');
  const lens = list.map((it) => hz(why(it)));
  const hit = checks.filter((it) => grounded((it.options || [])[it.correct])).length;
  const minExplain = lens.length ? Math.min.apply(null, lens) : 0;
  const maxExplain = lens.length ? Math.max.apply(null, lens) : 0;
  const four = list.every((it) => (it.options || []).length === 4);
  const idx = list.every((it) => Number.isInteger(it.correct)
    && it.correct >= 0 && it.correct < (it.options || []).length);
  return {
    total: list.length,
    stages: stages,
    checks: checks.length,
    grounded: hit,
    minExplain: minExplain,
    maxExplain: maxExplain,
    four: four,
    idx: idx,
    ok: list.length === 6 && stages.pre === 1 && stages.check === 3 && stages.post === 2
      && four && idx && hit === checks.length && hit >= 3
      && minExplain >= 40 && maxExplain <= 80,
  };
}

function audit() {
  return { hanzi: hz(doc), secs: secs(doc), units: chapterUnits().length, quiz: summarize() };
}

function main() {
  const a = audit();
  console.log('═══ 推拿功法学 · 第 ' + CHAPTER + ' 章 ' + TITLE + ' ═══');
  console.log('slug ' + SLUG + ' · 正文 ' + a.hanzi + ' 汉字 · 二级节 ' + a.secs);
  console.log('习题 ' + a.quiz.total + ' 题 (pre ' + a.quiz.stages.pre + '/check '
    + a.quiz.stages.check + '/post ' + a.quiz.stages.post + ') · 解释 '
    + a.quiz.minExplain + '-' + a.quiz.maxExplain + ' 汉字');
  console.log('接地 check 题 ' + a.quiz.grounded + '/' + a.quiz.checks);
  for (const u of chapterUnits()) console.log('  ' + u.key + '\t' + u.title + '\t' + u.hanzi + '字');
  const ok = a.hanzi >= 2500 && a.secs >= 4 && a.units >= 4 && a.quiz.ok;
  if (!ok) {
    console.error('自检未通过');
    process.exit(1);
  }
  console.log('※ 教学样例：习题只读本章正文与 quiz.json，不构成诊疗建议，也不能替代带教与规范化培训。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC, QUIZ, doc, quiz,
  hz, secs, shingles, grounded, why,
  chapterKeys, chapterUnits, summarize, audit, main,
};
