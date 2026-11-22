#!/usr/bin/env node
/**
 * 脊柱病学 · 第 9 章 · 手法与手术之间，隔着的不是勇气，是判据
 * 课程: departments/04-gushang/10-jizhu-bing-xue/chapters/09-shoufa-shoushu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、每节探针词、关键判据词频，
 *   手法禁忌五条、操作前的五问、能改变与不能改变两栏、
 *   手术六条硬线、「足疗程」的三种含义、术后三件事，
 *   以及 quiz 的 check 题接地情况。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '9';
const SLUG = '09-shoufa-shoushu';
const TITLE = '手法与手术之间，隔着的不是勇气，是判据';

/** 关键判据词：本章反复使用的说法，是正文与习题同源的最小证据 */
const TERMS = ['马尾综合征', '椎动脉夹层', '空化', '足疗程', '邻近节段', '中枢敏化', '共享决策', '抗凝'];

/** 每节一个探针词：第 i 个必须落在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = ['脊髓型颈椎病', '结构事实', '六条', '邻近节段', '共享决策', '不是疗效指标'];

/** 「足疗程」的三种含义：神经根性、狭窄、脊髓型 */
const COURSE_MEANINGS = ['神经根性疼痛', '椎管狭窄', '脊髓型颈椎病'];

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

function lineWith(text, needle) {
  return String(text).split(/\r?\n/).find((l) => l.includes(needle)) || '';
}

function listAfter(text, needle, sep) {
  const line = lineWith(text, needle);
  const at = line.indexOf(needle);
  if (at < 0) return [];
  let rest = line.slice(at + needle.length).replace(/^[：:，]/, '');
  rest = rest.replace(/。.*$/, '');
  return rest
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
}

const countItems = (body) => (String(body).match(/(^|[。：\s])[一二三四五六七八九]是/g) || []).length;

/** 手法禁忌五条：正文第一节的「**一、…**」 */
function contraindications(text) {
  return [...sectionAt(text, 0).matchAll(/\*\*([一二三四五])、([^*]+)\*\*/g)].map((m) => ({
    n: m[1],
    name: m[2].replace(/[。\s]+$/, '').trim(),
  }));
}

/** 操作前的五问：数「有没有」，每问一个 */
function fiveQuestions(text) {
  const line = lineWith(text, '可以压缩成五问');
  return (line.match(/有没有/g) || []).length;
}

/** 能改变／不能改变两栏；两栏都以该词开头，「不能改变的」里含「能改变的」，故按行首匹配 */
function whatChanges(text) {
  const lines = String(text).split(String.fromCharCode(10)).map((l) => l.trim());
  const lineOf = (needle) => lines.find((l) => l.startsWith(needle)) || String();
  const cut = (line, needle, sep) =>
    line
      .trim()
      .slice(needle.length)
      .replace(/。.*$/, '')
      .split(sep)
      .map((s) => s.trim())
      .filter(Boolean);
  return {
    cannot: cut(lineOf('不能改变的：'), '不能改变的：', '；'),
    can: cut(lineOf('能改变的：'), '能改变的：', '、'),
  };
}

/** 手术六条硬线 */
const surgeryLines = (text) => countItems(sectionAt(text, 2));

/** 「足疗程」三种含义各自在正文里出现过没有 */
const courseMeanings = (text) => COURSE_MEANINGS.filter((k) => text.includes(k));

/** 术后三件事：邻近节段、疼痛未必全消、功能依赖康复 */
function afterSurgery(text) {
  return [
    { key: '邻近节段', ok: text.includes('邻近节段会承担更多应力') },
    { key: '疼痛未必全消', ok: text.includes('疼痛不会完全消失') },
    { key: '功能依赖康复', ok: text.includes('功能恢复依赖康复') },
  ];
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
    contraindications: contraindications(text),
    questions: fiveQuestions(text),
    changes: whatChanges(text),
    surgeryLines: surgeryLines(text),
    meanings: courseMeanings(text),
    after: afterSurgery(text),
    threeRules: text.includes('手法应当轻') && text.includes('必须有随访节点') && text.includes('配合主动训练'),
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
  console.log(`手法禁忌 ${f.contraindications.length} 条：${f.contraindications.map((c) => `${c.n}·${c.name}`).join(' / ')}`);
  console.log(`操作前 ${f.questions} 问 · 手法三条要求齐：${f.threeRules ? '✓' : '✗'}`);
  console.log(`不能改变 ${f.changes.cannot.length} 项：${f.changes.cannot.join(' / ')}`);
  console.log(`能改变 ${f.changes.can.length} 项：${f.changes.can.join(' / ')}`);
  console.log(`手术硬线 ${f.surgeryLines} 条 · 「足疗程」${f.meanings.length} 种含义：${f.meanings.join(' · ')}`);
  console.log('术后三件事：' + f.after.map((a) => `${a.ok ? '✓' : '✗'}${a.key}`).join(' · '));
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
  lineWith,
  listAfter,
  countItems,
  contraindications,
  fiveQuestions,
  whatChanges,
  surgeryLines,
  courseMeanings,
  afterSurgery,
  quizSummary,
  chapterFacts,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  COURSE_MEANINGS,
};
