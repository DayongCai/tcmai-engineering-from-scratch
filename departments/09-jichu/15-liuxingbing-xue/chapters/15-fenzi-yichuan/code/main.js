#!/usr/bin/env node
/**
 * 流行病学 · 第 15 章 分子与遗传流行病学能给出的，是人群里的线索，不是个体的结论
 *
 *   node code/main.js
 *
 * 正文：chapters/15-fenzi-yichuan/docs/zh.md
 * 习题：chapters/15-fenzi-yichuan/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz，不读任何取数表：正文改了，这里的数字跟着变。
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 本章算术：节×每节单元与单元总数的对账、每单元汉字密度、三类标志物的混用方向数
 *   · 结构计数：标志物三类用途、遗传因素四层思路、三类常用设计、关联的四类解释、两个尺度、四条表述边界
 *   · quiz：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 * 任何一项对不上，说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 15;
const SLUG = '15-fenzi-yichuan';
const TITLE = '分子与遗传流行病学能给出的，是人群里的线索，不是个体的结论';

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
    const ok = Math.abs(calc - want) <= Math.max(Math.abs(want) * 0.01, 0.0005);
    rows.push({ expr: m[0].replace(/\s+/g, ' ').trim(), calc, want, unit, ok });
  }
  return rows;
}

/* ── 本章算术（逐章注入，全部从正文解析） ───────────────────────── */

function chapterArithmetic(doc) {
  const head = must(/教材\s*(\d+)\s*个单元、([\d,]+)\s*汉字，(\d+)\s*节各\s*(\d+)\s*单元/, doc, '章首的单元数与汉字数');
  const markers = must(/标志物分\s*([一二两三四五六七八九十]+)\s*类用途/, doc, '标志物的类别数');
  const layers = must(/分成由浅入深的\s*([一二两三四五六七八九十]+)\s*层/, doc, '遗传因素的研究思路层数');
  const designs = must(/给\s*([一二两三四五六七八九十]+)\s*类常用设计/, doc, '常用设计的类别数');
  const answers = must(/至少要回答\s*([一二两三四五六七八九十]+)\s*件事/, doc, '关联走向机制要回答的事项数');
  const reasons = must(/教材给出\s*([一二两三四五六七八九十]+)\s*种常见原因/, doc, '关联似是而非的原因数');
  const method = must(/给\s*([一二两三四五六七八九十]+)\s*个方法学问题/, doc, '方法学问题的个数');
  const dirs = must(/给\s*([一二两三四五六七八九十]+)\s*个方向类别/, doc, '结合中医药的方向数');
  const notes = must(/给\s*([一二两三四五六七八九十]+)\s*个设计注意点/, doc, '设计注意点的个数');
  const bounds = must(/给\s*([一二两三四五六七八九十]+)\s*条结论表述边界/, doc, '结论表述的边界条数');

  const units = num(head[1]);
  const hz = num(head[2]);
  const secs = num(head[3]);
  const perSec = num(head[4]);
  const misuse = cn2n(markers[1]) * (cn2n(markers[1]) - 1);

  return {
    lines: [
      '规模对账：' + secs + ' 节 × ' + perSec + ' 单元 = ' + secs * perSec + ' 单元' + (secs * perSec === units ? '，与章首的 ' + units + ' 单元相符' : '，与章首的 ' + units + ' 单元不符'),
      '密度：' + hz.toLocaleString('en-US') + ' 汉字 ÷ ' + units + ' 单元 = ' + fix(hz / units, 0) + ' 汉字/单元；平均每节 ' + fix(hz / secs, 0) + ' 汉字',
      '三层分开：标志物 ' + cn2n(markers[1]) + ' 类用途 × ' + (cn2n(markers[1]) - 1) + ' 种误认方向 = ' + misuse + ' 个混用口子，每个口子都能把「已发生的改变」读成「接触的量」',
      '由浅入深 ' + cn2n(layers[1]) + ' 层思路 · ' + cn2n(designs[1]) + ' 类常用设计 · 从关联到机制要答 ' + cn2n(answers[1]) + ' 件事',
      '为什么看起来像机制：' + cn2n(reasons[1]) + ' 种常见原因（连锁不平衡／人群分层／混杂／测量误差与多重比较）· 方法学问题 ' + cn2n(method[1]) + ' 个',
      '同中医药结合：' + cn2n(dirs[1]) + ' 个方向 · ' + cn2n(notes[1]) + ' 个设计注意点 · ' + cn2n(bounds[1]) + ' 条表述边界——不做机制推断、不做疗效断言、不做个体判定、注明人群限定',
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
  console.log('※ 本章为教学材料，不构成基因检测、遗传咨询、疾病预测或个体化医学建议。');
}

if (require.main === module) main();

module.exports = { analyze, readDoc, sections, paragraphs, tables, tableBy, formulaAudit, grams, hanzi, count, num, pct, cn2n, quizSummary, CHAPTER, SLUG, TITLE, DOC, QUIZ };
