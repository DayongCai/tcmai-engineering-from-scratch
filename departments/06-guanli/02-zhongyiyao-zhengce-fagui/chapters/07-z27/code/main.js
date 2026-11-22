#!/usr/bin/env node
/**
 * 中医药政策法规 · 第 7 章 · 并重写在文件里，差价写在账本上
 * 课程: departments/06-guanli/02-zhongyiyao-zhengce-fagui/chapters/07-z27/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的清单与算术全部由本脚本从正文现算，不手打：
 *   并重的三个落点及其「名义并重」、诊查收入那张表的每小时接诊数与结余（含八小时合计）、
 *   三种支付方式、传统知识三种工具、并重的三层含义，以及末节那句检验标准。
 *
 * 口径：每小时接诊数由 60 除以单次时长取整现算，再与表里写的数对读；
 *      工资成本按表格单元原值读，不做任何调整。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '7';
const SLUG = '07-z27';
const TITLE = '并重写在文件里，差价写在账本上';

/** 三个落点，正文第一张表首列 */
const EXPECTED_ANCHORS = ['机构', '人员', '支付'];

/** 三种支付方式，正文第三节三个粗体 */
const EXPECTED_PAYMENTS = ['按项目付费', '按病种付费', '按人头付费'];

/** 传统知识三种工具，正文第四张表首列 */
const EXPECTED_TOOLS = ['行政保护名录与持有人制度', '地理标志与道地药材认定', '专利、商标、商业秘密、著作权'];

/** 并重三层含义，正文第五节 */
const EXPECTED_MEANINGS = ['地位并重', '资源并重', '价值并重'];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = [
  '支付最硬',
  '得到的不是效率，是敷衍',
  '让人少生病',
  '以公开换保护',
  '改变计价单元',
  '本章不引具体条文序号与法规全称',
];

const GRAM = 4;
const LINES = /\r?\n/;

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const occurrences = (text, term) => String(text).split(term).length - 1;

function h2Titles(text) {
  const out = [];
  for (const line of String(text).split(LINES)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) out.push(m[1].trim());
  }
  return out;
}

function h2Sections(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split(LINES)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) {
      cur = { title: m[1].trim(), body: [line] };
      out.push(cur);
    } else if (cur) cur.body.push(line);
  }
  return out.map((s) => ({ title: s.title, body: s.body.join('\n') }));
}

const sectionAt = (text, i) => (h2Sections(text)[i] || { title: '', body: '' });

