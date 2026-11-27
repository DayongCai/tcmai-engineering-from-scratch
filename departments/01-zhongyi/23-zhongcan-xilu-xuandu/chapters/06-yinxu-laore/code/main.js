'use strict';
/**
 * 第 6 章 · 资生汤与十全育真汤：不是轻重两档，是「纳」与「瘀」两条路
 *
 *   node code/main.js
 *
 * 读 docs/zh.md 与 standards/zhongcan-xilu/units.json，现算：
 *   · 治阴虚劳热方共几首（数单元，不读正文的结论）
 *   · 资生汤、十全育真汤、醴泉饮三方各几味，与正文写的数对齐
 *   · 方下组成里有没有正文点出的那几味（鸡内金、三棱、莪术、赭石）
 *   · 正文引文是否逐字落在所标单元；quiz 的结构与接地
 *
 * 边界：方证结构的文本核对；剂量为清末衡制，本脚本不换算，不给治疗方案。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const UNITS = path.join(ROOT, 'standards/zhongcan-xilu/units.json');

const CHAPTER = 6;
const SLUG = '06-yinxu-laore';
const TITLE = '资生汤与十全育真汤：不是轻重两档，是「纳」与「瘀」两条路';

const U = JSON.parse(fs.readFileSync(UNITS, 'utf8'));
const ALL = U.units;
const BY_LOC = new Map(ALL.map((u) => [u.locator, u]));
const DOC_TEXT = fs.readFileSync(DOC, 'utf8');
const QUIZ_JSON = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;
const norm = (s) => String(s || '').replace(/[^\u4e00-\u9fff]/g, '');

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
    });
  }
  return out;
}

/* ── 本章的现算项 ───────────────────────────────────────────────── */

const SERIES = ALL.filter((u) => u.locator.includes('治阴虚劳热方'));

/** 方下组成行：药名（剂量）连写，取第一行满足两味以上的 */
function composition(title) {
  const unit = SERIES.find((u) => u.title.includes(title));
  if (!unit) return { title, herbs: [], hanzi: 0, locus: '缺单元' };
  const line = unit.body.split('\n').find((l) => (l.match(/（[^）]*[钱两分斤]/g) || []).length >= 2) || '';
  const herbs = [...line.matchAll(/([\u4e00-\u9fff]{2,4})（/g)].map((m) => m[1]);
  return { title: unit.title, herbs, hanzi: unit.hanzi, line };
}

function facts() {
  const rows = [];
  const seriesDoc = DOC_TEXT.match(/治阴虚劳热方共([一二三四五六七八九十]+)首/);
  rows.push({ label: '治阴虚劳热方首数', got: SERIES.length, want: seriesDoc ? cn2num(seriesDoc[1]) : null });

  const want = (re) => {
    const m = DOC_TEXT.match(re);
    return m ? cn2num(m[1]) : null;
  };
  const zisheng = composition('资生汤');
  const shiquan = composition('十全育真汤');
  const liquan = composition('醴泉饮');
  rows.push({ label: '资生汤药味', got: zisheng.herbs.length, want: want(/方只有([一二三四五六七八九十]+)味/) });
  rows.push({ label: '十全育真汤十味', got: shiquan.herbs.length, want: want(/十全育真汤([一二三四五六七八九十]+)味/) });
  rows.push({ label: '醴泉饮药味', got: liquan.herbs.length, want: want(/([一二三四五六七八九十]+)味：生山药/) });
  return rows.map((r) => ({ ...r, ok: r.want !== null && r.got === r.want }));
}

function markers() {
  const find = (t) => SERIES.find((u) => u.title.includes(t));
  const rows = [
    { label: '资生汤：不可挪移之品', term: '不可挪移之品', unit: find('资生汤') },
    { label: '资生汤：二阳之病发心脾', term: '仍当遵二阳之病发心脾', unit: find('资生汤') },
    { label: '资生汤：胃化食赖有酸汁', term: '酸汁', unit: find('资生汤') },
    { label: '十全育真汤：肌肤甲错', term: '肌肤甲错', unit: find('十全育真汤') },
    { label: '十全育真汤：行补药之滞', term: '行补药之滞', unit: find('十全育真汤') },
    { label: '醴泉饮：宜减赭石', term: '宜减赭石', unit: find('醴泉饮') },
    { label: '醴泉饮：下行直至涌泉', term: '涌泉', unit: find('醴泉饮') },
  ];
  return rows.map((r) => ({ ...r, hit: Boolean(r.unit) && r.unit.body.includes(r.term), where: r.unit ? r.unit.title : '缺单元' }));
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
    series: SERIES.length,
    facts: facts(),
    compositions: [composition('资生汤'), composition('十全育真汤'), composition('醴泉饮')],
    markers: markers(),
    quotes: q,
    quoteMiss: q.filter((x) => !x.hit),
    quiz: quizAudit(),
  };
}

module.exports = { U, ALL, BY_LOC, CHAPTER, SLUG, TITLE, DOC_TEXT, QUIZ_JSON, hanzi, norm, cn2num, shingles, quotes, composition, facts, markers, quizAudit, analyze };

if (require.main === module) {
  const r = analyze();
  console.log('');
  console.log('═══ 第 6 章 · ' + TITLE + ' ═══');
  console.log('\n── 正文的数与原文现算 ──');
  for (const f of r.facts) console.log('  ' + (f.ok ? '✓' : '✗') + ' ' + f.label + '  现算 ' + f.got + ' · 正文 ' + f.want);
  console.log('\n── 三方组成 ──');
  for (const c of r.compositions) console.log('  ' + c.title + '（' + c.herbs.length + ' 味）' + c.herbs.join('、'));
  console.log('\n── 读法的原话 ──');
  for (const m of r.markers) console.log('  ' + (m.hit ? '✓' : '✗') + ' ' + m.label + '（' + m.where + '）');
  console.log('\n── 引文回查 ──');
  for (const q of r.quotes) console.log('  ' + (q.hit ? '✓' : '✗') + ' ' + q.text.slice(0, 22) + '…');
  console.log('\n── 习题 ──');
  console.log('  ' + r.quiz.count + ' 题 · 段 ' + r.quiz.stages.join('/') + ' · 接地 check ' + r.quiz.groundedCheck + ' 道 · 正确项 ' + r.quiz.spread + ' 种');
  console.log('\n  边界：方证结构的文本核对；剂量为清末衡制，不换算、不给治疗方案。');
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
