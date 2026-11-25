#!/usr/bin/env node
/**
 * 疾病学基础 · 第 15 章 肿瘤与慢性病的治疗叙述，先从「不说有效」开始
 *
 *   node code/main.js
 *
 * 只读两处：
 *   正文  chapters/15-zhongliu-manxingbing-zhiliao/docs/zh.md
 *   习题  chapters/15-zhongliu-manxingbing-zhiliao/quiz.json
 * 依赖：仅 Node.js 标准库。不读任何取数表：正文改了，这里打印的数字跟着变。
 *
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 本章算术：从覆盖表、现象表与禁令表解析条目，再算不良反应的分类组合
 *   · 习题：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 15;
const SLUG = '15-zhongliu-manxingbing-zhiliao';
const TITLE = '肿瘤与慢性病的治疗叙述，先从「不说有效」开始';

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
  const scope = tableBy(ts, '主要代价方向'); // 局部 / 全身
  const pheno = tableBy(ts, '可能的解释'); // 三行现象
  const ban = tableBy(ts, '为什么不行'); // 四条禁令

  const scopeRows = scope ? scope.rows.map((r) => r[0]) : [];
  const phenoRows = pheno ? pheno.rows.map((r) => r[0]) : [];
  const banRows = ban ? ban.rows.map((r) => r[0]) : [];

  // 不良反应的三把尺子
  const t1 = (doc.match(/按时间分（([^）]+)）/) || [])[1] || '';
  const t2 = (doc.match(/按可预期性分（([^）]+)）/) || [])[1] || '';
  const t3 = (doc.match(/按程度分（([^）]+)）/) || [])[1] || '';
  const k1 = items(t1);
  const k2 = items(t2);
  const k3 = items(t3);

  const supM = doc.match(/支持治疗的类别大致可分四组：([^。]+)/);
  const supGroups = supM ? items(supM[1]) : [];

  const stepM = doc.match(/护理要求围绕「([^」]+)」三步/);
  const supSteps = stepM ? stepM[1].split('—').map((s) => s.trim()).filter(Boolean) : [];

  const reqM = doc.match(/把边界收成三条要求：([^。]+)/);
  const reqs = reqM ? items(reqM[1]) : [];

  return {
    scopeRows,
    phenoRows,
    banRows,
    k1,
    k2,
    k3,
    supGroups,
    supSteps,
    reqs,
    lines: [
      '作用范围 ' + scopeRows.length + ' 类（' + scopeRows.join('／') + '）：覆盖与全身代价的交换，不是强弱',
      '反应观察 ' + phenoRows.length + ' 类现象，每类至少三种解释并存，记录只写现象与时序',
      '不良反应分类 ' + k1.length + ' × ' + k2.length + ' × ' + k3.length + ' = ' +
        k1.length * k2.length * k3.length + ' 个类别组合，观察时点因此不同',
      '支持治疗 ' + supGroups.length + ' 组（' + supGroups.join('／') + '）· ' + supSteps.length +
        ' 步（' + supSteps.join(' → ') + '），缺复评则无从判断有没有用',
      '叙述禁令 ' + banRows.length + ' 条，每条一句替换句；边界三要求 ' + reqs.length + ' 条（' +
        reqs.join('／') + '）',
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
  console.log('※ 本章为教学材料，只讲治疗类别、反应观察与叙述要求，不作任何疗效或预后判断，不构成诊疗建议。');
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
