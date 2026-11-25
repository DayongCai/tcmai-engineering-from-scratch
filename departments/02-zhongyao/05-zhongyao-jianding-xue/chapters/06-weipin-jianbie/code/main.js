#!/usr/bin/env node
/**
 * 中药鉴定学 · 第 6 章 伪品不是长得像，是把正品的判据一条条做掉
 *
 *   node code/main.js
 *
 * 正文：chapters/06-weipin-jianbie/docs/zh.md
 * 习题：chapters/06-weipin-jianbie/quiz.json
 * 依赖：仅 Node.js 标准库
 *
 * 只读本章正文与本章 quiz，不读任何标准表：正文改了，这里的数跟着变。
 *   · 规模：汉字、段、节标题、表格张数与每张表的列数／行数
 *   · 算术：四味药的伪品类数逐条相加与正文声明的总数对账、表格「常见伪品」列名项复核、
 *           取样件数与总包件数的覆盖率、表格行列累计
 *   · quiz：题量、三段分布、选项数、解释长度、答案位置是否打散、check 题能否在正文找到原词
 * 任一项对不上，脚本以 1 退出——说明正文、代码、习题三者已经不同源。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 6;
const SLUG = '06-weipin-jianbie';
const TITLE = '伪品不是长得像，是把正品的判据一条条做掉';

/* ── 文本口径 ────────────────────────────────────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const readDoc = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const docLines = (doc) => String(doc).split(/\r?\n/);

const num = (text, re) => {
  const m = String(text).match(re);
  return m ? Number(m[1]) : null;
};
const groups = (text, re) => {
  const m = String(text).match(re);
  return m ? m.slice(1) : null;
};
const splitNames = (cell) => String(cell || '').split('、').map((s) => s.trim()).filter(Boolean);

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
  let fenced = false;
  while (i < ls.length) {
    if (/^\s*```/.test(ls[i])) {
      fenced = !fenced;
      i += 1;
      continue;
    }
    if (!fenced && /^\s*\|/.test(ls[i])) {
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
const colIndex = (t, kw) => t.header.findIndex((h) => h.includes(kw));

function sliceBetween(doc, from, to) {
  const a = doc.indexOf(from);
  if (a < 0) return '';
  const b = to ? doc.indexOf(to, a + from.length) : -1;
  return b < 0 ? doc.slice(a) : doc.slice(a, b);
}

/* ── 本章算术（全部从正文解析，不写死结果） ─────────────────────── */

/**
 * 本章的三笔账：
 *   1) 声明对账：正文报了一个伪品总数，四味药的逐项数相加必须等于它，每一项的括号内又要点得出同样多个名字
 *   2) 表内复核：判据表「常见伪品」一列的项数逐行相加，再用它去对同一笔总数
 *   3) 取样对账：抽样件数 ÷ 总包件数 = 覆盖率，差额就是没开的包件
 */
