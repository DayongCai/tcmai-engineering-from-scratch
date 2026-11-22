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
  readDoc, sections, hanzi, layerTable, layerCoverage, cnNumber, scaleClaims,
  missing, boundaries, summarize, CONCEPTS, CHAPTER, SLUG,
} = require('./main.js');

const doc = readDoc();
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

/** 正文里 4 字以上的连续汉字片段，用于判断选项是否与正文同源 */
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
  assert.ok(s.length >= 4, '分节过少：' + s.length);
  assert.ok(s.includes('代价与边界'), '缺少「代价与边界」一节');
});

test('四层表能解析，且四层各有一条判断依据', () => {
  const rows = layerTable();
  assert.strictEqual(rows.length, 4, '四层表行数不是 4：' + rows.length);
  for (const r of rows) assert.ok(r.evidence.length >= 4, '判断依据过短：' + r.layer);
});

test('四层的章节区间恰好铺满第 2–16 章，无缺口无重叠', () => {
  const c = layerCoverage();
  assert.deepStrictEqual(c.missing, [], '章节缺口：' + c.missing.join('、'));
  assert.deepStrictEqual(c.overlaps, [], '章节重叠：' + c.overlaps.join('、'));
  assert.strictEqual(c.covered, 15, '覆盖章数不是 15：' + c.covered);
  assert.strictEqual(c.max, 16, '末章不是 16');
});

test('数量级口径与正文一致：细胞总数、细胞类型、编码基因', () => {
  const k = scaleClaims();
  assert.strictEqual(k.cellsLow, 1e13);
  assert.strictEqual(k.cellsHigh, 1e14);
  assert.strictEqual(k.types, 200, '细胞类型读成 ' + k.types);
  assert.strictEqual(k.genes, 20000, '编码基因读成 ' + k.genes);
  assert.strictEqual(k.cellsPerGene, 5e9);
  assert.strictEqual(k.cellsPerType, 5e11);
});

test('中文数字解析对本章用到的口径成立', () => {
  assert.strictEqual(cnNumber('二百'), 200);
  assert.strictEqual(cnNumber('两万'), 20000);
  assert.ok(Number.isNaN(cnNumber('三种')), '非数字不应被解析成数');
});

test('判据词全部能在正文找到', () => {
  assert.deepStrictEqual(missing(), [], '正文缺失判据词：' + missing().join('、'));
});

test('边界声明至少三条且带限制语', () => {
  const b = boundaries();
  assert.ok(b.length >= 3, '边界条目过少：' + b.length);
  assert.ok(b.some((x) => /不构成|不是本章的实测|不作为/.test(x)), '边界条目缺少限制语');
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
  assert.ok(out.includes('四层（正文表格现算）'), '输出缺少四层段');
  assert.ok(out.includes('判据词命中'), '输出缺少判据词段');
  assert.ok(!out.includes('✗'), '有判据词未命中');
  assert.match(out, /本输出仅用于教学演示，不构成临床判断依据/);
});

test('脚本抬头指向本章正文', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(src.includes('/chapters/' + SLUG + '/docs/zh.md'), '头部注释未指向本章');
  assert.ok(CONCEPTS.includes('常引口径'));
});
