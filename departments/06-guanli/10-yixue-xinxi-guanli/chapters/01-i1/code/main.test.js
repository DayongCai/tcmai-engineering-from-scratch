'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, parseTables, params, structure, compute, verify, fmt } = require('./main.js');

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
  assert.ok(DOC.endsWith(path.join('chapters', '01-i1', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 1);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 1 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('参数读自正文演算段落，不是手打常量', () => {
  assert.strictEqual(P.discharges, 32000);
  assert.strictEqual(P.fields, 180);
  assert.strictEqual(P.sampled, 500);
  assert.strictEqual(P.errors, 42);
  assert.strictEqual(P.weightImpact, 0.3);
  assert.strictEqual(P.pricePerWeight, 1.1);
});

test('抽样错误率 8.4%，全年约 2,688 份带错', () => {
  assert.strictEqual(C.errPct, '8.4');
  assert.strictEqual(C.badPerYear, 2688);
  assert.ok(Math.abs(C.errRate - 42 / 500) < 1e-12);
});

test('结算偏差落在 800 万元量级，且量级由复算决定', () => {
  assert.ok(C.deviation > 800 && C.deviation < 900, String(C.deviation));
  assert.strictEqual(C.magnitude, 800);
  assert.strictEqual(fmt(C.magnitude), '800');
});

test('三层、四类资源、七个阶段、六维清点与正文一致', () => {
  assert.strictEqual(S.layers, 3);
  assert.strictEqual(S.resources, 4);
  assert.strictEqual(S.stages, 7);
  assert.strictEqual(S.dimensions, 6);
  assert.deepStrictEqual(S.stageNames, ['业务流水', '病案摘要', '登记报告', '文献知识']);
  assert.ok(S.dimNames.includes('完整性') && S.dimNames.includes('唯一性'));
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
  assert.match(r.stdout, /全年约 2,688 份首页带错/);
  assert.match(r.stdout, /不构成信息化建设或数据权属意见/);
});
