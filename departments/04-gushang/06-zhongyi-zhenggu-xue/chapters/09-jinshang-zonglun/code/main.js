#!/usr/bin/env node
/**
 * 中医正骨学 · 第 9 章 · 筋伤不是「没有骨折」，是另一类损伤
 * 课程: departments/04-gushang/06-zhongyi-zhenggu-xue/chapters/09-jinshang-zonglun/docs/zh.md
 * 教材: 《素问·痿论》；急性期处理与慢性机制为教材归纳
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、筋的两项职守、急性期三个错误、慢性三种机制、
 *   诊断三样东西，以及 quiz 的 check 题能在正文里对上几个四字原词。
 * 正文一改，重跑即可看出哪里对不上；测试再把这几个数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '9';
const SLUG = '09-jinshang-zonglun';
const TITLE = '筋伤不是「没有骨折」，是另一类损伤';

/** 本章没有表格，全用段落组织 */
const TABLE_ROWS = [];

/** 关键判据词：本章反复使用的术语，是正文与习题同源的最小证据 */
const TERMS = [
  '束骨',
  '利机关',
  '筋出槽',
  '骨错缝',
  '抗阻试验',
  '稳定性试验',
  '载荷管理',
];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '利机关',
  '已排除结构损伤',
  '还在不在肿',
  '载荷管理',
  '抗阻试验',
  '本章不写具体的固定方式',
];

/** 筋伤诊断的三样东西（第五节的三个加粗开头） */
const DIAGNOSIS = ['压痛点', '抗阻试验', '稳定性试验'];

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

/** 表格：连续以 | 开头的行成块；单元格去掉首尾竖线 */
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

/** 小节里的有序列表编号（1. 2. …） */
function orderedItems(sectionBody) {
  const nums = [];
  for (const line of String(sectionBody).split(/\r?\n/)) {
    const m = /^\s*(\d+)\.\s+/.exec(line);
    if (m) nums.push(Number(m[1]));
  }
  return nums;
}

/** 小节里以「- **」开头的条目数 */
const boldBullets = (sectionBody) => String(sectionBody).split(/\r?\n/).filter((l) => /^-\s+\*\*/.test(l.trim())).length;

/** 这组词里在正文出现过的个数 */
const presentCount = (text, terms) => terms.filter((t) => occurrences(text, t) > 0).length;

/** 小节里每个以「**小标题。**」起头的段落的标题 */
function boldLeads(sectionBody) {
  const out = [];
  for (const line of String(sectionBody).split(/\r?\n/)) {
    const m = /^\*\*([^*]{2,30}?)。\*\*/.exec(line.trim());
    if (m) out.push(m[1].trim());
  }
  return out;
}

/** 并列条目的提取：「一……二……三……」的中文序号句 */
function ordinals(sectionBody) {
  const out = [];
  for (const m of String(sectionBody).matchAll(/([一二三四五])(?:是|、)?([^。；]{2,80}?)[。；]/g)) out.push(m[2].trim());
  return out;
}

/** 筋的两项职守：第一节「束骨，是……利机关，是……」 */
function twoDuties() {
  const out = [];
  for (const m of sectionAt(readDoc(), 0).matchAll(/(束骨|利机关)，是(.+?)。/g)) out.push(`${m[1]}：${m[2].trim()}`);
  return out;
}

/** 慢性筋伤三种机制（第四节的三个加粗开头） */
const chronic = () => boldLeads(sectionAt(readDoc(), 3));

/** 诊断的三样东西（第五节的三个加粗开头） */
const diagnosis = () => boldLeads(sectionAt(readDoc(), 4));

/** 急性期三个错误：第三节「一是……二是……三是……」 */
function threeMistakes() {
  const out = [];
  for (const m of sectionAt(readDoc(), 2).matchAll(/([一二三])是([^：:]+)[：:]/g)) out.push(m[2].trim());
  return out;
}

/** 「筋出槽」三个条件：第二节「一是有……二是有……三是已排除……」 */
function threeConditions() {
  const out = [];
  for (const m of sectionAt(readDoc(), 1).matchAll(/([一二三])是([^。；]{2,80}?)[。；]/g)) out.push(m[2].trim());
  return out;
}

/** quiz 的结构与接地情况：check 题的正确选项能对上几个四字原词 */
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
    triage: DIAGNOSIS.map((t) => ({ term: t, ok: text.includes(t) })),
    duties: twoDuties(),
    mistakes: threeMistakes(),
    conditions: threeConditions(),
    chronic: chronic(),
    diagnosis: diagnosis(),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医正骨学 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`筋的两项职守（正文现算，${r.duties.length} 项）：`);
  r.duties.forEach((x, i) => console.log(`  ${i + 1}. ${x}`));
  console.log(`「筋出槽」的三个使用条件（正文现算，${r.conditions.length} 条）：`);
  r.conditions.forEach((x, i) => console.log(`  ${i + 1}. ${x}`));
  console.log(`急性期三个错误（正文现算，${r.mistakes.length} 条）：${r.mistakes.join(' / ')}`);
  console.log(`慢性筋伤三种机制（正文现算，${r.chronic.length} 种）：${r.chronic.join(' / ')}`);
  console.log(`诊断三样东西（正文现算，${r.diagnosis.length} 样）：${r.diagnosis.join(' / ')}`);
  console.log('');
  console.log('诊断三样（逐条核对）：');
  console.log('  ' + r.triage.map((c) => `${c.ok ? '✓' : '✗'} ${c.term}`).join(' · '));
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
  console.log('※ 本章为教学材料，不构成诊疗建议、诊断或治疗指导。');
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
  orderedItems,
  boldBullets,
  presentCount,
  boldLeads,
  ordinals,
  twoDuties,
  threeMistakes,
  threeConditions,
  chronic,
  diagnosis,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TABLE_ROWS,
  TERMS,
  SECTION_PROBES,
  DIAGNOSIS,
};
