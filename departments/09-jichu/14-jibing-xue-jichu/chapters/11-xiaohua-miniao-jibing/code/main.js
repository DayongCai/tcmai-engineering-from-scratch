#!/usr/bin/env node
/**
 * 疾病学基础 · 第 11 章 同一处病变有两本账：结构写一层，功能写一层，对不上才是常态
 *
 *   node code/main.js
 *
 * 只读两处：
 *   正文  chapters/11-xiaohua-miniao-jibing/docs/zh.md
 *   习题  chapters/11-xiaohua-miniao-jibing/quiz.json
 * 依赖：仅 Node.js 标准库。不读任何取数表：正文改了，这里打印的数字跟着变。
 *
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 本章算术：从正文的维度表、因素表与并列短语解析条目，再算类别组合数
 *   · 习题：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 11;
const SLUG = '11-xiaohua-miniao-jibing';
const TITLE = '同一处病变有两本账：结构写一层，功能写一层，对不上才是常态';

/* ── 文本口径 ────────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const CN = { 两: 2, 二: 2, 一: 1, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const cn2n = (s) => (CN[s] !== undefined ? CN[s] : Number(s));
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
  const dimTable = tableBy(ts, '常见错法'); // 溃疡维度表
  const dimRows = dimTable ? dimTable.rows.map((r) => r[0]) : [];
  const dimText = doc.match(/溃疡类别的分类用([一二三四五六])个维度/);
  const dimStated = dimText ? cn2n(dimText[1]) : 0;

  const layersTxt = (doc.match(/由浅入深依次排列：([^。]+)/) || [])[1] || '';
  const layers = items(layersTxt);

  const factorM = doc.match(/因素类别列了([一二三四五六七八九十]+)项（([^）]+)）/);
  const relationM = doc.match(/关系类型列了([一二三四五六七八九十]+)种（([^）]+)）/);
  const factors = factorM ? items(factorM[2]) : [];
  const relations = relationM ? items(relationM[2]) : [];

  const cellTxt = (doc.match(/肝细胞的基本变化分三类：([^。]+)/) || [])[1] || '';
  const cellChanges = items(cellTxt);

  // 肝炎：经过 × 分布 × 病因 三个坐标
  const hepM = (doc.match(/肝炎按经过分急性与慢性，按分布分([^，]+)，按病因分([^——]+)/) || []);
  const hepDist = hepM[1] ? items(hepM[1]) : [];
  const hepCause = hepM[2] ? items(hepM[2]) : [];

  const parts = tableBy(ts, '功能后果'); // 肾小球四部分
  const partRows = parts ? parts.rows.map((r) => r[0]) : [];

  const scopeTxt = (doc.match(/分布范围另有一套坐标：([^。]+)/) || [])[1] || '';
  const scopes = items(scopeTxt);

  const fnTxt = (doc.match(/功能一侧分三块：([^。]+)/) || [])[1] || '';
  const functions = items(fnTxt);

  const combos = hepDist.length * hepCause.length + factors.length * relations.length;

  return {
    dimRows,
    dimStated,
    layers,
    factors,
    relations,
    cellChanges,
    hepDist,
    hepCause,
    partRows,
    scopes,
    functions,
    combos,
    lines: [
      '溃疡维度：正文写 ' + dimStated + ' 个维度，表列 ' + dimRows.length + ' 项（' + dimRows.join('／') + '）' +
        (dimStated && dimRows.length !== dimStated ? '，多出的一项是空间描述，不参与性质判断' : ''),
      '修复描述 ' + layers.length + ' 层（' + layers.join(' → ') + '），空间叠加、时间对应',
      '病因因素 ' + factors.length + ' 类 × 关系类型 ' + relations.length + ' 种 = ' +
        factors.length * relations.length + ' 个组合，但类别关系不等于个体因果',
      '肝细胞变化 ' + cellChanges.length + ' 类（' + cellChanges.join('／') + '）；肝炎 ' +
        hepDist.length + ' × ' + hepCause.length + ' = ' + hepDist.length * hepCause.length + ' 个类别坐标',
      '肾小球 ' + partRows.length + ' 个组成部分（' + partRows.join('／') + '）× 分布 ' + scopes.length +
        ' 个坐标 = ' + partRows.length * scopes.length + ' 个标注位',
      '功能一侧 ' + functions.length + ' 块（' + functions.join('／') + '）；本章可数组合合计 ' + combos + ' 个',
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
  console.log('※ 本章为教学材料，类别与关系类型均为课堂约定，不含诊断标准、分级分期与治疗方案，不构成诊疗建议。');
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
  cn2n,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
