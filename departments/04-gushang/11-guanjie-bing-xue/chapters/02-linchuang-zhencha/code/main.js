#!/usr/bin/env node
/**
 * 关节病学 · 第 2 章 · 关节病的体征长得很慢，判据必须写在流程里
 * 课程: departments/04-gushang/11-guanjie-bing-xue/chapters/02-linchuang-zhencha/docs/zh.md
 * 数据: 本章正文 docs/zh.md + quiz.json —— 数字与清单全部由本脚本从正文现算，不手打
 * 依赖: 仅 Node.js 标准库
 *
 * 现算的内容：正文汉字数、二级标题与顺序、表格行数与列数、记录五段与三层分级的名称、
 * 关键判据词频、quiz 的段位分布，以及 check 题的正确选项能在正文里对上几个原词。
 * 正文改一个字，重跑就能看出哪一处对不上；测试再把这些数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '2';
const SLUG = '02-linchuang-zhencha';
const TITLE = '关节病的体征长得很慢，判据必须写在流程里';

/** 各表格的期望数据行数（不含表头与分隔行）；本章没有表格时为空数组 */
const TABLE_ROWS = [];

/** 关键判据词：本章反复使用的术语，是正文与习题同源的最小证据 */
const TERMS = [
  "晨僵",
  "骨性肿大",
  "滑膜性",
  "关节计数",
  "力线",
  "握力",
  "窦道",
  "红层"
];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  "时间轴比部位",
  "压不下去",
  "五件事",
  "四个方向的观察",
  "三十秒内接手"
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

/** 表格：连续以 | 开头的行成块；首行为表头，第二行为分隔行，其余为数据行 */
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

const presentCount = (text, terms) => terms.filter((t) => occurrences(text, t) > 0).length;

/** 某一节里以给定序号词起头的段落，按出现顺序返回 */
function leadingLines(text, sectionIndex, re) {
  return sectionAt(text, sectionIndex)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => re.test(l));
}

/** 第五节写下的记录五段：第一段至第五段，各取起头那一句 */
function recordSections(text) {
  return leadingLines(text, 4, /^第[一二三四五]段，/).map((l) => l.replace(/^第[一二三四五]段，/, '').slice(0, 14));
}

/** 三层分级：绿、黄、红，取自第五节同一段的括号说明 */
function triageLayers(text) {
  const sec = sectionAt(text, 4);
  return ['绿', '黄', '红']
    .map((k) => {
      const m = new RegExp(k + '（([^）]+)）').exec(sec);
      return { layer: k, note: m ? m[1] : null };
    });
}

function extra(text) {
  return { record: recordSections(text), layers: triageLayers(text) };
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
    rich: hits.filter((h) => new Set(h.grams).size >= 2).length,
    hits,
    spread: new Set(qs.map((q) => q.correct)).size,
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const blocks = tableBlocks(text);
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    tables: blocks.map((b) => ({ cols: b.head.length, rows: b.rows.length, first: b.head[0] || '' })),
    terms: TERMS.map((t) => ({ term: t, count: occurrences(text, t) })),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).includes(p) })),
    extra: extra(text),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`关节病学 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`表格 ${r.tables.length} 张${r.tables.length ? '：' : '（本章无表格）'}`);
  r.tables.forEach((t, i) => console.log(`  #${i + 1}  ${t.rows} 行 × ${t.cols} 列  首列表头「${t.first}」`));
  console.log('');
  console.log(`记录五段（${r.extra.record.length} 段）：`);
  r.extra.record.forEach((x, i) => console.log(`  ${i + 1}. ${x}…`));
  console.log('');
  console.log('三层分级：' + r.extra.layers.map((x) => `${x.layer}${x.note ? '（' + x.note + '）' : '（缺）'}`).join(' · '));
  console.log('');
  console.log('关键判据（出现次数）：');
  console.log('  ' + r.terms.map((x) => `${x.term} ${x.count}`).join(' · '));
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· 正确项落在 ${r.quiz.spread} 个不同下标`,
  );
  console.log(`check 题接地 ${r.quiz.grounded} 道（门槛 ≥2），其中带两个以上原词 ${r.quiz.rich} 道`);
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
  leadingLines,
  recordSections,
  triageLayers,
  leadingLines,

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
