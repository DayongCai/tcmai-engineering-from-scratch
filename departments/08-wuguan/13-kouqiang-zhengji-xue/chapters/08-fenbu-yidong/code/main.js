#!/usr/bin/env node
/**
 * 口腔正畸学 · 第 8 章 一次移动多颗牙，等于每颗都不到位
 *
 *   node code/main.js
 *
 * 正文：chapters/08-fenbu-yidong/docs/zh.md
 * 习题：chapters/08-fenbu-yidong/quiz.json
 * 底本：standards/kouqiang-zhengji/chapter-map.json 与 units.json（本章取 章映射）
 * 依赖：仅 Node.js 标准库
 *
 * 正文的规模、节与表格当场数；教材单元的字数、条文编号、列项条数与关键短语按底本现算；
 * 本章习题的量、分段、选项、解释长度与接地一并体检。数字不手打，改底本或改稿后重跑即变。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 8;
const SLUG = '08-fenbu-yidong';
const TITLE = '一次移动多颗牙，等于每颗都不到位';
const COURSE = '口腔正畸学';

/** 本章「运行与验证」段声明的核对口径 */
const EXPECT = [];
const KEYWORDS = [];
/** 本章正文引用的三类词频标签（为空则不输出该段） */
const TAGS = [];

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const sum = (d) => Object.values(d).reduce((a, b) => a + b, 0);
const lines = (doc) => String(doc).replace(/\r\n/g, '\n').split('\n');
const flat = (s) => String(s || '').replace(/\s+/g, '');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'kouqiang-zhengji', 'chapter-map.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/kouqiang-zhengji/chapter-map.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const MAP = path.join(ROOT, 'standards', 'kouqiang-zhengji', 'chapter-map.json');
const UNITS = path.join(ROOT, 'standards', 'kouqiang-zhengji', 'units.json');

/* ── 底本 ─────────────────────────────────────────────────────── */

/** 本章在底本里对应的单元号 */
function chapterKeys() {
  const m = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const it = (m.chapters && m.chapters[SLUG]) || {};
  return Array.isArray(it.units) ? it.units.slice() : [];
}

function chapterUnits() {
  const keys = chapterKeys();
  const data = JSON.parse(fs.readFileSync(UNITS, 'utf8'));
  return data.units
    .filter((u) => keys.includes(u.sub))
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en', { numeric: true }));
}

function citations(list) {
  const counter = new Map();
  for (const u of list) {
    for (const m of String(u.prose || '').matchAll(/《([^》]+)》/g)) {
      counter.set(m[1], (counter.get(m[1]) || 0) + 1);
    }
  }
  const ranked = [...counter.entries()].sort((a, b) => b[1] - a[1]);
  return { books: counter.size, total: sum(Object.fromEntries(counter)), top: ranked.slice(0, 3) };
}

/** 本章单元的规模、来源与引书 */
function summarize(list) {
  const han = list.reduce((a, u) => a + u.hanzi, 0);
  const secs = [...new Set(list.map((u) => u.chapter))].sort((a, b) =>
    String(a).localeCompare(String(b), 'en', { numeric: true })
  );
  const c = citations(list);
  return {
    units: list.length,
    hanzi: han,
    mean: list.length ? Math.round(han / list.length) : 0,
    chapters: secs,
    locators: list.map((u) => u.locator),
    books: c.books,
    cites: c.total,
    top: c.top,
  };
}

/** 底本正文里出现的条文编号（如 Z09、J01、Y04、L02） */
function codeTags(list) {
  const out = new Set();
  for (const u of list) {
    for (const m of String(u.rawBody || '').matchAll(/条文\s*([A-Z]\d+)/g)) out.add(m[1]);
  }
  return [...out].sort();
}

/** 某一编号的条款下 a) b) c) … 的条数（区间取到下一个编号为止） */
function clauseItems(list, sec) {
  const body = list.map((u) => String(u.rawBody || '')).join('\n');
  const at = body.search(new RegExp('(^|\\n)\\s*' + sec.replace(/\./g, '\\.') + '\\s'));
  if (at < 0) return null;
  const rest = body.slice(at);
  const next = rest.slice(1).search(/\n\s*\d+\.\d+(?:\.\d+)?\s/);
  const seg = next >= 0 ? rest.slice(0, next + 1) : rest;
  return (seg.match(/(^|\n)\s*[a-z]\)/g) || []).length;
}

