'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, parseTables, params, structure, compute, verify } = require('./main.js');

const BODY = read();
const P = params(BODY);
const S = structure(parseTables(BODY));
const C = compute(P);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^一-鿿]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下，标题与章号一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '08-z118', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 8);
  assert.strictEqual(BODY.split('\n')[0], '# 第 8 章 · ' + TITLE);
});

test('投入与运维参数读自正文', () => {
  assert.strictEqual(P.investment, 4000);
  assert.strictEqual(P.maintenance, 620);
  assert.strictEqual(P.levelFrom, 3);
  assert.strictEqual(P.levelTo, 5);
});

test('运维占投入 15.5%，略超 10%–15% 的经验上限', () => {
  assert.strictEqual(C.maintPctFixed, '15.5');
  assert.strictEqual(C.aboveRange, true);
  assert.strictEqual(C.levelGap, 2);
});

test('五年总持有成本 1,500–1,750 万元，由基准造价加五年运维复算', () => {
  assert.strictEqual(P.baseline, 1000);
  assert.strictEqual(P.maintLowPct, 100);
  assert.strictEqual(P.maintHighPct, 150);
  assert.strictEqual(C.fiveYearLow, 1500);
  assert.strictEqual(C.fiveYearHigh, 1750);
  assert.strictEqual(C.fiveYearLow, P.fiveYearLow);
  assert.strictEqual(C.fiveYearHigh, P.fiveYearHigh);
});

test('必填项挤占的工时：2,000 人次 × 40 秒 = 22 小时/日', () => {
  assert.strictEqual(P.visitsPerDay, 2000);
  assert.strictEqual(P.secondsPerVisit, 40);
  assert.strictEqual(C.dailySeconds, 80000);
  assert.strictEqual(Math.round(C.dailySeconds / 3600), 22);
});

test('四套评级体系、四块投资结构，清点与正文一致', () => {
  assert.strictEqual(S.ratings, 4);
  assert.strictEqual(S.investParts, 4);
  assert.strictEqual(S.ratingNames[0], '电子病历应用水平分级');
  assert.ok(S.investNames.includes('运维与升级'));
});

test('正文与复算对得上（verify 不抛错）', () => {
  assert.doesNotThrow(() => verify(C, S, P, BODY));
});

test('quiz 的 check 题正确选项落在本章正文里（≥2 道）', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const body = shingles(BODY);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) => {
    const right = String(q.options[q.correct] || '');
    return [...shingles(right)].some((g) => body.has(g));
  });
  assert.ok(checks.length >= 2);
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
});

test('脚本可运行，输出含五年成本与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /占累计投入 15\.5%/);
  assert.match(r.stdout, /五年总持有 1,500–1,750 万元/);
  assert.match(r.stdout, /不构成评级申报指导或投资决策意见/);
});
