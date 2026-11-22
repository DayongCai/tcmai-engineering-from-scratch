#!/usr/bin/env node
/**
 * 中医整脊学 · 第 7 章 · 骨盆是地基，但「地基歪了」是最容易被滥用的一句话
 * 课程: departments/04-gushang/13-zhongyi-zhengji-xue/chapters/07-gupen-xiayao/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、三类腿长差、骨盆与下肢三层的安排、
 *   关键判据词的出现次数，以及 quiz 里 check 题能对上几个四字原词。
 * 正文一改，重跑即可看出哪里对不上；测试再把这几个数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '7';
const SLUG = '07-gupen-xiayao';
const TITLE = '骨盆是地基，但「地基歪了」是最容易被滥用的一句话';

/** 各表格的期望数据行数（不含表头与分隔行）；本章无表格 */
const TABLE_ROWS = [];

/** 关键判据词：本章反复使用的术语，是正文与习题同源的最小证据 */
const TERMS = ['骶髂关节', '功能性腿长差', '骨盆前倾', '髂前上棘', '旋前', '支具', '活动度', '错位'];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '毫米',
  '卷尺',
  '髋关节的活动度',
  '双向',
  '配角',
  '可复测',
  '不宣称手法能改变骨盆的位置',
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

/** 按二级标题切段，返回 [{ title, body }]；body 含标题行本身 */
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

/** 表格：连续以 | 开头的行成块（本章无表格，保留以求口径统一） */
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

/** 正文里长度为 n 的连续汉字片段集合 */
function grams(text, n = GRAM) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 小节里的无序条目（以「- 」开头），去掉标记与加粗 */
function bullets(sectionBody) {
  return String(sectionBody)
    .split(/\r?\n/)
    .filter((l) => /^-\s+/.test(l.trim()))
    .map((l) => l.trim().replace(/^-\s+/, '').replace(/\*\*/g, ''));
}

/** 三类腿长差：小节二里以「**……」开头的段落 */
function legLengthKinds(text = readDoc()) {
  const out = [];
  for (const line of sectionAt(text, 1).split(/\r?\n/)) {
    const m = /^\*\*([^*]+)\*\*/.exec(line.trim());
    if (m) out.push(m[1].replace(/。$/, ''));
  }
  return out;
}

/** 骨盆与下肢的三层：小节五条目，取冒号前的段名 */
const layerPlan = (text = readDoc()) =>
  bullets(sectionAt(text, 4))
    .map((b) => String(b).split('：')[0].trim())
    .filter(Boolean);

/** 比倾斜角度更有解释力的三样：小节三里加粗的三个词 */
function betterThanTilt(text = readDoc()) {
  const sec = sectionAt(text, 2);
  const out = [];
  for (const m of sec.matchAll(/\*\*([^*]{2,12})\*\*/g)) {
    const w = m[1].replace(/[（）]/g, '').trim();
    if (/活动度|稳定性|负荷管理/.test(w) && !out.includes(w)) out.push(w);
  }
  return out;
}

/** quiz 的结构与接地情况：check 题的正确选项能对上几个四字原词 */
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
    tables: blocks.map((b) => ({ cols: (b.head || []).length, rows: b.rows.length, first: (b.head || [])[0] || '' })),
    terms: TERMS.map((t) => ({ term: t, count: occurrences(text, t) })),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).includes(p) })),
    kinds: legLengthKinds(text),
    plan: layerPlan(text),
    tilt: betterThanTilt(text),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医整脊学 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`表格 ${r.tables.length} 张：本章全用段落与条目组织。`);
  console.log('');
  console.log(`三类腿长差（小节二现算，共 ${r.kinds.length} 类）：`);
  r.kinds.forEach((k, i) => console.log(`  ${i + 1}. ${k}`));
  console.log('');
  console.log(`骨盆与下肢的层次（小节五条目现算）：${r.plan.join(' / ')}`);
  console.log(`比倾斜角度更有解释力的三样：${r.tilt.join(' / ')}`);
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
  console.log('※ 本章为教学材料，不构成诊疗建议，也不构成矫正处方。');
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
  bullets,
  legLengthKinds,
  layerPlan,
  betterThanTilt,
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
