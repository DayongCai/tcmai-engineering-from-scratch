#!/usr/bin/env node
/**
 * 口腔修复学 · 第 2 章 修复总原则：安全、有效、微创、健康、知情同意、姑息
 *
 *   node code/main.js
 *
 * 正文：chapters/02-zong-yuanze/docs/zh.md
 * 习题：chapters/02-zong-yuanze/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章习题：规模、数值读数、表格与习题体检全部现算，
 * 不手打数字，也不依赖任何外部取数表。正文改了，这里的结果跟着变。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 2;
const SLUG = '02-zong-yuanze';
const TITLE = '修复总原则：安全、有效、微创、健康、知情同意、姑息';

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const docLines = (doc) => String(doc).replace(/\r\n/g, '\n').split('\n');

/** 节标题：`## 一、…` */
function sections(doc) {
  return docLines(doc)
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

/** 段：非空，且不以标题、引文、表格行、清单符号或编号起始 */
function paragraphs(doc) {
  return docLines(doc)
    .map((l) => l.trim())
    .filter((l) => l && !/^[#>|]/.test(l) && !/^[-*+]\s/.test(l) && !/^\d+[.、]/.test(l))
    .filter((l) => !l.includes('|'));
}

/** markdown 表格：表头 + 去分隔行的数据行 */
function tables(doc) {
  const ls = docLines(doc);
  const cells = (l) =>
    l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const out = [];
  let i = 0;
  while (i < ls.length) {
    if (/^\s*\|/.test(ls[i])) {
      const block = [];
      while (i < ls.length && /^\s*\|/.test(ls[i])) {
        block.push(ls[i]);
        i += 1;
      }
      const header = cells(block[0]);
      const rows = block
        .slice(1)
        .filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l))
        .map(cells);
      out.push({ header, cols: header.length, rows });
    } else {
      i += 1;
    }
  }
  return out;
}

/* ── 正文里的数值读数 ───────────────────────────────────────────── */

// 长单位在前，避免「周岁」被「周」先吃掉一截
const UNITS = ['MPa', 'µm', 'mm', 'cm', 'kHz', '%', '分钟', '小时', '个月', '周岁', '秒', '天', '周', '次', '单位', '颗', '条'];
const PHYS = ['mm', 'cm', 'µm', 'MPa', '%', 'kHz', '秒', '分钟', '小时', '天', '周', '个月', '次'];
const esc = (u) => u.replace(/[.*+?^${}()|[\]\\%]/g, '\\$&');
const UNITS_ALT = UNITS.map(esc).join('|');
const UNIT_RE = new RegExp('(\\d+(?:\\.\\d+)?)\\s*(' + UNITS_ALT + ')', 'g');
const RANGE_RE = new RegExp(
  '(\\d+(?:\\.\\d+)?)\\s*(' + UNITS_ALT + ')?\\s*[—–~－]\\s*(\\d+(?:\\.\\d+)?)\\s*(' + UNITS_ALT + ')?',
  'g'
);

function readings(doc) {
  const text = String(doc).replace(/\r\n/g, '\n');
  const hits = [];
  let m;
  UNIT_RE.lastIndex = 0;
  while ((m = UNIT_RE.exec(text)) !== null) hits.push({ value: Number(m[1]), unit: m[2] });
  const byUnit = {};
  for (const h of hits) byUnit[h.unit] = (byUnit[h.unit] || 0) + 1;
  // 区间只保留带物理单位的，条款号与文号（001—2021、3.1—3.4 条）不算读数
  const ranges = [];
  RANGE_RE.lastIndex = 0;
  while ((m = RANGE_RE.exec(text)) !== null) {
    if (!PHYS.includes(m[2]) && !PHYS.includes(m[4])) continue;
    ranges.push(m[0].trim());
  }
  return { hits, byUnit, ranges };
}

/* ── 习题体检 ──────────────────────────────────────────────────── */

/** 正文里 4 字以上的连续汉字片段 */
function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function quizCheck(quiz, doc) {
  const body = grams(doc);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const issues = [];
  const items = qs.map((q, i) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    const hit = [...grams(right)].filter((g) => body.has(g));
    const why = q.explain || q.explanation || '';
    if (opts.length !== 4) issues.push('第 ' + (i + 1) + ' 题选项 ' + opts.length + ' 个');
    if (!(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < opts.length)) {
      issues.push('第 ' + (i + 1) + ' 题 correct 越界');
    }
    if (hanzi(why) < 30) issues.push('第 ' + (i + 1) + ' 题解释 ' + hanzi(why) + ' 汉字，少于 30');
    return {
      n: i + 1,
      stage: q.stage,
      options: opts.length,
      correct: q.correct,
      explainHanzi: hanzi(why),
      grounded: hit.length,
      sample: hit.slice(0, 2),
    };
  });
  if (items.length < 6) issues.push('题量 ' + items.length + ' 少于 6');
  for (const s of ['pre', 'check', 'post']) if (!stage[s]) issues.push('缺 ' + s + ' 段');
  const grounded = items.filter((x) => x.stage === 'check' && x.grounded > 0).length;
  if (grounded < 2) issues.push('check 题接地 ' + grounded + ' 道，少于 2');
  const answers = items.map((x) => x.correct);
  return {
    total: items.length,
    stage,
    items,
    answers,
    distinctAnswers: new Set(answers).size,
    grounded,
    minExplain: items.length ? Math.min(...items.map((x) => x.explainHanzi)) : 0,
    maxExplain: items.length ? Math.max(...items.map((x) => x.explainHanzi)) : 0,
    issues,
  };
}

