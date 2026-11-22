#!/usr/bin/env node
/**
 * 中医智能设备 · 第 1 章 · 「指下难明」不是修辞：仪器要解决的是留证，不是替代手指
 * 课程: departments/07-zhineng/03-zhongyi-zhineng-shebei/chapters/01-q1/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   小节顺序、四元表、六类器械、三级形态、选型四问、三条硬边界，
 *   以及「门诊十秒」与「二十四小时」两笔采样点账。
 * 正文一改，重跑即可看出哪个数对不上；测试把这些数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '1';
const SLUG = '01-q1';
const TITLE = '「指下难明」不是修辞：仪器要解决的是留证，不是替代手指';

const GRAM = 4;

const readDoc = () => fs.readFileSync(DOC, 'utf8');

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

/** 按二级标题切段，返回 [{ title, body }]；body 含标题行本身 */
function h2Sections(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split(/\r?\n/)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) {
      cur = { title: m[1].trim(), body: [line] };
      out.push(cur);
    } else if (cur) cur.body.push(line);
  }
  return out.map((s) => ({ title: s.title, body: s.body.join('\n') }));
}

const h2Titles = (text) => h2Sections(text).map((s) => s.title);
const sectionAt = (text, i) => (h2Sections(text)[i] || { title: '', body: '' }).body;

/** 表格：连续以 | 开头的行成块；head 为表头，rows 去掉分隔行 */
function tableBlocks(text) {
  const blocks = [];
  let cur = null;
  for (const line of String(text).split(/\r?\n/)) {
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

/** 正文里长度为 n 的连续汉字片段集合 */
function grams(text, n = GRAM) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 四元：正文第二张小表的首列 */
function elements(text) {
  const b = tableBlocks(text)[0];
  return b ? b.rows.map((r) => r[0]).filter(Boolean) : [];
}

/** 六类器械：正文「器械落在六类里：甲（…）、乙（…）…」一句现切 */
function deviceClasses(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('六类里')) || '';
  const tail = (/六类里[：:](.+?)。/.exec(line) || [null, ''])[1];
  return (tail.match(/([\u4e00-\u9fff]+)（/g) || []).map((s) => s.replace('（', ''));
}

/** 三级形态：「形态上分三级：台式、便携、可穿戴」 */
function forms(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('形态上分三级')) || '';
  const tail = (/形态上分三级[：:](.+?)。/.exec(line) || [null, ''])[1];
  return tail.split(/[、，,]/).map((s) => s.trim()).filter(Boolean);
}

/** 选型四问：正文加粗的「第 N 问，……」 */
function selectionQuestions(text) {
  const out = [];
  for (const m of String(text).matchAll(/\*\*(第[一二三四五六七八]问)[，,](.+?)。\*\*/g)) {
    out.push({ n: m[1], ask: m[2].trim() });
  }
  return out;
}

/** 三条硬边界：「天花板」一节里加粗的首句（排除选型四问那组） */
function hardLimits(text) {
  const out = [];
  for (const m of sectionAt(text, 5).matchAll(/^\*\*([^*。]+)。\*\*/gm)) {
    const k = m[1].trim();
    if (!/^第[一二三四]问/.test(k)) out.push(k);
  }
  return out;
}

/** 门诊十秒：条数 × 采样率 × 秒数；正文先给单条点数，再给合计万数 */
function clinicPoints(text) {
  const m = /一例就是\s*(\d+)\s*条曲线；每条按\s*(\d+)\s*Hz\s*采\s*(\d+)\s*秒即\s*([\d,]+)\s*点，合计\s*([\d.]+)\s*万个采样点/.exec(text);
  if (!m) return null;
  const curves = Number(m[1]);
  const hz = Number(m[2]);
  const sec = Number(m[3]);
  const statedPerLine = Number(m[4].replace(/,/g, ''));
  const statedWan = Number(m[5]);
  const perLine = hz * sec;
  const points = curves * perLine;
  return {
    curves,
    hz,
    sec,
    perLine,
    points,
    statedPerLine,
    statedWan,
    ok: perLine === statedPerLine && Number((points / 1e4).toFixed(1)) === statedWan,
  };
}

/** 二十四小时：采样率 × 86400，16 位存储折算 MB */
function holterScale(text) {
  const m = /24\s*小时动态心电\s*(\d+)\s*Hz，是\s*([\d,]+)\s*万个采样点，16\s*位存储就是\s*([\d.]+)\s*MB/.exec(text);
  if (!m) return null;
  const hz = Number(m[1]);
  const statedWan = Number(m[2].replace(/,/g, ''));
  const statedMB = Number(m[3]);
  const points = hz * 3600 * 24;
  const wan = points / 1e4;
  const mb = (points * 2) / 1e6;
  return {
    hz,
    points,
    wan,
    mb,
    statedWan,
    statedMB,
    ok: wan === statedWan && Number(mb.toFixed(1)) === statedMB,
  };
}

/** quiz 结构与接地：check 题正确选项能对上几个四字原词 */
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
    correctIndexes: qs.map((q) => q.correct),
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    tables: tableBlocks(text).map((b) => ({ cols: b.head.length, rows: b.rows.length })),
    elements: elements(text),
    classes: deviceClasses(text),
    forms: forms(text),
    questions: selectionQuestions(text),
    limits: hardLimits(text),
    clinic: clinicPoints(text),
    holter: holterScale(text),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医智能设备 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个 · 表 ${r.tables.length} 张`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`可感测四元：${r.elements.join(' · ')}`);
  console.log(`六类器械：${r.classes.join(' · ')}`);
  console.log(`三级形态：${r.forms.join(' · ')}`);
  console.log('');
  console.log(`选型四问（${r.questions.length} 问）：${r.questions.map((q) => q.ask).join(' / ')}`);
  console.log(`三条硬边界（${r.limits.length} 条）：${r.limits.join(' / ')}`);
  console.log('');
  if (r.clinic) {
    const c = r.clinic;
    console.log(
      `门诊十秒：单条 ${c.hz} Hz × ${c.sec} 秒 = ${c.perLine.toLocaleString('en-US')} 点（正文 ${c.statedPerLine.toLocaleString('en-US')}）；` +
        `${c.curves} 条合计 ${c.points.toLocaleString('en-US')} 点 = ${(c.points / 1e4).toFixed(1)} 万（正文 ${c.statedWan} 万）${c.ok ? ' ✓ 对得上' : ' ✗ 对不上'}`
    );
  }
  if (r.holter) {
    const h = r.holter;
    console.log(
      `二十四小时：${h.hz} Hz × 86,400 秒 = ${h.points.toLocaleString('en-US')} 点 = ${h.wan} 万` +
        `，16 位 ${h.mb.toFixed(1)} MB（正文写 ${h.statedWan} 万 / ${h.statedMB} MB）${h.ok ? ' ✓ 对得上' : ' ✗ 对不上'}`
    );
  }
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）` +
      ` · check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 正确项落点 ${[...new Set(r.quiz.correctIndexes)].join('/')}`
  );
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见、诊断或治疗建议；设备输出仅为提示。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Sections,
  h2Titles,
  sectionAt,
  tableBlocks,
  occurrences,
  grams,
  elements,
  deviceClasses,
  forms,
  selectionQuestions,
  hardLimits,
  clinicPoints,
  holterScale,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