function arithmetic(doc, ts) {
  const ruleTable = tableBy(ts, '常见伪品');
  const fieldTable = tableBy(ts, '要求');
  if (!ruleTable) throw new Error('正文缺「常见伪品」判据表');

  // 1) 正文声明：12 类伪品 = 人参 3 + 天麻 4 + 大黄 3 + 半夏 2
  const statedTotal = num(doc, /点名了\s*(\d+)\s*类伪品/);
  const perHerb = [...doc.matchAll(/([\u4e00-\u9fa5]{2})\s*(\d+)（([^）]+)）/g)]
    .filter((mm) => ['人参', '天麻', '大黄', '半夏'].includes(mm[1]))
    .map((mm) => ({ herb: mm[1], stated: Number(mm[2]), names: splitNames(mm[3]) }));
  const declaredSum = perHerb.reduce((n, x) => n + x.stated, 0);
  const nameSum = perHerb.reduce((n, x) => n + x.names.length, 0);
  const eachParenOk = perHerb.every((x) => x.stated === x.names.length);
  const totalOk = statedTotal === declaredSum && declaredSum === nameSum;
  const meanPerHerb = perHerb.length ? Number((declaredSum / perHerb.length).toFixed(2)) : null;

  // 2) 表内复核：判据表「常见伪品」列逐行点项
  const fpCol = colIndex(ruleTable, '常见伪品');
  const tableRows = ruleTable.rows.map((r) => ({
    herb: r[0],
    names: splitNames(r[fpCol]),
  }));
  const tableSum = tableRows.reduce((n, x) => n + x.names.length, 0);

  // 3) 三条路线：第 1 节里以「**第N条：」起头的段落
  const sec1 = sliceBetween(doc, '## 一、', '## 二、');
  const routes = (sec1.match(/\*\*第[一二三四五六]条：/g) || []).map((s) => s.replace(/\*\*/g, '').replace('：', ''));

  // 4) 取样对账：抽样 5 件、总包件数 600
  const sampleG = groups(doc, /抽样\s*(\d+)\s*件、总包件数\s*(\d+)/);
  const sampled = sampleG ? Number(sampleG[0]) : null;
  const lots = sampleG ? Number(sampleG[1]) : null;
  const coverage = sampled && lots ? Number(((sampled / lots) * 100).toFixed(2)) : null;
  const unopened = sampled && lots ? lots - sampled : null;
  const uncovered = sampled && lots ? Number(((unopened / lots) * 100).toFixed(2)) : null;
  // 三层取样：上、中、下
  const layers = (doc.match(/上、中、下三层/) ? 3 : 0);

  // 5) 名称相近、来源不同的一组混淆品
  const confPara = paragraphs(doc).find((p) => p.includes('还有一组容易被忽略的混淆品')) || '';
  const confPairs = confPara ? confPara.split('：')[1].split('。')[0].split('；').map((s) => s.trim()).filter(Boolean) : [];
  const confNames = confPairs.map((p) => p.split('（')[0]);

  // 6) 有毒伪品：代价段里被点名的那一串
  const toxicMatch = doc.match(/([\u4e00-\u9fa5、]+)都曾有中毒/);
  const toxicNames = toxicMatch ? splitNames(toxicMatch[1]) : [];

  // 7) 表格累计与列填充率
  const rowTotal = ts.reduce((n, t) => n + t.rows.length, 0);
  const colTotal = ts.reduce((n, t) => n + t.cols, 0);
  const failCol = colIndex(ruleTable, '不成立条件');
  const failFilled = ruleTable.rows.filter((r) => String(r[failCol] || '').trim().length > 0).length;
  const failShare = ruleTable.rows.length ? Number(((failFilled / ruleTable.rows.length) * 100).toFixed(0)) : null;

  // 8) 失效与考核项
  const sec4 = sliceBetween(doc, '## 四、', '## 代价与边界');
  const failures = (sec4.match(/^- \*\*/gm) || []).length;
  const tasks = (doc.match(/[①②③④⑤⑥]/g) || []).length;

  return {
    statedTotal,
    perHerb,
    declaredSum,
    nameSum,
    eachParenOk,
    totalOk,
    meanPerHerb,
    tableRows,
    tableSum,
    tableOk: tableSum === statedTotal,
    fpCol,
    routes,
    sampled,
    lots,
    coverage,
    unopened,
    uncovered,
    layers,
    confPairs,
    confNames,
    toxicNames,
    rowTotal,
    colTotal,
    judgeRows: ruleTable.rows.length,
    judgeCols: ruleTable.cols,
    fieldRows: fieldTable ? fieldTable.rows.length : 0,
    failFilled,
    failShare,
    failures,
    tasks,
    lines: [
      `声明总数：正文说 ${statedTotal} 类伪品；逐味相加 ${perHerb.map((x) => `${x.herb} ${x.stated}`).join(' + ')} = ${declaredSum}，括号内点名 ${nameSum} 个，三处一致：${totalOk ? '是' : '否'}`,
      `逐味自校：每一味括号里点出的名字个数都与前面的数字相同：${eachParenOk ? '是' : '否'}；平均每味 ${meanPerHerb} 类`,
      `表内复核：判据表 ${ruleTable.rows.length} 行「常见伪品」一列相加 = ${tableSum} 类，与正文声明的 ${statedTotal} 类一致：${tableSum === statedTotal ? '是' : '否'}`,
      `表内逐味：${tableRows.map((x) => `${x.herb} ${x.names.length}`).join('、')}`,
      `取样对账：抽样 ${sampled} 件 ÷ 总包件数 ${lots} 件 = 覆盖 ${coverage}%，未开包 ${unopened} 件（${uncovered}%）——样品是真的，也只是这 ${sampled} 件真`,
      `取样层次：${layers} 层（上／中／下），异常件单独取样、单独编号`,
      `三条路线：${routes.join('、')}，对应 ${routes.length} 种取证思路（查构造／查专属性外形／查行为与数据）`,
      `名称相近的一组混淆品 ${confNames.length} 对：${confNames.join('、')}`,
      `「不成立条件」一列写满 ${failFilled} / ${ruleTable.rows.length} 行，占 ${failShare}%——写不满的行，缺项判据就退不回去`,
      `表格累计：${ts.length} 张表共 ${rowTotal} 行 × ${colTotal} 列（判据表 ${ruleTable.cols} 列，记录字段 ${fieldTable ? fieldTable.rows.length : 0} 条）`,
      `第 4 节列四种失效 ${failures} 条，考核项 ${tasks} 项；代价段点名有毒伪品 ${toxicNames.length} 种（${toxicNames.join('、')}）`,
    ],
  };
}

/* ── quiz：结构 + 接地 ──────────────────────────────────────────── */

