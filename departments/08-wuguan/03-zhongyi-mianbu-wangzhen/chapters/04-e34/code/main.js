#!/usr/bin/env node
/**
 * 中医面部望诊 · 第 4 章 · 明堂之鼻：一张正面照，只拿得到四成的判据
 * 课程: departments/08-wuguan/03-zhongyi-mianbu-wangzhen/chapters/04-e34/docs/zh.md
 * 底本: 《望诊遵经·诊鼻望法提纲》（转引《金匮要略》）
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部从正文现算：二十二条 = 十七条形与证 + 五条色；
 * 九条可得 = 五条色 + 四条形；九/二十二；表格里正面静态能打的勾有几个；
 * 六个字段里只有几个完全来自静态图像；quiz 接地情况。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 4;
const SLUG = '04-e34';
const TITLE = '明堂之鼻：一张正面照，只拿得到四成的判据';

/** 各表格的数据行数（不含表头与分隔行），按出现顺序 */
const TABLE_ROWS = [12, 6];

/** 关键判据词 */
const TERMS = [
  '明堂',
  '鼻煽张',
  '鼻柱崩坏',
  '疠风',
  '皮脂',
  '偏振',
  '呼吸频率',
  '骨部',
];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = [
  '五官先生鼻',
  '非时',
  '鼻煽张',
  '容后续述',
  '高光地狱',
  '疠风之败症',
  '六个字段',
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

/** 二十二条：十七条形与证 + 五条色，逐条从 PROBLEM 段点出来 */
function noseClauses(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('一共给了二十二条判据')) || '';
  const shapes = (/十七条讲形与证：([^。]+)。/.exec(line) || [null, ''])[1].split('、').map((s) => s.trim()).filter(Boolean);
  const colours = (/五条讲色：([^。]+)。/.exec(line) || [null, ''])[1].split('、').map((s) => s.trim()).filter(Boolean);
  const staticShapes = (/加上四条形（([^）]+)）/.exec(line) || [null, ''])[1].split('、').map((s) => s.trim()).filter(Boolean);
  const claim = (/一共给了(二十二|\d+)条判据/.exec(line) || [null, '0'])[1];
  return {
    shapes,
    colours,
    staticShapes,
    total: shapes.length + colours.length,
    claim: claim === '二十二' ? 22 : Number(claim),
    reachable: colours.length + staticShapes.length,
  };
}

/** 表格里「正面静态」这一列打了几个勾（十二行覆盖十六项） */
function staticTicks(text) {
  const blocks = tableBlocks(text);
  const t = blocks.find((b) => b.head[0] === '判据') || { head: [], rows: [] };
  const i = t.head.indexOf('正面静态');
  const ticks = t.rows.filter((r) => String(r[i] || '').includes('✓')).map((r) => r[0]);
  return { column: i, ticks, count: ticks.length, rows: t.rows.length };
}

/** 六个字段，以及其中完全来自静态图像的有几个 */
function recordFields(text) {
  const blocks = tableBlocks(text);
  const t = blocks.find((b) => b.head[0] === '字段' && b.head.includes('覆盖判据')) || { head: [], rows: [] };
  const src = t.head.indexOf('来源');
  const rows = t.rows.map((r) => ({ field: r[0], source: String(r[src] || '') }));
  return { rows, staticOnly: rows.filter((r) => /^图像/.test(r.source)).map((r) => r.field) };
}

const presentCount = (text, terms) => terms.filter((t) => occurrences(text, t) > 0).length;

function quizSummary(quiz, text) {
  const body = grams(text);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  for (const q of qs) if (stage[q.stage] !== undefined) stage[q.stage] += 1;
  const hits = qs.filter((q) => q.stage === 'check').map((q) => {
    const right = String((q.options || [])[q.correct] || '');
    const hit = [...new Set([...grams(right)].filter((g) => body.has(g)))];
    return { question: q.question, grams: hit, correct: q.correct };
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
  const c = noseClauses(text);
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    tables: blocks.map((b) => ({ cols: b.head.length, rows: b.rows.length, first: b.head[0] || '' })),
    terms: TERMS.map((t) => ({ term: t, count: occurrences(text, t) })),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).includes(p) })),
    clauses: c,
    ratio: c.total ? c.reachable / c.total : 0,
    ticks: staticTicks(text),
    fields: recordFields(text),
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
  console.log('小节探针：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `判据清点：形与证 ${r.clauses.shapes.length} 条 + 色 ${r.clauses.colours.length} 条 = ${r.clauses.total} 条（正文自称 ${r.clauses.claim} 条）`
  );
  console.log(
    `正面静态可得：${r.clauses.colours.length} 条色 + ${r.clauses.staticShapes.length} 条形（${r.clauses.staticShapes.join('、')}）= ${r.clauses.reachable} 条 → ${(r.ratio * 100).toFixed(1)}%（四成）`
  );
  console.log(`十二行判据表：正面静态打勾 ${r.ticks.count} 行（${r.ticks.ticks.join('；')}）`);
  console.log(
    `记录字段：${r.fields.rows.length} 个，完全来自静态图像的只有 ${r.fields.staticOnly.length} 个（${r.fields.staticOnly.join('、')}）`
  );
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`
  );
  console.log(`答案位置：${r.quiz.answers.join(' / ')}`);
  console.log('');
  console.log('※ 以上数字全部由本章正文现算，改正文后重跑即可复核。');
  console.log('※ 本章为鼻部望诊的教学材料，不构成诊疗建议、诊断或治疗指导。');
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
  noseClauses,
  staticTicks,
  recordFields,
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
