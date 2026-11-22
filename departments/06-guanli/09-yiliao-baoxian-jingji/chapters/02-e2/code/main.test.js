'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, parseTables, modelParams, needVisits, elasticityRows, compute, verify } = require('./main.js');

const BODY = read();
const TABLES = parseTables(BODY);
const P = modelParams(BODY);
const NEED = needVisits(TABLES);
const EL = elasticityRows(TABLES);
const C = compute(P, NEED);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下且标题一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '02-e2', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 2);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 2 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('四个参数从正文读出：40 万固定成本、20 万目标收入、100 元单价、40 元变动成本', () => {
  assert.strictEqual(P.fixed, 400000);
  assert.strictEqual(P.target, 200000);
  assert.strictEqual(P.price, 100);
  assert.strictEqual(P.vc, 40);
  assert.strictEqual(NEED, 8000);
});

test('所需 10,000 诊次、缺口 2,000 诊次（+25%）、额外收入 12 万元', () => {
  assert.strictEqual(C.contribution, 60);
  assert.strictEqual(C.needed, 10000);
  assert.strictEqual(C.gap, 2000);
  assert.strictEqual(C.gapPct, 25);
  assert.strictEqual(C.extraRevenue, 120000);
});

test('缺口收益由缺口与边际贡献相乘得出，不是另取的数', () => {
  assert.strictEqual(C.extraRevenue, C.gap * C.contribution);
  assert.ok(Math.abs(C.extraRevenue / P.fixed - 0.3) < 1e-9, String(C.extraRevenue / P.fixed));
});

test('自付比例表四行、两档弹性的需求变化都能复现', () => {
  assert.deepStrictEqual(EL.eps, [-0.2, -0.6]);
  assert.strictEqual(EL.rows.length, 4);
  const want = [
    [50, 14.9, 51.6],
    [30, 27.2, 105.9],
    [10, 58.5, 298.1],
  ];
  for (const [share, e2, e6] of want) {
    const row = EL.rows.find((r) => r.share === share);
    assert.ok(row, String(share));
    const got2 = (Math.pow(row.price / 100, -0.2) - 1) * 100;
    const got6 = (Math.pow(row.price / 100, -0.6) - 1) * 100;
    assert.ok(Math.abs(got2 - e2) < 0.1, `${share}: ${got2}`);
    assert.ok(Math.abs(got6 - e6) < 0.1, `${share}: ${got6}`);
  }
});

test('正文与复算对得上（verify 不抛错）', () => {
  assert.doesNotThrow(() => verify(C, NEED, EL, BODY));
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
  assert.match(r.stdout, /缺口 2,000 诊次（\+25%）/);
  assert.match(r.stdout, /不构成对任何机构或医务人员的行为评价/);
});
