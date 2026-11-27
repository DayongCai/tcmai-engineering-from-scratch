#!/usr/bin/env node
/**
 * 中药学 · 第 12 章 性味归经编成 21 维：余弦排得出描述邻近，排不出可以替换
 *
 *   node code/main.js
 *
 * 正文：chapters/12-xingneng-bianma/docs/zh.md
 * 习题：chapters/12-xingneng-bianma/quiz.json
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

const CHAPTER = 12;
const SLUG = '12-xingneng-bianma';
const TITLE = '性味归经编成 21 维：余弦排得出描述邻近，排不出可以替换';

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
  const dim = tableBy(ts, '维度数');
  const qi = ts.find((t) => String(t.header[0]) === '档');
  const wei = ts.find((t) => String(t.header[0]) === '味');
  const mer = ts.find((t) => String(t.header[0]) === '经');
  if (!dim || !qi || !wei || !mer) throw new Error('正文的编码表／气分布表／味分布表／归经分布表有缺');

  const per = (re, s) => Number((String(s).match(re) || [])[1]);
  const f = (re) => per(re, doc);

  // 21 维的构成：气 / 味 / 归经各占几维
  const dims = dim.rows.map((r) => ({ axis: String(r[0]).trim(), n: lead(r[1]) }));
  const dimTotal = dims.reduce((s, d) => s + d.n, 0);
  const gasDim = (dims.find((d) => d.axis === '四气') || {}).n || 0;
  const weiDim = (dims.find((d) => d.axis === '五味') || {}).n || 0;
  const merDim = (dims.find((d) => d.axis === '归经') || {}).n || 0;

  // 气：九档相加，再并成三个方向
  const qiRows = qi.rows.map((r) => ({ k: String(r[0]).trim(), n: lead(r[1]) }));
  const qiTotal = qiRows.reduce((s, r) => s + r.n, 0);
  const get = (list, k) => (list.find((r) => r.k === k) || { n: 0 }).n;
  const coldSide = ['大寒', '寒', '微寒', '凉'].reduce((s, k) => s + get(qiRows, k), 0);
  const warmSide = ['温', '微温', '热', '大热'].reduce((s, k) => s + get(qiRows, k), 0);
  const flatN = get(qiRows, '平');
  const tierN = qiRows.length;
  const microN = get(qiRows, '微寒') + get(qiRows, '微温');

  // 味：八维相加，苦与微苦拆不拆是两个数
  const weiRows = wei.rows.map((r) => ({ k: String(r[0]).trim(), n: lead(r[1]) }));
  const weiTotal = weiRows.reduce((s, r) => s + r.n, 0);
  const bitter = get(weiRows, '苦');
  const microBitter = get(weiRows, '微苦');
  const xin = get(weiRows, '辛');

  // 归经：12 维，末两维几乎为空
  const merRows = mer.rows;
  // 这张表左右并排两栏，逐格找「标签 + 数字」的组合
  const merFlat = [];
  for (const r of merRows) {
    for (let i = 0; i + 1 < r.length; i += 1) {
      const a = String(r[i] || '').trim();
      const b = String(r[i + 1] || '').trim();
      if (a && !/^[0-9]/.test(a) && /^[0-9]/.test(b)) merFlat.push({ k: a, n: Number(b) });
    }
  }
  const merTotal = merFlat.reduce((s, r) => s + r.n, 0);
  const liver = (merFlat.find((r) => r.k === '肝') || { n: 0 }).n;
  const lung = (merFlat.find((r) => r.k === '肺') || { n: 0 }).n;
  const tiny = (merFlat.find((r) => r.k === '三焦') || { n: 0 }).n + (merFlat.find((r) => r.k === '心包') || { n: 0 }).n;
  const perHerb = merTotal / qiTotal;

  const zeroVec = f(/零向量 = |零向量不会给出坏答案/) || 0;
  const zeroNames = String((doc.match(/零向量 = ([^\n]+)/) || [])[1] || '').trim();

  return {
    dimTotal,
    gasDim,
    weiDim,
    merDim,
    gasShare: Number(((gasDim / dimTotal) * 100).toFixed(1)),
    merShare: Number(((merDim / dimTotal) * 100).toFixed(1)),
    qiTotal,
    tierN,
    coldSide,
    warmSide,
    flatN,
    microN,
    weiTotal,
    bitter,
    microBitter,
    bitterMerged: bitter + microBitter,
    xin,
    merTotal,
    liver,
    lung,
    tiny,
    perHerb: Number(perHerb.toFixed(2)),
    lines: [
      '编码 ' + dimTotal + ' 维：气 ' + gasDim + '、味 ' + weiDim + '、归经 ' + merDim + '；归经占 ' + ((merDim / dimTotal) * 100).toFixed(1) + '%，气只占 ' + ((gasDim / dimTotal) * 100).toFixed(1) + '%',
      '气 ' + tierN + ' 档、合计 ' + qiTotal + ' 味：寒凉侧 ' + coldSide + '、温热侧 ' + warmSide + '、平 ' + flatN + '；带「微」的 ' + microN + ' 味占 ' + ((microN / qiTotal) * 100).toFixed(1) + '%',
      '味 ' + weiRows.length + ' 维、赋值 ' + weiTotal + ' 次：苦 ' + bitter + '、辛 ' + xin + '；苦与微苦合并则是 ' + (bitter + microBitter) + '，对辛的领先从 ' + (bitter - xin) + ' 次扩到 ' + (bitter + microBitter - xin) + ' 次',
      '归经 ' + merDim + ' 维、标数 ' + merTotal + '：肝 ' + liver + ' 居首，肺 ' + lung + ' 次之；三焦与心包合计 ' + tiny + ' 个标 = ' + ((tiny / merTotal) * 100).toFixed(1) + '%，却占 ' + ((2 / merDim) * 100).toFixed(1) + '% 的维度预算',
      '平均每味归经 ' + perHerb.toFixed(2) + ' 条（' + merTotal + ' ÷ ' + qiTotal + '）',
      '零向量 ' + (zeroNames || '（正文未列名）') + '：与任何一味药的余弦都是 0，程序不报错',
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
