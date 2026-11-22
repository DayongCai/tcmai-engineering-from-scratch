'use strict';
/**
 * 公共管理学 · 第 17 章 比较不是找最好的制度，是找条件的对应关系
 *
 *   node code/main.js
 *
 * 正文：chapters/17-g17/docs/zh.md
 * 习题：chapters/17-g17/quiz.json
 *
 * 本章的每个判断都从正文现算，不手抄结论：
 *   · 结构：小节数、汉字数、表格行数、引书条目
 *   · 判据：一组关键术语在正文里的出现次数
 *   · 骨架：几组并列项是否真的在正文里立住
 *   · 习题：题量、三段分布、解释长度、check 题能否在正文找到原词
 * 正文一改，重跑就知道是哪一条对不上。
 */

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const CHAPTER = 17;
const SLUG = '17-g17';
const TITLE = '比较不是找最好的制度，是找条件的对应关系';

/** 本章的判据术语：正文靠它们把结论立住，代码只数它们在不在、够不够 */
const TERMS = [
  ['指标直译', '把别国的指标名当成自己的用'],
  ['制度移植', '把机构整体搬到另一个制度环境'],
  ['时序错位', '拿完成态与进行态比较'],
  ['制度互补性', '零件之间的配合关系'],
  ['可迁移性', '五道问题都过了才谈借鉴']
];

/** 本章的骨架：几组并列项必须齐全，缺一项说明正文这一节没写完 */
const GROUPS = [
  { label: '比较三种错误', all: ['指标直译', '制度移植', '时序错位'] },
  { label: '三种体制类型', all: ['官僚制', '新公共管理', '新公共治理'] },
  { label: '改革三条主线', all: ['市场化', '分权', '数字化'] },
  { label: '卫生体制四坐标', all: ['筹资', '支付', '供给', '监管'] }
];

const HAN = /[\u3400-\u4dbf\u4e00-\u9fff]/;
const chars = (s) => [...String(s || '')];
const hanzi = (s) => chars(s).filter((ch) => HAN.test(ch)).length;
const count = (text, term) => String(text).split(term).length - 1;

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');

/** 「## 」小节标题 */
function sections(doc) {
  return [...String(doc).matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
}

/** 表格：总行数、表数、数据行数（去掉表头与分隔行） */
function tableShape(doc) {
  const lines = String(doc).split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith('|'));
  const seps = lines.filter((l) => /^\|[\s:|-]+\|$/.test(l)).length;
  return { lines: lines.length, tables: seps, rows: lines.length - seps * 2 };
}

/** 正文引到的书名（《》里的条目，去重） */
function books(doc) {
  const out = new Set();
  for (const m of String(doc).matchAll(/《([^》]+)》/g)) out.add(m[1]);
  return [...out];
}

function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function termCounts(doc) {
  return TERMS.map(([term, why]) => ({ term, why, n: count(doc, term) }));
}

function groupCheck(doc) {
  return GROUPS.map((g) => ({ label: g.label, all: g.all, missing: g.all.filter((x) => !String(doc).includes(x)) }));
}

function quizSummary(quiz, doc) {
  const body = grams(doc);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const items = qs.map((q) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    return {
      stage: q.stage,
      options: opts.length,
      correct: q.correct,
      explainHanzi: hanzi(q.explain),
      grounded: [...grams(right)].filter((g) => body.has(g)).length,
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
  };
}

function analyze() {
  const doc = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    doc,
    hanzi: hanzi(doc),
    sections: sections(doc),
    table: tableShape(doc),
    books: books(doc),
    terms: termCounts(doc),
    groups: groupCheck(doc),
    quiz: quizSummary(quiz, doc),
  };
}

function main() {
  const r = analyze();
  console.log(`公共管理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · ${r.sections.length} 节 · 表 ${r.table.rows} 行 · 引书 ${r.books.length} 部`);
  console.log('');
  console.log('小节：');
  for (const s of r.sections) console.log(`  · ${s}`);
  console.log('');
  console.log('判据命中：');
  for (const t of r.terms) console.log(`  ${t.n > 0 ? '✓' : '✗'} ${t.term} ${t.n} 次 — ${t.why}`);
  console.log('');
  console.log('骨架：');
  for (const g of r.groups) {
    console.log(`  ${g.missing.length ? '✗' : '✓'} ${g.label}${g.missing.length ? `（缺 ${g.missing.join('、')}）` : ''}`);
  }
  console.log('');
  console.log(`习题 ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.checkGrounded} 道 · 答案 ${r.quiz.answers.join('/')}`);
  console.log('※ 以上数字全部从本章正文与习题现算，改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成对任何机构、政策或个人的评价。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  sections,
  tableShape,
  books,
  grams,
  hanzi,
  count,
  termCounts,
  groupCheck,
  quizSummary,
  TERMS,
  GROUPS,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
