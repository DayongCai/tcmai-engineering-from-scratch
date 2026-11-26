#!/usr/bin/env node
/**
 * 中药分析学 · 第 1 章 方法验证不是打勾表，是八个各自会失败的边界
 *
 *   node code/main.js
 *
 * 正文：chapters/01-fangfa-yanzheng/docs/zh.md
 * 习题：chapters/01-fangfa-yanzheng/quiz.json
 * 教材：standards/zhongyao-fenxi/units.json（本章取 11.1.1、11.1.2、11.2.1、11.2.2）
 * 依赖：仅 Node.js 标准库
 *
 * 三件事现算：正文的规模、表格与数值读数；教材单元的字数与引书；
 * 本章习题的量、分段、选项、解释长度与接地。数字不手打，正文改了重跑即可复核。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 1;
const SLUG = '01-fangfa-yanzheng';
const TITLE = '方法验证不是打勾表，是八个各自会失败的边界';
const KEYS = ["11.1.1","11.1.2","11.2.1","11.2.2"];
/** 本章的操作与判据词：在教材单元正文里各出现几次 */
const OPS = ["准确度","精密度","专属性","线性","范围","检测限","定量限","耐用性","回收率","修约","有效数字","系统误差","偶然误差","过失误差"];

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const sum = (d) => Object.values(d).reduce((a, b) => a + b, 0);
const lines = (doc) => String(doc).replace(/\r\n/g, '\n').split('\n');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'zhongyao-fenxi', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/zhongyao-fenxi/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const UNITS = path.join(ROOT, 'standards', 'zhongyao-fenxi', 'units.json');

const load = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));

function chapterUnits(data) {
  return data.units
    .filter((u) => KEYS.includes(u.sub))
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en', { numeric: true }));
}

function merge(list, field) {
  const out = {};
  for (const u of list) {
    const src = (u.measure && u.measure[field]) || {};
    for (const [k, v] of Object.entries(src)) out[k] = (out[k] || 0) + v;
  }
  return out;
}

function rank(dict) {
  const tot = sum(dict);
  return Object.entries(dict)
    .map(([key, count]) => ({ key, count, share: tot ? count / tot : 0 }))
    .sort((a, b) => b.count - a.count);
}

function byBookSection(list) {
  const out = new Map();
  for (const u of list) {
    const key = '教材第' + u.chapter + '章';
    const it = out.get(key) || { sec: key, units: 0, hanzi: 0 };
    it.units += 1;
    it.hanzi += u.hanzi;
    out.set(key, it);
  }
  return [...out.values()];
}

function citations(list) {
  const counter = new Map();
  for (const u of list) {
    for (const m of String(u.prose || '').matchAll(/《([^》]+)》/g)) {
      counter.set(m[1], (counter.get(m[1]) || 0) + 1);
    }
  }
  const ranked = [...counter.entries()].sort((a, b) => b[1] - a[1]);
  return { books: counter.size, total: sum(Object.fromEntries(counter)), top: ranked.slice(0, 3) };
}

function shape(list) {
  const han = list.reduce((a, u) => a + u.hanzi, 0);
  return {
    units: list.length,
    hanzi: han,
    mean: list.length ? Math.round(han / list.length) : 0,
    valueLike: list.reduce((a, u) => a + ((u.measure && u.measure.valueLike) || 0), 0),
    digits: list.reduce((a, u) => a + ((u.measure && u.measure.digits) || 0), 0),
  };
}

/** 操作与判据词在教材单元正文中的命中次数（降序，去零） */
function hands(list) {
  const pairs = OPS.map((w) => [
    w,
    list.reduce((a, u) => a + String(u.prose || '').split(w).length - 1, 0),
  ]);
  return pairs.filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
}

/* ── 正文 ─────────────────────────────────────────────────────── */

