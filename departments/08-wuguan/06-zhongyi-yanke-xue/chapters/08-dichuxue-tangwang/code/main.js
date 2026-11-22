#!/usr/bin/env node
/**
 * 中医眼科学 · 第 8 章 · 眼底出血与消渴目病：血还在不在流，决定先止血还是先化瘀
 * 课程: departments/08-wuguan/06-zhongyi-yanke-xue/chapters/08-dichuxue-tangwang/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、三条来路、四段血的状态、消渴目病的四条临床线、
 *   两句治血老话，以及 quiz 的 check 题接地情况。
 * 正文一改，重跑即可看出哪里对不上；测试再把这些数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 8;
const SLUG = '08-dichuxue-tangwang';
const TITLE = '眼底出血与消渴目病：血还在不在流，决定先止血还是先化瘀';

/** 关键判据词：本章反复使用的术语，是正文与习题同源的最小证据 */
const TERMS = ['离经之血', '热迫血妄行', '气不摄血', '瘀阻络破', '机化', '消渴目病', '气阴两虚', '微血管瘤'];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '火性炎上',
  '按血的状态划的',
  '本在气阴两虚',
  '止血不忘化瘀',
  '血糖波动比血糖偏高更伤眼底',
  '分期按「血的状态」判断',
];

/** 四段血的状态（顺序即正文表格顺序） */
const STAGES = ['新血', '瘀血', '陈血', '反复'];

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

/** 三条来路：第一节的粗体条目（外伤一条不在此列，因为它不必辨证） */
const threeOrigins = (text) => boldLeads(sectionAt(text, 0));

/** 四段血的状态：表格第一列，去掉括号里的注解 */
function stageRows(text) {
  const block = tableBlocks(text)[0];
  return block
    ? block.rows.map((r) => ({
        stage: r[0].replace(/（.+?）/, ''),
        look: r[1],
        rule: r[2],
        avoid: r[3],
      }))
    : [];
}

/**
 * 消渴目病的四条临床线：正文第三节里形如「**气阴两虚**：神疲……」的四个条目。
 * 只认粗体后紧跟冒号的，把「**本在气阴两虚。**」这类判断句排除在外。
 */
function fourLines(text) {
  const body = sectionAt(text, 2);
  const out = [];
  const parts = body.split('**');
  for (let i = 1; i < parts.length; i += 2) {
    const name = parts[i].trim();
    const after = parts[i + 1] || "";
    const m = /^[：:]\s*(.{0,40})/.exec(after);
    if (m) out.push({ name, note: m[1].split("。")[0] });
  }
  return out;
}

/** 治血的两句老话：第四节的粗体条目 */
const twoRules = (text) => boldLeads(sectionAt(text, 3));

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
    origins: threeOrigins(text),
    stages: stageRows(text),
    lines: fourLines(text),
    rules: twoRules(text),
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
  console.log(`三条来路（正文现算，${r.origins.length} 条）：${r.origins.join(' / ')}`);
  console.log('');
  console.log(`四段血的状态（表格现读，${r.stages.length} 段）：`);
  for (const s of r.stages) console.log(`  ${s.stage} · 样子：${s.look} → ${s.rule}｜忌：${s.avoid}`);
  console.log('');
  console.log(`消渴目病的四条临床线（正文现算，${r.lines.length} 条）：`);
  for (const l of r.lines) console.log(`  ${l.name} · ${l.note}`);
  console.log(`治血两句老话（正文现算，${r.rules.length} 条）：${r.rules.join(' / ')}`);
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
  console.log('※ 本章为教学材料，不构成诊断或治疗建议；视力骤降、玻璃体大量出血须先转诊。');
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
  threeOrigins,
  stageRows,
  fourLines,
  twoRules,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  STAGES,
};
