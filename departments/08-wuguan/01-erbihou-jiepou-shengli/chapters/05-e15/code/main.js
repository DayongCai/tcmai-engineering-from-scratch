#!/usr/bin/env node
/**
 * 耳鼻喉解剖生理 · 第 5 章 · 口腔与涎腺：三套坐标，记不住坐标就只剩「嘴里有个地方」
 * 课程: departments/08-wuguan/01-erbihou-jiepou-shengli/chapters/05-e15/docs/zh.md
 *
 * 本章没有表格，正文用段落立三套坐标，故本脚本核对的是坐标本身：
 *   牙的四区名称与顺序、界沟两侧的名称、三对大涎腺、两处舌下开口的分工。
 * 其余数字（汉字数、小节、词频、quiz 接地）同样由正文现算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '5';
const SLUG = '05-e15';
const TITLE = '口腔与涎腺：三套坐标，记不住坐标就只剩「嘴里有个地方」';

/** 本章无表格 */
const TABLE_ROWS = [];

const TERMS = [
  '界沟',
  '舌盲孔',
  '舌下阜',
  '舌下襞',
  '牙周膜',
  '腮腺管',
  '轮廓乳头',
  '下颌舌骨肌',
];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = [
  '壁比腔重要',
  '三层记住',
  '界沟',
  '三条管口',
  '四步走',
  '不印牙位对照表',
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

/** 第一套坐标：牙的四区，按正文顺序 */
function toothQuadrants(text) {
  const m = /四区：([^。]+)。/.exec(text);
  return m ? m[1].split('、').map((s) => s.trim()) : [];
}

/** 第二套坐标：界沟两侧，舌体与舌根 */
function tongueHalves(text) {
  const m = /沟之前是(舌体)[^，]*，之后是(舌根)/.exec(text);
  return { front: m ? m[1] : null, back: m ? m[2] : null };
}

/** 第三套坐标：三对大涎腺的名称，按正文出现顺序 */
function majorGlands(text) {
  const names = [...String(text).matchAll(/\*\*(腮腺|下颌下腺|舌下腺)在/g)].map((m) => m[1]);
  return [...new Set(names)];
}

/** 舌下两处开口的分工：舌下阜合用，舌下襞独用 */
function sublingualOpenings(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('合用口')) || '';
  return {
    shared: line.includes('舌下阜是「合用口」') ? '舌下阜' : null,
    own: line.includes('舌下襞是「独用口」') ? '舌下襞' : null,
  };
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
    quadrants: toothQuadrants(text),
    halves: tongueHalves(text),
    glands: majorGlands(text),
    openings: sublingualOpenings(text),
  };
}

function main() {
  const r = analyze();
  console.log(`耳鼻喉解剖生理 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  if (r.tables.length) {
    console.log(`表格 ${r.tables.length} 张：`);
    r.tables.forEach((t, i) => console.log(`  #${i + 1}  ${t.rows} 行 × ${t.cols} 列  首列表头「${t.first}」`));
  } else {
    console.log('表格 0 张：本章全用段落组织，没有表格。');
  }
  console.log('');
  console.log(`坐标一（牙）：${r.quadrants.join(' / ')}（左右指患者的左右）`);
  console.log(`坐标二（舌）：界沟之前为${r.halves.front}，之后为${r.halves.back}`);
  console.log(`坐标三（腺）：${r.glands.join(' / ')} —— ${r.openings.shared}是合用口，${r.openings.own}是独用口`);
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
  console.log('※ 本章为教学材料，不构成诊断或治疗建议。');
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
  toothQuadrants,
  tongueHalves,
  majorGlands,
  sublingualOpenings,
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
