#!/usr/bin/env node
/**
 * 中药鉴定学 · 第 9 章 报告的效力，藏在取样件数与留样倍数的算术里
 * 课程: departments/02-zhongyao/05-zhongyao-jianding-xue/chapters/09-baogao-guifan
 * 输入: 只读本目录的 docs/zh.md 与 quiz.json（不回溯上游数据层，不读教材底稿）
 * 依赖: 仅 Node.js 标准库
 *
 * 输出三块，全部现算，不手打：
 *   1. 本章规模：汉字、段、二级/三级节、表格行与列
 *   2. 本章算术：常规检查四维词频与占比、报告字段计数、取样档位与程序步数、
 *      结论用语（符合规定 / 不符合规定）对账、留样三等份
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

/** 常规检查四维：各管一件事，缺一项结论就少一条边 */
const DIMS = ['水分', '灰分', '浸出物', '含量测定'];

/** 报告书应载明的字段 */
const FIELDS = ['检品名称', '批号', '规格', '来源', '检验依据', '检验项目', '结论', '检验人', '复核人', '审核人', '报告日期'];

/** 取样档位与程序六步 */
const TIERS = ['逐件取样', '随机抽取', '按 5% 比例', '按 1% 比例'];
const STEPS = ['检品登记', '取样', '检验', '记录', '复核', '报告'];

/** 结论用语：两栏都含「符合规定」，计数时先扣重复 */
const VERDICT = { yes: '符合规定', no: '不符合规定', retain: '三分之一' };

function dims(text) {
  const rows = DIMS.map((k) => ({ key: k, n: hits(text, k) }));
  const total = rows.reduce((a, r) => a + r.n, 0);
  for (const r of rows) r.share = total ? r.n / total : 0;
  return { rows, total, present: rows.filter((r) => r.n > 0).length };
}

function fields(text) {
  const miss = FIELDS.filter((f) => !text.includes(f));
  return {
    total: FIELDS.length,
    found: FIELDS.length - miss.length,
    miss,
    mentions: FIELDS.reduce((a, f) => a + hits(text, f), 0),
  };
}

function covers(text, list) {
  const miss = list.filter((w) => !text.includes(w));
  return { total: list.length, found: list.length - miss.length, miss };
}

function verdicts(text) {
  const no = hits(text, VERDICT.no);
  const yes = hits(text, VERDICT.yes) - no;
  const total = yes + no;
  const retain = hits(text, VERDICT.retain);
  return { yes, no, total, noShare: total ? no / total : 0, retain };
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

module.exports = { DOC, QUIZ, shape, citations, dims, fields, covers, verdicts, quizCheck, DIMS, FIELDS, TIERS, STEPS, VERDICT, HANZI };

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

  const d = dims(md);
  const f = fields(md);
  const tier = covers(md, TIERS);
  const step = covers(md, STEPS);
  const v = verdicts(md);
  const c = citations(md);

  ok(d.present === DIMS.length, `常规检查四维只命中 ${d.present}/${DIMS.length}`);
  ok(d.total === d.rows.reduce((a, r) => a + r.n, 0), '四维合计与分项不符');
  ok(f.found === FIELDS.length, `报告字段缺 ${f.miss.join('、') || '—'}（${f.found}/${f.total}）`);
  ok(tier.found === TIERS.length, `取样档位只命中 ${tier.found}/${TIERS.length}`);
  ok(step.found === STEPS.length, `程序六步只命中 ${step.found}/${STEPS.length}`);
  ok(v.retain >= 3, `留样三分法只提到 ${v.retain} 处（检验/复核/留样各一份）`);
  ok(v.no > 0, '正文没有把「不符合规定」单列，结论用语缺对账对象');
  ok(c.books >= 2, `引书 ${c.books} < 2`);

  const q = quizCheck(quiz);
  for (const p of q.problems) problems.push('quiz: ' + p);

  const pct = (x) => (x * 100).toFixed(1) + '%';
  console.log('═══ 中药鉴定学 · 第 9 章 ' + s.intro.replace(/^第\s*9\s*章\s*[·・:：]\s*/, '') + ' ═══');
  console.log(`规模：汉字 ${s.hanzi} · 段 ${s.blocks}（正文段 ${s.body}）· 二级节 ${s.sections} · 三级节 ${s.subsections}`);
  console.log(`表格：${s.tables} 张 · 行 ${s.rows} · 列 ${s.cols} · 单元格 ${s.cells}`);
  console.log(`引书：${c.books} 部 · 引用 ${c.total} 次 · 前三 ${c.top.map(([n, k]) => `${n}(${k})`).join('、') || '—'}`);
  console.log('\n常规检查四维（词频与占比，合计对账）：');
  for (const r of d.rows) console.log(`  ${r.key}\t${String(r.n).padStart(4)} 次\t${pct(r.share)}`);
  console.log(`  合计 ${d.total} 次 · 四维齐 ${d.present}/${DIMS.length}`);
  console.log(`\n报告字段：${f.found}/${f.total} 命中 · 字段词合计 ${f.mentions} 次 · 缺 ${f.miss.length}`);
  console.log(`取样档位 ${tier.found}/${TIERS.length} · 程序六步 ${step.found}/${STEPS.length}`);
  console.log(`结论用语对账：符合规定 ${v.yes} · 不符合规定 ${v.no} · 合计 ${v.total}，不符合占 ${pct(v.noShare)}；留样三分法表述 ${v.retain} 处`);
  console.log(`\nquiz 自检：${q.count} 题（pre ${q.stageCount.pre} / check ${q.stageCount.check} / post ${q.stageCount.post}）· 四选项 ${q.count - q.optionBad}/${q.count} · 解析 ≥30 汉字 ${q.count - q.explainShort}/${q.count} · 答案分布 ${q.dist.map((n, i) => `${i}:${n}`).join(' ')}`);

  if (problems.length) {
    console.log('\n✗ 本章口径不自洽（' + problems.length + ' 处）：');
    for (const p of problems) console.log('  - ' + p);
    console.log('※ 数字为教学样例，由本章正文与随堂题现算；不构成任何检品的检验结论。');
    process.exit(1);
  }
  console.log('\n✓ 规模、四维合计、报告字段、结论用语与 quiz 结构五项互相对得上');
  console.log('※ 教学样例：全部数字由本章 docs/zh.md 与 quiz.json 现算，不引用任何品种的含量限度、剂量、疗程、发生率与页码；不构成任何检品的检验结论，实际检验以现行版《中国药典》与法定检验机构结论为准。');
}
