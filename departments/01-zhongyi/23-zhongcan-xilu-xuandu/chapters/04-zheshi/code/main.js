'use strict';
/**
 * 第 4 章 · 赭石的六条特长里，只有一条是「重」
 *
 *   node code/main.js
 *
 * 读 docs/zh.md 与 standards/zhongcan-xilu/units.json，现算：
 *   · 176 个医方条目中含生赭石者几条
 *   · 《论胃气不降治法》里「一也……六也」是不是六条（数出来，不照抄正文）
 *   · 生研、煅则失效、醋淬、妊娠边界、周姓妇案，各在原文哪一句
 *   · 正文引文是否逐字落在所标单元；quiz 的结构与接地
 *
 * 边界：条目数是文本统计；剂量为清末衡制，本脚本不换算，也不给用药建议。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const UNITS = path.join(ROOT, 'standards/zhongcan-xilu/units.json');

const CHAPTER = 4;
const SLUG = '04-zheshi';
const TITLE = '赭石的六条特长里，只有一条是「重」';

const U = JSON.parse(fs.readFileSync(UNITS, 'utf8'));
const ALL = U.units;
const BY_LOC = new Map(ALL.map((u) => [u.locator, u]));
const DOC_TEXT = fs.readFileSync(DOC, 'utf8');
const QUIZ_JSON = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;
const norm = (s) => String(s || '').replace(/[^\u4e00-\u9fff]/g, '');

const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

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
const ZHESHI = ALL.find((u) => u.title === '7．赭石解');
const LUN66 = ALL.find((u) => u.locator.includes('三、医论·66．论胃气不降治法'));

function fact(label, re, got) {
  const m = DOC_TEXT.match(re);
  const want = m ? Number(m[1].replace(/,/g, '')) : null;
  return { label, got, want, ok: want !== null && got === want };
}

function facts() {
  return [
    fact('医方条目数', /(\d+)\s*个医方条目中含生赭石/, MED.length),
    fact('含生赭石的医方', /含生赭石者\s*(\d+)\s*条/, MED.filter((u) => u.body.includes('生赭石')).length),
  ].map((f) => ({ ...f, ok: f.want !== null && f.got === f.want }));
}

/** 六条特长：数「一也」到「六也」，再与正文的「六」对上 */
function sixPoints() {
  const body = LUN66 ? LUN66.body : '';
  const marks = ['一也', '二也', '三也', '四也', '五也', '六也'].filter((t) => body.includes(t));
  const docSix = DOC_TEXT.match(/其特长有([一二三四五六七八九十]+)/);
  return {
    counted: marks.length,
    marks,
    want: docSix ? CN[docSix[1]] : null,
    locus: LUN66 ? LUN66.title : '缺单元',
    hanzi: LUN66 ? LUN66.hanzi : 0,
  };
}

/** 每条读法都要在原文里落到字面 */
function markers() {
  const rows = [
    { label: '龙牡欠下达之力', term: '欠下达之力', unit: ZHESHI },
    { label: '生研服之不伤肠胃', term: '生研服之不伤肠胃', unit: ZHESHI },
    { label: '层层如铁锈', term: '层层如铁锈', unit: ZHESHI },
    { label: '醋淬即能伤肺', term: '即能伤肺', unit: ZHESHI },
    { label: '妊娠：服之或有妨碍', term: '服之或有妨碍', unit: ZHESHI },
    { label: '周姓妇案：药至结处不能下行', term: '药至结处不能下行', unit: ZHESHI },
    { label: '方中少加柴胡', term: '少加柴胡', unit: LUN66 },
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
    six: sixPoints(),
    markers: markers(),
    quotes: q,
    quoteMiss: q.filter((x) => !x.hit),
    quiz: quizAudit(),
  };
}

module.exports = { U, ALL, BY_LOC, CHAPTER, SLUG, TITLE, DOC_TEXT, QUIZ_JSON, hanzi, norm, shingles, quotes, facts, sixPoints, markers, quizAudit, analyze };

if (require.main === module) {
  const r = analyze();
  console.log('');
  console.log('═══ 第 4 章 · ' + TITLE + ' ═══');
  console.log('\n── 正文的数与原文现算 ──');
  for (const f of r.facts) console.log('  ' + (f.ok ? '✓' : '✗') + ' ' + f.label + '  现算 ' + f.got + ' · 正文 ' + f.want);
  console.log('\n── 六条特长 ──');
  console.log('  数出 ' + r.six.counted + ' 条（' + r.six.marks.join('、') + '）· 正文说 ' + r.six.want + ' 条');
  console.log('\n── 读法的原话 ──');
  for (const m of r.markers) console.log('  ' + (m.hit ? '✓' : '✗') + ' ' + m.label + '（' + m.where + '）');
  console.log('\n── 引文回查 ──');
  for (const q of r.quotes) console.log('  ' + (q.hit ? '✓' : '✗') + ' ' + q.text.slice(0, 22) + '…');
  console.log('\n── 习题 ──');
  console.log('  ' + r.quiz.count + ' 题 · 段 ' + r.quiz.stages.join('/') + ' · 接地 check ' + r.quiz.groundedCheck + ' 道 · 正确项 ' + r.quiz.spread + ' 种');
  console.log('\n  边界：条目数为文本统计；剂量为清末衡制，不换算、不给用量建议。');
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
