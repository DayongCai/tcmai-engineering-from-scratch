'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, parseTables, baseParams, sensitivity, tcmGap, compute, verify } = require('./main.js');

const BODY = read();
const P = baseParams(BODY);
const SENS = sensitivity(parseTables(BODY));
const TCM = tcmGap(BODY);
const C = compute(P, SENS);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下且标题一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '07-e7', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 7);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 7 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('方案参数读自正文：12,000/0.82 与 8,000/0.70，人均 GDP 8 万，阈值 3 倍，人群 10 万', () => {
  assert.strictEqual(P.newCost, 12000);
  assert.strictEqual(P.newEff, 0.82);
  assert.strictEqual(P.oldCost, 8000);
  assert.strictEqual(P.oldEff, 0.7);
  assert.strictEqual(P.gdp, 80000);
  assert.strictEqual(P.multiple, 3);
  assert.strictEqual(P.pop, 100000);
});

test('ICER 33,333 元/QALY，只有阈值 24 万 的七分之一', () => {
  assert.strictEqual(C.dC, 4000);
  assert.ok(Math.abs(C.dE - 0.12) < 1e-9);
  assert.strictEqual(C.icer.toFixed(0), '33333');
  assert.strictEqual(C.threshold, 240000);
  assert.ok(Math.abs(C.threshold / C.icer - 7.2) < 0.01);
});

test('临界 ΔE 反解为 0.0167 QALY', () => {
  assert.ok(Math.abs(C.critical - 0.016667) < 1e-5, String(C.critical));
  assert.ok(C.critical < C.dE, '临界值应远小于基准效应');
});

test('预算影响：10 万人 × 4,000 元 = 4 亿元；渗透 30% 仍 1.2 亿元', () => {
  assert.strictEqual(C.budget, 4e8);
  assert.strictEqual(C.budget30, 1.2e8);
});

test('敏感性表四行都能复算', () => {
  assert.strictEqual(SENS.length, 4);
  const want = [[0.12, 33333], [0.05, 80000], [0.0167, 239521], [0.01, 400000]];
  for (const [dE, icer] of want) {
    const row = C.sens.find((r) => Math.abs(r.dE - dE) < 1e-9);
    assert.ok(row, String(dE));
    assert.ok(Math.abs(row.calc - icer) < 2, `${dE}: ${row.calc}`);
  }
  const flip = C.sens.find((r) => r.dE === 0.01);
  assert.ok(flip.calc > C.threshold, 'ΔE=0.01 时结论应翻转');
});

test('贴现 3% 十年 = 0.744；降价到 10,000 后 ICER 16,667、年支出 2 亿', () => {
  assert.strictEqual(C.discount.toFixed(3), '0.744');
  assert.strictEqual(C.priceCut.icer.toFixed(0), '16667');
  assert.strictEqual(C.priceCut.budget, 2e8);
});

test('中医缺口：证候积分差 0.7，映射 0.06 QALY，ICER 30,000', () => {
  assert.ok(Math.abs(TCM.diff - 0.7) < 1e-9);
  assert.strictEqual(TCM.qaly, 0.06);
  assert.strictEqual(TCM.cost, 1800);
  assert.ok(Math.abs(TCM.cost / TCM.qaly - 30000) < 0.5);
});

test('正文与复算对得上（verify 不抛错）', () => {
  assert.doesNotThrow(() => verify(P, C, SENS, TCM, BODY));
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
  assert.match(r.stdout, /ICER = 33333 元\/QALY/);
  assert.match(r.stdout, /不构成对任何药品、技术或疗法是否纳入报销的建议/);
});
