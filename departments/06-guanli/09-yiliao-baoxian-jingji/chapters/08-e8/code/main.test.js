'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, parseTables, fundParams, rollTable, auditParams, layers, compute, verify } = require('./main.js');

const BODY = read();
const TABLES = parseTables(BODY);
const P = fundParams(BODY);
const R = rollTable(TABLES);
const A = auditParams(BODY);
const L = layers(BODY);
const C = compute(P, A, L);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下且标题一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '08-e8', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 8);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 8 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('基金参数读自正文：1,000／1,060 亿、结余 300 亿、8% 与 5%', () => {
  assert.strictEqual(P.income, 1000);
  assert.strictEqual(P.spend, 1060);
  assert.strictEqual(P.reserve, 300);
  assert.strictEqual(P.spendGrowth, 0.08);
  assert.strictEqual(P.incomeGrowth, 0.05);
});

test('静态可支撑 5 年，滚动则第 3 年内转负', () => {
  assert.strictEqual(C.staticYears, 5);
  const y2 = C.rows.find((x) => x.year === 2);
  const y3 = C.rows.find((x) => x.year === 3);
  assert.ok(y2.balance > 0, String(y2.balance));
  assert.ok(y3.balance < 0, String(y3.balance));
  assert.ok(C.rows[5].cumGap / P.reserve > 3);
});

test('滚动表六行逐行可复算：支出、收入、缺口、余额', () => {
  assert.strictEqual(R.length, 6);
  for (const row of R) {
    const got = C.rows.find((x) => x.year === row.year);
    assert.ok(Math.abs(got.spend - row.spend) < 0.15, `第 ${row.year} 年支出`);
    assert.ok(Math.abs(got.income - row.income) < 0.15, `第 ${row.year} 年收入`);
    assert.ok(Math.abs(got.gap - row.gap) < 0.15, `第 ${row.year} 年缺口`);
    assert.ok(Math.abs(got.balance - row.balance) < 0.15, `第 ${row.year} 年余额`);
  }
  assert.ok(Math.abs(C.rows[5].cumGap - 974.2) < 0.2, String(C.rows[5].cumGap));
});

test('智能审核追回 12.72 亿，占支出 1.2%', () => {
  assert.strictEqual(A.hit, 0.03);
  assert.strictEqual(A.recover, 0.4);
  assert.ok(Math.abs(C.recover - 12.72) < 0.01, String(C.recover));
  assert.strictEqual(C.recoverShare.toFixed(1), '1.2');
});

test('多层次：7,000／1,800／600，累计报销 70／88／94%', () => {
  assert.deepStrictEqual(L.rates, [0.7, 0.6, 0.5]);
  assert.deepStrictEqual(C.paid, [7000, 1800, 600]);
  assert.deepStrictEqual(C.cumRate.map((x) => Math.round(x)), [70, 88, 94]);
  assert.strictEqual(C.finalSelf, 600);
});

test('正文与复算对得上（verify 不抛错）', () => {
  assert.doesNotThrow(() => verify(P, R, C, BODY));
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
  assert.match(r.stdout, /第 3 年内转负/);
  assert.match(r.stdout, /不构成对任何地区医保政策、支付标准或考核指标的建议/);
});
