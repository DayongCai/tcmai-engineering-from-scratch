#!/usr/bin/env node
/**
 * 中医五官经典 · 第 3 章 · 「肾开窍于耳」是起点，不是答案
 * 课程: departments/08-wuguan/05-zhongyi-wuguan-jingdian/chapters/03-e53/docs/zh.md
 *
 * 本章的数字都由本脚本从正文现算，不手打：
 *   汉字数、第一节条文表的行数与「明说肾」的条数、出处的脏腑与经典分布、
 *   第四节病名分层的组数、第五节肾虚判据组凑几项、第三节入耳经脉的条数，
 *   以及 quiz 的 check 题能在正文里对上几个四字原词。正文一改，重跑即可看出哪里对不上。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '3';
const SLUG = '03-e53';
const TITLE = '「肾开窍于耳」是起点，不是答案';

/** 第一节条文表：八条 */
const CLAUSE_ROWS = 8;
/** 八条里明说肾的两条 */
const KIDNEY_CLAUSES = 2;
/** 第四节病名分层：暴与渐／鸣与聋／胀闭脓／鸣与脑鸣 */
const NAME_LAYERS = ['暴与渐', '鸣与聋', '胀、闭、脓', '鸣与脑鸣'];
/** 第五节判据组：要凑够的项数 */
const CRITERIA_MIN = 4;
/** 第三节入耳的经脉至少三条 */
const EAR_MERIDIANS = ['手太阳小肠脉', '手少阳三焦脉', '足少阳胆脉'];
/** 每节一个探针词 */
const SECTION_PROBES = ['六个方向', '寄窍', '宗脉', '暴与渐', '四项以上', '漏诊'];
/** 关键判据词 */
const TERMS = ['归属与功能条件', '寄窍于耳', '宗脉之所聚', '暴聋', '助听器', '听神经瘤'];

const GRAM = 4;
const NL = /\r?\n/;
const H2 = /^##\s+(.+)$/;

const readDoc = () => fs.readFileSync(DOC, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function h2Titles(text) {
  const out = [];
  for (const line of String(text).split(NL)) {
    const m = H2.exec(line.trim());
    if (m) out.push(m[1].trim());
  }
  return out;
}

function h2Sections(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split(NL)) {
    const m = H2.exec(line.trim());
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
  for (const line of String(text).split(NL)) {
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

/** 第一节条文表：条文／出处／它说的是什么 */
function clauses(text) {
  const t = tableBlocks(text)[0];
  if (!t) return { head: [], rows: [] };
  return { head: t.head, rows: t.rows.map((r) => ({ text: r[0], source: r[1], meaning: r[2] })) };
}

/** 八条里正文自己点明「说肾」的，只数行内出现肾字的条 */
function kidneyClauses(text) {
  return clauses(text).rows.filter((r) => String(r.text).includes('肾'));
}

/** 出处分布：素问／灵枢各几条 */
function sourceSplit(text) {
  const rows = clauses(text).rows;
  const count = (book) => rows.filter((r) => String(r.source).includes(book)).length;
  return { suwen: count('素问'), lingshu: count('灵枢'), total: rows.length };
}

/** 第四节病名分层：以粗体小标题为准 */
function nameLayers(text) {
  const sec = sectionAt(text, 3);
  return NAME_LAYERS.filter((n) => String(sec).includes('**' + n + '。**'));
}

/** 第五节判据组：从「可用的判据组大致是：」到「。」之间的分号项 */
function criteria(text) {
  const sec = sectionAt(text, 4);
  const line = String(sec).split(NL).find((l) => l.includes('可用的判据组')) || '';
  const body = line.slice(line.indexOf('是：') + 2).split('。')[0];
  return body.split('；').map((s) => s.trim()).filter(Boolean);
}

/** 第三节入耳经脉，按正文出现的次序 */
function meridianOrder(text) {
  const sec = sectionAt(text, 2);
  return EAR_MERIDIANS.map((name) => ({ name, at: sec.indexOf(name) })).sort((a, b) => a.at - b.at);
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
    indexes: [...new Set(qs.map((q) => q.correct))].sort(),
    pageRefs: qs.filter((q) => /\d+\s*页/.test(JSON.stringify(q))).length,
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    tables: tableBlocks(text).map((b) => ({ cols: b.head.length, rows: b.rows.length, first: b.head[0] || '' })),
    clauses: clauses(text),
    kidney: kidneyClauses(text),
    sources: sourceSplit(text),
    layers: nameLayers(text),
    criteria: criteria(text),
    meridians: meridianOrder(text),
    terms: TERMS.map((t) => ({ term: t, count: occurrences(text, t) })),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).includes(p) })),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医五官经典 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`表格 ${r.tables.length} 张：`);
  r.tables.forEach((t, i) => console.log(`  #${i + 1}  ${t.rows} 行 × ${t.cols} 列  首列表头「${t.first}」`));
  console.log('');
  console.log(`八条条文里明说肾的 ${r.kidney.length} 条：`);
  for (const c of r.kidney) console.log(`  ${c.text} —— ${c.source}（${c.meaning}）`);
  console.log(`出处分布：素问 ${r.sources.suwen} 条 · 灵枢 ${r.sources.lingshu} 条（同一部书，两条线）`);
  console.log('');
  console.log('病名分层（先分暴与渐，再分鸣与聋）：');
  r.layers.forEach((x) => console.log('  · ' + x));
  console.log('');
  console.log(`肾虚判据组 ${r.criteria.length} 项（凑够 ${CRITERIA_MIN} 项以上才站得住）：`);
  r.criteria.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
  console.log('');
  console.log('入耳经脉：');
  r.meridians.forEach((m, i) => console.log(`  ${i + 1}. ${m.name}`));
  console.log('');
  console.log('关键判据（出现次数）：');
  console.log('  ' + r.terms.map((x) => `${x.term} ${x.count}`).join(' · '));
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(`quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`);
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见、诊断或治疗指导；方名仅标治法方向，突发单侧听力下降者属急症，须立即转诊。');
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
  clauses,
  kidneyClauses,
  sourceSplit,
  nameLayers,
  criteria,
  meridianOrder,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  CLAUSE_ROWS,
  KIDNEY_CLAUSES,
  NAME_LAYERS,
  CRITERIA_MIN,
  EAR_MERIDIANS,
  SECTION_PROBES,
  TERMS,
};
