#!/usr/bin/env node
/**
 * 中医药政策法规 · 第 6 章 · 治未病的钱，付给了谁
 * 课程: departments/06-guanli/02-zhongyiyao-zhengce-fagui/chapters/06-z26/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的清单与算术全部由本脚本从正文现算，不手打：
 *   公卫通道的三个特征、传染病防治的三问、家医签约那张收支表的余额与占比、
 *   指标三层并用，以及「越容易测量越容易失真」这条规律在正文里的写法。
 *
 * 口径：表格金额按单元格解析，带「万」的乘一万；占比按「10% 居民购买」一句现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '6';
const SLUG = '06-z26';
const TITLE = '治未病的钱，付给了谁';

/** 公卫通道的三个特征，正文第一节三个粗体 */
const EXPECTED_FEATURES = ['按人头拨款', '服务包清单化', '考核看率'];

/** 传染病防治三问，正文第二节三个粗体（去掉「第一，」前缀） */
const EXPECTED_QUESTIONS = ['什么时候进', '以什么身份进', '药从哪来'];

/** 指标三层，正文第五节 */
const EXPECTED_TIERS = ['简单指标', '抽样复核', '结果指标'];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = [
  '只能在既有盘子里重新分配',
  '不取决于战时的动员',
  '影响健康的决策，大多不在卫生部门手里',
  '可行区间很窄',
  '越容易测量的指标',
  '本章不引具体条文序号与规范全称',
];

/** 正文对中医服务包给的两个价格带 */
const EXPECTED_BANDS = ['高频低价', '低频高价'];

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

/** 数字：去千分位、「万」乘一万 */
function num(cellText) {
  const raw = String(cellText).replace(/,/g, '');
  const m = /(-?[\d.]+)\s*(万)?/.exec(raw);
  return m ? Number(m[1]) * (m[2] ? 10000 : 1) : NaN;
}

const tableValue = (rows, key) => {
  const row = rows.find((r) => r[0].includes(key));
  return row ? num(row[1]) : NaN;
};

/** 公卫通道三个特征：第一节三个粗体 */
const threeFeatures = () => boldItems(sectionAt(readDoc(), 0).body);

/** 传染病三问：第二节三个粗体，去掉序数前缀 */
const threeQuestions = () =>
  boldItems(sectionAt(readDoc(), 1).body)
    .filter((x) => x.startsWith('第'))
    .map((x) => x.replace(/^第[一二三][，,]?/, ''));

/** 家医签约收支：表内设定现算，与表里写的数对读 */
function contractMath() {
  const t = tableBlocks(readDoc())[0];
  const rows = t ? t.rows : [];
  const fee = tableValue(rows, '签约服务费');
  const residents = tableValue(rows, '签约居民数');
  const docIncome = tableValue(rows, '团队年收入');
  const labor = tableValue(rows, '团队人力成本');
  const docBalance = tableValue(rows, '可支配余额');
  const packagePrice = tableValue(rows, '中医服务包定价');
  const docPackage = tableValue(rows, '居民购买');
  const income = fee * residents;
  const balance = income - labor;
  const buyers = Math.round(residents * 0.1);
  const packageCost = packagePrice * buyers;
  return {
    fee,
    residents,
    income,
    docIncome,
    incomeOk: income === docIncome,
    labor,
    balance,
    docBalance,
    balanceOk: balance === docBalance,
    packagePrice,
    buyers,
    packageCost,
    docPackage,
    packageOk: packageCost === docPackage,
    share: balance ? Math.round((packageCost / balance) * 1000) / 10 : NaN,
  };
}

/** 中医服务包的两个价格带：正文「把高频低价的……与低频高价的……分开」 */
function twoBands() {
  const line = readDoc().split(LINES).find((l) => l.includes('高频低价')) || '';
  return [...line.matchAll(/(高频低价|低频高价)/g)].map((m) => m[1]);
}

/** 指标三层：第五节「简单指标 + 抽样复核 + 结果指标」 */
function indicatorTiers() {
  const line = readDoc().split(LINES).find((l) => l.includes('三层并用')) || '';
  const m = /「([^」]*\+[^」]*)」/.exec(line);
  return m ? m[1].split(/\s*\+\s*/).map((s) => s.trim()) : [];
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
    features: threeFeatures(),
    questions: threeQuestions(),
    math: contractMath(),
    bands: twoBands(),
    tiers: indicatorTiers(),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).body.includes(p) })),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  const m = r.math;
  console.log(`中医药政策法规 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`公卫通道三个特征（第一节粗体，${r.features.length} 条）：${r.features.join(' / ')}`);
  console.log(`传染病防治三问（第二节粗体，${r.questions.length} 问）：${r.questions.join(' / ')}`);
  console.log('');
  console.log('家医签约收支（表内设定 → 现算）：');
  console.log(`  ${m.fee} 元 × ${m.residents.toLocaleString('en-US')} 人 = ${m.income.toLocaleString('en-US')} 元 ${m.incomeOk ? '✓' : '✗'}（正文写 ${m.docIncome.toLocaleString('en-US')}）`);
  console.log(`  年收入 − 人力 ${m.labor.toLocaleString('en-US')} = 可支配 ${m.balance.toLocaleString('en-US')} 元 ${m.balanceOk ? '✓' : '✗'}（正文写 ${m.docBalance.toLocaleString('en-US')}）`);
  console.log(`  中医服务包 ${m.packagePrice} 元 × ${m.buyers} 人（10%）= ${m.packageCost.toLocaleString('en-US')} 元 ${m.packageOk ? '✓' : '✗'}（正文写 ${m.docPackage.toLocaleString('en-US')}），占可支配余额 ${m.share}%`);
  console.log('');
  console.log(`服务包的两个价格带（现算 ${r.bands.length} 个）：${r.bands.join(' / ')}`);
  console.log(`指标三层（${r.tiers.length} 层）：${r.tiers.join(' / ')}`);
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置 · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('');
  console.log('※ 以上清单与算术全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，讨论制度结构，不构成公卫决策建议。');
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
  threeFeatures,
  threeQuestions,
  contractMath,
  twoBands,
  indicatorTiers,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  EXPECTED_FEATURES,
  EXPECTED_QUESTIONS,
  EXPECTED_TIERS,
  EXPECTED_BANDS,
  SECTION_PROBES,
};
