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
  readDoc, sections, hanzi, compression, nucleusVolume, packingLevels, stateTable,
  failureMechanisms, missing, boundaries, summarize, CHAPTER, SLUG,
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

test('压缩比按正文口径现算在 10^5 量级', () => {
  const c = compression();
  assert.ok(c, '没读到 DNA 总长');
  assert.strictEqual(c.dnaM, 2);
  assert.strictEqual(c.nucleusUm, 10);
  assert.ok(Math.abs(c.ratio - 2e5) < 1, '压缩比不是 2e5：' + c.ratio);
  assert.strictEqual(c.orders, 5);
  assert.ok(/十万/.test(c.claimZh), '正文口径不是十万量级：' + c.claimZh);
});

test('球状核体积按 4πr³/3 现算', () => {
  const v = nucleusVolume(10);
  assert.ok(Math.abs(v - (4 / 3) * Math.PI * 125) < 1e-9);
  assert.ok(v > 500 && v < 550);
});

test('三级压缩与两种染色质状态都数得出来', () => {
  const l = packingLevels();
  assert.strictEqual(l.length, 3, '压缩级数不是 3：' + l.length);
  assert.match(l[0], /核小体/);
  const t = stateTable();
  assert.strictEqual(t.length, 2, '染色质状态不是 2 种：' + t.length);
  const byState = new Map(t.map((x) => [x.state, x]));
  assert.ok(/较低/.test(byState.get('常染色质').packing));
  assert.ok(/较高/.test(byState.get('异染色质').packing));
});

test('核失效机制四类，第一类是核纤层失效', () => {
  const f = failureMechanisms();
  assert.strictEqual(f.length, 4, '机制不是 4 类：' + f.length);
  assert.strictEqual(f[0], '核纤层失效');
  assert.ok(f.some((x) => /运输/.test(x)));
});

test('判据词全部能在正文找到', () => {
  assert.deepStrictEqual(missing(), [], '正文缺失判据词：' + missing().join('、'));
});

test('边界声明至少三条，且标明压缩比为演算', () => {
  const b = boundaries();
  assert.ok(b.length >= 3, '边界条目过少：' + b.length);
  assert.ok(b.some((x) => /演算/.test(x)), '边界未交代压缩比是演算');
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
  assert.ok(out.includes('压缩比（正文口径现算）'), '输出缺少压缩比段');
  assert.ok(out.includes('2.0e+5'), '压缩比未打印');
  assert.ok(out.includes('三级压缩（正文现算 3 级）'), '三级压缩未打印');
  assert.ok(out.includes('判据词命中'), '输出缺少判据词段');
  assert.ok(!out.includes('✗'), '有判据词未命中');
  assert.match(out, /本输出仅用于教学演示，不构成临床判断依据/);
});

test('脚本抬头指向本章正文', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(src.includes('/chapters/' + SLUG + '/docs/zh.md'), '头部注释未指向本章');
});
