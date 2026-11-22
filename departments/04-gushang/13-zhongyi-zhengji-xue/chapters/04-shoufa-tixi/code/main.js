#!/usr/bin/env node
/**
 * 中医整脊学 · 第 4 章 · 手法分三层，风险也分三层，两层必须一一对上
 * 课程: departments/04-gushang/13-zhongyi-zhengji-xue/chapters/04-shoufa-tixi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、三层的名称与作用对象、复测三种结果的对照表、
 *   响声的三种来源、关键判据词的出现次数，以及 quiz 里 check 题能对上几个四字原词。
 * 正文一改，重跑即可看出哪里对不上；测试再把这几个数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '4';
const SLUG = '04-shoufa-tixi';
const TITLE = '手法分三层，风险也分三层，两层必须一一对上';

/** 各表格的期望数据行数（不含表头与分隔行），按出现顺序 */
const TABLE_ROWS = [3];

/** 关键判据词：本章反复使用的术语，是正文与习题同源的最小证据 */
const TERMS = ['松解', '松动', '整复', '高速低幅', '空化', '不应期', '再评估', '终末感'];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '松解',
  '生理活动度的位置',
  '不应期',
  '定基线',
  '打开窗口',
  '层次',
  '「低风险」不等于「无风险」',
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

/** 小节里的无序条目（以「- 」开头），去掉标记与加粗 */
function bullets(sectionBody) {
  return String(sectionBody)
    .split(/\r?\n/)
    .filter((l) => /^-\s+/.test(l.trim()))
    .map((l) => l.trim().replace(/^-\s+/, '').replace(/\*\*/g, ''));
}

/** 三层：小节一里「**第N层，名。**」形式的段落，返回 { name, target } */
function layers(text = readDoc()) {
  const out = [];
  for (const line of sectionAt(text, 0).split(/\r?\n/)) {
    const m = /^\*\*(第[一二三]层，[\u4e00-\u9fff]+)。\*\*/.exec(line.trim());
    if (!m) continue;
    const rest = line.replace(/^\*\*[^*]+\*\*/, '');
    const target = (/作用对象是([^，。]+)/.exec(rest) || [null, ''])[1];
    out.push({ layer: m[1].split('，')[0], name: m[1].split('，')[1], target });
  }
  return out;
}

/** 复测三种结果：小节四表格的首列，按表中顺序 */
function retestOutcomes(text = readDoc()) {
  const blocks = tableBlocks(text);
  // 本章只有一张表，且落在小节四（评估—干预—再评估）
  const inSection = sectionAt(text, 3);
  const t = blocks.find((b) => b.rows.some((r) => inSection.includes(r[0])));
  return t ? t.rows.map((r) => r[0]) : [];
}

/** 响声的三种来源：小节三以「**其N是」开头的段落 */
function crackSources(text = readDoc()) {
  const out = [];
  for (const line of sectionAt(text, 2).split(/\r?\n/)) {
    const m = /^\*\*(其[一二三]是[^*]+)\*\*/.exec(line.trim());
    if (m) out.push(m[1].replace(/。$/, ''));
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
    layers: layers(text),
    outcomes: retestOutcomes(text),
    cracks: crackSources(text),
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
  console.log(`表格 ${r.tables.length} 张：`);
  r.tables.forEach((t, i) => console.log(`  #${i + 1}  ${t.rows} 行 × ${t.cols} 列  首列表头「${t.first}」`));
  console.log(`  复测的三种结果：${r.outcomes.join(' / ')}`);
  console.log('');
  console.log('三层（小节一现算）：');
  r.layers.forEach((l) => console.log(`  ${l.layer} · ${l.name} → 作用对象：${l.target || '（未取到）'}`));
  console.log('');
  console.log(`响声的三种来源（小节三现算）：${r.cracks.join(' / ')}`);
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
  console.log('※ 本章为教学材料，不构成诊疗建议，也不构成任何操作处方。');
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
  layers,
  retestOutcomes,
  crackSources,
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
