#!/usr/bin/env node
/**
 * 脊柱病学 · 第 10 章 · 把「治好」换成「能过」：脊柱的长期管理
 * 课程: departments/04-gushang/10-jizhu-bing-xue/chapters/10-kangfu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、每节探针词、关键判据词频，
 *   目标三层、运动四类、宣教三件事、生活改造五项、随访四节点、
 *   用来复述功能层的四个具体动作、停止规则，
 *   以及 quiz 的 check 题接地情况。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '10';
const SLUG = '10-kangfu';
const TITLE = '把「治好」换成「能过」：脊柱的长期管理';

/** 关键判据词：本章反复使用的说法，是正文与习题同源的最小证据 */
const TERMS = ['中立区', '方向偏好', '邻近节段', '疼痛神经科学', '停止规则', '宣教', '参与层', '渐进'];

/** 每节一个探针词：第 i 个必须落在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = ['三个层级', '仰卧起坐', '疼痛神经科学教育', '工位', '停止规则', '不是脊柱病的通用目标'];

/** 功能层的四个可复述动作（正文第一、第五节各出现一次） */
const FUNCTION_TASKS = ['坐一小时', '走五百米', '弯腰系鞋带', '提十公斤'];

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
const boldTitles = (body) =>
  [...String(body).matchAll(/\*\*([^*]{2,16})。\*\*/g)].map((m) => m[1].trim());

/** 目标三层：正文第一节 */
const goalLevels = (text) => boldTitles(sectionAt(text, 0));

/** 运动四类：正文第二节的「**一、…**」 */
function exerciseTypes(text) {
  return [...sectionAt(text, 1).matchAll(/\*\*([一二三四])、([^*]+)\*\*/g)].map((m) => ({
    n: m[1],
    name: m[2].replace(/[。\s]+$/, '').trim(),
  }));
}

/** 宣教要改变的三件事：正文第三节的「第一，…」 */
const educationCount = (text) =>
  [...sectionAt(text, 2).matchAll(/^第([一二三])，/gm)].length;

/** 生活与工作改造五项：正文第四节 */
const lifeChanges = (text) => boldTitles(sectionAt(text, 3));

/** 随访四节点：正文第五节「第X个节点在…」 */
function followNodes(text) {
  return [...sectionAt(text, 4).matchAll(/第([一二三四])个节点在([^：]+)：/g)].map((m) => ({
    n: m[1],
    when: m[2].trim(),
  }));
}

/** 功能层的可复述动作：正文里两次写到同一组动作 */
const functionTasks = (text) => FUNCTION_TASKS.filter((k) => text.includes(k));

/** 本章的两句硬话：管理而非根治、停止规则 */
function hardRules(text) {
  return {
    manageNotCure: text.includes('多数脊柱病是「管理」，不是「根治」'),
    stopRule: text.includes('停止规则'),
    notInsteadOfDx: text.includes('不能以康复替代诊断'),
    noDose: text.includes('本章不给组数、次数与负荷'),
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
    goals: goalLevels(text),
    exercise: exerciseTypes(text),
    education: educationCount(text),
    life: lifeChanges(text),
    nodes: followNodes(text),
    tasks: functionTasks(text),
    rules: hardRules(text),
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
  console.log(`目标 ${f.goals.length} 层：${f.goals.join(' · ')}`);
  console.log(`运动 ${f.exercise.length} 类：${f.exercise.map((x) => `${x.n}·${x.name}`).join(' / ')}`);
  console.log(`宣教 ${f.education} 件事 · 生活改造 ${f.life.length} 项：${f.life.join(' · ')}`);
  console.log(`随访 ${f.nodes.length} 节点：${f.nodes.map((x) => `第${x.n}·${x.when}`).join(' / ')}`);
  console.log(`功能可复述动作 ${f.tasks.length} 个：${f.tasks.join(' · ')}`);
  console.log(
    `两句硬话：管理而非根治 ${f.rules.manageNotCure ? '✓' : '✗'} · 停止规则 ${f.rules.stopRule ? '✓' : '✗'}` +
      ` · 不替代诊断 ${f.rules.notInsteadOfDx ? '✓' : '✗'} · 不给剂量 ${f.rules.noDose ? '✓' : '✗'}`
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
  goalLevels,
  exerciseTypes,
  educationCount,
  lifeChanges,
  followNodes,
  functionTasks,
  hardRules,
  quizSummary,
  chapterFacts,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  FUNCTION_TASKS,
};
