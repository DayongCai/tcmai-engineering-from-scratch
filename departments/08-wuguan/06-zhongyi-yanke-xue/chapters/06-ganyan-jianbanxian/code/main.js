#!/usr/bin/env node
/**
 * 中医眼科学 · 第 6 章 · 干眼与睑板腺：三层泪膜里，坏的是哪一层
 * 课程: departments/08-wuguan/06-zhongyi-yanke-xue/chapters/06-ganyan-jianbanxian/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、泪膜三层各自的失败方式与中医对应、
 *   四条辨证线、外治条目数，以及 quiz 的 check 题接地情况。
 * 正文一改，重跑即可看出哪里对不上；测试再把这些数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 6;
const SLUG = '06-ganyan-jianbanxian';
const TITLE = '干眼与睑板腺：三层泪膜里，坏的是哪一层';

/** 关键判据词：本章反复使用的术语，是正文与习题同源的最小证据 */
const TERMS = ['白涩症', '泪膜', '睑板腺', '脂质层', '水液层', '黏蛋白层', '津亏', '熏眼'];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '伞状概念',
  '减少蒸发',
  '内服药到不了睑板腺的开口',
  '前两条是「津不足」',
  '屏幕位置略低于视线',
  '干眼可以是全身病的首发表现',
];

/** 泪膜三层的名字（顺序即正文表格顺序：由外向内） */
const LAYERS = ['脂质层', '水液层', '黏蛋白层'];

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

/** 泪膜三层：第一张表（层 / 成分 / 作用 / 坏了会怎样 / 中医对应） */
function tearLayers(text) {
  const block = tableBlocks(text)[0];
  return block
    ? block.rows.map((r) => ({ layer: r[0], part: r[1], role: r[2], fails: r[3], tcm: r[4] }))
    : [];
}

/** 四条辨证线：第二张表的第一列 */
function syndromes(text) {
  const block = tableBlocks(text)[1];
  return block ? block.rows.map((r) => ({ name: r[0], clue: r[1], method: r[2] })) : [];
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

/** 「前两条是「津不足」，后两条是「路不通」」——把分叉的两组名字读出来 */
function forkGroups(text) {
  const seg = sectionAt(text, 3);
  const a = (/前两条是「(.+?)」/.exec(seg) || [null, ''])[1];
  const b = (/后两条是「(.+?)」/.exec(seg) || [null, ''])[1];
  return { deficit: a, blocked: b };
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
    layers: tearLayers(text),
    syndromes: syndromes(text),
    externals: boldLeads(sectionAt(text, 4)),
    fork: forkGroups(text),
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
  console.log(`泪膜 ${r.layers.length} 层（正文现读）：`);
  for (const l of r.layers) console.log(`  ${l.layer} · ${l.part} → 坏了：${l.fails}｜中医：${l.tcm}`);
  console.log('');
  console.log(`辨证 ${r.syndromes.length} 条线：${r.syndromes.map((s) => s.name).join(' / ')}`);
  console.log(`  分叉：${r.fork.deficit} 者补，${r.fork.blocked} 者通`);
  console.log('');
  console.log(`外治与行为（正文现算，${r.externals.length} 条）：${r.externals.join(' / ')}`);
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
  console.log('※ 本章为教学材料，不构成诊断或用药建议；眼干伴视力下降、剧痛、畏光加重须转诊。');
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
  tearLayers,
  syndromes,
  boldLeads,
  forkGroups,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  LAYERS,
};
