'use strict';
/**
 * 第 7 章 · 吐衄不是三条路，是一个主轴加四个岔口
 *
 *   node code/main.js
 *
 * 读 docs/zh.md 与 standards/zhongcan-xilu/units.json，现算：
 *   · 医方篇（七）治吐衄方共几首（数单元）
 *   · 正文那张七方表有几行、几个岔口（按表里的字面数，不照抄标题）
 *   · 两条禁忌与柴胡二钱案，各在原文哪一句
 *   · 正文引文是否逐字落在所标单元；quiz 的结构与接地
 *
 * 边界：方证结构文本核对；剂量为清末衡制，不换算；出血属急症，本章不含处置建议。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const UNITS = path.join(ROOT, 'standards/zhongcan-xilu/units.json');

const CHAPTER = 7;
const SLUG = '07-tube-xuezheng';
const TITLE = '吐衄不是三条路，是一个主轴加四个岔口';

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

const FANG = ALL.filter((u) => u.locator.includes('（七）治吐衄方'));
const LUN67 = ALL.find((u) => u.locator.includes('三、医论·67．论吐血衄血'));

/** 正文七方表：| 方 | 主治原文 | 岔口 | 判断依据 | */
function table() {
  const rows = [];
  for (const line of DOC_TEXT.split(/\r?\n/)) {
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 4) continue;
    if (!/汤$/.test(cells[0])) continue;
    if (!/汤/.test(cells[0])) continue;
    rows.push({ name: cells[0], clue: cells[2] });
  }
  const bases = [...new Set(rows.map((r) => r.clue.replace(/兼热$/, '')))];
  return { rows, bases, names: rows.map((r) => r.name) };
}

function facts() {
  const rows = [];
  const fangDoc = DOC_TEXT.match(/治吐衄方共([一二三四五六七八九十]+)首/);
  rows.push({ label: '医方篇治吐衄方首数', got: FANG.length, want: fangDoc ? cn2num(fangDoc[1]) : null });

  const head = DOC_TEXT.match(/([一二三四五六七八九十]+)个方，([一二三四五六七八九十]+)个岔口/);
  const t = table();
  rows.push({ label: '正文七方表的方数', got: t.rows.length, want: head ? cn2num(head[1]) : null });
  rows.push({ label: '正文七方表的岔口数', got: t.bases.length, want: head ? cn2num(head[2]) : null });

  const lunDoc = DOC_TEXT.match(/医论\s*67\s*列([一二三四五六七八九十]+)方/);
  rows.push({
    label: '医论 67 所列方数',
    got: t.names.filter((n) => LUN67 && LUN67.body.includes(n)).length,
    want: lunDoc ? cn2num(lunDoc[1]) : null,
  });
  return rows.map((r) => ({ ...r, ok: r.want !== null && r.got === r.want }));
}

function markers() {
  const rows = [
    { label: '胃壁之膜排挤破裂', term: '排挤破裂', unit: LUN67 },
    { label: '忌重用凉药及药炭', term: '忌重用凉药及药炭', unit: LUN67 },
    { label: '最忌黄耆', term: '最忌黄耆', unit: LUN67 },
    { label: '仅遇赵姓一人', term: '仅遇赵姓一人', unit: LUN67 },
    { label: '柴胡二钱', term: '柴胡二钱', unit: LUN67 },
    { label: '平胃寒降汤在医论里', term: '平胃寒降汤', unit: LUN67 },
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
    table: table(),
    markers: markers(),
    quotes: q,
    quoteMiss: q.filter((x) => !x.hit),
    quiz: quizAudit(),
  };
}

module.exports = { U, ALL, BY_LOC, CHAPTER, SLUG, TITLE, DOC_TEXT, QUIZ_JSON, hanzi, norm, cn2num, shingles, quotes, table, facts, markers, quizAudit, analyze };

if (require.main === module) {
  const r = analyze();
  console.log('');
  console.log('═══ 第 7 章 · ' + TITLE + ' ═══');
  console.log('\n── 正文的数与原文现算 ──');
  for (const f of r.facts) console.log('  ' + (f.ok ? '✓' : '✗') + ' ' + f.label + '  现算 ' + f.got + ' · 正文 ' + f.want);
  console.log('\n── 七方表的岔口 ──');
  console.log('  ' + r.table.bases.join('、'));
  console.log('\n── 两条禁忌与反例的原话 ──');
  for (const m of r.markers) console.log('  ' + (m.hit ? '✓' : '✗') + ' ' + m.label + '（' + m.where + '）');
  console.log('\n── 引文回查 ──');
  for (const q of r.quotes) console.log('  ' + (q.hit ? '✓' : '✗') + ' ' + q.text.slice(0, 22) + '…');
  console.log('\n── 习题 ──');
  console.log('  ' + r.quiz.count + ' 题 · 段 ' + r.quiz.stages.join('/') + ' · 接地 check ' + r.quiz.groundedCheck + ' 道 · 正确项 ' + r.quiz.spread + ' 种');
  console.log('\n  边界：方证结构文本核对；剂量不换算；出血属急症，本章不含处置建议。');
  console.log('');
}
