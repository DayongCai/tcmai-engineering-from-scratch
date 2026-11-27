'use strict';
/**
 * 第 8 章 · 脑充血与脑贫血：参西最深的一处，也是证名最先失效的一处
 *
 *   node code/main.js
 *
 * 读 docs/zh.md 与 standards/zhongcan-xilu/units.json，现算：
 *   · 全书「汞柱」「血压」各出现几次，脑充血门几案
 *   · 建瓴汤与镇肝熄风汤各几味，两方是否都以牛膝为主药
 *   · 五条朕兆、血压读数、囟门塌陷、黄芪八钱的案子，各在原文哪一句
 *   · 正文引文是否逐字落在所标单元；quiz 的结构与接地
 *
 * 边界：证名与判断依据的文本核对；血压读数只作历史证据，本脚本不作诊断。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const UNITS = path.join(ROOT, 'standards/zhongcan-xilu/units.json');

const CHAPTER = 8;
const SLUG = '08-naochongxue';
const TITLE = '脑充血与脑贫血：参西最深的一处，也是证名最先失效的一处';

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

const ALL_TEXT = ALL.map((u) => u.body).join('');
const CASES = ALL.filter((u) => u.sec === '五、医案');
const NAOCHONG = CASES.filter((u) => u.locator.includes('脑充血门'));
const ZHENGAN = ALL.find((u) => u.title.includes('镇肝熄风汤'));

/** 正文里两方的组成写成 **方名**：药一两、药二钱…… */
function docFormula(name) {
  const re = new RegExp('\\*\\*' + name + '\\*\\*：([^\\n]+)');
  const m = DOC_TEXT.match(re);
  if (!m) return { name, herbs: [] };
  const body = m[1].split('，磨')[0].replace(/。$/, '');
  const herbs = body.split('、').map((s) => s.replace(/(?:[一二三四五六七八九十百半]+|\d+(?:\.\d+)?)(?:两|钱|分|斤|枚|片)/g, '').trim()).filter(Boolean);
  return { name, herbs };
}

/** units 里的方下组成行 */
function unitFormula(unit) {
  if (!unit) return [];
  const line = unit.body.split('\n').find((l) => (l.match(/（[^）]*[钱两分]/g) || []).length >= 2) || '';
  return [...line.matchAll(/([\u4e00-\u9fff]{2,4})（/g)].map((m) => m[1]);
}

function fact(label, re, got) {
  const m = DOC_TEXT.match(re);
  const want = m ? Number(m[1]) : null;
  return { label, got, want, ok: want !== null && got === want };
}

function facts() {
  return [
    fact('「汞柱」出现处数', /「汞柱」(\d+)\s*处/, count(ALL_TEXT, '汞柱')),
    fact('「血压」出现处数', /「血压」(\d+)\s*处/, count(ALL_TEXT, '血压')),
    fact('脑充血门医案数', /脑充血门医案\s*(\d+)\s*案/, NAOCHONG.length),
  ].map((f) => ({ ...f, ok: f.want !== null && f.got === f.want }));
}

function formulas() {
  const jianling = docFormula('建瓴汤');
  const zhenganDoc = docFormula('镇肝熄风汤');
  const zhenganUnit = unitFormula(ZHENGAN);
  return {
    jianling,
    zhenganDoc,
    zhenganUnit,
    bothHaveNiuxi: jianling.herbs.some((h) => h.includes('牛膝')) && zhenganUnit.some((h) => h.includes('牛膝')),
    sameCount: zhenganDoc.herbs.length === zhenganUnit.length,
  };
}

function markers() {
  const u58 = ALL.find((u) => u.locator.includes('三、医论·58'));
  const u59 = ALL.find((u) => u.locator.includes('三、医论·59'));
  const u60 = ALL.find((u) => u.locator.includes('三、医论·60'));
  const rows = [
    { label: '血之与气，并走于上', term: '血之与气', unit: u58 },
    { label: '但见血充脑中', term: '但见血充脑中', unit: u58 },
    { label: '较前低二十余毫米汞柱', term: '较前低二十余毫米汞柱', unit: u59 },
    { label: '眩仆于地而亡', term: '眩仆于地而亡', unit: u59 },
    { label: '上气不足', term: '上气不足', unit: u60 },
    { label: '囟门无不塌陷', term: '囟门无不塌陷', unit: u60 },
    { label: '误服黄耆八钱', term: '黄耆八钱', unit: ZHENGAN },
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
    facts: facts(),
    formulas: formulas(),
    markers: markers(),
    quotes: q,
    quoteMiss: q.filter((x) => !x.hit),
    quiz: quizAudit(),
  };
}

module.exports = { U, ALL, BY_LOC, CHAPTER, SLUG, TITLE, DOC_TEXT, QUIZ_JSON, hanzi, norm, count, shingles, quotes, facts, formulas, markers, quizAudit, analyze };

if (require.main === module) {
  const r = analyze();
  console.log('');
  console.log('═══ 第 8 章 · ' + TITLE + ' ═══');
  console.log('\n── 正文的数与原文现算 ──');
  for (const f of r.facts) console.log('  ' + (f.ok ? '✓' : '✗') + ' ' + f.label + '  现算 ' + f.got + ' · 正文 ' + f.want);
  console.log('\n── 两张方 ──');
  console.log('  建瓴汤 ' + r.formulas.jianling.herbs.length + ' 味：' + r.formulas.jianling.herbs.join('、'));
  console.log('  镇肝熄风汤 ' + r.formulas.zhenganUnit.length + ' 味（单元）／' + r.formulas.zhenganDoc.herbs.length + ' 味（正文）');
  console.log('  两方共用牛膝 ' + (r.formulas.bothHaveNiuxi ? '✓' : '✗') + ' · 组成一致 ' + (r.formulas.sameCount ? '✓' : '✗'));
  console.log('\n── 读法的原话 ──');
  for (const m of r.markers) console.log('  ' + (m.hit ? '✓' : '✗') + ' ' + m.label + '（' + m.where + '）');
  console.log('\n── 引文回查 ──');
  for (const q of r.quotes) console.log('  ' + (q.hit ? '✓' : '✗') + ' ' + q.text.slice(0, 22) + '…');
  console.log('\n── 习题 ──');
  console.log('  ' + r.quiz.count + ' 题 · 段 ' + r.quiz.stages.join('/') + ' · 接地 check ' + r.quiz.groundedCheck + ' 道 · 正确项 ' + r.quiz.spread + ' 种');
  console.log('\n  边界：文本核对；血压读数只作历史证据，本脚本不作诊断、不给用药建议。');
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
