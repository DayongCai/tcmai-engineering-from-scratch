#!/usr/bin/env node
/**
 * 中医面部望诊 · 第 8 章 · 记录：把「看到」写成可以被别人核对的东西
 * 课程: departments/08-wuguan/03-zhongyi-mianbu-wangzhen/chapters/08-e38/docs/zh.md
 * 底本: 《望诊遵经·气色声音合参》《气色脉象合参》《气色病症合参》《推广望色大意》
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部从正文现算：名义格子数（24 × 5 × 32）、记录四段、三层分离、
 * Kappa 那个例子（由两位判读者的边际重新算一遍，看是否落在正文写的 0.31）、
 * 记录模板九字段、quiz 接地情况。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 8;
const SLUG = '08-e38';
const TITLE = '记录：把「看到」写成可以被别人核对的东西';

/** 各表格的数据行数（不含表头与分隔行），按出现顺序 */
const TABLE_ROWS = [4, 3, 9];

/** 关键判据词 */
const TERMS = ['可复核', '名目层', '特征层', '判据层', 'Kappa', '相胜', '可识别性', '知情同意'];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = [
  '面色萎黄',
  '名目层',
  '双人盲法',
  '相胜',
  '生物识别信息',
  '宁可少记',
  '不是行业标准',
];

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

/** 名义格子数：24 部位 × 5 色 × 32 种十法组合 */
function nominalGrid(text) {
  const m = /(\d+)×(\d+)×(\d+)＝(\d+)/.exec(String(text));
  if (!m) return null;
  const [a, b, c, claimed] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  return { parts: a, colours: b, combos: c, claimed, computed: a * b * c };
}

/** 记录四段：部位、征象、程度、条件，以及「面色萎黄」里各段有没有 */
function segments(text) {
  const blocks = tableBlocks(text);
  const t = blocks.find((b) => b.head[0] === '段') || { head: [], rows: [] };
  const rows = t.rows.map((r) => ({ seg: r[0], content: r[1] || '', present: r[2] || '' }));
  return {
    rows,
    count: rows.length,
    filled: rows.filter((r) => !/^无/.test(r.present)).map((r) => r.seg),
    empty: rows.filter((r) => /^无/.test(r.present)).map((r) => r.seg),
  };
}

/** 三层分离：名目层、特征层、判据层，各自的变更成本 */
function layers(text) {
  const blocks = tableBlocks(text);
  const t = blocks.find((b) => b.head[0] === '层' && b.head.includes('变更成本')) || { head: [], rows: [] };
  const rows = t.rows.map((r) => ({ layer: r[0], content: r[1] || '', cost: r[2] || '', owner: r[3] || '' }));
  return { rows, names: rows.map((r) => r.layer), count: rows.length };
}

