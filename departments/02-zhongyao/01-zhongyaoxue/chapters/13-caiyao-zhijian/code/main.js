#!/usr/bin/env node
/**
 * 中药学 · 第 13 章 五道闸算出 3.341 分：四道是常数，只有炮制在动
 *
 *   node code/main.js
 *
 * 正文：chapters/13-caiyao-zhijian/docs/zh.md
 * 习题：chapters/13-caiyao-zhijian/quiz.json
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

const CHAPTER = 13;
const SLUG = '13-caiyao-zhijian';
const TITLE = '五道闸算出 3.341 分：四道是常数，只有炮制在动';

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
  const chans = tableBy(ts, '节数');
  const gates = tableBy(ts, '通过率');
  const dist = tableBy(ts, '缺的闸');
  if (!chans || !gates || !dist) throw new Error('正文的五章表／五闸表／得分表有缺');

  const per = (re, s) => Number((String(s).match(re) || [])[1]);
  const f = (re) => per(re, doc);

  // 五章：节数与字数相加
  const chapterN = chans.rows.length;
  const secTotal = chans.rows.reduce((s, r) => s + numOf(r[1]), 0);
  const chantotal = chans.rows.reduce((s, r) => s + numOf(r[2]), 0);
  const mean = chantotal / secTotal;

  // 五道闸：逐闸通过数与通过率
  const gateRows = gates.rows.map((r) => ({
    id: String(r[0]).split(' ')[0],
    name: String(r[0]).split(' ').slice(1).join(' '),
    pass: numOf(r[3]),
    rate: Number(String(r[4]).replace(/[^0-9.]/g, '')),
  }));
  const passSum = gateRows.reduce((s, g) => s + g.pass, 0);
  const movingGate = gateRows.filter((g) => g.rate > 1 && g.rate < 99);
  const flatGates = gateRows.filter((g) => g.rate >= 99);
  const zeroGates = gateRows.filter((g) => g.rate === 0);

  // 得分分布：只有三档有数
  const distRows = dist.rows
    .map((r) => ({ score: lead(r[0]), n: numOf(r[1]) }))
    .filter((r) => r.n > 0);
  const distTotal = distRows.reduce((s, r) => s + r.n, 0);
  const herbN = distTotal;
  const meanPassed = passSum / herbN;
  const meanScore = meanPassed / gateRows.length;
  const identity = f(/有\s*(\d+)\s*味的得分恰好等于/);
  const exceptions = f(/(\d+)\s*个例外全部是/);

  // 剂量：窄带与两端
  const narrow = f(/五档合计\s*(\d+)\s*味/);
  const i5 = Math.max(0, doc.indexOf('五档合计'));
  const seg5 = String(doc.slice(i5, i5 + 40));
  const narrowRate = Number((seg5.match(/[0-9.]+%/) || ['0%'])[0].replace('%', ''));
  const topN = f(/低端\s*(\d+)\s*味/);
  const pairN = f(/一共列出\s*(\d+)\s*对禁忌关系/);
  const bothIn = f(/两味药都在教材\s*\d+\s*味选载内的，(\d+)\s*对/);
  const written = f(/写出「不宜同用」的，\*\*只有\s*(\d+)\s*处/);

  return {
    chapterN,
    secTotal,
    chantotal,
    mean: Number(mean.toFixed(1)),
    gateN: gateRows.length,
    gateIds: gateRows.map((g) => g.id),
    passSum,
    meanPassed: Number(meanPassed.toFixed(3)),
    meanScore: Number(meanScore.toFixed(3)),
    movingGate: movingGate.map((g) => g.id + ' ' + g.rate.toFixed(1) + '%'),
    flatGateN: flatGates.length,
    zeroGateN: zeroGates.length,
    distRows,
    distTotal,
    identity,
    exceptions,
    narrow,
    narrowRate,
    topN,
    pairN,
    bothIn,
    written,
    lines: [
      '五章 ' + chapterN + ' 章、' + secTotal + ' 节、汉字 ' + chantotal.toLocaleString('en-US') + '，篇均 ' + mean.toFixed(1) + ' 字',
      '五道闸 ' + gateRows.length + ' 道：通过数合计 ' + passSum + '，平均过 ' + (passSum / herbN).toFixed(3) + ' 道（满 5 道），均分 ' + ((passSum / herbN) / gateRows.length).toFixed(3),
      '逐闸通过率：' + gateRows.map((g) => g.id + ' ' + g.rate.toFixed(1) + '%').join(' · '),
      '真正在动的只有 ' + movingGate.map((g) => g.id).join('、') + '；恒为 0 的 ' + zeroGates.map((g) => g.id).join('、') + '；≥99% 的 ' + flatGates.length + ' 道',
      '得分分布 ' + distRows.map((r) => r.score + ' 分 ' + r.n + ' 味').join(' · ') + '，合计 ' + distTotal + ' 味',
      '恒等式：' + identity + '/' + distTotal + ' 味的得分等于「3 加炮制闸」；例外 ' + exceptions + ' 味',
      '剂量窄带：相邻五档合计 ' + narrow + ' 味 = ' + narrowRate + '%；最低档的 ' + topN + ' 味全是有毒或贵重药',
      '十八反十九畏 ' + pairN + ' 对，两味都在选载内 ' + bothIn + ' 对，正文自写不宜同用的只有 ' + written + ' 处',
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
