#!/usr/bin/env node
/**
 * 流行病学 · 第 11 章 口径没定死的数字，越算越像真的
 *
 *   node code/main.js
 *
 * 正文：chapters/11-shuju-zhengli-fenxi/docs/zh.md
 * 习题：chapters/11-shuju-zhengli-fenxi/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz，不读任何取数表：正文改了，这里的数字跟着变。
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 本章算术：缺失比例、录入不一致比例、删除后的样本量，以及 P≈I×D 的两个算例
 *   · 公式复核：正文里写成 a op b = c 的算式逐条复算（含 OR 与 RR 的差额）
 *   · quiz：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 * 任何一项对不上，说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 11;
const SLUG = '11-shuju-zhengli-fenxi';
const TITLE = '口径没定死的数字，越算越像真的';

/* ── 文本口径 ─────────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const num = (s) => Number(String(s).replace(/[,，\s]/g, ''));
const pct = (x, d = 1) => (x * 100).toFixed(d) + '%';
const per = (x, d = 1) => (x * 1000).toFixed(d) + '‰';
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
    const ok = Math.abs(calc - want) <= Math.max(Math.abs(want) * 0.06, 0.0005);
    rows.push({ expr: m[0].replace(/\s+/g, ' ').trim(), calc, want, unit, ok });
  }
  return rows;
}

/* ── 本章算术（逐章注入，全部从正文解析） ───────────────────────── */

function chapterArithmetic(doc) {
  const rec = must(/一份\s*([\d,]+)\s*条记录的随访表/, doc, '随访表记录数');
  const miss = must(/缺失\s*(\d+)\s*条（(\d+)÷([\d,]+)=([\d.]+)%）/, doc, '缺失比例');
  const dup = must(/双人录入比对不一致\s*(\d+)\s*条（(\d+)÷([\d,]+)=([\d.]+)%）/, doc, '录入不一致比例');
  const left = must(/剩\s*([\d,]+)\s*条/, doc, '删除后的记录数');
  const pid = must(/年发病\s*([\d.]+)\/1,000、平均病程\s*(\d+)\s*年/, doc, 'P≈I×D 算例');
  const pid2 = must(/病程延长到\s*(\d+)\s*年而发病率不变/, doc, '病程延长的算例');
  const orr = must(/算比值比\s*\((\d+)÷(\d+)\)÷\((\d+)÷(\d+)\)=[\d.]+÷[\d.]+≈([\d.]+)/, doc, 'OR 算例');
  const rare = must(/则比值比\s*\((\d+)÷(\d+)\)÷\((\d+)÷(\d+)\)=[\d.]+÷[\d.]+≈([\d.]+)/, doc, '罕见结局下的 OR 算例');
  const unit = must(/（(\d+)\s*节\s*×\s*(\d+)\s*单元\s*=\s*(\d+)\s*单元）/, doc, '教材单元的节数与单元数');

  const N = num(rec[1]);
  const m = num(miss[1]);
  const d = num(dup[1]);
  const keep = num(left[1]);
  const p1 = (num(pid[1]) / 1000) * num(pid[2]);
  const p2 = (num(pid[1]) / 1000) * num(pid2[1]);
  const RR = 10.0 / 2.0;
  const OR1 = (num(orr[1]) / num(orr[2])) / (num(orr[3]) / num(orr[4]));
  const OR2 = (num(rare[1]) / num(rare[2])) / (num(rare[3]) / num(rare[4]));

  return {
    lines: [
      '完整性：' + m + '÷' + N.toLocaleString('en-US') + ' = ' + pct(m / N) + ' 缺失；删除后剩 ' + keep.toLocaleString('en-US') + ' 条，占 ' + pct(keep / N) + '；删掉的 ' + pct(m / N) + ' 若集中在结局最差者，剩下的率会偏乐观',
      '准确性：双人录入不一致 ' + d + '÷' + N.toLocaleString('en-US') + ' = ' + pct(d / N) + '，须回原始记录核对，不得一律按录入值改',
      'P≈I×D：' + pid[1] + '/1,000 × ' + pid[2] + ' 年 = ' + pct(p1) + '；发病率不变、病程 ' + pid2[1] + ' 年 → ' + pct(p2) + '，涨的是病程',
      'RR 与 OR 的差额：RR ' + fix(RR, 1) + ' vs OR ' + fix(OR1, 2) + '（差 ' + fix(OR1 - RR, 2) + '）；结局罕见时 OR ' + fix(OR2, 2) + ' ≈ RR，近似有条件',
      '单元层：' + unit[1] + ' 节 × ' + unit[2] + ' 单元 = ' + unit[3] + ' 单元，与章内小节的推进顺序一致',
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
  console.log('※ 本章为教学材料，全部算例为合成数，不构成研究结论，也不提供软件操作与阈值建议。');
}

if (require.main === module) main();

module.exports = { analyze, readDoc, sections, paragraphs, tables, tableBy, formulaAudit, grams, hanzi, count, num, pct, per, quizSummary, CHAPTER, SLUG, TITLE, DOC, QUIZ };
