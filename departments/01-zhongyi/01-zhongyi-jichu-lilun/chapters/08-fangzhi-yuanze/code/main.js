#!/usr/bin/env node
/**
 * 中医基础理论 · 第 8 章 治则不是八个字的目录，是八条各带「何时不能用」的判据
 *
 *   node code/main.js
 *
 * 正文：chapters/08-fangzhi-yuanze/docs/zh.md
 * 习题：chapters/08-fangzhi-yuanze/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz，不读任何 standards 取数表：正文改了，这里的数字跟着变。
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 本章算术：从正文里解析判据条目、门限与结构数字，再算派生量
 *   · quiz：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 * 任何一项对不上，说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 8;
const SLUG = '08-fangzhi-yuanze';
const TITLE = "治则不是八个字的目录，是八条各带「何时不能用」的判据";

/* ── 文本口径 ────────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const num = (s) => Number(String(s).replace(/[,，\s]/g, ''));
const CN = { 两: 2, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十二: 12 };
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

/* ── 本章算术（逐章注入，从正文解析） ───────────────────────────── */

function chapterArithmetic(doc, ts) {
const methods = ((doc.match(/八个字——([^。]+)/) || [])[1] || '').split('、').map((s) => s.trim()).filter(Boolean);
  const levels = ['预防', '治则', '治法'].filter((x) => doc.includes('**' + x + '**')).length;
  const collect = tableBy(ts, '采集项');
  const fields = tableBy(ts, '字段');
  const crit = ['有证（', '方向对（', '有禁忌（', '可评估（'].filter((x) => doc.includes(x)).length;
  const stages = ['未病先防', '既病防变', '瘥后防复'].filter((x) => doc.includes(x)).length;
  const contraindications = count(doc, '要写「');

  return {
    collectItems: collect ? collect.rows.length : 0,
    fieldRows: fields ? fields.rows.length : 0,
    methods,
    levels,
    crit,
    stages,
    contraindications,
    lines: [
      '八法 ' + methods.length + ' 个（' + methods.join('／') + '），层 ' + levels + ' 层（预防／治则／治法）',
      '治法判据 ' + crit + ' 条（证／方向／禁忌／可评估），缺一条只能算一个愿望',
      '治未病 ' + stages + ' 个时点（未病先防／既病防变／瘥后防复）',
      '动作二给出 ' + contraindications + ' 条禁忌示例（补法／汗法／清法）',
      '采集表 ' + (collect ? collect.rows.length : 0) + ' 行 · 字段表 ' + (fields ? fields.rows.length : 0) + ' 行',
    ],
  };
}

/* ── quiz：结构 + 接地 ──────────────────────────────────────────── */

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
  const items = qs.map((q, i) => {
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
    items,
    answers: qs.map((q) => q.correct),
    distinctAnswers: new Set(qs.map((q) => q.correct)).size,
    checkGrounded: items.filter((x) => x.stage === 'check' && x.grounded > 0).length,
    minExplain: items.length ? Math.min(...items.map((x) => x.explainHanzi)) : 0,
    allFourOptions: items.every((x) => x.options === 4),
    badCorrect: items.filter((x) => !(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4)).length,
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
  const a = r.arith;
  console.log(`中医基础理论 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log(`正文 ${r.docHanzi.toLocaleString('en-US')} 汉字 · ${r.paragraphs} 段 · 节 ${r.sections.length} 个`);
  console.log('');
  console.log('结构：');
  for (const s of r.sections) console.log(`  ${s}`);
  console.log('');
  console.log(`表 ${r.tables.length} 张：`);
  r.tables.forEach((t, i) => console.log(`  [${i + 1}] ${t.header.join(' / ')} —— ${t.cols} 列 × ${t.rows} 行`));
  console.log('');
  console.log('本章算术（全部从正文解析后计算）：');
  for (const line of a.lines) console.log(`  ${line}`);
  console.log('');
  console.log(`quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· 答案 ${r.quiz.answers.join('/')}`);
  console.log(`  check 题接地 ${r.quiz.checkGrounded} 道 · 答案落在 ${r.quiz.distinctAnswers} 个位置 · 最短解释 ${r.quiz.minExplain} 汉字`);
  console.log('※ 以上数字由本章正文与 quiz 现算，改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，判据与分档均为课堂约定，不构成诊疗建议，也不替代执业医师的判断。');
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
  num,
  cn2n,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
