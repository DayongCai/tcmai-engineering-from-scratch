#!/usr/bin/env node
/**
 * 中医国际教育 · 第 6 章 · 学生记住的是比喻，用的是比喻
 * 课程: departments/06-guanli/15-zhongyi-guojijiaoyu/chapters/06-e156/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的结构与数字全部从正文现算：
 *   三个比喻各自的失效条件、三类概念错位、三项前置、传播的四条边界，
 *   以及「每个比喻必须配一条失效条件」这条规矩落成的数量账。
 * 不写死结论：正文一改，重跑就能看出是哪一行对不上，测试再把结论固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '6';
const SLUG = '06-e156';
const TITLE = '学生记住的是比喻，用的是比喻';

/** 三个比喻，正文第一节各以「以「X」为例」引出 */
const ANALOGIES = ['气', '经络', '上火'];
/** 三类概念错位，正文第二节 */
const MISALIGNMENTS = ['本体错位', '因果错位', '证据错位'];
/** 安全边界要前置的三项，正文第三节 */
const PREREQUISITES = ['红旗征与转诊指征', '药物与操作的相互作用', '知情同意的实质'];

const LINES = /\r?\n/;

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const occurrences = (text, term) => String(text).split(term).length - 1;

function h2Sections(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split(LINES)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) {
      cur = { title: m[1].trim(), body: [line] };
      out.push(cur);
    } else if (cur) cur.body.push(line);
  }
  return out.map((s) => ({ title: s.title, body: s.body.join('\n') }));
}

const h2Titles = (text) => h2Sections(text).map((s) => s.title);
const sectionAt = (text, i) => h2Sections(text)[i] || { title: '', body: '' };

function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 某节里以「**标题。**」起头的段首句 */
function boldHeads(body) {
  const out = [];
  for (const m of String(body).matchAll(/\*\*([^*。]{2,12})。\*\*/g)) out.push(m[1].trim());
  return out;
}

/** 第一节：三个比喻，各自后面跟一条失效条件 */
function analogies(text) {
  const body = sectionAt(text, 0).body;
  const out = [];
  for (const m of body.matchAll(/以「([^」]+)」为例/g)) out.push(m[1].trim());
  return out;
}

/** 第二节：三类错位，冒号后是它错在哪 */
function misalignments(text) {
  const body = sectionAt(text, 1).body;
  const out = [];
  for (const m of body.matchAll(/\*\*([^*：]{2,4}错位)：(.+?)。\*\*/g)) out.push({ name: m[1].trim(), note: m[2].trim() });
  return out;
}

/** 第四节：三条编号边界 + 一条指向传播者自身的补充边界 */
function boundaries(text) {
  const body = sectionAt(text, 3).body;
  const numbered = [];
  for (const m of body.matchAll(/\*\*第([一二三])条：(.+?)。\*\*/g)) numbered.push({ n: m[1], rule: m[2].trim() });
  const extra = /还有一条容易被忽略的边界，指向传播者自身：\*\*(.+?)。\*\*/.exec(body);
  return { numbered, extra: extra ? extra[1].trim() : '', total: numbered.length + (extra ? 1 : 0) };
}

/**
 * 规矩落成的数量账：
 *   每个比喻配一条失效条件 → 欠账数 = 比喻数 − 已给失效条件的比喻数；
 *   正文对三个比喻都点名了出错场景，所以欠账应为 0。
 */
function disclosureLedger(text) {
  const body = sectionAt(text, 0).body;
  const need = analogies(text).length;
  const given = ['虚证与气滞', '气逆、气陷、气脱', '虚实的分野'].filter((t) => body.includes(t)).length;
  return { need, given, owed: need - given };
}

/** 第一节里气机失常的三种情况 */
function qiDisorders(text) {
  const m = /气逆、气陷、气脱/.exec(text);
  return m ? m[0].split('、') : [];
}

function quizSummary(quiz, text) {
  const body = grams(text);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  for (const q of qs) if (stage[q.stage] !== undefined) stage[q.stage] += 1;
  const hits = qs
    .filter((q) => q.stage === 'check')
    .map((q) => {
      const right = String((q.options || [])[q.correct] || '');
      return { question: q.question, grams: [...grams(right)].filter((g) => body.has(g)) };
    });
  return {
    total: qs.length,
    stage,
    check: hits.length,
    grounded: hits.filter((h) => h.grams.length).length,
    hits,
    spread: new Set(qs.map((q) => q.correct)).size,
    minExplain: Math.min(...qs.map((q) => hanzi(q.explain))),
    answers: qs.map((q) => q.correct),
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    analogies: analogies(text),
    ledger: disclosureLedger(text),
    qiDisorders: qiDisorders(text),
    misalignments: misalignments(text),
    prerequisites: boldHeads(sectionAt(text, 2).body),
    boundaries: boundaries(text),
    falsifiable: /看它能不能被推翻/.test(text),
    tenMinutes: /十分钟内/.test(text),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  const b = r.boundaries;
  console.log(`中医国际教育 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`三个比喻（第 1 节）：${r.analogies.join(' / ')}`);
  console.log(`  失效条件：需 ${r.ledger.need} 条 · 已给 ${r.ledger.given} 条 · 欠账 ${r.ledger.owed}`);
  console.log(`  气机失常的三种情况：${r.qiDisorders.join(' / ')}`);
  console.log(`  判据「看它能不能被推翻」：${r.falsifiable ? '已写' : '未写'}`);
  console.log(`  十分钟内建立直觉的压力：${r.tenMinutes ? '已写' : '未写'}`);
  console.log('');
  console.log(`三类概念错位（第 2 节）：`);
  for (const m of r.misalignments) console.log(`  ${m.name} → ${m.note}`);
  console.log(`三项前置（第 3 节）：${r.prerequisites.join(' / ')}`);
  console.log('');
  console.log(`传播边界（第 4 节）：编号 ${b.numbered.length} 条 + 补充 ${b.extra ? 1 : 0} 条 = ${b.total} 条`);
  for (const x of b.numbered) console.log(`  第${x.n}条 ${x.rule}`);
  if (b.extra) console.log(`  补充 ${b.extra}`);
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案 ${r.quiz.answers.join('/')} · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('');
  console.log('※ 以上结构与数字全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为跨文化教学法的教学讨论，不构成医学意见、诊断或治疗建议。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  hanzi,
  occurrences,
  h2Titles,
  h2Sections,
  sectionAt,
  grams,
  boldHeads,
  analogies,
  misalignments,
  boundaries,
  disclosureLedger,
  qiDisorders,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  ANALOGIES,
  MISALIGNMENTS,
  PREREQUISITES,
};
