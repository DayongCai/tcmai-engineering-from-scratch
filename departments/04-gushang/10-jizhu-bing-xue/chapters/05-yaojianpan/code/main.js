#!/usr/bin/env node
/**
 * 脊柱病学 · 第 5 章 · 椎间盘突出是影像诊断，腰痛是一个人的生活
 * 课程: departments/04-gushang/10-jizhu-bing-xue/chapters/05-yaojianpan/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、每节探针词、关键判据词频，
 *   「突出症」的三个条件、非间盘源性腰痛的类型数、L4/L5/S1 三条定位线、
 *   自然病程的三个前提、两条急诊线、转介六条、保守治疗四组，
 *   以及 quiz 的 check 题接地情况。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '5';
const SLUG = '05-yaojianpan';
const TITLE = '椎间盘突出是影像诊断，腰痛是一个人的生活';

/** 关键判据词：本章反复使用的说法，是正文与习题同源的最小证据 */
const TERMS = [
  '盘源性',
  'Modic',
  '皮节',
  '直腿抬高',
  '鞍区',
  '巨噬细胞',
  '马尾综合征',
  '保护模式',
];

/** 每节一个探针词：第 i 个必须落在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '三个条件',
  'L5 神经根',
  '巨噬细胞',
  '马尾综合征',
  '压缩成六条',
  '按回去',
];

/** 保守治疗的四个组成部分 */
const CONSERVATIVE = ['教育与活动维持', '镇痛与抗炎', '运动疗法', '物理因子与手法'];

const GRAM = 4;

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

function grams(text, n = GRAM) {
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

/** 「突出症」的三个条件：影像相符、症状沿神经根、查体有体征 */
function diagnosticTriad(text) {
  return listAfter(text, '需要三个条件同时成立：', '，');
}

/** 非间盘源性腰痛的类型：正文「主要包括：…」 */
function nonDiscogenic(text) {
  return listAfter(text, '主要包括：', '、');
}

/** 三条定位线：L4／L5／S1 各写感觉、运动、反射 */
function rootLocalization(text) {
  const body = sectionAt(text, 1);
  return [...body.matchAll(/([LS]\d) 神经根：感觉在([^，]+)，运动主要是([^，]+)，反射(?:为)?([^。]+)。/g)].map(
    (m) => ({
      root: m[1],
      sensory: m[2].trim(),
      motor: m[3].trim(),
      reflex: m[4].trim(),
    })
  );
}

/** 自然病程的三个前提：三句都在同一段里 */
function naturalCourseCaveats(text) {
  return [...sectionAt(text, 2).matchAll(/第([一二三])，([^。]*)。/g)].map((m) => ({
    n: m[1],
    text: m[2].trim(),
  }));
}

/** 两条急诊线：马尾综合征与进行性肌力下降（正文加粗小标题） */
function emergencyLines(text) {
  return [...sectionAt(text, 3).matchAll(/\*\*([^*]{2,10})。\*\*/g)].map((m) => m[1].trim());
}

/** 转介六条：正文第五节「一是…／二是…／…六是…」 */
function referralRules(text) {
  const body = sectionAt(text, 4);
  return [...body.matchAll(/([一二三四五六])是([^，。]+)，/g)].map((m) => ({ n: m[1], text: m[2].trim() }));
}

/** 保守治疗的四组（按证据强度排序） */
function conservativeParts(text) {
  return CONSERVATIVE.filter((k) => text.includes(k));
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
    triad: diagnosticTriad(text),
    nonDiscogenic: nonDiscogenic(text),
    roots: rootLocalization(text),
    caveats: naturalCourseCaveats(text),
    emergency: emergencyLines(text),
    referrals: referralRules(text),
    conservative: conservativeParts(text),
    shrinkMechanism: text.includes('巨噬细胞吞噬') && text.includes('不是被手法按回去的'),
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
  console.log(`「突出症」条件 ${f.triad.length}/3：${f.triad.join(' / ')}`);
  console.log(`非间盘源性类型 ${f.nonDiscogenic.length} 类：${f.nonDiscogenic.map((s) => s.slice(0, 6)).join(' / ')}`);
  console.log(
    `定位 ${f.roots.length} 根：` +
      f.roots.map((x) => `${x.root}（感觉·${x.sensory.slice(0, 5)}｜反射·${x.reflex.slice(0, 5)}）`).join(' · ')
  );
  console.log(`自然病程前提 ${f.caveats.length} 条：${f.caveats.map((c) => `第${c.n}`).join(' / ')}`);
  console.log(`急诊线 ${f.emergency.length} 条：${f.emergency.join(' · ')}`);
  console.log(`转介 ${f.referrals.length} 条：${f.referrals.map((x) => `${x.n}·${x.text.slice(0, 6)}`).join(' / ')}`);
  console.log(`保守治疗 ${f.conservative.length} 组：${f.conservative.join(' · ')}`);
  console.log(`缩小的机制写成「身体的清理」而不是按回去：${f.shrinkMechanism ? '✓' : '✗'}`);
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
  diagnosticTriad,
  nonDiscogenic,
  rootLocalization,
  naturalCourseCaveats,
  emergencyLines,
  referralRules,
  conservativeParts,
  quizSummary,
  chapterFacts,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  CONSERVATIVE,
};
