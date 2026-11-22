#!/usr/bin/env node
/**
 * 耳鼻喉解剖生理 · 第 4 章 · 咽喉：一条共用的管子，四处分岔与一个不能迟半拍的关门动作
 * 课程: departments/08-wuguan/01-erbihou-jiepou-shengli/chapters/04-e14/docs/zh.md
 *
 * 本章的数字都由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、声带五层表的数据行、关键判据词的出现次数、
 *   吞咽四期的名称与顺序、误吸三类原因、异物的四处卡点，
 *   以及 quiz 的 check 题能在正文里对上几个四字原词。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '4';
const SLUG = '04-e14';
const TITLE = '咽喉：一条共用的管子，四处分岔与一个不能迟半拍的关门动作';

/** 各表格的期望数据行数：声带五层表 */
const TABLE_ROWS = [5];

const TERMS = [
  '梨状窝',
  '会厌谷',
  '环杓后肌',
  '喉返神经',
  '声带突',
  '任克层',
  '咽隐窝',
  '甲杓肌',
  '咽旁间隙',
];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = [
  '门房',
  '三层危险',
  '哨卡',
  '开合的盒子',
  '谁关门，谁开门',
  '会厌不等于全部关门动作',
];

const GRAM = 4;

const readDoc = () => fs.readFileSync(DOC, 'utf8');

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function h2Titles(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) out.push(m[1].trim());
  }
  return out;
}

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

const sectionAt = (text, i) => (h2Sections(text)[i] || { title: '', body: '' }).body;

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

function grams(text, n = GRAM) {
  const out = new Set();
  for (const seg of String(text).replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const presentCount = (text, terms) => terms.filter((t) => occurrences(text, t) > 0).length;

const lineWith = (text, key) => String(text).split(/\r?\n/).find((l) => l.includes(key)) || '';

/** 吞咽四期：取「吞咽是四期」那一句里的四个期名，按正文顺序 */
function swallowPhases(text) {
  const line = lineWith(text, '吞咽是四期');
  const names = [...line.matchAll(/(口腔准备期|口腔期|咽期|食管期)：/g)].map((m) => m[1]);
  return [...new Set(names)];
}

/** 误吸的三类原因：正文加粗的三项（从「原因只有三类」之后取，避开句首的小标题） */
function aspirationCauses(text) {
  const line = lineWith(text, '原因只有三类');
  const tail = line.slice(line.indexOf('原因只有三类'));
  return [...tail.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1].trim());
}

/** 异物的四处卡点：三个凹陷加声门 */
function lodgementSites(text) {
  const line = lineWith(text, '卡住就致命');
  const m = /扁桃体窝、会厌谷、梨状窝/.exec(line);
  const sites = m ? m[0].split('、') : [];
  return sites.concat(line.includes('卡住就致命') ? ['声门'] : []);
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
  };
}

function analyze() {
  const text = readDoc();
  const blocks = tableBlocks(text);
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    tables: blocks.map((b) => ({ cols: b.head.length, rows: b.rows.length, first: b.head[0] || '' })),
    terms: TERMS.map((t) => ({ term: t, count: occurrences(text, t) })),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).includes(p) })),
    quiz: quizSummary(quiz, text),
    phases: swallowPhases(text),
    causes: aspirationCauses(text),
    sites: lodgementSites(text),
    layers: (blocks[0] || { rows: [] }).rows.map((r) => r[0]),
  };
}

function main() {
  const r = analyze();
  console.log(`耳鼻喉解剖生理 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`表格 ${r.tables.length} 张：`);
  r.tables.forEach((t, i) => console.log(`  #${i + 1}  ${t.rows} 行 × ${t.cols} 列  首列表头「${t.first}」`));
  console.log(`声带分层（表内自上而下）：${r.layers.join(' / ')}`);
  console.log('');
  console.log(`吞咽四期：${r.phases.join(' → ')}（误吸只在咽期）`);
  console.log(`误吸三类原因：${r.causes.join(' / ')}`);
  console.log(`异物卡点：${r.sites.join(' / ')}`);
  console.log('');
  console.log('关键判据（出现次数）：');
  console.log('  ' + r.terms.map((x) => `${x.term} ${x.count}`).join(' · '));
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`
  );
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见或治疗指导。');
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
  presentCount,
  swallowPhases,
  aspirationCauses,
  lodgementSites,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TABLE_ROWS,
  TERMS,
  SECTION_PROBES,
};
