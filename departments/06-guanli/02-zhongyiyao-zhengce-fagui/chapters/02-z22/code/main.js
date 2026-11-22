#!/usr/bin/env node
/**
 * 中医药政策法规 · 第 2 章 · 罚则写在纸上，执法站在门外
 * 课程: departments/06-guanli/02-zhongyiyao-zhengce-fagui/chapters/02-z22/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的清单与算术全部由本脚本从正文现算，不手打：
 *   四道门、两处空档、现场四件套、罚则三种失效、责任三条线、三项程序制度，
 *   以及「罚不痛」那张演算表（月违法收入、十二个月量级、与罚款下限的倍数）。
 * 表格里的数从正文读，算出来的数再与正文写的数对读；对不上就打印 ✗。
 *
 * 口径：汉字按 Unicode 汉字块计；金额与占比按表格单元格解析，千分位与「万」都要还原。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '2';
const SLUG = '02-z22';
const TITLE = '罚则写在纸上，执法站在门外';

/** 四道门，正文第一张表首列，顺序即表序 */
const EXPECTED_GATES = ['职责门', '发现门', '证据门', '裁量门'];

/** 两处空档，正文第二节两个粗体 */
const EXPECTED_GAPS = ['接口处', '能力处'];

/** 现场四件套，正文第三节四个粗体 */
const EXPECTED_CHECKS = ['证', '人', '药', '记录'];

/** 罚则三种失效，正文第四节三个粗体 */
const EXPECTED_FAILURES = ['够不着', '罚不痛', '不敢罚'];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = [
  '四道门',
  '接口处',
  '查排班表与签名',
  '够不着',
  '移送',
  '本章不引具体条文序号与法规全称',
];

/** 责任三条线，正文第五节三个粗体 */
const EXPECTED_LINES = ['对机构', '对人员', '对监管者'];

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

/** 数字还原：去千分位、去单位、「万」乘一万 */
function num(cellText) {
  const raw = String(cellText).replace(/,/g, '');
  const m = /([\d.]+)\s*(万)?/.exec(raw);
  if (!m) return NaN;
  return Number(m[1]) * (m[2] ? 10000 : 1);
}

/** 表格按首列关键词取一行 */
const tableValue = (rows, key) => {
  const row = rows.find((r) => r[0].includes(key));
  return row ? num(row[1]) : NaN;
};

const fourGates = () => {
  const t = tableBlocks(readDoc())[0];
  return t ? t.rows.map((r) => r[0]) : [];
};

/** 每道门的问题与卡点：同一张表的第二、三列 */
function gateDetails() {
  const t = tableBlocks(readDoc())[0];
  return t ? t.rows.map((r) => ({ gate: r[0], problem: r[1], stuck: r[2] })) : [];
}

/** 两处空档：第二节「第一个空档在**接口处**」「第二个空档在**能力处**」 */
function twoGaps() {
  const body = sectionAt(readDoc(), 1).body;
  return [...body.matchAll(/空档在\*\*(.+?)\*\*/g)].map((m) => m[1]);
}

/** 高风险点位：第二节「集中到高风险点位：……」一句的四项 */
function highRiskPoints() {
  const line = readDoc().split(LINES).find((l) => l.includes('集中到高风险点位')) || '';
  const tail = (/高风险点位[：:](.+?)。/.exec(line) || [null, ''])[1];
  return tail.split(/、/).map((s) => s.trim()).filter(Boolean);
}

/** 现场四件套：第三节的四个粗体 */
const fourChecks = () => boldItems(sectionAt(readDoc(), 2).body);

/** 罚则三种失效：第四节的三个粗体 */
const threeFailures = () => boldItems(sectionAt(readDoc(), 3).body).filter((x) => x.length <= 4);

/** 三项程序制度：第四节引号里的三项 */
function threeProcedures() {
  const body = sectionAt(readDoc(), 3).body;
  const m = /「([^」]*、[^」]*、[^」]*)」这三项程序制度/.exec(body);
  return m ? m[1].split(/、/).map((s) => s.trim()) : [];
}

/** 责任三条线：第五节三个粗体 */
const threeLines = () => boldItems(sectionAt(readDoc(), 4).body).filter((x) => x.startsWith('对'));

/** 「罚不痛」那张演算表：设定值与算出来的数对读 */
function penaltyArithmetic() {
  const t = tableBlocks(readDoc())[1];
  const rows = t ? t.rows : [];
  const perService = tableValue(rows, '单次超范围服务的收费');
  const visits = tableValue(rows, '月接诊人次');
  const share = tableValue(rows, '超范围部分占比') / 100;
  const docMonthly = tableValue(rows, '月违法收入');
  const fine = tableValue(rows, '法定罚款区间下限');
  const months = tableValue(rows, '查处周期');
  const illegalVisits = Math.round(visits * share);
  const monthly = perService * illegalVisits;
  const total = monthly * months;
  return {
    perService,
    visits,
    share,
    illegalVisits,
    monthly,
    docMonthly,
    monthlyOk: monthly === docMonthly,
    fine,
    months,
    total,
    multiple: fine ? Math.round((total / fine) * 10) / 10 : NaN,
  };
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
    gates: fourGates(),
    details: gateDetails(),
    gaps: twoGaps(),
    risks: highRiskPoints(),
    checks: fourChecks(),
    failures: threeFailures(),
    procedures: threeProcedures(),
    lines: threeLines(),
    arithmetic: penaltyArithmetic(),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).body.includes(p) })),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  const a = r.arithmetic;
  console.log(`中医药政策法规 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`四道门（正文表序，${r.gates.length} 道）：${r.gates.join(' / ')}`);
  for (const d of r.details) console.log(`  ${d.gate}｜${d.problem}｜卡在：${d.stuck}`);
  console.log('');
  console.log(`两处空档（第二节粗体，现算 ${r.gaps.length} 处）：${r.gaps.join(' / ')}`);
  console.log(`高风险点位（${r.risks.length} 类）：${r.risks.join(' / ')}`);
  console.log('');
  console.log(`现场四件套（${r.checks.length} 样）：${r.checks.join(' / ')}`);
  console.log(`罚则三种失效（${r.failures.length} 种）：${r.failures.join(' / ')}`);
  console.log(`三项程序制度（${r.procedures.length} 项）：${r.procedures.join(' / ')}`);
  console.log(`责任三条线（${r.lines.length} 条）：${r.lines.join(' / ')}`);
  console.log('');
  console.log('「罚不痛」演算（表内设定 → 现算）：');
  console.log(
    `  ${a.perService} 元/次 × ${a.visits} 人次 × ${Math.round(a.share * 100)}% = ${a.illegalVisits} 人次/月 → ${a.monthly.toLocaleString('en-US')} 元/月 ${a.monthlyOk ? '✓' : '✗'}（正文写 ${a.docMonthly.toLocaleString('en-US')}）`
  );
  console.log(
    `  ${a.months} 个月累计 ${a.total.toLocaleString('en-US')} 元，是罚款下限 ${a.fine.toLocaleString('en-US')} 元的 ${a.multiple} 倍`
  );
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置 · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('');
  console.log('※ 以上清单与算术全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，讨论监管结构与责任分配，不构成办案指引。');
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
  fourGates,
  gateDetails,
  twoGaps,
  highRiskPoints,
  fourChecks,
  threeFailures,
  threeProcedures,
  threeLines,
  penaltyArithmetic,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  EXPECTED_GATES,
  EXPECTED_GAPS,
  EXPECTED_CHECKS,
  EXPECTED_FAILURES,
  EXPECTED_LINES,
  SECTION_PROBES,
};
