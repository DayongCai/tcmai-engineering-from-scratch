'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const {
  readDoc, sections, hanzi, sqrtApproximation, claimDrift, numberedIn, scoreLimits,
  missing, boundaries, summarize, CHAPTER, SLUG,
} = require('./main.js');

const doc = readDoc();
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const body = shingles(doc);

test('正文可读，分节含「代价与边界」', () => {
  const s = sections();
  assert.ok(s.length >= 5, '分节过少：' + s.length);
  assert.ok(s.includes('代价与边界'), '缺少「代价与边界」一节');
});

test('平方根近似：千分之一 → 3.2%，百分之一 → 10%，与正文一致', () => {
  const { cases } = sqrtApproximation();
  assert.strictEqual(cases.length, 2, '患病率口径不是 2 个：' + cases.length);
  const small = cases.find((c) => Math.abs(c.p - 0.001) < 1e-12);
  const big = cases.find((c) => Math.abs(c.p - 0.01) < 1e-12);
  assert.ok(small && big, '没读到两个患病率口径');
  assert.ok(Math.abs(small.sqrtPct - 3.1623) < 0.01);
  assert.strictEqual(small.statedPct, 3.2);
  assert.ok(Math.abs(big.sqrtPct - 10) < 1e-9);
  assert.strictEqual(big.statedPct, 10);
  assert.deepStrictEqual(claimDrift(), [], '正文口径与 √p 现算有超差项');
});

test('相对风险：千分之一时约 32 倍、百分之一时约 10 倍', () => {
  const { cases } = sqrtApproximation();
  const small = cases.find((c) => Math.abs(c.p - 0.001) < 1e-12);
  const big = cases.find((c) => Math.abs(c.p - 0.01) < 1e-12);
  assert.ok(Math.abs(small.fold - 31.6) < 0.2);
  assert.ok(Math.abs(big.fold - 10) < 0.2);
});

test('关联研究四件不能说明的事、评分四条边界、家族史三条都数得出来', () => {
  const a = numberedIn(doc, /^##\s*四、关联研究/);
  assert.strictEqual(a.length, 4, '关联研究条目不是 4 件：' + a.length);
  const s = scoreLimits();
  assert.strictEqual(s.length, 4, '评分边界不是 4 条：' + s.length);
  const f = numberedIn(doc, /^##\s*六、临床读家族史/);
  assert.strictEqual(f.length, 3, '家族史不是 3 件：' + f.length);
});

test('判据词全部能在正文找到', () => {
  assert.deepStrictEqual(missing(), [], '正文缺失判据词：' + missing().join('、'));
});

test('边界声明至少三条，且标明 √p 是经验近似', () => {
  const b = boundaries();
  assert.ok(b.length >= 3, '边界条目过少：' + b.length);
  assert.ok(b.some((x) => /经验近似/.test(x)), '边界未交代经验近似');
});

test('quiz 结构齐：题数、分段、选项与下标', () => {
  const qs = quiz.questions;
  assert.ok(Array.isArray(qs) && qs.length >= 5, '题数不足：' + qs.length);
  assert.strictEqual(String(quiz.chapter), String(CHAPTER));
  const stages = new Set(qs.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), '缺 ' + s + ' 段');
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4, '不是 4 选项：' + q.question);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, '下标非法：' + q.question);
  }
});

test('quiz 每题解释不少于 30 汉字', () => {
  for (const q of quiz.questions) {
    const n = (q.explain.match(/[\u4e00-\u9fff]/g) || []).length;
    assert.ok(n >= 30, '解释过短（' + n + '）：' + q.question);
  }
});

test('至少两道 check 题的正确选项落在正文原词上', () => {
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) => [...shingles(q.options[q.correct])].some((g) => body.has(g)));
  assert.ok(grounded.length >= 2, '接地的 check 题只有 ' + grounded.length + ' 道');
});

test('答案打散，不集中在一个下标', () => {
  const idx = new Set(quiz.questions.map((q) => q.correct));
  assert.ok(idx.size >= 3, '正确下标只有 ' + idx.size + ' 种');
});

test('规模与正文一致且非空', () => {
  const s = summarize();
  assert.strictEqual(s.hanzi, hanzi(doc));
  assert.ok(s.hanzi > 2000, '汉字过少：' + s.hanzi);
});

test('脚本可运行并打印现算结果', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('平方根近似（正文口径读入后现算）'), '输出缺少近似段');
  assert.ok(out.includes('超差项：无'), '近似复算出现超差');
  assert.ok(out.includes('关联研究不能说明的四件事（4 件）'), '关联四条未打印');
  assert.ok(out.includes('家族史只读三件事（3 件）'), '家族史三条未打印');
  assert.ok(out.includes('判据词命中'), '输出缺少判据词段');
  assert.ok(!out.includes('✗'), '有判据词未命中');
  assert.match(out, /本输出仅用于教学演示，不构成临床判断依据/);
});

test('脚本抬头指向本章正文', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(src.includes('/chapters/' + SLUG + '/docs/zh.md'), '头部注释未指向本章');
});
