#!/usr/bin/env node
/**
 * 脊柱病学 · 第 7 章 · 侧弯不是姿势问题：谁在长，谁在弯，谁在代偿
 * 课程: departments/04-gushang/10-jizhu-bing-xue/chapters/07-cewan/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、每节探针词、关键判据词频，
 *   四类侧弯、特发性的三个年龄段、Risser 分级档数、
 *   Cobb 角的测量波动阈值、前屈试验的三条家长观察、治疗三个台阶，
 *   以及 quiz 的 check 题接地情况。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '7';
const SLUG = '07-cewan';
const TITLE = '侧弯不是姿势问题：谁在长，谁在弯，谁在代偿';

/** 关键判据词：本章反复使用的说法，是正文与习题同源的最小证据 */
const TERMS = [
  '剃刀背',
  '生长潜能',
  'Risser',
  'Cobb',
  '矢状面',
  '特发性',
  '依从性',
  '肩胛骨',
];

/** 每节一个探针词：第 i 个必须落在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '先天性侧弯',
  'Risser 征',
  '剃刀背',
  '矢状面',
  '三个台阶',
  '是最危险的安慰',
];

/** 家长的三条观察（正文第三节） */
const PARENT_CHECKS = ['两肩是否等高', '两侧肩胛骨是否对称', '弯腰时背部是否一侧高'];

/** 特发性的三个年龄段（正文第一节） */
const IDIOPATHIC_AGES = ['婴儿型', '幼儿型', '青少年型'];

const readDoc = () => fs.readFileSync(DOC, 'utf8');

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function h2Titles(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) out.push(m[1].trim());
  }
  return out;
}

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

function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 加粗小标题（去掉句末句号） */
function boldTitles(body) {
  return [...String(body).matchAll(/\*\*([^*]{2,14})。\*\*/g)].map((m) => m[1].trim());
}

/** 四类侧弯：正文第一节 */
const curveTypes = (text) => boldTitles(sectionAt(text, 0));

/** 治疗三个台阶：正文第五节 */
const treatmentStairs = (text) => boldTitles(sectionAt(text, 4));

/** Risser 征的档数：正文写「从 0 到 5 级」 */
function risserLevels(text) {
  const m = /从\s*(\d)\s*到\s*(\d)\s*级/.exec(text);
  return m ? Number(m[2]) - Number(m[1]) + 1 : 0;
}

/** Cobb 角的测量波动阈值：正文「小于五度的变化」 */
function cobbTolerance(text) {
  const m = /小于([一二三四五六七八九十])度的变化视为测量波动/.exec(text);
  const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  return m ? map[m[1]] : 0;
}

/** 特发性侧弯的年龄段与占比 */
function idiopathic(text) {
  return {
    ages: IDIOPATHIC_AGES.filter((a) => text.includes(a)),
    share: /占青少年侧弯的(.{2,6}?)以上/.exec(text),
  };
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
  };
}

function chapterFacts() {
  const text = readDoc();
  return {
    types: curveTypes(text),
    stairs: treatmentStairs(text),
    risser: risserLevels(text),
    tolerance: cobbTolerance(text),
    parentChecks: PARENT_CHECKS.filter((k) => text.includes(k)),
    idiopathic: idiopathic(text),
    followByGrowth: text.includes('观察的间隔按生长速度定'),
    braceNotCorrect: text.includes('不能把弯曲「矫正回去」'),
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    terms: TERMS.map((t) => ({ term: t, count: occurrences(text, t) })),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).includes(p) })),
    quiz: quizSummary(quiz, text),
    facts: chapterFacts(),
  };
}

function main() {
  const r = analyze();
  const f = r.facts;
  console.log(`脊柱病学 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`侧弯 ${f.types.length} 类：${f.types.join(' · ')}`);
  console.log(
    `特发性 ${f.idiopathic.ages.length} 个年龄段：${f.idiopathic.ages.join(' · ')}` +
      ` · 占比「${f.idiopathic.share ? f.idiopathic.share[1].trim() + '以上' : '未写'}」`
  );
  console.log(`Risser ${f.risser} 档（0 至 ${f.risser - 1} 级） · Cobb 测量波动 ±${f.tolerance} 度`);
  console.log(`家长观察 ${f.parentChecks.length}/3：${f.parentChecks.join(' · ')}`);
  console.log(`治疗 ${f.stairs.length} 个台阶：${f.stairs.join(' → ')}`);
  console.log(
    `随访按生长速度：${f.followByGrowth ? '✓' : '✗'} · 支具写明不能矫正回去：${f.braceNotCorrect ? '✓' : '✗'}`
  );
  console.log('');
  console.log('关键判据（出现次数）：');
  console.log('  ' + r.terms.map((x) => `${x.term} ${x.count}`).join(' · '));
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）` +
      ` · check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`
  );
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成诊疗建议、诊断或治疗指导。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Titles,
  h2Sections,
  sectionAt,
  occurrences,
  grams,
  boldTitles,
  curveTypes,
  treatmentStairs,
  risserLevels,
  cobbTolerance,
  idiopathic,
  quizSummary,
  chapterFacts,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  PARENT_CHECKS,
  IDIOPATHIC_AGES,
};
