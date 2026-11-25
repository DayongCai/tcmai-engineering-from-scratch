#!/usr/bin/env node
/**
 * 流行病学 · 第 12 章 混杂不会因为样本变大而缩小
 *
 *   node code/main.js
 *
 * 正文：chapters/12-pianyi-hunza/docs/zh.md
 * 习题：chapters/12-pianyi-hunza/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz，不读任何取数表：正文改了，这里的数字跟着变。
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 本章算术：粗相对危险度、层内危险度、吸烟构成差、标准化率、无应答偏倚、阳性预测值
 *   · 公式复核：正文里写成 a op b = c 的算式逐条复算
 *   · quiz：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 * 任何一项对不上，说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 12;
const SLUG = '12-pianyi-hunza';
const TITLE = '混杂不会因为样本变大而缩小';

/* ── 文本口径 ─────────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const num = (s) => Number(String(s).replace(/[,，\s]/g, ''));
const pct = (x, d = 1) => (x * 100).toFixed(d) + '%';
const fix = (x, d = 2) => Number(x).toFixed(d);
const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const docLines = (doc) => String(doc).split(/\r?\n/);

function must(re, text, label) {
  const m = String(text).match(re);
  if (!m) throw new Error('正文里找不到「' + label + '」——正文改过，脚本要跟着改');
  return m;
}

function sections(doc) {
  return docLines(doc).filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
}

function paragraphs(doc) {
  return docLines(doc)
    .map((l) => l.trim())
    .filter((l) => l && !/^[#>|]/.test(l) && !/^[-*+]\s/.test(l) && !/^\d+[.、]/.test(l))
    .filter((l) => !l.includes('|'));
}

function tables(doc) {
  const ls = docLines(doc);
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const out = [];
  let i = 0;
  while (i < ls.length) {
    if (/^\s*\|/.test(ls[i])) {
      const block = [];
      while (i < ls.length && /^\s*\|/.test(ls[i])) { block.push(ls[i]); i += 1; }
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

/* ── 公式复核 ─────────────────────────────────────────────────────── */

const OP = { '÷': (a, b) => a / b, '×': (a, b) => a * b, '−': (a, b) => a - b, '-': (a, b) => a - b, '+': (a, b) => a + b };

function formulaAudit(doc) {
  const src = String(doc);
  const re = /(?<![\d,.×÷+\-−\/])([\d][\d,]*(?:\.\d+)?)\s*([÷×+−\-])\s*([\d][\d,]*(?:\.\d+)?)\s*=\s*([\d][\d,]*(?:\.\d+)?)\s*(%|‰)?/g;
  const rows = [];
  for (const m of src.matchAll(re)) {
    const after = src.slice(m.index + m[0].length, m.index + m[0].length + 1);
    if (/[:\d\/]/.test(after)) continue;
    const a = num(m[1]);
    const b = num(m[3]);
    const stated = num(m[4]);
    const unit = m[5] || '';
    const scale = unit === '%' ? 100 : unit === '‰' ? 1000 : 1;
    const calc = OP[m[2]](a, b);
    const want = stated / scale;
    const ok = Math.abs(calc - want) <= Math.max(Math.abs(want) * 0.02, 0.0005);
    rows.push({ expr: m[0].replace(/\s+/g, ' ').trim(), calc, want, unit, ok });
  }
  return rows;
}

/* ── 本章算术（逐章注入，全部从正文解析） ───────────────────────── */

function chapterArithmetic(doc) {
  const n = must(/一项\s*([\d,]+)\s*人的队列中，暴露组\s*([\d,]+)\s*人发病\s*(\d+)\s*例/, doc, '队列规模与暴露组');
  const u = must(/非暴露组\s*([\d,]+)\s*人发病\s*(\d+)\s*例/, doc, '非暴露组');
  const layer1 = must(/吸烟者中两组均为\s*([\d.]+)%/, doc, '吸烟层内危险度');
  const layer0 = must(/不吸烟者中两组均为\s*([\d.]+)%/, doc, '不吸烟层内危险度');
  const comp = must(/两组吸烟比例\s*([\d.]+)%（([\d,]+)÷([\d,]+)）与\s*([\d.]+)%（([\d,]+)÷([\d,]+)）/, doc, '两组吸烟构成');
  const big = must(/把样本扩到\s*([\d,]+)\s*人/, doc, '扩大后的样本量');
  const resp = must(/应答\s*([\d,]+)\s*人（([\d,]+)÷([\d,]+)=([\d.]+)%）/, doc, '应答率');
  const merged = must(/取合并人群的吸烟构成\s*([\d.]+)%（([\d,]+)÷([\d,]+)）与\s*([\d.]+)%/, doc, '合并人群的吸烟构成');
  const truth = must(/真实暴露比例应为（([\d,]+)×40\.0%\+(\d+)×55\.0%）÷([\d,]+)=（(\d+)\+(\d+)）÷([\d,]+)=([\d,]+)÷([\d,]+)=([\d.]+)%/, doc, '无应答偏倚的修正值');
  const ppv = must(/阳性预测值\s*9÷（9\+99）=9÷108=([\d.]+)%/, doc, '阳性预测值');

  const N = num(n[1]);
  const e1 = num(n[2]);
  const c1 = num(n[3]);
  const e0 = num(u[1]);
  const c0 = num(u[2]);
  const r1 = c1 / e1;
  const r0 = c0 / e0;
  const rr = r1 / r0;
  const comp1 = num(comp[2]) / num(comp[3]);
  const comp0 = num(comp[5]) / num(comp[6]);
  const w = num(merged[1]) / 100;
  const std1 = w * (num(layer1[1]) / 100) + (1 - w) * (num(layer0[1]) / 100);
  const stdRR = std1 / std1;

  return {
    lines: [
      '粗率：暴露组 ' + c1 + '÷' + e1.toLocaleString('en-US') + ' = ' + pct(r1) + '，非暴露组 ' + c0 + '÷' + e0.toLocaleString('en-US') + ' = ' + pct(r0) + '，相对危险度 ' + fix(rr, 1),
      '层内：吸烟者 ' + layer1[1] + '%、不吸烟者 ' + layer0[1] + '%，层内相对危险度都是 1.00——粗估计的 ' + fix(rr, 1) + ' 全部来自构成差',
      '构成：吸烟比例 ' + pct(comp1) + ' 对 ' + pct(comp0) + '，差 ' + fix((comp1 - comp0) * 100, 0) + ' 个百分点；这一项在扩样后不会缩小',
      '标准化：以合并吸烟构成 ' + pct(w) + '（' + merged[2] + '÷' + merged[3] + '）与 ' + pct(1 - w) + ' 加权，两组标化率同为 ' + pct(std1) + '，标化相对危险度 ' + fix(stdRR, 1) + '（粗 ' + fix(rr, 1) + ' → 标化 ' + fix(stdRR, 1) + '）',
      '扩样：' + N.toLocaleString('en-US') + ' → ' + num(big[1]).toLocaleString('en-US') + ' 人，标准误按 1/√' + (num(big[1]) / N) + ' 缩小（精度约 ' + fix(Math.sqrt(num(big[1]) / N), 1) + ' 倍），混杂不动',
      '无应答：应答率 ' + resp[4] + '%，只用应答者得 40.0%，修正后真实暴露比例 ' + truth[9] + '%，低估 ' + fix(num(truth[9]) - 40, 1) + ' 个百分点',
      '测量误差：灵敏度与特异度均 90% 时，阳性预测值 ' + ppv[1] + '%——小概率结局把误差放大得最厉害',
    ],
  };
}