/** Kappa 那个演算：由两位判读者的边际重算一遍 */
function kappaExample(text) {
  const t = String(text);
  const n = /(\d+)\s*例样本/.exec(t);
  const positive = /其中\s*(\d+)\s*例为「有泽」/.exec(t);
  const readings = [...t.matchAll(/判出\s*(\d+)\s*有泽／(\d+)\s*无泽/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const agree = /原始一致\s*(\d+)\s*例/.exec(t);
  const claimPo = /一致率\s*(\d+)%/.exec(t);
  const claimPe = /期望一致率约为\s*([\d.]+)/.exec(t);
  const claimK = /Kappa\s*只有\s*([\d.]+)/.exec(t);
  const total = n ? Number(n[1]) : 0;
  const a = readings[0] || [];
  const b = readings[1] || [];
  let po = 0;
  let pe = 0;
  let k = 0;
  if (total && a.length && b.length) {
    po = (agree ? Number(agree[1]) : 0) / total;
    pe = (a[0] / total) * (b[0] / total) + (a[1] / total) * (b[1] / total);
    k = (po - pe) / (1 - pe);
  }
  return {
    total,
    distribution: positive ? [Number(positive[1]), total - Number(positive[1])] : [],
    readings,
    agree: agree ? Number(agree[1]) : 0,
    po,
    pe,
    kappa: k,
    claim: {
      po: claimPo ? Number(claimPo[1]) : 0,
      pe: claimPe ? Number(claimPe[1]) : 0,
      kappa: claimK ? Number(claimK[1]) : 0,
    },
  };
}

/** 记录模板：九个字段，以及哪些是必填 */
function template(text) {
  const blocks = tableBlocks(text);
  const t = blocks.find((b) => b.head[0] === '字段' && b.head.includes('必填')) || { head: [], rows: [] };
  const rows = t.rows.map((r) => ({ field: r[0], required: String(r[2] || '').includes('✓') }));
  return { rows, count: rows.length, required: rows.filter((r) => r.required).length };
}

const presentCount = (text, terms) => terms.filter((t) => occurrences(text, t) > 0).length;

function quizSummary(quiz, text) {
  const body = grams(text);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  for (const q of qs) if (stage[q.stage] !== undefined) stage[q.stage] += 1;
  const hits = qs.filter((q) => q.stage === 'check').map((q) => {
    const right = String((q.options || [])[q.correct] || '');
    const hit = [...new Set([...grams(right)].filter((g) => body.has(g)))];
    return { question: q.question, grams: hit, correct: q.correct };
  });
  return {
    total: qs.length,
    stage,
    check: hits.length,
    grounded: hits.filter((h) => h.grams.length >= 2).length,
    hits,
    answers: qs.map((q) => q.correct),
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
    grid: nominalGrid(text),
    segments: segments(text),
    layers: layers(text),
    kappa: kappaExample(text),
    template: template(text),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  const k = r.kappa;
  console.log(`中医面部望诊 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`表格 ${r.tables.length} 张：`);
  r.tables.forEach((t, i) => console.log(`  #${i + 1}  ${t.rows} 行 × ${t.cols} 列  首列表头「${t.first}」`));
  console.log('');
  console.log('关键判据（出现次数）：');
  console.log('  ' + r.terms.map((x) => `${x.term} ${x.count}`).join(' · '));
  console.log('');
  console.log('小节探针：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  if (r.grid) {
    console.log(
      `名义格子：${r.grid.parts} 部位 × ${r.grid.colours} 色 × ${r.grid.combos} 组合 = ${r.grid.computed}（正文写 ${r.grid.claimed}）`
    );
  }
  console.log(
    `记录四段：${r.segments.rows.map((x) => x.seg).join('、')}；「面色萎黄」里有内容的 ${r.segments.filled.length} 段（${r.segments.filled.join('、')}），空的 ${r.segments.empty.length} 段（${r.segments.empty.join('、')}）`
  );
  console.log(`三层分离：${r.layers.rows.map((x) => `${x.layer}（成本${x.cost}）`).join(' · ')}`);
  console.log(
    `Kappa 演算：${k.total} 例，分布 ${k.distribution.join('/')}；A ${k.readings[0].join('/')}、B ${k.readings[1].join('/')}；一致 ${k.agree} 例 → 一致率 ${(k.po * 100).toFixed(0)}%，期望一致率 ${k.pe.toFixed(2)}，Kappa ${k.kappa.toFixed(2)}（正文写 ${k.claim.kappa}）`
  );
  console.log(`记录模板：${r.template.count} 个字段，其中必填 ${r.template.required} 个`);
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`
  );
  console.log(`答案位置：${r.quiz.answers.join(' / ')}`);
  console.log('');
  console.log('※ 以上数字全部由本章正文现算，改正文后重跑即可复核。');
  console.log('※ 本章为望诊记录与复核的教学材料，不构成医学、法律或合规意见。');
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
  nominalGrid,
  segments,
  layers,
  kappaExample,
  template,
  presentCount,
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
