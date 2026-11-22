#!/usr/bin/env node
/**
 * 中医眼科学 · 第 4 章 · 内障：判据不在表面，所以必须往里找
 * 课程: departments/08-wuguan/06-zhongyi-yanke-xue/chapters/04-neizhang-yanbing/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、内障的五层组织、病历要写的三个时间、
 *   眼底所见表的行数、四条虚实主线的名字，以及 quiz 的 check 题接地情况。
 * 正文一改，重跑即可看出哪里对不上；测试再把这些数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 4;
const SLUG = '04-neizhang-yanbing';
const TITLE = '内障：判据不在表面，所以必须往里找';

/** 关键判据词：本章反复使用的术语，是正文与习题同源的最小证据 */
const TERMS = ['内障', '外障', '瞳神', '晶珠', '神膏', '视衣', '目系', '玄府闭塞', '青盲'];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '五层组织',
  '排除法诊断',
  '候选病机',
  '玄府闭塞',
  '第一动作永远是转诊',
  '本章不给方剂',
];

/** 内障的五个层次（顺序即正文顺序） */
const LAYERS = ['瞳神', '晶珠', '神膏', '视衣', '目系'];

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

/**
 * 五层组织：第一节以「瞳神——狭义指瞳孔，主展缩；」这类行列出。
 * 只认行首是层次名的行，取破折号后的说明。
 */
function fiveLayers(text) {
  const out = [];
  for (const line of sectionAt(text, 0).split(/\r?\n/)) {
    const m = /^(瞳神|晶珠|神膏|视衣|目系)——(.+?)[；。]\s*$/.exec(line.trim());
    if (m) out.push({ layer: m[1], note: m[2].trim() });
  }
  return out;
}

/** 病历要写的三个时间：正文「要写三个时间：甲、乙、丙」一句 */
function threeTimes(text) {
  const line = String(text).split(/\r?\n/).find((l) => l.includes('要写三个时间')) || '';
  const tail = (/三个时间[：:](.+?)。/.exec(line) || [null, ''])[1];
  return tail.split(/[、，,]/).map((s) => s.trim()).filter(Boolean);
}

/** 四条虚实主线：第二张表的第一列 */
function fourThreads(text) {
  const block = tableBlocks(text)[1];
  return block ? block.rows.map((r) => ({ thread: r[0], whole: r[1], eye: r[2], method: r[3] })) : [];
}

/** 眼底所见表：第一张表，七行 */
function fundusRows(text) {
  const block = tableBlocks(text)[0];
  return block ? block.rows.map((r) => ({ see: r[0], read: r[1], in: r[2] })) : [];
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
    layers: fiveLayers(text),
    times: threeTimes(text),
    fundus: fundusRows(text),
    threads: fourThreads(text),
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
  console.log(`内障的 ${r.layers.length} 层（正文现算）：`);
  for (const l of r.layers) console.log(`  ${l.layer} —— ${l.note}`);
  console.log('');
  console.log(`病历要写的 ${r.times.length} 个时间：${r.times.join(' / ')}`);
  console.log('');
  console.log(`眼底所见 → 中医读法（${r.fundus.length} 行，中列是候选病机不是结论）：`);
  for (const f of r.fundus) console.log(`  ${f.see} → ${f.read}`);
  console.log('');
  console.log(`四条虚实主线（${r.threads.length} 条）：${r.threads.map((t) => t.thread).join(' / ')}`);
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
  console.log('※ 本章为教学材料，不构成诊断或治疗建议；视力骤降、黑影骤增伴闪光一律先转诊。');
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
  fiveLayers,
  threeTimes,
  fourThreads,
  fundusRows,
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
