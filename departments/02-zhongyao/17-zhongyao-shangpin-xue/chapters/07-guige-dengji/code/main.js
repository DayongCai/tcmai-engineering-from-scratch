#!/usr/bin/env node
/**
 * 中药商品学 · 第 7 章 规格分级给的是可比的级差，不是质量的判决
 * 课程: departments/02-zhongyao/17-zhongyao-shangpin-xue/chapters/07-guige-dengji/docs/zh.md
 * 依赖: 仅 Node.js 标准库；只读 ../docs/zh.md 与 ../quiz.json，不读 standards/。
 *
 * 一章要交三样东西：正文、习题、代码。代码只干一件事 —— 把「习题是否与正文同源」
 * 变成可以复算的数：正文汉字、二级节、题量与解释长度、check 题接地数。
 * 接地数指 check 题的正确选项里，至少有一段 >=6 汉字的原文真的出现在当章正文里。
 *
 * 另附两条本章特有的观察：引书（《……》命中）与操作词命中（规格／等级／分等／抽样）。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SLUG = '07-guige-dengji';
const CHAPTER = 7;
const DIR = __dirname;
const DOC = path.join(DIR, '..', 'docs', 'zh.md');
const QUIZ = path.join(DIR, '..', 'quiz.json');

/** 本章的操作词：正文里这些词出现的次数，说明这一章能落到动作上多少 */
const WORDS = ["规格","等级","分等","抽样","统货","级差","标准","验收"];

const load = () => ({
  doc: fs.readFileSync(DOC, 'utf8'),
  quiz: JSON.parse(fs.readFileSync(QUIZ, 'utf8')),
});

const data = load();
const doc = data.doc;
const quiz = data.quiz;

const hz = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;
const sum = (d) => Object.values(d).reduce((a, b) => a + b, 0);

/** 正文声明的教材小节号（教材·第N章·x.y.z） */
const KEYS = [...new Set((doc.match(/教材·第\d+章·\d+\.\d+\.\d+/g) || []))].sort();

function cites(text) {
  const out = {};
  for (const m of String(text || '').matchAll(/《([^》]{2,40})》/g)) out[m[1]] = (out[m[1]] || 0) + 1;
  return out;
}

function terms(text) {
  const out = {};
  for (const w of WORDS) {
    const n = String(text || '').split(w).length - 1;
    if (n) out[w] = n;
  }
  return out;
}

