#!/usr/bin/env node
/**
 * 中医耳鼻喉科学 · 第 10 章 · 说不出「好了多少」，就等于没治：量表与疗效的刻度
 * 课程: departments/08-wuguan/07-zhongyi-erbihou-xue/chapters/10-liangbiao-pingjia/docs/zh.md
 *
 * 本章的数字都由本脚本从正文现算，不手打：
 *   汉字数、二级小节与顺序、三层的层名、三种掩盖的条数、最小数据集的条数，
 *   以及第四节那几道算术——满分、最细一档的占比、log₂11、25×4、22×5、4⁵——
 *   每一项都把「正文里写的数」与「本题设重新算出的数」并排比对。
 * 正文一改，重跑即可看出哪一处算不平。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '10';
const SLUG = '10-liangbiao-pingjia';
const TITLE = '说不出「好了多少」，就等于没治：量表与疗效的刻度';

/** 表格期望数据行数：症状／功能／生活质量三层 */
const TABLE_ROWS = [3];

const TERMS = ['视觉模拟量表', '耳鸣残疾量表', '天花板', '回忆偏倚', '重测一致性', '最小数据集', '证候积分', '比特'];

/** 每节一个探针词：第 i 个必须出现在第 i 个二级小节 */
const SECTION_PROBES = ['基线、量程、时点、判定规则', '三层分别报告', '总分是一个平均值', '3.46', '没有对照，只谈变化', '不给任何判定阈值'];

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

const pick = (text, re, i = 1) => {
  const m = re.exec(String(text));
  return m ? m[i] : null;
};

/**
 * 第四节的四道算术：正文给出题设与结果，这里按题设重算，再与正文的数比对。
 * 任何一处算不平，ok 就是 false——这是本章代码存在的理由。
 */
function arithmetic(text) {
  const out = [];
  const push = (label, computed, stated) => out.push({ label, computed: String(computed), stated: stated === null ? null : String(stated), ok: String(computed) === String(stated) });

  // 鼻部症状总分：四项各 0～3 分
  const totalStated = pick(text, /满分 (\d+) 分/);
  push('鼻部四项满分', 4 * 3, totalStated);

  // 最细一档占满分：1/12
  const shareStated = pick(text, /1 分占总分的 ([\d.]+)%/);
  push('1 分占满分百分比', ((1 / 12) * 100).toFixed(1), shareStated);

  // 视觉模拟量表：11 个取值的信息量
  const levels = Number(pick(text, /共 (\d+) 个取值/) || 0);
  const bitsStated = pick(text, /信息量约 ([\d.]+) 比特/);
  push('log2(取值数)', Math.log2(levels).toFixed(2), bitsStated);

  // 耳鸣残疾量表：25 题各 0～4 分
  const thi = /(\d+) 题各 0～(\d+) 分，理论量程 0～(\d+)/.exec(String(text));
  if (thi) push('耳鸣残疾量表量程', Number(thi[1]) * Number(thi[2]), thi[3]);

  // 鼻部生活质量问卷：22 项各 0～5 分
  const nose = /(\d+) 项生活质量问卷\*\*若各 0～(\d+) 分，量程 0～(\d+)/.exec(String(text));
  if (nose) push('鼻部生活质量量程', Number(nose[1]) * Number(nose[2]), nose[3]);

  // 嗓音听感知评分：五个维度各 0～3 分，组合数
  const voiceStated = pick(text, /组合起来 (\d+) 种/);
  push('嗓音五维组合数', 4 ** 5, voiceStated);

  return out;
}

/** 三层：症状、功能、生活质量，谁填也要能读出来 */
function layers(text) {
  const rows = (tableBlocks(text)[0] || { rows: [] }).rows;
  return rows.map((r) => ({ layer: r[0], who: r[3] }));
}

/** 三种掩盖：总分掩盖了什么，正文用一、二、三编号 */
function masks(text) {
  return [...sectionAt(text, 2).matchAll(/^\*\*([一二三])、掩盖([^*]+)\*\*/gm)].map((m) => m[1] + '：' + m[2].trim());
}

/** 最小数据集五件事：第五节 1～5 编号 */
function minimalSet(text) {
  return [...sectionAt(text, 4).matchAll(/^(\d+)\. \*\*/gm)].map((m) => m[1]);
}

/** 第四节四条使用纪律：第一～第四 */
function rules(text) {
  return [...sectionAt(text, 4).matchAll(/\*\*(第[一二三四])，/g)].map((m) => m[1]);
}

function conclusions(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    const i = line.indexOf('判据收束成一句');
    if (i >= 0) out.push(line.slice(i + '判据收束成一句'.length).replace(/^[:：]\s*/, '').trim());
  }
  return out;
}

/** 本章两处硬边界：不给阈值、没有对照只谈变化 */
function boundaries(text) {
  const line = (kw) => (String(text).split(/\r?\n/).find((l) => l.includes(kw)) || '').trim();
  return {
    threshold: line('不给任何判定阈值'),
    control: line('没有对照，只谈变化'),
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
    terms: TERMS.map((t) => ({ term: t, count: occurrences(text, t) })),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).includes(p) })),
    arithmetic: arithmetic(text),
    layers: layers(text),
    masks: masks(text),
    minimal: minimalSet(text),
    rules: rules(text),
    conclusions: conclusions(text),
    bounds: boundaries(text),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医耳鼻喉科学 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`表格 ${r.tables.length} 张：`);
  r.tables.forEach((t, i) => console.log(`  #${i + 1}  ${t.rows} 行 × ${t.cols} 列  首列表头「${t.first}」`));
  console.log('');
  console.log('三层的层名与填表人：');
  r.layers.forEach((l) => console.log(`  ${l.layer}（${l.who}）`));
  console.log(`三种掩盖 ${r.masks.length} 条：${r.masks.join('；')}`);
  console.log('');
  console.log('第四节的算术（题设重算 vs 正文所写）：');
  r.arithmetic.forEach((a) => console.log(`  ${a.ok ? '✓' : '✗'} ${a.label}：${a.computed}（正文 ${a.stated}）`));
  console.log('');
  console.log(`最小数据集 ${r.minimal.length} 项；四条使用纪律 ${r.rules.length} 条（${r.rules.join('、')}）`);
  console.log('');
  console.log('关键判据（出现次数）：');
  console.log('  ' + r.terms.map((x) => `${x.term} ${x.count}`).join(' · '));
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log('判据收束：');
  r.conclusions.forEach((c) => console.log('  ' + c));
  console.log('');
  console.log(`quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`);
  console.log('');
  console.log('※ 以上数字与清单全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，不构成医学意见、诊断或处置指导。');
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
  arithmetic,
  layers,
  masks,
  minimalSet,
  rules,
  conclusions,
  boundaries,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TABLE_ROWS,
  TERMS,
  SECTION_PROBES,
};
