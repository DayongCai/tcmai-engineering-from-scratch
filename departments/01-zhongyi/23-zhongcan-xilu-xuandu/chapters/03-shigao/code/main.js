'use strict';
/**
 * 第 3 章 · 石膏：被误读的不是剂量，是三个动作
 *
 *   node code/main.js
 *
 * 读 docs/zh.md 与 standards/zhongcan-xilu/units.json，现算：
 *   · 176 个医方条目中含生石膏者几条（与正文的数对齐）
 *   · 石膏解是不是全书写得最长的一篇药解（按单元汉字数排序）
 *   · 「生用、分服、热退不必尽剂、煅者外用」这四个动作，在原文里各有原话可查
 *   · 正文引文是否逐字落在所标单元；quiz 的结构与接地
 *
 * 边界：本章只判别「解释层」与「操作层」，不换算剂量，不给用量建议。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const UNITS = path.join(ROOT, 'standards/zhongcan-xilu/units.json');

const CHAPTER = 3;
const SLUG = '03-shigao';
const TITLE = '石膏：被误读的不是剂量，是三个动作';

const U = JSON.parse(fs.readFileSync(UNITS, 'utf8'));
const ALL = U.units;
const BY_LOC = new Map(ALL.map((u) => [u.locator, u]));
const DOC_TEXT = fs.readFileSync(DOC, 'utf8');
const QUIZ_JSON = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;
const norm = (s) => String(s || '').replace(/[^\u4e00-\u9fff]/g, '');

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
    });
  }
  return out;
}

/* ── 本章的现算项 ───────────────────────────────────────────────── */

const MED = ALL.filter((u) => u.sec === '一、医方');
const YAO = ALL.filter((u) => u.sec === '二、药物');
const SHIGAO = YAO.find((u) => u.title.includes('石膏解'));
const XIANLU = MED.find((u) => u.title.includes('仙露汤'));

function fact(label, re, got) {
  const m = DOC_TEXT.match(re);
  const want = m ? Number(m[1].replace(/,/g, '')) : null;
  return { label, got, want, ok: want !== null && got === want };
}

function facts() {
  return [
    fact('医方条目数', /(\d+)\s*个医方条目中，含生石膏者/, MED.length),
    fact('含生石膏的医方', /含生石膏者\s*(\d+)\s*条/, MED.filter((u) => u.body.includes('生石膏')).length),
  ].map((f) => ({ ...f, ok: f.want !== null && f.got === f.want }));
}

/** 最长的一篇药解 —— 正文说「石膏解是全书写得最长的一篇药解」 */
function longestYao() {
  const sorted = [...YAO].sort((a, b) => b.hanzi - a.hanzi);
  return { top: sorted[0].title, hanzi: sorted[0].hanzi, second: sorted[1].title, secondHanzi: sorted[1].hanzi };
}

/**
 * 三个动作各有原话：生用与鉴别、分服、热退即止；再加煅者外用的边界。
 * 每一条都指到具体单元与具体字串，正文与原文任一改动都会失配。
 */
function markers() {
  const rows = [
    { label: '生用鉴别：倾之不出', term: '倾之不出', unit: SHIGAO },
    { label: '分服：分四五次', term: '分四五次', unit: SHIGAO },
    { label: '热退不必尽剂', term: '热退不必尽剂', unit: SHIGAO },
    { label: '煅者只可外用：敷金疮出血', term: '敷金疮出血', unit: SHIGAO },
    { label: '反面：慎勿顿服', term: '慎勿顿服', unit: XIANLU },
    { label: '反面：徐徐饮下', term: '徐徐饮下', unit: XIANLU },
  ];
  return rows.map((r) => ({ ...r, hit: Boolean(r.unit) && r.unit.body.includes(r.term), where: r.unit ? r.unit.title : '缺单元' }));
}

/** 「煅」在石膏解里出现多少次 —— 这一篇的靶子是煅，不是少 */
function duan() {
  return { times: SHIGAO ? SHIGAO.body.split('煅').length - 1 : 0, hanzi: SHIGAO ? SHIGAO.hanzi : 0 };
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
    longest: longestYao(),
    markers: markers(),
    duan: duan(),
    quotes: q,
    quoteMiss: q.filter((x) => !x.hit),
    quiz: quizAudit(),
  };
}

module.exports = { U, ALL, BY_LOC, CHAPTER, SLUG, TITLE, DOC_TEXT, QUIZ_JSON, hanzi, norm, shingles, quotes, facts, longestYao, markers, duan, quizAudit, analyze };

if (require.main === module) {
  const r = analyze();
  console.log('');
  console.log('═══ 第 3 章 · ' + TITLE + ' ═══');
  console.log('  单元 ' + r.total + ' ｜ 石膏解 ' + r.duan.hanzi + ' 字，「煅」出现 ' + r.duan.times + ' 次');
  console.log('\n── 正文的数与原文现算 ──');
  for (const f of r.facts) console.log('  ' + (f.ok ? '✓' : '✗') + ' ' + f.label + '  现算 ' + f.got + ' · 正文 ' + f.want);
  console.log('\n── 最长药解 ──');
  console.log('  ' + r.longest.top + ' ' + r.longest.hanzi + ' 字 · 次长 ' + r.longest.second + ' ' + r.longest.secondHanzi + ' 字');
  console.log('\n── 三个动作的原话 ──');
  for (const m of r.markers) console.log('  ' + (m.hit ? '✓' : '✗') + ' ' + m.label + '（' + m.where + '）');
  console.log('\n── 引文回查 ──');
  for (const q of r.quotes) console.log('  ' + (q.hit ? '✓' : '✗') + ' ' + q.text.slice(0, 22) + '…');
  console.log('\n── 习题 ──');
  console.log('  ' + r.quiz.count + ' 题 · 段 ' + r.quiz.stages.join('/') + ' · 接地 check ' + r.quiz.groundedCheck + ' 道 · 正确项 ' + r.quiz.spread + ' 种');
  console.log('\n  边界：只判别解释层与操作层，不换算剂量，不给用量建议。');
  console.log('');
}
