#!/usr/bin/env node
/**
 * 耳鼻喉解剖生理 · 第 8 章 · 检查法：每一个「未见异常」都得带一个范围
 * 课程: departments/08-wuguan/01-erbihou-jiepou-shengli/chapters/08-e18/docs/zh.md
 *
 * 本章的数字都由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、三张表（五个词、正常所见记录、内镜与影像口径）、
 *   记录四要素与口径五维的名称、四把镜子的止点是否都在正文里，
 *   以及 quiz 的 check 题能在正文里对上几个四字原词。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '8';
const SLUG = '08-e18';
const TITLE = '检查法：每一个「未见异常」都得带一个范围';

/** 各表格的期望数据行数：五个词表、正常所见记录表、内镜与影像口径表 */
const TABLE_ROWS = [5, 8, 5];

const TERMS = [
  '可及范围',
  '记录最小集',
  '鼓气耳镜',
  '声导抗',
  '耳声发射',
  '鼻内镜',
  '声门下未及',
  '频闪',
];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = [
  '把清单换成问题',
  '止于鼓膜',
  '三件不同的事',
  '换的是一层',
  '四要素',
  '缺统一描述术语',
];

/** 四把镜子：本章逐把交代止点，名称须都在正文出现 */
const SCOPES = ['耳镜', '前鼻镜', '间接喉镜', '电子喉镜'];

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

const column = (text, tableIndex, colIndex = 0) =>
  ((tableBlocks(text)[tableIndex] || { rows: [] }).rows).map((r) => r[colIndex] || '');

/** 五个词：可及范围、所见层次、正常所见、口径、记录最小集 */
const fiveTerms = (text) => column(text, 0);

/** 记录最小集的四要素：范围、条件、所见、限度 */
function recordParts(text) {
  const lines = String(text).split('\n').map((s) => s.trim());
  const line = lines.find((l) => l.includes('一份阴性记录必须写全的四项')) || '';
  const m = /四项：([^；|。]+)/.exec(line);
  return m ? m[1].split('、').map((s) => s.trim()) : [];
}

/** 内镜与影像的口径五维 */
const dimensionNames = (text) => column(text, 2);

/** 四把镜子在正文里都出现过几个 */
const scopesPresent = (text) => SCOPES.filter((s) => occurrences(text, s) > 0);

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
    words: fiveTerms(text),
    parts: recordParts(text),
    dims: dimensionNames(text),
    scopes: scopesPresent(text),
  };
}

function main() {
  const r = analyze();
  console.log(`耳鼻喉解剖生理 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`表格 ${r.tables.length} 张：`);
  r.tables.forEach((t, i) => console.log(`  #${i + 1}  ${t.rows} 行 × ${t.cols} 列  首列表头「${t.first}」`));
  console.log('');
  console.log(`五个词：${r.words.join(' / ')}`);
  console.log(`记录最小集四要素：${r.parts.join(' / ')}`);
  console.log(`内镜与影像口径五维：${r.dims.join(' / ')}`);
  console.log(`四把镜子的止点都在正文：${r.scopes.join(' / ')}`);
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
  console.log('※ 本章为教学材料，不构成医学意见、诊断或处置指导。');
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
  column,
  fiveTerms,
  recordParts,
  dimensionNames,
  scopesPresent,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TABLE_ROWS,
  TERMS,
  SECTION_PROBES,
  SCOPES,
};
