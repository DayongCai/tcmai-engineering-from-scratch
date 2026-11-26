#!/usr/bin/env node
/**
 * 局部解剖学 · 第 1 章 局部解剖学教的不是缩小的人体，而是一条从皮肤走到骨的路线
 * 课程: departments/09-jichu/08-jubu-jiepou-xue/chapters/01-xulun/docs/zh.md
 * 依赖: 仅 Node.js 标准库；只读 ../docs/zh.md 与 ../quiz.json，不读 standards/。
 *
 * 本章代码把「习题是否与正文同源」算成可复算的数：正文汉字、二级节、题量与解释长度、
 * check 题接地数。接地数指 check 题的正确选项里，至少有一段 >=6 汉字的原文真的出现在
 * 当章正文里 —— 习题必须与正文同源，不能问正文里没有的名目。
 *
 * 另附本章的结构词命中（层次／浅筋膜／深筋膜／间隙）：一个局部章节讲不讲得动，看它有没有把
 * 层次、间隙、毗邻、血管神经这类可指认的结构词落到句子里。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SLUG = '01-xulun';
const CHAPTER = 1;
const DIR = __dirname;
const DOC = path.join(DIR, '..', 'docs', 'zh.md');
const QUIZ = path.join(DIR, '..', 'quiz.json');

const WORDS = ["层次","浅筋膜","深筋膜","间隙","通道","毗邻","标志","复核"];

const hz = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

function shingleSet(text, n) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const load = () => ({
  doc: fs.readFileSync(DOC, 'utf8'),
  quiz: JSON.parse(fs.readFileSync(QUIZ, 'utf8')),
});

const data = load();
const doc = data.doc;
const quiz = data.quiz;

/** 本章的小节键：二级标题里以汉字序号开头者的序号（一、二、…），用作跨章引用与检索的地址 */
function chapterKeys() {
  return chapterUnits()
    .filter((u) => u.sec && /^[一二三四五六七八九十]+、/.test(u.title))
    .map((u) => u.title.split('、')[0]);
}

/** 正文按二级标题切节：卷首算第 0 单元 */
function chapterUnits() {
  return doc
    .split(/\n(?=## )/)
    .map((blk, i) => {
      const isSec = /^## /.test(blk);
      const title = isSec ? (blk.match(/^## (.+)$/m) || [null, ''])[1].trim() : '卷首';
      return { sub: String(i + 1), title, sec: isSec, text: blk, hanzi: hz(blk) };
    });
}

function terms(text) {
  const out = {};
  for (const w of WORDS) {
    const n = String(text || '').split(w).length - 1;
    if (n) out[w] = n;
  }
  return out;
}

function summarize(units) {
  const hanzi = units.reduce((a, u) => a + u.hanzi, 0);
  const sized = doc.match(/\d+(?:\.\d+)?\s*(?:%|年|月|日|次|项|种|个|部|条|级|章|节|度|天|小时|分钟|厘米|毫米|寸|支|块|层)/g) || [];
  const term = {};
  for (const u of units) for (const [k, v] of Object.entries(terms(u.text))) term[k] = (term[k] || 0) + v;
  return {
    units: units.length,
    hanzi,
    mean: units.length ? Math.round(hanzi / units.length) : 0,
    valueLike: sized.length,
    digits: (doc.match(/\d/g) || []).length,
    term,
    top: Object.entries(term).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'))[0] || null,
  };
}

/* ---- 习题自检 ---- */

const N = 6;
const BODY = shingleSet(doc, N);

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
  const units = chapterUnits();
  const s = summarize(units);
  console.log('第 ' + CHAPTER + ' 章 · ' + quiz.title);
  console.log('正文 ' + a.hanzi + ' 汉字 · 二级节 ' + a.secs + ' · 平均 ' + s.mean + ' 字/节');
  console.log('小节键 ' + (chapterKeys().length ? chapterKeys().join('、') : '（本章未解析出）'));
  console.log('习题 ' + a.total + ' 题 (pre ' + a.stages.pre + '/check ' + a.stages.check + '/post ' + a.stages.post
    + ') · 解释 ' + a.minExplain + '-' + a.maxExplain + ' 汉字');
  console.log('接地 check 题 ' + a.hit + '/' + a.checkCount + '（正确选项含 >=6 汉字原文）');
  console.log('结构词命中：' + Object.entries(s.term).sort((x, y) => y[1] - x[1]).map(([w, k]) => w + '×' + k).join('  '));
  console.log('带单位的数 ' + s.valueLike + ' 处 · 数字字符 ' + s.digits + ' 个');
  console.log('');
  for (const u of units) console.log('  ' + String(u.sub).padStart(2) + '. ' + u.title + '  ' + u.hanzi + ' 字');

  const ok = a.hanzi >= 2500 && a.secs >= 4 && a.total === 6
    && a.stages.pre === 1 && a.stages.check === 3 && a.stages.post === 2
    && a.hit === 3 && a.minExplain >= 40 && a.maxExplain <= 80;
  if (!ok) {
    console.error('自检未通过：' + JSON.stringify(a));
    process.exit(1);
  }
  console.log('※ 教学样例：数字由本章 docs/zh.md 与 quiz.json 现算，不构成临床判断依据，不能替代医师面诊。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, DOC, QUIZ, WORDS, load, chapterKeys, chapterUnits, summarize, terms,
  hz, grounded, why, audit, doc, quiz,
};