function sections(doc) {
  return lines(doc)
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

function paragraphs(doc) {
  return lines(doc)
    .map((l) => l.trim())
    .filter((l) => l && !/^[#>|]/.test(l) && !/^[-*+]\s/.test(l) && !/^\d+[.、]/.test(l))
    .filter((l) => !l.includes('|'));
}

function tables(doc) {
  const ls = lines(doc);
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const out = [];
  let i = 0;
  while (i < ls.length) {
    if (/^\s*\|/.test(ls[i])) {
      const block = [];
      while (i < ls.length && /^\s*\|/.test(ls[i])) {
        block.push(ls[i]);
        i += 1;
      }
      const header = cells(block[0]);
      const rows = block
        .slice(1)
        .filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l))
        .map(cells);
      out.push({ header, cols: header.length, rows });
    } else {
      i += 1;
    }
  }
  return out;
}

const UNITS_LIST = ['mg/kg', 'mg', 'µg', 'mL', 'nm', 'mm', 'cm', 'min', '%', '℃', 'g', 'h', 'r', '个月', '小时', '分钟', '份', '点', '倍', '批', '味', '项', '条'];
const PHYS = ['mg/kg', 'mg', 'µg', 'mL', 'nm', 'mm', 'cm', 'min', '%', '℃', 'g', 'h', '个月', '小时', '分钟'];
const esc = (u) => u.replace(/[.*+?^\[\]\\%]/g, '\\$&');
const UNIT_RE = new RegExp('(\\d+(?:\\.\\d+)?)\\s*(' + UNITS_LIST.map(esc).join('|') + ')', 'g');
const RANGE_RE = new RegExp(
  '(\\d+(?:\\.\\d+)?)\\s*(' + PHYS.map(esc).join('|') + ')?\\s*[—–~～－]\\s*(\\d+(?:\\.\\d+)?)\\s*(' +
    PHYS.map(esc).join('|') + ')?',
  'g'
);

function readings(doc) {
  const text = String(doc).replace(/\r\n/g, '\n');
  const hits = [];
  let m;
  UNIT_RE.lastIndex = 0;
  while ((m = UNIT_RE.exec(text)) !== null) hits.push({ value: Number(m[1]), unit: m[2] });
  const byUnit = {};
  for (const h of hits) byUnit[h.unit] = (byUnit[h.unit] || 0) + 1;
  const ranges = [];
  RANGE_RE.lastIndex = 0;
  while ((m = RANGE_RE.exec(text)) !== null) {
    if (!PHYS.includes(m[2]) && !PHYS.includes(m[4])) continue;
    ranges.push(m[0].trim());
  }
  return { hits, byUnit, ranges };
}

/* ── 习题 ─────────────────────────────────────────────────────── */

/** 正文里 n 字以上的连续汉字片段 */
function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function quizCheck(quiz, doc) {
  const body = grams(doc);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const issues = [];
  const items = qs.map((q, i) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    const hit = [...grams(right)].filter((g) => body.has(g));
    const why = q.explain || q.explanation || '';
    if (opts.length !== 4) issues.push('第 ' + (i + 1) + ' 题选项 ' + opts.length + ' 个');
    if (new Set(opts.map(String)).size !== opts.length) issues.push('第 ' + (i + 1) + ' 题选项重复');
    if (!(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < opts.length)) {
      issues.push('第 ' + (i + 1) + ' 题 correct 越界');
    }
    const h = hanzi(why);
    if (h < 40 || h > 80) issues.push('第 ' + (i + 1) + ' 题解释 ' + h + ' 汉字，不在 40—80');
    return {
      n: i + 1,
      stage: q.stage,
      options: opts.length,
      correct: q.correct,
      explainHanzi: h,
      grounded: hit.length,
      sample: hit.slice(0, 2),
    };
  });
  if (items.length < 6) issues.push('题量 ' + items.length + ' 少于 6');
  for (const s of ['pre', 'check', 'post']) if (!stage[s]) issues.push('缺 ' + s + ' 段');
  const grounded = items.filter((x) => x.stage === 'check' && x.grounded > 0).length;
  if (grounded < 2) issues.push('check 题接地 ' + grounded + ' 道，少于 2');
  const answers = items.map((x) => x.correct);
  return {
    total: items.length,
    stage,
    items,
    answers,
    distinctAnswers: new Set(answers).size,
    grounded,
    minExplain: items.length ? Math.min(...items.map((x) => x.explainHanzi)) : 0,
    maxExplain: items.length ? Math.max(...items.map((x) => x.explainHanzi)) : 0,
    issues,
  };
}

