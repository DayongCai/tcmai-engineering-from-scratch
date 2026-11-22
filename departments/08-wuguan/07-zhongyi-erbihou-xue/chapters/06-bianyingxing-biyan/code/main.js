#!/usr/bin/env node
/**
 * 中医耳鼻喉科学 · 第 6 章 · 鼻鼽不是「反复感冒」：本虚标实，战场在两次发作之间
 * 课程: departments/08-wuguan/07-zhongyi-erbihou-xue/chapters/06-bianyingxing-biyan/docs/zh.md
 *
 * 本章的数字都由本脚本从正文现算，不手打：
 *   汉字数、二级小节与顺序、三枚指纹（发／痒／清）、三条不支持的表现、
 *   发作期—缓解期时间线的四行、第五节列了几条红线、关键判据词的出现次数，
 *   以及 quiz 的 check 题能在正文里对上几个四字原词。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '6';
const SLUG = '06-bianyingxing-biyan';
const TITLE = '鼻鼽不是「反复感冒」：本虚标实，战场在两次发作之间';

/** 表格期望数据行数：发作期—缓解期对照四行 */
const TABLE_ROWS = [4];

const TERMS = ['本虚标实', '温肺止流丹', '玉屏风散', '肺经伏热', '三伏贴', '腺样体', '卫表不固', '鼻鼽'];

/** 每节一个探针词：第 i 个必须出现在第 i 个二级小节 */
const SECTION_PROBES = ['三个字叠加', '两段时间线', '肺经伏热', '三伏贴', '不看有没有喘', '不给剂量'];

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

/** 三枚指纹：发、痒、清，各有自己的说明 */
function fingerprints(text) {
  const sec = sectionAt(text, 0);
  const out = [];
  for (const m of sec.matchAll(/\*\*(发|痒|清)\*\*——([^。\n]+)。/g)) {
    out.push({ mark: m[1], note: m[2].trim() });
  }
  return out;
}

/** 三条不支持鼻鼽的表现：从「反过来，有三条不支持鼻鼽」这一行里取 */
function exclusions(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('三条不支持鼻鼽')) || '';
  return [...line.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1].trim());
}

/** 时间线四行：左侧栏目名（病机／症状／治法／目标） */
function timeline(text) {
  const rows = (tableBlocks(text)[0] || { rows: [] }).rows;
  return rows.map((r) => r[0]);
}

/** 第五节红线：正文用 1. 2. 3. 编号 */
function redLines(text) {
  return [...sectionAt(text, 4).matchAll(/^(\d+)\. \*\*/gm)].map((m) => m[1]);
}

function conclusions(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    const i = line.indexOf('判据收束成一句');
    if (i >= 0) out.push(line.slice(i + '判据收束成一句'.length).replace(/^[:：]\s*/, '').trim());
  }
  return out;
}

/** 本章两处硬边界：伏热的判别条数、外治的辅助定位 */
function boundaries(text) {
  const line = (kw) => (String(text).split(/\r?\n/).find((l) => l.includes(kw)) || '').trim();
  return {
    heat: line('三条中占两条，就不要温补'),
    external: line('辅助不等于可有可无'),
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
    marks: fingerprints(text),
    exclusions: exclusions(text),
    timeline: timeline(text),
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
  console.log(`表格 ${r.tables.length} 张：`);
  r.tables.forEach((t, i) => console.log(`  #${i + 1}  ${t.rows} 行 × ${t.cols} 列  表头「${t.first || '（空）'}」`));
  console.log('');
  console.log('三枚指纹：');
  r.marks.forEach((m) => console.log(`  ${m.mark} —— ${m.note}`));
  console.log(`三条不支持：${r.exclusions.join('、')}`);
  console.log(`时间线四行：${r.timeline.join(' → ')}`);
  console.log(`第五节红线 ${r.red.length} 条（${r.red.join('、')}）`);
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
  fingerprints,
  exclusions,
  timeline,
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
