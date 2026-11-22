#!/usr/bin/env node
/**
 * 中医眼科学 · 第 2 章 · 四诊：眼科最贵的那五分钟是问出来的
 * 课程: departments/08-wuguan/06-zhongyi-yanke-xue/chapters/02-sizhen-shili/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、「看不清」覆盖的六类病、三个限定词、
 *   望诊五个区的表格、视力检查的四条纪律，以及 quiz 的 check 题接地情况。
 * 正文一改，重跑即可看出哪里对不上；测试再把这些数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 2;
const SLUG = '02-sizhen-shili';
const TITLE = '四诊：眼科最贵的那五分钟是问出来的';

/** 关键判据词：本章反复使用的术语，是正文与习题同源的最小证据 */
const TERMS = ['限定词', '抱轮红赤', '白睛混赤', '单眼遮盖', '散瞳', '樱桃红斑', '分诊表'];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '三个限定词',
  '分诊表',
  '看得有序',
  '把望诊的分辨率提高一个量级',
  '裸眼视力与矫正视力必须分开记',
  '本章不列视力表的标准检查距离',
];

/** 视力检查的四条纪律（正文原句，缺一条就等于放弃了可解释性） */
const FOUR_RULES = [
  '裸眼视力与矫正视力必须分开记',
  '单眼分别查',
  '儿童用适龄方法',
  '治疗前后必须同法、同表、同距离',
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

/** 某节里以「**……**」开头的条目 */
function boldLeads(sectionBody) {
  const out = [];
  for (const line of String(sectionBody).split(/\r?\n/)) {
    const m = /^\*\*(.+?)\*\*/.exec(line.trim());
    if (m) out.push(m[1].replace(/[。.]$/, ''));
  }
  return out;
}

/**
 * 「看不清」覆盖的六类病：正文「它至少覆盖六种完全不同的东西：甲、乙……"
 * 一句，从句号收口，按顿号切开（最后一项前有「以及」）。
 */
function sixKinds() {
  const line = readDoc().split(/\r?\n/).find((l) => l.includes('完全不同的东西')) || '';
  const tail = (/东西[：:](.+?)。/.exec(line) || [null, ''])[1];
  return tail
    .split(/[、，,]/)
    .map((s) => s.replace(/^以及/, '').trim())
    .filter(Boolean);
}

/** 三个限定词：第一节里以粗体起头的三项 */
const limiters = (text) => boldLeads(sectionAt(text, 0));

/** 望诊五区：第二张表的第一列，按正文顺序 */
function examRegions(text) {
  const block = tableBlocks(text)[1];
  return block ? block.rows.map((r) => ({ region: r[0], wheel: r[1], first: r[2] })) : [];
}

/** 六种主诉说法：第一张表的第一列 */
function complaints(text) {
  const block = tableBlocks(text)[0];
  return block ? block.rows.map((r) => r[0]) : [];
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
    kinds: sixKinds(),
    limiters: limiters(text),
    regions: examRegions(text),
    complaints: complaints(text),
    terms: TERMS.map((t) => ({ term: t, count: occurrences(text, t) })),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).includes(p) })),
    rules: FOUR_RULES.map((t) => ({ rule: t, ok: text.includes(t) })),
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
  console.log(`「看不清」覆盖的 ${r.kinds.length} 类病（正文现算）：`);
  r.kinds.forEach((k, i) => console.log(`  ${i + 1}. ${k}`));
  console.log('');
  console.log(`把它分开的三个限定词（正文现算，${r.limiters.length} 个）：${r.limiters.join(' / ')}`);
  console.log('');
  console.log('望诊五区（从正文表格现读）：');
  for (const x of r.regions) console.log(`  ${x.region} · ${x.wheel} · 先看：${x.first}`);
  console.log('');
  console.log('六种主诉说法（表格第一列）：');
  console.log('  ' + r.complaints.join(' / '));
  console.log('');
  console.log('视力检查的四条纪律：');
  console.log('  ' + r.rules.map((x) => `${x.ok ? '✓' : '✗'} ${x.rule}`).join(' · '));
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
  console.log('※ 本章为教学材料，不构成诊断或治疗建议；检查操作与判读须由具资质的眼科人员执行。');
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
  boldLeads,
  sixKinds,
  limiters,
  examRegions,
  complaints,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  FOUR_RULES,
};
