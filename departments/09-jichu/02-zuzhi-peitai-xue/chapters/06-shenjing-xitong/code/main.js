#!/usr/bin/env node
/**
 * 第 6 章 中枢的构筑只有两条原则：胞体聚成层或团，纤维走成束
 *
 * 课程: departments/09-jichu/02-zuzhi-peitai-xue/chapters/06-shenjing-xitong/docs/zh.md
 * 数据: standards/zuzhi-peitai-xue/units.json（单元层：单元号、节号、汉字数）
 *       standards/zuzhi-peitai-xue/chapter-map.json（课程章 → 教材单元号）
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：章节规模、单元映射、正文结构与表格、quiz 结构与接地，都从本仓文件读出，
 * 不写死任何一个计数 —— 正文、单元层或 quiz 一变，输出就跟着变。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'zuzhi-peitai-xue', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/zuzhi-peitai-xue/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const SUBJECT = 'zuzhi-peitai-xue';
const UNITS = path.join(ROOT, 'standards', SUBJECT, 'units.json');
const MAP = path.join(ROOT, 'standards', SUBJECT, 'chapter-map.json');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 6;
const SLUG = '06-shenjing-xitong';
const TITLE = '中枢的构筑只有两条原则：胞体聚成层或团，纤维走成束';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

/* ── 单元层：课程章 → 教材单元 ─────────────────────────────────── */

function chapterKeys() {
  const cm = readJson(MAP).chapters;
  if (!cm[SLUG]) throw new Error('chapter-map.json 里没有这一章: ' + SLUG);
  return cm[SLUG].units.slice();
}

function chapterUnits() {
  const keys = chapterKeys();
  return readJson(UNITS).units
    .filter((u) => keys.includes(u.sub))
    .sort((a, b) => String(a.sub).localeCompare(String(b.sub), 'en', { numeric: true }));
}

function summarize(units) {
  const hanziSum = units.reduce((a, u) => a + (u.hanzi || 0), 0);
  const secs = [...new Set(units.map((u) => u.secNo || String(u.sub).split('.').slice(0, 2).join('.')))];
  return {
    units: units.length,
    hanzi: hanziSum,
    perUnit: units.length ? Math.round(hanziSum / units.length) : 0,
    secs: secs.sort((a, b) => String(a).localeCompare(String(b), 'en', { numeric: true })),
  };
}

/* ── 正文结构 ─────────────────────────────────────────────────── */

function sections(doc) {
  return String(doc).split('\n').filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
}

function paragraphs(doc) {
  return String(doc).split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^[#>|]/.test(l) && !/^[-*+]\s/.test(l) && !/^\d+[.、]/.test(l) && !l.includes('|'));
}

function tables(doc) {
  const ls = String(doc).split('\n');
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const out = [];
  let i = 0;
  while (i < ls.length) {
    if (/^\s*\|/.test(ls[i])) {
      const block = [];
      while (i < ls.length && /^\s*\|/.test(ls[i])) { block.push(ls[i]); i += 1; }
      const header = cells(block[0]);
      const rows = block.slice(1).filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l));
      out.push({ header, cols: header.length, rows: rows.length });
    } else { i += 1; }
  }
  return out;
}

/* ── quiz：结构 + 接地 ───────────────────────────────────────── */

/** text 里出现在 option 中的最长连续汉字片段（接地强度的度量） */
function longestRun(option, text) {
  const body = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const segs = String(option || '').split(/[^\u4e00-\u9fff]+/).filter(Boolean);
  let best = 0;
  let sample = '';
  for (const seg of segs) {
    for (let i = 0; i < seg.length; i += 1) {
      for (let j = seg.length; j - i > best; j -= 1) {
        const t = seg.slice(i, j);
        if (body.includes(t)) { best = t.length; sample = t; break; }
      }
    }
  }
  return { best, sample };
}