function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function quizCheck(quiz, doc) {
  const body = grams(doc);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const items = qs.map((q, i) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    const hit = [...grams(right)].filter((g) => body.has(g));
    const why = q.explain || q.explanation || '';
    return {
      n: i + 1,
      stage: q.stage,
      options: opts.length,
      correct: q.correct,
      explainHanzi: hanzi(why),
      grounded: hit.length,
      sample: hit.slice(0, 3),
    };
  });
  return {
    total: qs.length,
    stage,
    items,
    answers: qs.map((q) => q.correct),
    distinctAnswers: new Set(qs.map((q) => q.correct)).size,
    checkGrounded: items.filter((x) => x.stage === 'check' && x.grounded > 0).length,
    minExplain: items.length ? Math.min(...items.map((x) => x.explainHanzi)) : 0,
    allFourOptions: items.length > 0 && items.every((x) => x.options === 4),
    badCorrect: items.filter((x) => !(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4)).length,
    stageComplete: ['pre', 'check', 'post'].every((s) => stage[s] > 0),
  };
}

/* ── 汇总与自检 ────────────────────────────────────────────────── */

function analyze() {
  const doc = readDoc();
  const ts = tables(doc);
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    docHanzi: hanzi(doc),
    paragraphs: paragraphs(doc).length,
    sections: sections(doc),
    tables: ts.map((t) => ({ header: t.header, cols: t.cols, rows: t.rows.length })),
    arith: arithmetic(doc, ts),
    quiz: quizCheck(quiz, doc),
  };
}

function verify(r) {
  const bad = [];
  const a = r.arith;
  const q = r.quiz;

  if (r.docHanzi < 2500) bad.push(`正文只有 ${r.docHanzi} 汉字，低于 2500`);
  if (r.sections.length < 4 || r.sections.length > 8) bad.push(`二级小节 ${r.sections.length} 个，超出 4–8`);
  if (r.tables.length < 1) bad.push('正文没有表格');

  if (!a.totalOk) bad.push(`伪品总数对不上：声明 ${a.statedTotal}，逐味相加 ${a.declaredSum}，括号内点名 ${a.nameSum}`);
  if (!a.eachParenOk) bad.push('有一味的括号内名字个数与它前面的数字不等');
  if (!a.tableOk) bad.push(`表内复核对不上：判据表相加 ${a.tableSum} 类，正文声明 ${a.statedTotal} 类`);
  if (a.coverage === null) bad.push('正文没给出抽样件数与总包件数，算不出覆盖率');
  if (a.routes.length < 2) bad.push(`只解析出 ${a.routes.length} 条伪品来源路线`);

  if (q.total < 5) bad.push(`quiz 只有 ${q.total} 题，需 ≥5`);
  if (!q.stageComplete) bad.push(`quiz 三段不全：pre ${q.stage.pre} / check ${q.stage.check} / post ${q.stage.post}`);
  if (!q.allFourOptions) bad.push('quiz 有题的选项数不是 4');
  if (q.badCorrect) bad.push(`quiz 有 ${q.badCorrect} 题的 correct 下标越界`);
  if (q.minExplain < 30) bad.push(`quiz 最短解释 ${q.minExplain} 汉字，需 ≥30`);
  if (q.checkGrounded < 2) bad.push(`quiz 只有 ${q.checkGrounded} 道 check 题能在正文找到原词，需 ≥2`);
  if (q.distinctAnswers < 3) bad.push(`quiz 答案只落在 ${q.distinctAnswers} 个位置，需 ≥3`);
  return bad;
}

function report(r, bad) {
  const a = r.arith;
  console.log(`中药鉴定学 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log(`正文 ${r.docHanzi} 汉字 · ${r.paragraphs} 段 · 节 ${r.sections.length} 个`);
  console.log('');
  console.log('结构：');
  for (const s of r.sections) console.log(`  ${s}`);
  console.log('');
  console.log(`表 ${r.tables.length} 张：`);
  r.tables.forEach((t, i) => console.log(`  [${i + 1}] ${t.header.join(' / ')} —— ${t.cols} 列 × ${t.rows} 行`));
  console.log('');
  console.log('本章算术（全部从正文解析后计算）：');
  for (const line of a.lines) console.log(`  ${line}`);
  console.log('');
  console.log(`quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· 答案 ${r.quiz.answers.join('/')}`);
  console.log(`  check 题接地 ${r.quiz.checkGrounded} 道 · 答案落在 ${r.quiz.distinctAnswers} 个位置 · 最短解释 ${r.quiz.minExplain} 汉字`);
  console.log('');
  if (bad.length) {
    console.log(`✗ 自检 ${bad.length} 项不成立：`);
    for (const b of bad) console.log(`  - ${b}`);
  } else {
    console.log('✓ 自检全部成立：正文、算术、quiz 三者同源。');
  }
  console.log('※ 以上数字由本章正文与 quiz 现算，改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，讲判据结构、取样与记录要求，不构成任何药材的真伪结论；点名的伪品多有毒性，严禁入口尝试，判为伪品后应按不合格品处置。');
}

function main() {
  const r = analyze();
  const bad = verify(r);
  report(r, bad);
  if (bad.length) process.exit(1);
}

if (require.main === module) main();

module.exports = {
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  readDoc,
  sections,
  paragraphs,
  tables,
  tableBy,
  colIndex,
  sliceBetween,
  arithmetic,
  grams,
  hanzi,
  num,
  groups,
  splitNames,
  quizCheck,
  analyze,
  verify,
};
