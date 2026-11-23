#!/usr/bin/env node
/**
 * 第 13 章 剂型与煎服法：方剂的物理形态 —— 正文统计与习题契约的确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：本章正文的汉字数、二/三级节数、每张表的行列与数字列合计、
 * 引文条数与教材定位，以及 quiz 的题量、三段、四选项、解释长度、答案分布与正文接地。
 * 期望值是 docs/zh.md 的实测读数（main.js 现算，测试钉住）；正文一改，这里立刻报警。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { CHAPTER, TITLE, DOC, analyze, selfCheck } = require('./main.js');

const A = analyze();
const QUIZ = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
const BODY = fs.readFileSync(DOC, 'utf8');
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

/** 正文里 4 字以上的连续汉字片段，用来判「选项是否接地」 */
function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  return out;
}
const bodyGrams = shingles(BODY);

const EXPECT = {
  "hanzi": 6191,
  "paragraphs": 43,
  "h2": 7,
  "h3": 4,
  "tables": [
    [
      2,
      8
    ],
    [
      5,
      5
    ],
    [
      4,
      9
    ],
    [
      5,
      9
    ],
    [
      3,
      5
    ],
    [
      3,
      5
    ]
  ],
  "sums": [
    [
      3,
      "方数",
      114
    ],
    [
      4,
      "提及方数",
      110
    ],
    [
      4,
      "否定方数",
      8
    ],
    [
      4,
      "需用方数",
      102
    ],
    [
      4,
      "字面出现",
      147
    ]
  ],
  "quotes": 26,
  "anchored": 19,
  "chapters": [
    4
  ],
  "books": [
    "伤寒论·辨太阳病脉证并治"
  ]
};

test('规模：正文汉字、正文段、二三级节（实测值）', () => {
  assert.strictEqual(CHAPTER, 13);
  assert.match(A.h1, new RegExp(`^第 ${13} 章 · `));
  assert.strictEqual(A.hanzi, EXPECT.hanzi);
  assert.strictEqual(A.paragraphs, EXPECT.paragraphs);
  assert.strictEqual(A.h2.length, EXPECT.h2);
  assert.strictEqual(A.h3.length, EXPECT.h3);
  assert.ok(A.h2.length >= 4 && A.h2.length <= 8, `二级节 ${A.h2.length} 不在 4–8`);
  assert.ok(A.h2.some((t) => /代价与边界/.test(t)), '缺「代价与边界」');
});

test('表格尺寸（列 × 行）与实测值一致', () => {
  assert.deepStrictEqual(A.tables.map((t) => [t.cols, t.rows]), EXPECT.tables);
});

test('计数列合计与正文表内数字一致（实测值）', () => {
  const sums = [];
  for (const t of A.tables) for (const c of t.numeric) sums.push([t.idx, c.name, c.sum]);
  assert.deepStrictEqual(sums, EXPECT.sums);
  for (const t of A.tables) for (const c of t.numeric) {
    if (c.ok === false) assert.fail(`表 ${t.idx}「${c.name}」数据行合计 ${c.sum} ≠ 合计行 ${c.declared}`);
  }
});

test('引文与教材定位（实测值）', () => {
  assert.strictEqual(A.quotes, EXPECT.quotes);
  assert.strictEqual(A.anchored, EXPECT.anchored);
  assert.deepStrictEqual(A.chapters, EXPECT.chapters);
  assert.deepStrictEqual(A.books, EXPECT.books);
  assert.ok(A.anchored >= 2, `挂教材出处的引文只有 ${A.anchored} 条`);
});

test('正文自检通过，MOTTO 是《书名·篇名》', () => {
  assert.strictEqual(selfCheck(A), true);
  assert.ok(A.books.length === 1 && /·/.test(A.books[0]), `MOTTO 书证不是《书名·篇名》：${A.books.join('/')}`);
});

test('quiz 结构：6 题、三段齐、4 选项、explain ≥30 汉字、答案打散', () => {
  const qs = QUIZ.questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), '缺 ' + s);
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4, q.question);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, q.question);
    assert.ok((String(q.explain).match(HANZI) || []).length >= 30, q.question);
    assert.ok((String(q.explanation).match(HANZI) || []).length >= 30, q.question);
    assert.strictEqual(new Set(q.options).size, 4, q.question);
  }
  assert.ok(new Set(qs.map((q) => q.correct)).size >= 3, '答案过于集中');
  assert.deepStrictEqual(qs.map((q) => q.stage), ['pre', 'check', 'check', 'check', 'post', 'post']);
});

test('quiz 接地：≥2 道 check 题的正确选项能在正文找到 4 字原词', () => {
  const grounded = QUIZ.questions.filter((q) => {
    if (q.stage !== 'check') return false;
    const grams = shingles(String(q.options[q.correct]));
    return [...grams].some((g) => bodyGrams.has(g));
  });
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
});

test('quiz 与代码都不含旧脚手架指纹', () => {
  const bad = /三辨|四位面|单元规模|本章实测|本课第\s*\d+\s*章[（(]|见\s*code\/main\.js\s*输出/;
  assert.ok(!bad.test(JSON.stringify(QUIZ)));
  assert.ok(!bad.test(fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8')));
});

test('脚本可运行，退出码 0，最后一行是教学边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 200, '输出过短');
  const last = out.trim().split('\n').filter(Boolean).pop();
  assert.ok(/教学边界/.test(last) && /不构成/.test(last), `最后一行不是教学边界：${last}`);
});
