#!/usr/bin/env node
/**
 * 脊柱病学 · 第 1 章 · 脊柱不是一根柱子，而是一组会互相代偿的关节
 * 课程: departments/04-gushang/10-jizhu-bing-xue/chapters/01-jiepou-lixue/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部由本脚本从正文现算，不手打：
 *   汉字数、六个小节标题与顺序、每节的探针词、关键判据词的出现次数、
 *   节段数（颈 7 胸 12 腰 5）、曲度清单、四套稳定系统、三柱清单，
 *   以及 quiz 的 check 题正确选项能对上正文几个四字原词。
 * 正文一改，重跑即可看出哪里对不上；main.test.js 再把这些数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '1';
const SLUG = '01-jiepou-lixue';
const TITLE = '脊柱不是一根柱子，而是一组会互相代偿的关节';

/** 关键判据词：本章反复使用的说法，是正文与习题同源的最小证据 */
const TERMS = [
  '代偿',
  '中立区',
  '偶联运动',
  '三柱理论',
  '本体感觉',
  '退变',
  '空化',
  '形态学词汇',
];

/** 每节一个探针词：第 i 个必须落在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '三个数',
  '四套系统',
  '中立区',
  '含水率下降',
  '疼痛不是结构的直接读数',
  '影像描述不等于诊断',
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

/** 找出含某词的那一行（正文里同一判据只写一次的说法） */
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

/** 三个数：颈椎七节、胸椎十二节、腰椎五节 —— 从节标题与小节正文两处对账 */
function vertebrae(text) {
  const head = h2Titles(text).find((t) => t.includes('三个数')) || '';
  const nums = (head.match(/\d+/g) || []).map(Number);
  const zh = [
    ['颈椎', '七节', '七'],
    ['胸椎', '十二节', '十二'],
    ['腰椎', '五节', '五'],
  ];
  const spelled = zh.filter(([, w]) => text.includes(w)).length;
  const digits = zh.filter(([, , d]) => text.includes(`椎${d}节`)).length;
  return { nums, spelled, digits, movable: nums.reduce((a, b) => a + b, 0) };
}

/** 四个曲度：按正文出现顺序去重 */
function curveNames(text) {
  const order = ['颈椎前凸', '胸椎后凸', '腰椎前凸', '骶骨后凸'];
  return order.filter((c) => text.includes(c));
}

/** 三柱：前柱／中柱／后柱 及其组成 */
function threeColumns(text) {
  const items = listAfter(text, '三柱理论是理解脊柱损伤的起点：', '；');
  return items.map((s) => ({ name: (s.split('是')[0] || '').trim(), text: s }));
}

/** 四套稳定系统：骨性结构、椎间盘与韧带、椎旁肌与腹肌、神经系统 */
function stabilitySystems(text) {
  const items = listAfter(text, '日常稳定由四套系统共同提供：', '，');
  return items.map((s) => (s.split('提供')[0] || '').trim());
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

/** 本章的核心账：节段、曲度、柱、系统、退变三特征 */
function chapterFacts() {
  const text = readDoc();
  return {
    vertebrae: vertebrae(text),
    curves: curveNames(text),
    columns: threeColumns(text),
    systems: stabilitySystems(text),
    degenerationTraits: ['它是普遍的', '它是异步的', '可以被症状「追上」'].filter((k) =>
      text.includes(k)
    ),
    painParts: ['神经根是否真的被机械刺激', '局部是否有炎症', '中枢对疼痛信号的处理是否被放大'].filter(
      (k) => text.includes(k)
    ),
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
  console.log(
    `节段账：颈 ${f.vertebrae.nums[0]} / 胸 ${f.vertebrae.nums[1]} / 腰 ${f.vertebrae.nums[2]}` +
      ` · 可动节段合计 ${f.vertebrae.movable} 节（汉字段 ${f.vertebrae.spelled}，数字段 ${f.vertebrae.digits}）`
  );
  console.log(`曲度 ${f.curves.length} 个：${f.curves.join(' · ')}`);
  console.log(
    `三柱 ${f.columns.length} 层：${f.columns.map((c) => c.name).join(' · ')}（每层都写了组成，非空：${f.columns.every((c) => c.text.length > 8)}）`
  );
  console.log(`日常稳定 ${f.systems.length} 套：${f.systems.join(' · ')}`);
  console.log(`退变特征 ${f.degenerationTraits.length} 条 · 疼痛来源 ${f.painParts.length} 部分`);
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
  vertebrae,
  curveNames,
  threeColumns,
  stabilitySystems,
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
