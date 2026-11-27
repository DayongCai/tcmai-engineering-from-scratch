#!/usr/bin/env node
/**
 * 中药学 · 第 1 章 性能五要素是总论的共用语法，不是任何一味药的取值
 *
 *   node code/main.js
 *
 * 正文：chapters/01-xingneng-siqi/docs/zh.md
 * 习题：chapters/01-xingneng-siqi/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz，不读任何底本或标准表：正文改了，这里的数字跟着变。
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 本章算术：从正文三张表里解析栏位、覆盖与标签计数，再算派生量
 *   · quiz：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 * 任何一项对不上，说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 1;
const SLUG = '01-xingneng-siqi';
const TITLE = '性能五要素是总论的共用语法，不是任何一味药的取值';

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
  const cover = tableBy(ts, '底本可填');
  const kinds = tableBy(ts, '数据类型');
  const toxic = tableBy(ts, '标毒');
  if (!cover || !kinds || !toxic) throw new Error('正文的栏位／数据类型／毒性分布三张表有缺');

  // 栏位表：六个采集栏，覆盖 0% 的那一栏
  const slots = cover.rows.length;
  const empty = cover.rows.filter((r) => /^0\s*%$/.test(String(r[3] || '').trim()));
  const meridianFilled = nums(cover.rows.find((r) => r[0] === '归经')[2])[0];

  // 数据类型表：每栏的取值个数与标签总数
  const gasRow = kinds.rows.find((r) => r[0] === '气');
  const tasteRow = kinds.rows.find((r) => r[0] === '味');
  const meridRow = kinds.rows.find((r) => r[0] === '归经');
  const gasBins = Number((String(gasRow[1]).match(/有序\s*(\d+)\s*档/) || [])[1]);
  const distHit = (cell) => nums(String(cell).split(/[，,]/)[0]);
  const gasSum = distHit(gasRow[2]).reduce((a, b) => a + b, 0);
  const tasteLabels = distHit(tasteRow[2]).reduce((a, b) => a + b, 0);
  const tasteKinds = Number((String(tasteRow[1]).match(/名义\s*(\d+)\s*类/) || [])[1]);
  const meridLabels = distHit(meridRow[2]).reduce((a, b) => a + b, 0);
  const meridMean = meridLabels / meridianFilled;

  // 毒性分布表：标毒数 / 味数，逐大类累加
  const toxicSum = toxic.rows.reduce((s, r) => s + (nums(r[1])[0] || 0), 0);
  const herbSum = toxic.rows.reduce((s, r) => s + (nums(r[1])[1] || 0), 0);
  const toxicRate = (toxicSum / herbSum) * 100;
  const cleanClass = toxic.rows.filter((r) => (nums(r[1])[0] || 0) === 0);

  // 「不成立」三条写死在第二节的编号加粗行里
  const hardRules = (doc.match(/^\d+\.\s+\*\*/gm) || []).length;

  // 第六节列出的代价条数
  const tail = doc.slice(doc.indexOf('## 六、'));
  const costLines = (tail.match(/^- \*\*/gm) || []).length;

  return {
    slots,
    emptySlots: empty.length,
    emptyNames: empty.map((r) => r[0]),
    meridianFilled,
    gasBins,
    gasSum,
    tasteKinds,
    tasteLabels,
    meridLabels,
    meridMean: Number(meridMean.toFixed(2)),
    toxicSum,
    herbSum,
    toxicRate: Number(toxicRate.toFixed(1)),
    cleanClass: cleanClass.length,
    cleanName: cleanClass.map((r) => r[0]).join('／'),
    hardRules,
    costLines,
    lines: [
      `采集栏 ${slots} 个，其中覆盖 0% 的 ${empty.length} 个（${empty.map((r) => r[0]).join('／')}），这一栏只能答「底本未设此栏」`,
      `气 ${gasBins} 档，九档计数合计 ${gasSum} 味；味 ${tasteKinds} 类标签合计 ${tasteLabels} 个；归经标签 ${meridLabels} 条 ÷ 已填 ${meridianFilled} 味 = 均值 ${meridMean.toFixed(2)} 条/味`,
      `毒性分布表 ${toxic.rows.length} 个大类，标毒 ${toxicSum} ÷ ${herbSum} 味 = ${toxicRate.toFixed(1)}%；零标毒大类 ${cleanClass.length} 个（${cleanClass.map((r) => r[0]).join('／')}）`,
      `栏位不能混用的硬条件 ${hardRules} 条；第六节列出的代价 ${costLines} 条`,
      `同一个标签算两遍：${toxicSum} 味标毒与 ${gasSum - toxicSum} 味未标，二者相加才是 ${herbSum} 味`,
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
