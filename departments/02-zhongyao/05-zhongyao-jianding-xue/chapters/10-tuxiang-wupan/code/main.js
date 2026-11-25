#!/usr/bin/env node
/**
 * 中药鉴定学 · 第 10 章 图像识别错得最有规律的地方，正是药材最相像的地方
 * 课程: departments/02-zhongyao/05-zhongyao-jianding-xue/chapters/10-tuxiang-wupan
 * 输入: 只读本目录的 docs/zh.md 与 quiz.json（不回溯上游数据层，不读教材底稿）
 * 依赖: 仅 Node.js 标准库
 *
 * 输出三块，全部现算，不手打：
 *   1. 本章规模：汉字、段、二级/三级节、表格行与列
 *   2. 本章算术：四步流水线 / 三类易错样本 / 四条边界的条目与词频、条目对账与占比、
 *      置信度与正确率的表述对账、quiz 结构
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
  const text = String(md).split(String.fromCharCode(13)).join('');
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

/** 本章的三组清单：四步流水线、三类易错样本、四条边界 */
const GROUPS = [
  { key: '四步流水线', words: ['图像采集', '预处理', '特征提取', '分类识别'] },
  { key: '三类易错样本', words: ['近缘品种', '加工改形', '连续变异'] },
  { key: '四条边界', words: ['功能边界', '证据边界', '风险边界', '伦理边界'] },
];

/** 置信度 / 正确率 的表述对账：两个词在正文里必须被分开写 */
const VERDICT = { conf: '置信度', acc: '正确率', review: '人工复核', quick: '快速检测' };

function groups(text) {
  const rows = GROUPS.map(({ key, words }) => {
    const items = words.map((w) => ({ key: w, n: hits(text, w) }));
    return { key, items, present: items.filter((i) => i.n > 0).length, total: items.length, freq: items.reduce((a, i) => a + i.n, 0) };
  });
  const itemsTotal = rows.reduce((a, r) => a + r.total, 0);
  const itemsFound = rows.reduce((a, r) => a + r.present, 0);
  const freq = rows.reduce((a, r) => a + r.freq, 0);
  for (const r of rows) r.share = freq ? r.freq / freq : 0;
  return { rows, itemsTotal, itemsFound, freq, itemShare: itemsTotal ? itemsFound / itemsTotal : 0 };
}

function verdicts(text) {
  return {
    conf: hits(text, VERDICT.conf),
    acc: hits(text, VERDICT.acc),
    review: hits(text, VERDICT.review),
    quick: hits(text, VERDICT.quick),
  };
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

module.exports = { DOC, QUIZ, shape, citations, groups, verdicts, quizCheck, GROUPS, VERDICT, HANZI };

if (require.main === module) {
  for (const f of [DOC, QUIZ]) if (!fs.existsSync(f)) throw new Error('缺输入文件: ' + f);
  const md = fs.readFileSync(DOC, 'utf8');
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const s = shape(md);

  const problems = [];
  const ok = (cond, msg) => { if (!cond) problems.push(msg); };

  ok(s.hanzi >= 2500, `汉字 ${s.hanzi} < 2500`);
  ok(s.sections >= 4 && s.sections <= 8, `二级节 ${s.sections} 个（要求 4–8）`);
  ok(s.body >= 8, `正文段 ${s.body} < 8`);

  const g = groups(md);
  const v = verdicts(md);
  const c = citations(md);

  for (const r of g.rows) {
    ok(r.present === r.total, `${r.key} 只命中 ${r.present}/${r.total}：缺 ${r.items.filter((i) => !i.n).map((i) => i.key).join('、')}`);
  }
  ok(g.itemsFound === g.itemsTotal, `条目对账 ${g.itemsFound}/${g.itemsTotal}`);
  ok(g.freq === g.rows.reduce((a, r) => a + r.freq, 0), '词频合计与分组不符');
  ok(v.conf > 0 && v.acc > 0, '正文必须把「置信度」与「正确率」分开写');
  ok(v.review > 0, '正文没有写人工复核环节');
  ok(c.books >= 1, `引书 ${c.books} < 1`);

  const q = quizCheck(quiz);
  for (const p of q.problems) problems.push('quiz: ' + p);

  const pct = (x) => (x * 100).toFixed(1) + '%';
  console.log('═══ 中药鉴定学 · 第 10 章 ' + s.intro.replace(/^第\s*10\s*章\s*[·・:：]\s*/, '') + ' ═══');
  console.log(`规模：汉字 ${s.hanzi} · 段 ${s.blocks}（正文段 ${s.body}）· 二级节 ${s.sections} · 三级节 ${s.subsections}`);
  console.log(`表格：${s.tables} 张 · 行 ${s.rows} · 列 ${s.cols} · 单元格 ${s.cells}`);
  console.log(`引书：${c.books} 部 · 引用 ${c.total} 次 · 前三 ${c.top.map(([n, k]) => `${n}(${k})`).join('、') || '—'}`);
  console.log('\n三组清单（条目命中与词频）：');
  for (const r of g.rows) {
    console.log(`  ${r.key}  ${r.present}/${r.total} 命中 · 词频 ${String(r.freq).padStart(3)} · 占词频 ${pct(r.share)}`);
    console.log(`    ${r.items.map((i) => `${i.key}×${i.n}`).join('  ')}`);
  }
  console.log(`  条目对账 ${g.itemsFound}/${g.itemsTotal}（${pct(g.itemShare)}）· 词频合计 ${g.freq}`);
  console.log(`\n置信度 / 正确率对账：置信度 ${v.conf} · 正确率 ${v.acc} · 人工复核 ${v.review} · 快速检测 ${v.quick}`);
  console.log(`\nquiz 自检：${q.count} 题（pre ${q.stageCount.pre} / check ${q.stageCount.check} / post ${q.stageCount.post}）· 四选项 ${q.count - q.optionBad}/${q.count} · 解析 ≥30 汉字 ${q.count - q.explainShort}/${q.count} · 答案分布 ${q.dist.map((n, i) => `${i}:${n}`).join(' ')}`);

  if (problems.length) {
    console.log('\n✗ 本章口径不自洽（' + problems.length + ' 处）：');
    for (const p of problems) console.log('  - ' + p);
    console.log('※ 数字为教学样例，由本章正文与随堂题现算；不构成任何药材的真伪结论。');
    process.exit(1);
  }
  console.log('\n✓ 规模、三组清单条目、置信度对账与 quiz 结构四项互相对得上');
  console.log('※ 教学样例：全部数字由本章 docs/zh.md 与 quiz.json 现算，不含准确率、误判率与阈值；不构成任何药材的真伪结论，AI 输出一律标「可辅助参考」，须由具备鉴定资质的专业人员人工复核。');
}
