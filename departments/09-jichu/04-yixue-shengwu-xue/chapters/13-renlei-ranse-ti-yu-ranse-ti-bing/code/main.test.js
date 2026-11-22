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
  readDoc, sections, hanzi, karyotypeMath, resolutionGap, structureTable, numberedIn,
  mosaicismVars, missing, boundaries, summarize, CHAPTER, SLUG,
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

test('可数化：46 条、23 对、2²³ = 8,388,608 种自由组合', () => {
  const k = karyotypeMath();
  assert.ok(k, '没读到染色体数');
  assert.strictEqual(k.total, 46);
  assert.strictEqual(k.pairs, 23);
  assert.strictEqual(k.combinations, 8388608);
});

test('分辨极限与基因尺度相差两三个数量级', () => {
  const g = resolutionGap();
  assert.ok(g, '没读到分辨极限或基因长度');
  assert.strictEqual(g.loMb, 5);
  assert.strictEqual(g.hiMb, 10);
  assert.strictEqual(g.fuzzy, true, '正文写的是「几十千碱基对」');
  assert.strictEqual(g.ordersLow, 2);
  assert.strictEqual(g.ordersHigh, 3);
});

test('结构异常五类，平衡与不平衡分得开', () => {
  const rows = structureTable();
  assert.strictEqual(rows.length, 5, '结构异常不是 5 类：' + rows.length);
  const bal = rows.find((r) => /易位（平衡）/.test(r.type));
  const unbal = rows.find((r) => /易位（不平衡）/.test(r.type));
  assert.ok(bal && unbal, '没解析出平衡／不平衡易位');
  assert.match(bal.dosage, /^无$/);
  assert.match(unbal.dosage, /^有$/);
});

test('三体可活三条原因与嵌合三变量都读得出来', () => {
  const t = numberedIn(doc, /^##\s*三、数目异常/);
  assert.strictEqual(t.length, 3, '三体原因不是 3 条：' + t.length);
  const m = mosaicismVars();
  assert.strictEqual(m.length, 3, '嵌合变量不是 3 个：' + m.length);
  assert.ok(m.some((x) => /比例/.test(x)));
  assert.ok(m.some((x) => /组织/.test(x)));
});

test('判据词全部能在正文找到', () => {
  assert.deepStrictEqual(missing(), [], '正文缺失判据词：' + missing().join('、'));
});

test('边界声明至少三条且标明组合数为演算', () => {
  const b = boundaries();
  assert.ok(b.length >= 3, '边界条目过少：' + b.length);
  assert.ok(b.some((x) => /演算/.test(x)), '边界未交代演算');
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
  assert.ok(out.includes('2^23 = 8,388,608'), '组合数未打印');
  assert.ok(out.includes('相差 2–3 个数量级'), '数量级落差未打印');
  assert.ok(out.includes('结构异常（正文表格现算 5 类）'), '结构表未打印');
  assert.ok(out.includes('判据词命中'), '输出缺少判据词段');
  assert.ok(!out.includes('✗'), '有判据词未命中');
  assert.match(out, /本输出仅用于教学演示，不构成临床判断依据/);
});

test('脚本抬头指向本章正文', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(src.includes('/chapters/' + SLUG + '/docs/zh.md'), '头部注释未指向本章');
});
