#!/usr/bin/env node
/**
 * 第 2 章 体质的形成：底板与漂移 —— 确定性单元测试
 * 运行: node --test chapters/02-tizhi-chengyin/code/main.test.js
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

test('老年常见五质合计 67 证，占 132 证的 51%', () => {
  assert.deepStrictEqual(A.five.map((r) => r.zhengCount), [17, 7, 18, 9, 16]);
  assert.strictEqual(A.fiveSum, 67);
  assert.strictEqual(A.sharePct, 51);
  assert.strictEqual(A.total, 132);
});

test('五质分项与体质库一致，且分母是证候不是人', () => {
  assert.deepStrictEqual(A.five.map((r) => r.type), ['气虚质', '阳虚质', '阴虚质', '痰湿质', '血瘀质']);
  assert.deepStrictEqual(A.five.map((r) => r.diseaseCount), [19, 8, 29, 12, 29]);
  assert.ok(A.sharePct < 100);
});

test('扩散度由病名数除以证候数现算：气郁 2.0、血瘀 1.8、阴虚 1.6', () => {
  assert.strictEqual(A.diffusion['气郁质'], 2);
  assert.strictEqual(A.diffusion['血瘀质'], 1.8);
  assert.strictEqual(A.diffusion['阴虚质'], 1.6);
  assert.strictEqual(A.diffusion['气虚质'], 1.1);
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

test('脚本可运行并输出分母提醒', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /67 证/);
  assert.match(r.stdout, /不是人数/);
  assert.match(r.stdout, /不构成诊疗建议/);
});
