#!/usr/bin/env node
/**
 * 中医耳鼻喉科学 · 第 4 章 · 咽痛分两种：一种是火，一种是堵住的那口气
 * 课程: departments/08-wuguan/07-zhongyi-erbihou-xue/chapters/04-yanhou-bing/docs/zh.md
 *
 * 本章的数字都由本脚本从正文现算，不手打：
 *   汉字数、二级小节与顺序、分诊四字各自的病名、三凹征的三个位置、
 *   第五节列了几条红线、关键判据词的出现次数，以及 quiz 的 check 题
 *   能在正文里对上几个四字原词。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '4';
const SLUG = '04-yanhou-bing';
const TITLE = '咽痛分两种：一种是火，一种是堵住的那口气';

/** 本章正文没有表格；测试据此断言「一张都没有」 */
const TABLE_ROWS = [];

const TERMS = ['喉痹', '乳蛾', '喉痈', '急喉风', '梅核气', '三凹征', '炙脔', '会厌逐瘀汤'];

/** 每节一个探针词：第 i 个必须出现在第 i 个二级小节 */
const SECTION_PROBES = ['危险度倒序', '黏膜的颜色', '有没有脓腔', '进食无障碍', '不能等一分钟', '不给剂量'];

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

/** 分诊四字：痛、肿、阻、梗 各自指向哪个病，顺序即危险度倒序 */
function triage(text) {
  const sec = sectionAt(text, 0);
  const out = [];
  for (const m of sec.matchAll(/\*\*(痛|肿|阻|梗)——([^*]+?)。\*\*/g)) {
    out.push({ sign: m[1], diseases: m[2].split('与') });
  }
  return out;
}

/** 三凹征的三个位置：从正文定义句里拆出来，不写死 */
function depressionSites(text) {
  const m = /三凹征指([^吸]{2,40})吸气时凹陷/.exec(text);
  return m ? m[1].split('、').map((s) => s.trim()) : [];
}

/** 第五节自身编号的红线（三种不能过夜的表现） */
function redLines(text) {
  return [...sectionAt(text, 4).matchAll(/^\*\*([一二三四五六])、/gm)].map((m) => m[1]);
}

function conclusions(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    const i = line.indexOf('判据收束成一句');
    if (i >= 0) out.push(line.slice(i + '判据收束成一句'.length).replace(/^[:：]\s*/, '').trim());
  }
  return out;
}

/** 本章两处硬边界：梅核气的排除性条件、喉阻塞的转诊界线 */
function boundaries(text) {
  const line = (kw) => (String(text).split(/\r?\n/).find((l) => l.includes(kw)) || '').trim();
  return {
    globus: line('进食固体受阻'),
    airway: line('Ⅱ度以上即应做好'),
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
    triage: triage(text),
    sites: depressionSites(text),
    red: redLines(text),
    conclusions: conclusions(text),
    bounds: boundaries(text),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医耳鼻喉科学 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`表格 ${r.tables.length} 张（本章无表）`);
  console.log('');
  console.log('分诊四字（顺序即危险度倒序）：');
  r.triage.forEach((t) => console.log(`  ${t.sign} → ${t.diseases.join(' / ')}`));
  console.log('');
  console.log(`三凹征 ${r.sites.length} 处：${r.sites.join('、')}`);
  console.log(`红线 ${r.red.length} 条（第五节自身编号：${r.red.join('、')}）`);
  console.log('');
  console.log('关键判据（出现次数）：');
  console.log('  ' + r.terms.map((x) => `${x.term} ${x.count}`).join(' · '));
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log('判据收束：');
  r.conclusions.forEach((c) => console.log('  ' + c));
  console.log('');
  console.log(`quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`);
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
  triage,
  depressionSites,
  redLines,
  conclusions,
  boundaries,
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
