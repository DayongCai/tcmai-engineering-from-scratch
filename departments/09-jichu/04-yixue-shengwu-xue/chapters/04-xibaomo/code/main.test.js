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
  readDoc, sections, hanzi, geometry, transportTable, failureClasses, lipidConstraints,
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

test('厚度比按正文口径现算为 1/2000', () => {
  const g = geometry();
  assert.ok(g, '没读到直径或膜厚');
  assert.strictEqual(g.diameterUm, 10);
  assert.strictEqual(g.thicknessNm, 5);
  assert.strictEqual(g.thicknessRatio, 2000);
});

test('正文表面积与直径口径同源：r=5 μm 算得 314 μm²', () => {
  const g = geometry();
  assert.strictEqual(g.shown, 314);
  assert.strictEqual(g.shownMatchesDiameter, true, 'r=5 μm 应算得 314');
  assert.ok(g.areaFromDiameter < g.areaFromRadius);
});

test('三种运输方式解析出 3 行，各有能量来源与饱和性', () => {
  const rows = transportTable();
  assert.strictEqual(rows.length, 3, '运输表行数不是 3：' + rows.length);
  for (const r of rows) {
    assert.ok(r.energy.length >= 2, '能量来源缺失：' + r.mode);
    assert.ok(r.saturable.length >= 2, '饱和性缺失：' + r.mode);
  }
  assert.ok(rows.some((r) => /主动运输/.test(r.mode) && /ATP/.test(r.energy)));
});

test('四类失效与三条脂质约束都数得出来', () => {
  const f = failureClasses();
  assert.strictEqual(f.length, 4, '失效类别不是 4：' + f.length);
  for (const x of f) assert.match(x, /失效$/);
  const l = lipidConstraints();
  assert.strictEqual(l.length, 3, '脂质约束不是 3 条：' + l.length);
  assert.deepStrictEqual(l, ['厚度', '曲率', '不对称']);
});

test('判据词全部能在正文找到', () => {
  assert.deepStrictEqual(missing(), [], '正文缺失判据词：' + missing().join('、'));
});

test('边界声明至少三条且带口径说明', () => {
  const b = boundaries();
  assert.ok(b.length >= 3, '边界条目过少：' + b.length);
  assert.ok(b.some((x) => /演算|常引口径|不作判读依据/.test(x)), '边界条目缺少口径说明');
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
  assert.ok(out.includes('厚度账（正文口径现算）'), '输出缺少厚度账段');
  assert.ok(out.includes('1/2,000'), '厚度比未打印');
  assert.ok(out.includes('判据词命中'), '输出缺少判据词段');
  assert.ok(!out.includes('✗'), '有判据词未命中');
  assert.match(out, /本输出仅用于教学演示，不构成临床判断依据/);
});

test('脚本抬头指向本章正文', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(src.includes('/chapters/' + SLUG + '/docs/zh.md'), '头部注释未指向本章');
});
