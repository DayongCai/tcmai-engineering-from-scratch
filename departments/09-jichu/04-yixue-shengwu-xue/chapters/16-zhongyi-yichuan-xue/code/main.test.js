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
  readDoc, sections, hanzi, conceptTable, parallelLists, interfaces, quotations, triadMapping,
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

test('三个概念表：禀赋、胎养、体质，各带限度', () => {
  const rows = conceptTable();
  assert.strictEqual(rows.length, 3, '概念不是 3 个：' + rows.length);
  assert.deepStrictEqual(rows.map((r) => r.name), ['禀赋', '胎养', '体质']);
  for (const r of rows) assert.ok(r.limit.length >= 6, '限度描述过短：' + r.name);
});

test('可对读三处与不可对读三处各三条', () => {
  const p = parallelLists();
  assert.strictEqual(p.readable.length, 3, '可对读不是 3 处：' + p.readable.length);
  assert.strictEqual(p.notReadable.length, 3, '不可对读不是 3 处：' + p.notReadable.length);
  assert.ok(p.notReadable.includes('传递机制'));
  assert.ok(p.readable.some((x) => /时间维度/.test(x)));
});

test('三段结构对读：禀赋↔基因型、胎养↔环境暴露、体质↔表型', () => {
  const t = triadMapping();
  assert.strictEqual(t.length, 3);
  assert.deepStrictEqual(t.map((x) => x.zh), ['禀赋', '胎养', '体质']);
  assert.deepStrictEqual(t.map((x) => x.modern), ['基因型', '环境暴露', '表型']);
  for (const row of t) assert.strictEqual(row.present, true, '正文缺 ' + row.modern);
  assert.strictEqual(t[0].structuralOnly, true, '正文未明写只是结构层面对读');
});

test('研究接口三条与古籍引文三条都读得出来', () => {
  const i = interfaces();
  assert.strictEqual(i.length, 3, '接口不是 3 条：' + i.length);
  assert.ok(i.some((x) => /可测量化/.test(x)));
  const q = quotations();
  assert.strictEqual(q.length, 3, '引文不是 3 条：' + q.length);
  assert.ok(q.some((x) => /两精相搏/.test(x)));
  assert.ok(q.some((x) => /肾为先天之本/.test(x)));
});

test('判据词全部能在正文找到', () => {
  assert.deepStrictEqual(missing(), [], '正文缺失判据词：' + missing().join('、'));
});

test('边界声明至少三条，且不作优劣判断', () => {
  const b = boundaries();
  assert.ok(b.length >= 3, '边界条目过少：' + b.length);
  assert.ok(b.some((x) => /不评价|不比较|不作人群或个体的优劣判断/.test(x)), '边界缺中性表述条款');
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
  assert.ok(out.includes('三个概念（正文表格现算 3 个）'), '概念表未打印');
  assert.ok(out.includes('可对读三处（3 处）'), '可对读未打印');
  assert.ok(out.includes('不可对读三处（3 处）'), '不可对读未打印');
  assert.ok(out.includes('判据词命中'), '输出缺少判据词段');
  assert.ok(!out.includes('✗'), '有判据词未命中');
  assert.match(out, /本输出仅用于教学演示，不构成临床判断依据/);
});

test('脚本抬头指向本章正文', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(src.includes('/chapters/' + SLUG + '/docs/zh.md'), '头部注释未指向本章');
});
