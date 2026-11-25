#!/usr/bin/env node
/**
 * 小儿推拿学 · 第 9 章 肾系与五官六病都卡在时间上，判的是到点没到点：正文与习题自检
 * 课程: departments/03-zhenjiu/20-xiaoer-tuina-xue/chapters/09-shenxi-wuguan
 * 依赖: 仅 Node.js 标准库；只读 ../docs/zh.md 与 ../quiz.json，不读 standards/。
 *
 * 输出的数都是当场算的：正文字数、二级节数、习题阶段分布、解释字数区间、接地数。
 * 接地数指 check 题的正确选项里至少有一句 ≥6 汉字的正文原话 —— 习题必须与正文同源。
 * 任何一条不成立就 exit 1，不让「题面讲的不是这一章」的东西流到学生手里。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '9';
const SLUG = '09-shenxi-wuguan';
const TITLE = '肾系与五官六病都卡在时间上，判的是到点没到点';

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const hz = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

/** 正文切成二级节：key 为标题文本，unit 为该节的段落 */
function chapterUnits(doc) {
  const text = String(doc || '').replace(/\r\n/g, '\n');
  const parts = text.split(/^## /m).slice(1);
  return parts.map((seg, i) => {
    const nl = seg.indexOf('\n');
    const title = (nl === -1 ? seg : seg.slice(0, nl)).trim();
    const body = nl === -1 ? '' : seg.slice(nl + 1);
    const paras = body
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p && !p.startsWith('#') && !p.startsWith('>') && !p.startsWith('|') && !p.startsWith('- ') && p !== '\u0060\u0060\u0060');
    return { i: i + 1, key: title, title, hanzi: hz(body), paragraphs: paras.length };
  });
}

/** 章内各节的 key（二级节标题），按正文顺序 */
function chapterKeys(doc) {
  return chapterUnits(doc).map((u) => u.key);
}

function summarize(units) {
  const list = Array.isArray(units) ? units : [];
  const hanzi = list.reduce((a, u) => a + u.hanzi, 0);
  const paragraphs = list.reduce((a, u) => a + u.paragraphs, 0);
  const longest = list.slice().sort((a, b) => b.hanzi - a.hanzi)[0] || { key: '—', hanzi: 0 };
  return { sections: list.length, hanzi, paragraphs, longest: longest.key, longestHanzi: longest.hanzi };
}

/** 把文本切成 n 字连续汉字片段（与习题门的判据同一算法） */
function grams(text, n) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/**
 * 习题自检：6 题（pre 1 / check 3 / post 2）· 每题 4 选项 · 解释 40–80 汉字 ·
 * 每道 check 的正确选项里必须有一句 ≥6 汉字的当章正文原话。
 */
function checkExercises() {
  const doc = fs.readFileSync(DOC, 'utf8');
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const body = grams(doc, 6);
  const stage = { pre: 0, check: 0, post: 0 };
  const bad = [];
  const lens = [];
  let hit = 0;

  for (const q of qs) stage[q.stage] = (stage[q.stage] || 0) + 1;
  if (qs.length !== 6) bad.push(`题数 ${qs.length}（需 6）`);
  if (stage.pre !== 1 || stage.check !== 3 || stage.post !== 2) {
    bad.push(`分段 pre${stage.pre}/check${stage.check}/post${stage.post}（需 1/3/2）`);
  }

  for (const q of qs) {
    const opts = Array.isArray(q.options) ? q.options : [];
    if (opts.length !== 4) bad.push('有题不是 4 选项');
    if (new Set(opts.map(String)).size !== opts.length) bad.push('有题选项重复');
    if (!(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < opts.length)) {
      bad.push('correct 下标非法');
    }
    const n = hz(q.explain || q.explanation);
    lens.push(n);
    if (n < 40 || n > 80) bad.push(`解释 ${n} 汉字（需 40–80）`);
    if (q.stage === 'check') {
      const right = String(opts[q.correct] || '');
      if ([...grams(right, 6)].some((g) => body.has(g))) hit += 1;
      else bad.push(`check 题「${String(q.question).slice(0, 14)}…」引不到 ≥6 汉字正文原句`);
    }
  }
  if (hit < 3) bad.push(`接地 check ${hit}/3`);

  console.log('');
  console.log(`习题 ${qs.length} 题 (pre ${stage.pre}/check ${stage.check}/post ${stage.post}) · 解释 ${Math.min(...lens)}–${Math.max(...lens)} 汉字 · 接地 check ${hit}/${stage.check}`);
  console.log('※ 接地：check 题的正确选项里必须有一句 ≥6 汉字的正文原话 —— 习题与 ../docs/zh.md 同源。');

  for (const b of bad) console.error('  ✗ ' + b);
  return bad.length === 0;
}

function main() {
  const doc = fs.readFileSync(DOC, 'utf8');
  const units = chapterUnits(doc);
  const s = summarize(units);

  console.log(`小儿推拿学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('');
  console.log(`正文 ${hz(doc)} 汉字 · 二级节 ${s.sections} · 段落 ${s.paragraphs}`);
  for (const u of units) console.log(`  ${String(u.i).padStart(2, '0')} ${u.key} — ${u.hanzi} 字 / ${u.paragraphs} 段`);
  console.log(`最长一节：${s.longest}（${s.longestHanzi} 字）`);
  console.log('');
  console.log('※ 教学样例：所有数字由本脚本从 ../docs/zh.md 与 ../quiz.json 现算，不手打；改正文后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成诊疗建议，不能替代医师面诊。');
}

function run() {
  main();
  if (!checkExercises()) {
    console.error('习题自检未通过');
    process.exit(1);
  }
}

if (require.main === module) run();

module.exports = { chapterKeys, chapterUnits, summarize, checkExercises, CHAPTER, SLUG };
