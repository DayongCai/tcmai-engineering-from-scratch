'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, parseTables, params, structure, compute, verify } = require('./main.js');

const BODY = read();
const P = params(BODY);
const S = structure(BODY, parseTables(BODY));
const C = compute(P);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^一-鿿]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下，标题与章号一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '05-z115', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 5);
  assert.strictEqual(BODY.split('\n')[0], '# 第 5 章 · ' + TITLE);
});

test('床位与床日参数读自正文', () => {
  assert.strictEqual(P.beds, 400);
  assert.strictEqual(P.openBedDays, 146000);
  assert.strictEqual(P.occupiedBedDays, 133650);
  assert.strictEqual(P.dischargeBedDays, 129200);
  assert.strictEqual(P.discharges, 17000);
});

test('三个分母各算一次，得到 7.60 / 8.10 / 7.90', () => {
  assert.strictEqual(C.inHouseFixed, '7.60');
  assert.strictEqual(C.directFixed, '8.10');
  assert.strictEqual(C.perfFixed, '7.90');
  assert.ok(Math.abs(C.perf - 129200 / 16350) < 1e-12);
});

test('床位使用率两种分子差 3 个百分点：91.5% 与 88.5%', () => {
  assert.strictEqual(C.useOccupiedPct, '91.5');
  assert.strictEqual(C.useDischargePct, '88.5');
  assert.strictEqual(C.bookedBedDays, 146000);
});

test('直报口径的剔除逻辑自洽：17,000 − 480 − 20 = 16,500', () => {
  assert.strictEqual(P.excludedShort, 480);
  assert.strictEqual(P.excludedDead, 20);
  assert.strictEqual(C.directCheck, 16500);
  assert.strictEqual(P.directDischarges, 16500);
});

test('抽检 24/300 = 8.0%，年偏差由正文全年份数复算为 874 万元', () => {
  assert.strictEqual(C.ratePct, '8.0');
  assert.ok(Math.abs(C.dev - 873.6) < 1e-9, String(C.dev));
  assert.strictEqual(C.devInt, 874);
});

test('逻辑校验六条，拦截与提示各三条', () => {
  assert.strictEqual(S.rules, 6);
  assert.strictEqual(S.blockActions, 3);
  assert.strictEqual(S.hintActions, 3);
  assert.strictEqual(S.quad, 4);
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

test('脚本可运行，输出含三个分母并列与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /院内　　.*= 7\.60 天/);
  assert.match(r.stdout, /绩效　　.*= 7\.90 天/);
  assert.match(r.stdout, /不要试图把它们统一成一个数/);
});
