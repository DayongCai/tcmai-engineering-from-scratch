'use strict';
/**
 * 第 10 章 · 参西的边界：能借病名与验证，不能借解释与因果
 *
 *   node code/main.js
 *
 * 读 docs/zh.md 与 standards/zhongcan-xilu/units.json，现算：
 *   · 正文词频表里的每一个数（西人、西医、阿司匹林、毒菌、血压、汞柱、剖解、剖验、化学、脑筋、氧气）
 *   · 阿司匹林在原文写作「阿斯匹林」，计数时按正字法映射，不改原文
 *   · 「二说可沟通」一段与「黄耆八钱」一段的原话位置
 *   · 正文引文是否逐字落在所标单元；quiz 的结构与接地
 *
 * 边界：字面计数，未做同义合并；不作「参西段落数」估计，不评价中西医任何一方。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const UNITS = path.join(ROOT, 'standards/zhongcan-xilu/units.json');

const CHAPTER = 10;
const SLUG = '10-canxi-bianjie';
const TITLE = '参西的边界：能借病名与验证，不能借解释与因果';

const U = JSON.parse(fs.readFileSync(UNITS, 'utf8'));
const ALL = U.units;
const BY_LOC = new Map(ALL.map((u) => [u.locator, u]));
const DOC_TEXT = fs.readFileSync(DOC, 'utf8');
const QUIZ_JSON = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;
const norm = (s) => String(s || '').replace(/[^\u4e00-\u9fff]/g, '');
const count = (text, term) => String(text).split(term).length - 1;

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

const ALL_TEXT = ALL.map((u) => u.body).join('\n');

/** 原文的正字法与正文写法不同时，逐条写死，不做模糊匹配 */
const ALIAS = { 阿司匹林: '阿斯匹林' };

/** 正文词频段：「西人」107、「西医」44…… */
function docFreq() {
  const line = DOC_TEXT.split(/\r?\n/).find((l) => l.includes('「西人」') && /\d/.test(l));
  if (!line) return [];
  return [...line.matchAll(/「([^」]+)」(\d+)/g)].map((m) => ({
    term: m[1],
    want: Number(m[2]),
    got: count(ALL_TEXT, ALIAS[m[1]] || m[1]),
  })).map((r) => ({ ...r, ok: r.got === r.want }));
}

/**
 * 器械读数落在哪些单元。
 * 注：正文说「血压」「汞柱」都在王姓叟那一案里；按 units.json 现查，
 * 「汞柱」2 处确在《论脑充血证可预防》的王姓叟案内，而「血压」1 处落在
 * 镇肝熄风汤的主治语里（「即西医所谓血压过高」）。本脚本按现查结果报落点。
 */
function scene() {
  const where = (term) => ALL.filter((u) => u.body.includes(term)).map((u) => u.title);
  const mercury = where('汞柱');
  const pressure = where('血压');
  return {
    mercury,
    pressure,
    mercuryInCase: mercury.length === 1 && mercury[0].includes('论脑充血证可预防'),
    pressureOnce: pressure.length === 1,
  };
}

function markers() {
  const u73 = ALL.find((u) => u.locator.includes('三、医论·73'));
  const u60 = ALL.find((u) => u.locator.includes('三、医论·60'));
  const zhengan = ALL.find((u) => u.title.includes('镇肝熄风汤'));
  const rows = [
    { label: '二说原可沟通', term: '原可沟通', unit: u73 },
    { label: '胆石阻塞胆囊之口', term: '胆石阻塞胆囊之口', unit: u73 },
    { label: '钩虫可除', term: '钩虫可除', unit: u73 },
    { label: '剖验而后知', term: '剖验而后知', unit: u73 },
    { label: '心有四血脉管通脑', term: '四血脉管通脑', unit: u60 },
    { label: '发表药助血上升', term: '必益随发表之药上升', unit: zhengan },
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
    freq: docFreq(),
    scene: scene(),
    markers: markers(),
    quotes: q,
    quoteMiss: q.filter((x) => !x.hit),
    quiz: quizAudit(),
  };
}

module.exports = { U, ALL, BY_LOC, CHAPTER, SLUG, TITLE, DOC_TEXT, QUIZ_JSON, hanzi, norm, count, shingles, quotes, docFreq, scene, markers, quizAudit, analyze };

if (require.main === module) {
  const r = analyze();
  console.log('');
  console.log('═══ 第 10 章 · ' + TITLE + ' ═══');
  console.log('\n── 词频：正文与原文现算 ──');
  for (const f of r.freq) console.log('  ' + (f.ok ? '✓' : '✗') + ' 「' + f.term + '」 现算 ' + f.got + ' · 正文 ' + f.want);
  console.log('\n── 器械读数的落点 ──');
  console.log('  ' + (r.scene.mercuryInCase ? '✓' : '✗') + ' 汞柱：' + r.scene.mercury.join('、'));
  console.log('  ' + (r.scene.pressureOnce ? '✓' : '✗') + ' 血压：' + r.scene.pressure.join('、'));
  console.log('\n── 五层的原话 ──');
  for (const m of r.markers) console.log('  ' + (m.hit ? '✓' : '✗') + ' ' + m.label + '（' + m.where + '）');
  console.log('\n── 引文回查 ──');
  for (const q of r.quotes) console.log('  ' + (q.hit ? '✓' : '✗') + ' ' + q.text.slice(0, 22) + '…');
  console.log('\n── 习题 ──');
  console.log('  ' + r.quiz.count + ' 题 · 段 ' + r.quiz.stages.join('/') + ' · 接地 check ' + r.quiz.groundedCheck + ' 道 · 正确项 ' + r.quiz.spread + ' 种');
  console.log('\n  边界：字面计数，未做同义合并；不评价中西医任何一方。');
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
