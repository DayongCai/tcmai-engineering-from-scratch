#!/usr/bin/env node
/**
 * 中药化学 · 第 6 章 皂苷的两张面孔：一面起泡溶血，一面是补益药的主体：单元层、正文与习题的三方对账
 *
 *   node code/main.js
 *
 * 正文：chapters/06-zaogan-lei/docs/zh.md
 * 习题：chapters/06-zaogan-lei/quiz.json
 * 单元：standards/zhongyao-huaxue/units.json（本章取材的小节号见 KEYS）
 * 依赖：仅 Node.js 标准库
 *
 * 输出三段，任一自检不过即退出码 1：
 *   · 规模：取材单元的字数、平均字数、按教材章归属、引书与操作词
 *   · 词频：单元层的三栏（结构特征／理化性质／提分与检识）与生源途径四路
 *   · 习题：6 题、pre 1 题 / check 3 题 / post 2 题、四选项互异、check 正确项逐字出自正文
 * 数字全部现算：正文引用的规模数由单元层复算，习题与正文是否同源由本脚本判定。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'zhongyao-huaxue', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/zhongyao-huaxue/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const UNITS = path.join(ROOT, 'standards', 'zhongyao-huaxue', 'units.json');
const CHAPTER = '6';
const KEYS = ['8.1.1', '8.1.2', '8.2.1', '8.2.2', '9.1.1', '9.2.1'];

const load = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));

function chapterUnits(units) {
  return units.units
    .filter((u) => KEYS.includes(u.sub))
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en', { numeric: true }));
}

const sum = (d) => Object.values(d).reduce((a, b) => a + b, 0);

/** 把本章各单元在某一栏上的词频相加：一张表里同一个词可能拆在多个单元 */
function merge(list, field) {
  const out = {};
  for (const u of list) {
    const src = (u.measure && u.measure[field]) || {};
    for (const [k, v] of Object.entries(src)) out[k] = (out[k] || 0) + v;
  }
  return out;
}

/** 词频降序，附占比：占比用来看「重心」，计数用来看「量」 */
function rank(dict) {
  const tot = sum(dict);
  return Object.entries(dict)
    .map(([key, count]) => ({ key, count, share: tot ? count / tot : 0 }))
    .sort((a, b) => b.count - a.count);
}

function byBookSection(list) {
  const out = new Map();
  for (const u of list) {
    const key = `教材第${u.chapter}章`;
    const it = out.get(key) || { sec: key, units: 0, hanzi: 0 };
    it.units += 1;
    it.hanzi += u.hanzi;
    out.set(key, it);
  }
  return [...out.values()];
}

function citations(list) {
  const counter = new Map();
  for (const u of list) {
    for (const m of u.prose.matchAll(/《([^》]+)》/g)) counter.set(m[1], (counter.get(m[1]) || 0) + 1);
  }
  const ranked = [...counter.entries()].sort((a, b) => b[1] - a[1]);
  return { books: counter.size, total: sum(Object.fromEntries(counter)), top: ranked.slice(0, 3) };
}

function shape(list) {
  const hanzi = list.reduce((a, u) => a + u.hanzi, 0);
  return {
    units: list.length,
    hanzi,
    mean: list.length ? Math.round(hanzi / list.length) : 0,
    valueLike: list.reduce((a, u) => a + u.measure.valueLike, 0),
    digits: list.reduce((a, u) => a + u.measure.digits, 0),
  };
}

/** 本章的操作词命中：用来判断正文落在「怎么做」还是「怎么说」上 */
const WORDS = ['提取', '分离', '检识', '色谱', '溶剂', '水解', '氧化', '萃取', '蒸馏', '重结晶'];

function hands(list) {
  return WORDS
    .map((w) => [w, list.reduce((a, u) => a + u.prose.split(w).length - 1, 0)])
    .filter(([, c]) => c)
    .sort((a, b) => b[1] - a[1]);
}

/* ── 正文与习题：同一章的两份文件互相校验 ───────────────────────── */

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