/** 正文声明的列项条数与底本实测是否一致 */
function expectCheck(list) {
  return EXPECT.map((e) => {
    const got = clauseItems(list, e.sec);
    return { ...e, got, ok: got === e.n };
  });
}

/** 正文声明必须完整引用的关键短语，是否都在底本正文里 */
function keywordsCheck(list) {
  const body = flat(list.map((u) => String(u.rawBody || '')).join('\n'));
  return KEYWORDS.map((w) => ({ word: w, ok: body.includes(flat(w)) }));
}

/* ── 正文 ─────────────────────────────────────────────────────── */

function sections(doc) {
  return lines(doc)
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

function paragraphs(doc) {
  return lines(doc)
    .map((l) => l.trim())
    .filter((l) => l && !/^[#>|]/.test(l) && !/^[-*+]\s/.test(l) && !/^\d+[.、]/.test(l))
    .filter((l) => !l.includes('|'));
}

function tables(doc) {
  const ls = lines(doc);
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const out = [];
  let i = 0;
  while (i < ls.length) {
    if (/^\s*\|/.test(ls[i])) {
      const block = [];
      while (i < ls.length && /^\s*\|/.test(ls[i])) {
        block.push(ls[i]);
        i += 1;
      }
      const header = cells(block[0]);
      const rows = block
        .slice(1)
        .filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l))
        .map(cells);
      out.push({ header, cols: header.length, rows });
    } else {
      i += 1;
    }
  }
  return out;
}

/** 底本 measure.views 里各类别在本章的命中数（16 课正文引用的三个数字） */
function tagFreq(list) {
  const out = {};
  for (const u of list) {
    for (const [k, v] of Object.entries((u.measure && u.measure.views) || {})) {
      out[k] = (out[k] || 0) + v;
    }
  }
  return TAGS.map((k) => [k, out[k] || 0]);
}

/* ── 习题 ─────────────────────────────────────────────────────── */

/** 正文里 n 字以上的连续汉字片段 */
function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function quizCheck(quiz, doc) {
  const body = grams(doc);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const issues = [];
  const items = qs.map((q, i) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    const hit = [...grams(right)].filter((g) => body.has(g));
    const why = q.explain || q.explanation || '';
    if (opts.length !== 4) issues.push('第 ' + (i + 1) + ' 题选项 ' + opts.length + ' 个');
    if (new Set(opts.map(String)).size !== opts.length) issues.push('第 ' + (i + 1) + ' 题选项重复');
    if (!(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < opts.length)) {
      issues.push('第 ' + (i + 1) + ' 题 correct 越界');
    }
    const h = hanzi(why);
    if (h < 40 || h > 80) issues.push('第 ' + (i + 1) + ' 题解释 ' + h + ' 汉字，不在 40—80');
    return {
      n: i + 1,
      stage: q.stage,
      options: opts.length,
      correct: q.correct,
      explainHanzi: h,
      grounded: hit.length,
      sample: hit.slice(0, 2),
    };
  });
  if (items.length !== 6) issues.push('题量 ' + items.length + '，应为 6');
  for (const s of ['pre', 'check', 'post']) if (!stage[s]) issues.push('缺 ' + s + ' 段');
  const grounded = items.filter((x) => x.stage === 'check' && x.grounded > 0).length;
  if (grounded < 2) issues.push('check 题接地 ' + grounded + ' 道，少于 2');
  const answers = items.map((x) => x.correct);
  return {
    total: items.length,
    stage,
    items,
    answers,
    distinctAnswers: new Set(answers).size,
    grounded,
    minExplain: items.length ? Math.min(...items.map((x) => x.explainHanzi)) : 0,
    maxExplain: items.length ? Math.max(...items.map((x) => x.explainHanzi)) : 0,
    issues,
  };
}

/* ── 汇总 ─────────────────────────────────────────────────────── */

function analyze() {
  const doc = fs.readFileSync(DOC, 'utf8');
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const list = chapterUnits();
  const ts = tables(doc);
  return {
    docHanzi: hanzi(doc),
    paragraphs: paragraphs(doc).length,
    sections: sections(doc),
    tables: ts.map((t) => ({ header: t.header, cols: t.cols, rows: t.rows.length })),
    cells: ts.reduce((s, t) => s + t.cols * t.rows.length, 0),
    keys: chapterKeys(),
    units: list,
    shape: summarize(list),
    tags: tagFreq(list),
    codes: codeTags(list),
    expect: expectCheck(list),
    words: keywordsCheck(list),
    quiz: quizCheck(quiz, doc),
  };
}

