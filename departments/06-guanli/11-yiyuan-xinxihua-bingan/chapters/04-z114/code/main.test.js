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
  assert.ok(DOC.endsWith(path.join('chapters', '04-z114', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 4);
  assert.strictEqual(BODY.split('\n')[0], '# 第 4 章 · ' + TITLE);
});

test('演算参数读自正文，不是手打常量', () => {
  assert.strictEqual(P.discharges, 3000);
  assert.strictEqual(P.sampled, 200);
  assert.strictEqual(P.errors, 31);
  assert.strictEqual(P.weight, 0.35);
  assert.strictEqual(P.price, 1.2);
  assert.strictEqual(P.gapYuan, 2900);
});

test('抽样错误率 15.5%，全年 465 份带错', () => {
  assert.ok(Math.abs(C.rate - 31 / 200) < 1e-12);
  assert.strictEqual(C.ratePct, '15.5');
  assert.strictEqual(C.bad, 465);
});

test('年结算偏差落在 195 万元，正文与复算一致', () => {
  assert.ok(C.dev > 195 && C.dev < 196, String(C.dev));
  assert.strictEqual(C.devInt, 195);
  assert.strictEqual(C.devInt, P.statedDev);
});

test('合并症权重差 0.3–0.5 折成 3,600–6,000 元', () => {
  assert.strictEqual(Math.round(C.mergedLowYuan), 3600);
  assert.strictEqual(Math.round(C.mergedHighYuan), 6000);
});

test('首页五用途、主诊断三判据、入组失败四类，清点与正文一致', () => {
  assert.strictEqual(P.purposes, 5);
  assert.strictEqual(S.crit, 3);
  assert.strictEqual(S.failTypes, 4);
  assert.ok(S.failNames.includes('编码位数不足'));
  assert.ok(S.failNames.includes('合并症漏填'));
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

test('脚本可运行，输出含复算链与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /抽样错误率 15\.5%/);
  assert.match(r.stdout, /全年约 465 份首页带错/);
  assert.match(r.stdout, /不构成编码指导、结算意见或法律意见/);
});
