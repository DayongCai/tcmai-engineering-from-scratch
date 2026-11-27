#!/usr/bin/env node
/**
 * 中药学 · 第 9 章 安神、平肝、开窍：26 味药只落在心与肝两条经上
 *
 *   node code/main.js
 *
 * 正文：chapters/09-anshen-pinggan/docs/zh.md
 * 习题：chapters/09-anshen-pinggan/quiz.json
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

const CHAPTER = 9;
const SLUG = '09-anshen-pinggan';
const TITLE = '安神、平肝、开窍：26 味药只落在心与肝两条经上';

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
  const sec = tableBy(ts, '靶脏腑');
  const gas = tableBy(ts, '已填 平');
  const mer = tableBy(ts, '主要来源');
  const dose = tableBy(ts, '剂型');
  if (!sec || !gas || !mer || !dose) throw new Error('正文的三章表／气分布表／归经表／剂型表有缺');

  const per = (re, s) => Number((String(s).match(re) || [])[1]);
  const f = (re) => per(re, doc);

  // 三章：味数与字数相加，篇均由和去除
  const chapterN = sec.rows.length;
  const herbs = sec.rows.reduce((s, r) => s + numOf(r[2]), 0);
  const chantotal = sec.rows.reduce((s, r) => s + numOf(r[3]), 0);
  const mean = chantotal / herbs;
  const widths = sec.rows.map((r) => numOf(r[2]));
  const biggest = sec.rows.reduce((a, b) => (numOf(b[3]) > numOf(a[3]) ? b : a));

  // 气：三章相加，平性占比是这一组的招牌
  const filled = gas.rows.reduce((s, r) => s + lead(r[1]), 0);
  const ping = gas.rows.reduce((s, r) => s + lead(r[2]), 0);
  const han = gas.rows.reduce((s, r) => s + lead(r[3]), 0);
  const liang = gas.rows.reduce((s, r) => s + lead(r[4]), 0);
  const wen = gas.rows.reduce((s, r) => s + lead(r[5]), 0);
  const blank = gas.rows.reduce((s, r) => s + lead(r[6]), 0);
  const flatShare = (ping / filled) * 100;
  const anshen = gas.rows.find((r) => String(r[0]).includes('22'));
  const pinggan = gas.rows.find((r) => String(r[0]).includes('23'));
  const anshenPing = lead(anshen[2]);
  const pingganFilled = lead(pinggan[1]);
  const pingganColdSide = lead(pinggan[3]) + lead(pinggan[4]);

  // 归经：心与肝两条经吃掉一半以上
  const tagN = mer.rows.reduce((s, r) => s + lead(r[1]), 0);
  const heart = lead(mer.rows.find((r) => String(r[0]) === '心')[1]);
  const liver = lead(mer.rows.find((r) => String(r[0]) === '肝')[1]);
  const twoShare = ((heart + liver) / tagN) * 100;
  const merRows = mer.rows.length;

  // 剂量与剂型：丸散数决定量级
  const pairs = [];
  for (const r of dose.rows) {
    const re = /([\d.]+)\s*[–-]\s*([\d.]+)\s*g/g;
    let mm;
    while ((mm = re.exec(String(r[1])))) pairs.push({ low: Number(mm[1]), high: Number(mm[2]) });
  }
  const maxHigh = Math.max(...pairs.map((p) => p.high));
  const minLow = Math.min(...pairs.map((p) => p.low));
  const wanSan = f(/\d+\s*味里有\s*(\d+)\s*味以丸散为主/) || f(/\d+ 味里有 (\d+) 味以丸散/);
  const toxicN = f(/标毒的\s*(\d+)\s*味/);

  return {
    chapterN,
    herbs,
    chantotal,
    mean: Number(mean.toFixed(1)),
    widths,
    biggest: String(biggest[0]).trim(),
    filled,
    ping,
    han,
    liang,
    wen,
    blank,
    flatShare: Number(flatShare.toFixed(1)),
    anshenPing,
    pingganFilled,
    pingganColdSide,
    tagN,
    heart,
    liver,
    twoShare: Number(twoShare.toFixed(1)),
    merRows,
    doseRows: pairs.length,
    maxHigh,
    minLow,
    doseRatio: Math.round(maxHigh / minLow),
    wanSan,
    toxicN,
    lines: [
      '三章 ' + chapterN + ' 章：味数 ' + herbs + '（' + widths.join(' : ') + '）、汉字 ' + chantotal.toLocaleString('en-US') + '，篇均 ' + mean.toFixed(1) + ' 字',
      '字数最多的是 ' + String(biggest[0]).trim() + '（' + numOf(biggest[3]).toLocaleString('en-US') + ' 字，占 ' + ((numOf(biggest[3]) / chantotal) * 100).toFixed(1) + '%）',
      '气：平 ' + ping + '／寒 ' + han + '／温 ' + wen + '／凉 ' + liang + '，已填 ' + filled + '/' + herbs + '；平占 ' + flatShare.toFixed(1) + '%（全库 23.5%）',
      '安神章 8 条有值里 ' + anshenPing + ' 条平；平肝章 ' + pingganFilled + ' 条有值里 ' + pingganColdSide + ' 条在寒凉侧 = ' + ((pingganColdSide / pingganFilled) * 100).toFixed(1) + '%',
      '归经 ' + merRows + ' 条经、' + tagN + ' 个经标：心 ' + heart + '、肝 ' + liver + '，两脏合计 ' + (heart + liver) + ' = ' + twoShare.toFixed(1) + '%',
      '剂型表 ' + dose.rows.length + ' 行、' + pairs.length + ' 组剂量：两端相差 ' + Math.round(maxHigh / minLow) + ' 倍',
      '以丸散为主 ' + wanSan + ' 味；标毒 ' + toxicN + ' 味 —— 标毒与危险在这一组不是同一件事',
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
