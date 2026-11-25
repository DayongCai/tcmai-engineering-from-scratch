#!/usr/bin/env node
/**
 * 中药鉴定学 · 第 8 章 条形码定名、图谱定成分、效价定活性
 * 课程: departments/02-zhongyao/05-zhongyao-jianding-xue/chapters/08-dna-tiaoxingma
 * 输入: 只读本目录的 docs/zh.md 与 quiz.json（不回溯上游数据层，不读教材底稿）
 * 依赖: 仅 Node.js 标准库
 *
 * 输出三块，全部现算，不手打：
 *   1. 本章规模：汉字、段、二级/三级节、表格行与列
 *   2. 本章算术：三条证据链的判据词频与占比、检出/未检出对账、方法词命中、quiz 结构
 *   3. 自检：任一判据不合即 exit 1
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const HANZI = (s) => (String(s || '').match(CJK) || []).length;
const hits = (text, word) => text.split(word).length - 1;

/** 正文结构：汉字 / 段 / 节 / 表格行列 */
function shape(md) {
  const text = String(md).replace(/\r\n/g, '\n');
  const prose = text.replace(/^```[\s\S]*?^```/gm, '');
  const blocks = prose.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const body = blocks.filter((b) => !/^#{1,6}\s/.test(b) && !/^>/.test(b) && !/^[-*]\s/.test(b) && !/^\|/.test(b));

  const tables = [];
  const lines = prose.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\s*\|/.test(lines[i])) continue;
    let j = i;
    while (j < lines.length && /^\s*\|/.test(lines[j])) j += 1;
    const group = lines.slice(i, j);
    const sep = group.length > 1 && /^\s*\|[\s:|-]+\|\s*$/.test(group[1]);
    const cols = (group[0].match(/\|/g) || []).length - 1;
    tables.push({ rows: Math.max(0, group.length - (sep ? 2 : 1)), cols: Math.max(0, cols) });
    i = j - 1;
  }
  const rows = tables.reduce((a, t) => a + t.rows, 0);
  const cells = tables.reduce((a, t) => a + t.rows * t.cols, 0);

  return {
    hanzi: HANZI(text),
    blocks: blocks.length,
    body: body.length,
    sections: (text.match(/^##\s+/gm) || []).length,
    subsections: (text.match(/^###\s+/gm) || []).length,
    tables: tables.length,
    rows,
    cols: tables.reduce((a, t) => Math.max(a, t.cols), 0),
    cells,
    bodyText: body.join('\n'),
    intro: (text.match(/^#\s+(.+)$/m) || [, ''])[1].trim(),
  };
}

/** 引书：只数正文里成对的书名号 */
function citations(text) {
  const counter = new Map();
  for (const m of String(text).matchAll(/《([^》]+)》/g)) counter.set(m[1], (counter.get(m[1]) || 0) + 1);
  const ranked = [...counter.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
  return { books: counter.size, total: ranked.reduce((a, [, n]) => a + n, 0), top: ranked.slice(0, 3) };
}

/** 三条证据链：本章回答的三个不同问题 */
const CHAINS = [
  { key: '分子：是什么物种', words: ['DNA', '条形码', 'ITS2', 'COI', 'psbA', '扩增', '测序', '引物', '分子标记', '宏条形码', '序列'] },
  { key: '图谱：含什么成分', words: ['指纹图谱', '色谱', '光谱', '红外', '近红外', '薄层', '共有峰', '毛细管电泳'] },
  { key: '效价：多大活性', words: ['效价', '生物活性', '生物检定', '抑菌', '免疫', '酶联', '试纸条', '管碟'] },
];

const METHODS = ['条形码', 'ITS2', 'psbA', 'COI', 'RAPD', 'AFLP', 'RFLP', 'SSR', '宏条形码', 'Sanger', '指纹图谱', '生物效价'];

/** 检出 / 未检出：报告措辞的对账，防止把失败写成否定 */
const VERDICT = { yes: ['检出'], no: ['未检出'], fail: ['扩增失败', '比对无明确归属'] };

function chains(text) {
  const rows = CHAINS.map(({ key, words }) => {
    const n = words.reduce((a, w) => a + hits(text, w), 0);
    return { key, n };
  });
  const total = rows.reduce((a, r) => a + r.n, 0);
  for (const r of rows) r.share = total ? r.n / total : 0;
  return { rows, total };
}

function coverage(text, rows) {
  const prose = String(text).split(String.fromCharCode(13)).join('').replace(/^```[\s\S]*?^```/gm, '');
  const blocks = prose.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const covered = blocks.filter((b) => rows.some((r) => r.words.some((w) => b.includes(w)))).length;
  return { covered, blocks: blocks.length, share: blocks.length ? covered / blocks.length : 0 };
}

function verdicts(text) {
  const no = VERDICT.no.reduce((a, w) => a + hits(text, w), 0);
  // 「未检出」本身含「检出」，先扣除，避免同一次出现被两栏各记一次
  const yes = VERDICT.yes.reduce((a, w) => a + hits(text, w), 0) - no;
  const fail = VERDICT.fail.reduce((a, w) => a + hits(text, w), 0);
  const total = yes + no;
  return { yes, no, fail, total, noShare: total ? no / total : 0, controls: hits(text, '对照') };
}

/** quiz 结构自检 */
function quizCheck(quiz) {
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const problems = [];
  if (qs.length < 5) problems.push(`题量 ${qs.length} < 5`);
  const stageCount = { pre: 0, check: 0, post: 0 };
  const dist = [0, 0, 0, 0];
  let explainShort = 0;
  let optionBad = 0;
  for (const q of qs) {
    if (Object.prototype.hasOwnProperty.call(stageCount, q.stage)) stageCount[q.stage] += 1;
    else problems.push(`未知 stage: ${q.stage}`);
    const opts = Array.isArray(q.options) ? q.options : [];
    if (opts.length !== 4) optionBad += 1;
    if (!(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < opts.length)) {
      problems.push('correct 下标非法：' + q.question);
    } else {
      dist[q.correct] += 1;
    }
    if (HANZI(q.explain) < 30) explainShort += 1;
  }
  for (const s of ['pre', 'check', 'post']) if (!stageCount[s]) problems.push(`缺 ${s} 段`);
  if (optionBad) problems.push(`${optionBad} 题不是四选项`);
  if (explainShort) problems.push(`${explainShort} 题解析不足 30 汉字`);
  return { count: qs.length, stageCount, dist, optionBad, explainShort, problems };
}

module.exports = { DOC, QUIZ, shape, citations, chains, coverage, verdicts, quizCheck, CHAINS, METHODS, VERDICT, HANZI };

if (require.main === module) {
  for (const f of [DOC, QUIZ]) if (!fs.existsSync(f)) throw new Error('缺输入文件: ' + f);
  const md = fs.readFileSync(DOC, 'utf8');
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const s = shape(md);
  const text = md.replace(/\r\n/g, '\n');

  const problems = [];
  const ok = (cond, msg) => { if (!cond) problems.push(msg); };

  ok(s.hanzi >= 2500, `汉字 ${s.hanzi} < 2500`);
  ok(s.sections >= 4 && s.sections <= 8, `二级节 ${s.sections} 个（要求 4–8）`);
  ok(s.body >= 8, `正文段 ${s.body} < 8`);

  const ch = chains(text);
  const cov = coverage(text, CHAINS);
  const v = verdicts(text);
  const c = citations(text);
  const methodHits = METHODS.filter((m) => text.includes(m)).length;

  ok(ch.rows.every((r) => r.n > 0), '有一条证据链在正文里没有任何判据词');
  ok(ch.total === ch.rows.reduce((a, r) => a + r.n, 0), '证据链合计与分项不符');
  ok(v.no > 0, '正文没有把「未检出」与「扩增失败」分开写');
  ok(v.controls >= 3, `对照只提到 ${v.controls} 次（本章要求三种对照）`);
  ok(c.books >= 2, `引书 ${c.books} < 2`);
  ok(methodHits >= 8, `方法词只命中 ${methodHits}/${METHODS.length}`);

  const q = quizCheck(quiz);
  for (const p of q.problems) problems.push('quiz: ' + p);

  const pct = (x) => (x * 100).toFixed(1) + '%';
  console.log('═══ 中药鉴定学 · 第 8 章 ' + s.intro.replace(/^第\s*8\s*章\s*[·・:：]\s*/, '') + ' ═══');
  console.log(`规模：汉字 ${s.hanzi} · 段 ${s.blocks}（正文段 ${s.body}）· 二级节 ${s.sections} · 三级节 ${s.subsections}`);
  console.log(`表格：${s.tables} 张 · 行 ${s.rows} · 列 ${s.cols} · 单元格 ${s.cells}`);
  console.log(`引书：${c.books} 部 · 引用 ${c.total} 次 · 前三 ${c.top.map(([n, k]) => `${n}(${k})`).join('、') || '—'}`);
  console.log('\n三条证据链（判据词频，合计对账）：');
  for (const r of ch.rows) console.log(`  ${r.key}  ${String(r.n).padStart(4)} 次  ${pct(r.share)}`);
  console.log(`  合计 ${ch.total} 次 · 覆盖正文段 ${cov.covered}/${cov.blocks}（${pct(cov.share)}）`);
  console.log(`\n检出 / 未检出对账：检出 ${v.yes} · 未检出 ${v.no} · 合计 ${v.total}，未检出占 ${pct(v.noShare)}；扩增失败与无归属 ${v.fail} 处 · 对照 ${v.controls} 处`);
  console.log(`方法词命中 ${methodHits}/${METHODS.length} · 引书 ${c.books} 部`);
  console.log(`\nquiz 自检：${q.count} 题（pre ${q.stageCount.pre} / check ${q.stageCount.check} / post ${q.stageCount.post}）· 四选项 ${q.count - q.optionBad}/${q.count} · 解析 ≥30 汉字 ${q.count - q.explainShort}/${q.count} · 答案分布 ${q.dist.map((n, i) => `${i}:${n}`).join(' ')}`);

  if (problems.length) {
    console.log('\n✗ 本章口径不自洽（' + problems.length + ' 处）：');
    for (const p of problems) console.log('  - ' + p);
    console.log('※ 数字为教学样例，由本章正文与随堂题现算；不构成任何药材的真伪结论或用药建议。');
    process.exit(1);
  }
  console.log('\n✓ 规模、证据链合计、检出对账与 quiz 结构四项互相对得上');
  console.log('※ 教学样例：全部数字由本章 docs/zh.md 与 quiz.json 现算，不含阈值、限度与疗效判断；不构成任何药材的真伪结论，不能替代法定检验与医师面诊。');
}
