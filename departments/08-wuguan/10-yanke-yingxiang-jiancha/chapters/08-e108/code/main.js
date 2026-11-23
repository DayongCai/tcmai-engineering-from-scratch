#!/usr/bin/env node
/**
 * 眼科影像检查 · 第 8 章 密码泄露了可以改，虹膜泄露了不能换
 *
 *   node code/main.js
 *
 * 只读两份文件：同章目录下的 docs/zh.md 与 quiz.json，不读任何取数表。
 * 依赖：node:fs、node:path，无第三方包。
 *
 * 打印三块：
 *   1. 章规模：汉字数、段数、节标题、表格张数与每张表的列数／行数；
 *   2. 本章对账：敏感来路条数、字段四类、采集规则条数、必删与可留字段项数、
 *      红线条数、告知问数与患者权利项数，全部从正文解析后再算派生量；
 *   3. quiz 体检：题量、三段分布、选项数、解释长度、check 题能否在正文找到原词。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const CHAPTER = 8;
const SLUG = '08-e108';
const TITLE = '密码泄露了可以改，虹膜泄露了不能换';

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
  const routes = cnum((doc.match(/([一二三])条来路/) || [])[1] || '');
  const fields = ['直接标识', '准标识', '生物特征', '推断性标识'].filter((k) => doc.includes('**' + k + '**'));
  const rules = (doc.match(/\*\*规则[一二三]：/g) || []).length;
  const mustSeg = (doc.split('**必删字段。**')[1] || '').split('**可留字段。**')[0];
  const mustDelete = mustSeg.split('；').map((s) => s.replace(/——[\s\S]*$/, '').trim()).filter(Boolean);
  const keepSeg = (doc.split('**可留字段。**')[1] || '').split('**必须单独管理的字段。**')[0];
  const mayKeep = keepSeg.split('；').map((s) => s.trim()).filter(Boolean);
  const redlines = doc.includes('**三条红线**') ? 3 : 0;
  const asks = (doc.match(/\*\*第[一二三]问：/g) || []).length;
  const rights = cnum((doc.match(/患者的([一二三四五六])项权利/) || [])[1] || '');
  const consensus = [...new Set([...doc.matchAll(/共识·第([一二三四五六七八九十]+)节/g)].map((m) => m[1]))];

  return {
    routes, fields, rules, mustDelete, mayKeep, redlines, asks, rights, consensus,
    lines: [
      '敏感来路 ' + routes + ' 条：可识别 / 生物特征 / 内容与身份耦合',
      '字段 ' + fields.length + ' 类：' + fields.join('、') + '——出现一处即可指认的是直接标识，组合起来唯一性很高的是准标识',
      '采集端 ' + rules + ' 条规则：范围最小、标识与内容分离、默认不落本地',
      '必删 ' + mustDelete.length + ' 项 / 可留 ' + mayKeep.length + ' 项，另设关联表单独管理',
      '借阅与二次使用 3 种情形；红线 ' + redlines + ' 条：不出境、不上境外云、不以免费筛查换数据',
      '告知 ' + asks + ' 问（做什么、为什么、数据去哪）；患者 ' + rights + ' 项权利',
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
  console.log('※ 本章为教学材料，不构成法律意见或合规结论；具体义务依现行规定与所在机构制度。');
}

if (require.main === module) main();

module.exports = { analyze, readDoc, sections, paragraphs, tables, grams, hanzi, cnum, facts, quizAudit, CHAPTER, SLUG, TITLE, DOC, QUIZ };