/** 正文按二级标题切节：卷首（题名／引题／根因／出处）算第 0 单元，每节带题名、汉字数、引书与操作词 */
function chapterUnits() {
  return doc
    .split(/\n(?=## )/)
    .map((blk, i) => {
      const isSec = /^## /.test(blk);
      const title = isSec ? (blk.match(/^## (.+)$/m) || [null, ''])[1].trim() : '卷首';
      return { sub: String(i + 1), title, sec: isSec, text: blk, hanzi: hz(blk), cites: cites(blk), terms: terms(blk) };
    });
}

function merge(list, field) {
  const out = {};
  for (const u of list) for (const [k, v] of Object.entries(u[field] || {})) out[k] = (out[k] || 0) + v;
  return out;
}

function rank(dict) {
  const tot = sum(dict);
  return Object.entries(dict)
    .map(([key, count]) => ({ key, count, share: tot ? count / tot : 0 }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, 'zh'));
}

/** 按每节声明的教材小节号归并（未声明者记「本章」） */
function byBookSection(list) {
  const out = new Map();
  for (const u of list) {
    const m = u.text.match(/教材·第\d+章·(\d+\.\d+\.\d+)/);
    const key = m ? m[1] : '本章';
    const it = out.get(key) || { sec: key, units: 0, hanzi: 0 };
    it.units += 1;
    it.hanzi += u.hanzi;
    out.set(key, it);
  }
  return [...out.values()];
}

function citations(list) {
  const dict = merge(list, 'cites');
  const ranked = rank(dict);
  return { books: ranked.length, total: sum(dict), top: ranked.slice(0, 3).map((r) => [r.key, r.count]) };
}

/** 正文的规模：节数、汉字、平均，以及「带单位的数」与「数字字符」两种计法 */
function shape(list) {
  const hanzi = list.reduce((a, u) => a + u.hanzi, 0);
  const sized = doc.match(/\d+(?:\.\d+)?\s*(?:%|年|月|日|次|项|种|个|部|条|级|章|节|度|天|小时|分钟|克|千克|毫升|倍|元|册|版|部分)/g) || [];
  return {
    units: list.length,
    hanzi,
    mean: list.length ? Math.round(hanzi / list.length) : 0,
    valueLike: sized.length,
    digits: (doc.match(/\d/g) || []).length,
  };
}

/** 操作词命中，按次数排序 */
function hands(list) {
  return rank(merge(list, 'terms')).map((r) => [r.key, r.count]);
}

/* ---- 习题自检：与判卷门同口径，但更严一格（6 汉字连续原文） ---- */

const N = 6;
const BODY = shingleSet(doc, N);

function shingleSet(text, n) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function grounded(option) {
  const clean = String(option || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + N <= seg.length; i += 1) if (BODY.has(seg.slice(i, i + N))) return true;
  }
  return false;
}

const why = (q) => q.explain || q.explanation || '';

function audit() {
  const stages = { pre: 0, check: 0, post: 0 };
  for (const q of quiz.questions) stages[q.stage] = (stages[q.stage] || 0) + 1;
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const lens = quiz.questions.map((q) => hz(why(q)));
  return {
    hanzi: hz(doc),
    secs: (doc.match(/^## /gm) || []).length,
    total: quiz.questions.length,
    stages,
    checkCount: checks.length,
    hit: checks.filter((q) => grounded(q.options[q.correct])).length,
    minExplain: Math.min(...lens),
    maxExplain: Math.max(...lens),
  };
}

function main() {
  const a = audit();
  const list = chapterUnits();
  const s = shape(list);
  const c = citations(list);
  console.log('第 ' + CHAPTER + ' 章 · ' + quiz.title);
  console.log('正文 ' + a.hanzi + ' 汉字 · 二级节 ' + a.secs + ' · 平均 ' + s.mean + ' 字/节');
  console.log('教材小节号 ' + (KEYS.length ? KEYS.join('、') : '（本章未声明）'));
  console.log('习题 ' + a.total + ' 题 (pre ' + a.stages.pre + '/check ' + a.stages.check + '/post ' + a.stages.post
    + ') · 解释 ' + a.minExplain + '-' + a.maxExplain + ' 汉字');
  console.log('接地 check 题 ' + a.hit + '/' + a.checkCount + '（正确选项含 >=6 汉字原文）');
  console.log('引书 ' + c.books + ' 部 · 引用 ' + c.total + ' 次' + (c.top.length ? ' · 前三：' + c.top.map(([n, k]) => n + '(' + k + ')').join('、') : ''));
  console.log('操作词命中：' + hands(list).map(([w, k]) => w + '×' + k).join('  '));
  console.log('带单位的数 ' + s.valueLike + ' 处 · 数字字符 ' + s.digits + ' 个');
  console.log('');
  for (const u of list) console.log('  ' + String(u.sub).padStart(2) + '. ' + u.title + '  ' + u.hanzi + ' 字');

  const ok = a.hanzi >= 2500 && a.secs >= 4 && a.total === 6
    && a.stages.pre === 1 && a.stages.check === 3 && a.stages.post === 2
    && a.hit === 3 && a.minExplain >= 40 && a.maxExplain <= 80;
  if (!ok) {
    console.error('自检未通过：' + JSON.stringify(a));
    process.exit(1);
  }
  console.log('※ 教学样例：数字由本章 docs/zh.md 与 quiz.json 现算，不构成对任何具体商品的质量判定或交易定价意见。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, DOC, QUIZ, WORDS, KEYS, load, chapterUnits, merge, rank,
  byBookSection, citations, shape, hands, sum, hz, grounded, why, audit, doc, quiz,
};
