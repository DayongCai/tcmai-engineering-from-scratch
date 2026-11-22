#!/usr/bin/env node
/**
 * 脊柱病学 · 第 2 章 · 片子回答「有没有」，不回答「痛不痛」
 * 课程: departments/04-gushang/10-jizhu-bing-xue/chapters/02-yingxiang-zhenduan/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、每节探针词、关键判据词频，
 *   四类检查、三个报告陷阱、读片四步、红旗征清单条数、
 *   「影像与症状对不上」的四步，以及 quiz 的 check 题接地情况。
 * 正文一改，重跑即可看出哪里对不上；main.test.js 再把这些数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '2';
const SLUG = '02-yingxiang-zhenduan';
const TITLE = '片子回答「有没有」，不回答「痛不痛」';

/** 关键判据词：本章反复使用的说法，是正文与习题同源的最小证据 */
const TERMS = [
  '红旗征',
  '概率的上调',
  '形态学词汇',
  '偶发瘤',
  '皮节',
  '电生理',
  '脂肪浸润',
  '无既往影像对比',
];

/** 每节一个探针词：第 i 个必须落在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '四种检查',
  '先整体，后局部',
  '陷阱一',
  '两条独立的证据链',
  '红旗征决定',
  '影像的阴性不能排除病',
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

/** 按二级标题切段，返回 [{ title, body }] */
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

function lineWith(text, needle) {
  return String(text).split(/\r?\n/).find((l) => l.includes(needle)) || '';
}

/** 取「关键词：…… 。」之间的内容，按分隔符切成条目 */
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

/** 四类检查：正文第一节以加粗小标题列出 */
function modalities(text) {
  const names = ['X 线', 'CT', '磁共振', '核素显像与骨密度'];
  const body = sectionAt(text, 0);
  const found = [];
  for (const m of body.matchAll(/\*\*([^*]+)\*\*/g)) {
    const name = m[1].replace(/[。\s]+$/, '').trim();
    if (names.includes(name)) found.push(name);
  }
  return found;
}

/** 三个报告陷阱：陷阱一／二／三 的标题 */
function traps(text) {
  const body = sectionAt(text, 2);
  return [...body.matchAll(/\*\*陷阱([一二三])：([^*]+)\*\*/g)].map((m) => ({
    n: m[1],
    name: m[2].replace(/[。\s]+$/, '').trim(),
  }));
}

/** 读片四步：正文第二节的「一是…四是…」 */
function readOrder(text) {
  return sectionAt(text, 1)
    .split(/\r?\n/)
    .filter((l) => /^[一二三四]是/.test(l.trim()))
    .map((l) => l.trim());
}

/** 影像与症状对不上时的四步：正文第四节的「第一，…」 */
function evidenceSteps(text) {
  return sectionAt(text, 3)
    .split(/\r?\n/)
    .filter((l) => /^第[一二三四]，/.test(l.trim()))
    .map((l) => l.trim());
}

/** 红旗征清单：正文第五节「需要立刻影像的情形包括：…」 */
function redFlags(text) {
  return listAfter(text, '需要立刻影像的情形包括：', '；');
}

/** 随访与报告的判据：正文末两段写明的两句 */
function boundaries(text) {
  return [
    { key: '阴性', ok: text.includes('影像的阴性不能排除病') },
    { key: '阳性', ok: text.includes('影像的阳性不能证明病') },
    { key: '无旧片', ok: text.includes('无既往影像对比') },
  ];
}

/** quiz 的结构与接地情况：check 题正确选项能对上几个四字原词 */
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
    modalities: modalities(text),
    traps: traps(text),
    readOrder: readOrder(text),
    evidenceSteps: evidenceSteps(text),
    redFlags: redFlags(text),
    boundaries: boundaries(text),
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
  console.log(`检查 ${f.modalities.length} 类：${f.modalities.join(' · ')}`);
  console.log(`报告陷阱 ${f.traps.length} 个：${f.traps.map((t) => `陷阱${t.n}·${t.name}`).join(' · ')}`);
  console.log(`读片 ${f.readOrder.length} 步：${f.readOrder.map((s) => s.replace(/^[一二三四]是/, '').slice(0, 6)).join(' → ')}`);
  console.log(`对不上时 ${f.evidenceSteps.length} 步（第几，…）：${f.evidenceSteps.length} 条`);
  console.log(`红旗征 ${f.redFlags.length} 条：${f.redFlags.map((s) => s.replace(/^以及/, '')).join(' / ')}`);
  console.log(
    '边界三句：' + f.boundaries.map((b) => `${b.ok ? '✓' : '✗'}${b.key}`).join(' · ')
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
  lineWith,
  listAfter,
  modalities,
  traps,
  readOrder,
  evidenceSteps,
  redFlags,
  boundaries,
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
