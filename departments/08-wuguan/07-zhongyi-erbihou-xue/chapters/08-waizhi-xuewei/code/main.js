#!/usr/bin/env node
/**
 * 中医耳鼻喉科学 · 第 8 章 · 外治不是辅助：药到不了的地方，要靠路走进去
 * 课程: departments/08-wuguan/07-zhongyi-erbihou-xue/chapters/08-waizhi-xuewei/docs/zh.md
 *
 * 本章的数字都由本脚本从正文现算，不手打：
 *   汉字数、二级小节与顺序、路径三问、三种动作的接触时间排序、
 *   位置×动作那张表的行列、取穴三原则、第五节四条安全边界、
 *   关键判据词的出现次数，以及 quiz 的 check 题能对上几个四字原词。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '8';
const SLUG = '08-waizhi-xuewei';
const TITLE = '外治不是辅助：药到不了的地方，要靠路走进去';

/** 表格期望数据行数：外耳道／鼻腔／咽喉 三行，四种列（位置＋三类动作） */
const TABLE_ROWS = [3];

const TERMS = ['耳浴', '鼓膜穿孔', '咽鼓管', '天突', '人迎', '翳风', '迎香', '三伏贴'];

/** 每节一个探针词：第 i 个必须出现在第 i 个二级小节 */
const SECTION_PROBES = ['给药路径', '脓液较多时不宜吹药', '先冲洗，后给药', '吞咽动作会把药带走', '不可深刺', '不给药物浓度'];

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

/** 路径三问：药到哪里、什么挡着、会不会走错路 */
function routeQuestions(text) {
  return [...sectionAt(text, 0).matchAll(/^\d\. \*\*([^*]+)\*\*/gm)].map((m) => m[1].trim());
}

/** 接触时间排序：粉剂 > 液体 > 雾化，从正文明文里读次序 */
function contactOrder(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('粉剂停留最久')) || '';
  return ['粉剂', '液体', '雾化'].filter((k) => line.includes(k));
}

/** 取穴三原则 */
function principles(text) {
  return [...sectionAt(text, 4).matchAll(/\*\*(局部取穴|循经取穴|辨证取穴)\*\*/g)].map((m) => m[1]);
}

/** 第五节的安全边界：正文用 1～4 编号 */
function safety(text) {
  return [...sectionAt(text, 4).matchAll(/^(\d+)\. \*\*/gm)].map((m) => m[1]);
}

/** 表格里「位置」一列：三个给药位置 */
function sites(text) {
  return ((tableBlocks(text)[0] || { rows: [] }).rows || []).map((r) => r[0]);
}

function conclusions(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    const i = line.indexOf('判据收束成一句');
    if (i >= 0) out.push(line.slice(i + '判据收束成一句'.length).replace(/^[:：]\s*/, '').trim());
  }
  return out;
}

/** 本章两处硬边界：鼓膜穿孔的通用约束、颈部穴位 */
function boundaries(text) {
  const line = (kw) => (String(text).split(/\r?\n/).find((l) => l.includes(kw)) || '').trim();
  return {
    perforation: line('穿孔耳的处理'),
    neck: line('颈部穴位。'),
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
    questions: routeQuestions(text),
    contact: contactOrder(text),
    principles: principles(text),
    safety: safety(text),
    sites: sites(text),
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
  r.tables.forEach((t, i) => console.log(`  #${i + 1}  ${t.rows} 行 × ${t.cols} 列  首列表头「${t.first}」`));
  console.log('');
  console.log('路径三问：');
  r.questions.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
  console.log(`接触时间由长到短：${r.contact.join(' → ')}`);
  console.log(`给药位置 ${r.sites.length} 个：${r.sites.join('／')}`);
  console.log('');
  console.log(`取穴三原则：${r.principles.join('、')}；安全边界 ${r.safety.length} 条（${r.safety.join('、')}）`);
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
  routeQuestions,
  contactOrder,
  principles,
  safety,
  sites,
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
