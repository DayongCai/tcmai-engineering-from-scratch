'use strict';
/**
 * 第 1 章 · 书名不是纲领：「衷中参西」是一次排序，不是一次合并
 *
 *   node code/main.js
 *
 * 三份材料互相咬合，任何一份改动都会在这里露出来：
 *   docs/zh.md                       本章正文（本脚本逐行读它，不读别的）
 *   quiz.json                        本章习题（结构、接地、答案分布）
 *   standards/zhongcan-xilu/units.json  原文 534 单元（引文逐条回查）
 *
 * 现算的东西：
 *   · 五类单元数与合计，与正文表里写的数逐个对齐
 *   · 正文里带出处的引文，是否逐字落在所标的那一个单元里
 *   · 「阿司匹林」在原文里的出现次数（原文写作「阿斯匹林」）
 *   · 序跋在本书里是否真的缺失
 *   · quiz 的五段结构、解释长度、正确项能否在正文找到原词
 *
 * 边界：本脚本只做文本核对，不换算剂量，不评价疗效。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const UNITS = path.join(ROOT, 'standards/zhongcan-xilu/units.json');

const CHAPTER = 1;
const SLUG = '01-quanshu-dufa';
const TITLE = '书名不是纲领：「衷中参西」是一次排序，不是一次合并';

const U = JSON.parse(fs.readFileSync(UNITS, 'utf8'));
const ALL = U.units;
const BY_LOC = new Map(ALL.map((u) => [u.locator, u]));
const DOC_TEXT = fs.readFileSync(DOC, 'utf8');
const QUIZ_JSON = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;
const norm = (s) => String(s || '').replace(/[^\u4e00-\u9fff]/g, '');
const count = (text, term) => String(text).split(term).length - 1;

/** 正文里 4 字以上的连续汉字片段，用于判断一条说法能不能在正文找到原词 */
function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]+/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}
const DOC_GRAMS = shingles(DOC_TEXT);

/* ── 引文回查 ─────────────────────────────────────────────────────── */

/**
 * 正文的引文写在引用块里，块末带出处：> 「……」——《医学衷中参西录·大类·篇·条目》
 * 连续多行引用块先拼成一块，再取「」与《》配对。原文的「」会切断汉字串，
 * 所以比对时只留汉字。
 */
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
    const block = buf.join('');
    const m = block.match(/「(.+?)」\s*——《([^》]+)》/);
    if (!m) continue;
    const locator = m[2];
    const unit = BY_LOC.get(locator);
    out.push({
      text: m[1],
      locator,
      unit: unit ? unit.title : null,
      hanzi: hanzi(m[1]),
      hit: Boolean(unit) && norm(unit.body).includes(norm(m[1])),
      why: unit ? (norm(unit.body).includes(norm(m[1])) ? '逐字命中' : '所标单元里查不到这段字') : 'units.json 里没有这个 locator',
    });
  }
  return out;
}

/* ── 正文写的数，和原文现算的数 ─────────────────────────────────── */

const bySec = {};
for (const u of ALL) bySec[u.sec] = (bySec[u.sec] || 0) + 1;

/** 正文那张五类表：| 一、医方 | 176 | …… | */
function docTable() {
  const rows = [];
  for (const line of DOC_TEXT.split(/\r?\n/)) {
    const m = line.match(/^\|\s*([一二三四五六]、[^|]+?)\s*\|\s*([\d,]+)\s*\|/);
    if (m) rows.push({ sec: m[1].trim(), count: Number(m[2].replace(/,/g, '')) });
  }
  return rows;
}

function fact(label, re, got) {
  const m = DOC_TEXT.match(re);
  // 没有捕获组的写法（如「找不到一篇自序」）表示正文断言这一项为零
  const want = m ? (m[1] === undefined ? 0 : Number(m[1].replace(/,/g, ''))) : null;
  return { label, got, want, ok: want !== null && got === want };
}

function facts() {
  const list = [];
  const total = DOC_TEXT.match(/共\s*([\d,]+)\s*单元/);
  list.push({ label: '单元总数', got: ALL.length, want: total ? Number(total[1].replace(/,/g, '')) : null });
  for (const r of docTable()) list.push({ label: r.sec, got: bySec[r.sec] || 0, want: r.count });
  list.push(fact('阿司匹林出现处数', /阿司匹林出现在\s*([\d,]+)\s*处/, count(ALL.map((u) => u.body).join(''), '阿斯匹林')));
  list.push(fact('自序篇数', /找不到一篇「自序」/, ALL.filter((u) => u.body.includes('自序') || u.title.includes('自序')).length));
  for (const f of list) f.ok = f.want !== null && f.got === f.want;
  return list;
}

/* ── quiz ─────────────────────────────────────────────────────────── */

function quizAudit() {
  const qs = Array.isArray(QUIZ_JSON.questions) ? QUIZ_JSON.questions : [];
  const items = qs.map((q, i) => {
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    const grounded = [...shingles(right)].some((g) => DOC_GRAMS.has(g));
    return {
      n: i + 1,
      stage: q.stage,
      options: opts.length,
      correctOk: Number.isInteger(q.correct) && q.correct >= 0 && q.correct < opts.length,
      explainHanzi: hanzi(q.explain),
      grounded,
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

/* ── 汇总 ─────────────────────────────────────────────────────────── */

function analyze() {
  const q = quotes();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    segments: bySec,
    total: ALL.length,
    facts: facts(),
    quotes: q,
    quoteMiss: q.filter((x) => !x.hit),
    quiz: quizAudit(),
  };
}

module.exports = { U, ALL, BY_LOC, CHAPTER, SLUG, TITLE, DOC_TEXT, QUIZ_JSON, hanzi, norm, count, shingles, quotes, facts, quizAudit, analyze };

if (require.main === module) {
  const r = analyze();
  console.log('');
  console.log('═══ 第 1 章 · ' + TITLE + ' ═══');
  console.log('  单元 ' + r.total + ' · 引文 ' + r.quotes.length + ' 条（未命中 ' + r.quoteMiss.length + '）');
  console.log('\n── 五类与正文表对读 ──');
  for (const f of r.facts) console.log('  ' + (f.ok ? '✓' : '✗') + ' ' + f.label + '  现算 ' + f.got + ' · 正文 ' + f.want);
  console.log('\n── 引文回查 ──');
  for (const q of r.quotes) console.log('  ' + (q.hit ? '✓' : '✗') + ' ' + q.locator.split('·').slice(1).join('·') + '｜' + q.text.slice(0, 18) + '…');
  const z = r.quiz;
  console.log('\n── 习题 ──');
  console.log('  ' + z.count + ' 题 · 段 ' + z.stages.join('/') + ' · 4 选项 ' + (z.optionOk ? '齐' : '缺') + ' · 解释≥30字 ' + (z.explainOk ? '齐' : '缺'));
  console.log('  接地 check 题 ' + z.groundedCheck + ' 道 · 正确项分布 ' + z.spread + ' 种');
  console.log('\n  边界：只做文本核对，不换算剂量，不评价疗效。');
  console.log('');
}
