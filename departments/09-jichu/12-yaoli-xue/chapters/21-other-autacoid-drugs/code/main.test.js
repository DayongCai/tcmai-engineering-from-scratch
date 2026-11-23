'use strict';
/**
 * 第 21 章 单测：钉住 code/main.js 从本章 docs/zh.md 现算出的实测值，
 * 并校验 quiz.json 的结构与接地。正文改版后重跑即可，断言值随之更新。
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const {
  readDoc, hanzi, sections, subsections, tables, sectionStats,
  conceptHits, boundaries, arithmetic, summarize, CONCEPTS, CHAPTER,
} = require('./main.js');

const doc = readDoc();
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

/** 正文里 4 字连续汉字片段，用于判断选项是否与正文同源 */
function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const body = shingles(doc);

test('正文规模实测：9584 汉字', () => {
  assert.strictEqual(hanzi(doc), 9584);
});

test('分节实测：8 个二级节', () => {
  assert.strictEqual(sections().length, 8);
  assert.ok(sections().includes('代价与边界'), '缺少「代价与边界」一节');
});

test('小节与表格实测：12 个三级小节，1 张表', () => {
  assert.strictEqual(subsections().length, 12);
  assert.strictEqual(tables().length, 1);
  assert.strictEqual(tables().reduce((n, x) => n + x.rows, 0), 7);
});

test('逐节占比合计约等于一百，且每节非空', () => {
  const st = sectionStats();
  const sum = st.reduce((n, x) => n + x.share, 0);
  assert.ok(sum > 99 && sum < 101, '占比合计 ' + sum);
  for (const x of st) {
    if (/免责|运行与验证|课程信息/.test(x.title)) continue;
    assert.ok(x.hanzi > 0, '空节：' + x.title);
  }
});

test('本章算术自洽：倍差与密度可复算', () => {
  const a = arithmetic();
  assert.strictEqual(a.body, 9584);
  assert.strictEqual(a.sections, 7);
  assert.strictEqual(a.avg, 1273);
  assert.strictEqual(a.ratio, 6.35);
  assert.strictEqual(a.hits, 122);
  assert.strictEqual(a.density, 12.7);
});

test('关键词全部在正文出现，且分布可定位', () => {
  const hits = conceptHits();
  assert.strictEqual(hits.length, CONCEPTS.length);
  for (const c of hits) {
    assert.ok(c.total > 0, '未命中：' + c.term);
  }
  assert.deepStrictEqual(hits.map((c) => c.term), CONCEPTS);
});

test('边界条目至少 3 条', () => {
  assert.ok(boundaries().length >= 3);
});

test('quiz 结构齐：题数、分段、选项与下标', () => {
  const qs = quiz.questions;
  assert.ok(Array.isArray(qs) && qs.length >= 5, '题数不足：' + (qs || []).length);
  assert.strictEqual(String(quiz.chapter), String(CHAPTER));
  const stages = new Set(qs.map((q) => q.stage));
  for (const st of ['pre', 'check', 'post']) assert.ok(stages.has(st), '缺 ' + st + ' 段');
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4, '不是 4 选项：' + q.question);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, '下标非法：' + q.question);
  }
});

test('quiz 每题解释不少于 30 汉字', () => {
  for (const q of quiz.questions) {
    const n = (String(q.explain || '').match(/[\u4e00-\u9fff]/g) || []).length;
    assert.ok(n >= 30, '解释过短（' + n + '）：' + q.question);
  }
});

test('至少两道 check 题的正确选项落在正文原词上', () => {
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) => [...shingles(q.options[q.correct])].some((g) => body.has(g)));
  assert.ok(grounded.length >= 2, '接地的 check 题只有 ' + grounded.length + ' 道');
});

test('答案下标至少三种，不集中', () => {
  assert.ok(new Set(quiz.questions.map((q) => q.correct)).size >= 3);
});

test('quiz 无脚手架字样', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const re of [/三辨/, /四位面/, /单元规模/, /本章实测/, /这一章要回答什么/]) {
    assert.ok(!re.test(raw), '含脚手架字样：' + re);
  }
});

test('脚本可运行，输出含现算段与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('逐节汉字与占比'), '缺逐节段');
  assert.ok(out.includes('本章算术'), '缺算术段');
  assert.ok(!out.includes('✗'), '有关键词未命中');
  assert.match(out, /不构成用药建议/);
});
