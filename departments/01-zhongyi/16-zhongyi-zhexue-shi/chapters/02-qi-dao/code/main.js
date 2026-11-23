'use strict';
/**
 * 中医哲学史 · 第 2 章 气是内容，道是形式，两个本体词不能互换
 *
 *   node code/main.js
 *
 * 课程：departments/01-zhongyi/16-zhongyi-zhexue-shi/chapters/02-qi-dao/docs/zh.md
 * 习题：chapters/02-qi-dao/quiz.json
 *
 * 本章的每个数字都从正文与习题现算，不手抄结论：
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
const CHAPTER = 2;
const SLUG = "02-qi-dao";
const TITLE = "气与道：本体论的两个词";

/** 本章的判据术语：正文靠它们把结论立住，代码只数它们在不在、够不够 */
const TERMS = [
  ["质料", "气回答「由什么构成」"],
  ["动力", "气回答「靠什么动」：升降出入"],
  ["中介", "气回答「通过什么连起来」"],
  ["气虚", "重心在料不足，动作是补"],
  ["气滞", "重心在动受阻，动作是行"],
  ["气逆", "重心在方向反了，动作是降"],
  ["气陷", "重心在方向塌了，动作是升"],
  ["以补代治", "凡见气字皆言补"],
  ["以道代气", "用一句本体论话代替具体判断"],
  ["以气代道", "把次序问题还原成料不足"],
];

/** 本章的骨架：几组并列项必须齐全，缺一项说明正文这一节没写完 */
const GROUPS = [
  { label: "气的三义", all: ["质料", "动力", "中介"] },
  { label: "四个气字与四个动词", all: ["气虚", "气滞", "气逆", "气陷"] },
  { label: "三种误用", all: ["以补代治", "以道代气", "以气代道"] },
  { label: "四组判断依据", all: ["声低", "痛而拒按", "咳逆", "脱垂"] },
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
  return GROUPS.map((g) => ({
    label: g.label,
    all: g.all,
    missing: g.all.filter((x) => !String(doc).includes(x)),
  }));
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
    badCorrect: items.filter((x) => !(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4))
      .length,
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
  console.log(`中医哲学史 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log(
    `正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · ${r.sections.length} 节 · 表 ${r.table.rows} 行 · 引书 ${r.books.length} 部`
  );
  console.log('');
  console.log('小节：');
  for (const s of r.sections) console.log(`  · ${s}`);
  console.log('');
  console.log('判据命中：');
  for (const t of r.terms) console.log(`  ${t.n > 0 ? '✓' : '✗'} ${t.term} ${t.n} 次 — ${t.why}`);
  console.log('');
  console.log('骨架：');
  for (const g of r.groups) {
    console.log(
      `  ${g.missing.length ? '✗' : '✓'} ${g.label}${g.missing.length ? `（缺 ${g.missing.join('、')}）` : ''}`
    );
  }
  console.log('');
  console.log(
    `习题 ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.checkGrounded} 道 · 答案 ${r.quiz.answers.join('/')}`
  );
  console.log('※ 以上数字全部从本章正文与习题现算，改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成诊疗建议，也不能替代医师面诊。');
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
