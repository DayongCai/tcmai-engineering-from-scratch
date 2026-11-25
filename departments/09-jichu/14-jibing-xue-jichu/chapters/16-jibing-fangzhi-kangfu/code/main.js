#!/usr/bin/env node
/**
 * 疾病学基础 · 第 16 章 预防的成败不在口号，而在「谁、在什么时点、做什么」
 *
 *   node code/main.js
 *
 * 只读两处：
 *   正文  chapters/16-jibing-fangzhi-kangfu/docs/zh.md
 *   习题  chapters/16-jibing-fangzhi-kangfu/quiz.json
 * 依赖：仅 Node.js 标准库。不读任何取数表：正文改了，这里打印的数字跟着变。
 *
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 本章算术：从三级时点表与并列短语解析条目，再算途径、闭环与随访的组合数
 *   · 习题：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 16;
const SLUG = '16-jibing-fangzhi-kangfu';
const TITLE = '预防的成败不在口号，而在「谁、在什么时点、做什么」';

/* ── 文本口径 ────────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const docLines = (doc) => String(doc).split(/\r?\n/);

/** 节标题：`## 一、…` */
function sections(doc) {
  return docLines(doc).filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
}

/** 段：非空，不以标题、引文、表格行、清单符号或编号起始 */
function paragraphs(doc) {
  return docLines(doc)
    .map((l) => l.trim())
    .filter((l) => l && !/^[#>|]/.test(l) && !/^[-*+]\s/.test(l) && !/^\d+[.、]/.test(l))
    .filter((l) => !l.includes('|'));
}

/** markdown 表格：表头 + 去分隔行的数据行 */
function tables(doc) {
  const ls = docLines(doc);
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
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
      const rows = block.slice(1).filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l)).map(cells);
      out.push({ header, cols: header.length, rows });
    } else {
      i += 1;
    }
  }
  return out;
}

const tableBy = (ts, kw) => ts.find((t) => t.header.join(' ').includes(kw));

/** 并列项：先削括号内的举例，再按顿号切 */
function items(s) {
  return String(s || '')
    .replace(/（[^）]*）/g, '')
    .split(/[、，,；;／]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/* ── 本章算术（逐章注入，全部从正文解析） ────────────────────────── */

function chapterArithmetic(doc, ts) {
  const levelTable = tableBy(ts, '常见误用'); // 三级预防时点表
  const levels = levelTable ? levelTable.rows.map((r) => r[0]) : [];
  const times = levelTable ? levelTable.rows.map((r) => r[2]) : [];

  const waysM = doc.match(/早期发现的途径有三类：([^。]+)/);
  const ways = waysM ? items(waysM[1]) : [];

  const tellM = doc.match(/告知要讲清四件事——([^。]+)/);
  const tell = tellM ? items(tellM[1]) : [];

  const qualityM = doc.match(/它的质量取决于三件事：([^。]+)/);
  const quality = qualityM ? items(qualityM[1]) : [];

  const obsM = doc.match(/学习者承担的是观察与记录——([^。]+)/);
  const obsItems = obsM ? items(obsM[1]) : [];

  const loopM = doc.match(/闭环有三个要素：([^。]+)/);
  const loopItems = loopM ? items(loopM[1]) : [];

  const visitM = doc.match(/随访的内容可分五块：([^。]+)/);
  const visit = visitM ? items(visitM[1]) : [];

  const formM = doc.match(/形式有四类：([^。]+)/);
  const forms = formM ? items(formM[1]) : [];

  const recM = doc.match(/记录与留痕有五个要素：([^。]+)/);
  const recItems = recM ? items(recM[1]) : [];

  return {
    levels,
    times,
    ways,
    tell,
    quality,
    obsItems,
    loopItems,
    visit,
    forms,
    recItems,
    lines: [
      '三级预防 ' + levels.length + ' 级（' + levels.map((l, i) => l + '·' + (times[i] || '—')).join('／') + '）' +
        '，判据随时点走',
      '早期发现 ' + ways.length + ' 类途径（' + ways.join('／') + '），三者组织方式不同、判据不同',
      '筛查质量 ' + quality.length + ' 件事（' + quality.join('／') + '）；告知 ' + tell.length +
        ' 件事（' + tell.join('／') + '）',
      '康复：学习者观察 ' + obsItems.length + ' 样（' + obsItems.join('／') + '），这四样决定明天加不加量',
      '转介闭环 ' + loopItems.length + ' 要素（' + loopItems.join('／') + '），缺一即为单向投递',
      '随访 ' + visit.length + ' 块内容 × ' + forms.length + ' 类形式 = ' + visit.length * forms.length +
        ' 个组合；记录留痕 ' + recItems.length + ' 要素',
    ],
  };
}

/* ── 习题：结构 + 接地 ──────────────────────────────────────────── */

/** 正文里 4 字以上的连续汉字片段 */
function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function quizSummary(quiz, doc) {
  const body = grams(doc);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const rows = qs.map((q, i) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    const hit = [...grams(right)].filter((g) => body.has(g));
    const why = q.explain || q.explanation || '';
    return { n: i + 1, stage: q.stage, options: opts.length, correct: q.correct, explainHanzi: hanzi(why), grounded: hit.length, sample: hit.slice(0, 3) };
  });
  return {
    total: qs.length,
    stage,
    rows,
    answers: qs.map((q) => q.correct),
    distinctAnswers: new Set(qs.map((q) => q.correct)).size,
    checkGrounded: rows.filter((x) => x.stage === 'check' && x.grounded > 0).length,
    minExplain: rows.length ? Math.min(...rows.map((x) => x.explainHanzi)) : 0,
    allFourOptions: rows.every((x) => x.options === 4),
    stageComplete: ['pre', 'check', 'post'].every((s) => stage[s] > 0),
  };
}

/* ── 汇总 ──────────────────────────────────────────────────────── */

function analyze() {
  const doc = readDoc();
  const ts = tables(doc);
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    docHanzi: hanzi(doc),
    paragraphs: paragraphs(doc).length,
    sections: sections(doc),
    tables: ts.map((t) => ({ header: t.header, cols: t.cols, rows: t.rows.length })),
    arith: chapterArithmetic(doc, ts),
    quiz: quizSummary(quiz, doc),
  };
}

function main() {
  const r = analyze();
  console.log(`疾病学基础 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log(`正文 ${r.docHanzi.toLocaleString('en-US')} 汉字 · ${r.paragraphs} 段 · 节 ${r.sections.length} 个`);
  console.log('');
  console.log('结构：');
  for (const s of r.sections) console.log(`  ${s}`);
  console.log('');
  console.log(`表 ${r.tables.length} 张：`);
  r.tables.forEach((t, i) => console.log(`  [${i + 1}] ${t.header.join(' / ')} —— ${t.cols} 列 × ${t.rows} 行`));
  console.log('');
  console.log('本章算术（全部从正文解析后计算）：');
  for (const line of r.arith.lines) console.log(`  ${line}`);
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· 答案 ${r.quiz.answers.join('/')}`
  );
  console.log(
    `  check 题接地 ${r.quiz.checkGrounded} 道 · 答案落在 ${r.quiz.distinctAnswers} 个位置 · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('※ 以上数字由本章正文与 quiz 现算，改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，只讲预防与康复的类别、时点与流程，不含具体筛查项目、训练参数与随访间隔。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  sections,
  paragraphs,
  tables,
  tableBy,
  grams,
  hanzi,
  count,
  items,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
