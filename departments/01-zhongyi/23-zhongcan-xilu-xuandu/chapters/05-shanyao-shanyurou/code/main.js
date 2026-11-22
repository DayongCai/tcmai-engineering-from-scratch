'use strict';
/**
 * 第 5 章 · 山药管「久」，山萸肉管「急」
 *
 *   node code/main.js
 *
 * 读 docs/zh.md 与 standards/zhongcan-xilu/units.json，现算：
 *   · 176 个医方里含生山药 / 知母 / 黄耆 / 萸肉各几条，与正文四个数对齐
 *   · 生山药是不是这四味里覆盖面最广的一味
 *   · 剂型与药材质量的原话：不可炒用、留恋肠胃之功、爆火煎一沸、核与肉参半、味极酸、百布圣
 *   · 正文引文是否逐字落在所标单元；quiz 的结构与接地
 *
 * 边界：条目数为文本统计；剂量为清末衡制，本脚本不换算，也不给急救建议。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const UNITS = path.join(ROOT, 'standards/zhongcan-xilu/units.json');

const CHAPTER = 5;
const SLUG = '05-shanyao-shanyurou';
const TITLE = '山药管「久」，山萸肉管「急」';

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
const SHANYAO = ALL.find((u) => u.title === '8．山药解');
const YUROU = ALL.find((u) => u.title === '5．山萸肉解');
const SHUYU = MED.find((u) => u.title.includes('薯蓣粥'));

const HERBS = [
  { key: '生山药', re: /含「生山药」的有\s*(\d+)\s*条/ },
  { key: '知母', re: /含「知母」\s*(\d+)\s*条/ },
  { key: '黄耆', re: /含「黄耆」\s*(\d+)\s*条/ },
  { key: '萸肉', re: /含「萸肉」\s*(\d+)\s*条/ },
];

function facts() {
  const medCount = DOC_TEXT.match(/(\d+)\s*个医方条目里，含/);
  const rows = HERBS.map(({ key, re }) => {
    const m = DOC_TEXT.match(re);
    const got = MED.filter((u) => u.body.includes(key)).length;
    const want = m ? Number(m[1]) : null;
    return { label: '含' + key + '的医方', key, got, want, ok: want !== null && got === want };
  });
  const total = { label: '医方条目数', got: MED.length, want: medCount ? Number(medCount[1]) : null };
  total.ok = total.want !== null && total.got === total.want;
  return [total, ...rows];
}

/** 正文说山药的覆盖面超过任何一味补气药或清热药：拿这四个数排一下 */
function ranking() {
  const rows = facts().slice(1).map((f) => [f.key, f.got]).sort((a, b) => b[1] - a[1]);
  return { rows, top: rows[0][0], topIsShanyao: rows[0][0] === '生山药' };
}

function markers() {
  const rows = [
    { label: '山药不可炒用', term: '不可炒用', unit: SHANYAO },
    { label: '作粥：留恋肠胃之功', term: '留恋肠胃之功', unit: SHANYAO },
    { label: '萸肉：爆火煎一沸', term: '爆火煎一沸', unit: YUROU },
    { label: '萸肉：核与肉参半', term: '核与肉参半', unit: YUROU },
    { label: '萸肉：味极酸', term: '味极酸', unit: YUROU },
    { label: '薯蓣粥掺百布圣', term: '百布圣', unit: SHUYU },
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
    ranking: ranking(),
    markers: markers(),
    quotes: q,
    quoteMiss: q.filter((x) => !x.hit),
    quiz: quizAudit(),
  };
}

module.exports = { U, ALL, BY_LOC, CHAPTER, SLUG, TITLE, DOC_TEXT, QUIZ_JSON, hanzi, norm, shingles, quotes, facts, ranking, markers, quizAudit, analyze };

if (require.main === module) {
  const r = analyze();
  console.log('');
  console.log('═══ 第 5 章 · ' + TITLE + ' ═══');
  console.log('\n── 正文四个数与原文现算 ──');
  for (const f of r.facts) console.log('  ' + (f.ok ? '✓' : '✗') + ' ' + f.label + '  现算 ' + f.got + ' · 正文 ' + f.want);
  console.log('\n── 覆盖面排序 ──');
  for (const [k, n] of r.ranking.rows) console.log('  ' + k + ' ' + n + ' 条');
  console.log('  首位 ' + r.ranking.top + '（' + (r.ranking.topIsShanyao ? '与正文一致' : '与正文不一致') + '）');
  console.log('\n── 剂型与药材质量的原话 ──');
  for (const m of r.markers) console.log('  ' + (m.hit ? '✓' : '✗') + ' ' + m.label + '（' + m.where + '）');
  console.log('\n── 引文回查 ──');
  for (const q of r.quotes) console.log('  ' + (q.hit ? '✓' : '✗') + ' ' + q.text.slice(0, 22) + '…');
  console.log('\n── 习题 ──');
  console.log('  ' + r.quiz.count + ' 题 · 段 ' + r.quiz.stages.join('/') + ' · 接地 check ' + r.quiz.groundedCheck + ' 道 · 正确项 ' + r.quiz.spread + ' 种');
  console.log('\n  边界：条目数为文本统计；剂量为清末衡制，不换算、不给急救建议。');
  console.log('');
}
