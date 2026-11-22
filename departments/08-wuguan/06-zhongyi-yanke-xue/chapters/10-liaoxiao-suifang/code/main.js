#!/usr/bin/env node
/**
 * 中医眼科学 · 第 10 章 · 疗效评价与随访：先把「有效」写下来，再开始治
 * 课程: departments/08-wuguan/06-zhongyi-yanke-xue/chapters/10-liaoxiao-suifang/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   汉字数、小节标题与顺序、三层指标表、证候积分的四个不可比、
 *   随访节律的三个变量、治疗前要写下的三样，以及 quiz 的 check 题接地情况。
 * 正文一改，重跑即可看出哪里对不上；测试再把这些数固定下来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 10;
const SLUG = '10-liaoxiao-suifang';
const TITLE = '疗效评价与随访：先把「有效」写下来，再开始治';

/** 关键判据词：本章反复使用的术语，是正文与习题同源的最小证据 */
const TERMS = ['视力表', '证候积分', '随访', '治未病', '依从性', '对比敏感度', '红线清单', '预设'];

/** 每节一个探针词：第 i 个必须出现在第 i 节，用来确认小节顺序没被改动 */
const SECTION_PROBES = [
  '视力表的边界',
  '互相校验',
  '条目不同则不可比',
  '行政节奏，不是医学节奏',
  '疗效评价的起点不在治疗结束，在治疗开始',
  '本章不给具体的评分表',
];

/** 三层指标的名字（顺序即正文表格顺序） */
const LAYERS = ['症状层', '功能层', '结构层'];

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

/** 去掉条目开头的序号「第一，」 */
const stripOrdinal = (s) => String(s).replace(/^第[一二三四][，,]\s*/, '');

/** 三层指标：表格（层 / 指标 / 谁报 / 特点） */
function metricLayers(text) {
  const block = tableBlocks(text)[0];
  return block
    ? block.rows.map((r) => ({ layer: r[0], metrics: r[1], who: r[2], trait: r[3] }))
    : [];
}

/** 证候积分的四个不可比：第三节的粗体条目 */
const fourIncomparable = (text) => boldLeads(sectionAt(text, 2)).map(stripOrdinal);

/** 随访节律的三个变量：第四节的粗体条目 */
const threeVars = (text) => boldLeads(sectionAt(text, 3));

/** 治疗前要写下的三样：正文「第一，目标——……第二，指标——……第三，时间——……」 */
function threeBefore(text) {
  const body = sectionAt(text, 4);
  const out = [];
  const re = /第([一二三])[，,]\s*([^—。]+?)——/g;
  let m;
  while ((m = re.exec(body)) !== null) out.push({ order: m[1], item: m[2].trim() });
  return out;
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
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    tables: tableBlocks(text).length,
    layers: metricLayers(text),
    incomparable: fourIncomparable(text),
    vars: threeVars(text),
    before: threeBefore(text),
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
  console.log(`三层指标（表格现读，${r.layers.length} 层）：`);
  for (const l of r.layers) console.log(`  ${l.layer} · ${l.metrics}｜${l.who}报 · ${l.trait}`);
  console.log('');
  console.log(`证候积分的四个不可比（正文现算，${r.incomparable.length} 条）：`);
  r.incomparable.forEach((x, i) => console.log(`  ${i + 1}. ${x}`));
  console.log('');
  console.log(`随访节律的三个变量（正文现算，${r.vars.length} 个）：${r.vars.join(' / ')}`);
  console.log(`治疗前要写下的三样（正文现算，${r.before.length} 样）：${r.before.map((b) => b.item).join(' / ')}`);
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
  console.log('※ 本章为教学材料，不构成诊疗建议或疗效承诺；评价标准与随访方案依现行规范执行。');
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
  metricLayers,
  fourIncomparable,
  threeVars,
  threeBefore,
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
