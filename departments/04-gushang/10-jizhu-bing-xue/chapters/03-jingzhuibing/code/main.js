#!/usr/bin/env node
/**
 * 脊柱病学 · 第 3 章 · 颈痛九成不是颈椎病，颈椎病九成不必手术
 * 课程: departments/04-gushang/10-jizhu-bing-xue/chapters/03-jingzhuibing/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、每节探针词、关键判据词频，
 *   颈痛三类、颈椎病六型（正文以加粗小标题给出）、
 *   脊髓型的三个动作与两个反射、转介的四个节点、鉴别清单条数，
 *   以及 quiz 的 check 题接地情况。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '3';
const SLUG = '03-jingzhuibing';
const TITLE = '颈痛九成不是颈椎病，颈椎病九成不必手术';

/** 关键判据词：本章反复使用的说法，是正文与习题同源的最小证据 */
const TERMS = [
  '椎间孔挤压试验',
  '皮节',
  '踩棉花感',
  '霍夫曼征',
  '腕管综合征',
  '脊髓型',
  '九成不必手术',
  '红旗',
];

/** 每节一个探针词：第 i 个必须落在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '机械性颈痛',
  '神经根型',
  '霍夫曼征',
  '腕管综合征',
  '第一个节点',
  '不是颈痛的通用标签',
];

/** 脊髓型的三个动作：正文「三个动作：…」列出 */
const MOVEMENTS = ['快速交替翻掌', '拇指与示指快速对捏', '走五米直线'];

/** 脊髓型的两个反射 */
const REFLEXES = ['霍夫曼征', '巴宾斯基征'];

/** 六型的名字（椎动脉型与交感型在正文里合写在一个小标题里） */
const TYPE_NAMES = ['颈型', '神经根型', '脊髓型', '椎动脉型', '交感型', '食管型'];

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

/** 第一节的加粗小标题：颈痛三类之外的边界段没有小标题，不参与 */
function boldNames(body) {
  return [...String(body).matchAll(/\*\*([^*]{2,24})\*\*/g)]
    .map((m) => m[1].replace(/[。\s]+$/, '').trim())
    .filter((s) => s && !s.includes('，'));
}

/** 颈痛三类：正文「第一类，…／第二类，…／第三类，…」 */
function neckClasses(text) {
  return sectionAt(text, 0)
    .split(/\r?\n/)
    .map((l) => /^第([一二三])类，([^。]+)。/.exec(l.trim()))
    .filter(Boolean)
    .map((m) => ({ n: m[1], name: m[2].trim() }));
}

/** 六型：正文第二节的加粗小标题（5 个块，其中一块含两型） */
function typeBlocks(text) {
  return boldNames(sectionAt(text, 1));
}

/** 鉴别清单：正文第四节的加粗小标题 */
function differentials(text) {
  return boldNames(sectionAt(text, 3));
}

/** 转介的四个节点：正文第五节「第X个节点是…」，四句都在同一段里 */
function referralNodes(text) {
  const body = sectionAt(text, 4);
  return [...body.matchAll(/第([一二三四])个节点是([^。]*)。/g)].map((m) => ({
    n: m[1],
    text: m[2].trim(),
  }));
}

/** 脊髓型的识别流程：三个动作 + 两个反射，各自在正文里出现过才算 */
function cordSigns(text) {
  return {
    movements: MOVEMENTS.filter((m) => text.includes(m)),
    reflexes: REFLEXES.filter((r) => text.includes(r)),
    hoffmannCaveat: text.includes('阴性不能排除脊髓型'),
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
    classes: neckClasses(text),
    typeBlocks: typeBlocks(text),
    typeNames: TYPE_NAMES.filter((n) => text.includes(n)),
    differentials: differentials(text),
    nodes: referralNodes(text),
    cord: cordSigns(text),
    naturalCourse: text.includes('九成不必手术'),
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
  console.log(`颈痛 ${f.classes.length} 类：${f.classes.map((c) => `第${c.n}类·${c.name}`).join(' · ')}`);
  console.log(`分型块 ${f.typeBlocks.length} 个 → 六型名字 ${f.typeNames.length}/6：${f.typeBlocks.join(' · ')}`);
  console.log(
    `脊髓型识别：动作 ${f.cord.movements.length}/3 · 反射 ${f.cord.reflexes.length}/2` +
      ` · Hoffmann 阴性不排除已写：${f.cord.hoffmannCaveat ? '✓' : '✗'}`
  );
  console.log(`鉴别 ${f.differentials.length} 条：${f.differentials.join(' / ')}`);
  console.log(`转介节点 ${f.nodes.length} 个：${f.nodes.map((n) => `第${n.n}·${n.text.slice(0, 8)}`).join(' / ')}`);
  console.log(`「九成不必手术」的出处（神经根型自然病程）在正文：${f.naturalCourse ? '✓' : '✗'}`);
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
  boldNames,
  neckClasses,
  typeBlocks,
  differentials,
  referralNodes,
  cordSigns,
  quizSummary,
  chapterFacts,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  MOVEMENTS,
  REFLEXES,
  TYPE_NAMES,
};
