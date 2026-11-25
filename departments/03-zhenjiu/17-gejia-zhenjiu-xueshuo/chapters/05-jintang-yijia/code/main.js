#!/usr/bin/env node
/**
 * 各家针灸学说 · 第 5 章 晋唐针灸医家学术思想：正文与习题自检
 * 课程: departments/03-zhenjiu/17-gejia-zhenjiu-xueshuo/chapters/05-jintang-yijia/docs/zh.md
 * 数据: standards/zhenjiu-gejia/units.json（138 单元层，按 chapter 字段取本章）
 * 依赖: 仅 Node.js 标准库。正文与习题只读 ../docs/zh.md 与 ../quiz.json，单元统计读 standards/。
 *
 * 本脚本做两件事：
 *   一、从单元层现算本章规模、主张词与时代词的分布、引书与人物密度，数字不手打；
 *   二、把「习题必须与正文同源」做成可执行判据 —— check 题的正确选项要在正文里
 *       找得到 ≥6 汉字连续原句，每题解释 40–80 汉字，题型覆盖 pre/check/post，
 *       任何一条不达标即 exit 1。手改 quiz 而与正文脱钩，门先红。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DIR = __dirname;
const DOC = path.join(DIR, '..', 'docs', 'zh.md');
const QUIZ = path.join(DIR, '..', 'quiz.json');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'zhenjiu-gejia', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/zhenjiu-gejia/units.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(DIR);
const UNITS = path.join(ROOT, 'standards', 'zhenjiu-gejia', 'units.json');

const CHAPTER = '5';
const SLUG = '05-jintang-yijia';
const TITLE = '晋唐针灸医家学术思想';

const load = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));

function chapterKeys(data = load()) {
  return data.units
    .filter((u) => u.chapter === CHAPTER)
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en', { numeric: true }))
    .map((u) => u.sub);
}

function chapterUnits(data = load()) {
  const keys = new Set(chapterKeys(data));
  return data.units
    .filter((u) => keys.has(u.sub))
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en', { numeric: true }));
}

const sum = (d) => Object.values(d).reduce((a, b) => a + b, 0);

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

function bySection(list) {
  const out = new Map();
  for (const u of list) {
    const key = u.sec || '（未标节）';
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
    for (const m of String(u.rawBody || u.prose || '').matchAll(/《([^》]+)》/g)) {
      counter.set(m[1], (counter.get(m[1]) || 0) + 1);
    }
  }
  const ranked = [...counter.entries()].sort((a, b) => b[1] - a[1]);
  return { books: counter.size, total: sum(Object.fromEntries(counter)), top: ranked.slice(0, 5) };
}

function shape(list) {
  const hanzi = list.reduce((a, u) => a + u.hanzi, 0);
  return {
    units: list.length,
    hanzi,
    mean: list.length ? Math.round(hanzi / list.length) : 0,
    valueLike: list.reduce((a, u) => a + ((u.measure && u.measure.valueLike) || 0), 0),
    digits: list.reduce((a, u) => a + ((u.measure && u.measure.digits) || 0), 0),
    originals: list.reduce((a, u) => a + (String(u.rawBody || '').match(/【原文】/g) || []).length, 0),
  };
}

/** 医家人名密度：只数正文里出现过的名字，用于人物榜，不当学术地位排名 */
function persons(list) {
  const NAMES = ['黄帝', '岐伯', '雷公', '扁鹊', '华佗', '张仲景', '皇甫谧', '王叔和', '葛洪', '孙思邈',
    '王焘', '王惟一', '何若愚', '阎明广', '窦默', '窦材', '滑寿', '刘完素', '张从正', '李东垣',
    '朱丹溪', '罗天益', '忽泰必烈', '王国瑞', '徐凤', '高武', '汪机', '李梃', '杨继洲', '吴谦',
    '廖润鸿', '李守先', '吴亦鼎', '承淡安', '陆瘦燕', '朱琏', '石学敏', '贺普仁', '程莘农',
    '郭诚杰', '郑魁山', '杨上善'];
  const pairs = NAMES.map((n) => [n, list.reduce((a, u) => a + String(u.rawBody || '').split(n).length - 1, 0)]);
  return pairs.filter(([, c]) => c).sort((a, b) => b[1] - a[1]);
}

function summarize(list) {
  const s = shape(list);
  const views = merge(list, 'views');
  const levels = merge(list, 'levels');
  const c = citations(list);
  const vTop = rank(views)[0] || { key: '—', count: 0 };
  const lTop = rank(levels)[0] || { key: '—', count: 0 };
  return {
    units: s.units,
    hanzi: s.hanzi,
    mean: s.mean,
    values: s.valueLike,
    digits: s.digits,
    originals: s.originals,
    views,
    levels,
    viewTop: [vTop.key, vTop.count],
    levelTop: [lTop.key, lTop.count],
    books: c.books,
    cites: c.total,
    topBooks: c.top,
    persons: persons(list),
    sections: bySection(list),
  };
}

