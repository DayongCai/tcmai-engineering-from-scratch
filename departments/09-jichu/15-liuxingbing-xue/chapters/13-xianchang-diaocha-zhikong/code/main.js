#!/usr/bin/env node
/**
 * 流行病学 · 第 13 章 现场质控不是多跑一趟，而是把可追溯性提前到对象还在场的当天
 *
 *   node code/main.js
 *
 * 正文：chapters/13-xianchang-diaocha-zhikong/docs/zh.md
 * 习题：chapters/13-xianchang-diaocha-zhikong/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz，不读任何取数表：正文改了，这里的数字跟着变。
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 本章算术：单元数与汉字数的密度、节×每节单元与单元总数的对账、事前／事后／当场三类配比的加总
 *   · 结构计数：调查表三个层次、预调查五个目的、四层架构、六环流程、四类核查、五类留痕
 *   · quiz：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 * 任何一项对不上，说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 13;
const SLUG = '13-xianchang-diaocha-zhikong';
const TITLE = '现场质控不是多跑一趟，而是把可追溯性提前到对象还在场的当天';

/* ── 文本口径 ─────────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const num = (s) => Number(String(s).replace(/[,，\s]/g, ''));
const pct = (x, d = 1) => (x * 100).toFixed(d) + '%';
const fix = (x, d = 1) => Number(x).toFixed(d);
const CN = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const cn2n = (s) => (CN[s] !== undefined ? CN[s] : Number(s));
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

/* ── 公式复核：正文里写成 a op b = c 的算式逐条复算 ───────────────── */

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
    const ok = Math.abs(calc - want) <= Math.max(Math.abs(want) * 0.01, 0.0005);
    rows.push({ expr: m[0].replace(/\s+/g, ' ').trim(), calc, want, unit, ok });
  }
  return rows;
}

/* ── 本章算术（逐章注入，全部从正文解析） ───────────────────────── */

function chapterArithmetic(doc) {
  const head = must(/教材\s*(\d+)\s*个单元、([\d,]+)\s*汉字，分属\s*(\d+)\s*节/, doc, '章首的单元数与汉字数');
  const after = must(/数据核查\s*(\d+)\s*个单元、留痕与共享\s*(\d+)\s*个单元）占\s*(\d+)\s*个/, doc, '事后类单元数');
  const before = must(/伦理审查\s*(\d+)\s*个单元）占\s*(\d+)\s*个/, doc, '事前类单元数');
  const onsite = must(/的只有\s*(\d+)\s*个/, doc, '当场类单元数');
  const layers = must(/结构分成\s*([一二三四五六七八九十]+)\s*个层次/, doc, '调查表的层次数');
  const fields = must(/(编号、填表人、填表时间、核对标记、版本号)/, doc, '管理字段清单');
  const aims = must(/预调查的\s*([一二三四五六七八九十]+)\s*个目的/, doc, '预调查的目的数');
  const org = must(/组织架构是\s*([一二三四五六七八九十]+)\s*层/, doc, '组织架构的层数');
  const links = must(/被拆成\s*([一二三四五六七八九十]+)\s*环/, doc, '实施流程的环节数');
  const checks = must(/([一二三四五六七八九十]+)\s*类核查方法/, doc, '核查方法的类别数');
  const records = must(/留痕由\s*([一二三四五六七八九十]+)\s*类记录构成/, doc, '留痕记录的类别数');

  const units = num(head[1]);
  const hz = num(head[2]);
  const secs = num(head[3]);
  const post = num(after[3]);
  const pre = num(before[2]);
  const spot = num(onsite[1]);
  const fieldCount = fields[1].split('、').length;
  const sum = pre + post + spot;

  return {
    lines: [
      '规模对账：' + units + ' 单元 ÷ ' + secs + ' 节 = ' + fix(units / secs, 1) + ' 单元/节；' + hz.toLocaleString('en-US') + ' 汉字 ÷ ' + units + ' 单元 = ' + fix(hz / units, 0) + ' 汉字/单元',
      '配比对账：事前 ' + pre + ' + 事后 ' + post + ' + 当场 ' + spot + ' = ' + sum + ' 单元' + (sum === units ? '，与章首的 ' + units + ' 单元相符' : '，与章首的 ' + units + ' 单元不符'),
      '配比含义：讲事后的占 ' + pct(post / units, 0) + '、讲事前的占 ' + pct(pre / units, 0) + '、真正讲当场那几小时的只占 ' + pct(spot / units, 0) + '——现场质量靠现场之前定住',
      '调查表 ' + cn2n(layers[1]) + ' 个层次 × 管理字段 ' + fieldCount + ' 项（' + fields[1] + '）= 留痕的起点在表上，不在事后补记',
      '组织 ' + cn2n(org[1]) + ' 层 · 流程 ' + cn2n(links[1]) + ' 环 · 核查方法 ' + cn2n(checks[1]) + ' 类 · 留痕记录 ' + cn2n(records[1]) + ' 类 · 预调查目的 ' + cn2n(aims[1]) + ' 个',
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
  console.log('※ 本章为教学材料，不涉及具体机构、样本量、时限与经费；真实研究的方案、审查与处置须依现行规定执行。');
}

if (require.main === module) main();

module.exports = { analyze, readDoc, sections, paragraphs, tables, tableBy, formulaAudit, grams, hanzi, count, num, pct, cn2n, quizSummary, CHAPTER, SLUG, TITLE, DOC, QUIZ };
