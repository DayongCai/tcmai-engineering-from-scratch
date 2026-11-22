#!/usr/bin/env node
/**
 * 骨伤科手法治疗学 · 第 10 章 · 「好多了」不是结论：没有时点的疗效，等于没有疗效
 * 课程: departments/04-gushang/08-gushang-shoufa-zhiliao/chapters/10-pingjia/docs/zh.md
 * 依据: 《医宗金鉴·正骨心法要旨·手法总论》
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字与清单全部由本脚本从正文现算，不手打：
 *   有效的三个量、指标七个域、四个复评节点、方案五格、无效六种形态、
 *   三条前置条件与四条停手条件，以及 quiz 的接地情况。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '10';
const SLUG = '10-pingjia';
const TITLE = '「好多了」不是结论：没有时点的疗效，等于没有疗效';

const EXPECTED_EFFECT = ['变化幅度', '出现时点', '可归因性'];
const EXPECTED_NODES = ['基线', '中段', '末段', '随访'];
const EXPECTED_PLAN = ['部位', '手法层次', '参数', '频次', '复评'];

const SECTION_PROBES = ['两个终点', '变化幅度', '七个域', '复评节点', '五格', '六种形态', '不给阈值'];

const GRAM = 4;
const LINES = /\r?\n/;

const readDoc = () => fs.readFileSync(DOC, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

function h2Titles(text) {
  const out = [];
  for (const line of String(text).split(LINES)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) out.push(m[1].trim());
  }
  return out;
}

function h2Sections(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split(LINES)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) {
      cur = { title: m[1].trim(), body: [line] };
      out.push(cur);
    } else if (cur) cur.body.push(line);
  }
  return out.map((s) => ({ title: s.title, body: s.body.join('\n') }));
}

const sectionAt = (text, i) => (h2Sections(text)[i] || { title: '', body: '' });

function tableBlocks(text) {
  const blocks = [];
  let cur = null;
  for (const line of String(text).split(LINES)) {
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

function boldItems(body) {
  const out = [];
  for (const line of String(body).split(LINES)) {
    const m = /^(?:-\s+)?\*\*(.+?)。?\*\*/.exec(line.trim());
    if (!m) continue;
    const label = m[1].trim();
    if (label.endsWith('：') || label.endsWith(':')) continue;
    out.push(label.replace(/[。、，]$/g, '').trim());
  }
  return out;
}

/** 有效的三个量：正文「必须拆成三个：变化幅度、出现时点、可归因性」 */
function threeEffect() {
  const line = readDoc().split(LINES).find((l) => l.includes('必须拆成三个')) || '';
  const tail = (/拆成三个[：:](.+?)。/.exec(line) || [null, ''])[1];
  return tail.split(/、/).map((s) => s.trim()).filter(Boolean);
}

/** 指标的七个域：第一张表的行首列 */
function sevenDomains() {
  const t = tableBlocks(readDoc())[0];
  return t ? t.rows.map((r) => ({ domain: r[0], kind: r[1], record: r[2], cannot: r[3] })) : [];
}

/** 四个复评节点：正文「节点结构是四个：基线、中段、末段、随访」 */
function fourNodes() {
  const line = readDoc().split(LINES).find((l) => l.includes('节点结构是四个')) || '';
  const tail = (/四个[：:](.+?)。/.exec(line) || [null, ''])[1];
  return tail.split(/、/).map((s) => s.trim()).filter(Boolean);
}

/** 方案五格：正文「由五格组成：部位 × 手法层次 × 参数 × 频次 × 复评」 */
function planCells() {
  const line = readDoc().split(LINES).find((l) => l.includes('由五格组成')) || '';
  const tail = (/五格组成[：:](.+?)。/.exec(line) || [null, ''])[1];
  return String(tail)
    .replace(/\*/g, '')
    .split(/[×xX]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 方案的三种走向：正文「去向只有三种：继续、改动、停止」 */
function threeDirections() {
  const line = readDoc().split(LINES).find((l) => l.includes('去向只有三种')) || '';
  const tail = (/只有三种[：:](.+?)。/.exec(line) || [null, ''])[1];
  return tail.split(/、/).map((s) => s.trim()).filter(Boolean);
}

/** 无效的六种形态：第二张表的行首列 */
function sixIneffective() {
  const t = tableBlocks(readDoc())[1];
  return t ? t.rows.map((r) => ({ form: r[0], criteria: r[1], change: r[2], never: r[3] })) : [];
}

/** 四条停手条件：正文「停手条件：……——四条任一成立」 */
function stopConditions() {
  const body = readDoc();
  const m = /\*\*停手条件\*\*[：:](.+?)[—]{2}/.exec(body);
  return m ? m[1].split(/、/).map((s) => s.trim()).filter(Boolean) : [];
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
    spread: new Set(qs.map((q) => q.correct)).size,
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    effect: threeEffect(),
    domains: sevenDomains(),
    nodes: fourNodes(),
    plan: planCells(),
    directions: threeDirections(),
    ineffective: sixIneffective(),
    stops: stopConditions(),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).body.includes(p) })),
    terms: ['最小临床重要差异', '基线', '归因', '复评', '再看看'].map((t) => ({ t, n: occurrences(text, t) })),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`骨伤科手法治疗学 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个 · 表格 ${tableBlocks(readDoc()).length} 张`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`有效的三个量（${r.effect.length} 个）：${r.effect.join(' / ')}`);
  console.log(`指标的域（${r.domains.length} 个）：${r.domains.map((x) => x.domain).join(' / ')}`);
  console.log(`复评节点（${r.nodes.length} 个）：${r.nodes.join(' / ')}`);
  console.log(`方案的格子（${r.plan.length} 格）：${r.plan.join(' × ')}`);
  console.log(`方案走向（${r.directions.length} 种）：${r.directions.join(' / ')}（无「再看看」）`);
  console.log(`无效的形态（${r.ineffective.length} 种）：${r.ineffective.map((x) => x.form).join(' / ')}`);
  console.log(`停手条件（${r.stops.length} 条）：${r.stops.join(' / ')}`);
  console.log('');
  console.log('关键判据（出现次数）：' + r.terms.map((x) => `${x.t} ${x.n}`).join(' · '));
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置`
  );
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成诊疗建议、诊断或训练建议。');
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
  boldItems,
  threeEffect,
  sevenDomains,
  fourNodes,
  planCells,
  threeDirections,
  sixIneffective,
  stopConditions,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  EXPECTED_EFFECT,
  EXPECTED_NODES,
  EXPECTED_PLAN,
  SECTION_PROBES,
};