/** 正文里全部 6 字连续片段（去标点后按段切），用来判「逐字接地」 */
function docGrams(text, n = 6) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const docSections = (doc) => (String(doc).match(/^## /gm) || []).length;

/** 习题自检：6 题、三段、四选项互异、解释 40–80 汉字、check 正确项逐字出自正文 */
function quizCheck() {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const doc = fs.readFileSync(DOC, 'utf8');
  const body = docGrams(doc, 6);
  const issues = [];
  const qs = Array.isArray(q.questions) ? q.questions : [];
  if (qs.length !== 6) issues.push(`题数 ${qs.length} ≠ 6`);
  const stage = (s) => qs.filter((x) => x.stage === s).length;
  if (stage('pre') !== 1 || stage('check') !== 3 || stage('post') !== 2) {
    issues.push(`pre/check/post = ${stage('pre')}/${stage('check')}/${stage('post')}`);
  }
  let grounded = 0;
  qs.forEach((it, i) => {
    const opts = Array.isArray(it.options) ? it.options : [];
    if (opts.length !== 4) issues.push(`第 ${i + 1} 题选项 ${opts.length} 个`);
    if (new Set(opts.map((o) => String(o).trim())).size !== opts.length) issues.push(`第 ${i + 1} 题选项重复`);
    if (!(Number.isInteger(it.correct) && it.correct >= 0 && it.correct < opts.length)) {
      issues.push(`第 ${i + 1} 题 correct 越界`);
    }
    const h = hanzi(it.explain || it.explanation || '');
    if (h < 40 || h > 80) issues.push(`第 ${i + 1} 题解释 ${h} 字`);
    if (it.stage === 'check') {
      const hit = [...docGrams(String(opts[it.correct] || ''), 6)].some((g) => body.has(g));
      if (hit) grounded += 1;
      else issues.push(`第 ${i + 1} 题 check 正确项未逐字出自正文`);
    }
  });
  if (grounded < 3) issues.push(`接地 ${grounded}/3`);
  return { ok: !issues.length, issues, stats: { questions: qs.length, grounded, sections: docSections(doc) } };
}

module.exports = { CHAPTER, KEYS, load, chapterUnits, merge, rank, byBookSection, citations, shape, hands, sum, quizCheck, docSections };

if (require.main === module) {
  const data = load();
  const list = chapterUnits(data);
  const s = shape(list);
  console.log('═══ 中药化学 · 第 6 章 皂苷的两张面孔：一面起泡溶血，一面是补益药的主体 ═══');
  console.log(`单元 ${s.units} · 汉字 ${s.hanzi} · 平均 ${s.mean} 字/单元`);
  console.log(`数值类命中 ${s.valueLike} · 数字字符 ${s.digits}`);
  console.log('\n按教材章：');
  for (const sec of byBookSection(list)) console.log(`  ${sec.sec}  ${sec.units} 单元 · ${sec.hanzi} 字`);
  console.log('\n结构／性质／方法三栏词频：');
  for (const v of rank(merge(list, 'views'))) console.log(`  ${v.key}\t${v.count}\t${(v.share * 100).toFixed(1)}%`);
  console.log('\n生源途径四路词频：');
  for (const v of rank(merge(list, 'levels'))) console.log(`  ${v.key}\t${v.count}\t${(v.share * 100).toFixed(1)}%`);
  const c = citations(list);
  console.log(`\n引书 ${c.books} 部 · 引用 ${c.total} 次 · 前三：${c.top.map(([n, k]) => `${n}(${k})`).join('、')}`);
  console.log('\n操作词命中：' + (hands(list).map(([w, k]) => `${w}×${k}`).join('  ') || '（无）'));
  for (const u of list) console.log(`  ${u.sub}\t${u.title}\t${u.hanzi}字`);

  const q = quizCheck();
  console.log(`\n习题：${q.stats.questions} 题 · check 接地 ${q.stats.grounded}/3 · 正文二级小节 ${q.stats.sections}`);
  if (!q.ok) {
    for (const msg of q.issues) console.error('  ✗ ' + msg);
    console.error('※ 习题与正文不同源，退出码 1。');
    process.exitCode = 1;
  }
  console.log('※ 教学样例：数字由 standards/zhongyao-huaxue/units.json 现算，不构成诊疗建议，不能替代医师面诊。');
}
