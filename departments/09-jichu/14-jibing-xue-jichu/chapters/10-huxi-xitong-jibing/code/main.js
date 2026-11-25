#!/usr/bin/env node
/**
 * 疾病学基础 · 第 10 章 气流受限不是某种病的别名，而是结构与功能之间那道必须分开写的界
 *
 *   node code/main.js
 *
 * 只读两处：
 *   正文  chapters/10-huxi-xitong-jibing/docs/zh.md
 *   习题  chapters/10-huxi-xitong-jibing/quiz.json
 * 依赖：仅 Node.js 标准库。不读任何取数表：正文改了，这里打印的数字跟着变。
 *
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 本章算术：从正文的三张对照表与边界条款解析条目，再算派生量
 *   · 习题：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 10;
const SLUG = '10-huxi-xitong-jibing';
const TITLE = '气流受限不是某种病的别名，而是结构与功能之间那道必须分开写的界';

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

/** 单元格里的并列项：先削掉括号内的举例，再按顿号切 */
function items(cell) {
  return String(cell || '')
    .replace(/（[^）]*）/g, '')
    .split(/[、，,；;／]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/* ── 本章算术（逐章注入，全部从正文解析） ────────────────────────── */

function chapterArithmetic(doc, ts) {
  const clue = tableBy(ts, '线索'); // 上呼吸道三条线索
  const source = tableBy(ts, '来源类别'); // 气流受限三类来源
  const loop = tableBy(ts, '依赖的结构'); // 通气 / 换气

  const clueRows = clue ? clue.rows.map((r) => r[0]) : [];
  const sourceRows = source ? source.rows.map((r) => r[0]) : [];
  const loopRows = loop ? loop.rows.map((r) => r[0]) : [];
  const ventRow = loop ? loop.rows.find((r) => r[0] === '通气') : null;
  const exchRow = loop ? loop.rows.find((r) => r[0] === '换气') : null;
  const ventItems = ventRow ? items(ventRow[2]) : [];
  const exchItems = exchRow ? items(exchRow[2]) : [];

  // 分布类别：局灶与弥漫 × 单侧与双侧
  const dist = doc.match(/局灶与弥漫、单侧与双侧/);
  const distCombos = dist ? 2 * 2 : 0;

  // 结构—功能三种关系
  const rel = doc.match(/用「([^」]+)」三种关系/);
  const relations = rel ? rel[1].split('、') : [];

  // 叙述边界：正文把条款写成「不写……；不写……」的并列
  const boundary = (doc.match(/叙述边界的三条规则[^]*?划定了本章能走到的最远处/) || [''])[0];
  const forbid = count(boundary, '不写');

  // 不污名化三条（写法层面的要求）
  const stigma = (doc.match(/三条都落在写法上：([^。]+)/) || [])[1] || '';
  const stigmaItems = items(stigma);

  return {
    clueRows,
    clueCells: clue ? clue.rows.length * clue.cols : 0,
    sourceRows,
    loopRows,
    ventItems,
    exchItems,
    distCombos,
    relations,
    forbid,
    stigmaItems,
    lines: [
      '上呼吸道线索 ' + clueRows.length + ' 条（' + clueRows.join('／') + '）× 每行 ' +
        (clue ? clue.cols : 0) + ' 列 = ' + (clue ? clue.rows.length * clue.cols : 0) + ' 个必填格',
      '分布类别 ' + (dist ? '2 轴' : '未解析') + ' → ' + distCombos + ' 个组合，只说明空间铺展，不说明轻重',
      '气流受限来源 ' + sourceRows.length + ' 类（' + sourceRows.join('／') + '）',
      '通气障碍 ' + ventItems.length + ' 类 ＋ 换气障碍 ' + exchItems.length + ' 类 = ' +
        (ventItems.length + exchItems.length) + ' 类，都表现为「气不够」，须写类别与依据',
      '结构—功能关系 ' + relations.length + ' 种（' + relations.join('／') + '），用途是拦住因果句',
      '叙述边界里的「不写」条款 ' + forbid + ' 条；不污名化写法 ' + stigmaItems.length + ' 条（' +
        stigmaItems.join('／') + '）',
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
    return {
      n: i + 1,
      stage: q.stage,
      options: opts.length,
      correct: q.correct,
      explainHanzi: hanzi(why),
      grounded: hit.length,
      sample: hit.slice(0, 3),
    };
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
  console.log('※ 本章为教学材料，类别与环节均为课堂约定，不含功能数值、分级与呼吸支持方案，不构成诊疗建议。');
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
