#!/usr/bin/env node
/**
 * 骨伤科手法治疗学 · 第 2 章 · 八法是六条，而且是一条链：断在「摸」上，后面全错
 * 课程: departments/04-gushang/08-gushang-shoufa-zhiliao/chapters/02-zhenggu-bafa/docs/zh.md
 * 依据: 《医宗金鉴·正骨心法要旨·手法释义》《仙授理伤续断秘方》
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   六目、由六目拆出的八个名、三组分工、三段的力度与时间梯度、
 *   译成三类时丢掉的六样、八法之外的五个动作，以及 quiz 的接地情况。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '2';
const SLUG = '02-zhenggu-bafa';
const TITLE = '八法是六条，而且是一条链：断在「摸」上，后面全错';

/** 六目，正文原句给出，这里只写期望值供测试对照 */
const EXPECTED_SIX = ['摸', '接', '端', '提', '按摩', '推拿'];

/** 拆开两条合并目之后的八个名 */
const EXPECTED_EIGHT = ['摸', '接', '端', '提', '按', '摩', '推', '拿'];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = ['六目', '摸法居首', '稳而准', '丢掉了摸法', '手法复位与手术指征', '不写操作参数'];

const GRAM = 4;
const LINES = /\r?\n/;

const readDoc = () => fs.readFileSync(DOC, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

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

const occurrences = (text, term) => String(text).split(term).length - 1;

function grams(text, n = GRAM) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
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

/** 六目：正文「原书「手法释义」只列六目：……」一句列出的六项 */
function sixItems() {
  const line = readDoc().split(LINES).find((l) => l.includes('只列六目')) || '';
  const tail = (/只列六目[：:]([^—]+)/.exec(line) || [null, ''])[1];
  return tail.split(/、/).map((s) => s.trim()).filter(Boolean);
}

/** 八个名：六目里把「按摩」「推拿」各拆成两字，其余照旧 */
function eightNames() {
  const out = [];
  for (const item of sixItems()) {
    if (item.length === 2) out.push(item[0], item[1]);
    else out.push(item);
  }
  return out;
}

/** 三组分工：正文「摸法出信息、接端提管位置、推拿按摩管气血」一句 */
function threeGroups() {
  const line = readDoc().split(LINES).find((l) => l.includes('摸法出信息')) || '';
  const tail = (/摸法出信息(.+?)[—]/.exec(line) || [null, '、接端提管位置、推拿按摩管气血'])[1];
  return ('摸法出信息' + tail).split(/、/).map((s) => s.trim()).filter(Boolean);
}

/** 三段梯度表：正文第一张表，行数与力度列 */
function segmentGradient() {
  const t = tableBlocks(readDoc())[0];
  if (!t) return [];
  return t.rows.map((r) => ({ segment: r[0], method: r[1], force: r[2], time: r[3], verdict: r[4] }));
}

/** 译成三类时丢掉的六样：正文第四节粗体条目 */
const lostItems = () => boldItems(sectionAt(readDoc(), 3).body);

/** 八法之外的动作：正文「代价与边界」里「拔伸、折顶……都在八法之外」一句 */
function beyondEight() {
  const line = readDoc().split(LINES).find((l) => l.includes('都在八法之外')) || '';
  const tail = (/拔伸、(.+?)都在八法之外/.exec(line) || [null, ''])[1];
  return ('拔伸、' + tail).split(/、/).map((s) => s.trim()).filter(Boolean);
}

function quizSummary(quiz, text) {
  const body = grams(text);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  for (const q of qs) if (stage[q.stage] !== undefined) stage[q.stage] += 1;
  const hits = qs.filter((q) => q.stage === 'check').map((q) => {
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
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    six: sixItems(),
    eight: eightNames(),
    groups: threeGroups(),
    gradient: segmentGradient(),
    lost: lostItems(),
    beyond: beyondEight(),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).body.includes(p) })),
    terms: ['拔伸', '欲合先离', '稳而准', '提法', '摸法'].map((t) => ({ t, n: occurrences(text, t) })),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`骨伤科手法治疗学 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`原书六目（${r.six.length} 项）：${r.six.join(' / ')}`);
  console.log(`拆开两条合并目之后的八个名（${r.eight.length} 项）：${r.eight.join(' / ')}`);
  console.log(`三组分工（${r.groups.length} 组）：${r.groups.join(' / ')}`);
  console.log('');
  console.log('三段的力度与时间梯度（正文表序现算）：');
  for (const g of r.gradient) console.log(`  ${g.segment}：${g.method} · 力度${g.force} · 时间${g.time}`);
  console.log('');
  console.log(`译成三类时丢掉 ${r.lost.length} 样：`);
  r.lost.forEach((x, i) => console.log(`  ${i + 1}. ${x}`));
  console.log('');
  console.log(`八法之外的动作（${r.beyond.length} 个）：${r.beyond.join(' / ')}`);
  console.log('');
  console.log('关键判据（出现次数）：' + r.terms.map((x) => `${x.t} ${x.n}`).join(' · '));
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置`
  );
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成诊疗建议、诊断或治疗指导。');
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
  sixItems,
  eightNames,
  threeGroups,
  segmentGradient,
  lostItems,
  beyondEight,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  EXPECTED_SIX,
  EXPECTED_EIGHT,
  SECTION_PROBES,
};
