#!/usr/bin/env node
/**
 * 第 3 章 九种体质的判定与量表设计 —— 确定性单元测试
 * 运行: node --test chapters/03-tizhi-liangbiao/code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, analyze } = require('./main.js');

const A = analyze();
const QUIZ = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
const BODY = fs.readFileSync(DOC, 'utf8');
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const bodyGrams = shingles(BODY);

test('两质合计 55 证，占 132 证的 41.7%', () => {
  assert.deepStrictEqual(A.big.map((r) => [r.type, r.zhengCount]), [['湿热质', 37], ['阴虚质', 18]]);
  assert.strictEqual(A.bigSum, 55);
  assert.strictEqual(A.bigShare, 41.7);
});

test('两小质合计 16 证，占 12.1%，与两质相差 39 证', () => {
  assert.deepStrictEqual(A.small.map((r) => [r.type, r.zhengCount]), [['痰湿质', 9], ['阳虚质', 7]]);
  assert.strictEqual(A.smallSum, 16);
  assert.strictEqual(A.smallShare, 12.1);
  assert.strictEqual(A.gap, 39);
  assert.strictEqual(A.bigSum + A.smallSum, 71);
});

test('九质表逐项与证候库一致', () => {
  const counts = Object.fromEntries(A.rows.map((r) => [r.type, r.zhengCount]));
  assert.strictEqual(counts['湿热质'], 37);
  assert.strictEqual(counts['阴虚质'], 18);
  assert.strictEqual(counts['气虚质'], 17);
  assert.strictEqual(counts['血瘀质'], 16);
  assert.strictEqual(counts['特禀质'], 10);
  assert.strictEqual(counts['痰湿质'], 9);
  assert.strictEqual(counts['阳虚质'], 7);
  assert.strictEqual(counts['气郁质'], 7);
  assert.strictEqual(counts['平和质'], 0);
  assert.strictEqual(A.total, 132);
});

test('quiz 结构：≥5 题、三段齐、四选项、解释 ≥30 汉字', () => {
  const qs = QUIZ.questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), '缺 ' + s);
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4, q.question);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, q.question);
    assert.ok((q.explain.match(HANZI) || []).length >= 30, q.question);
  }
  assert.ok(new Set(qs.map((q) => q.correct)).size >= 3, '答案过于集中');
});

test('quiz 接地：至少 2 道 check 题的正确选项能在正文找到 4 字原词', () => {
  const grounded = QUIZ.questions.filter((q) => {
    if (q.stage !== 'check') return false;
    const grams = [...shingles(String(q.options[q.correct]))];
    return grams.some((g) => bodyGrams.has(g));
  });
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
});

test('quiz 与代码都不含旧脚手架指纹', () => {
  const bad = /三辨|四位面|单元规模|本章实测|本课第\s*\d+\s*章/;
  assert.ok(!bad.test(JSON.stringify(QUIZ)));
  assert.ok(!bad.test(fs.readFileSync(__filename.replace(/\.test\.js$/, '.js'), 'utf8')));
});

test('脚本可运行并输出大小质对比', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /55 证/);
  assert.match(r.stdout, /相差 39 证/);
  assert.match(r.stdout, /不构成诊疗建议/);
});
