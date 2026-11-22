#!/usr/bin/env node
/**
 * 中医药政策法规 · 第 8 章 · 技术跑在规则前面，救济跟在后面
 * 课程: departments/06-guanli/02-zhongyiyao-zhengce-fagui/chapters/08-z28/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的清单全部由本脚本从正文现算，不手打：
 *   技术介入三档与各自的责任落点、实质复核的四个痕迹、互联网三个管辖问题、
 *   健康数据三条红线、救济四条路及其关键条件、留痕五问。
 * 每一节还配一个探针词，用来确认小节顺序没有被改动。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '8';
const SLUG = '08-z28';
const TITLE = '技术跑在规则前面，救济跟在后面';

/** 技术介入三档，正文第一张表首列 */
const EXPECTED_TIERS = ['检索与提示', '建议与排序', '自动生成与执行'];

/** 实质复核的四个痕迹，正文第一节 */
const EXPECTED_TRACES = ['有没有看过原始输入', '有没有核对过关键结论', '有没有做出修改', '修改有没有理由'];

/** 健康数据三条红线，正文第三节三个粗体 */
const EXPECTED_REDLINES = ['目的特定', '最小必要', '可追溯'];

/** 救济四条路，正文第四张表首列 */
const EXPECTED_REMEDIES = ['投诉举报', '医疗纠纷人民调解', '行政复议 / 行政诉讼', '民事诉讼'];

/** 留痕五问，正文第五节有序列表 */
const EXPECTED_FIVE = ['输入是什么', '工具给了什么', '人做了什么', '谁签的字', '事后有没有复核'];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = [
  '形式复核能否免责',
  '不得对首诊患者开展',
  '目的特定',
  '谁主张谁举证',
  '让责任可分配',
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

/** 有序列表里每行的第一个粗体短语 */
function orderedBold(body) {
  const out = [];
  for (const line of String(body).split(LINES)) {
    const m = /^\d+\.\s+\*\*(.+?)\*\*/.exec(line.trim());
    if (m) out.push(m[1].replace(/[。、，：:]$/, '').trim());
  }
  return out;
}

/** 技术三档：第一张表首列 */
function threeTiers() {
  const t = tableBlocks(readDoc())[0];
  return t ? t.rows.map((r) => r[0]) : [];
}

/** 每档谁有决策权、责任落在谁身上 */
function tierDuties() {
  const t = tableBlocks(readDoc())[0];
  return t ? t.rows.map((r) => ({ tier: r[0], does: r[1], decision: r[2], liability: r[3] })) : [];
}

/** 四个痕迹：第一节「可以看四个痕迹：……」 */
function fourTraces() {
  const body = sectionAt(readDoc(), 0).body;
  const m = /四个痕迹[：:](.+?)。/.exec(body);
  return m ? m[1].split(/、/).map((s) => s.trim()).filter(Boolean) : [];
}

/** 互联网三个管辖问题：第二节三个粗体，去掉「第一，」前缀 */
function threeJurisdictions() {
  return boldItems(sectionAt(readDoc(), 1).body)
    .filter((x) => x.startsWith('第'))
    .map((x) => x.replace(/^第[一二三][，,]?/, '').replace(/。$/, ''));
}

/** 健康数据三条红线：第三节三个粗体 */
const threeRedlines = () => boldItems(sectionAt(readDoc(), 2).body);

/** 救济四条路：第二张表首列与关键条件 */
function fourRemedies() {
  const t = tableBlocks(readDoc())[1];
  return t ? t.rows.map((r) => ({ way: r[0], forWhat: r[1], who: r[2], condition: r[3] })) : [];
}

/** 留痕五问：第五节有序列表 */
const fiveTraces = () => orderedBold(sectionAt(readDoc(), 4).body);

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
    tiers: threeTiers(),
    duties: tierDuties(),
    traces: fourTraces(),
    jurisdictions: threeJurisdictions(),
    redlines: threeRedlines(),
    remedies: fourRemedies(),
    five: fiveTraces(),
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
  console.log(`技术介入三档（表序，${r.tiers.length} 档）：`);
  for (const d of r.duties) console.log(`  ${d.tier}｜技术做：${d.does}｜决策权：${d.decision}｜责任：${d.liability}`);
  console.log('');
  console.log(`实质复核的四个痕迹（${r.traces.length} 个）：${r.traces.join(' / ')}`);
  console.log(`互联网三个管辖问题（${r.jurisdictions.length} 个）：${r.jurisdictions.join(' / ')}`);
  console.log(`健康数据三条红线（${r.redlines.length} 条）：${r.redlines.join(' / ')}`);
  console.log('');
  console.log(`救济四条路（表序，${r.remedies.length} 条）：`);
  for (const x of r.remedies) console.log(`  ${x.way}｜解决：${x.forWhat}｜谁做：${x.who}｜条件：${x.condition}`);
  console.log('');
  console.log(`留痕五问（第五节有序列表，${r.five.length} 问）：`);
  r.five.forEach((x, i) => console.log(`  ${i + 1}. ${x}`));
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置 · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('');
  console.log('※ 以上清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，讨论制度结构与救济方法，不构成法律意见。');
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
  orderedBold,
  threeTiers,
  tierDuties,
  fourTraces,
  threeJurisdictions,
  threeRedlines,
  fourRemedies,
  fiveTraces,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  EXPECTED_TIERS,
  EXPECTED_TRACES,
  EXPECTED_REDLINES,
  EXPECTED_REMEDIES,
  EXPECTED_FIVE,
  SECTION_PROBES,
};
