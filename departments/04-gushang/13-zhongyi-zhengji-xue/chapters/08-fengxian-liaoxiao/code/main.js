#!/usr/bin/env node
/**
 * 中医整脊学 · 第 8 章 · 不良事件不是意外，是可以分类的事件
 * 课程: departments/04-gushang/13-zhongyi-zhengji-xue/chapters/08-fengxian-liaoxiao/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、三类禁忌、不良事件三级的对照表、转诊表、
 *   疗效评价的四个陷阱、随访的四个节点，以及 quiz 里 check 题能对上几个四字原词。
 * 正文一改，重跑即可看出哪里对不上；测试再把这几个数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '8';
const SLUG = '08-fengxian-liaoxiao';
const TITLE = '不良事件不是意外，是可以分类的事件';

/** 各表格的期望数据行数（不含表头与分隔行），按出现顺序：事件分级表、转诊表 */
const TABLE_ROWS = [3, 5];

/** 关键判据词：本章反复使用的术语，是正文与习题同源的最小证据 */
const TERMS = ['绝对禁忌', '相对禁忌', '时机性禁忌', '不良事件', '自然病程', '回归均值', '知情同意', '随访'];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '时机性禁忌',
  '中度',
  '回归均值',
  '退出规则',
  '不进入',
  '随时可停',
  '因果关系尚未确定',
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

/** 三类禁忌：小节一以「**第N类，……」开头的段落 */
function contraindicationKinds(text = readDoc()) {
  const out = [];
  for (const line of sectionAt(text, 0).split(/\r?\n/)) {
    const m = /^\*\*(第[一二三]类，[^*]+)\*\*/.exec(line.trim());
    if (m) out.push(m[1].replace(/。$/, ''));
  }
  return out;
}

/** 不良事件三级：第一张表的首列 */
function severityLevels(text = readDoc()) {
  const t = tableBlocks(text)[0];
  return t ? t.rows.map((r) => r[0]) : [];
}

/** 转诊表：第二张表的数据行（情形 → 去向） */
function referralRows(text = readDoc()) {
  const t = tableBlocks(text)[1];
  return t ? t.rows.map((r) => ({ case: r[0], to: r[1] })) : [];
}

/** 疗效评价的四个陷阱：小节三以「**其N，……」开头的段落 */
function pitfalls(text = readDoc()) {
  const out = [];
  for (const line of sectionAt(text, 2).split(/\r?\n/)) {
    const m = /^\*\*(其[一二三四]，[^*]+)\*\*/.exec(line.trim());
    if (m) out.push(m[1].replace(/。$/, ''));
  }
  return out;
}

/** 随访四个节点：小节四的条目，取冒号前的时点 */
const followupNodes = (text = readDoc()) =>
  bullets(sectionAt(text, 3))
    .map((b) => String(b).split('：')[0].trim())
    .filter(Boolean);

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
    kinds: contraindicationKinds(text),
    severity: severityLevels(text),
    referrals: referralRows(text),
    pitfalls: pitfalls(text),
    followups: followupNodes(text),
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
  console.log('');
  console.log(`三类禁忌（小节一现算，共 ${r.kinds.length} 类）：`);
  r.kinds.forEach((k, i) => console.log(`  ${i + 1}. ${k}`));
  console.log('');
  console.log(`不良事件分级（表一现算）：${r.severity.join(' / ')}`);
  console.log(`转诊表 ${r.referrals.length} 行：`);
  r.referrals.forEach((x, i) => console.log(`  ${i + 1}. ${x.case} → ${x.to}`));
  console.log('');
  console.log(`疗效评价的四个陷阱（小节三现算）：${r.pitfalls.join(' / ')}`);
  console.log(`随访四个节点（小节四现算）：${r.followups.join(' / ')}`);
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
  console.log('※ 本章为教学材料，不构成诊疗建议，也不提供事件发生率数字。');
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
  contraindicationKinds,
  severityLevels,
  referralRows,
  pitfalls,
  followupNodes,
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
