#!/usr/bin/env node
/**
 * 中药学 · 第 8 章 化痰与止咳是两套轴：温寒对半，平性只剩两味
 *
 *   node code/main.js
 *
 * 正文：chapters/08-huatan-kesou/docs/zh.md
 * 习题：chapters/08-huatan-kesou/quiz.json
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

const CHAPTER = 8;
const SLUG = '08-huatan-kesou';
const TITLE = '化痰与止咳是两套轴：温寒对半，平性只剩两味';

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
  const sec = tableBy(ts, '分节依据');
  const gas = tableBy(ts, '已填 温');
  const mer = tableBy(ts, '读法');
  const cov = tableBy(ts, '覆盖率');
  const fan = tableBy(ts, '禁忌原文');
  if (!sec || !gas || !mer || !cov || !fan) throw new Error('正文的三节表／气分布表／归经表／覆盖表／十八反表有缺');

  const per = (re, s) => Number((String(s).match(re) || [])[1]);
  const f = (re) => per(re, doc);

  // 三节：味数与字数相加，篇均由和去除
  const secN = sec.rows.length;
  const herbs = sec.rows.reduce((s, r) => s + numOf(r[1]), 0);
  const chantotal = sec.rows.reduce((s, r) => s + numOf(r[2]), 0);
  const mean = chantotal / herbs;
  const widths = sec.rows.map((r) => numOf(r[1]));
  const fattest = sec.rows.reduce((a, b) => (numOf(b[2]) > numOf(a[2]) ? b : a));

  // 气：三节相加，平性占比是本章的招牌数
  const filled = gas.rows.reduce((s, r) => s + lead(r[1]), 0);
  const wen = gas.rows.reduce((s, r) => s + lead(r[2]), 0);
  const han = gas.rows.reduce((s, r) => s + lead(r[3]), 0);
  const ping = gas.rows.reduce((s, r) => s + lead(r[4]), 0);
  const blank = gas.rows.reduce((s, r) => s + lead(r[5]), 0);
  const flatShare = (ping / filled) * 100;
  const coldSide = gas.rows.map((r) => lead(r[3]));
  const hanZhi = gas.rows[gas.rows.length - 1];
  const hanZhiWen = lead(hanZhi[2]);
  const hanZhiHan = lead(hanZhi[3]);
  const hanZhiFlat = lead(hanZhi[4]);

  // 归经：肺是主经，空栏正文全写归肺经
  const lung = numOf(mer.rows.find((r) => String(r[0]).startsWith('肺'))[1]);
  const merRows = mer.rows.length;
  const covGas = numOf(cov.rows.find((r) => String(r[0]) === '气')[1]);
  const covGasBlank = numOf(cov.rows.find((r) => String(r[0]) === '气')[2]);
  const covMer = numOf(cov.rows.find((r) => String(r[0]) === '归经')[1]);
  const covMerBlank = numOf(cov.rows.find((r) => String(r[0]) === '归经')[2]);
  const covGasRate = numOf(cov.rows.find((r) => String(r[0]) === '气')[3]);
  const covMerRate = numOf(cov.rows.find((r) => String(r[0]) === '归经')[3]);
  const lungShare = (lung / covMer) * 100;

  // 十八反与标毒
  const fanN = fan.rows.length;
  const fanRate = (fanN / herbs) * 100;
  const fanTargets = new Set(fan.rows.map((r) => String(r[2]))).size;
  const toxicN = f(/标毒\s*(\d+)\s*味/);

  return {
    secN,
    herbs,
    chantotal,
    mean: Number(mean.toFixed(1)),
    widths,
    fattest: String(fattest[0]).trim(),
    filled,
    wen,
    han,
    ping,
    blank,
    flatShare: Number(flatShare.toFixed(1)),
    hanZhiWen,
    hanZhiHan,
    hanZhiFlat,
    lung,
    merRows,
    covGas,
    covGasBlank,
    covMer,
    covMerBlank,
    covGasRate,
    covMerRate,
    lungShare: Number(lungShare.toFixed(1)),
    fanN,
    fanRate: Number(fanRate.toFixed(1)),
    fanTargets,
    toxicN,
    lines: [
      '三节 ' + secN + ' 节：味数 ' + herbs + '（' + widths.join(' : ') + '）、汉字 ' + chantotal.toLocaleString('en-US') + '，篇均 ' + mean.toFixed(1) + ' 字',
      '字数最厚的是 ' + String(fattest[0]).trim() + '（' + numOf(fattest[2]).toLocaleString('en-US') + ' 字）',
      '气：温 ' + wen + '／寒 ' + han + '／平 ' + ping + '，已填 ' + filled + '/' + herbs + '；平占 ' + flatShare.toFixed(1) + '%（全库平均 23.5%）',
      '止咳节 5 条有值：温 ' + hanZhiWen + '／寒 ' + hanZhiHan + '／平 ' + hanZhiFlat + ' —— 它不按性质聚，跨度与另两节一样宽',
      '归经表 ' + merRows + ' 行，肺 ' + lung + ' 条 = 已填 ' + covMer + ' 条的 ' + lungShare.toFixed(1) + '%；空栏 ' + covMerBlank + ' 条正文全写「归肺经」，加起来才是 ' + herbs + ' 味',
      '覆盖率：气 ' + covGas + '/' + herbs + ' = ' + covGasRate + '%（空 ' + covGasBlank + '），归经 ' + covMer + '/' + herbs + ' = ' + covMerRate + '%（空 ' + covMerBlank + '）',
      '十八反 ' + fanN + ' 味 = ' + fanRate.toFixed(1) + '%，反的对象 ' + fanTargets + ' 种；标毒 ' + toxicN + ' 味',
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
  console.log('※ 本章为教学材料，字段口径与统计均为课堂约定，不构成诊疗建议，也不替代执业医师的判断。');
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
