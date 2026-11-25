#!/usr/bin/env node
/**
 * 疾病学基础 · 第 13 章 药物作用不是一份用药清单，而是一条可追问的体内过程链
 *
 *   node code/main.js
 *
 * 只读两处：
 *   正文  chapters/13-yaowu-zuoyong-jichu/docs/zh.md
 *   习题  chapters/13-yaowu-zuoyong-jichu/quiz.json
 * 依赖：仅 Node.js 标准库。不读任何取数表：正文改了，这里打印的数字跟着变。
 *
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 本章算术：从对照轴表、体内过程表与并列短语解析条目，再算观察位与组合数
 *   · 习题：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 13;
const SLUG = '13-yaowu-zuoyong-jichu';
const TITLE = '药物作用不是一份用药清单，而是一条可追问的体内过程链';

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
  const axis = tableBy(ts, '常见错法'); // 四组对照轴
  const path = tableBy(ts, '观察能看见什么'); // 吸收／分布／代谢／排泄
  const misread = tableBy(ts, '它错在哪'); // 四个常见误读

  const axisRows = axis ? axis.rows.map((r) => r[0]) : [];
  const pathRows = path ? path.rows.map((r) => r[0]) : [];
  const misreadRows = misread ? misread.rows.map((r) => r[0]) : [];

  // 作用方式五问：正文用五个「按……」的分句排列
  const modeQs = (doc.match(/按(?:途径|是否经吸收|时间|可否回复|与调节系统的关系)/g) || []).length;

  // 影响因素三组
  const factorM = doc.match(/影响因素归成三组：([^。]+)/);
  const factors = (factorM ? items(factorM[1]) : []).map((s) => s.replace(/^以及/, ''));

  // 观察：三类内容 × 三段过程
  const obsM = doc.match(/内容分([^；]+)；过程分([^。]+)/);
  const obsKinds = obsM ? items(obsM[1].replace(/三类$/, '')) : [];
  const obsPhases = obsM ? items(obsM[2].replace(/三段$/, '')) : [];

  // 记录三要素
  const recM = doc.match(/(项目、方式与时机)三样俱全/);
  const recItems = recM ? recM[1].split(/、|与/) : [];

  // 四个动作与各自判据
  const acts = ['核对', '观察', '记录', '报告'].filter((k) => new RegExp('\\*\\*' + k + '\\*\\*').test(doc));

  return {
    axisRows,
    pathRows,
    misreadRows,
    modeQs,
    factors,
    obsKinds,
    obsPhases,
    recItems,
    acts,
    lines: [
      '四组对照轴 ' + axisRows.length + ' 条（' + axisRows.join('／') + '）× 每轴 4 列 = ' +
        (axis ? axis.rows.length * axis.cols : 0) + ' 个判读格',
      '作用方式 ' + modeQs + ' 问（途径／吸收与否／时间／可否回复／与调节系统的关系），全部在问「怎么到达」',
      '体内过程 ' + pathRows.length + ' 段（' + pathRows.join(' → ') + '），段段衔接，一段改则后段皆变',
      '三组因素 ' + factors.length + ' 组（' + factors.join('／') + '），各组共同作用，不是单独决定',
      '观察 ' + obsKinds.length + ' 类内容（' + obsKinds.join('／') + '）× ' + obsPhases.length +
        ' 段过程（' + obsPhases.join('／') + '）= ' + obsKinds.length * obsPhases.length + ' 个观察位',
      '记录要素 ' + recItems.length + ' 项（' + recItems.join('／') + '）；动作 ' + acts.length +
        ' 个（' + acts.join(' → ') + '），串联而非并列',
      '常见误读 ' + misreadRows.length + ' 条，每条一句改写法',
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
  console.log('※ 本章为教学材料，只讲作用类别与体内环节，不含药物名称、剂量、用法与疗程，不构成诊疗建议。');
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
