#!/usr/bin/env node
/**
 * 中医基础理论 · 第 3 章 藏象是一张「黑箱—输出」对照表，解剖实体只解释了它的一半
 *
 *   node code/main.js
 *
 * 正文：chapters/03-zang-xiang-tupu/docs/zh.md
 * 习题：chapters/03-zang-xiang-tupu/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz，不读任何 standards 取数表：正文改了，这里的数字跟着变。
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 本章算术：从正文里解析判据条目、门限与结构数字，再算派生量
 *   · quiz：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 * 任何一项对不上，说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 3;
const SLUG = '03-zang-xiang-tupu';
const TITLE = "藏象是一张「黑箱—输出」对照表，解剖实体只解释了它的一半";

/* ── 文本口径 ────────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const num = (s) => Number(String(s).replace(/[,，\s]/g, ''));
const CN = { 两: 2, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十二: 12 };
const cn2n = (s) => (CN[s] !== undefined ? CN[s] : Number(s));
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

/** markdown 表格：表头 + 去分隔行的数据行 */
function tables(doc) {
  const ls = docLines(doc);
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const out = [];
  let i = 0;
  while (i < ls.length) {
    if (/^\s*\|/.test(ls[i])) {
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

/* ── 本章算术（逐章注入，从正文解析） ───────────────────────────── */

function chapterArithmetic(doc, ts) {
const collect = tableBy(ts, '采集项');
  const fields = tableBy(ts, '字段');
  const m = doc.match(/五脏两两之间有\s*(\d+)\s*对关系（从\s*(\d+)\s*个里取\s*2\s*个）/);
  const pairs = m ? num(m[1]) : 0;
  const k = m ? num(m[2]) : 0;
  const documented = num((doc.match(/只写了\s*(\d+)\s*对/) || [])[1]);
  const missing = pairs - documented;
  const criteria = ['一条稳定象', '与该脏功能相符', '排他依据'].filter((s) => doc.includes(s)).length;
  const pathways = ['经脉络属', '功能相承', '位置相邻'].filter((s) => doc.includes(s)).length;
  const six = ((doc.match(/给六个症状（([^）]+)）/) || [])[1] || '').split('、').filter(Boolean);
  const HIDE = ['自汗', '崩漏', '尿频'];
  const hidden = six.filter((s) => HIDE.some((h) => s.includes(h))).length;
  const unblocked = six.length - hidden;

  return {
    collectItems: collect ? collect.rows.length : 0,
    fieldRows: fields ? fields.rows.length : 0,
    pairs,
    k,
    documented,
    missing,
    criteria,
    pathways,
    symptoms: six.length,
    hidden,
    unblocked,
    lines: [
      '五脏 ' + k + ' 个取 2 = ' + pairs + ' 对，正文写了 ' + documented + ' 对，缺 ' + missing + ' 对（覆盖 ' + Math.round((documented / pairs) * 100) + '%）',
      '功能态判据 ' + criteria + ' 件（稳定象／功能推断／排他依据）',
      '关系边通路 ' + pathways + ' 类（经脉络属／功能相承／位置相邻）',
      '六个考核症状：藏不住 ' + hidden + ' 条 · 泻不通 ' + unblocked + ' 条（' + six.join('、') + '）',
      '采集表 ' + (collect ? collect.rows.length : 0) + ' 行 · 字段表 ' + (fields ? fields.rows.length : 0) + ' 行',
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


/**
 * 五脏配属表（五行—脏—腑—窍—志—体—华）。
 *
 * 为什么写成字面量而不是从正文解析：这张表是本章「排他依据」的唯一索引，
 * 它必须与被教材口径一致；但字面量会与正文脱钩，所以下面 wuxingCheck()
 * 会逐行回查正文是否真有这一行，对不上就抛错——数据在代码里，权威在正文里。
 */
const WUXING_PEI = [
  { name: '肝', wuxing: '木', fu: '胆', qiao: '目', zhi: '怒', ti: '筋', hua: '爪' },
  { name: '心', wuxing: '火', fu: '小肠', qiao: '舌', zhi: '喜', ti: '脉', hua: '面' },
  { name: '脾', wuxing: '土', fu: '胃', qiao: '口', zhi: '思', ti: '肉', hua: '唇' },
  { name: '肺', wuxing: '金', fu: '大肠', qiao: '鼻', zhi: '悲', ti: '皮毛', hua: '毛' },
  { name: '肾', wuxing: '水', fu: '膀胱', qiao: '耳', zhi: '恐', ti: '骨', hua: '发' },
];

/** 逐行回查正文：五行｜脏｜腑｜窍｜志｜体｜华 七格必须同时出现，缺一格即抛错。 */
function wuxingCheck(doc) {
  const miss = [];
  for (const r of WUXING_PEI) {
    const row = `| ${r.wuxing} | ${r.name} | ${r.fu} | ${r.qiao} | ${r.zhi} | ${r.ti} | ${r.hua} |`;
    if (!doc.includes(row)) miss.push(row);
  }
  if (miss.length) throw new Error(`五脏配属表与正文不一致（${miss.length} 行）：` + '\n  ' + miss.join('\n  '));
  return WUXING_PEI.length;
}

function main() {
  const r = analyze();
  const wuxingRows = wuxingCheck(readDoc());
  const a = r.arith;
  console.log(`中医基础理论 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log(`正文 ${r.docHanzi.toLocaleString('en-US')} 汉字 · ${r.paragraphs} 段 · 节 ${r.sections.length} 个 · 五脏配属 ${wuxingRows} 行已回查`);
  console.log('');
  console.log('结构：');
  for (const s of r.sections) console.log(`  ${s}`);
  console.log('');
  console.log(`表 ${r.tables.length} 张：`);
  r.tables.forEach((t, i) => console.log(`  [${i + 1}] ${t.header.join(' / ')} —— ${t.cols} 列 × ${t.rows} 行`));
  console.log('');
  console.log('本章算术（全部从正文解析后计算）：');
  for (const line of a.lines) console.log(`  ${line}`);
  console.log('');
  console.log(`quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· 答案 ${r.quiz.answers.join('/')}`);
  console.log(`  check 题接地 ${r.quiz.checkGrounded} 道 · 答案落在 ${r.quiz.distinctAnswers} 个位置 · 最短解释 ${r.quiz.minExplain} 汉字`);
  console.log('※ 以上数字由本章正文与 quiz 现算，改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，判据与分档均为课堂约定，不构成诊疗建议，也不替代执业医师的判断。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  WUXING_PEI,
  wuxingCheck,
  readDoc,
  sections,
  paragraphs,
  tables,
  tableBy,
  grams,
  hanzi,
  count,
  num,
  cn2n,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
