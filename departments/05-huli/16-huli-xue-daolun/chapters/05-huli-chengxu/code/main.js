'use strict';
/**
 * 护理学导论 · 第 5 章 护理程序
 *
 *   node code/main.js
 *
 * 正文：departments/05-huli/16-huli-xue-daolun/chapters/05-huli-chengxu/docs/zh.md
 * 习题：chapters/05-huli-chengxu/quiz.json
 *
 * 只读这两份文件，不引任何外部数据层。本章的小节数、六个格子的标目、
 * 表格行数、关键词次数、习题的三段与接地，全部由正文现算；
 * 正文改一个字，重跑就能看出是哪一项对不上。
 */

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const CHAPTER = 5;
const SLUG = '05-huli-chengxu';
const TITLE = "护理程序";

/** 本章自己反复使用的词：次数由正文现算，不手填 */
const TERMS = ["评估", "诊断", "计划", "实施", "评价"];

const HAN = /[\u3400-\u4dbf\u4e00-\u9fff]/;
const chars = (s) => [...String(s || '')];
const isHan = (ch) => HAN.test(ch);
const hanzi = (s) => chars(s).filter(isHan).length;
const count = (text, term) => (term ? String(text).split(term).length - 1 : 0);

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');

/** 正文头：标题、题记、问题、双根因 */
function parseHead(text) {
  const t = String(text);
  const pick = (re) => ((t.match(re) || [, ''])[1] || '').trim();
  const rootsRaw = pick(/^> \*\*双根因定位:\*\* (.+)$/m);
  return {
    title: pick(/^# (.+)$/m),
    motto: pick(/^> \*\*MOTTO:\*\* (.+)$/m),
    problem: pick(/^> \*\*PROBLEM:\*\* (.+)$/m),
    rootsRaw,
    roots: rootsRaw ? rootsRaw.split('+').map((s) => s.trim()).filter(Boolean) : [],
  };
}

/** 小节：`## ` 到下一个 `## ` 之前，连同正文里加粗的标目 */
function parseSections(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split(/\r?\n/)) {
    const h = /^## (.+)$/.exec(line);
    if (h) {
      cur = { heading: h[1].trim(), lines: [] };
      out.push(cur);
      continue;
    }
    if (cur) cur.lines.push(line);
  }
  return out.map((s) => {
    const body = s.lines.join('\n');
    return {
      heading: s.heading,
      body,
      hanzi: hanzi(body),
      leads: [...body.matchAll(/^\*\*([^*\n]{2,40}?)。?\*\*/gm)].map((m) => m[1].trim()),
    };
  });
}

/** 表格：| 表头 | 分隔行 | 数据行… */
function parseTables(text) {
  const lines = String(text).split(/\r?\n/);
  const tables = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\|/.test(lines[i])) continue;
    if (!/^\|[\s:|-]+\|$/.test(lines[i + 1] || '')) continue;
    const header = lines[i].split('|').slice(1, -1).map((s) => s.trim());
    const rows = [];
    let j = i + 2;
    while (j < lines.length && /^\|/.test(lines[j])) {
      rows.push(lines[j].split('|').slice(1, -1).map((s) => s.trim()));
      j += 1;
    }
    tables.push({ header, rows });
    i = j - 1;
  }
  return tables;
}

/** 六格：**① 操作化定义。** 这一组标目是概念落成动作的骨架 */
function parseCells(text) {
  return [...String(text).matchAll(/\*\*([①②③④⑤⑥]) ([^*\n]{2,30}?)。\*\*/g)]
    .map((m) => ({ mark: m[1], label: m[2].trim() }));
}

/** 正文里的「……」：术语与判据都以这种形式出现，可逐条核对 */
function quotedTerms(text) {
  const seen = new Map();
  for (const m of String(text).matchAll(/「([^」]{2,40})」/g)) seen.set(m[1], (seen.get(m[1]) || 0) + 1);
  return [...seen.entries()].map(([text, n]) => ({ text, n }));
}

function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** quiz：三段齐、四选项、解释够长、答案打散、check 题能在正文找到原词 */
function quizSummary(quiz, doc) {
  const body = grams(doc);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const items = qs.map((q) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const options = Array.isArray(q.options) ? q.options : [];
    const right = String(options[q.correct] || '');
    const hit = [...grams(right)].filter((g) => body.has(g));
    return {
      stage: q.stage,
      options: options.length,
      correct: q.correct,
      explainHanzi: hanzi(q.explain),
      grounded: hit.length,
      sample: hit.slice(0, 2),
    };
  });
  return {
    total: qs.length,
    stage,
    items,
    answers: qs.map((q) => q.correct),
    distinctAnswers: new Set(qs.map((q) => q.correct)).size,
    checkGrounded: items.filter((x) => x.stage === 'check' && x.grounded > 0).length,
    minExplain: items.length ? Math.min(...items.map((x) => x.explainHanzi)) : 0,
    allFourOptions: items.every((x) => x.options === 4),
    badCorrect: items.filter((x) => !(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4)).length,
  };
}

function analyze() {
  const doc = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const sections = parseSections(doc);
  const tables = parseTables(doc);
  const cells = parseCells(doc);
  return {
    doc,
    head: parseHead(doc),
    sections,
    tables,
    cells,
    docHanzi: hanzi(doc),
    sectionHanzi: sections.map((s) => s.hanzi),
    leads: sections.reduce((a, s) => a + s.leads.length, 0),
    rows: tables.reduce((a, t) => a + t.rows.length, 0),
    quoted: quotedTerms(doc),
    terms: TERMS.map((term) => ({ term, n: count(doc, term) })),
    quiz: quizSummary(quiz, doc),
  };
}

function main() {
  const r = analyze();
  const q = r.quiz;
  console.log(`护理学导论 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log(`正文 ${r.docHanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个 · 加粗标目 ${r.leads} 条 · 表格 ${r.tables.length} 张（${r.rows} 行）`);
  console.log('');
  console.log('小节分布（汉字）：');
  r.sections.forEach((s, i) => console.log(`  ${i + 1}. ${s.heading} — ${s.hanzi} 字 · 标目 ${s.leads.length} 条`));
  if (r.cells.length) {
    console.log('');
    console.log(`概念落成动作的六个格子（${r.cells.length} 个）：`);
    console.log('  ' + r.cells.map((c) => `${c.mark} ${c.label}`).join(' / '));
  }
  console.log('');
  console.log('关键词次数（正文现算）：');
  console.log('  ' + r.terms.map((t) => `${t.term} ${t.n}`).join(' · '));
  console.log('');
  console.log(`quiz ${q.total} 题（pre ${q.stage.pre} / check ${q.stage.check} / post ${q.stage.post}）· check 接地 ${q.checkGrounded} 道 · 答案 ${q.answers.join('/')}（${q.distinctAnswers} 个位置）`);
  console.log('  ' + q.items.map((x, i) => `${i + 1}.${x.stage}→${x.correct}，解释 ${x.explainHanzi} 字，接地 ${x.grounded}`).join(' | '));
  console.log('');
  console.log('教学样例：以上数字全部由 docs/zh.md 与 quiz.json 现算，不引外部数据层。');
  console.log('※ 本章为教学材料，不构成医学意见、护理操作指引或管理建议。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  parseHead,
  parseSections,
  parseTables,
  parseCells,
  quotedTerms,
  quizSummary,
  grams,
  hanzi,
  count,
  CHAPTER,
  SLUG,
  TITLE,
  TERMS,
  DOC,
  QUIZ,
};