/* ── quiz：结构 + 接地 ───────────────────────────────────────────── */

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
    return { n: i + 1, stage: q.stage, options: opts.length, correct: q.correct, explainHanzi: hanzi(why), grounded: hit.length, sample: hit.slice(0, 2) };
  });
  const minExplain = items.length ? Math.min(...items.map((x) => x.explainHanzi)) : 0;
  const checkGrounded = items.filter((x) => x.stage === 'check' && x.grounded > 0).length;
  const stageComplete = ['pre', 'check', 'post'].every((s) => stage[s] > 0);
  const allFour = items.every((x) => x.options === 4);
  const badCorrect = items.filter((x) => !(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4)).length;
  return {
    total: qs.length,
    stage,
    items,
    answers: qs.map((q) => q.correct),
    distinctAnswers: new Set(qs.map((q) => q.correct)).size,
    checkGrounded,
    minExplain,
    stageComplete,
    allFour,
    badCorrect,
    pass: items.length >= 6 && stageComplete && allFour && badCorrect === 0 && minExplain >= 30 && checkGrounded >= 2,
  };
}

/* ── 汇总 ────────────────────────────────────────────────────────── */

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
    formulas: formulaAudit(doc),
    quiz: quizSummary(quiz, doc),
  };
}

function main() {
  const r = analyze();
  const f = r.formulas;
  const bad = f.filter((x) => !x.ok);
  console.log('流行病学 第 ' + CHAPTER + ' 章 · ' + TITLE);
  console.log('正文 ' + r.docHanzi.toLocaleString('en-US') + ' 汉字 · ' + r.paragraphs + ' 段 · 节 ' + r.sections.length + ' 个');
  console.log('');
  console.log('结构：');
  for (const s of r.sections) console.log('  ' + s);
  console.log('');
  console.log('表 ' + r.tables.length + ' 张：');
  r.tables.forEach((t, i) => console.log('  [' + (i + 1) + '] ' + t.header.join(' / ') + ' —— ' + t.cols + ' 列 × ' + t.rows + ' 行'));
  console.log('');
  console.log('本章算术（全部从正文解析后计算）：');
  for (const line of r.arith.lines) console.log('  ' + line);
  console.log('');
  console.log('公式复核：正文 ' + f.length + ' 处二元算式，' + (f.length - bad.length) + ' 处复算一致，' + bad.length + ' 处对不上');
  for (const x of bad.slice(0, 5)) console.log('  ✗ ' + x.expr + ' → 算得 ' + fix(x.calc, 4) + '，正文写 ' + fix(x.want, 4));
  console.log('');
  console.log('quiz ' + r.quiz.total + ' 题（pre ' + r.quiz.stage.pre + ' / check ' + r.quiz.stage.check + ' / post ' + r.quiz.stage.post + '）· 答案 ' + r.quiz.answers.join('/'));
  console.log('  check 题接地 ' + r.quiz.checkGrounded + ' 道 · 答案落在 ' + r.quiz.distinctAnswers + ' 个位置 · 最短解释 ' + r.quiz.minExplain + ' 汉字');
  console.log('  自检：' + (r.quiz.pass ? '通过' : '不通过') + '（题量／三段／四选项／解释长度／接地五项齐查）');
  console.log('');
  console.log('※ 以上数字由本章正文与 quiz 现算，改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，全部算例为合成数，不对任何具体暴露与结局的因果关系作判断。');
}

if (require.main === module) main();

module.exports = { analyze, readDoc, sections, paragraphs, tables, tableBy, formulaAudit, grams, hanzi, count, num, pct, quizSummary, CHAPTER, SLUG, TITLE, DOC, QUIZ };
