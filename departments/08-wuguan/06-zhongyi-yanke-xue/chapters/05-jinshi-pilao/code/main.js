#!/usr/bin/env node
/**
 * 中医眼科学 · 第 5 章 · 近视与视疲劳：能防的是进展，不是「治愈」
 * 课程: departments/08-wuguan/06-zhongyi-yanke-xue/chapters/05-jinshi-pilao/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、必须分开的三件事、「久视伤血」的三层、
 *   四条辨证线、行为干预的条目、外治手段的条目，以及 quiz 的 check 题接地情况。
 * 正文一改，重跑即可看出哪里对不上；测试再把这些数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 5;
const SLUG = '05-jinshi-pilao';
const TITLE = '近视与视疲劳：能防的是进展，不是「治愈」';

/** 关键判据词：本章反复使用的术语，是正文与习题同源的最小证据 */
const TERMS = ['久视伤血', '假性近视', '真性近视', '视疲劳', '神光不发', '眼保健操', '耳穴压丸', '户外'];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '散瞳后屈光度消失或显著减少',
  '久视伤血',
  '儿童的眼病辨证不能照搬成人',
  '自然光下的户外活动',
  '操作要求高',
  '真性近视不可逆',
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

/** 某节里以「**……**」开头的条目 */
function boldLeads(sectionBody) {
  const out = [];
  for (const line of String(sectionBody).split(/\r?\n/)) {
    const m = /^\*\*(.+?)\*\*/.exec(line.trim());
    if (m) out.push(m[1].replace(/[。.]$/, ''));
  }
  return out;
}

/** 必须分开的三件事：第一节的粗体条目（假性近视 / 真性近视 / 视疲劳） */
const threeThings = (text) => boldLeads(sectionAt(text, 0));

/** 「久视伤血」三层：第二节的粗体条目形如「第一层，血不养目」，取逗号后的名字 */
function threeLayers(text) {
  return boldLeads(sectionAt(text, 1)).map((s) => {
    const m = /^第[一二三]层[，,](.+)$/.exec(s);
    return m ? m[1] : s;
  });
}

/** 四条辨证：表格的第一列（第四条标注了「视疲劳多见」） */
function syndromes(text) {
  const block = tableBlocks(text)[0];
  return block ? block.rows.map((r) => ({ name: r[0], clue: r[1], method: r[2] })) : [];
}

/** 行为干预的条目：第四节粗体条目的前若干项（最后一项是家长沟通） */
const behaviors = (text) => boldLeads(sectionAt(text, 3));

/** 外治手段的条目：第五节粗体条目 */
const therapies = (text) => boldLeads(sectionAt(text, 4));

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
    things: threeThings(text),
    layers: threeLayers(text),
    syndromes: syndromes(text),
    behaviors: behaviors(text),
    therapies: therapies(text),
    terms: TERMS.map((t) => ({ term: t, count: occurrences(text, t) })),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).includes(p) })),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医眼科学 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个 · 表格 ${r.tables.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`必须分开的 ${r.things.length} 件事（正文现算）：${r.things.join(' / ')}`);
  console.log('');
  console.log(`「久视伤血」的三层（正文现算，${r.layers.length} 层）：${r.layers.join(' → ')}`);
  console.log('  能动的是前两层；第三层对应结构改变，动不了。');
  console.log('');
  console.log(`辨证 ${r.syndromes.length} 条：${r.syndromes.map((s) => s.name).join(' / ')}`);
  console.log('');
  console.log(`行为干预（正文现算，${r.behaviors.length} 条）：${r.behaviors.join(' / ')}`);
  console.log(`外治手段（正文现算，${r.therapies.length} 条）：${r.therapies.join(' / ')}`);
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
  console.log('※ 本章为教学材料，不构成诊断、处方或视力矫正建议；真性近视不可逆，不作疗效承诺。');
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
  boldLeads,
  threeThings,
  threeLayers,
  syndromes,
  behaviors,
  therapies,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
};
