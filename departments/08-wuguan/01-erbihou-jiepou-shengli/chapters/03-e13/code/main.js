#!/usr/bin/env node
/**
 * 耳鼻喉解剖生理 · 第 3 章 · 鼻与鼻窦：一条路、四间挂屋，滞留是链不是点
 * 课程: departments/08-wuguan/01-erbihou-jiepou-shengli/chapters/03-e13/docs/zh.md
 *
 * 本章全用段落组织，正文里没有表格，故本脚本不核对表行数，改核对两件事：
 *   滞留主链的五个环节（按正文顺序取，不许漏环、不许错序），与
 *   「鼻塞」落在三段上的三种含义。
 * 其余数字（汉字数、小节、词频、quiz 接地）同样由正文现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '3';
const SLUG = '03-e13';
const TITLE = '鼻与鼻窦：一条路、四间挂屋，滞留是链不是点';

/** 本章无表格：正文以段落组织，表格登记为空 */
const TABLE_ROWS = [];

const TERMS = [
  '利特尔区',
  '窦口鼻道复合体',
  '上颌窦',
  '额隐窝',
  '蝶筛隐窝',
  '嗅区',
  '呼吸区',
  '黏液毯',
];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = [
  '两个门户',
  '上不封顶',
  '黏液毯',
  '主链五环',
  '利特尔区',
  '常见部位，不是唯一部位',
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

function tableBlocks(text) {
  const blocks = [];
  let cur = null;
  for (const line of String(text).split(/\r?\n/)) {
    const s = line.trim();
    if (s.startsWith('|')) {
      if (!cur) {
        cur = [];
        blocks.push(cur);
      }
      cur.push(s);
    } else cur = null;
  }
  return blocks.map((b) => {
    const cells = b.map((r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
    return { head: cells[0] || [], rows: cells.slice(2) };
  });
}

const occurrences = (text, term) => String(text).split(term).length - 1;

function grams(text, n = GRAM) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const presentCount = (text, terms) => terms.filter((t) => occurrences(text, t) > 0).length;

/** 滞留主链：正文「主链五环：」那一句里的五个加粗环节，按出现顺序 */
function fiveRings(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('主链五环')) || '';
  return [...line.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1].trim());
}

/** 「鼻塞」落在三段上的三种含义：外鼻段、鼻腔段、鼻窦段 */
function noseSegments(text) {
  const m = /外鼻段是([^，。；]+)[^；]*；鼻腔段是([^；。]+)；鼻窦段是([^，。；]+)/.exec(text);
  return m ? { outer: m[1], cavity: m[2], sinus: m[3] } : { outer: null, cavity: null, sinus: null };
}

function quizSummary(quiz, text) {
  const body = grams(text);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  for (const q of qs) if (stage[q.stage] !== undefined) stage[q.stage] += 1;
  const hits = qs.filter((q) => q.stage === 'check').map((q) => {
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
  const blocks = tableBlocks(text);
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    tables: blocks.map((b) => ({ cols: b.head.length, rows: b.rows.length, first: b.head[0] || '' })),
    terms: TERMS.map((t) => ({ term: t, count: occurrences(text, t) })),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).includes(p) })),
    quiz: quizSummary(quiz, text),
    rings: fiveRings(text),
    segments: noseSegments(text),
  };
}

function main() {
  const r = analyze();
  console.log(`耳鼻喉解剖生理 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  if (r.tables.length) {
    console.log(`表格 ${r.tables.length} 张：`);
    r.tables.forEach((t, i) => console.log(`  #${i + 1}  ${t.rows} 行 × ${t.cols} 列  首列表头「${t.first}」`));
  } else {
    console.log('表格 0 张：本章全用段落组织，没有表格。');
  }
  console.log('');
  console.log(`滞留主链 ${r.rings.length} 环：${r.rings.join(' → ')}`);
  console.log(`「鼻塞」三段：外鼻段 ${r.segments.outer} / 鼻腔段 ${r.segments.cavity} / 鼻窦段 ${r.segments.sinus}`);
  console.log('');
  console.log('关键判据（出现次数）：');
  console.log('  ' + r.terms.map((x) => `${x.term} ${x.count}`).join(' · '));
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`
  );
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见或治疗指导。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Titles,
  h2Sections,
  sectionAt,
  tableBlocks,
  occurrences,
  grams,
  presentCount,
  fiveRings,
  noseSegments,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TABLE_ROWS,
  TERMS,
  SECTION_PROBES,
};
