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
  readDoc, sections, hanzi, cnToNumber, codingBudget, carrierMath, scaleTable, gates,
  consultSteps, missing, boundaries, summarize, CHAPTER, SLUG,
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

test('中文数量解析对本章用到的口径成立', () => {
  assert.strictEqual(cnToNumber('三十亿'), 3e9);
  assert.strictEqual(cnToNumber('四千八百万'), 4.8e7);
  assert.strictEqual(cnToNumber('万'), 1e4);
});

test('编码区账：按 1.5% 现算 4.5e7，与正文一致', () => {
  const b = codingBudget();
  assert.ok(b, '没读到基因组口径');
  assert.strictEqual(b.bases, 3e9);
  assert.strictEqual(b.lo, 0.01);
  assert.strictEqual(b.hi, 0.02);
  assert.strictEqual(b.share, 0.015);
  assert.strictEqual(b.shown, 4.5e7);
  assert.strictEqual(b.computed, 4.5e7);
  assert.strictEqual(b.shownInBand, true, '正文数应落在 1%–2% 区间内');
  assert.strictEqual(b.reproduce, true, '1.5% 应精确复现 4.5e7');
  assert.ok(Math.abs(b.shownShare - 0.015) < 1e-9);
});

test('咨询概率：两携带者 1/4，随机婚配 0.01² = 万分之一', () => {
  const c = carrierMath();
  assert.ok(c, '没读到等位基因频率');
  assert.strictEqual(c.freq, 0.01);
  assert.strictEqual(c.carrierCross, 0.25);
  assert.ok(Math.abs(c.randomAffected - 1e-4) < 1e-12);
  assert.strictEqual(c.randomDenominator, 10000);
  assert.strictEqual(c.statedDenominator, 10000, '正文分母与现算不符');
  assert.ok(Math.abs(c.fold - 2500) < 1e-6);
});

test('变异三尺度与四道关、咨询四步都数得出来', () => {
  const s3 = scaleTable();
  assert.strictEqual(s3.length, 3, '尺度不是 3 层：' + s3.length);
  assert.deepStrictEqual(s3.map((x) => x.scale), ['序列级', '拷贝数级', '染色体级']);
  assert.strictEqual(gates().length, 4, '关口不是 4 道');
  assert.strictEqual(consultSteps().length, 4, '咨询不是 4 步');
  assert.match(consultSteps()[3], /说限度/);
});

test('判据词全部能在正文找到', () => {
  assert.deepStrictEqual(missing(), [], '正文缺失判据词：' + missing().join('、'));
});

test('边界声明至少三条且标明演算示例', () => {
  const b = boundaries();
  assert.ok(b.length >= 3, '边界条目过少：' + b.length);
  assert.ok(b.some((x) => /演算示例/.test(x)), '边界未交代万分之一是演算示例');
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
  assert.ok(out.includes('编码区账（正文口径现算）'), '输出缺少编码区段');
  assert.ok(out.includes('落在所标区间之内'), '区间判定未打印');
  assert.ok(out.includes('四道关（4 道）'), '四道关未打印');
  assert.ok(out.includes('判据词命中'), '输出缺少判据词段');
  assert.ok(!out.includes('✗'), '有判据词未命中');
  assert.match(out, /本输出仅用于教学演示，不构成临床判断依据/);
});

test('脚本抬头指向本章正文', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(src.includes('/chapters/' + SLUG + '/docs/zh.md'), '头部注释未指向本章');
});
