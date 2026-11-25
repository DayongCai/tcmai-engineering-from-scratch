#!/usr/bin/env node
/**
 * 针灸推拿毕业设计与知识移交 · 第 2 章 数据准备：病例、经穴坐标、刺激参数
 *
 *   node code/main.js
 *
 * 正文：chapters/02-shuju-zhunbei/docs/zh.md
 * 习题：chapters/02-shuju-zhunbei/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz，不读任何 standards 取数表：正文或习题一改，输出跟着改。
 *   · 规模：汉字、节、段、表
 *   · 本章算术：从正文表格解析数字，复算正文自己写下的合计／占比／极差
 *   · quiz：题量、三段分布、四选项、explain 长度、check 题能否在正文找到 ≥6 汉字原句
 * 任一项对不上即 exit 1 —— 说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 2;
const SLUG = '02-shuju-zhunbei';
const TITLE = "数据准备：病例、经穴坐标、刺激参数";

/* ── 文本口径 ──────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const num = (s) => Number(String(s).replace(/[,，\s]/g, ''));
const count = (text, term) => String(text).split(term).length - 1;
const CN = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const cn2n = (s) => (CN[s] !== undefined ? CN[s] : Number(s));
const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const docLines = (doc) => String(doc).split(/\r?\n/);

function sections(doc) {
  return docLines(doc).filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
}

function paragraphs(doc) {
  return docLines(doc)
    .map((l) => l.trim())
    .filter((l) => l && !/^[#>|]/.test(l) && !/^[-*+]\s/.test(l) && !/^\d+[.、]/.test(l))
    .filter((l) => !l.includes('|'));
}

function tables(doc) {
  const ls = docLines(doc);
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const out = [];
  let i = 0;
  while (i < ls.length) {
    if (/^\s*\|/.test(ls[i])) {
      const block = [];
      while (i < ls.length && /^\s*\|/.test(ls[i])) { block.push(ls[i]); i += 1; }
      const header = cells(block[0]);
      const rows = block.slice(1).filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l)).map(cells);
      out.push({ header, cols: header.length, rows });
    } else {
      i += 1;
    }
  }
  return out;
}

const tableBy = (ts, kw) => ts.find((t) => t.header.join(' ').includes(kw));

/* ── 章结构：正文的四节即本章的单元 ───────────────────────────── */

function chapterKeys() {
  const doc = readDoc();
  return sections(doc)
    .filter((s) => /^[一二三四五六七八九十]+、/.test(s))
    .map((s) => s.split('、')[0]);
}

