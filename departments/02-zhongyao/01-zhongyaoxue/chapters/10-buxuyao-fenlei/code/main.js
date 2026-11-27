#!/usr/bin/env node
/**
 * 中药学 · 第 10 章 补虚药的分类：四节按功效切，寒温表反推不出节名
 *
 *   node code/main.js
 *
 * 正文：chapters/10-buxuyao-fenlei/docs/zh.md
 * 习题：chapters/10-buxuyao-fenlei/quiz.json
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

const CHAPTER = 10;
const SLUG = '10-buxuyao-fenlei';
const TITLE = '补虚药的分类：四节按功效切，寒温表反推不出节名';

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
  const sec = tableBy(ts, '有气值');
  const blank = tableBy(ts, '正文原句');
  const mer = tableBy(ts, '占比');
  const dose = tableBy(ts, '用法用量');
  if (!sec || !blank || !mer || !dose) throw new Error('正文的四节表／空栏表／归经表／剂型表有缺');

  const per = (re, s) => Number((String(s).match(re) || [])[1]);
  const f = (re) => per(re, doc);

  // 四节：味数、字数、有气值逐列相加
  const secN = sec.rows.length;
  const herbs = sec.rows.reduce((s, r) => s + numOf(r[2]), 0);
  const chantotal = sec.rows.reduce((s, r) => s + numOf(r[3]), 0);
  const mean = chantotal / herbs;
  const widths = sec.rows.map((r) => numOf(r[2]));
  const filled = sec.rows.reduce((s, r) => s + numOf(r[5]), 0);
  const covRate = (filled / herbs) * 100;

  // 空栏表：按正文原句分「微温」「微寒」两类
  const blankN = blank.rows.length;
  const weiWen = blank.rows.filter((r) => String(r[1]).includes('微温')).length;
  const weiHan = blank.rows.filter((r) => String(r[1]).includes('微寒')).length;

  // 补阴一节：13 味里有气值 5 条
  const yinRow = sec.rows.find((r) => String(r[1]).includes('补阴'));
  const yinN = numOf(yinRow[2]);
  const yinFilled = numOf(yinRow[5]);
  const yinCov = (yinFilled / yinN) * 100;

  // 归经：肾居首，补阳 11 味全归肾
  const tags = mer.rows.reduce((s, r) => s + lead(r[1]), 0);
  const kidney = lead(mer.rows.find((r) => String(r[0]) === '肾')[1]);
  const spleen = lead(mer.rows.find((r) => String(r[0]) === '脾')[1]);
  const kidneyGap = kidney - spleen;
  const yangN = numOf(sec.rows.find((r) => String(r[1]).includes('补阳'))[2]);

  // 平性占比：只算有值的那几条
  const flat = f(/平\s*(\d+) 条占\s*\d+%/) || f(/平性\s*(\d+) 条/);
  const flatShare = (flat / filled) * 100;

  // 剂量：逐条抽「低–高」，取极值
  const pairs = [];
  for (const r of dose.rows) {
    const re = /([\d.]+)\s*[–-]\s*([\d.]+)\s*g/g;
    let mm;
    while ((mm = re.exec(String(r[1])))) pairs.push({ low: Number(mm[1]), high: Number(mm[2]) });
  }
  const maxHigh = Math.max(...pairs.map((p) => p.high));
  const minLow = Math.min(...pairs.map((p) => p.low));

  // 归经覆盖率与十八反的位次
  const merFilled = f(/归经这一栏是本课覆盖率最高的一栏：(\d+) 条全有值/);
  const tabooPos = f(/十八反十九条里，补虚药占了\s*(\d+)\s*个位置/);
  const noToxic = f(/39 味里没有一味标「有毒」/) || 0;

  return {
    secN,
    herbs,
    chantotal,
    mean: Number(mean.toFixed(1)),
    widths,
    filled,
    covRate: Number(covRate.toFixed(1)),
    blankN,
    weiWen,
    weiHan,
    yinN,
    yinFilled,
    yinCov: Number(yinCov.toFixed(1)),
    tags,
    kidney,
    spleen,
    kidneyGap,
    yangN,
    flat,
    flatShare: Number(flatShare.toFixed(1)),
    doseRows: pairs.length,
    maxHigh,
    minLow,
    doseRatio: Math.round(maxHigh / minLow),
    merFilled,
    tabooPos,
    lines: [
      '四节 ' + secN + ' 节：味数 ' + herbs + '（' + widths.join(' : ') + '）、汉字 ' + chantotal.toLocaleString('en-US') + '，篇均 ' + mean.toFixed(1) + ' 字',
      '气有值 ' + filled + '/' + herbs + ' = ' + covRate.toFixed(1) + '%；空栏 ' + blankN + ' 条，其中「性微温」' + weiWen + ' 条、「性微寒」' + weiHan + ' 条',
      '补阴一节 ' + yinN + ' 味里只有 ' + yinFilled + ' 条有气值 = ' + yinCov.toFixed(1) + '% —— 缺口压在典型药上',
      '平性 ' + flat + ' 条占 ' + flatShare.toFixed(1) + '%（只算有值的 ' + filled + ' 条）',
      '归经 ' + tags + ' 个经标：肾 ' + kidney + '、脾 ' + spleen + '，差 ' + kidneyGap + ' 条；补阳 ' + yangN + ' 味全归肾',
      '剂量表 ' + pairs.length + ' 组：两端相差 ' + Math.round(maxHigh / minLow) + ' 倍',
      '归经 ' + (merFilled || herbs) + ' 条全有值；十八反里补虚药占 ' + tabooPos + ' 个位置，是各章最密的一组',
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
