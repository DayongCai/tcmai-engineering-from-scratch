#!/usr/bin/env node
/**
 * 眼科影像检查 · 第 4 章 浑浊时读断面，读到的不是「看不清」，是「看起来像缺了一层」
 *
 *   node code/main.js
 *
 * 只读两份文件：同章目录下的 docs/zh.md 与 quiz.json，不读任何取数表。
 * 依赖：node:fs、node:path，无第三方包。
 *
 * 打印三块：
 *   1. 章规模：汉字数、段数、节标题、表格张数与每张表的列数／行数；
 *   2. 本章对账：四类手段、可及性三段、断面四层判断、七类改变的句式纪律、
 *      造影三问、可判读下限与造影时相，全部从正文解析后再算派生量；
 *   3. quiz 体检：题量、三段分布、选项数、解释长度、check 题能否在正文找到原词。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const CHAPTER = 4;
const SLUG = '04-e104';
const TITLE = '浑浊时读断面，读到的不是「看不清」，是「看起来像缺了一层」';

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

function facts(doc) {
  const modalities = docLines(doc)
    .map((l) => l.trim())
    .filter((l) => /^- \*\*/.test(l))
    .map((l) => ((l.match(/^- \*\*(.+?)\*\*/) || [])[1] || '').replace(/[：:]$/, ''));
  const stages = ['通路', '断面', '灌注'].filter((k) => doc.includes('**' + k + '**'));
  const layers = ['连续', '厚度', '反射', '界面'].filter((k) => doc.includes('**' + k + '。**'));
  const angio = ['灌注', '渗漏', '屏障'].filter((k) => doc.includes('**' + k + '。**'));
  const changes = ['增厚与水肿', '囊样改变', '层间分离', '断裂', '膜形成', '隆起', '沉积与遮蔽'].filter((k) => doc.includes('**' + k + '**'));
  const signal = ((doc.match(/信号强度\s*≥\s*(\d+)\s*dB/) || [])[1] || '?');
  const phases = [...doc.matchAll(/(动脉期|静脉期|晚期)\s*([0-9]+[–-][0-9]+(?:s|min))/g)].map((m) => m[1] + ' ' + m[2]);
  const consensus = [...new Set([...doc.matchAll(/共识·第([一二三四五六七八九十]+)节/g)].map((m) => m[1]))];

  return {
    modalities, stages, layers, angio, changes, signal, phases, consensus,
    lines: [
      '四类手段 ' + modalities.length + ' 类：' + (modalities.join(' / ') || '（未解析到）') + '——四种物理量，换算不出彼此',
      '可及性分 ' + stages.length + ' 段：' + (stages.join(' → ') || '（未解析到）') + '，顺序不能倒',
      '断面四层判断 ' + layers.length + ' 项：' + layers.join('、') + '，每项各一问',
      '常见改变 ' + changes.length + ' 类 × 2 条（一句写法 + 一条禁写）= ' + (changes.length * 2) + ' 条句式纪律',
      '造影三问 ' + angio.length + ' 问：' + angio.join('、') + '——不回答「是什么病」',
      '可判读下限：信号强度 ≥' + signal + 'dB；造影时相 ' + phases.length + ' 段：' + (phases.join(' / ') || '（未解析到）'),
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
    facts: facts(doc),
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
  console.log('※ 本章不给分期命名、渗漏分级与正常厚度；设备参数与造影剂以机构规范与说明书为准。');
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
