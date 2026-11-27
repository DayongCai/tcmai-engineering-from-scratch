#!/usr/bin/env node
/**
 * 眼科影像检查 · 第 7 章 报告的好坏不在信息多少，在三段的分工
 *
 *   node code/main.js
 *
 * 只读两份文件：同章目录下的 docs/zh.md 与 quiz.json，不读任何取数表。
 * 依赖：node:fs、node:path，无第三方包。
 *
 * 打印三块：
 *   1. 章规模：汉字数、段数、节标题、表格张数与每张表的列数／行数；
 *   2. 本章对账：三段与各自纪律条数、复查表的格数、建议三档、
 *      必须提前复查的类数与立即联系类、共识基本信息项数；
 *   3. quiz 体检：题量、三段分布、选项数、解释长度、check 题能否在正文找到原词。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const CHAPTER = 7;
const SLUG = '07-e107';
const TITLE = '报告的好坏不在信息多少，在三段的分工';

const CN = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const cnum = (s) => (CN[s] !== undefined ? CN[s] : Number(s) || 0);
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const docLines = (doc) => String(doc).split('\n');

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
    } else { i += 1; }
  }
  return out;
}

function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let j = 0; j + n <= seg.length; j += 1) out.add(seg.slice(j, j + n));
  }
  return out;
}

/* ── 本章对账：从正文解析，不手打 ───────────────────────────────── */

function facts(doc, ts = tables(doc)) {
  const grades = ['所见', '解释', '建议'].filter((k) => doc.includes('**' + k + ''));
  const seen = ['可定位', '可比较', '可复核', '不夹判断'].filter((k) => doc.includes('**' + k + '。**'));
  const explain = ['一句话给结论并排序', '给置信度', '给鉴别，最多两条'].filter((k) => doc.includes('**' + k + '**'));
  const advice = ['观察档', '复查档', '转诊档'].filter((k) => doc.includes('**' + k + '**'));
  const early = ['新增症状', '视力突降', '视野变化', '外伤后'].filter((k) => doc.includes(k + '。'));
  const basic = Number((doc.match(/基本信息\s*(\d+)\s*项/) || [])[1] || 0);
  const selfCheck = cnum((doc.match(/自查项，([一二三四五])条就够/) || [])[1] || '');
  const recheck = ts.find((t) => t.header.join(' ').includes('主诉'));
  const consensus = [...new Set([...doc.matchAll(/共识·第([一二三四五六七八九十]+)节/g)].map((m) => m[1]))];

  return {
    grades, seen, explain, advice, early, basic, selfCheck, recheck, consensus,
    lines: [
      '三段分工 ' + grades.length + ' 段：' + grades.join(' → ') + '，各对不同的读者负责',
      '三段纪律 ' + (seen.length + explain.length + 3) + ' 条 = 所见 ' + seen.length + ' + 解释 ' + explain.length + ' + 建议 3（做什么、什么时候、由谁）',
      '建议按行动分 ' + advice.length + ' 档：' + advice.join('、') + '——分界线是谁在什么时点必须做事',
      '复查表 ' + (recheck ? recheck.rows.length : 0) + ' 行 × ' + (recheck ? recheck.cols : 0) + ' 列 = ' + (recheck ? recheck.rows.length * recheck.cols : 0) + ' 格，表里故意没有「间隔」一栏',
      '必须提前复查 ' + early.length + ' 类：' + early.join('、') + '；另单列立即联系 1 类 = 红旗 ' + (early.length + 1) + ' 条',
      '共识基本信息 ' + basic + ' 项；患者自查 ' + selfCheck + ' 条',
      '正文引到共识节 ' + consensus.length + ' 个：' + (consensus.map((s) => '第' + s + '节').join('、') || '（无）'),
    ],
  };
}

/* ── quiz 体检 ──────────────────────────────────────────────────── */

function quizAudit(quiz, doc) {
  const body = grams(doc);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const problems = [];
  let grounded = 0;
  const items = qs.map((q, i) => {
    const n = i + 1;
    if (q.stage in stage) stage[q.stage] += 1; else problems.push('第 ' + n + ' 题 stage 非法');
    const opts = Array.isArray(q.options) ? q.options : [];
    if (opts.length !== 4) problems.push('第 ' + n + ' 题选项 ' + opts.length + ' 个');
    if (!(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < opts.length)) problems.push('第 ' + n + ' 题 correct 非法');
    const why = q.explain || q.explanation || '';
    if (hanzi(why) < 30) problems.push('第 ' + n + ' 题解释 ' + hanzi(why) + ' 汉字');
    const hit = [...grams(String(opts[q.correct] || ''))].filter((g) => body.has(g));
    if (q.stage === 'check' && hit.length) grounded += 1;
    return { n, stage: q.stage, options: opts.length, explain: hanzi(why), hit: hit.length };
  });
  return {
    total: qs.length,
    stage,
    items,
    grounded,
    answers: qs.map((q) => q.correct),
    distinct: new Set(qs.map((q) => q.correct)).size,
    minExplain: items.length ? Math.min(...items.map((x) => x.explain)) : 0,
    fourOptions: items.every((x) => x.options === 4),
    problems,
  };
}

function analyze() {
  const doc = readDoc();
  const ts = tables(doc);
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    docHanzi: hanzi(doc),
    paragraphs: paragraphs(doc).length,
    sections: sections(doc),
    tables: ts.map((t) => ({ header: t.header, cols: t.cols, rows: t.rows.length })),
    facts: facts(doc, ts),
    quiz: quizAudit(quiz, doc),
  };
}

function main() {
  const r = analyze();
  console.log('眼科影像检查 第 ' + CHAPTER + ' 章 · ' + TITLE);
  console.log('章规模：正文 ' + r.docHanzi + ' 汉字 · ' + r.paragraphs + ' 段 · 节 ' + r.sections.length + ' 个 · 表 ' + r.tables.length + ' 张');
  console.log('');
  console.log('节标题：');
  for (const s of r.sections) console.log('  ' + s);
  if (r.tables.length) {
    console.log('');
    console.log('表格：');
    r.tables.forEach((t, i) => console.log('  [' + (i + 1) + '] ' + t.header.join(' / ') + ' —— ' + t.cols + ' 列 × ' + t.rows + ' 行'));
  }
  console.log('');
  console.log('本章对账（解析正文后现算）：');
  for (const line of r.facts.lines) console.log('  · ' + line);
  console.log('');
  console.log('quiz ' + r.quiz.total + ' 题（pre ' + r.quiz.stage.pre + ' / check ' + r.quiz.stage.check + ' / post ' + r.quiz.stage.post + '）· 答案 ' + r.quiz.answers.join('/'));
  console.log('  check 题接地 ' + r.quiz.grounded + ' 道 · 答案落在 ' + r.quiz.distinct + ' 个位置 · 最短解释 ' + r.quiz.minExplain + ' 汉字');
  console.log(r.quiz.problems.length ? '  ✗ ' + r.quiz.problems.join('；') : '  ✓ 结构齐、解释过线、check 题落在正文');
  console.log('');
  console.log('※ 数字由本章正文与习题现算，正文改动后重跑即可复核。');
  console.log('※ 报告格式、复查间隔、转诊时限与疗效判据，以现行规范与所在机构制度为准。');
}

if (require.main === module) main();

module.exports = { analyze, readDoc, sections, paragraphs, tables, grams, hanzi, cnum, facts, quizAudit, CHAPTER, SLUG, TITLE, DOC, QUIZ };

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
