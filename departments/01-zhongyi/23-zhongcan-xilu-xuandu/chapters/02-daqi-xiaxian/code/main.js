'use strict';
/**
 * 第 2 章 · 大气下陷：先有临床，后有名字
 *
 *   node code/main.js
 *
 * 读 docs/zh.md 与 standards/zhongcan-xilu/units.json，现算并互相核对：
 *   · 治大气下陷方四首（units.json 里（三）治大气下陷方 的单元数）
 *   · 176 个医方里含生箭耆 / 升麻 / 桔梗各几条
 *   · 137 个医案、气病门 9 案；前 5 案立本证、后 4 案排近邻的编排
 *   · 全书正文提到「大气下陷」的单元数
 *   · 正文引文是否逐字落在所标单元；quiz 的结构与接地
 *
 * 口径：药名与条目数都按单元 body 字面计数，不做同义合并，是文本统计。
 * 正文「8 个单元标题带这四个字」一句，与 units.json 的标题口径不一致
 * （标题含「大气下陷」者为 4 个，含「大气」者 6 个），本脚本不把这一句当作断言。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const UNITS = path.join(ROOT, 'standards/zhongcan-xilu/units.json');

const CHAPTER = 2;
const SLUG = '02-daqi-xiaxian';
const TITLE = '大气下陷：先有临床，后有名字';

const U = JSON.parse(fs.readFileSync(UNITS, 'utf8'));
const ALL = U.units;
const BY_LOC = new Map(ALL.map((u) => [u.locator, u]));
const DOC_TEXT = fs.readFileSync(DOC, 'utf8');
const QUIZ_JSON = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;
const norm = (s) => String(s || '').replace(/[^\u4e00-\u9fff]/g, '');
const count = (text, term) => String(text).split(term).length - 1;

const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
function cn2num(s) {
  if (s === '十') return 10;
  const i = s.indexOf('十');
  if (i === -1) return CN[s] === undefined ? null : CN[s];
  const tens = i === 0 ? 1 : CN[s[0]];
  const ones = s.length > i + 1 ? CN[s[i + 1]] : 0;
  return tens * 10 + ones;
}

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]+/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}
const DOC_GRAMS = shingles(DOC_TEXT);

function quotes() {
  const lines = DOC_TEXT.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^>/.test(lines[i])) continue;
    const buf = [];
    while (i < lines.length && /^>/.test(lines[i])) {
      buf.push(lines[i].replace(/^>\s?/, ''));
      i += 1;
    }
    i -= 1;
    const m = buf.join('').match(/「(.+?)」\s*——《([^》]+)》/);
    if (!m) continue;
    const unit = BY_LOC.get(m[2]);
    out.push({
      text: m[1],
      locator: m[2],
      unit: unit ? unit.title : null,
      hanzi: hanzi(m[1]),
      hit: Boolean(unit) && norm(unit.body).includes(norm(m[1])),
      why: !unit ? 'units.json 里没有这个 locator' : norm(unit.body).includes(norm(m[1])) ? '逐字命中' : '所标单元里查不到这段字',
    });
  }
  return out;
}

/* ── 本章的现算项 ───────────────────────────────────────────────── */

const MED = ALL.filter((u) => u.sec === '一、医方');
const CASES = ALL.filter((u) => u.sec === '五、医案');
const QIBING = CASES.filter((u) => u.locator.includes('气病门'));
const SIXI = ALL.filter((u) => u.locator.includes('治大气下陷方'));
const withHerb = (term) => MED.filter((u) => u.body.includes(term)).length;

function fact(label, re, got) {
  const m = DOC_TEXT.match(re);
  const want = m ? (m[1] === undefined ? 0 : /^[一二三四五六七八九十]+$/.test(m[1]) ? cn2num(m[1]) : Number(m[1].replace(/,/g, ''))) : null;
  return { label, got, want, ok: want !== null && got === want };
}

function facts() {
  return [
    fact('治大气下陷方首数', /治大气下陷方共([一二三四五六七八九十]+)首/, SIXI.length),
    fact('医方条目数', /本仓\s*(\d+)\s*个医方条目里/, MED.length),
    fact('含生箭耆的医方', /含「生箭耆」的\s*(\d+)\s*条/, withHerb('生箭耆')),
    fact('含升麻的医方', /含「升麻」的\s*(\d+)\s*条/, withHerb('升麻')),
    fact('含桔梗的医方', /含「桔梗」的只有\s*(\d+)\s*条/, withHerb('桔梗')),
    fact('医案总数', /本仓医案共\s*(\d+)\s*案/, CASES.length),
    fact('气病门案数', /气病门\s*(\d+)\s*案/, QIBING.length),
    fact('正文提到大气下陷的单元', /(\d+)\s*个单元正文提到「大气下陷」/, ALL.filter((u) => u.body.includes('大气下陷')).length),
  ].map((f) => ({ ...f, ok: f.want !== null && f.got === f.want }));
}

