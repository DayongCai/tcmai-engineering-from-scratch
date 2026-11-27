#!/usr/bin/env node
/**
 * 中药学 · 第 4 章 泻下与祛湿共用「出口」二字，剂量却差六百倍
 *
 *   node code/main.js
 *
 * 正文：chapters/04-xiexia-qushi/docs/zh.md
 * 习题：chapters/04-xiexia-qushi/quiz.json
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

const CHAPTER = 4;
const SLUG = '04-xiexia-qushi';
const TITLE = '泻下与祛湿共用「出口」二字，剂量却差六百倍';

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
  const sec = tableBy(ts, '占 45 味字数');
  const exit = tableBy(ts, '作用方式');
  const dose = tableBy(ts, '剂量区间');
  const naming = tableBy(ts, '命名类型');
  if (!sec || !exit || !dose || !naming) throw new Error('正文的节表／出口表／剂量表／命名表有缺');

  const per = (re, s) => Number((String(s).match(re) || [])[1]);

  // 十节体量：只取节号为 x.y 的行，合计行不重复计入
  const secRows = sec.rows.filter((r) => /^\d+\.\d+/.test(String(r[1])));
  const sum = (k) => secRows.reduce((s, r) => s + numOf(r[k]), 0);
  const herbs = sum(2);
  const chantotal = sum(3);
  const share = sum(4);
  const gasFilled = sum(5);
  const toxic = sum(6);
  const zeroToxic = secRows.filter((r) => numOf(r[6]) === 0);
  const fullToxic = secRows.filter((r) => numOf(r[6]) > 0 && numOf(r[6]) === numOf(r[2]));

  // 出口：三条通道，前阴那一行是两条经相加
  const exits = exit.rows.length;
  const frontRow = exit.rows.find((r) => String(r[0]).includes('前阴'));
  const frontBack = nums(frontRow[2]).reduce((a, b) => a + b, 0);

  // 剂量档：逐条抽出「药名 低–高」，再取极值
  const pairs = [];
  for (const r of dose.rows) {
    const re = /([\u4e00-\u9fff]{2,5})\s*([\d.]+)\s*[–-]\s*([\d.]+)/g;
    let mm;
    while ((mm = re.exec(String(r[2])))) pairs.push({ name: mm[1], low: Number(mm[2]), high: Number(mm[3]) });
  }
  const maxHigh = Math.max(...pairs.map((p) => p.high));
  const minHigh = Math.min(...pairs.map((p) => p.high));
  const minLow = Math.min(...pairs.map((p) => p.low));
  const ratioHigh = Math.round(maxHigh / minHigh);
  const ratioLow = Math.round(maxHigh / minLow);

  // 节名两套命名法：纯动作／动作＋病邪／动作＋结果
  const types = naming.rows.map((r) => String(r[1]));
  const actionOnly = types.filter((t) => t === '动作').length;
  const withCause = types.filter((t) => t.includes('病邪')).length;
  const withResult = types.filter((t) => t.includes('结果')).length;
  const zeroHits = naming.rows.reduce((s, r) => s + count(String(r[2]), '0/'), 0);

  const merLabels = per(/共\s*(\d+)\s*个标签：脾\s*\d+/, doc);
  const spleen = per(/共\s*\d+\s*个标签：脾\s*(\d+)/, doc);
  const toxicRate = (toxic / herbs) * 100;

  return {
    sectionCount: secRows.length,
    herbs,
    chantotal,
    share,
    gasFilled,
    toxic,
    toxicRate: Number(toxicRate.toFixed(1)),
    zeroToxic: zeroToxic.length,
    fullToxicNames: fullToxic.map((r) => r[1]),
    exits,
    frontBack,
    doseRows: pairs.length,
    maxHigh,
    minHigh,
    minLow,
    ratioHigh,
    ratioLow,
    actionOnly,
    withCause,
    withResult,
    zeroHits,
    merLabels,
    spleen,
    lines: [
      '节表 ' + secRows.length + ' 节：味数 ' + herbs + '、汉字 ' + chantotal.toLocaleString('en-US') + '，各节占比合计 ' + share + '%',
      '已填气 ' + gasFilled + '/' + herbs + '，标毒 ' + toxic + '/' + herbs + ' = ' + toxicRate.toFixed(1) + '%；零标毒节 ' + zeroToxic.length + ' 个，满格节 ' + fullToxic.map((r) => r[1]).join('／'),
      '出口 ' + exits + ' 条；前阴一行是膀胱与小肠两条经相加，合计 ' + frontBack + ' 个标签',
      '剂量表 ' + pairs.length + ' 味入档：按上界比 ' + ratioHigh + ' 倍，最高上界对最低下界 ' + ratioLow + ' 倍',
      '节名 ' + types.length + ' 条：纯动作 ' + actionOnly + '、动作＋病邪 ' + withCause + '、动作＋结果 ' + withResult + '；结果词与「寒」「热」在功效首词里 0 命中 ' + zeroHits + ' 处',
      '归经标签 ' + merLabels + ' 个，其中脾 ' + spleen + ' 个 —— 湿邪的根在中焦，四组都在用这条经',
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
