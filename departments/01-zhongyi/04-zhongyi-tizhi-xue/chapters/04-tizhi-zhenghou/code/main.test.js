#!/usr/bin/env node
/**
 * 第 4 章 体质与证候 —— 确定性单元测试
 * 运行: node --test chapters/04-tizhi-zhenghou/code/main.test.js
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

test('跨两科证候 10 个，占 132 证的 7.6%', () => {
  assert.strictEqual(A.cross.length, 10);
  assert.strictEqual(A.total, 132);
  assert.strictEqual(A.crossShare, 7.6);
  assert.strictEqual(A.oneInEvery, 13.2);
});

test('跨科清单与证候库一致，且每个都带两个科', () => {
  assert.deepStrictEqual(A.cross.map((x) => x.name).sort(), [
    '寒凝血瘀证', '寒湿凝滞证', '湿热下注证', '湿热瘀结证', '热毒蕴结证',
    '气滞血瘀证', '肝经郁热证', '血虚风燥证', '阴虚火旺证', '阴虚津亏证',
  ].sort());
  for (const x of A.cross) assert.deepStrictEqual(x.courses, ['fuke', 'waike']);
});

test('九质计数仍与总账一致', () => {
  assert.strictEqual(A.pairs, 208);
  assert.strictEqual(A.diseases, 82);
  assert.strictEqual(A.rows.reduce((s, r) => s + r.zhengCount, 0), 132);
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

test('脚本可运行并输出跨科清单', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /跨两科证候 10/);
  assert.match(r.stdout, /气滞血瘀证/);
  assert.match(r.stdout, /不构成诊疗建议/);
});
