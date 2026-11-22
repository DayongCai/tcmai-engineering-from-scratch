'use strict';
/**
 * 公共管理学 · 第 8 章 预算是用数字写成的政策
 *
 *   node code/main.js
 *
 * 正文：chapters/08-g8/docs/zh.md
 * 习题：chapters/08-g8/quiz.json
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
const CHAPTER = 8;
const SLUG = '08-g8';
const TITLE = '预算是用数字写成的政策';

/** 本章的判据术语：正文靠它们把结论立住，代码只数它们在不在、够不够 */
const TERMS = [
  ['购买性支出', '刚性：人招进来就要发工资'],
  ['转移性支出', '可调但难降'],
  ['基数', '编制阶段的关键博弈'],
  ['专项转移支付', '指定用途，诱导为拿钱而立项'],
  ['三保', '保基本民生、保工资、保运转']
];

/** 本章的骨架：几组并列项必须齐全，缺一项说明正文这一节没写完 */
const GROUPS = [
  { label: '预算四原则', all: ['完整性', '统一性', '年度性', '公开性'] },
  { label: '预算三代', all: ['增量预算', '零基预算', '绩效预算'] },
  { label: '过程四段', all: ['编制', '审批', '执行', '决算'] },
  { label: '三者匹配', all: ['事权', '支出责任', '财权'] }
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
