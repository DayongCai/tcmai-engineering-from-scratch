#!/usr/bin/env node
/**
 * 疾病学基础 · 第 17 章 伦理不是附录条款，而是记录能不能摊开给当事人看的那条底线
 *
 *   node code/main.js
 *
 * 只读两处：
 *   正文  chapters/17-lunli-yu-goutong/docs/zh.md
 *   习题  chapters/17-lunli-yu-goutong/quiz.json
 * 依赖：仅 Node.js 标准库。不读任何取数表：正文改了，这里打印的数字跟着变。
 *
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 本章算术：从告知清单、对照表与并列短语解析条目，再算内容项与原则数
 *   · 习题：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 17;
const SLUG = '17-lunli-yu-goutong';
const TITLE = '伦理不是附录条款，而是记录能不能摊开给当事人看的那条底线';

/* ── 文本口径 ────────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const docLines = (doc) => String(doc).split(/\r?\n/);

/** 节标题：`## 一、…` */
function sections(doc) {
  return docLines(doc).filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
}

/** 段：非空，不以标题、引文、表格行、清单符号或编号起始 */
function paragraphs(doc) {
  return docLines(doc)
    .map((l) => l.trim())
    .filter((l) => l && !/^[#>|]/.test(l) && !/^[-*+]\s/.test(l) && !/^\d+[.、]/.test(l))
    .filter((l) => !l.includes('|'));
}

/** markdown 表格：表头 + 去分隔行的数据行 */
function tables(doc) {
  const ls = docLines(doc);
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
      const rows = block.slice(1).filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l)).map(cells);
      out.push({ header, cols: header.length, rows });
    } else {
      i += 1;
    }
  }
  return out;
}

const tableBy = (ts, kw) => ts.find((t) => t.header.join(' ').includes(kw));

/** 并列项：先削括号内的举例，再按顿号切 */
function items(s) {
  return String(s || '')
    .replace(/（[^）]*）/g, '')
    .split(/[、，,；;／]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/* ── 本章算术（逐章注入，全部从正文解析） ────────────────────────── */

function chapterArithmetic(doc, ts) {
  const cmp = tableBy(ts, '可复原'); // 去标识化 / 脱敏 对照
  const cmpRows = cmp ? cmp.rows.map((r) => r[0]) : [];

  const tellM = doc.match(/四类内容：([^。]+)/);
  const tell = tellM ? items(tellM[1]) : [];

  const wayM = doc.match(/方式有三：([^。]+)/);
  const ways = wayM ? items(wayM[1]) : [];

  const prinM = doc.match(/处理原则是三条：([^。]+)/);
  const principles = prinM ? items(prinM[1]) : [];

  // 不污名化的三条改写规则：正文用「第一条／第二条／第三条」编号
  const rules = (doc.match(/第[一二三]条，/g) || []).length;

  // 标识符判据：稀有的情况＋时间＋地点
  const idM = doc.match(/\*\*([^*]*＋[^*]*)\*\*/);
  const idParts = idM ? idM[1].split('＋').map((s) => s.replace(/，.*$/, '').trim()).filter(Boolean) : [];

  const chanM = doc.match(/渠道分三类：([^。]+)/);
  const channels = chanM ? items(chanM[1]) : [];

  const qM = doc.match(/要回答四件事：([^。]+)/);
  const questions = qM ? items(qM[1]) : [];

  const protM = doc.match(/报告保护包括([^。]+)。/);
  const protections = protM ? protM[1].split(/与|、/).map((s) => s.trim()).filter(Boolean) : [];

  return {
    cmpRows,
    tell,
    ways,
    principles,
    rules,
    idParts,
    channels,
    questions,
    protections,
    lines: [
      '告知内容 ' + tell.length + ' 类（' + tell.join('／') + '），最后一类最容易被漏',
      '告知方式 ' + ways.length + ' 种（' + ways.join('／') + '）；重要事项两种并用，覆盖不同的失效',
      '隐私：' + cmpRows.length + ' 种做法（' + cmpRows.join('／') + '）× 4 列对照，可复原性决定能否对外',
      '敏感信息原则 ' + principles.length + ' 条（' + principles.join('／') + '）',
      '标识符判据 ' + idParts.length + ' 项组合（' + idParts.join(' ＋ ') + '），删名不等于去标识化',
      '中性表述改写规则 ' + rules + ' 条（去形容词／去价值判断／去群体标签）',
      '报告渠道 ' + channels.length + ' 类；一份能用的报告回答 ' + questions.length + ' 件事，保护 ' +
        protections.length + ' 项',
    ],
  };
}

/* ── 习题：结构 + 接地 ──────────────────────────────────────────── */

/** 正文里 4 字以上的连续汉字片段 */
function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function quizSummary(quiz, doc) {
  const body = grams(doc);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const rows = qs.map((q, i) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    const hit = [...grams(right)].filter((g) => body.has(g));
    const why = q.explain || q.explanation || '';
    return { n: i + 1, stage: q.stage, options: opts.length, correct: q.correct, explainHanzi: hanzi(why), grounded: hit.length, sample: hit.slice(0, 3) };
  });
  return {
    total: qs.length,
    stage,
    rows,
    answers: qs.map((q) => q.correct),
    distinctAnswers: new Set(qs.map((q) => q.correct)).size,
    checkGrounded: rows.filter((x) => x.stage === 'check' && x.grounded > 0).length,
    minExplain: rows.length ? Math.min(...rows.map((x) => x.explainHanzi)) : 0,
    allFourOptions: rows.every((x) => x.options === 4),
    stageComplete: ['pre', 'check', 'post'].every((s) => stage[s] > 0),
  };
}

/* ── 汇总 ──────────────────────────────────────────────────────── */

function analyze() {
  const doc = readDoc();
  const ts = tables(doc);
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    docHanzi: hanzi(doc),
    paragraphs: paragraphs(doc).length,
    sections: sections(doc),
    tables: ts.map((t) => ({ header: t.header, cols: t.cols, rows: t.rows.length })),
    arith: chapterArithmetic(doc, ts),
    quiz: quizSummary(quiz, doc),
  };
}

function main() {
  const r = analyze();
  console.log(`疾病学基础 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log(`正文 ${r.docHanzi.toLocaleString('en-US')} 汉字 · ${r.paragraphs} 段 · 节 ${r.sections.length} 个`);
  console.log('');
  console.log('结构：');
  for (const s of r.sections) console.log(`  ${s}`);
  console.log('');
  console.log(`表 ${r.tables.length} 张：`);
  r.tables.forEach((t, i) => console.log(`  [${i + 1}] ${t.header.join(' / ')} —— ${t.cols} 列 × ${t.rows} 行`));
  console.log('');
  console.log('本章算术（全部从正文解析后计算）：');
  for (const line of r.arith.lines) console.log(`  ${line}`);
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· 答案 ${r.quiz.answers.join('/')}`
  );
  console.log(
    `  check 题接地 ${r.quiz.checkGrounded} 道 · 答案落在 ${r.quiz.distinctAnswers} 个位置 · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('※ 以上数字由本章正文与 quiz 现算，改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，讲告知、隐私、表述与报告的教学要求，不构成法律意见或伦理审查结论。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  sections,
  paragraphs,
  tables,
  tableBy,
  grams,
  hanzi,
  count,
  items,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
