#!/usr/bin/env node
/**
 * 中医眼科学 · 第 3 章 · 外障：五个字定方向，虚实定用药
 * 课程: departments/08-wuguan/06-zhongyi-yanke-xue/chapters/03-waizhang-yanbing/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、五个字的表格、三个区的归属句、
 *   天行赤眼与暴风客热的两条区别、外障三种虚证，以及 quiz 的 check 题接地情况。
 * 正文一改，重跑即可看出哪里对不上；测试再把这些数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 3;
const SLUG = '03-waizhang-yanbing';
const TITLE = '外障：五个字定方向，虚实定用药';

/** 关键判据词：本章反复使用的术语，是正文与习题同源的最小证据 */
const TERMS = ['外障', '一望即知', '抱轮红赤', '天行赤眼', '暴风客热', '漏睛', '胬肉攀睛', '火疳'];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '一望即知',
  '并行采集',
  '漏睛按压内眦有脓液溢出',
  '一人害眼，传于一家',
  '苦寒药本身也有代价',
  '本章不给方剂组成与剂量',
];

/** 外障三种「看得见的虚」：正文用其一、其二、其三列出 */
const VOID_SIGNS = ['翳久不敛', '白睛青蓝', '上胞下垂'];

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

/** 五个字：正文「红、肿、痛、眵、泪」表格的第一列，按正文顺序 */
function fiveChars(text) {
  const block = tableBlocks(text)[0];
  return block ? block.rows.map((r) => ({ char: r[0], see: r[1], points: r[2] })) : [];
}

/** 三个区的归属：正文「三个区各有归属：甲，乙，丙」一句 */
function threeAreas(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('三个区各有归属')) || '';
  const tail = (/归属[：:](.+?)。/.exec(line) || [null, ''])[1];
  return tail.split(/[，,]/).map((s) => s.trim()).filter(Boolean);
}

/** 天行赤眼与暴风客热的两条区别：正文「第一是**传染**」「第二是**出血与淋巴结**」 */
function twoDifferences(text) {
  const out = [];
  const body = sectionAt(text, 3);
  const re = /第[一二]是\*\*(.+?)\*\*/g;
  let m;
  while ((m = re.exec(body)) !== null) out.push(m[1]);
  return out;
}

/** 第一节的共享判据句：抓「共享一条判据：……」 */
function sharedCriterion(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('共享一条判据')) || '';
  return (/判据[：:]\*\*(.+?)\*\*/.exec(line) || /判据[：:](.+?)。/.exec(line) || [null, ''])[1];
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
    chars: fiveChars(text),
    areas: threeAreas(text),
    criterion: sharedCriterion(text),
    differences: twoDifferences(text),
    voids: VOID_SIGNS.map((v) => ({ sign: v, ok: sectionAt(text, 4).includes(v) })),
    terms: TERMS.map((t) => ({ term: t, count: occurrences(text, t) })),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).includes(p) })),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医眼科学 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个 · 表格 ${r.tables.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`三个区共享的判据（正文现算）：${r.criterion}`);
  console.log('');
  console.log(`三个区的归属（正文现算，${r.areas.length} 项）：`);
  r.areas.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));
  console.log('');
  console.log(`五个字（表格第一列，${r.chars.length} 字）：${r.chars.map((c) => c.char).join(' ')}`);
  for (const c of r.chars) console.log(`  ${c.char} · 看：${c.see} → ${c.points}`);
  console.log('');
  console.log(`天行赤眼与暴风客热的两条区别（正文现算，${r.differences.length} 条）：${r.differences.join(' / ')}`);
  console.log('');
  console.log('外障三种「看得见的虚」：');
  console.log('  ' + r.voids.map((v) => `${v.ok ? '✓' : '✗'} ${v.sign}`).join(' · '));
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
  console.log('※ 本章为教学材料，不构成诊断、处方或手术建议；传染性眼病须依当地公共卫生要求处置。');
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
  fiveChars,
  threeAreas,
  twoDifferences,
  sharedCriterion,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  VOID_SIGNS,
};
