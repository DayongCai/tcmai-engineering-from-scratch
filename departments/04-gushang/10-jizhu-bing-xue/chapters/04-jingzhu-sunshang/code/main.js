#!/usr/bin/env node
/**
 * 脊柱病学 · 第 4 章 · 颈椎损伤的第一分钟，比后面的三十天更重要
 * 课程: departments/04-gushang/10-jizhu-bing-xue/chapters/04-jingzhu-sunshang/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、每节探针词、关键判据词频，
 *   机制四类、稳定性的三个特殊之处、现场四条禁令、
 *   清关规则的例外人群、影像三件的分工、脊髓损伤的四条主线，
 *   以及 quiz 的 check 题接地情况。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '4';
const SLUG = '04-jingzhu-sunshang';
const TITLE = '颈椎损伤的第一分钟，比后面的三十天更重要';

/** 关键判据词：本章反复使用的说法，是正文与习题同源的最小证据 */
const TERMS = [
  '后纵韧带骨化',
  '挥鞭',
  '关节突脱位',
  '轴向',
  '清关',
  '骶段',
  '二次打击',
  '明确禁忌',
];

/** 每节一个探针词：第 i 个必须落在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '屈曲牵张',
  '后方韧带复合体',
  '不要在未固定前搬动头颈',
  'NEXUS',
  '骶段功能',
  '不等于「没有损伤」',
];

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

/** 机制四类：正文第一节的加粗小标题 */
function mechanisms(text) {
  return [...sectionAt(text, 0).matchAll(/\*\*([^*]{2,12})。\*\*/g)].map((m) => m[1].trim());
}

/** 稳定性的三个特殊之处：正文第二节「第一，…／第二，…／第三，…」，各占一段 */
function stabilityExtras(text) {
  const body = sectionAt(text, 1);
  return [...body.matchAll(/^第([一二三])，(.+)$/gm)].map((m) => ({ n: m[1], text: m[2].trim() }));
}

/** 现场四条禁令：正文第三节的「**不要…**」 */
function bans(text) {
  return [...sectionAt(text, 2).matchAll(/\*\*(不要[^*]+)\*\*/g)].map((m) =>
    m[1].replace(/[。\s]+$/, '').trim()
  );
}

/** 清关规则的例外人群：正文第四节「最容易出事的人群：…」 */
function clearanceExceptions(text) {
  return listAfter(text, '最容易出事的人群：', '、');
}

/** 影像三件的分工：平片／CT／磁共振各答一句 */
function imagingRoles(text) {
  const body = sectionAt(text, 1);
  const m = /平片答([^，]+)，CT 答([^，]+)，磁共振答([^。]+)。/.exec(body);
  return m ? [m[1], m[2], m[3]].map((s) => s.replace(/[「」]/g, '').trim()) : [];
}

/** 脊髓损伤的四条主线：感觉、运动、反射、括约肌 */
function cordLines(text) {
  const m = /损伤平面以下的感觉、运动、反射与括约肌功能是四条主线/.exec(text);
  if (!m) return [];
  return ['感觉', '运动', '反射', '括约肌'].filter((k) => text.includes(k));
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
    mechanisms: mechanisms(text),
    stabilityExtras: stabilityExtras(text),
    bans: bans(text),
    clearanceExceptions: clearanceExceptions(text),
    imagingRoles: imagingRoles(text),
    cordLines: cordLines(text),
    orderFixed: text.includes('先固定、后康复'),
    noFractureTrap: text.includes('过伸损伤'),
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
  console.log(`机制 ${f.mechanisms.length} 类：${f.mechanisms.join(' · ')}`);
  console.log(`稳定性特殊之处 ${f.stabilityExtras.length} 条：${f.stabilityExtras.map((x) => `第${x.n}`).join(' / ')}`);
  console.log(`现场禁令 ${f.bans.length} 条：${f.bans.map((b) => b.slice(0, 8)).join(' / ')}`);
  console.log(`清关例外 ${f.clearanceExceptions.length} 类：${f.clearanceExceptions.join(' / ')}`);
  console.log(`影像分工 ${f.imagingRoles.length} 件：${f.imagingRoles.join(' · ')}`);
  console.log(`脊髓损伤 ${f.cordLines.length} 条主线：${f.cordLines.join(' · ')}`);
  console.log(`「先固定、后康复」已写：${f.orderFixed ? '✓' : '✗'} · 过伸损伤已写：${f.noFractureTrap ? '✓' : '✗'}`);
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
  mechanisms,
  stabilityExtras,
  bans,
  clearanceExceptions,
  imagingRoles,
  cordLines,
  quizSummary,
  chapterFacts,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
};
