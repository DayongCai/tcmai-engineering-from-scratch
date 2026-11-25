#!/usr/bin/env node
/**
 * 疾病学基础 · 第 6 章 缺氧看断在哪一环，发热看调定点挪到哪
 *
 *   node code/main.js
 *
 * 只读本章两处：docs/zh.md 与 quiz.json。正文改一个字，下面的数字跟着变。
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 结构核对：解析出来的行数与正文自己写明的条数是否一致，不一致单独标出
 *   · 术语普查：本章关键词在正文里各出现几次
 *   · 派生量：由解析出来的数字现算
 *   · quiz：题量、三段分布、选项数、解释长度、答案位置、check 题与正文的用词重叠
 * 任何一项对不上，说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 6;
const SLUG = '06-queyang-yu-fare';
const TITLE = '缺氧看断在哪一环，发热看调定点挪到哪';

/* ── 文本口径 ─────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const num = (s) => Number(String(s).replace(/[,，\s]/g, ''));
const CN = { 两: 2, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十二: 12 };
const cn2n = (s) => (CN[s] !== undefined ? CN[s] : Number(s));
const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const docLines = (doc) => String(doc).split(/\r?\n/);

/** 节标题：以 ## 起首的行 */
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

const TERMS = ["乏氧性","血液性","循环性","组织性","调定点","致热原","上升期","退热期"];

const tableBy = (ts, kw) => ts.find((t) => t.header.join(' ').includes(kw));

/* ── 本章结构核对（逐章注入，全部从正文解析） ─────────────── */

function chapterArithmetic(doc, ts) {
  const cls = tableBy(ts, '断在哪一环');
  const stage = tableBy(ts, '相对关系');
  const sec = (doc.split('## 二、缺氧的影响')[1] || '').split('## 三、')[0];
  const chain = (sec.match(/^\d+\. /gm) || []).length;
  const wantCls = cn2n((doc.match(/([一二三四五六七八九十]+)种缺氧/) || [])[1]);
  const kinds = ['乏氧性', '血液性', '循环性', '组织性'].filter((k) => doc.includes(k));
  const periods = stage ? stage.rows.map((r) => r[0]) : [];

  return {
    lines: [
      '缺氧 ' + (cls ? cls.rows.length : 0) + ' 类（正文自述 ' + wantCls + ' 种，' + ((cls ? cls.rows.length : 0) === wantCls ? '对得上' : '对不上') + '）× 4 列 = ' + (cls ? cls.rows.length * 4 : 0) + ' 格',
      '四个断点：' + kinds.join('、') + ' —— 对应摄取与交换、携带、输送、利用',
      '细胞代谢变化 ' + chain + ' 环（正文编号 1—' + chain + '）：能量→酸碱→膜→结构，膜功能改变又反作用于能量',
      '三期表 ' + (stage ? stage.rows.length : 0) + ' 行 × 5 列 = ' + (stage ? stage.rows.length * 5 : 0) + ' 格：' + periods.join('／'),
      '两处名称相近而环节相反：血液性缺氧（携带环节的起点障碍）与血液系统长期适应（链末端的代偿）',
    ],
  };
}

/* ── 边界条数：正文自己声明的类数 vs 解析出的条目数 ───────── */

function boundary(doc) {
  const m = String(doc).match(/([^。]+)，([一二三四五六七八九十]+)类(?:都|均)不在本课范围/);
  if (!m) return { items: [], declared: 0, ok: false };
  const clause = m[1].split(/[：:]/).pop();
  const items = clause.split('、').map((s) => s.trim()).filter(Boolean);
  return { items, declared: cn2n(m[2]), ok: items.length === cn2n(m[2]) };
}

function termCensus(doc, terms) {
  return terms
    .map((t) => ({ term: t, n: count(doc, t) }))
    .sort((a, b) => b.n - a.n || a.term.localeCompare(b.term, 'zh'));
}

/* ── quiz：结构 + 接地 ────────────────────────────────────── */

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
    stageComplete: ['pre', 'check', 'post'].every((s) => stage[s] > 0),
  };
}

/* ── 汇总 ─────────────────────────────────────────────────── */

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
    boundary: boundary(doc),
    terms: termCensus(doc, TERMS),
    quiz: quizSummary(quiz, doc),
  };
}

function main() {
  const r = analyze();
  console.log('疾病学基础 第 ' + CHAPTER + ' 章 · ' + TITLE);
  console.log('正文 ' + r.docHanzi.toLocaleString('en-US') + ' 汉字 · ' + r.paragraphs + ' 段 · 节 ' + r.sections.length + ' 个');
  console.log('');
  console.log('结构：');
  for (const s of r.sections) console.log('  ' + s);
  console.log('');
  console.log('表 ' + r.tables.length + ' 张：');
  r.tables.forEach((t, i) => console.log('  [' + (i + 1) + '] ' + t.header.join(' / ') + ' —— ' + t.cols + ' 列 × ' + t.rows + ' 行'));
  console.log('');
  console.log('本章结构核对（全部从正文解析后计算）：');
  for (const line of r.arith.lines) console.log('  ' + line);
  console.log('');
  console.log('术语普查（正文出现次数）：');
  console.log('  ' + r.terms.map((t) => t.term + ' ' + t.n).join(' · '));
  console.log('');
  const b = r.boundary;
  const tail = b.items.length ? '（' + b.items.join('、') + '）' : '';
  console.log(
    '边界条数：正文声明 ' + (b.declared || '—') + ' 类，句中以顿号分成 ' + b.items.length + ' 段 ' +
    (b.ok ? '—— 一致' : '—— 不等，多半是用「与」把两类并成了一段，需人工核对') + tail
  );
  console.log('');
  const q = r.quiz;
  console.log('quiz ' + q.total + ' 题（pre ' + q.stage.pre + ' / check ' + q.stage.check + ' / post ' + q.stage.post + '）· 答案 ' + q.answers.join('/'));
  console.log('  check 题接地 ' + q.checkGrounded + ' 道 · 答案落在 ' + q.distinctAnswers + ' 个位置 · 最短解释 ' + q.minExplain + ' 汉字');
  console.log('※ 以上数字由本章正文与 quiz 现算，改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，只讲类别与关系，不构成诊疗建议，也不替代执业人员的判断。');
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
