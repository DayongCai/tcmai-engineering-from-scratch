'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, parseTables, params, recall, precision, f1, structure, compute, verify } = require('./main.js');

const BODY = read();
const P = params(BODY);
const S = structure(BODY, parseTables(BODY));
const C = compute(P);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下且标题与章号一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '05-i5', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 5);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 5 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('参数读自正文演算段落，不是手打常量', () => {
  assert.deepStrictEqual(P, { gold: 40, hitsA: 52, relA: 26, hitsB: 96, relB: 36 });
});

test('A 式 65%/50%，扩展后 90%/37.5%，与正文一致', () => {
  assert.strictEqual((C.rA * 100).toFixed(0), '65');
  assert.strictEqual((C.pA * 100).toFixed(0), '50');
  assert.strictEqual((C.rB * 100).toFixed(0), '90');
  assert.strictEqual((C.pB * 100).toFixed(1), '37.5');
});

test('扩展同义词：查全 +25 点、查准 −12.5 点，F1 反而下降', () => {
  assert.strictEqual(C.recallGain.toFixed(0), '25');
  assert.strictEqual(C.precisionLoss.toFixed(1), '12.5');
  assert.ok(C.f1B < C.f1A);
  assert.strictEqual(C.f1A.toFixed(3), '0.565');
  assert.strictEqual(C.f1B.toFixed(3), '0.529');
});

test('漏检篇数随扩展下降：14 → 4', () => {
  assert.strictEqual(C.missedA, 14);
  assert.strictEqual(C.missedB, 4);
});

test('比率定义可直接调用，边界不崩', () => {
  assert.strictEqual(recall(1, 4), 0.25);
  assert.strictEqual(precision(1, 4), 0.25);
  assert.strictEqual(f1(0, 0), 0);
  assert.strictEqual(f1(1, 1), 1);
});

test('结构清点：四变量、PICO 四项、三种组织要求、三种云模式', () => {
  assert.strictEqual(S.四变量, 4);
  assert.strictEqual(S.PICO, 4);
  assert.strictEqual(S.组织, 3);
  assert.strictEqual(S.模式, 3);
  assert.strictEqual(S.云模式行数, 3);
});

test('正文与复算对得上（verify 不抛错）', () => {
  assert.doesNotThrow(() => verify(C, S, BODY));
});

test('quiz 的 check 题正确选项落在本章正文里（≥2 道）', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const body = shingles(BODY);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) => {
    const right = String(q.options[q.correct] || '');
    return [...shingles(right)].some((s) => body.has(s));
  });
  assert.ok(checks.length >= 2);
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /查准率 −12\.5 个百分点/);
  assert.match(r.stdout, /不构成检索策略或临床用药建议/);
});
