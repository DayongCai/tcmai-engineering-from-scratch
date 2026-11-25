#!/usr/bin/env node
/**
 * 流行病学 · 第 9 章 慢病防的是几十年的暴露，伤害防的是那一秒的能量
 *
 *   node code/main.js
 *
 * 正文：chapters/09-manxingbing-shanghai/docs/zh.md
 * 习题：chapters/09-manxingbing-shanghai/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz，不去任何 standards 取数：
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 本章算术：从正文里解析算例数字，再算派生量（分母一换，结论就变）
 *   · 公式复核：正文里写成 a op b = c 的二元算式，逐条复算
 *   · quiz：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 * 任何一项对不上，说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 9;
const SLUG = '09-manxingbing-shanghai';
const TITLE = '慢病防的是几十年的暴露，伤害防的是那一秒的能量';

/* ── 文本口径 ─────────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const num = (s) => Number(String(s).replace(/[,，\s]/g, ''));
const pct = (x, d = 1) => (x * 100).toFixed(d) + '%';
const per = (x, d = 1) => (x * 1000).toFixed(d) + '‰';
const fix = (x, d = 2) => Number(x).toFixed(d);
const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const docLines = (doc) => String(doc).split(/\r?\n/);

/** 正文里找不到就报错：宁可脚本失败，也不静默输出一个手打的数 */
function must(re, text, label) {
  const m = String(text).match(re);
  if (!m) throw new Error('正文里找不到「' + label + '」——正文改过，脚本要跟着改');
  return m;
}

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

/* ── 公式复核：正文里每一处二元算式都当场再算一遍 ────────────────── */

const OP = { '÷': (a, b) => a / b, '×': (a, b) => a * b, '−': (a, b) => a - b, '-': (a, b) => a - b, '+': (a, b) => a + b };

function formulaAudit(doc) {
  const src = String(doc);
  const re = /(?<![\d,.\u00d7\u00f7+\-\u2212\/])([\d][\d,]*(?:\.\d+)?)\s*([÷×+\u2212\-])\s*([\d][\d,]*(?:\.\d+)?)\s*=\s*([\d][\d,]*(?:\.\d+)?)\s*(%|‰)?/g;
  const rows = [];
  for (const m of src.matchAll(re)) {
    const after = src.slice(m.index + m[0].length, m.index + m[0].length + 1);
    if (/[:\d\/]/.test(after)) continue; // 比值写法或单位链条，不在这里审
    const a = num(m[1]);
    const b = num(m[3]);
    const stated = num(m[4]);
    const unit = m[5] || '';
    const scale = unit === '%' ? 100 : unit === '‰' ? 1000 : 1;
    const calc = OP[m[2]](a, b);
    const want = stated / scale;
    const ok = Math.abs(calc - want) <= Math.max(Math.abs(want) * 0.01, 0.0005) || Math.abs(calc - stated) <= Math.max(Math.abs(stated) * 0.01, 0.0005);
    rows.push({ expr: m[0].replace(/\s+/g, ' ').trim(), calc, want, unit, ok });
  }
  return rows;
}

/* ── 本章算术（逐章注入，全部从正文解析） ───────────────────────── */

const chapterArithmetic = function arc09(doc, ts) {
  const pid = must(/某病年发病率\s*(\d+)\/1,000，患者平均病程\s*(\d+)\s*年/, doc, 'P≈I×D 算例');
  const inj = must(/共发生\s*(\d+)\s*例次伤害、涉及\s*(\d+)\s*人/, doc, '伤害人数与例次');
  const death = must(/伤害死亡\s*(\d+)\s*人、平均人口\s*(\d+)\s*万/, doc, '伤害死亡率');
  const cfr = must(/因伤害住院\s*([\d,]+)\s*人、其中死亡\s*(\d+)\s*人/, doc, '伤害病死率');
  const pyll = must(/预期寿命\s*(\d+)\s*岁，PYLL=(\d+)−(\d+)=(\d+)/, doc, 'PYLL 算例');
  const pop = must(/某人群\s*(\d+)\s*万人/, doc, '人群规模');
  const uni = must(/全人群策略使发病率从\s*([\d.]+)\/1,000\s*降到\s*([\d.]+)\/1,000/, doc, '全人群策略算例');
  const high = must(/只对\s*([\d,]+)\s*万名高危者干预、使其发病率从\s*(\d+)\/1,000\s*降到\s*(\d+)\/1,000/, doc, '高危策略算例');
  const p = (num(pid[1]) / 1000) * num(pid[2]);
  const n = num(inj[1]);
  const h = num(inj[2]);
  const dRate = num(death[1]) / (num(death[2]) * 10000);
  const cRate = num(cfr[2]) / num(cfr[1]);
  const uniCases = ((num(uni[1]) - num(uni[2])) / 1000) * num(pop[1]) * 10000;
  const highCases = ((num(high[2]) - num(high[3])) / 1000) * num(high[1]) * 10000;
  return {
    lines: [
      'P≈I×D：' + pid[1] + '/1,000 × ' + pid[2] + ' 年 = ' + per(p) + '（即 ' + pct(p) + '）；换 4/1,000×5 年也是同一个数，横断面分不清',
      '伤害人数率 ' + h + '÷1,000 = ' + pct(h / 1000) + ' · 例次率 ' + n + '÷1,000 = ' + fix(n / 1000, 2) + ' 例次/人年',
      '伤害死亡率 ' + death[1] + '÷' + (num(death[2]) * 10000).toLocaleString('en-US') + ' = ' + pct(dRate, 3) + ' · 伤害病死率 ' + cfr[2] + '÷' + cfr[1] + ' = ' + pct(cRate),
      'PYLL = ' + pyll[2] + '−' + pyll[3] + ' = ' + pyll[4] + ' 人年（早死折算成可加总的年数）',
      '全人群策略少发 ' + fix(uniCases, 0) + ' 例、高危策略少发 ' + fix(highCases, 0) + ' 例：例数相同，覆盖人数与人均成本差十倍',
    ],
  };
};

/* ── quiz：结构 + 接地 ───────────────────────────────────────────── */

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
      sample: hit.slice(0, 2),
    };
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
  console.log('※ 本章为教学材料，全部算例为合成数，不构成诊疗建议，也不替代执业医师的判断。');
}

if (require.main === module) main();

module.exports = { analyze, readDoc, sections, paragraphs, tables, tableBy, formulaAudit, grams, hanzi, count, num, pct, per, quizSummary, CHAPTER, SLUG, TITLE, DOC, QUIZ };
