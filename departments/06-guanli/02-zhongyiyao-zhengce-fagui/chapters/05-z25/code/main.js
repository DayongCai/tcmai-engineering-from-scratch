#!/usr/bin/env node
/**
 * 中医药政策法规 · 第 5 章 · 老祖宗的方子，要过现代的审
 * 课程: departments/06-guanli/02-zhongyiyao-zhengce-fagui/chapters/05-z25/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的清单与算术全部由本脚本从正文现算，不手打：
 *   一株药的三次变形与逐级加码的要求、注册三条通道各自「买」什么、
 *   经典名方目录的四条限制、使用端三个环节，以及代煎那张成本表的毛利（含加一次复核）。
 *
 * 口径：表格金额按单元格解析（去千分位、小数照读）；「12 味 × 7 剂」只取代煎的剂数。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '5';
const SLUG = '05-z25';
const TITLE = '老祖宗的方子，要过现代的审';

/** 三次变形，正文第一张表首列 */
const EXPECTED_FORMS = ['中药材', '中药饮片', '中成药 / 院内制剂'];

/** 逐级加码的三个问法，正文第一节 */
const EXPECTED_STAGES = ['是不是这个东西', '加工得对不对', '批与批之间一样不一样'];

/** 三条注册通道，正文第二张表首列 */
const EXPECTED_CHANNELS = ['常规注册', '经典名方复方制剂', '医疗机构制剂'];

/** 三条通道各自「买」什么，正文第二节 */
const EXPECTED_BUYS = ['新', '古', '小而专'];

/** 经典名方目录的四条限制，正文第三节四个粗体 */
const EXPECTED_LIMITS = ['目录是「方」，不是「产品」', '免的是临床，不是质量', '病证范围是限定的', '药材与炮制仍须合规'];

/** 使用端三个环节，正文第五节三个粗体 */
const EXPECTED_USES = ['抓方与调剂', '代煎', '配方颗粒'];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = [
  '基原准确',
  '买的是「古」',
  '免的是临床',
  '企业要在底线之上建立自己的内控标准',
  '煎药室',
  '本章不引具体条文序号与规范全称',
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

/** 数字：去千分位，负号照读 */
function num(cellText) {
  const m = /(-?[\d.]+)/.exec(String(cellText).replace(/,/g, ''));
  return m ? Number(m[1]) : NaN;
}

const tableValue = (rows, key) => {
  const row = rows.find((r) => r[0].includes(key));
  return row ? num(row[1]) : NaN;
};

/** 三次变形：第一张表首列 */
function threeForms() {
  const t = tableBlocks(readDoc())[0];
  return t ? t.rows.map((r) => r[0]) : [];
}

/** 每次变形各自问的那一句：正文「逐级加码：……」 */
function formStages() {
  const line = readDoc().split(LINES).find((l) => l.includes('逐级加码')) || '';
  const tail = (/逐级加码[：:](.+?)。/.exec(line) || [null, ''])[1];
  return [...tail.matchAll(/「(.+?)」/g)].map((m) => m[1]);
}

/** 三条通道：第二张表首列 */
function threeChannels() {
  const t = tableBlocks(readDoc())[1];
  return t ? t.rows.map((r) => r[0]) : [];
}

/** 通道换来了什么：第二张表末列 */
function channelReturns() {
  const t = tableBlocks(readDoc())[1];
  return t ? t.rows.map((r) => ({ channel: r[0], need: r[2], got: r[3] })) : [];
}

/** 三条通道各自「买」的那个字：正文「第一条买的是「新」……」 */
function channelBuys() {
  const line = readDoc().split(LINES).find((l) => l.includes('第一条买的是')) || '';
  return [...line.matchAll(/「(.+?)」/g)].map((m) => m[1]);
}

/** 四条限制：第三节四个粗体 */
const fourLimits = () => boldItems(sectionAt(readDoc(), 2).body);

/** 使用端三个环节：第五节三个粗体 */
const threeUses = () => boldItems(sectionAt(readDoc(), 4).body);

/** 代煎成本：表内设定现算毛利，并与表里写的数对读 */
function decoctionMath() {
  const t = tableBlocks(readDoc())[2];
  const rows = t ? t.rows : [];
  const doseCell = (rows.find((r) => r[0].includes('单张处方')) || [null, ''])[1];
  const doses = Number((/(\d+)\s*剂/.exec(doseCell) || [0, NaN])[1]);
  const costPerDose = tableValue(rows, '每剂饮片成本');
  const feePerDose = tableValue(rows, '代煎收费');
  const laborPerDose = tableValue(rows, '每剂人工');
  const docMargin = tableValue(rows, '单张处方代煎毛利');
  const reviewCell = (rows.find((r) => r[0].includes('复核')) || [null, ''])[1];
  const reviewCost = Number(String((/([+-]?\s*[\d.]+)/.exec(reviewCell) || [0, NaN])[1]).replace(/\s/g, ''));
  const margin = Math.round((feePerDose - laborPerDose) * doses * 100) / 100;
  const marginWithReview = Math.round((feePerDose - laborPerDose - reviewCost) * doses * 100) / 100;
  return {
    doses,
    costPerDose,
    feePerDose,
    laborPerDose,
    reviewCost,
    docMargin,
    margin,
    marginOk: margin === docMargin,
    marginWithReview,
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
    forms: threeForms(),
    stages: formStages(),
    channels: threeChannels(),
    returns: channelReturns(),
    buys: channelBuys(),
    limits: fourLimits(),
    uses: threeUses(),
    math: decoctionMath(),
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
  console.log(`三次变形（表序，${r.forms.length} 层）：${r.forms.join(' → ')}`);
  console.log(`逐级加码的问法（${r.stages.length} 问）：${r.stages.join(' / ')}`);
  console.log('');
  console.log(`注册三条通道（表序，${r.channels.length} 条）：`);
  for (const c of r.returns) console.log(`  ${c.channel}｜要 ${c.need}｜换来 ${c.got}`);
  console.log(`各自「买」的字（现算 ${r.buys.length} 个）：${r.buys.join(' / ')}`);
  console.log('');
  console.log(`目录的四条限制（第三节粗体，${r.limits.length} 条）：`);
  r.limits.forEach((x, i) => console.log(`  ${i + 1}. ${x}`));
  console.log(`使用端三个环节（${r.uses.length} 个）：${r.uses.join(' / ')}`);
  console.log('');
  console.log('代煎成本（表内设定 → 现算）：');
  console.log(`  ${m.doses} 剂 ×（${m.feePerDose} 元收费 − ${m.laborPerDose} 元人工）= ${m.margin} 元 ${m.marginOk ? '✓' : '✗'}（正文写 ${m.docMargin}）`);
  console.log(`  若加一次复核（+${m.reviewCost} 元/剂）→ ${m.marginWithReview} 元，由赚转亏`);
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置 · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('');
  console.log('※ 以上清单与算术全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，讨论监管结构，不构成用药建议。');
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
  threeForms,
  formStages,
  threeChannels,
  channelReturns,
  channelBuys,
  fourLimits,
  threeUses,
  decoctionMath,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  EXPECTED_FORMS,
  EXPECTED_STAGES,
  EXPECTED_CHANNELS,
  EXPECTED_BUYS,
  EXPECTED_LIMITS,
  EXPECTED_USES,
  SECTION_PROBES,
};