function chapterUnits() {
  const doc = readDoc();
  const ls = docLines(doc);
  const keys = chapterKeys();
  const out = [];
  let cur = null;
  let buf = [];
  const flush = () => {
    if (!cur) return;
    const body = buf.join('\n');
    out.push({
      key: cur.key,
      sub: CHAPTER + '.' + (out.length + 1),
      title: cur.title,
      hanzi: hanzi(body),
      paragraphs: paragraphs(body).length,
      tables: tables(body).length,
    });
  };
  for (const line of ls) {
    const m = line.match(/^##\s+([一二三四五六七八九十]+)、(.*)$/);
    if (m && keys.includes(m[1])) {
      flush();
      cur = { key: m[1], title: m[2].trim() };
      buf = [];
      continue;
    }
    if (/^##\s+/.test(line) && cur) { flush(); cur = null; buf = []; continue; }
    if (cur) buf.push(line);
  }
  flush();
  return out;
}

function summarize(units) {
  const list = Array.isArray(units) ? units : [];
  return {
    sections: list.length,
    hanzi: list.reduce((a, u) => a + u.hanzi, 0),
    paragraphs: list.reduce((a, u) => a + u.paragraphs, 0),
    tables: list.reduce((a, u) => a + u.tables, 0),
    keys: list.map((u) => u.key),
    titles: list.map((u) => u.title),
  };
}

/* ── 本章算术（逐章注入，全部从正文解析） ─────────────────────── */

function chapterArithmetic(doc, ts) {

  const cls = tableBy(ts, '丢了会怎样');
  const loc = tableBy(ts, '复核时怎么用');
  const drop = tableBy(ts, '为什么单列');
  const pos = num((doc.match(/位置（(\d+) 行）/) || [])[1]);
  const ten = num((doc.match(/底本的\s*(\d+)\s*行模板/) || [])[1]);
  const share = (pos / ten) * 100;
  const said = num((doc.match(/十行里位置占(.)行/) || [])[1] ? cn2n((doc.match(/十行里位置占(.)行/) || [])[1]) : NaN);
  return {
    lines: [
      '三类数据 ' + (cls ? cls.rows.length : 0) + ' 行 · 定位四法 ' + (loc ? loc.rows.length : 0) + ' 种 · 脱落与偏离 ' + (drop ? drop.rows.length : 0) + ' 行',
      '位置 ' + pos + ' 行 ÷ 模板 ' + ten + ' 行 = ' + share.toFixed(0) + '%（正文另说占 ' + said + ' 行）',
      '定位口径：骨度分寸 / 体表解剖标志 / 手指同身寸 / 简便取穴，四种都要留字段',
    ],
    checks: [
      { name: '位置行数', got: pos, want: said },
      { name: '定位四法行数', got: loc ? loc.rows.length : 0, want: 4 },
      { name: '模板行数', got: ten, want: 10 },
    ],
  };
  
}

/* ── quiz：结构 + 接地 ────────────────────────────────────────── */

/** 文本里的连续汉字片段（按非汉字切段） */
function runs(text) {
  return String(text || '').split(/[^\u4e00-\u9fff]+/).filter(Boolean);
}

/** 正确项里是否含有 ≥n 个连续汉字，且原样出现在正文（同一汉字段内） */
function groundedIn(option, doc, n = 6) {
  const docRuns = runs(doc);
  for (const r of runs(option)) {
    for (let len = r.length; len >= n; len -= 1) {
      for (let i = 0; i + len <= r.length; i += 1) {
        const g = r.slice(i, i + len);
        if (docRuns.some((d) => d.includes(g))) return g;
      }
    }
  }
  return '';
}

function quizSummary(quiz, doc) {
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const items = qs.map((q, i) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const correct = q.correct;
    const right = String(opts[correct] || '');
    const why = q.explain || q.explanation || '';
    return {
      n: i + 1,
      stage: q.stage,
      options: opts.length,
      correct,
      explainHanzi: hanzi(why),
      hit: q.stage === 'check' ? groundedIn(right, doc, 6) : '',
    };
  });
  const explains = items.map((x) => x.explainHanzi);
  return {
    total: qs.length,
    stage,
    items,
    answers: items.map((x) => x.correct),
    distinctAnswers: new Set(items.map((x) => x.correct)).size,
    checkGrounded: items.filter((x) => x.stage === 'check' && x.hit).length,
    minExplain: explains.length ? Math.min(...explains) : 0,
    maxExplain: explains.length ? Math.max(...explains) : 0,
    allFourOptions: items.every((x) => x.options === 4),
    badCorrect: items.filter((x) => !(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < x.options)).length,
    stageComplete: ['pre', 'check', 'post'].every((s) => stage[s] > 0),
  };
}

/* ── 汇总与输出 ───────────────────────────────────────────────── */

function analyze() {
  const doc = readDoc();
  const ts = tables(doc);
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const units = chapterUnits();
  return {
    docHanzi: hanzi(doc),
    paragraphs: paragraphs(doc).length,
    sections: sections(doc),
    tables: ts.map((t) => ({ header: t.header, cols: t.cols, rows: t.rows.length })),
    units,
    summary: summarize(units),
    arith: chapterArithmetic(doc, ts),
    quiz: quizSummary(quiz, doc),
  };
}

function main() {
  const r = analyze();
  const a = r.arith;
  const q = r.quiz;
  const issues = [];
  if (q.total < 6) issues.push('quiz 不足 6 题');
  if (!q.stageComplete) issues.push('quiz 缺 pre/check/post 段');
  if (!q.allFourOptions) issues.push('有题不是 4 选项');
  if (q.badCorrect) issues.push('correct 下标非法');
  if (q.minExplain < 40 || q.maxExplain > 80) issues.push('explain 越界（40–80 汉字）');
  if (q.checkGrounded < 2) issues.push('接地 check 题不足 2 道');
  for (const c of a.checks) if (c.got !== c.want) issues.push(c.name + ' 对不上：' + c.got + ' ≠ ' + c.want);

  console.log('针灸推拿毕业设计与知识移交 第 ' + CHAPTER + ' 章 · ' + TITLE);
  console.log('正文 ' + r.docHanzi.toLocaleString('en-US') + ' 汉字 · ' + r.paragraphs + ' 段 · 节 ' + r.sections.length + ' 个 · 表 ' + r.tables.length + ' 张');
  console.log('');
  console.log('结构：');
  for (const s of r.sections) console.log('  ' + s);
  console.log('');
  console.log('本章算术（全部从正文表格现算）：');
  for (const line of a.lines) console.log('  ' + line);
  console.log('');
  console.log('quiz ' + q.total + ' 题（pre ' + q.stage.pre + ' / check ' + q.stage.check + ' / post ' + q.stage.post + '）· 答案 ' + q.answers.join('/') + ' · 落在 ' + q.distinctAnswers + ' 个位置');
  for (const it of q.items) {
    console.log('  ' + it.n + ' ' + String(it.stage).padEnd(5) + ' ' + it.options + ' 选项 · correct=' + it.correct + ' · explain ' + it.explainHanzi + ' 汉字' + (it.hit ? ' · 接地「' + it.hit + '」' : ''));
  }
  console.log('');
  if (issues.length) {
    console.log('✗ 自检未通过：' + issues.join('；'));
    process.exitCode = 1;
  } else {
    console.log('✓ 自检通过：正文、quiz、代码三者同源（算术 ' + a.checks.length + ' 项、接地 ' + q.checkGrounded + ' 道）。');
  }
  console.log('※ 以上数字由本章正文与 quiz 现算，改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见，也不替代导师、伦理委员会与所在机构制度。');
}

if (require.main === module) main();

module.exports = {
  chapterKeys,
  chapterUnits,
  summarize,
  chapterArithmetic,
  quizSummary,
  groundedIn,
  analyze,
  readDoc,
  sections,
  paragraphs,
  tables,
  tableBy,
  hanzi,
  num,
  count,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