function main() {
  const r = analyze();
  const q = r.quiz;
  const problems = [];

  console.log(COURSE + ' 第 ' + CHAPTER + ' 章 · ' + TITLE);
  console.log(
    '正文 ' + r.docHanzi.toLocaleString('en-US') + ' 汉字 · ' + r.paragraphs + ' 段 · 节 ' +
      r.sections.length + ' 个 · 表 ' + r.tables.length + ' 张（' + r.cells + ' 格）'
  );
  console.log('');
  console.log('节：');
  for (const s of r.sections) console.log('  ' + s);
  console.log('');
  console.log('教材单元（' + r.keys.join('、') + '）：');
  if (r.units.length !== r.keys.length) {
    problems.push('单元归属不符：底本列出 ' + r.keys.length + ' 个单元，实取 ' + r.units.length + ' 个');
  }
  for (const l of r.shape.locators) console.log('  ' + l);
  console.log('  ' + r.shape.units + ' 个单元 · ' + r.shape.hanzi + ' 汉字 · 平均 ' + r.shape.mean + ' 字 · 教材章 ' + r.shape.chapters.join('、'));
  console.log('  引书 ' + r.shape.books + ' 部 · 引用 ' + r.shape.cites + ' 次 · 前三 ' +
    (r.shape.top.map(([n, k]) => n + '(' + k + ')').join('、') || '（无）'));
  console.log('  条文编号 ' + (r.codes.join('、') || '（无）'));

  if (r.tags.length) {
    console.log('');
    console.log('三类词频（底本 measure 求和）：' + r.tags.map(([k, n]) => k + ' ' + n).join(' · '));
    const vals = r.tags.map(([, n]) => n);
    const mx = Math.max(...vals);
    const mn = Math.min(...vals);
    if (mn) console.log('  最大与最小之比：' + mx + ' ÷ ' + mn + ' ≈ ' + (mx / mn).toFixed(1));
  }

  if (r.expect.length || r.words.length) {
    console.log('');
    console.log('列项与短语核对：');
    for (const e of r.expect) {
      console.log('  ' + (e.ok ? '✓' : '✗') + ' ' + e.sec + ' ' + e.label + '：正文称 ' + e.n + ' 条，底本 ' + (e.got === null ? '未找到该条' : e.got + ' 条'));
      if (!e.ok) problems.push(e.sec + ' ' + e.label + ' 条数与正文不一致');
    }
    for (const w of r.words) {
      console.log('  ' + (w.ok ? '✓' : '✗') + ' 关键短语「' + w.word + '」' + (w.ok ? '在底本正文中' : '未在底本正文中'));
      if (!w.ok) problems.push('关键短语缺失：' + w.word);
    }
  }

  console.log('');
  console.log(
    '习题 ' + q.total + ' 题 · pre ' + q.stage.pre + ' / check ' + q.stage.check + ' / post ' + q.stage.post +
      ' · 答案位置 ' + q.answers.join('/')
  );
  console.log('  check 题接地 ' + q.grounded + ' 道 · 解释 ' + q.minExplain + '—' + q.maxExplain + ' 汉字 · 答案落在 ' + q.distinctAnswers + ' 个位置');
  for (const it of q.items) {
    console.log(
      '  ' + String(it.n).padStart(2, '0') + ' ' + String(it.stage).padEnd(5) +
        ' 选项 ' + it.options + ' · 解释 ' + it.explainHanzi + ' 汉字 · 接地 ' + it.grounded
    );
  }
  console.log(q.issues.length ? '  → 体检不合格：' + q.issues.join('；') : '  → 体检全部合格');
  if (q.issues.length) problems.push(...q.issues);

  console.log('');
  console.log('※ 以上数字由本章正文、习题与底本 units.json 现算，改稿或改底本后重跑即可复核。');
  console.log('※ 本章为教学样例：不构成诊疗建议与合规结论，具体方案须由具备资质的执业人员按现行规范作出。');
  if (problems.length) {
    console.log('※ 核对未通过：' + problems.join('；'));
    process.exitCode = 2;
  }
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, COURSE, EXPECT, KEYWORDS,
  chapterKeys, chapterUnits, summarize, citations,
  codeTags, clauseItems, expectCheck, keywordsCheck, tagFreq,
  sections, paragraphs, tables, grams, quizCheck, analyze, hanzi, sum,
};
