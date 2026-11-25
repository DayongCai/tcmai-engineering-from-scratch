#!/usr/bin/env node
/**
 * 中药毕业设计与知识移交 · 第 5 章 论文的说服力在绪论就定了，答辩只是把它念一遍
 *
 *   node code/main.js
 *
 * 正文：chapters/05-lunwen-dabian/docs/zh.md
 * 习题：chapters/05-lunwen-dabian/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz，不读任何单元层取数表：正文或习题一改，输出跟着改。
 *   · 规模：汉字、节、段、表
 *   · 本章算术：从 PROBLEM 段复算写作章占底本的百分比，数四层表、答辩四类表、
 *     绪论三件事、评分权重合计与考核项数
 *   · quiz：题量、三段分布、四选项、explain 长度、check 题能否在正文找到 ≥6 汉字原句
 * 任一项对不上即 exit 1 —— 说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 5;
const SLUG = '05-lunwen-dabian';
const TITLE = '论文的说服力在绪论就定了，答辩只是把它念一遍';

/* ── 文本口径 ──────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const num = (s) => Number(String(s).replace(/[,，\s]/g, ''));
const CN = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const cn2n = (s) => (CN[s] !== undefined ? CN[s] : Number(s));
const pct = (a, b, dp) => Number(((a / b) * 100).toFixed(dp));
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

/* ── 章结构：正文的每一节即本章的一个单元 ─────────────────────── */

function chapterKeys() {
  return sections(readDoc())
    .filter((s) => /^[一二三四五六七八九十]+、/.test(s))
    .map((s) => s.split('、')[0]);
}

function chapterUnits() {
  const ls = docLines(readDoc());
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

/* ── 本章算术（全部从正文解析，不写死任何一个数） ─────────────── */

function chapterArithmetic(doc, ts) {
  const own = doc.match(/底本写作一章\s*([\d,]+)\s*汉字/);
  const chHanzi = own ? num(own[1]) : 0;

  const whole = doc.match(/占\s*([\d,]+)\s*汉字的\s*([\d.]+)%/);
  const total = whole ? num(whole[1]) : 0;
  const claimPct = whole ? Number(whole[2]) : 0;

  const chapters = cn2n((doc.match(/([一二三四五六七八九十]+)章里最薄的一章/) || [])[1] || 0);

  const layers = tableBy(ts, '落在论文哪一部分');
  const answers = tableBy(ts, '应答结构');
  const grade = tableBy(ts, '权重示例');
  const weights = grade ? grade.rows.map((r) => num(r[1])).filter((n) => Number.isFinite(n)) : [];
  const weightSum = weights.reduce((a, b) => a + b, 0);

  const wantIntro = cn2n((doc.match(/要完成的事只有([一二三四五六七八九十]+)件/) || [])[1] || 0);
  const introItems = (doc.match(/^\d+\.\s+\*\*/gm) || []).length;

  const wantExams = cn2n((doc.match(/考核项([一二三四五六七八九十]+)条/) || [])[1] || 0);
  const examItems = (doc.match(/[①②③④⑤]/g) || []).length;

  return {
    counts: {
      chapters, total, chHanzi,
      layers: layers ? layers.rows.length : 0,
      answerTypes: answers ? answers.rows.length : 0,
      introItems, weightSum, examItems,
    },
    lines: [
      '写作章 ' + chHanzi.toLocaleString('en-US') + ' 汉字，占底本 ' + total.toLocaleString('en-US') + ' 汉字的 ' + pct(chHanzi, total, 2) + '%，正文写 ' + claimPct + '%',
      '写作章是 ' + chapters + ' 章里最薄的一章（正文语），其篇幅只够铺一节背景，撑不起判据论证',
      '证据链 ' + (layers ? layers.rows.length : 0) + ' 层 · 答辩必问 ' + (answers ? answers.rows.length : 0) + ' 类（判据／方法／数据／边界）',
      '绪论必须完成的事 ' + introItems + ' 件（正文说 ' + wantIntro + ' 件）',
      '评分维度 ' + weights.length + ' 项，权重 ' + weights.join('+') + ' = ' + weightSum + ' · 考核项 ' + examItems + ' 条（正文说 ' + wantExams + ' 条）',
    ],
    checks: [
      { name: '写作章占比', got: pct(chHanzi, total, 2), want: claimPct },
      { name: '证据链层数', got: layers ? layers.rows.length : 0, want: 4 },
      { name: '答辩问题类数', got: answers ? answers.rows.length : 0, want: 4 },
      { name: '绪论件事数', got: introItems, want: wantIntro },
      { name: '权重合计', got: weightSum, want: 100 },
      { name: '考核项数', got: examItems, want: wantExams },
    ],
  };
}

/* ── quiz：结构 + 接地 ────────────────────────────────────────── */

/** 文本里的连续汉字段（按非汉字切段） */
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
  if (q.minExplain < 40 || q.maxExplain > 120) issues.push('explain 越界（40–120 汉字）');
  if (q.checkGrounded < 2) issues.push('接地 check 题不足 2 道');
  if (q.distinctAnswers < 3) issues.push('答案位置未打散');
  for (const c of a.checks) if (c.got !== c.want) issues.push(c.name + ' 对不上：' + c.got + ' ≠ ' + c.want);

  console.log('中药毕业设计与知识移交 第 ' + CHAPTER + ' 章 · ' + TITLE);
  console.log('正文 ' + r.docHanzi.toLocaleString('en-US') + ' 汉字 · ' + r.paragraphs + ' 段 · 节 ' + r.sections.length + ' 个 · 表 ' + r.tables.length + ' 张');
  console.log('');
  console.log('结构：');
  for (const s of r.sections) console.log('  ' + s);
  console.log('');
  console.log('本章算术（全部从正文现算）：');
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
  console.log('※ 本章为教学材料，不构成学术评价或成果认定，也不替代导师、评审与所在院系的答辩细则。');
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
  pct,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