function tableBlocks(text) {
  const blocks = [];
  let cur = null;
  for (const line of String(text).split(LINES)) {
    const s = line.trim();
    if (s.startsWith('|')) {
      if (!cur) {
        cur = [];
        blocks.push(cur);
      }
      cur.push(s);
    } else cur = null;
  }
  return blocks.map((b) => {
    const cells = b.map((r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
    return { head: cells[0] || [], rows: cells.slice(2) };
  });
}

function grams(text, n = GRAM) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function boldItems(body) {
  const out = [];
  for (const line of String(body).split(LINES)) {
    const m = /^(?:-\s+)?\*\*(.+?)。?\*\*/.exec(line.trim());
    if (m) out.push(m[1].replace(/[。、，]$/, '').trim());
  }
  return out;
}

function num(cellText) {
  const m = /(-?[\d.]+)/.exec(String(cellText).replace(/,/g, ''));
  return m ? Number(m[1]) : NaN;
}

const tableValue = (rows, key) => {
  const row = rows.find((r) => r[0].includes(key));
  return row ? num(row[1]) : NaN;
};

/** 三个落点：第一张表首列 */
function threeAnchors() {
  const t = tableBlocks(readDoc())[0];
  return t ? t.rows.map((r) => r[0]) : [];
}

/** 每个落点看什么、常见的名义并重：同一张表的后两列 */
function anchorDetails() {
  const t = tableBlocks(readDoc())[0];
  return t ? t.rows.map((r) => ({ anchor: r[0], look: r[1], nominal: r[2] })) : [];
}

/** 诊查收入表：每小时接诊数与结余都由时长与收费现算 */
function costModel() {
  const t = tableBlocks(readDoc())[1];
  const head = t ? t.head : [];
  const rows = t ? t.rows : [];
  const col = (name) => rows.map((r) => (r[0].includes(name) ? r : null)).filter(Boolean)[0] || [];
  const minuteRow = col('单次接诊时长');
  const docVisits = col('每小时可接诊');
  const docIncome = col('每小时诊查收入');
  const docLabor = col('每小时人力成本');
  const docBalance = col('每小时结余');
  const feeRow = col('诊查费标准');
  const sides = head.slice(1).map((name, i) => {
    const minutes = num(minuteRow[i + 1]);
    const visits = Math.floor(60 / minutes);
    const fee = num(feeRow[i + 1]);
    const labor = num(docLabor[i + 1]);
    const income = fee * visits;
    const balance = income - labor;
    return {
      side: name,
      minutes,
      visits,
      docVisits: num(docVisits[i + 1]),
      visitsOk: visits === num(docVisits[i + 1]),
      fee,
      income,
      docIncome: num(docIncome[i + 1]),
      incomeOk: income === num(docIncome[i + 1]),
      labor,
      balance,
      docBalance: num(docBalance[i + 1]),
      balanceOk: balance === num(docBalance[i + 1]),
      day8: balance * 8,
    };
  });
  return { sides, gap: sides.length === 2 ? sides[1].day8 - sides[0].day8 : NaN };
}

/** 三种支付方式：第三节三个粗体 */
const threePayments = () => boldItems(sectionAt(readDoc(), 2).body).filter((x) => x.includes('付费'));

/** 传统知识三种工具：第三张表首列 */
function threeTools() {
  const t = tableBlocks(readDoc())[2];
  return t ? t.rows.map((r) => r[0]) : [];
}

/** 并重三层含义：第五节三个粗体（夹在句子里，用词表扫） */
function threeMeanings() {
  const body = sectionAt(readDoc(), 4).body;
  return EXPECTED_MEANINGS.filter((k) => body.includes(k));
}

function quizSummary(quiz, text) {
  const body = grams(text);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  for (const q of qs) if (stage[q.stage] !== undefined) stage[q.stage] += 1;
  const hits = qs
    .filter((q) => q.stage === 'check')
    .map((q) => {
      const right = String((q.options || [])[q.correct] || '');
      return { question: q.question, grams: [...grams(right)].filter((g) => body.has(g)) };
    });
  return {
    total: qs.length,
    stage,
    check: hits.length,
    grounded: hits.filter((h) => h.grams.length).length,
    hits,
    spread: new Set(qs.map((q) => q.correct)).size,
    minExplain: Math.min(...qs.map((q) => hanzi(q.explain))),
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    anchors: threeAnchors(),
    details: anchorDetails(),
    model: costModel(),
    payments: threePayments(),
    tools: threeTools(),
    meanings: threeMeanings(),
    test: /它改变的是钱的流向，还是只是说法/.test(text),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).body.includes(p) })),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医药政策法规 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`并重的三个落点（表序，${r.anchors.length} 个）：${r.anchors.join(' / ')}`);
  for (const d of r.details) console.log(`  ${d.anchor}｜看：${d.look}｜名义并重：${d.nominal}`);
  console.log('');
  console.log('诊查收入（表内设定 → 现算）：');
  for (const s of r.model.sides) {
    console.log(
      `  ${s.side}：60 ÷ ${s.minutes} 分 = ${s.visits} 人/时 ${s.visitsOk ? '✓' : '✗'}｜${s.fee} 元 × ${s.visits} = ${s.income} 元 ${s.incomeOk ? '✓' : '✗'}｜结余 ${s.balance} 元 ${s.balanceOk ? '✓' : '✗'}｜八小时 ${s.day8} 元`
    );
  }
  console.log(`  八小时差距 ${r.model.gap} 元 —— 正文要求用三种方式之一去补，而不是靠提高觉悟`);
  console.log('');
  console.log(`三种支付方式（${r.payments.length} 种）：${r.payments.join(' / ')}`);
  console.log(`传统知识三种工具（${r.tools.length} 类）：${r.tools.join(' / ')}`);
  console.log(`并重三层含义（${r.meanings.length} 层）：${r.meanings.join(' / ')}`);
  console.log(`检验标准（末节那句）：${r.test ? '已写入正文' : '缺'}`);
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置 · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('');
  console.log('※ 以上清单与算术全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，讨论制度工具，不构成政策建议。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Titles,
  h2Sections,
  sectionAt,
  tableBlocks,
  occurrences,
  grams,
  boldItems,
  num,
  threeAnchors,
  anchorDetails,
  costModel,
  threePayments,
  threeTools,
  threeMeanings,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  EXPECTED_ANCHORS,
  EXPECTED_PAYMENTS,
  EXPECTED_TOOLS,
  EXPECTED_MEANINGS,
  SECTION_PROBES,
};
