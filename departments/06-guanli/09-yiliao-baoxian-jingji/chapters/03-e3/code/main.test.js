'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, parseTables, priceParams, purchaseTable, compute, verify } = require('./main.js');

const BODY = read();
const P = priceParams(BODY);
const T = purchaseTable(parseTables(BODY));
const C = compute(P, T);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下且标题一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '03-e3', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 3);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 3 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('价格管制参数读自正文：成本 18、挂号费 10、弹性 0.5、等候 72 分钟、时间成本 20 元/时', () => {
  assert.strictEqual(P.cost, 18);
  assert.strictEqual(P.fee, 10);
  assert.strictEqual(P.elasticity, 0.5);
  assert.strictEqual(P.waitMin, 72);
  assert.strictEqual(P.timeCost, 20);
});

test('供给收缩 −22.2%，等候 24 元，实际支付 34 元、比成本高 89%', () => {
  assert.strictEqual(C.supplyChange.toFixed(1), '-22.2');
  assert.strictEqual(C.waitCost, 24);
  assert.strictEqual(C.realPay, 34);
  assert.strictEqual(C.overCost.toFixed(0), '89');
  assert.ok(C.realPay > P.cost, '实际支付高于成本');
});

test('举办 600 万 = 380 + 100 + 120；购买 440 万 = 55 × 8 万；差额 160 万', () => {
  assert.deepStrictEqual(T.govParts, [380, 100, 120]);
  assert.strictEqual(C.govSum, 600);
  assert.strictEqual(T.perHead, 55);
  assert.strictEqual(T.people, 8);
  assert.strictEqual(C.buySum, 440);
  assert.strictEqual(C.diff, 160);
  assert.strictEqual(C.diffPct.toFixed(1), '-26.7');
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
  assert.match(r.stdout, /实际支付 34 元/);
  assert.match(r.stdout, /不构成对任何现行价格、采购或监管制度的评价意见/);
});
