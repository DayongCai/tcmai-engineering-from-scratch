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
  readDoc, sections, hanzi, cnToNumber, codonMath, scaleTable, effectTable, codeProperties,
  geneBoundaryMissing, missing, boundaries, summarize, CHAPTER, SLUG,
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

test('密码算术：64 个密码子、20 种氨基酸、3 个终止信号，有义 61 个', () => {
  const c = codonMath();
  assert.ok(c, '没读到密码子口径');
  assert.strictEqual(c.total, 64);
  assert.strictEqual(c.amino, 20);
  assert.strictEqual(c.stop, 3);
  assert.strictEqual(c.sense, 61);
  assert.strictEqual(c.cube, 64);
  assert.ok(Math.abs(c.redundancy - 3.05) < 0.01);
});

test('突变表解析出五类，后果表解析出四档', () => {
  const s = scaleTable();
  assert.ok(s, '没读到尺度表');
  assert.strictEqual(s.rows.length, 5, '突变尺度不是 5 类：' + s.rows.length);
  assert.deepStrictEqual(s.rows.map((r) => r[0]), ['替换', '插入/缺失', '扩增', '剪接位点改变', '大片段重排']);
  const e = effectTable();
  assert.ok(e, '没读到后果表');
  assert.strictEqual(e.rows.length, 4, '后果不是 4 档：' + e.rows.length);
  assert.strictEqual(e.rows[3][0], '无影响');
});

test('基因边界漏掉三样、密码三条性质都数得出来', () => {
  const b = geneBoundaryMissing();
  assert.deepStrictEqual(b, ['调控区', '剪接信号', '非翻译区']);
  const p = codeProperties();
  assert.strictEqual(p.length, 3, '密码性质不是 3 条：' + p.length);
  assert.ok(p.some((x) => /简并/.test(x)));
});

test('判据词全部能在正文找到', () => {
  assert.deepStrictEqual(missing(), [], '正文缺失判据词：' + missing().join('、'));
});

test('边界声明至少三条，且标明 4³ 是定义性算术', () => {
  const b = boundaries();
  assert.ok(b.length >= 3, '边界条目过少：' + b.length);
  assert.ok(b.some((x) => /定义性算术/.test(x)), '边界未交代定义性算术');
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
  assert.ok(out.includes('密码的算术（正文口径现算）'), '输出缺少密码算术段');
  assert.ok(out.includes('平均每个氨基酸 3.05 个密码子'), '冗余度未打印');
  assert.ok(out.includes('突变五类（正文表格现算 5 类）'), '五类未打印');
  assert.ok(out.includes('后果四档（正文表格现算 4 档）'), '四档未打印');
  assert.ok(out.includes('判据词命中'), '输出缺少判据词段');
  assert.ok(!out.includes('✗'), '有判据词未命中');
  assert.match(out, /本输出仅用于教学演示，不构成临床判断依据/);
});

test('脚本抬头指向本章正文', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(src.includes('/chapters/' + SLUG + '/docs/zh.md'), '头部注释未指向本章');
});
