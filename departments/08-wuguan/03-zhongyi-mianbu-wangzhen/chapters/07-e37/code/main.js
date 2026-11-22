#!/usr/bin/env node
/**
 * 中医面部望诊 · 第 7 章 · 舌：五法已经把特征分好了，烂的是数据
 * 课程: departments/08-wuguan/03-zhongyi-mianbu-wangzhen/chapters/07-e37/docs/zh.md
 * 底本: 《望诊遵经·望舌诊法提纲》及形容／气色／苔垢／津液四篇条目
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的数字全部从正文现算：五法逐条（从表格读）、采集协议六项、
 * 像素数与样本数之比（30 万 / 200 = 1500:1）、四类泄漏、quiz 接地情况。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = 7;
const SLUG = '07-e37';
const TITLE = '舌：五法已经把特征分好了，烂的是数据';

/** 各表格的数据行数（不含表头与分隔行），按出现顺序 */
const TABLE_ROWS = [5, 6];

/** 关键判据词 */
const TERMS = ['五法', '形容', '苔垢', '津液', '苔质比', '泄漏', '域偏移', '白斑', '红斑'];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = [
  '正交',
  '苔质比',
  '蜜拭苔垢',
  '按人切分',
  '四时望法相参',
  '活检',
  '不作优劣判断',
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

/** 五法：从「法／原文要点／可取的值／测量性质」那张表逐行读 */
function fiveMethods(text) {
  const blocks = tableBlocks(text);
  const t = blocks.find((b) => b.head[0] === '法') || { head: [], rows: [] };
  const rows = t.rows.map((r) => ({ method: r[0], gist: r[1] || '', values: r[2] || '', nature: r[3] || '' }));
  return { rows, names: rows.map((r) => r.method), count: rows.length };
}

/** 采集协议六项 */
function protocol(text) {
  const blocks = tableBlocks(text);
  const t = blocks.find((b) => b.head[0] === '项') || { head: [], rows: [] };
  const rows = t.rows.map((r) => ({ item: r[0], require: r[1] || '', reason: r[2] || '' }));
  return { rows, count: rows.length, items: rows.map((r) => r.item) };
}

/** 维度样本比：像素数 / 样本数 */
function dimensionRatio(text) {
  const t = String(text);
  const px = /(\d+)×(\d+)\s*的舌图/.exec(t);
  const pixels = /有\s*(\d+)\s*万个像素/.exec(t);
  const cases = /样本只有\s*(\d+)\s*例/.exec(t);
  const ratio = /(\d+):1/.exec(t);
  const p = pixels ? Number(pixels[1]) * 10000 : 0;
  const n = cases ? Number(cases[1]) : 0;
  const raw = px ? Number(px[1]) * Number(px[2]) : 0;
  return {
    size: px ? [Number(px[1]), Number(px[2])] : [],
    rawPixels: raw,
    pixels: p,
    cases: n,
    computed: n ? Math.round(p / n) : 0,
    claim: ratio ? Number(ratio[1]) : 0,
  };
}

/** 泄漏的几类：正文列了三种，末了又补一种最隐蔽的 */
function leaks(text) {
  const t = String(text);
  const named = ['同人同次连拍', '设备与批次成为捷径', '特征选择用了全数据', '标签由图像派生'].filter((k) => t.includes(k));
  return { named, count: named.length };
}

/** 域偏移篇目：正文点名的那一组「相参」 */
function driftChapters(text) {
  const t = String(text);
  return ['四时望法相参', '昼夜阴晴相参', '五方望法相参', '老少望法相参', '居养望法相参'].filter((k) => t.includes(k));
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
    methods: fiveMethods(text),
    protocol: protocol(text),
    ratio: dimensionRatio(text),
    leaks: leaks(text),
    drift: driftChapters(text),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  const d = r.ratio;
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
  console.log(`五法 ${r.methods.count} 个维度：${r.methods.names.join('、')}`);
  console.log(`采集协议 ${r.protocol.count} 项：${r.protocol.items.join('、')}`);
  console.log(
    `维度样本比：${d.size.join('×')} 图 = ${d.rawPixels.toLocaleString('en-US')} 像素（正文按 ${d.pixels / 10000} 万取整），样本 ${d.cases} 例 → ${d.computed}:1（正文写 ${d.claim}:1）`
  );
  console.log(`泄漏 ${r.leaks.count} 类：${r.leaks.named.join('；')}`);
  console.log(`域偏移的古典篇目 ${r.drift.length} 篇：${r.drift.join('、')}`);
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）`
  );
  console.log(`答案位置：${r.quiz.answers.join(' / ')}`);
  console.log('');
  console.log('※ 以上数字全部由本章正文现算，改正文后重跑即可复核。');
  console.log('※ 本章为舌与口腔黏膜望诊的教学材料，不构成诊疗建议、诊断或治疗指导。');
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
  fiveMethods,
  protocol,
  dimensionRatio,
  leaks,
  driftChapters,
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
