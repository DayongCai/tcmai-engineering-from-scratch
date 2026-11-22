#!/usr/bin/env node
/**
 * 中医正骨学 · 第 4 章 · 复位的成功标准写在功能里，不写在片子上
 * 课程: departments/04-gushang/06-zhongyi-zhenggu-xue/chapters/04-guzhe-zonglun/docs/zh.md
 * 教材: 《医宗金鉴·正骨心法要旨》；复位标准、夹缚原理与失败分型为教材归纳
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、复位前四查、夹板四机制、不动手的四类逻辑、失败四形态，
 *   以及 quiz 的 check 题能在正文里对上几个四字原词。
 * 正文一改，重跑即可看出哪里对不上；测试再把这几个数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '4';
const SLUG = '04-guzhe-zonglun';
const TITLE = '复位的成功标准写在功能里，不写在片子上';

/** 本章没有表格，全用段落组织 */
const TABLE_ROWS = [];

/** 关键判据词：本章反复使用的术语，是正文与习题同源的最小证据 */
const TERMS = [
  '解剖复位',
  '功能复位',
  '三点固定',
  '动静结合',
  '张力性水疱',
  '骨筋膜室',
  '依从性',
];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '嵌插骨折',
  '正侧位是底线',
  '禁忌不是一个清单',
  '三点固定',
  '陈旧',
  '本章不给具体的固定时限',
];

/** 转手术的硬指征（正文五条，条文里的关键词各取一个） */
const SURGERY_KEYS = ['闭合复位失败或无法维持', '关节内骨折移位', '血管神经损伤', '开放性骨折', '多发伤'];

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

/** 复位前的四查（第二节的四个加粗开头） */
const fourChecks = () => boldLeads(sectionAt(readDoc(), 1));

/** 夹板固定的四个机制（第四节的四个加粗开头） */
const fourMechanisms = () => boldLeads(sectionAt(readDoc(), 3));

/** 失败四形态（第五节的四个加粗开头） */
const failureModes = () => boldLeads(sectionAt(readDoc(), 4));

/** 不动手的四类逻辑：第三节的「第一类，……」四句 */
function fourBarriers() {
  const out = [];
  for (const m of sectionAt(readDoc(), 2).matchAll(/第([一二三四])类，(.+?)[。：]/g)) out.push(m[2].trim());
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
    surgery: SURGERY_KEYS.map((t) => ({ term: t, ok: text.includes(t) })),
    checks: fourChecks(),
    mechanisms: fourMechanisms(),
    failures: failureModes(),
    barriers: fourBarriers(),
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
  console.log(`复位前的四查（正文现算，${r.checks.length} 项）：${r.checks.join(' / ')}`);
  console.log(`不动手的四类逻辑（正文现算，${r.barriers.length} 类）：`);
  r.barriers.forEach((b, i) => console.log(`  ${i + 1}. ${b}`));
  console.log(`夹板的四个机制（正文现算，${r.mechanisms.length} 个）：${r.mechanisms.join(' / ')}`);
  console.log(`失败的四种形态（正文现算，${r.failures.length} 种）：`);
  r.failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  console.log('');
  console.log('转手术的硬指征（逐条核对）：');
  console.log('  ' + r.surgery.map((c) => `${c.ok ? '✓' : '✗'} ${c.term}`).join(' · '));
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
  fourChecks,
  fourMechanisms,
  failureModes,
  fourBarriers,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TABLE_ROWS,
  TERMS,
  SECTION_PROBES,
  SURGERY_KEYS,
};
