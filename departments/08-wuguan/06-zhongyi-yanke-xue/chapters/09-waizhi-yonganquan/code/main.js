#!/usr/bin/env node
/**
 * 中医眼科学 · 第 9 章 · 外治与用药安全：眼科是给药窗口最窄的科室
 * 课程: departments/08-wuguan/06-zhongyi-yanke-xue/chapters/09-waizhi-yonganquan/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、四种形制各自的做法与禁忌、三条风险通道、
 *   三条用药硬线、外治也要辨证的三个分岔，以及 quiz 的 check 题接地情况。
 * 正文一改，重跑即可看出哪里对不上；测试再把这些数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 9;
const SLUG = '09-waizhi-yonganquan';
const TITLE = '外治与用药安全：眼科是给药窗口最窄的科室';

/** 关键判据词：本章反复使用的术语，是正文与习题同源的最小证据 */
const TERMS = ['点眼', '洗眼', '熏眼', '敷眼', '结膜囊', '泪囊', '水飞', '以毒攻毒'];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '四种方法的分工很清楚',
  '按压内眦泪囊区',
  '远部取穴相对安全',
  '三条不能越的线',
  '外治之理，即内治之理',
  '化学伤的第一处置',
];

/** 四种形制的名字（顺序即正文表格顺序） */
const FORMS = ['点眼', '洗眼', '熏眼', '敷眼'];

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

/** 去掉条目开头的序号「第一条，」「第一条：」 */
const stripOrdinal = (s) => String(s).replace(/^第[一二三]条[，,：:]\s*/, '');

/** 四种形制：第一张表（法 / 做法 / 适用于 / 主要禁忌） */
function fourForms(text) {
  const block = tableBlocks(text)[0];
  return block
    ? block.rows.map((r) => ({ form: r[0], how: r[1], forWhat: r[2], avoid: r[3] }))
    : [];
}

/** 三条风险通道：第二节的粗体条目（黏膜吸收 / 污染 / 颗粒） */
const threePassages = (text) => boldLeads(sectionAt(text, 1)).map(stripOrdinal);

/** 三条用药硬线：第四节的粗体条目 */
const threeHardLines = (text) => boldLeads(sectionAt(text, 3)).map(stripOrdinal);

/** 外治也要辨证的分岔：第五节的粗体条目 */
const dialecticRules = (text) => boldLeads(sectionAt(text, 4));

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
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    tables: tableBlocks(text).length,
    forms: fourForms(text),
    passages: threePassages(text),
    hardLines: threeHardLines(text),
    dialectic: dialecticRules(text),
    terms: TERMS.map((t) => ({ term: t, count: occurrences(text, t) })),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).includes(p) })),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医眼科学 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个 · 表格 ${r.tables} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`四种形制（表格现读，${r.forms.length} 种）：`);
  for (const f of r.forms) console.log(`  ${f.form} · ${f.how} → 适用：${f.forWhat}｜禁忌：${f.avoid}`);
  console.log('');
  console.log(`三条风险通道（正文现算，${r.passages.length} 条）：${r.passages.join(' / ')}`);
  console.log(`三条用药硬线（正文现算，${r.hardLines.length} 条）：`);
  r.hardLines.forEach((h, i) => console.log(`  ${i + 1}. ${h}`));
  console.log('');
  console.log(`外治也要辨证的分岔（正文现算，${r.dialectic.length} 条）：`);
  r.dialectic.forEach((d, i) => console.log(`  ${i + 1}. ${d}`));
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
  console.log('※ 本章为教学材料，不构成处方或操作指导；化学伤先就地清水冲洗并立即转诊。');
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
  stripOrdinal,
  fourForms,
  threePassages,
  threeHardLines,
  dialecticRules,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  FORMS,
};
