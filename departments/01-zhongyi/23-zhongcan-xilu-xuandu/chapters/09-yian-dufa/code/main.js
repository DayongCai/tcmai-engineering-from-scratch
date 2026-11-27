'use strict';
/**
 * 第 9 章 · 医案的五段式：一张能被反驳的表
 *
 *   node code/main.js
 *
 * 读 docs/zh.md 与 standards/zhongcan-xilu/units.json，现算：
 *   · 137 个医案单元里，每个字段（以行首标签为准）各出现在几案
 *   · 五段齐全的案数、缺「诊断」的案数
 *   · 正文表格里写的十个数，是否与现算逐个相等
 *   · 病因、诊断、方解、或问各自的原话样本
 *   · 正文引文是否逐字落在所标单元；quiz 的结构与接地
 *
 * 口径：字段以行首标签计（如行首「诊断」）；把诊断并入证候段的案不计入「诊断」，
 * 这不等于它们没有诊断。剂量为清末衡制，不换算。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const UNITS = path.join(ROOT, 'standards/zhongcan-xilu/units.json');

const CHAPTER = 9;
const SLUG = '09-yian-dufa';
const TITLE = '医案的五段式：一张能被反驳的表';

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

const KEYS = ['病因', '证候', '诊断', '处方', '效果', '方解', '复诊', '三诊', '说明', '或问'];
const CASES = ALL.filter((u) => u.sec === '五、医案');

const hasField = (u, k) => u.body.split(/\n/).some((l) => l.trim().startsWith(k));

function fieldCounts() {
  const out = {};
  for (const k of KEYS) out[k] = CASES.filter((u) => hasField(u, k)).length;
  return out;
}

/** 正文那张字段表：| 病因 | 136 | 机制输入 | */
function docTable() {
  const rows = {};
  for (const line of DOC_TEXT.split(/\r?\n/)) {
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    if (KEYS.includes(cells[0]) && /^\d+$/.test(cells[1])) rows[cells[0]] = Number(cells[1]);
  }
  return rows;
}

function facts() {
  const got = fieldCounts();
  const want = docTable();
  const rows = KEYS.filter((k) => want[k] !== undefined).map((k) => ({
    label: k,
    got: got[k],
    want: want[k],
    ok: got[k] === want[k],
  }));
  const caseDoc = DOC_TEXT.match(/(\d+)\s*则医案/);
  rows.unshift({ label: '医案总数', got: CASES.length, want: caseDoc ? Number(caseDoc[1]) : null });
  rows.forEach((r) => { r.ok = r.want !== null && r.got === r.want; });
  return rows;
}

/** 五段齐全 = 病因、证候、诊断、处方、效果 五个行首标签都在 */
function fiveStage() {
  const five = ['病因', '证候', '诊断', '处方', '效果'];
  const complete = CASES.filter((u) => five.every((k) => hasField(u, k))).length;
  const doc = DOC_TEXT.match(/(\d+)\s*案五段齐全/);
  const missing = CASES.length - fieldCounts()['诊断'];
  const docMissing = DOC_TEXT.match(/缺「诊断」的\s*(\d+)\s*案/);
  return {
    complete,
    want: doc ? Number(doc[1]) : null,
    ok: doc ? complete === Number(doc[1]) : false,
    missingDiagnosis: missing,
    wantMissing: docMissing ? Number(docMissing[1]) : null,
    missingOk: docMissing ? missing === Number(docMissing[1]) : false,
  };
}

function markers() {
  const rows = [
    { label: '病因：枵腹奔走七八里', term: '枵腹奔走七八里' },
    { label: '诊断：此胸中大气下陷', term: '此胸中大气下陷' },
    { label: '处方：分三次温饮下', term: '分三次温饮下', min: 2 },
    { label: '处方：先服第一方', term: '先服第一方' },
    { label: '方解：若囫囵入煎', term: '若囫囵入煎' },
    { label: '或问：如人欲登高山', term: '如人欲登高山' },
  ];
  return rows.map((r) => {
    const hits = CASES.filter((u) => u.body.includes(r.term));
    return { ...r, cases: hits.length, hit: hits.length >= (r.min || 1) };
  });
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
    cases: CASES.length,
    fields: fieldCounts(),
    facts: facts(),
    five: fiveStage(),
    markers: markers(),
    quotes: q,
    quoteMiss: q.filter((x) => !x.hit),
    quiz: quizAudit(),
  };
}

module.exports = { U, ALL, BY_LOC, CHAPTER, SLUG, TITLE, DOC_TEXT, QUIZ_JSON, KEYS, CASES, hanzi, norm, shingles, quotes, fieldCounts, facts, fiveStage, markers, quizAudit, analyze };

if (require.main === module) {
  const r = analyze();
  console.log('');
  console.log('═══ 第 9 章 · ' + TITLE + ' ═══');
  console.log('  医案 ' + r.cases + ' 案 · 五段齐全 ' + r.five.complete + ' 案 · 缺诊断 ' + r.five.missingDiagnosis + ' 案');
  console.log('\n── 字段表与原文现算 ──');
  for (const f of r.facts) console.log('  ' + (f.ok ? '✓' : '✗') + ' ' + f.label + '  现算 ' + f.got + ' · 正文 ' + f.want);
  console.log('\n── 第二层字段的原话 ──');
  for (const m of r.markers) console.log('  ' + (m.hit ? '✓' : '✗') + ' ' + m.label);
  console.log('\n── 引文回查 ──');
  for (const q of r.quotes) console.log('  ' + (q.hit ? '✓' : '✗') + ' ' + q.text.slice(0, 22) + '…');
  console.log('\n── 习题 ──');
  console.log('  ' + r.quiz.count + ' 题 · 段 ' + r.quiz.stages.join('/') + ' · 接地 check ' + r.quiz.groundedCheck + ' 道 · 正确项 ' + r.quiz.spread + ' 种');
  console.log('\n  边界：字段以行首标签计；个案不推疗效；剂量不换算。');
  console.log('');
}

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
