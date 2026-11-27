#!/usr/bin/env node
/**
 * 中药学 · 第 6 章 消食、驱虫、止血共用一条判据：东西该不该留
 *
 *   node code/main.js
 *
 * 正文：chapters/06-xiaoshi-zhixue/docs/zh.md
 * 习题：chapters/06-xiaoshi-zhixue/quiz.json
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

const CHAPTER = 6;
const SLUG = '06-xiaoshi-zhixue';
const TITLE = '消食、驱虫、止血共用一条判据：东西该不该留';

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
  const chans = tableBy(ts, '失序形态');
  const hemo = tableBy(ts, '机制');
  const gas = tableBy(ts, '已填');
  const mer = tableBy(ts, '一句话读法');
  if (!chans || !hemo || !gas || !mer) throw new Error('正文的三章表／四节表／气分布表／归经表有缺');

  const per = (re, s) => Number((String(s).match(re) || [])[1]);
  const f = (re) => per(re, doc);

  // 三章：味数与字数逐行相加，篇均由和去除
  const chapterN = chans.rows.length;
  const herbs = chans.rows.reduce((s, r) => s + numOf(r[2]), 0);
  const chantotal = chans.rows.reduce((s, r) => s + numOf(r[3]), 0);
  const mean = chantotal / herbs;
  const bloodRow = chans.rows.find((r) => String(r[0]).includes('19'));
  const bloodN = numOf(bloodRow[2]);
  const bloodWords = numOf(bloodRow[3]);
  const bloodShare = (bloodWords / chantotal) * 100;

  // 止血四节：机制不是程度，四节味数相加应等于止血那一章
  const secN = hemo.rows.length;
  const secHerbs = hemo.rows.reduce((s, r) => s + numOf(r[1]), 0);

  // 气分布：三组相加
  const filled = gas.rows.reduce((s, r) => s + lead(r[1]), 0);
  const wen = gas.rows.reduce((s, r) => s + lead(r[2]), 0);
  const ping = gas.rows.reduce((s, r) => s + lead(r[3]), 0);
  const han = gas.rows.reduce((s, r) => s + lead(r[4]), 0);
  const liang = gas.rows.reduce((s, r) => s + lead(r[5]), 0);
  const blank = gas.rows.reduce((s, r) => s + lead(r[6]), 0);
  const coverage = (filled / herbs) * 100;
  const flatShare = (ping / filled) * 100;

  // 归经：肝与脾的差，正好是藏血与统血两条职责
  const liver = numOf(mer.rows.find((r) => String(r[0]).startsWith('肝'))[1]);
  const spleen = numOf(mer.rows.find((r) => String(r[0]).startsWith('脾'))[1]);

  // 味与涩：涩是「留」的字面编码
  const tasteLabels = f(/一共给出\s*(\d+)\s*个味标/);
  const se = per(/辛\s*\d+、涩\s*(\d+)/, doc);

  // 编号：locator 去重数与重号数
  const locatorN = f(/\d+\s*味药只有\s*(\d+)\s*个不同的 locator/);
  const dupN = f(/(\d+)\s*条记录与别人共用编号/);

  // 剂量：上界之比写在正文里
  const doseRatio = f(/上界相差\s*(\d+)\s*倍/);

  return {
    chapterN,
    herbs,
    chantotal,
    mean: Number(mean.toFixed(1)),
    bloodN,
    bloodWords,
    bloodShare: Number(bloodShare.toFixed(1)),
    secN,
    secHerbs,
    filled,
    wen,
    ping,
    han,
    liang,
    blank,
    coverage: Number(coverage.toFixed(1)),
    flatShare: Number(flatShare.toFixed(1)),
    liver,
    spleen,
    gap: liver - spleen,
    tasteLabels,
    se,
    locatorN,
    dupN,
    doseRatio,
    lines: [
      '三章 ' + chapterN + ' 章：味数 ' + herbs + '、汉字 ' + chantotal.toLocaleString('en-US') + '，篇均 ' + mean.toFixed(1) + ' 字',
      '止血一章 ' + bloodN + ' 味、' + bloodWords.toLocaleString('en-US') + ' 字，占 ' + bloodShare.toFixed(1) + '%；另两章合计 ' + (100 - Number(bloodShare.toFixed(1))).toFixed(1) + '%',
      '止血四节 ' + secN + ' 节、味数相加 ' + secHerbs + '（' + (secHerbs === bloodN ? '与止血章味数相符' : '与止血章味数不符') + '）——四节是四种机制，不是四种程度',
      '气分布 温 ' + wen + '／平 ' + ping + '／寒 ' + han + '／凉 ' + liang + '，已填 ' + filled + '/' + herbs + ' = ' + coverage.toFixed(1) + '%；平占已填的 ' + flatShare.toFixed(1) + '%',
      '味标 ' + tasteLabels + ' 个，其中涩 ' + se + ' 个，全部落在止血药里；归经 肝 ' + liver + ' 条、脾 ' + spleen + ' 条，差 ' + (liver - spleen) + ' 条（藏血与统血两条职责）',
      '编号：' + locatorN + ' 个不同 locator 对 ' + (locatorN + dupN) + ' 条记录，' + dupN + ' 处重号 —— 裸编号不可回查',
      '剂量上界相差 ' + doseRatio + ' 倍（研末冲服对大量种子仁），不能概括成一句常用量',
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
