#!/usr/bin/env node
/**
 * 骨伤科手法治疗学 · 第 5 章 · 颈肩的风险不在手上，在筛上
 * 课程: departments/04-gushang/08-gushang-shoufa-zhiliao/chapters/05-jingjian/docs/zh.md
 * 依据: 《医宗金鉴·正骨心法要旨·手法释义》
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   颈肩三段、落枕的三条阴性体征与要排除的五类、肩周炎三期、
 *   颈部三条硬界，以及 quiz 的 check 题能在正文里对上几个四字原词。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '5';
const SLUG = '05-jingjian';
const TITLE = '颈肩的风险不在手上，在筛上';

const EXPECTED_SEGMENTS = ['颈段', '肩胛段', '肩段'];
const EXPECTED_NEGATIVES = ['无上肢放射性麻木疼痛', '无肌力减退', '无腱反射异常'];
const EXPECTED_PHASES = ['疼痛期', '冻结期', '恢复期'];

const SECTION_PROBES = ['三段', '三条阴性体征', '痛与僵的比例', '疼痛弧', '腋神经', '不以', '肩胛段', '不写手法参数'];

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
    if (!m) continue;
    const label = m[1].trim();
    if (label.endsWith('：') || label.endsWith(':')) continue;
    out.push(label.replace(/[。、，]$/, '').trim());
  }
  return out;
}

/** 去括号：把「颈段（枕下至第七颈椎）」压成「颈段」 */
const stripParen = (s) => String(s).replace(/[（(][^）)]*[）)]/g, '').trim();

/** 颈肩三段：正文「范围分三段：颈段（……）、肩胛段（……）、肩段（……）」 */
function threeSegments() {
  const line = readDoc().split(LINES).find((l) => l.includes('范围分三段')) || '';
  const tail = (/分三段[：:](.+?)。/.exec(line) || [null, ''])[1];
  return stripParen(tail).split(/、/).map((s) => s.trim()).filter(Boolean);
}

/** 落枕三条阴性体征：第一张表的行首列 */
function negativeSigns() {
  const t = tableBlocks(readDoc())[0];
  return t ? t.rows.map((r) => r[0]) : [];
}

/** 要排除的五类：正文「要排除的五类：……」一句，按分号切 */
function fiveExclusions() {
  const line = readDoc().split(LINES).find((l) => l.includes('要排除的五类')) || '';
  const tail = (/要排除的五类\*\*[：:](.+?)。/.exec(line) || [null, ''])[1];
  return tail.split(/[；;]/).map(stripParen).filter(Boolean);
}

/** 肩周炎三期：第二张表的行首列 */
function threePhases() {
  const t = tableBlocks(readDoc())[1];
  return t ? t.rows.map((r) => r[0]) : [];
}

/** 颈部三条硬界：第六节里以「第条」起头的粗体条目 */
const hardLines = () => boldItems(sectionAt(readDoc(), 5).body).filter((x) => /^第[一二三]条/.test(x));

/** 肩胛段的两件事：恢复静息位置、恢复后缩与上回旋 */
function scapulaGoals() {
  const body = sectionAt(readDoc(), 6).body;
  const m = /目标是两件事[：:](.+?)。/.exec(body);
  return m ? m[1].split(/[，,]/).map((s) => s.trim()).filter(Boolean) : [];
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
    segments: threeSegments(),
    negatives: negativeSigns(),
    exclusions: fiveExclusions(),
    phases: threePhases(),
    hard: hardLines(),
    scapula: scapulaGoals(),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).body.includes(p) })),
    terms: ['落枕', '肩关节周围炎', '肩袖', '疼痛弧', '腋神经'].map((t) => ({ t, n: occurrences(text, t) })),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`骨伤科手法治疗学 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个 · 表格 ${tableBlocks(readDoc()).length} 张`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`颈肩三段（${r.segments.length} 段）：${r.segments.join(' / ')}`);
  console.log(`落枕的三条阴性体征（${r.negatives.length} 条）：${r.negatives.join(' / ')}`);
  console.log(`要排除的五类（${r.exclusions.length} 类）：${r.exclusions.join(' / ')}`);
  console.log(`肩周炎三期（${r.phases.length} 期）：${r.phases.join(' / ')}`);
  console.log(`颈部三条硬界（${r.hard.length} 条）：`);
  r.hard.forEach((x, i) => console.log(`  ${i + 1}. ${x}`));
  console.log(`肩胛段的目标（${r.scapula.length} 件）：${r.scapula.join('；')}`);
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
  console.log('※ 本章为教学材料，不构成诊疗建议、诊断或急救指导。');
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
  stripParen,
  threeSegments,
  negativeSigns,
  fiveExclusions,
  threePhases,
  hardLines,
  scapulaGoals,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  EXPECTED_SEGMENTS,
  EXPECTED_NEGATIVES,
  EXPECTED_PHASES,
  SECTION_PROBES,
};
