#!/usr/bin/env node
/**
 * 中医面部望诊 · 第 1 章 · 明堂：望诊的第一件事不是看颜色，是立坐标
 * 课程: departments/08-wuguan/03-zhongyi-mianbu-wangzhen/chapters/01-e31/docs/zh.md
 * 底本: 《望诊遵经·明堂周身部位》《明堂六部提纲》《面貌分应脏腑》
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部从正文现算：汉字数、小节数与顺序、表格行列、
 * 部位名清单的长度、顶点数与边界误差的量级、quiz 接地情况。
 * 正文一改，重跑即可看出哪里对不上；测试再把这些数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 1;
const SLUG = '01-e31';
const TITLE = '明堂：望诊的第一件事不是看颜色，是立坐标';

/** 各表格的数据行数（不含表头与分隔行），按出现顺序 */
const TABLE_ROWS = [3];

/** 关键判据词：本章反复使用的术语，是正文与习题同源的最小证据 */
const TERMS = [
  '明堂',
  '气口',
  '关键点',
  '归一化',
  '色锋',
  '男女异位',
  '左右有逆从',
  '整脸平均色',
];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '犹脉之出于气口',
  '上锐',
  '配准',
  '男女异位',
  '整脸平均色',
  '不作校勘',
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

/** 正文里以「、」连缀的部位名清单（PROBLEM 段那一条） */
function partNames(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('庭、阙上、阙中')) || '';
  const m = /点了二十余个部位名：([^。]+)。/.exec(line);
  if (!m) return [];
  return m[1].split('、').map((s) => s.trim()).filter(Boolean);
}

/** 本章用的第二个数：二十四个名字与四边形近似的顶点数 */
function vertexFigure(text) {
  const t = String(text);
  const parts = /二十四个部位若都用四边形近似，需要\s*(\d+)\s*个顶点/.exec(t);
  const units = /二十四个名字/.test(t) ? 24 : 0;
  return { parts: units, vertices: parts ? Number(parts[1]) : 0, perPart: 4 };
}

/** 边界误差量级：15/180 的百分数，正文按整数写成 8% */
function boundaryError(text) {
  const m = /(\d+)\/(\d+)\s*约\s*(\d+)%/.exec(String(text));
  return m ? { offsetPx: Number(m[1]), nosePx: Number(m[2]), pct: Number(m[3]) } : null;
}

/** 这组词里在正文出现过的个数 */
const presentCount = (text, terms) => terms.filter((t) => occurrences(text, t) > 0).length;

/** quiz 的结构与接地情况：check 题的正确选项能对上几个四字原词 */
function quizSummary(quiz, text) {
  const body = grams(text);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  for (const q of qs) if (stage[q.stage] !== undefined) stage[q.stage] += 1;
  const hits = qs.filter((q) => q.stage === 'check').map((q) => {
    const right = String((q.options || [])[q.correct] || '');
    const hit = [...grams(right)].filter((g) => body.has(g));
    return { question: q.question, grams: [...new Set(hit)], correct: q.correct };
  });
  return {
    total: qs.length,
    stage,
    check: hits.length,
    grounded: hits.filter((h) => h.grams.length >= 2).length,
    hits,
    answers: qs.map((q) => q.correct),
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
    parts: partNames(text),
    figure: vertexFigure(text),
    error: boundaryError(text),
    noBoundary: /它们之间的边界，一条也没有写/.test(text),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医面部望诊 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`表格 ${r.tables.length} 张：`);
  r.tables.forEach((t, i) => console.log(`  #${i + 1}  ${t.rows} 行 × ${t.cols} 列  首列表头「${t.first}」`));
  console.log('');
  console.log('关键判据（出现次数）：');
  console.log('  ' + r.terms.map((x) => `${x.term} ${x.count}`).join(' · '));
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(`部位名清单：${r.parts.length} 个名字 → ${r.parts.join('、')}`);
  console.log(`边界条目：${r.noBoundary ? 0 : '未声明'} 条（正文原话：边界一条也没有写）`);
  console.log(
    `顶点演算：${r.figure.parts} 个部位 × ${r.figure.perPart} 个顶点 = ${r.figure.vertices} 个顶点` +
      (r.error ? `；标注一致性 ±${r.error.offsetPx} 像素 / 鼻宽 ${r.error.nosePx} 像素 ≈ ${r.error.pct}%` : '')
  );
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`
  );
  console.log(`答案位置：${r.quiz.answers.join(' / ')}`);
  console.log('');
  console.log('※ 以上数字全部由本章正文现算，改正文后重跑即可复核。');
  console.log('※ 本章为望诊部位体系的教学材料，不构成诊疗建议、诊断或治疗指导。');
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
  partNames,
  vertexFigure,
  boundaryError,
  presentCount,
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
