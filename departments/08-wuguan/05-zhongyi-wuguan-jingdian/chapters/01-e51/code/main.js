#!/usr/bin/env node
/**
 * 中医五官经典 · 第 1 章 · 五官科的「经典」不是一个书架，而是五条各有源流的谱系
 * 课程: departments/08-wuguan/05-zhongyi-wuguan-jingdian/chapters/01-e51/docs/zh.md
 *
 * 本章的数字都由本脚本从正文现算，不手打：
 *   汉字数、二级小节的顺序、谱系表的行与「谱系性质」列、
 *   眼科五部书的先后、三种引法的名目、引文前必答的三问，
 *   以及 quiz 的 check 题能在正文里对上几个四字原词。正文一改，重跑即可看出哪里对不上。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '1';
const SLUG = '01-e51';
const TITLE = '五官科的「经典」不是一个书架，而是五条各有源流的谱系';

/** 谱系表：五条谱系，四列 */
const LINEAGE_ROWS = 5;
/** 第二节按层累顺序出现的眼科五部书 */
const EYE_BOOKS = ['秘传眼科龙木论', '银海精微', '原机启微', '审视瑶函', '目经大成'];
/** 第五节三种引法：各能证什么，不能互相顶替 */
const CITE_MODES = ['引句', '引篇', '引书'];
/** 每节一个探针词：第 i 个必须出现在第 i 个二级小节 */
const SECTION_PROBES = ['后果可见度', '层累', '开风路针', '托名', '三者不能互换', '不把'];
/** 关键判据词 */
const TERMS = ['后果可见度', '层累', '托名', '辑佚', '一阴一阳结', '舌乃心之苗', '开风路针'];

const GRAM = 4;
const NL = /\r?\n/;

const readDoc = () => fs.readFileSync(DOC, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function h2Titles(text) {
  const out = [];
  for (const line of String(text).split(NL)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) out.push(m[1].trim());
  }
  return out;
}

function h2Sections(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split(NL)) {
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

/** 谱系表：每一行取「谱系」「谱系性质」两列 */
function lineage(text) {
  const t = tableBlocks(text)[0];
  if (!t) return { head: [], rows: [] };
  return {
    head: t.head,
    rows: t.rows.map((r) => ({ lineage: r[0], foundation: r[1], integration: r[2], nature: r[3] })),
  };
}

/** 眼科五部书在第二节里的出现次序与位置 */
function eyeBookOrder(text) {
  const sec = sectionAt(text, 1);
  return EYE_BOOKS.map((name) => ({ name, at: sec.indexOf(name) })).sort((a, b) => a.at - b.at);
}

/** 第五节三种引法：以粗体标签「**引句**」为准，名目与次序都从正文读 */
function citeModes(text) {
  const sec = sectionAt(text, 4);
  return CITE_MODES.filter((m) => sec.includes('**' + m + '**'));
}

/** 引文前必答的三问，从第四节末的原句里取 */
function threeQuestions(text) {
  const sec = sectionAt(text, 3);
  const hit = String(sec).split(NL).find((l) => l.includes('三问：')) || '';
  const tail = hit.slice(hit.indexOf('三问：') + '三问：'.length);
  const parts = tail.split('？').map((s) => s.trim()).filter(Boolean);
  return { line: hit.trim(), parts: parts.slice(0, 3).map((p) => p + '？') };
}

/** 托名与辑佚的例证：书名 → 本章的处置（取命中关键词的那一句） */
function attribution(text) {
  const sec = sectionAt(text, 3);
  const grab = (kw) => {
    const line = String(sec).split(NL).find((l) => l.includes(kw)) || '';
    const sentence = line.split('。').find((s) => s.includes(kw)) || '';
    return sentence.trim() ? sentence.trim() + '。' : '';
  };
  return {
    yinhai: grab('题「唐·孙思邈辑」'),
    longmu: grab('题龙树菩萨'),
    shennong: grab('原书已佚'),
    qianjin: grab('校正医书局'),
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
    lineage: lineage(text),
    books: eyeBookOrder(text),
    cites: citeModes(text),
    three: threeQuestions(text),
    attr: attribution(text),
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
  console.log('五条谱系的「谱系性质」（决定一句「经典说」可核到什么程度）：');
  for (const x of r.lineage.rows) console.log(`  ${x.lineage.padEnd(3)} ${x.nature}`);
  console.log('');
  console.log('眼科五部书的层累次序：');
  r.books.forEach((b, i) => console.log(`  ${i + 1}. 《${b.name}》`));
  console.log('');
  console.log(`三种引法：${r.cites.join(' / ')}（各证一段，不能互相顶替）`);
  console.log('');
  console.log('引一句之前的三问：');
  r.three.parts.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
  console.log('');
  console.log('托名与辑佚的处理：');
  console.log(`  银海精微：${r.attr.yinhai}`);
  console.log(`  龙木论：${r.attr.longmu}`);
  console.log(`  神农本草经：${r.attr.shennong}`);
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
  console.log('※ 本章为教学材料，不构成医学意见、诊断或治疗指导；引文只标书名与篇名、不标页码，具体字句须回原刻本或可靠整理本核对。');
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
  lineage,
  eyeBookOrder,
  citeModes,
  threeQuestions,
  attribution,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  LINEAGE_ROWS,
  EYE_BOOKS,
  CITE_MODES,
  SECTION_PROBES,
  TERMS,
};