/* ── 汇总 ─────────────────────────────────────────────────────── */

function analyze() {
  const doc = fs.readFileSync(DOC, 'utf8');
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const data = load();
  const list = chapterUnits(data);
  const ts = tables(doc);
  return {
    docHanzi: hanzi(doc),
    paragraphs: paragraphs(doc).length,
    sections: sections(doc),
    tables: ts.map((t) => ({ header: t.header, cols: t.cols, rows: t.rows.length })),
    cells: ts.reduce((s, t) => s + t.cols * t.rows.length, 0),
    readings: readings(doc),
    units: list,
    shape: shape(list),
    books: citations(list),
    ops: hands(list),
    quiz: quizCheck(quiz, doc),
  };
}

function main() {
  const r = analyze();
  const q = r.quiz;
  const rd = r.readings;
  console.log('中药分析学 第 ' + CHAPTER + ' 章 · ' + TITLE);
  console.log(
    '正文 ' + r.docHanzi.toLocaleString('en-US') + ' 汉字 · ' + r.paragraphs + ' 段 · 节 ' +
      r.sections.length + ' 个 · 表 ' + r.tables.length + ' 张（' + r.cells + ' 格）'
  );
  console.log('');
  console.log('节：');
  for (const s of r.sections) console.log('  ' + s);
  console.log('');
  console.log('教材单元（' + KEYS.join('、') + '）：');
  console.log('  ' + r.shape.units + ' 个单元 · ' + r.shape.hanzi + ' 汉字 · 平均 ' + r.shape.mean + ' 字');
  console.log('  引书 ' + r.books.books + ' 部 · 引用 ' + r.books.total + ' 次 · 前三 ' +
    (r.books.top.map(([n, k]) => n + '(' + k + ')').join('、') || '（无）'));
  console.log('  操作与判据词命中：' + (r.ops.map(([w, k]) => w + '×' + k).join('  ') || '（无）'));
  console.log('');
  console.log('数值读数（数值 + 单位）：共 ' + rd.hits.length + ' 处，区间 ' + rd.ranges.length + ' 处');
  const unitRank = Object.entries(rd.byUnit).sort((a, b) => b[1] - a[1]).slice(0, 6);
  console.log('  单位分布：' + (unitRank.map(([u, c]) => u + ' ' + c).join(' · ') || '（无）'));
  if (rd.ranges.length) console.log('  区间抽样：' + rd.ranges.slice(0, 6).join('、'));
  console.log('');
  console.log(
    '习题 ' + q.total + ' 题 · pre ' + q.stage.pre + ' / check ' + q.stage.check + ' / post ' + q.stage.post +
      ' · 答案位置 ' + q.answers.join('/')
  );
  console.log('  check 题接地 ' + q.grounded + ' 道 · 解释 ' + q.minExplain + '—' + q.maxExplain + ' 汉字 · 答案落在 ' + q.distinctAnswers + ' 个位置');
  for (const it of q.items) {
    console.log(
      '  ' + String(it.n).padStart(2, '0') + ' ' + String(it.stage).padEnd(5) +
        ' 选项 ' + it.options + ' · 解释 ' + it.explainHanzi + ' 汉字 · 接地 ' + it.grounded
    );
  }
  console.log(q.issues.length ? '  → 体检不合格：' + q.issues.join('；') : '  → 体检全部合格');
  console.log('');
  console.log('※ 以上数字由本章正文、习题与教材单元层现算，改稿后重跑即可复核。');
  console.log('※ 本章为中药分析学教学材料，不构成检验方法与限度标准，实际检验以现行药典与机构质量体系文件为准。');
  if (q.issues.length) process.exitCode = 2;
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, KEYS, OPS, DOC, QUIZ, UNITS,
  load, chapterUnits, merge, rank, byBookSection, citations, shape, hands, sum,
  sections, paragraphs, tables, readings, grams, quizCheck, analyze,
};