function quizSummary(quiz, doc) {
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const items = qs.map((q, i) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    const hit = q.stage === 'check' ? longestRun(right, doc) : { best: 0, sample: '' };
    return {
      n: i + 1,
      stage: q.stage,
      options: opts.length,
      correct: q.correct,
      explainHanzi: hanzi(q.explain || q.explanation || ''),
      ground: hit.best,
      sample: hit.sample,
    };
  });
  return {
    total: qs.length,
    stage,
    items,
    answers: qs.map((q) => q.correct).join('/'),
    distinctAnswers: new Set(qs.map((q) => q.correct)).size,
    checkGrounded: items.filter((x) => x.stage === 'check' && x.ground >= 8).length,
    minGround: items.filter((x) => x.stage === 'check').reduce((m, x) => Math.min(m, x.ground), 99),
    minExplain: items.length ? Math.min(...items.map((x) => x.explainHanzi)) : 0,
    maxExplain: items.length ? Math.max(...items.map((x) => x.explainHanzi)) : 0,
    stageComplete: ['pre', 'check', 'post'].every((s) => stage[s] > 0),
  };
}

/* ── 汇总 ─────────────────────────────────────────────────────── */

function analyze() {
  const doc = readDoc();
  const quiz = readJson(QUIZ);
  const units = chapterUnits();
  return {
    docHanzi: hanzi(doc),
    paragraphs: paragraphs(doc).length,
    sections: sections(doc),
    tables: tables(doc),
    units,
    unit: summarize(units),
    quiz: quizSummary(quiz, doc),
  };
}

function main() {
  const r = analyze();
  console.log('第 ' + CHAPTER + ' 章 ' + TITLE);
  console.log('课程目录 departments/09-jichu/02-zuzhi-peitai-xue/chapters/' + SLUG);
  console.log('正文 ' + r.docHanzi.toLocaleString('en-US') + ' 汉字 · ' + r.paragraphs + ' 段 · 二级节 ' + r.sections.length + ' 个 · 表 ' + r.tables.length + ' 张');
  console.log('');
  console.log('单元映射 ' + r.unit.units + ' 个（教材 ' + r.unit.secs.join('、') + '，' + r.unit.secs.length + ' 节）· 单元层 ' + r.unit.hanzi.toLocaleString('en-US') + ' 汉字 · 每单元平均 ' + r.unit.perUnit + ' 汉字');
  console.log('');
  console.log('正文结构：');
  for (const s of r.sections) console.log('  ' + s);
  if (r.tables.length) {
    console.log('');
    r.tables.forEach((t, i) => console.log('  表[' + (i + 1) + '] ' + t.header.join(' / ') + ' —— ' + t.cols + ' 列 × ' + t.rows + ' 行'));
  }
  console.log('');
  console.log('quiz ' + r.quiz.total + ' 题（pre ' + r.quiz.stage.pre + ' / check ' + r.quiz.stage.check + ' / post ' + r.quiz.stage.post + '）· 答案 ' + r.quiz.answers + ' · 落在 ' + r.quiz.distinctAnswers + ' 个位置');
  console.log('  check 题接地 ' + r.quiz.checkGrounded + '/' + r.quiz.stage.check + ' 道 · 最短原文连续片段 ' + (r.quiz.minGround === 99 ? 0 : r.quiz.minGround) + ' 汉字 · 解释 ' + r.quiz.minExplain + '–' + r.quiz.maxExplain + ' 汉字');
  r.quiz.items.forEach((it) => {
    console.log('  第' + it.n + '题 [' + it.stage + '] 选项 ' + it.options + ' · 答案 ' + it.correct + ' · 解释 ' + it.explainHanzi + ' 汉字' + (it.stage === 'check' ? ' · 正文原句 ' + it.ground + ' 字（' + it.sample + '）' : ''));
  });
  console.log('');
  console.log('※ 以上数字由本章正文、单元层与 quiz 现算，改任一份材料后重跑即可复核。');
  console.log('※ 本章为教学材料，判读与分档均为课堂约定，不构成诊断或治疗依据，也不替代具备资质人员的判断。');
}

if (require.main === module) main();

module.exports = {
  chapterKeys,
  chapterUnits,
  summarize,
  analyze,
  readDoc,
  sections,
  paragraphs,
  tables,
  longestRun,
  hanzi,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  SUBJECT,
  DOC,
  QUIZ,
  UNITS,
  MAP,
};
