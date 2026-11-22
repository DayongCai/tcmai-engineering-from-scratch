#!/usr/bin/env node
/**
 * 中医五官经典 · 第 5 章 · 病名是「当时看得见的东西」的名字，改名时丢的是判据
 * 课程: departments/08-wuguan/05-zhongyi-wuguan-jingdian/chapters/05-e55/docs/zh.md
 *
 * 本章的数字都由本脚本从正文现算，不手打：
 *   汉字数、三个断代的体例名、一人多病与一病多名的例数、三次转移的名目、
 *   第五节的三查与三种对齐精度，以及 quiz 的 check 题能在正文里对上几个四字原词。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '5';
const SLUG = '05-e55';
const TITLE = '病名是「当时看得见的东西」的名字，改名时丢的是判据';

/** 第一节三个断代：候／证／症 */
const ERAS = ['隋代以「候」为纲', '宋元以「证」统方', '明清以「症」为目'];
/** 第二节一名多病：四个例子 */
const ONE_NAME_MANY = ['内障', '喉痹', '鼻渊', '牙宣'];
/** 第三节一病多名：四组名字 */
const MANY_NAMES_ONE = ['雀目', '聤耳、脓耳、耳疳、耳底', '喉风三十六症', '白缠喉、白喉'];
/** 第四节三次转移 */
const SHIFTS = ['从部位到病因', '从形态到病理', '从病机到检查'];
/** 第五节三查的编号 */
const CHECKS = ['一查首见', '二查同名异实', '三查判据组'];
/** 第五节三种对齐精度 */
const ALIGN = ['名对名', '判据组对判据组', '病机对病机'];
/** 每节一个探针词 */
const SECTION_PROBES = ['候', '一名多病', '一病多名', '三次转移', '病名当索引', '不拿今病名回填古籍'];
/** 关键判据词 */
const TERMS = ['能看见的东西', '通与不通', '浊涕下不止', '可见的形态与部位', '只用于检索', '无需查过敏原'];

const GRAM = 4;
const NL = /\r?\n/;
const H2 = /^##\s+(.+)$/;

const readDoc = () => fs.readFileSync(DOC, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function h2Titles(text) {
  const out = [];
  for (const line of String(text).split(NL)) {
    const m = H2.exec(line.trim());
    if (m) out.push(m[1].trim());
  }
  return out;
}

function h2Sections(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split(NL)) {
    const m = H2.exec(line.trim());
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

/** 粗体小标题：本节所有「**…。**」的标签 */
function boldLabels(body) {
  return [...String(body).matchAll(/\*\*([^*]+?)。\*\*/g)].map((m) => m[1].trim());
}

/** 第一节三处统计数字，本章一律标「通行统计」，不作精确数用 */
function eraStats(text) {
  const sec = sectionAt(text, 0);
  return {
    hou: sec.includes('千七百余种'),
    seventyTwo: sec.includes('七十二证'),
    thirtySix: sec.includes('三十六症'),
  };
}

/** 第五节三查：从「**三查。**」那一段里切「一查／二查／三查」 */
function threeChecks(text) {
  const sec = sectionAt(text, 4);
  const line = String(sec).split(NL).find((l) => l.includes('二查同名异实')) || '';
  return CHECKS.filter((c) => line.includes(c)).map((c) => ({
    label: c,
    at: line.indexOf(c),
  }));
}

/** 第五节三种对齐精度，按出现次序 */
function alignLevels(text) {
  const sec = sectionAt(text, 4);
  return ALIGN.map((name) => ({ name, at: sec.indexOf(name) })).sort((a, b) => a.at - b.at);
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
    indexes: [...new Set(qs.map((q) => q.correct))].sort(),
    pageRefs: qs.filter((q) => /\d+\s*页/.test(JSON.stringify(q))).length,
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    labels: h2Sections(text).map((s) => boldLabels(s.body)),
    eras: ERAS.filter((e) => sectionAt(text, 0).includes(e)),
    oneNameMany: ONE_NAME_MANY.filter((n) => sectionAt(text, 1).includes('**' + n + '。**')),
    manyNamesOne: MANY_NAMES_ONE.filter((n) => sectionAt(text, 2).includes('**' + n + '。**')),
    shifts: SHIFTS.filter((s) => sectionAt(text, 3).includes('**' + s + '。**')),
    checks: threeChecks(text),
    align: alignLevels(text),
    stats: eraStats(text),
    terms: TERMS.map((t) => ({ term: t, count: occurrences(text, t) })),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).includes(p) })),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医五官经典 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`三个断代（${r.eras.length} 个）：`);
  r.eras.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  console.log(`  通行统计：证候千七百余种 ${r.stats.hou ? '✓' : '✗'} · 七十二证 ${r.stats.seventyTwo ? '✓' : '✗'} · 三十六症 ${r.stats.thirtySix ? '✓' : '✗'}`);
  console.log('');
  console.log(`一名多病 ${r.oneNameMany.length} 例：${r.oneNameMany.join(' / ')}`);
  console.log(`一病多名 ${r.manyNamesOne.length} 组：${r.manyNamesOne.join(' / ')}`);
  console.log('');
  console.log(`判据的三次转移（${r.shifts.length} 次）：`);
  r.shifts.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  console.log('');
  console.log('第五节的三查：');
  r.checks.forEach((c, i) => console.log(`  ${i + 1}. ${c.label}`));
  console.log(`三种对齐精度（由粗到细）：${r.align.map((a) => a.name).join(' → ')}`);
  console.log('');
  console.log('关键判据（出现次数）：');
  console.log('  ' + r.terms.map((x) => `${x.term} ${x.count}`).join(' · '));
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(`quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`);
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见、诊断或治疗指导；病名对应只作文献与教学对照，不作诊断依据。');
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
  boldLabels,
  eraStats,
  threeChecks,
  alignLevels,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  ERAS,
  ONE_NAME_MANY,
  MANY_NAMES_ONE,
  SHIFTS,
  CHECKS,
  ALIGN,
  SECTION_PROBES,
  TERMS,
};
