#!/usr/bin/env node
/**
 * 疾病学基础 · 第 12 章 免疫应答的四个环节，比任何一型超敏反应的名字都更该记住
 *
 *   node code/main.js
 *
 * 只读两处：
 *   正文  chapters/12-mianyi-bingyuan-jibing/docs/zh.md
 *   习题  chapters/12-mianyi-bingyuan-jibing/quiz.json
 * 依赖：仅 Node.js 标准库。不读任何取数表：正文改了，这里打印的数字跟着变。
 *
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 本章算术：从两条防线表、四环节表与并列短语解析条目，再算类别组合数
 *   · 习题：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 12;
const SLUG = '12-mianyi-bingyuan-jibing';
const TITLE = '免疫应答的四个环节，比任何一型超敏反应的名字都更该记住';

/* ── 文本口径 ────────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const CN = { 两: 2, 二: 2, 一: 1, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
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

/** 并列项：先削括号内的举例，再按顿号切 */
function items(s) {
  return String(s || '')
    .replace(/（[^）]*）/g, '')
    .split(/[、，,；;／]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** 同上，但把「与」也当分隔（正文里成对的类别多用「与」连写） */
function items2(s) {
  return String(s || '')
    .replace(/（[^）]*）/g, '')
    .split(/[、，,；;／]|与/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/* ── 本章算术（逐章注入，全部从正文解析） ────────────────────────── */

function chapterArithmetic(doc, ts) {
  const lines2 = tableBy(ts, '固有免疫'); // 两条防线对比表
  const loopTable = tableBy(ts, '失灵时'); // 四环节排查表
  const hyperTable = tableBy(ts, '损伤方式'); // 超敏四类机制表

  const dims = lines2 ? lines2.rows.map((r) => r[0]) : [];
  const looplets = loopTable ? loopTable.rows.map((r) => r[0]) : [];
  const hyper = hyperTable ? hyperTable.rows.map((r) => r[0]) : [];

  const pathM = doc.match(/感染途径分([一二三四五六])类：([^。]+)/);
  const paths = pathM ? items(pathM[2]) : [];
  const mediaM = doc.match(/传播媒介另分([^。]+)三类/);
  const media = mediaM ? items(mediaM[1]) : [];
  const chainM = doc.match(/传播链分([一二三四五六])环节：([^。]+)/);
  const chain = chainM ? items(chainM[2]) : [];

  const germM = doc.match(/病原类别按大类分：([^。]+)/);
  const germs = germM ? items(germM[1]) : [];

  const defM = doc.match(/原发性按受累环节分([^；]+)；继发性按因素方向分([^。]+)/);
  const primary = defM ? items(defM[1]) : [];
  const secondary = defM ? items(defM[2]) : [];

  const autoM = doc.match(/按受累范围分([^；]+)；按受累环节分([^，。]+)/);
  const autoScope = autoM ? items2(autoM[1]) : [];
  const autoLoop = autoM ? items2(autoM[2]) : [];

  const stageM = doc.match(/致敏（[^）]*）、激发（[^）]*）、效应（[^）]*）/);

  return {
    dims,
    looplets,
    hyper,
    paths,
    media,
    chain,
    germs,
    primary,
    secondary,
    autoScope,
    autoLoop,
    stages: stageM ? 3 : 0,
    lines: [
      '两条防线对比：' + dims.length + ' 个维度（' + dims.join('／') + '）× 2 类 = ' + dims.length * 2 + ' 个对比格',
      '应答环节 ' + looplets.length + ' 个（' + looplets.join(' → ') + '），每个环节一条成立判据',
      '超敏机制 ' + hyper.length + ' 类，差别在参与成分与损伤方式，不在轻重',
      '发生环节 ' + (stageM ? 3 : 0) + ' 段（致敏 → 激发 → 效应），第一次接触无事、第二次才有事的解释在这里',
      '免疫缺陷：原发性 ' + primary.length + ' 类（' + primary.join('／') + '）＋ 继发性 ' +
        secondary.length + ' 类 = ' + (primary.length + secondary.length) + ' 类',
      '自身免疫：范围 ' + autoScope.length + ' × 环节 ' + autoLoop.length + ' = ' +
        autoScope.length * autoLoop.length + ' 个类别坐标',
      '病原 ' + germs.length + ' 大类；感染途径 ' + paths.length + ' 类 × 传播媒介 ' + media.length +
        ' 类 = ' + paths.length * media.length + ' 个组合；传播链 ' + chain.length + ' 环节',
    ],
  };
}

/* ── 习题：结构 + 接地 ──────────────────────────────────────────── */

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
  const rows = qs.map((q, i) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    const hit = [...grams(right)].filter((g) => body.has(g));
    const why = q.explain || q.explanation || '';
    return { n: i + 1, stage: q.stage, options: opts.length, correct: q.correct, explainHanzi: hanzi(why), grounded: hit.length, sample: hit.slice(0, 3) };
  });
  return {
    total: qs.length,
    stage,
    rows,
    answers: qs.map((q) => q.correct),
    distinctAnswers: new Set(qs.map((q) => q.correct)).size,
    checkGrounded: rows.filter((x) => x.stage === 'check' && x.grounded > 0).length,
    minExplain: rows.length ? Math.min(...rows.map((x) => x.explainHanzi)) : 0,
    allFourOptions: rows.every((x) => x.options === 4),
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
  console.log(`疾病学基础 第 ${CHAPTER} 章 · ${TITLE}`);
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
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· 答案 ${r.quiz.answers.join('/')}`
  );
  console.log(
    `  check 题接地 ${r.quiz.checkGrounded} 道 · 答案落在 ${r.quiz.distinctAnswers} 个位置 · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('※ 以上数字由本章正文与 quiz 现算，改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，类别与环节均为课堂约定，不含分型判定、检验参考值与诊疗方案，不构成诊疗建议。');
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
  items,
  items2,
  cn2n,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
