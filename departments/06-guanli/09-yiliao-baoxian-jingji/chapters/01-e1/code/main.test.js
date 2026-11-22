'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, parseTables, params, compute, verify, fmt } = require('./main.js');

const BODY = read();
const P = params(parseTables(BODY));
const C = compute(P);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下且标题与章号一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '01-e1', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 1);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 1 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('参数读自正文表格，不是手打常量', () => {
  assert.strictEqual(P.feeStart, 1000);
  assert.strictEqual(P.feeEnd, 2000);
  assert.strictEqual(P.gdpEnd, 15000);
  assert.strictEqual(P.defFee, 1.35);
  assert.strictEqual(P.defGdp, 1.25);
  assert.strictEqual(P.shareStart, 10);
  assert.strictEqual(P.shareEnd, 13.3);
});

test('名义翻倍，实际只增 48.1%：两个平减指数不能混用', () => {
  assert.strictEqual(fmt(C.realFee), '1,481');
  assert.strictEqual(C.realFeeGrowth.toFixed(1), '48.1');
  assert.strictEqual(C.realGdpGrowth.toFixed(1), '20.0');
  assert.ok(C.realMultiple < C.nominalMultiple);
  assert.ok(Math.abs(C.realMultiple - 1.4815) < 0.001);
});

test('3.3 个百分点拆成 1.0 价格 + 2.3 数量覆盖，且拆得全', () => {
  assert.strictEqual(C.realShare.toFixed(2), '12.35');
  assert.strictEqual(C.pricePart.toFixed(1), '1.0');
  assert.strictEqual(C.realShareDelta.toFixed(1), '2.3');
  assert.ok(Math.abs(C.pricePart + C.realShareDelta - C.nominalShareDelta) < 1e-9);
});

test('年龄结构 1.097 倍，只解释实际增长的五分之一左右', () => {
  assert.ok(Math.abs(C.ageFactor - 1.0968) < 0.001, String(C.ageFactor));
  assert.strictEqual(C.agePct.toFixed(1), '9.7');
  assert.ok(C.agePct < C.realFeeGrowth / 4.5);
  assert.ok(C.agePct > C.realFeeGrowth / 6.5);
});

test('正文与复算对得上（verify 不抛错）', () => {
  assert.doesNotThrow(() => verify(C, BODY));
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
  assert.match(r.stdout, /价格相对变贵 1\.0 个百分点/);
  assert.match(r.stdout, /不构成医保或财政决策依据/);
});
