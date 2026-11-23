#!/usr/bin/env node
/**
 * 第 1 章 体质的概念与九种体质类型 —— 确定性单元测试
 * 运行: node --test chapters/01-tizhi-gainian/code/main.test.js
 *
 * 断言只落在可对账的结构上：132 证、208 次配对、82 个病名、九质逐项计数，
 * 以及 quiz 的题量、三段、四选项、解释长度与正文接地。
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
const row = (type) => A.rows.find((r) => r.type === type);

test('总账：132 证、208 次病证配对、82 个去重病名', () => {
  assert.strictEqual(A.total, 132);
  assert.strictEqual(A.pairs, 208);
  assert.strictEqual(A.diseases, 82);
});

test('九质逐项计数与正文表一致', () => {
  const expect = {
    湿热质: [37, 41, 2],
    阴虚质: [18, 29, 3],
    气虚质: [17, 19, 0],
    血瘀质: [16, 29, 3],
    特禀质: [10, 9, 1],
    痰湿质: [9, 12, 0],
    阳虚质: [7, 8, 0],
    气郁质: [7, 14, 1],
    平和质: [0, 0, 0],
    未归类: [11, 11, 0],
  };
  for (const [type, [z, d, c]] of Object.entries(expect)) {
    const r = row(type);
    assert.ok(r, type);
    assert.deepStrictEqual([r.zhengCount, r.diseaseCount, r.cross2], [z, d, c], type);
  }
});

test('复算闭合：证候 132、配对 208、各质覆盖相加 172', () => {
  assert.strictEqual(A.rows.reduce((s, r) => s + r.zhengCount, 0), 132);
  assert.strictEqual(A.pairs, 208);
  assert.strictEqual(A.coverageSum, 172);
  assert.strictEqual(A.pairs - A.coverageSum, 36, '同一病名落在多个质的重复次数');
  assert.strictEqual(A.crossSum, 10);
  assert.strictEqual(A.pinghe.zhengCount, 0);
});

test('最大一族是湿热质，占 132 证的 28.0%', () => {
  assert.strictEqual(A.top.type, '湿热质');
  assert.strictEqual(A.top.zhengCount, 37);
  assert.strictEqual((A.share * 100).toFixed(1), '28.0');
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

test('脚本可运行并输出复算口径', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /证候 132/);
  assert.match(r.stdout, /病证配对 208/);
  assert.match(r.stdout, /不构成诊疗建议/);
});
