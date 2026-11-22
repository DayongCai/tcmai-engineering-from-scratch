'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, parseTables, spiralParams, spiralTable, compute, moralHazard, deductible, verify } = require('./main.js');

const BODY = read();
const P = spiralParams(BODY);
const TABLE = spiralTable(parseTables(BODY));
const C = compute(P);
const MH = moralHazard(BODY);
const DD = deductible(BODY);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下且标题一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '05-e5', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 5);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 5 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('螺旋初始条件读自正文：10 万人、1,500 与 5,250 元、6 比 4、保费 3,000、退出 15%', () => {
  assert.strictEqual(P.n0, 100000);
  assert.strictEqual(P.lowCost, 1500);
  assert.strictEqual(P.highCost, 5250);
  assert.strictEqual(P.lowShare, 0.6);
  assert.strictEqual(P.premium, 3000);
  assert.strictEqual(P.exitRate, 0.15);
});

test('初始均价 3,000 元是加权结果，不是任取一档', () => {
  const r0 = C.series[0];
  assert.strictEqual(r0.avg, 3000);
  assert.ok(Math.abs(P.lowCost * P.lowShare + P.highCost * (1 - P.lowShare) - P.premium) < 1e-9);
});

test('螺旋七行逐行可复现：人数、低风险人数、均价、涨幅', () => {
  const want = [
    [1, 91000, 51000, 3148],
    [2, 83350, 43350, 3300],
    [3, 76848, 36848, 3452],
    [4, 71320, 31320, 3603],
    [5, 66622, 26622, 3752],
  ];
  for (const [k, n, low, avg] of want) {
    const got = C.series.find((x) => x.round === k);
    assert.strictEqual(got.n, n, `第 ${k} 轮人数`);
    assert.strictEqual(got.low, low, `第 ${k} 轮低风险人数`);
    assert.ok(Math.abs(got.avg - avg) < 0.5, `第 ${k} 轮均价 ${got.avg}`);
  }
  assert.strictEqual(TABLE.length, 7);
});

test('稳态只剩 4 万人、人均 5,250 元，比初始保费高 75%', () => {
  assert.strictEqual(C.steady.n, 40000);
  assert.strictEqual(C.steady.low, 0);
  assert.strictEqual(C.steady.avg, 5250);
  assert.strictEqual(C.steady.rel, 75);
  assert.ok(C.steady.avg > C.series[5].avg);
});

test('患者侧道德风险：共付 20% 在两档弹性下 +38.0% 与 +62.1%', () => {
  assert.deepStrictEqual(MH.eps, [-0.2, -0.3]);
  assert.strictEqual(MH.effects[0].toFixed(1), '38.0');
  assert.strictEqual(MH.effects[1].toFixed(1), '62.1');
});

test('免赔额：100 万笔 × 60% × 30 元 = 1,800 万元', () => {
  assert.strictEqual(DD.cases, 1e6);
  assert.strictEqual(DD.perCase, 30);
  assert.strictEqual(DD.smallShare, 0.6);
  assert.strictEqual(DD.saved, 1.8e7);
});

test('正文与复算对得上（verify 不抛错）', () => {
  assert.doesNotThrow(() => verify(C, TABLE, MH, DD, BODY));
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
  assert.match(r.stdout, /稳态 ·\s+40,000 人/);
  assert.match(r.stdout, /不构成任何保险产品设计、费率厘定或参保建议/);
});
