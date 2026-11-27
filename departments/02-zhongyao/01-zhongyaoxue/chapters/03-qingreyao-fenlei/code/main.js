#!/usr/bin/env node
/**
 * 中药学 · 第 3 章 清热药的分节依据在功效首词，四气在这里只剩一个值
 *
 *   node code/main.js
 *
 * 正文：chapters/03-qingreyao-fenlei/docs/zh.md
 * 习题：chapters/03-qingreyao-fenlei/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz，不读任何底本或标准表：正文改了，这里的数字跟着变。
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 本章算术：逐节累加味数、字数与三栏覆盖，再与功效首词命中、五味归经计数对账
 *   · quiz：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 3;
const SLUG = '03-qingreyao-fenlei';
const TITLE = '清热药的分节依据在功效首词，四气在这里只剩一个值';

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
  const sec = tableBy(ts, '占全章字数');
  const hit = tableBy(ts, '命中');
  const dose = tableBy(ts, '上界');
  if (!sec || !hit || !dose) throw new Error('正文的逐节体量／功效首词／剂量档三张表有缺');

  const per = (re, s) => Number((String(s).match(re) || [])[1]);
  const f = (re) => per(re, doc);

  // 逐节体量：去「合计」行后逐列累加
  const numOf = (v) => Number(String(v).replace(/[,，\s]/g, '')) || 0;
  const body = sec.rows.filter((r) => !String(r[0]).includes('合计'));
  const n = body.reduce((s, r) => s + numOf(r[1]), 0);
  const chantotal = body.reduce((s, r) => s + numOf(r[2]), 0);
  const share = body.reduce((s, r) => s + numOf(String(r[3]).replace('%', '')), 0);
  const gasFilled = body.reduce((s, r) => s + numOf(r[4]), 0);
  const tasteFilled = body.reduce((s, r) => s + numOf(r[5]), 0);
  const merFilled = body.reduce((s, r) => s + numOf(r[6]), 0);
  const rowsInDoc = sec.rows.length - 1;

  // 功效首词命中
  const hitSum = hit.rows.reduce((s, r) => s + numOf(r[1]), 0);
  const hitTotal = hit.rows.reduce((s, r) => s + numOf(r[2]), 0);
  const exceptions = hit.rows
    .flatMap((r) => String(r[3]).trim().split(/[；;]/))
    .map((s) => s.trim().split(/[：:]/)[0])
    .filter((s) => s && s !== '—');

  // 四气：已填数 + 唯一值
  const gasLabel = String((doc.match(/气已填\s*\d+\s*味，值只有一个：([^\n。]+)/) || [])[1] || '').trim();

  // 五味与归经的标签总数从正文计数句里取，不手打
  const tasteLabels = f(/味已填\s*\d+\s*味，共\s*(\d+)\s*个标签/);
  const bitter = f(/苦\s*(\d+)、甘/);
  const merLabels = f(/归经填了\s*\d+\s*味、共\s*(\d+)\s*个标签/);
  const liver = f(/肝\s*(\d+)、胃/);

  // 脾胃禁忌与配伍禁忌
  const tabooBase = f(/(\d+)\s*味里有\s*\d+\s*味的使用注意/);
  const taboo = f(/味里有\s*(\d+)\s*味的使用注意/);
  const incompat = f(/(\d+)\s*味注明「反藜芦」/);
  const pregnant = f(/(\d+)\s*味注明孕妇慎用或忌用/);

  // 剂量跨度：按上界算
  const dm = doc.match(/上界从\s*([\d.]+)–([\d.]+)g\s*到\s*([\d.]+)–([\d.]+)g/);
  const lowUpper = Number(dm[2]);
  const highUpper = Number(dm[4]);

  return {
    rowsInDoc,
    n,
    chantotal,
    share: Number(share.toFixed(1)),
    gasFilled,
    tasteFilled,
    merFilled,
    hitSum,
    hitTotal,
    hitRate: Number(((hitSum / hitTotal) * 100).toFixed(1)),
    exceptionCount: exceptions.length,
    exceptionNames: exceptions.join('／'),
    gasLabel,
    tasteLabels,
    bitter,
    bitterShare: Number(((bitter / tasteFilled) * 100).toFixed(1)),
    merLabels,
    liver,
    liverShare: Number(((liver / merFilled) * 100).toFixed(1)),
    tabooBase,
    taboo,
    tabooRate: Number(((taboo / tabooBase) * 100).toFixed(1)),
    incompat,
    pregnant,
    lowUpper,
    highUpper,
    doseSpan: highUpper / lowUpper,
    lines: [
      `逐节表 ${rowsInDoc} 节 + 合计：味数 ${n}、汉字 ${chantotal.toLocaleString('en-US')}，各节占比合计 ${share.toFixed(1)}%`,
      `三栏覆盖：气 ${gasFilled} / 味 ${tasteFilled} / 归经 ${merFilled}，分母都是 ${n} 味`,
      `气值集合 = {${gasLabel}}，${gasFilled} 味共一个值 → 这一维的距离恒为零`,
      `功效首词命中 ${hitSum}/${hitTotal} = ${(hitSum / hitTotal * 100).toFixed(1)}%；例外 ${exceptions.length} 味（${exceptions.join('／')}）`,
      `味标签 ${tasteLabels} 个，其中苦 ${bitter} 个 = 已填药的 ${(bitter / tasteFilled * 100).toFixed(1)}%；归经标签 ${merLabels} 条，其中肝 ${liver} 条 = 已填药的 ${(liver / merFilled * 100).toFixed(1)}%`,
      `脾胃虚寒类注意事项 ${taboo}/${tabooBase} = ${(taboo / tabooBase * 100).toFixed(1)}%；反藜芦 ${incompat} 味、孕妇慎忌 ${pregnant} 味`,
      `剂量上界的跨度 ${highUpper / lowUpper} 倍（两端都按上界算）`,
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
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
