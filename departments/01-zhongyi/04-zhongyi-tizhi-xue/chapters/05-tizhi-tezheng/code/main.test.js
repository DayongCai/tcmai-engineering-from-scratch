#!/usr/bin/env node
/**
 * 第 5 章 问卷到特征向量 —— 确定性单元测试
 * 运行: node --test chapters/05-tizhi-tezheng/code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, analyze, DOMAINS } = require('./main.js');

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

test('示意向量为 2/4/2/3，四域均分 2.75、最高域 4', () => {
  assert.deepStrictEqual(A.scores, [2, 4, 2, 3]);
  assert.strictEqual(A.mean, 2.75);
  assert.strictEqual(A.max, 4);
  assert.strictEqual(DOMAINS.length, 4);
});

test('九质 × 四域 = 36 个域内格子', () => {
  assert.strictEqual(A.types.length, 9);
  assert.strictEqual(A.grid, 36);
});

test('按关键域优先，只有气虚质在演示中成立', () => {
  assert.deepStrictEqual(A.passed, ['气虚质']);
  const by = Object.fromEntries(A.verdicts.map((v) => [v.type, v.pass]));
  assert.strictEqual(by['痰湿质'], false);
  assert.strictEqual(by['气郁质'], false);
  assert.strictEqual(by['气虚质'], true);
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

test('脚本可运行并声明示例值非标准', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /2\.75/);
  assert.match(r.stdout, /非量表标准/);
  assert.match(r.stdout, /不构成诊疗建议/);
});
