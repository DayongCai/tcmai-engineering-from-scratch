#!/usr/bin/env node
/**
 * 中药学 · 第 2 章 解表药两节的分界是四气，不是「辛能散」
 *
 *   node code/main.js
 *
 * 正文：chapters/02-jiebiaoyao-fengh/docs/zh.md
 * 习题：chapters/02-jiebiaoyao-fengh/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz，不读任何底本或标准表：正文改了，这里的数字跟着变。
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 本章算术：从覆盖率表解析两节填齐数、辛的分布与空白味数，再算错分率与覆盖率
 *   · quiz：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 2;
const SLUG = '02-jiebiaoyao-fengh';
const TITLE = '解表药两节的分界是四气，不是「辛能散」';

/* ── 文本口径 ────────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const nums = (s) => (String(s || '').match(/\d+(?:\.\d+)?/g) || []).map(Number);
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
  const cover = tableBy(ts, '9.1 发散风寒');
  const spec = tableBy(ts, '规格与用法');
  const mer = tableBy(ts, '读法');
  if (!cover || !spec || !mer) throw new Error('正文的覆盖率／规格／归经三张表有缺');

  const row = (k) => cover.rows.find((r) => String(r[0]).startsWith(k));
  const gas = row('四气');
  const xin = row('五味');
  const blankRow = row('性味整栏空白');
  const per = (re, s) => Number((String(s).match(re) || [])[1]);

  // 两节味数取自表头：9.1（12 味）、9.2（9 味）
  const coldN = per(/（(\d+)\s*味）/, cover.header[1]);
  const heatN = per(/（(\d+)\s*味）/, cover.header[2]);
  const total = coldN + heatN;

  const coldFill = per(/填\s*(\d+)/, gas[1]);
  const heatFill = per(/填\s*(\d+)/, gas[2]);
  const allFill = per(/填\s*(\d+)\s*\/\s*\d+/, gas[3]);
  const allTotal = per(/填\s*\d+\s*\/\s*(\d+)/, gas[3]);
  const coldWen = per(/温\s*(\d*)/, gas[3]) || coldFill;
  const heatCold = per(/寒\s*(\d+)/, gas[3]);
  const heatCool = per(/凉\s*(\d+)/, gas[3]);

  const xinCold = per(/辛\s*(\d+)/, xin[1]);
  const xinHeat = per(/辛\s*(\d+)/, xin[2]);
  const xinAll = per(/辛\s*(\d+)/, xin[3]);

  const blankCold = per(/^(\d+)/, blankRow[1]);
  const blankHeat = per(/^(\d+)/, blankRow[2]);

  const filled = coldFill + heatFill;
  const coverage = (filled / total) * 100;
  const misread = (xinHeat / filled) * 100;
  // 两节的气值集合是否相交：风寒全温，风热只有寒与凉
  const disjoint = !/寒|凉/.test(gas[1]) && !/温/.test(gas[2]);

  // 剂量表：每行取上界
  const uppers = spec.rows.map((r) => { const n = nums(r[1]); return n[n.length - 1]; });
  const doseMax = Math.max(...uppers);
  const doseMin = Math.min(...uppers);

  // 归经偏向：膀胱偏风寒、肝偏风热，取两侧之差
  const bladder = mer.rows.find((r) => r[0] === '膀胱');
  const liver = mer.rows.find((r) => r[0] === '肝');
  const bladderBias = Number(bladder[1]) - Number(bladder[2]);
  const liverBias = Number(liver[2]) - Number(liver[1]);

  const searchCool = per(/寒凉」这一组只出\s*(\d+)\s*味/, doc);
  const searchWarm = per(/膀胱经\s*\+\s*温」只出\s*(\d+)\s*味/, doc);

  return {
    coldN,
    heatN,
    total,
    coldFill,
    heatFill,
    filled,
    allFill,
    allTotal,
    coldWen,
    heatCold,
    heatCool,
    xinCold,
    xinHeat,
    xinAll,
    blankCold,
    blankHeat,
    blank: blankCold + blankHeat,
    coverage: Number(coverage.toFixed(1)),
    misread: Number(misread.toFixed(1)),
    disjoint,
    doseMax,
    doseMin,
    doseSpan: doseMax / doseMin,
    bladderBias,
    liverBias,
    searchCool,
    searchWarm,
    lines: [
      `两节 ${coldN} 味 + ${heatN} 味 = ${total} 味；性味填齐 ${coldFill} + ${heatFill} = ${filled} 味，覆盖率 ${coverage.toFixed(1)}%`,
      `四气：风寒节 ${coldWen} 味全温；风热节 ${heatFill} 味 = 寒 ${heatCold} + 凉 ${heatCool}；两集合${disjoint ? '不相交，错分 0' : '相交，有错分'}`,
      `五味：辛在风寒节 ${xinCold}/${coldFill}，在风热节 ${xinHeat}/${heatFill}，合计 ${xinAll}/${filled} —— 以辛判定就要错分 ${xinHeat}/${filled} = ${misread.toFixed(1)}%`,
      `性味整栏空白 ${blankCold} + ${blankHeat} = ${blankCold + blankHeat} 味，占全章 ${((blankCold + blankHeat) / total * 100).toFixed(1)}%`,
      `规格表 ${spec.rows.length} 味，剂量上界的跨度 ${doseMax / doseMin} 倍`,
      `归经偏向：膀胱经偏风寒 ${bladderBias} 条，肝经偏风热 ${liverBias} 条；检索项「肝经 + 寒凉」出 ${searchCool} 味、「膀胱经 + 温」出 ${searchWarm} 味`,
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
  const a = r.arith;
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
  for (const line of a.lines) console.log(`  ${line}`);
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
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