/** 只留汉字，便于逐字比对 */
const onlyHanzi = (s) => String(s || '').replace(/[^\u4e00-\u9fff]/g, '');

/** n 元汉字片段集合 */
function grams(text, n) {
  const clean = onlyHanzi(text);
  const out = new Set();
  for (let i = 0; i + n <= clean.length; i += 1) out.add(clean.slice(i, i + n));
  return out;
}

const GROUND_N = 6;
const hz = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

/** 习题自检：不达标返回 issues，调用方 exit 1 */
function selfCheck() {
  const doc = fs.readFileSync(DOC, 'utf8');
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const body = grams(doc, GROUND_N);
  const issues = [];
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];

  const stages = { pre: 0, check: 0, post: 0 };
  for (const q of qs) stages[q.stage] = (stages[q.stage] || 0) + 1;

  if (qs.length !== 6) issues.push(`题数 ${qs.length}，要求 6`);
  if (stages.pre !== 1) issues.push(`pre 段 ${stages.pre} 题，要求 1`);
  if (stages.check !== 3) issues.push(`check 段 ${stages.check} 题，要求 3`);
  if (stages.post !== 2) issues.push(`post 段 ${stages.post} 题，要求 2`);

  const explains = [];
  let grounded = 0;
  for (const q of qs) {
    const opts = Array.isArray(q.options) ? q.options : [];
    if (opts.length !== 4) issues.push(`「${String(q.question).slice(0, 12)}…」不是 4 选项`);
    if (!(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < opts.length)) {
      issues.push(`「${String(q.question).slice(0, 12)}…」correct 下标非法`);
      continue;
    }
    const why = q.explain || q.explanation || '';
    const n = hz(why);
    explains.push(n);
    if (n < 40 || n > 80) issues.push(`「${String(q.question).slice(0, 12)}…」解释 ${n} 汉字，要求 40–80`);
    if (q.stage === 'check') {
      const right = onlyHanzi(opts[q.correct]);
      let hit = false;
      for (let i = 0; i + GROUND_N <= right.length; i += 1) {
        if (body.has(right.slice(i, i + GROUND_N))) { hit = true; break; }
      }
      if (hit) grounded += 1;
      else issues.push(`check 题「${String(q.question).slice(0, 12)}…」正确选项不在正文原句里`);
    }
  }
  if (grounded < 3) issues.push(`接地 check 题 ${grounded} 道，要求 3`);

  const docHanzi = hz(doc);
  const secs = (doc.match(/^### /gm) || []).length;
  if (docHanzi < 2500) issues.push(`正文只有 ${docHanzi} 汉字，薄于本章标准`);
  if (secs < 3) issues.push(`正文只有 ${secs} 个三级节`);

  return {
    ok: issues.length === 0,
    issues,
    docHanzi,
    secs,
    questions: qs.length,
    stages,
    grounded,
    checks: stages.check,
    minExplain: explains.length ? Math.min(...explains) : 0,
    quiz,
  };
}

function main() {
  const list = chapterUnits();
  const s = summarize(list);
  const c = selfCheck();

  console.log(`各家针灸学说 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log(`单元 ${s.units} · 汉字 ${s.hanzi} · 平均 ${s.mean} 字/单元 · 原文 ${s.originals} 处`);
  console.log('按节：');
  for (const sec of s.sections) console.log(`  ${sec.sec}  ${sec.units} 单元 · ${sec.hanzi} 字`);
  console.log(`主张词重心：${s.viewTop[0]}（${s.viewTop[1]}）· 时代词重心：${s.levelTop[0]}（${s.levelTop[1]}）`);
  console.log(`引书 ${s.books} 部 · 引用 ${s.cites} 次 · 前五：${s.topBooks.map(([n, k]) => `${n}(${k})`).join('、')}`);
  console.log(`人物密度：${s.persons.slice(0, 6).map(([n, k]) => `${n}×${k}`).join('  ') || '—'}`);
  console.log('');
  console.log(`习题自检 · 正文 ${c.docHanzi} 汉字 / ${c.secs} 节 · 习题 ${c.questions} 题 (pre ${c.stages.pre}/check ${c.stages.check}/post ${c.stages.post})`);
  console.log(`  接地 check 题 ${c.grounded}/${c.checks} · 最短解释 ${c.minExplain} 汉字`);
  if (!c.ok) {
    console.error('自检未通过：');
    for (const i of c.issues) console.error('  - ' + i);
    process.exit(1);
  }
  console.log('  自检通过：习题与正文同源');
  console.log('※ 教学样例：数字由 standards/zhenjiu-gejia/units.json 现算，不构成诊疗建议，也不能替代医师面诊。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE,
  load, chapterKeys, chapterUnits, summarize, selfCheck,
  merge, rank, bySection, citations, shape, persons, sum,
};
