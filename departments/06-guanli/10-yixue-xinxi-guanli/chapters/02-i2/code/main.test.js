'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, parseTables, problemCodes, diffBits, validate, structure, compute, verify } = require('./main.js');

const BODY = read();
const S = structure(BODY, parseTables(BODY));
const CODES = problemCodes(BODY);
const C = compute(CODES, S);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下且标题与章号一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '02-i2', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 2);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 2 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('三个主诊断读自 PROBLEM 段，不是手打常量', () => {
  assert.deepStrictEqual(CODES, ['J18.9', 'J44.0', 'J44.1']);
  assert.strictEqual(C.distinct, 3);
});

test('J44.0 与 J44.1 只差最后一位，J18.9 是另一个系统', () => {
  assert.strictEqual(diffBits('J44.0', 'J44.1'), 1);
  assert.strictEqual(diffBits('J44.0', 'J18.9'), 3);
  assert.strictEqual(C.minDiff, 1);
  assert.ok(C.oneBit);
});

test('标准四层、五种错法、数据元六项、互操作三级、映射表六列', () => {
  assert.strictEqual(S.layers, 4);
  assert.deepStrictEqual(S.layerNames, ['基础类', '方法类', '管理类', '应用类']);
  assert.strictEqual(S.errors, 5);
  assert.ok(S.errorNames.includes('过度编码') && S.errorNames.includes('版本混用'));
  assert.strictEqual(S.elements, 6);
  assert.strictEqual(S.interop, 3);
  assert.strictEqual(S.mapCols, 6);
});

test('前置校验抓逻辑矛盾、放过正常病例', () => {
  assert.strictEqual(validate({ code: 'N80.0', sex: 'M', ageDays: 15000 }).length, 1);
  assert.strictEqual(validate({ code: 'O80', sex: 'M', ageDays: 12000 }).length, 1);
  assert.strictEqual(validate({ code: 'P07.2', sex: 'F', ageDays: 60 }).length, 1);
  assert.strictEqual(validate({ code: 'C50.9', sex: 'F', ageDays: 16000, evidence: false }).length, 1);
  assert.deepStrictEqual(validate({ code: 'J44.1', sex: 'M', ageDays: 20000, evidence: true }), []);
  assert.deepStrictEqual(validate({ code: 'P07.2', sex: 'F', ageDays: 7 }), []);
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
  assert.match(r.stdout, /最小差异 1 位/);
  assert.match(r.stdout, /不构成编码指导或合规意见/);
});
