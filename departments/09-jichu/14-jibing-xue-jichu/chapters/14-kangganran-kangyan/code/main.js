#!/usr/bin/env node
/**
 * 疾病学基础 · 第 14 章 抗感染与抗炎的分界，不在药名，而在「针对什么、凭什么用、何时停」
 *
 *   node code/main.js
 *
 * 只读两处：
 *   正文  chapters/14-kangganran-kangyan/docs/zh.md
 *   习题  chapters/14-kangganran-kangyan/quiz.json
 * 依赖：仅 Node.js 标准库。不读任何取数表：正文改了，这里打印的数字跟着变。
 *
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 本章算术：从三问表、使用原则与监护要求解析条目，再算分工与观察位
 *   · 习题：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 14;
const SLUG = '14-kangganran-kangyan';
const TITLE = '抗感染与抗炎的分界，不在药名，而在「针对什么、凭什么用、何时停」';

/* ── 文本口径 ────────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
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

/* ── 本章算术（逐章注入，全部从正文解析） ────────────────────────── */

function chapterArithmetic(doc, ts) {
  const threeQ = tableBy(ts, '答不上来的后果');
  const rows = threeQ ? threeQ.rows.map((r) => r[0]) : [];

  const principleM = doc.match(/使用原则这一组，落点是「([^」]+)」四条/);
  const principles = principleM ? items(principleM[1]) : [];

  // 抗炎作用的三处环节：正文连写三个「有的作用于……」
  const antiInflam = count(doc, '有的作用于');

  const immM = doc.match(/免疫调节类别按方向分为([^。]+)两类/);
  const immDir = immM ? immM[1].split(/与|、/) : [];

  const monM = doc.match(/监护拆成三块：([^。]+)/);
  const monitors = monM ? items(monM[1]) : [];

  const timeM = doc.match(/观察的时点有三：([^。]+)/);
  const obsTimes = timeM ? items(timeM[1]) : [];

  const safeM = doc.match(/把安全拆成可检查的四项：([^。]+)/);
  const safeItems = safeM ? items(safeM[1]) : [];

  const duty = doc.match(/核对、观察、记录、报告四件事由学习者完成；选择、调整、判定三件事由具备资质的人员完成/);
  const learnerDuty = duty ? 4 : 0;
  const expertDuty = duty ? 3 : 0;

  const sayTypes = ['现象类', '机制类', '归因类'].filter((k) => doc.includes(k));

  return {
    rows,
    principles,
    antiInflam,
    immDir,
    monitors,
    obsTimes,
    safeItems,
    learnerDuty,
    expertDuty,
    sayTypes,
    lines: [
      '三问 ' + rows.length + ' 条（' + rows.join('／') + '）× 3 列（答什么／答不上来的后果）= ' +
        rows.length * 3 + ' 个必答格',
      '使用原则 ' + principles.length + ' 条（' + principles.join('／') + '），四条都不是数值',
      '抗炎作用环节 ' + antiInflam + ' 处；免疫调节按方向分 ' + immDir.length + ' 类（' + immDir.join('／') + '）',
      '监护 ' + monitors.length + ' 块（' + monitors.join('／') + '）· 观察时点 ' + obsTimes.length +
        ' 个（' + obsTimes.join('／') + '）',
      '用药安全 ' + safeItems.length + ' 项可检查项（' + safeItems.join('／') + '），缺一项只剩自我评价',
      '责任分工：学习者 ' + learnerDuty + ' 件事 ＋ 具备资质的人员 ' + expertDuty + ' 件事 = ' +
        (learnerDuty + expertDuty) + ' 项，是边界不是等级',
      '表述类型 ' + sayTypes.length + ' 类（' + sayTypes.join('／') + '），后一类是越界判断的入口',
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
  console.log('※ 本章为教学材料，只讲治疗类别、使用原则与监护要求，不含药名、剂量、用法与疗程，不构成诊疗建议。');
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
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