/** 气病门的编排：前 5 案立本证，后 4 案排最容易混的近邻 */
function arrangement() {
  const titles = QIBING.map((u) => u.title);
  return {
    titles,
    head: titles.slice(0, 5),
    tail: titles.slice(5),
    headOk: titles.slice(0, 5).every((t) => t.includes('大气')),
    tailOk: titles.slice(5).every((t) => !t.includes('大气')),
  };
}

/** 升陷汤的方下组成：生箭耆、知母、柴胡、桔梗、升麻 */
function sixiComposition() {
  const unit = SIXI.find((u) => u.title.includes('升陷汤'));
  const line = unit ? unit.body.split('\n').find((l) => (l.match(/（[^）]*[钱两分]/g) || []).length >= 2) || '' : '';
  const herbs = [...line.matchAll(/([\u4e00-\u9fff]{2,4})（/g)].map((m) => m[1]);
  return { line, herbs, has: ['生箭耆', '知母', '柴胡', '桔梗', '升麻'].every((h) => herbs.includes(h)) };
}

/* ── quiz ─────────────────────────────────────────────────────────── */

function quizAudit() {
  const qs = Array.isArray(QUIZ_JSON.questions) ? QUIZ_JSON.questions : [];
  const items = qs.map((q, i) => {
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    return {
      n: i + 1,
      stage: q.stage,
      options: opts.length,
      correctOk: Number.isInteger(q.correct) && q.correct >= 0 && q.correct < opts.length,
      explainHanzi: hanzi(q.explain),
      grounded: [...shingles(right)].some((g) => DOC_GRAMS.has(g)),
      right,
    };
  });
  const stages = new Set(items.map((x) => x.stage));
  return {
    count: items.length,
    items,
    stages: [...stages].sort(),
    stageOk: ['pre', 'check', 'post'].every((s) => stages.has(s)),
    optionOk: items.every((x) => x.options === 4),
    correctOk: items.every((x) => x.correctOk),
    explainOk: items.every((x) => x.explainHanzi >= 30),
    groundedCheck: items.filter((x) => x.stage === 'check' && x.grounded).length,
    spread: new Set(items.map((x) => x.right)).size,
  };
}

function analyze() {
  const q = quotes();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    total: ALL.length,
    facts: facts(),
    arrangement: arrangement(),
    composition: sixiComposition(),
    quotes: q,
    quoteMiss: q.filter((x) => !x.hit),
    quiz: quizAudit(),
  };
}

module.exports = { U, ALL, BY_LOC, CHAPTER, SLUG, TITLE, DOC_TEXT, QUIZ_JSON, hanzi, norm, count, cn2num, shingles, quotes, facts, arrangement, sixiComposition, quizAudit, analyze };

if (require.main === module) {
  const r = analyze();
  console.log('');
  console.log('═══ 第 2 章 · ' + TITLE + ' ═══');
  console.log('  单元 ' + r.total + ' · 引文 ' + r.quotes.length + ' 条（未命中 ' + r.quoteMiss.length + '）');
  console.log('\n── 正文的数与原文现算 ──');
  for (const f of r.facts) console.log('  ' + (f.ok ? '✓' : '✗') + ' ' + f.label + '  现算 ' + f.got + ' · 正文 ' + f.want);
  console.log('\n── 升陷汤方下组成 ──');
  console.log('  ' + (r.composition.has ? '✓' : '✗') + ' ' + r.composition.herbs.join('、'));
  console.log('\n── 气病门编排 ──');
  r.arrangement.titles.forEach((t, i) => console.log('  ' + (i + 1) + '. ' + t));
  console.log('  前五案立本证 ' + (r.arrangement.headOk ? '✓' : '✗') + ' · 后四案排近邻 ' + (r.arrangement.tailOk ? '✓' : '✗'));
  console.log('\n── 引文回查 ──');
  for (const q of r.quotes) console.log('  ' + (q.hit ? '✓' : '✗') + ' ' + q.text.slice(0, 20) + '…');
  console.log('\n── 习题 ──');
  console.log('  ' + r.quiz.count + ' 题 · 段 ' + r.quiz.stages.join('/') + ' · 接地 check ' + r.quiz.groundedCheck + ' 道 · 正确项 ' + r.quiz.spread + ' 种');
  console.log('\n  边界：药名与条目数是文本统计；剂量为清末衡制，本脚本不换算。');
  console.log('');
}
