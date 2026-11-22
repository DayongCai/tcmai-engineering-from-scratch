'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, parseTables, poolParams, poolTable, compute, caliberSpread, verify, money } = require('./main.js');

const BODY = read();
const TABLES = parseTables(BODY);
const P = poolParams(BODY);
const ROWS = poolTable(TABLES);
const C = compute(P, ROWS);
const SPREAD = caliberSpread(BODY);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下且标题一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '04-e4', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 4);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 4 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('池参数读自正文：人均 3,000 元、标准差 8,000 元', () => {
  assert.strictEqual(P.mean, 3000);
  assert.strictEqual(P.sd, 8000);
  assert.strictEqual(money('30 亿'), 3e9);
  assert.strictEqual(money('3,000 万'), 3e7);
});

test('两个池子的相对波动与安全垫都能复算', () => {
  assert.strictEqual(ROWS.length, 2);
  const small = C.rows.find((r) => r.n === 1e4);
  const big = C.rows.find((r) => r.n === 1e6);
  assert.strictEqual(small.sdTotal, 8e5);
  assert.strictEqual(small.rel.toFixed(2), '2.67');
  assert.strictEqual(small.pad.toFixed(2), '4.39');
  assert.strictEqual(big.sdTotal, 8e6);
  assert.strictEqual(big.rel.toFixed(2), '0.27');
  assert.strictEqual(big.pad.toFixed(2), '0.44');
});

test('安全垫随 √n 反比下降：池子小十倍，垫子厚十倍', () => {
  const small = C.rows.find((r) => r.n === 1e4);
  const big = C.rows.find((r) => r.n === 1e6);
  const ratio = small.pad / big.pad;
  assert.ok(Math.abs(ratio - 10) < 0.05, String(ratio));
});

test('碎片化：十个万人池各要 4.39%，一个十万人池只要 1.39%', () => {
  assert.strictEqual(C.bigPoolPad.toFixed(2), '1.39');
  const small = C.rows.find((r) => r.n === 1e4);
  assert.ok(C.bigPoolPad < small.pad);
});

test('三个核算口径极差 7 亿元，约 7%', () => {
  assert.deepStrictEqual(SPREAD.values, [100, 96, 103]);
  assert.strictEqual(SPREAD.spread, 7);
  assert.ok(Math.abs(SPREAD.spreadPct - 7.29) < 0.05);
});

test('正文与复算对得上（verify 不抛错）', () => {
  assert.doesNotThrow(() => verify(C, SPREAD, BODY));
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
  assert.match(r.stdout, /十个万人池的准备金率各要 4\.39%/);
  assert.match(r.stdout, /不构成对任何地区筹资政策、费率或待遇水平的建议/);
});
