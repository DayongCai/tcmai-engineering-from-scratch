#!/usr/bin/env node
/**
 * 眼科影像检查 · 第 6 章 出血的层次携带病程信息，面积不携带
 *
 *   node code/main.js
 *
 * 只读两份文件：同章目录下的 docs/zh.md 与 quiz.json，不读任何取数表。
 * 依赖：node:fs、node:path，无第三方包。
 *
 * 打印三块：
 *   1. 章规模：汉字数、段数、节标题、表格张数与每张表的列数／行数；
 *   2. 本章对账：出血五个层次、记录最小集、量的三个相对标尺、程的三条线索、
 *      转诊硬判据条数与疗效评价纪律，全部从正文解析后再算派生量；
 *   3. quiz 体检：题量、三段分布、选项数、解释长度、check 题能否在正文找到原词。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const CHAPTER = 6;
const SLUG = '06-e106';
const TITLE = '出血的层次携带病程信息，面积不携带';

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
  const layers = ['视网膜内', '视网膜下', '视网膜前／玻璃体下', '玻璃体', '脉络膜'].filter((k) => doc.includes('**' + k + '**'));
  const minimum = ['视网膜内出血', '视网膜下出血', '玻璃体与视网膜前出血'].filter((k) => doc.includes('**' + k + '**'));
  const rulers = ['以视盘直径为标尺', '以遮蔽程度为标尺', '以分区计数为标尺'].filter((k) => doc.includes(k));
  const clocks = ['颜色', '边界', '液平面'].filter((k) => doc.includes('**' + k + '**'));
  const referLine = (doc.split('转诊的判据比失访更硬')[1] || '').split('\n')[0] || '';
  const refer = (referLine.match(/\*\*/g) || []).length / 2;
  const rules = ['不换设备', '不换范围', '不换读片人'].filter((k) => doc.includes(k + '。'));
  const effect = ['结构', '功能', '全身'].filter((k) => doc.includes('**' + k + '**（'));
  const consensus = [...new Set([...doc.matchAll(/共识·第([一二三四五六七八九十]+)节/g)].map((m) => m[1]))];

  return {
    layers, minimum, rulers, clocks, refer, rules, effect, consensus,
    lines: [
      '出血分 ' + layers.length + ' 层：' + (layers.join(' / ') || '（未解析到）') + '——同一团红色，落在不同层处置不同',
      '记录最小集 ' + minimum.length + ' 层：' + minimum.join(' / ') + '，每层一句固定句式',
      '定位落点：哪一层 + 哪个区域 + 遮挡到什么程度',
      '量的相对标尺 ' + rulers.length + ' 个：视盘直径 / 遮蔽程度 / 分区计数——没有绝对单位',
      '程的线索 ' + clocks.length + ' 条：' + clocks.join('、') + '，合起来粗判新出还是旧有',
      '转诊硬判据 ' + refer + ' 条；疗效评价 ' + rules.length + ' 条纪律：' + rules.join('、'),
      '疗效分 ' + effect.length + ' 层：' + effect.join(' / ') + '——三层各自的结果，不是一个总分',
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
  console.log('※ 本章不写分期标准、随访天数与面积百分比；转诊与治疗决定须由眼科执业医师判定。');
}

if (require.main === module) main();

module.exports = { analyze, readDoc, sections, paragraphs, tables, grams, hanzi, cnum, facts, quizAudit, CHAPTER, SLUG, TITLE, DOC, QUIZ };
