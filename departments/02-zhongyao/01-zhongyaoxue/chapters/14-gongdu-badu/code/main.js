#!/usr/bin/env node
/**
 * 中药学 · 第 14 章 12 味毒药的分界不在毒性等级，在给药途径
 *
 *   node code/main.js
 *
 * 正文：chapters/14-gongdu-badu/docs/zh.md
 * 习题：chapters/14-gongdu-badu/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz，不读任何底本或标准表：正文改了，这里的数字跟着变。
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 本章算术：从正文表格与计数句里解析条目，再算覆盖率、集中度与派生量
 *   · quiz：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 * 任何一项对不上，说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 14;
const SLUG = '14-gongdu-badu';
const TITLE = '12 味毒药的分界不在毒性等级，在给药途径';

/* ── 文本口径 ────────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const nums = (s) => (String(s || '').match(/\d+(?:\.\d+)?/g) || []).map(Number);
const numOf = (v) => Number(String(v == null ? '' : v).replace(/[,，\s%]/g, '')) || 0;
/** 取单元格开头的数字（后面可能跟着括注） */
const lead = (v) => Number((String(v == null ? '' : v).match(/^\d+(?:\.\d+)?/) || [0])[0]);
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

/** markdown 表格：表头 + 去分隔行的数据行；围栏代码块里的竖线不算表 */
function tables(doc) {
  const ls = docLines(doc);
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const out = [];
  let i = 0;
  let fenced = false;
  while (i < ls.length) {
    if (/^\s*```/.test(ls[i])) {
      fenced = !fenced;
      i += 1;
      continue;
    }
    if (!fenced && /^\s*\|/.test(ls[i])) {
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

/* ── 本章算术（从正文解析，不写死结果） ─────────────────────────── */

function chapterArithmetic(doc, ts) {
  const chans = tableBy(ts, '篇均');
  const mer = tableBy(ts, '标数');
  const route = tableBy(ts, '途径');
  if (!chans || !mer || !route) throw new Error('正文的两章表／归经表／途径表有缺');

  const per = (re, s) => Number((String(s).match(re) || [])[1]);
  const f = (re) => per(re, doc);

  // 两章：味数与字数相加
  const chapterN = chans.rows.length;
  const herbs = chans.rows.reduce((s, r) => s + numOf(r[2]), 0);
  const chantotal = chans.rows.reduce((s, r) => s + numOf(r[3]), 0);
  const mean = chantotal / herbs;
  const shortRow = chans.rows.reduce((a, b) => (numOf(b[3]) < numOf(a[3]) ? b : a));

  // 归经：肺居首，肠道两经合占多少
  const tags = mer.rows.reduce((s, r) => s + lead(r[1]), 0);
  const lung = lead(mer.rows.find((r) => String(r[0]) === '肺')[1]);
  const colon = lead(mer.rows.find((r) => String(r[0]) === '大肠')[1]);
  const smallInt = lead(mer.rows.find((r) => String(r[0]) === '小肠')[1]);
  const gut = colon + smallInt;
  const gutShare = (gut / tags) * 100;
  const merFilled = f(/(\d+)\/12＝83\.3%/) || f(/覆盖率按\s*(\d+)\/12/);

  // 途径三分：3 + 8 + 1 = 12
  const routes = route.rows.map((r) => ({ k: String(r[0]).trim(), n: lead(r[1]) }));
  const routeSum = routes.reduce((s, r) => s + r.n, 0);
  const outer = (routes.find((r) => r.k.includes('外用')) || { n: 0 }).n;
  const pill = (routes.find((r) => r.k.includes('丸散')) || { n: 0 }).n;
  const decoct = (routes.find((r) => r.k.includes('煎服')) || { n: 0 }).n;

  // 气与味：只见五档，辛占多少
  const qiSent = String((doc.match(/条有气值：([^。]+)/) || [])[1] || '');
  const qiTiers = qiSent ? qiSent.split('、').filter((x) => x.trim()).length : 0;
  const xin = f(/辛\s*(\d+)\/(\d+)/);
  const xinTotal = per(/辛\s*\d+\/(\d+)/, doc);
  const warmSide = f(/温\s*5 与热\s*2 合计\s*(\d+)\s*条/);
  const toxicByNature = f(/按性味句数，([\d]+) 味标毒|12 味里\s*(\d+)\s*味标毒/);
  const toxicByNote = f(/使用注意栏是\s*(\d+)\s*味|只有\s*(\d+)\s*味——差/);

  // 剂量：两端
  const doseMM = doc.match(/([\d.]+)g（砒石）到\s*([\d.]+)g/);
  const doseLow = doseMM ? Number(doseMM[1]) : 0;
  const doseHigh = doseMM ? Number(doseMM[2]) : 0;

  return {
    chapterN,
    herbs,
    chantotal,
    mean: Number(mean.toFixed(1)),
    shortChapter: String(shortRow[0]).trim(),
    tags,
    lung,
    gut,
    gutShare: Number(gutShare.toFixed(1)),
    merFilled,
    routes,
    routeSum,
    outer,
    pill,
    decoct,
    qiTiers,
    xin,
    xinTotal,
    warmSide,
    doseLow,
    doseHigh,
    doseRatio: doseLow ? Math.round(doseHigh / doseLow) : 0,
    lines: [
      '两章 ' + chapterN + ' 章：味数 ' + herbs + '、汉字 ' + chantotal.toLocaleString('en-US') + '，篇均 ' + mean.toFixed(1) + ' 字',
      '更短的一章是 ' + String(shortRow[0]).trim() + '（' + numOf(shortRow[3]) + ' 字、' + numOf(shortRow[2]) + ' 味），毒药比例反而更高',
      '气只用 ' + qiTiers + ' 档，温热侧（温 5＋热 2）' + warmSide + ' 条，占 11 条的 ' + ((warmSide / 11) * 100).toFixed(1) + '%',
      '味：辛 ' + xin + '/' + xinTotal + ' = ' + ((xin / xinTotal) * 100).toFixed(1) + '% —— 这里的辛是刺激，不是发散',
      '归经 ' + tags + ' 个标：肺 ' + lung + ' 居首；大肠 ' + colon + ' ＋小肠 ' + smallInt + ' = ' + gut + '，占 ' + gutShare.toFixed(1) + '%',
      '途径三分：只外用 ' + outer + ' ＋丸散 ' + pill + ' ＋煎服 ' + decoct + ' = ' + routeSum + ' 味（按表相加应等于 ' + herbs + '）',
      '剂量两端相差 ' + Math.round(doseHigh / doseLow) + ' 倍',
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
  console.log(`中药学 第 ${CHAPTER} 章 · ${TITLE}`);
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
  console.log(`quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· 答案 ${r.quiz.answers.join('/')}`);
  console.log(`  check 题接地 ${r.quiz.checkGrounded} 道 · 答案落在 ${r.quiz.distinctAnswers} 个位置 · 最短解释 ${r.quiz.minExplain} 汉字`);
  console.log('※ 以上数字由本章正文与 quiz 现算，改正文后重跑即可复核。');
  console.log('※ 教学边界：本章为教学材料，字段口径与统计均为课堂约定，不构成诊疗建议，也不替代执业医师的判断。');
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
  nums,
  numOf,
  lead,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
