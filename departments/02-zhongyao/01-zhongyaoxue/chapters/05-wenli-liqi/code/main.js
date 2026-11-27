#!/usr/bin/env node
/**
 * 中药学 · 第 5 章 温里往下走、理气横着走，十九条记录里有一条自相矛盾
 *
 *   node code/main.js
 *
 * 正文：chapters/05-wenli-liqi/docs/zh.md
 * 习题：chapters/05-wenli-liqi/quiz.json
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

const CHAPTER = 5;
const SLUG = '05-wenli-liqi';
const TITLE = '温里往下走、理气横着走，十九条记录里有一条自相矛盾';

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
  const cover = tableBy(ts, '15.1 温里');
  const mer = tableBy(ts, '读法');
  const use = tableBy(ts, '用法要点');
  if (!cover || !mer || !use) throw new Error('正文的覆盖表／归经表／用法表有缺');

  const per = (re, s) => Number((String(s).match(re) || [])[1]);
  const f = (re) => per(re, doc);
  const row = (k) => cover.rows.find((r) => String(r[0]).startsWith(k));

  // 两节味数取自表头
  const coldN = per(/（(\d+)\s*味）/, cover.header[1]);
  const heatN = per(/（(\d+)\s*味）/, cover.header[2]);
  const total = coldN + heatN;

  const gas = row('四气已填');
  const taste = row('五味已填');
  const merid = row('归经已填');
  const toxic = row('标毒');
  const blank = row('性味整栏空白');

  const gasColdFill = per(/^(\d+)/, gas[1]);
  const gasHeatFill = per(/^(\d+)/, gas[2]);
  const hotCold = per(/热\s*(\d+)/, gas[1]);
  const warmCold = per(/温\s*(\d+)/, gas[1]);
  const coldCold = per(/寒\s*(\d+)/, gas[1]);
  const warmHeat = per(/温\s*(\d+)/, gas[2]);
  const flatHeat = per(/平\s*(\d+)/, gas[2]);
  const coldHeat = per(/寒\s*(\d+)/, gas[2]);
  const heatTiers = ['温', '平', '寒'].filter((k) => new RegExp(k + '\\s*\\d+').test(gas[2])).length;

  const xinCold = per(/辛\s*(\d+)/, taste[1]);
  const xinHeat = per(/辛\s*(\d+)/, taste[2]);
  const meridColdFill = per(/^(\d+)/, merid[1]);
  const meridHeatFill = per(/^(\d+)/, merid[2]);
  const toxicN = per(/^(\d+)/, toxic[3]) || nums(toxic[1]).reduce((a, b) => a + b, 0) + nums(toxic[2]).reduce((a, b) => a + b, 0);
  const blankN = per(/^(\d+)/, blank[3]) || nums(blank[1])[0] + nums(blank[2])[0];

  // 归经表：温里独有的竖线与理气独有的旁支
  const merRow = (k) => mer.rows.find((r) => String(r[0]).startsWith(k));
  const kidney = merRow('肾');
  const heart = merRow('心');
  const spleen = merRow('脾');
  const colon = merRow('大肠');
  const branch = merRow('三焦');
  const vertical = Number(kidney[1]) + Number(heart[1]);
  const horizontal = Number(colon[2]) + nums(branch[2]).reduce((a, b) => a + b, 0);
  const spleenBoth = Number(spleen[1]) === Number(spleen[2]) && Number(spleen[1]) === meridColdFill;

  // 用法表：剂量上界跨度
  const uppers = use.rows.map((r) => { const n = nums(r[1]); return n[n.length - 1]; });
  const doseMax = Math.max(...uppers);
  const doseMin = Math.min(...uppers);

  // 两节字数相加应与正文的合计一致
  const wCold = numOf((doc.match(/15\.1 温里药\s*\d+\s*味\s*([\d,]+)\s*字/) || [])[1]);
  const wHeat = numOf((doc.match(/16\.1 理气药\s*\d+\s*味\s*([\d,]+)\s*字/) || [])[1]);
  const wordSum = wCold + wHeat;
  const wordClaim = numOf((doc.match(/合计\s*\d+\s*味、([\d,]+)\s*汉字/) || [])[1]);
  const liqiMeridians = f(/已填药一共落在\s*(\d+)\s*条经上/);
  const gasCoverage = ((gasColdFill + gasHeatFill) / total) * 100;
  const merCoverage = ((meridColdFill + meridHeatFill) / total) * 100;

  return {
    coldN,
    heatN,
    total,
    gasColdFill,
    gasHeatFill,
    gasCoverage: Number(gasCoverage.toFixed(1)),
    hotCold,
    warmCold,
    coldCold,
    warmHeat,
    flatHeat,
    coldHeat,
    heatTiers,
    xinCold,
    xinHeat,
    meridColdFill,
    meridHeatFill,
    merCoverage: Number(merCoverage.toFixed(1)),
    toxicN,
    blankN,
    blankRate: Number(((blankN / total) * 100).toFixed(1)),
    vertical,
    horizontal,
    spleenBoth,
    doseMin,
    doseMax,
    doseSpan: doseMax / doseMin,
    wCold,
    wHeat,
    wordSum,
    wordClaim,
    wordMatch: wordSum === wordClaim,
    liqiMeridians,
    lines: [
      '两节 ' + coldN + ' 味 + ' + heatN + ' 味 = ' + total + ' 味；四气填 ' + gasColdFill + ' + ' + gasHeatFill + ' = ' + (gasColdFill + gasHeatFill) + '（' + gasCoverage.toFixed(1) + '%），归经填 ' + (meridColdFill + meridHeatFill) + '（' + merCoverage.toFixed(1) + '%）',
      '温里：热 ' + hotCold + '、温 ' + warmCold + '、寒 ' + coldCold + '；理气：温 ' + warmHeat + '、平 ' + flatHeat + '、寒 ' + coldHeat + ' —— 理气横跨 ' + heatTiers + ' 档',
      '五味：辛在温里 ' + xinCold + '/' + gasColdFill + '，在理气 ' + xinHeat + '/' + gasHeatFill + '；两边都过半，共性不能当分界',
      '归经：温里独有竖线 肾＋心 = ' + vertical + ' 条；理气独有旁支 大肠＋三焦胆膀胱小肠 = ' + horizontal + ' 条；脾在两节' + (spleenBoth ? '同满（各 ' + Number(spleen[1]) + ' 条）' : '不对称'),
      '理气已填 ' + meridHeatFill + ' 味落在 ' + liqiMeridians + ' 条经上 —— 没有主经，只有分布',
      '标毒 ' + toxicN + '/' + total + '；性味整栏空白 ' + blankN + '/' + total + ' = ' + ((blankN / total) * 100).toFixed(1) + '%（补值会把覆盖率顶到 100%，但那几条没有观测）',
      '用法表 ' + use.rows.length + ' 味，剂量上界的跨度 ' + (doseMax / doseMin) + ' 倍',
      '两节字数 ' + wCold.toLocaleString('en-US') + ' + ' + wHeat.toLocaleString('en-US') + ' = ' + wordSum.toLocaleString('en-US') + '，与正文合计 ' + (wordClaim || '—').toLocaleString('en-US') + (wordSum === wordClaim ? ' 相符' : ' 不符'),
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
