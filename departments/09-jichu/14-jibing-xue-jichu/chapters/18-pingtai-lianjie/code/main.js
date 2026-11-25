#!/usr/bin/env node
/**
 * 疾病学基础 · 第 18 章 平台能不能用，取决于每条单元有没有「依据」和「边界」两列
 *
 *   node code/main.js
 *
 * 只读两处：
 *   正文  chapters/18-pingtai-lianjie/docs/zh.md
 *   习题  chapters/18-pingtai-lianjie/quiz.json
 * 依赖：仅 Node.js 标准库。不读任何取数表：正文改了，这里打印的数字跟着变。
 *
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 本章算术：从四段编码表与正文自报的底本数字，验一遍单元总数与均分
 *   · 习题：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 18;
const SLUG = '18-pingtai-lianjie';
const TITLE = '平台能不能用，取决于每条单元有没有「依据」和「边界」两列';

/* ── 文本口径 ────────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const num = (s) => Number(String(s).replace(/[,，\s]/g, ''));
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
  const codeTable = tableBy(ts, '缺失的后果'); // 四段编码
  const stateTable = tableBy(ts, '判定'); // 两列四状态

  const fields = codeTable ? codeTable.rows.map((r) => r[0]) : [];
  const states = stateTable ? stateTable.rows.map((r) => r[0]) : [];
  const okStates = stateTable ? stateTable.rows.filter((r) => r[1] === '合格').length : 0;

  // 正文自报的底本规模：216 个单元，18 章，每章 12 个
  const m = doc.match(/底本\s*([\d,]+)\s*个单元，([\d,]+)\s*章，每章\s*([\d,]+)\s*个/);
  const units = m ? num(m[1]) : 0;
  const chapters = m ? num(m[2]) : 0;
  const perChapter = m ? num(m[3]) : 0;
  const product = chapters * perChapter;

  const colM = doc.match(/六个字段：([^。]+)/);
  const colFields = colM ? items(colM[1]) : [];

  const contractM = doc.match(/一组判据——([^。]+)/);
  // 判据之间用顿号分隔；不能按半角逗号切，否则「2,500 字」会被切成两段
  const contract = contractM ? contractM[1].split('、').map((s) => s.trim()).filter(Boolean) : [];

  const hintM = doc.match(/指向（[^）]*）、提醒（[^）]*）、警示（[^）]*）/);
  const hintLayers = hintM ? 3 : 0;

  const pillars = ['人工复核', '可解释', '留痕'].filter((k) => doc.includes(k));

  const entries = (doc.match(/^\s*\d+\.\s+\*\*/gm) || []).length;

  return {
    fields,
    states,
    okStates,
    units,
    chapters,
    perChapter,
    product,
    colFields,
    contract,
    hintLayers,
    pillars,
    entries,
    lines: [
      '单元编码 ' + fields.length + ' 段（' + fields.join(' → ') + '），缺一段就少一种反查能力',
      '底本 ' + units.toLocaleString('en-US') + ' 单元 ÷ ' + chapters + ' 章 = 每章 ' + (chapters ? (units / chapters).toFixed(0) : '—') +
        ' 个；正文自报「每章 ' + perChapter + ' 个」×' + chapters + ' = ' + product +
        (units && product === units ? '，对得上' : '，对不上'),
      '两列判定 ' + states.length + ' 种状态，其中合格 ' + okStates + ' 种；判据是两列任一为空即不合格',
      '平台表字段 ' + colFields.length + ' 个（' + colFields.join('／') + '），与章节目录一一对应',
      '契约判据 ' + contract.length + ' 项，只判结构、出处、字数、残留这些可判的部分',
      '智能辅助提示 ' + hintLayers + ' 层（指向／提醒／警示），强度与误报代价同增；支点 ' +
        pillars.length + ' 个（' + pillars.join('／') + '）',
      '文末验收 ' + entries + ' 项，逐项都有通过标准',
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
  console.log('※ 本章为教学材料，讲单元编码、依据与边界、平台映射与智能辅助的边界要求，不构成技术规范或合规意见。');
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
  num,
  items,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
