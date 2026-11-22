#!/usr/bin/env node
/**
 * 医学伦理学 · 第 6 章 · 道歉不是认输：差错的三层结构与披露的制度前提
 * 课程: departments/06-guanli/21-yixue-lunli-xue/chapters/06-z216/docs/zh.md
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、每节探针词的落位、关键判据词的出现次数、
 *   章内枚举骨架（三层结构、差错的两类、披露的四个要素、道歉的两种）的原文字样，
 *   以及 quiz 的 check 题能在正文里对上几个四字原词。
 * 正文或习题一改，重跑即可看出哪里对不上；测试再把这些数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '6';
const SLUG = '06-z216';
const TITLE = '道歉不是认输：差错的三层结构与披露的制度前提';

/** 关键判据词：本章反复使用的术语，是正文与习题同源的最小证据 */
const TERMS = [
  '不良事件',
  '差错',
  '违规',
  '惩罚悖论',
  '第二受害者',
  '披露',
  '无过错补偿',
  '同情表达'
];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '计划差错',
  '惩罚悖论',
  '第二受害者',
  '四个要素',
  '同情表达',
  '不追责会被误解为纵容'
];

/** 章节骨架：每组是一次正文里的枚举，须按原顺序出现 */
const STRUCTURE = [
  { name: '三层结构', must: ['不良事件', '差错', '违规'] },
  { name: '差错的两类', must: ['执行差错', '计划差错'] },
  { name: '披露的四个要素', must: ['发生了什么', '造成了什么后果', '正在采取什么措施', '为什么会发生'] },
  { name: '道歉的两种', must: ['同情表达', '责任承担'] }
];

const GRAM = 4;

const readDoc = () => fs.readFileSync(DOC, 'utf8');
const readQuiz = () => JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function h2Titles(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) out.push(m[1].trim());
  }
  return out;
}

/** 按二级标题切段，返回 [{ title, body }]；body 含标题行本身 */
function h2Sections(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split(/\r?\n/)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) {
      cur = { title: m[1].trim(), body: [line] };
      out.push(cur);
    } else if (cur) cur.body.push(line);
  }
  return out.map((s) => ({ title: s.title, body: s.body.join('\n') }));
}

const sectionAt = (text, i) => (h2Sections(text)[i] || { title: '', body: '' }).body;

const occurrences = (text, term) => String(text).split(term).length - 1;

/** 正文里长度为 n 的连续汉字片段集合 */
function grams(text, n = GRAM) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 这组词里在正文出现过的个数 */
const presentCount = (text, terms) => terms.filter((t) => occurrences(text, t) > 0).length;

/** 逐组核对枚举骨架：每个词组按顺序在正文里找，找不到就记下来 */
function structureHits(text) {
  return STRUCTURE.map((g) => {
    let pos = -1;
    const miss = [];
    for (const m of g.must) {
      const at = text.indexOf(m, pos + 1);
      if (at === -1) miss.push(m);
      else pos = at;
    }
    return { name: g.name, size: g.must.length, ok: miss.length === 0, miss };
  });
}

/**
 * quiz 的结构与接地情况。
 * 接地 = check 题的正确选项里，有一个四字片段真的出现在当章正文。
 */
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
  };
}

function analyze() {
  const text = readDoc();
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    terms: TERMS.map((t) => ({ term: t, count: occurrences(text, t) })),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, section: i + 1, ok: sectionAt(text, i).includes(p) })),
    structure: structureHits(text),
    quiz: quizSummary(readQuiz(), text),
  };
}

function main() {
  const r = analyze();
  console.log(`医学伦理学 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log('关键判据（出现次数）：');
  console.log('  ' + r.terms.map((x) => `${x.term} ${x.count}`).join(' · '));
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log('章节骨架：');
  r.structure.forEach((g) => {
    console.log(`  ${g.ok ? '✓' : '✗'} ${g.name}（${g.size} 项${g.ok ? '' : '，缺 ' + g.miss.join('、')}）`);
  });
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`
  );
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文与 quiz 现算，无手打常数；改正文或习题后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见、法律意见或临床建议。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  readQuiz,
  h2Titles,
  h2Sections,
  sectionAt,
  occurrences,
  grams,
  presentCount,
  structureHits,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  STRUCTURE,
};