/* ── 汇总 ──────────────────────────────────────────────────────── */

function analyze() {
  const doc = fs.readFileSync(DOC, 'utf8');
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const ts = tables(doc);
  return {
    docHanzi: hanzi(doc),
    paragraphs: paragraphs(doc).length,
    sections: sections(doc),
    tables: ts.map((t) => ({ header: t.header, cols: t.cols, rows: t.rows.length })),
    cells: ts.reduce((s, t) => s + t.cols * t.rows.length, 0),
    readings: readings(doc),
    quiz: quizCheck(quiz, doc),
  };
}

function main() {
  const r = analyze();
  const q = r.quiz;
  const rd = r.readings;

  console.log('口腔修复学 第 ' + CHAPTER + ' 章 · ' + TITLE);
  console.log(
    '正文 ' + r.docHanzi.toLocaleString('en-US') + ' 汉字 · ' + r.paragraphs + ' 段 · 节 ' +
      r.sections.length + ' 个 · 表 ' + r.tables.length + ' 张（' + r.cells + ' 格）'
  );
  console.log('');
  console.log('节：');
  for (const s of r.sections) console.log('  ' + s);
  console.log('');
  console.log('表：');
  if (!r.tables.length) console.log('  （无）');
  r.tables.forEach((t, i) =>
    console.log('  [' + (i + 1) + '] ' + t.header.join(' / ') + ' —— ' + t.cols + ' 列 × ' + t.rows + ' 行')
  );
  console.log('');
  console.log('数值读数（从正文筛出的数值 + 单位）：');
  console.log('  共 ' + rd.hits.length + ' 处，其中区间 ' + rd.ranges.length + ' 处');
  const rank = Object.entries(rd.byUnit).sort((a, b) => b[1] - a[1]).slice(0, 6);
  console.log('  单位分布：' + (rank.map(([u, c]) => u + ' ' + c).join(' · ') || '（无）'));
  if (rd.ranges.length) console.log('  区间抽样：' + rd.ranges.slice(0, 6).join('、'));
  console.log('');
  console.log(
    '习题 ' + q.total + ' 题 · pre ' + q.stage.pre + ' / check ' + q.stage.check + ' / post ' + q.stage.post +
      ' · 答案位置 ' + q.answers.join('/')
  );
  console.log('  check 题接地 ' + q.grounded + ' 道 · 解释 ' + q.minExplain + '—' + q.maxExplain + ' 汉字 · 答案落在 ' + q.distinctAnswers + ' 个位置');
  for (const it of q.items) {
    console.log(
      '  ' + String(it.n).padStart(2, '0') + ' ' + String(it.stage).padEnd(5) +
        ' 选项 ' + it.options + ' · 解释 ' + it.explainHanzi + ' 汉字 · 接地 ' + it.grounded
    );
  }
  console.log(q.issues.length ? '  → 体检不合格：' + q.issues.join('；') : '  → 体检全部合格');
  console.log('');
  console.log('※ 以上数字由本章正文与习题现算，改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成诊疗建议，具体方案须由执业医师作出。');
  if (q.issues.length) process.exitCode = 2;
}

if (require.main === module) main();

module.exports = { analyze, sections, paragraphs, tables, readings, grams, quizCheck, hanzi, CHAPTER, SLUG, TITLE, DOC, QUIZ };
