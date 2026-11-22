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
  readDoc, sections, hanzi, radiusTable, sphereVolume, sphereArea, vsRatio,
  areaPerVolume, tableDrift, equalVolumeSwap, missing, boundaries, summarize,
  CHAPTER, SLUG,
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

test('半径表 5 行，半径依次为 0.5 / 5 / 10 / 25 / 50 μm', () => {
  const rows = radiusTable();
  assert.strictEqual(rows.length, 5, '表格行数不是 5：' + rows.length);
  assert.deepStrictEqual(rows.map((r) => r.r), [0.5, 5, 10, 25, 50]);
});

test('表格每个数都能用 4πr³/3 与 r/3 复算到显示精度', () => {
  assert.deepStrictEqual(tableDrift(), [], '表格与公式不符：' + JSON.stringify(tableDrift()));
});

test('正文引用的 V/S 与算出的 r/3 一致（3.33 与 16.67）', () => {
  const rows = new Map(radiusTable().map((r) => [r.r, r]));
  assert.strictEqual(rows.get(10).vs, 3.33);
  assert.strictEqual(rows.get(50).vs, 16.67);
  assert.ok(Math.abs(vsRatio(10) - 3.33) < 0.01);
  assert.ok(Math.abs(vsRatio(50) - 16.67) < 0.01);
  assert.ok(Math.abs(areaPerVolume(50) / areaPerVolume(10) - 0.2) < 1e-9, 'r=50 的膜面积只剩 r=10 的五分之一');
});

test('体积按 r³ 增长、面积按 r² 增长，等体积换算自洽', () => {
  assert.ok(Math.abs(sphereVolume(10) / sphereVolume(5) - 8) < 1e-9);
  assert.ok(Math.abs(sphereArea(10) / sphereArea(5) - 4) < 1e-9);
  const swap = equalVolumeSwap(10, 5);
  assert.strictEqual(swap.n, 8);
  assert.ok(Math.abs(swap.surfaceRatio - 2) < 1e-9, '同体积总表面积比应为 2');
  assert.ok(Math.abs(swap.areaRatio - 0.5) < 1e-9, '单位体积可用膜面积比应为 0.5');
});

test('判据词全部能在正文找到', () => {
  assert.deepStrictEqual(missing(), [], '正文缺失判据词：' + missing().join('、'));
});

test('边界声明至少三条且标明表格是演算', () => {
  const b = boundaries();
  assert.ok(b.length >= 3, '边界条目过少：' + b.length);
  assert.ok(b.some((x) => /演算/.test(x)), '边界未交代表格为演算值');
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

test('quiz 里的数字与正文表格一致', () => {
  const raw = JSON.stringify(quiz);
  assert.match(raw, /3\.33/);
  assert.match(raw, /16\.67/);
  const rows = new Map(radiusTable().map((r) => [r.r, r]));
  assert.strictEqual(rows.get(10).vs, 3.33);
  assert.strictEqual(rows.get(50).vs, 16.67);
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
  assert.ok(out.includes('半径表复算'), '输出缺少复算段');
  assert.ok(out.includes('超差行：无'), '表格复算有超差行');
  assert.ok(out.includes('判据词命中'), '输出缺少判据词段');
  assert.ok(!out.includes('✗'), '有判据词未命中');
  assert.match(out, /本输出仅用于教学演示，不构成临床判断依据/);
});

test('脚本抬头指向本章正文', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(src.includes('/chapters/' + SLUG + '/docs/zh.md'), '头部注释未指向本章');
});
