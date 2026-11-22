#!/usr/bin/env node
/**
 * 中医五官经典 · 第 6 章 · 对接不是「古方治今病」，是判据到判据的翻译
 * 课程: departments/08-wuguan/05-zhongyi-wuguan-jingdian/chapters/06-e56/docs/zh.md
 *
 * 本章的数字都由本脚本从正文现算，不手打：
 *   汉字数、第一节三层对接表的行与「不能得出什么」列、第三节三条核法、
 *   第五节卷五三篇与斗底风四步、第六节三种证据层级，
 *   以及 quiz 的 check 题能在正文里对上几个四字原词。正文一改，重跑即可看出哪里对不上。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '6';
const SLUG = '06-e56';
const TITLE = '对接不是「古方治今病」，是判据到判据的翻译';

/** 第一节三层对接表：三层，四列 */
const LAYER_ROWS = 3;
/** 第三节判据组对比的三条核法 */
const CRITERIA_LAWS = ['主症是否同位', '兼症是否同组', '时相是否同序'];
/** 第五节《审视瑶函》卷五的三篇 */
const JUAN5 = ['金针辨义', '煮针法', '用水法'];
/** 第五节斗底风四步 */
const STEP_WORDS = ['取痰', '开风路针', '冰硼散', '紫地汤'];
/** 第六节三种证据层级 */
const EVIDENCE = ['医案', '专书', '指南与规范'];
/** 每节一个探针词 */
const SECTION_PROBES = ['最容易出错', '只到检索为止', '三条核法', '先找它的「不宜」', '三篇', '证的是', '红旗优先于辨证'];
/** 关键判据词 */
const TERMS = ['判据差在哪', '必须查里面', '时相最常被漏', '排除性的', '找不到就不要用', '对接有止点'];

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

/** 第一节三层对接表：层／对的是什么／能得出什么／不能得出什么 */
function layerTable(text) {
  const t = tableBlocks(text)[0];
  if (!t) return { head: [], rows: [] };
  return { head: t.head, rows: t.rows.map((r) => ({ layer: r[0], what: r[1], can: r[2], cannot: r[3] })) };
}

/** 第三节三条核法：从「判据组对比有三条核法：」那一句里切 */
function criteriaLaws(text) {
  const sec = sectionAt(text, 2);
  const line = String(sec).split(NL).find((l) => l.includes('三条核法')) || '';
  const body = line.slice(line.indexOf('核法：') + 3).split('。')[0];
  return body.split('，').map((s) => s.trim()).filter(Boolean);
}

/** 第五节卷五三篇：只取斜体书名后「」里的三篇名 */
function juan5Titles(text) {
  const sec = sectionAt(text, 4);
  return JUAN5.filter((t) => String(sec).includes('「' + t + '」'));
}

/** 第五节斗底风四步：只要四个动作词，次序由出现位置判定 */
function stepOrder(text) {
  const sec = sectionAt(text, 4);
  return STEP_WORDS.map((w) => ({ word: w, at: sec.indexOf(w) })).sort((a, b) => a.at - b.at);
}

/** 第六节三种证据层级：以粗体标签为准 */
function evidenceTiers(text) {
  const sec = sectionAt(text, 5);
  return EVIDENCE.filter((e) => String(sec).includes('**' + e + '**'));
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
    layers: layerTable(text),
    laws: criteriaLaws(text),
    juan5: juan5Titles(text),
    steps: stepOrder(text),
    evidence: evidenceTiers(text),
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
  console.log('三层对接（各层不能得出什么，比能得出什么更该记）：');
  for (const x of r.layers.rows) console.log(`  ${x.layer.padEnd(2)} → 能得：${x.can} ／ 不能得：${x.cannot}`);
  console.log('');
  console.log(`判据组对比 ${r.laws.length} 条核法：${r.laws.join(' / ')}`);
  console.log('');
  console.log(`《审视瑶函》卷五三篇：${r.juan5.join(' / ')}`);
  console.log(`斗底风四步次序：${r.steps.map((s) => s.word).join(' → ')}`);
  console.log('');
  console.log(`证据层级：${r.evidence.join(' / ')}（不能互相冒充，也不能互相取消）`);
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
  console.log('※ 本章为教学材料，不构成医学意见、诊断或治疗指导；方名只标方向、不含剂量与疗程，古籍所载操作不可直接照搬。');
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
  layerTable,
  criteriaLaws,
  juan5Titles,
  stepOrder,
  evidenceTiers,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  LAYER_ROWS,
  CRITERIA_LAWS,
  JUAN5,
  STEP_WORDS,
  EVIDENCE,
  SECTION_PROBES,
  TERMS,
};
